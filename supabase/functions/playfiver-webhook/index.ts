import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Content-Type": "application/json",
};

function json(body: Record<string, any>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

/**
 * Playfiver Wallet Callback
 * Public endpoint (no JWT) — called directly by Playfiver servers.
 * Uses atomic DB functions to prevent race conditions.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    console.log("Playfiver callback:", JSON.stringify(body));

    const type = String(body.type || body.action || "").toUpperCase();
    const user_code = body.user_code || body.user_id;
    const transaction_id = body.transaction_id || body.round_id || body.reference_id || null;

    if (!user_code) {
      return json({ msg: "user_code required", status: false }, 400);
    }

    // ── BALANCE ──
    if (type === "BALANCE") {
      const balance = await getBalance(supabase, user_code);
      if (balance === null) return json({ msg: "User not found", status: false }, 404);
      return json({ msg: "", status: true, balance, user_code });
    }

    // ── DUPLICATE CHECK (idempotency) ──
    if (transaction_id) {
      const { data: existing } = await supabase
        .from("transactions")
        .select("id")
        .eq("external_id", `pf_${transaction_id}`)
        .maybeSingle();

      if (existing) {
        const balance = await getBalance(supabase, user_code);
        console.log(`Duplicate tx=${transaction_id}, balance=${balance}`);
        return json({ msg: "", status: true, balance: balance ?? 0, user_code });
      }
    }

    const slot = body.slot || {};
    const betAmt = Number(slot.bet || body.bet || body.amount || 0);
    const winAmt = Number(slot.win || body.win || 0);
    const gameCode = body.game_code || slot.game_code || "";

    // ── BET (debit) ──
    if (type === "BET" || type === "LOSEBET" || (type === "TRANSACTION" && betAmt > 0 && winAmt === 0)) {
      const { data, error } = await supabase.rpc("debit_balance", {
        p_user_id: user_code,
        p_amount: betAmt,
      });

      if (error) {
        if (error.message.includes("Insufficient balance")) {
          const bal = await getBalance(supabase, user_code);
          return json({ msg: "Saldo insuficiente", status: false, balance: bal ?? 0 }, 400);
        }
        if (error.message.includes("User not found")) {
          return json({ msg: "User not found", status: false }, 404);
        }
        throw error;
      }

      const newBalance = Number(data);
      await recordTx(supabase, user_code, "game_bet", -betAmt, transaction_id, { type, game_code: gameCode, round_id: transaction_id });
      console.log(`BET: ${user_code} -${betAmt}, balance=${newBalance}`);
      return json({ msg: "", status: true, balance: newBalance, user_code });
    }

    // ── WIN (credit) ──
    if (type === "WIN" || type === "WINBET" || (type === "TRANSACTION" && winAmt > 0)) {
      const { data, error } = await supabase.rpc("adjust_balance", {
        p_user_id: user_code,
        p_amount: winAmt,
      });
      if (error) throw error;

      const newBalance = Number(data);
      await recordTx(supabase, user_code, "game_win", winAmt, transaction_id, { type, game_code: gameCode, round_id: transaction_id });
      console.log(`WIN: ${user_code} +${winAmt}, balance=${newBalance}`);
      return json({ msg: "", status: true, balance: newBalance, user_code });
    }

    // ── REFUND / CANCEL ──
    if (type === "REFUND" || type === "CANCEL" || type === "ROLLBACK") {
      const refundAmt = betAmt || winAmt || Number(body.amount || 0);
      const { data, error } = await supabase.rpc("adjust_balance", {
        p_user_id: user_code,
        p_amount: refundAmt,
      });
      if (error) throw error;

      const newBalance = Number(data);
      await recordTx(supabase, user_code, "game_refund", refundAmt, transaction_id, { type, original_transaction: body.original_transaction_id, round_id: transaction_id });
      console.log(`REFUND: ${user_code} +${refundAmt}, balance=${newBalance}`);
      return json({ msg: "", status: true, balance: newBalance, user_code });
    }

    // ── GENERIC (legacy) ──
    const netAmount = -betAmt + winAmt;
    if (betAmt > 0 && winAmt === 0) {
      const { data, error } = await supabase.rpc("debit_balance", { p_user_id: user_code, p_amount: betAmt });
      if (error) {
        if (error.message.includes("Insufficient")) {
          const bal = await getBalance(supabase, user_code);
          return json({ msg: "Saldo insuficiente", status: false, balance: bal ?? 0 }, 400);
        }
        throw error;
      }
      // If there's also a win component, credit it
      if (winAmt > 0) {
        await supabase.rpc("adjust_balance", { p_user_id: user_code, p_amount: winAmt });
      }
      const balance = await getBalance(supabase, user_code);
      console.log(`GENERIC: ${user_code} net=${netAmount}, balance=${balance}`);
      return json({ msg: "", status: true, balance: balance ?? 0, user_code });
    }

    // Pure credit or zero
    if (netAmount !== 0) {
      await supabase.rpc("adjust_balance", { p_user_id: user_code, p_amount: netAmount });
    }
    const balance = await getBalance(supabase, user_code);
    console.log(`GENERIC: ${user_code} net=${netAmount}, balance=${balance}`);
    return json({ msg: "", status: true, balance: balance ?? 0, user_code });

  } catch (error: any) {
    console.error("Playfiver callback error:", error);
    return json({ msg: error.message, status: false }, 500);
  }
});

async function getBalance(supabase: any, userId: string): Promise<number | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("balance")
    .eq("user_id", userId)
    .single();
  if (error || !data) return null;
  return Number(data.balance) || 0;
}

async function recordTx(supabase: any, userId: string, type: string, amount: number, txId: string | null, metadata: any) {
  if (!txId) return;
  await supabase.from("transactions").insert({
    user_id: userId,
    type,
    amount,
    status: "completed",
    payment_method: "playfiver",
    external_id: `pf_${txId}`,
    metadata,
  });
}
