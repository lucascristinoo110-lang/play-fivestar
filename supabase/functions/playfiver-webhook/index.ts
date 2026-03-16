import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Playfiver Wallet Webhook
 * Handles: BALANCE, BET (debit), WIN (credit), REFUND/CANCEL
 * - Reads balance directly from DB (no cache)
 * - Atomic transactions with duplicate protection via transaction_id
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    console.log("Playfiver webhook received:", JSON.stringify(body));

    const type = String(body.type || body.action || "").toUpperCase();
    const user_code = body.user_code || body.user_id;
    const transaction_id = body.transaction_id || body.round_id || body.reference_id || null;

    if (!user_code) {
      return jsonResponse({ msg: "user_code required", status: false }, 400);
    }

    // Always read balance fresh from DB
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("user_id, balance")
      .eq("user_id", user_code)
      .single();

    if (profileError || !profile) {
      console.error("User not found:", user_code);
      return jsonResponse({ msg: "User not found", status: false }, 404);
    }

    const currentBalance = Number(profile.balance) || 0;

    // ── BALANCE ──
    if (type === "BALANCE") {
      return jsonResponse({
        msg: "",
        status: true,
        balance: currentBalance,
        user_code,
      });
    }

    // ── DUPLICATE CHECK ──
    if (transaction_id) {
      const { data: existing } = await supabase
        .from("transactions")
        .select("id, metadata")
        .eq("external_id", `pf_${transaction_id}`)
        .limit(1)
        .maybeSingle();

      if (existing) {
        // Already processed - return current balance (idempotent)
        const freshBalance = await getFreshBalance(supabase, user_code);
        console.log(`Duplicate transaction_id=${transaction_id}, returning balance=${freshBalance}`);
        return jsonResponse({
          msg: "",
          status: true,
          balance: freshBalance,
          user_code,
        });
      }
    }

    const slot = body.slot || {};
    const bet = Number(slot.bet || body.bet || body.amount || 0);
    const win = Number(slot.win || body.win || 0);

    // ── BET (debit) ──
    if (type === "BET" || type === "LOSEBET" || (type === "TRANSACTION" && bet > 0 && win === 0)) {
      if (currentBalance < bet) {
        return jsonResponse({
          msg: "Saldo insuficiente",
          status: false,
          balance: currentBalance,
        }, 400);
      }

      const newBalance = currentBalance - bet;

      await supabase
        .from("profiles")
        .update({ balance: newBalance })
        .eq("user_id", user_code);

      // Record transaction
      if (transaction_id) {
        await supabase.from("transactions").insert({
          user_id: user_code,
          type: "game_bet",
          amount: -bet,
          status: "completed",
          payment_method: "playfiver",
          external_id: `pf_${transaction_id}`,
          metadata: { type, game_code: body.game_code || slot.game_code, round_id: transaction_id },
        });
      }

      console.log(`BET: ${user_code} debited ${bet}, balance: ${currentBalance} -> ${newBalance}`);
      return jsonResponse({ msg: "", status: true, balance: newBalance, user_code });
    }

    // ── WIN (credit) ──
    if (type === "WIN" || type === "WINBET" || (type === "TRANSACTION" && win > 0)) {
      const newBalance = currentBalance + win;

      await supabase
        .from("profiles")
        .update({ balance: newBalance })
        .eq("user_id", user_code);

      if (transaction_id) {
        await supabase.from("transactions").insert({
          user_id: user_code,
          type: "game_win",
          amount: win,
          status: "completed",
          payment_method: "playfiver",
          external_id: `pf_${transaction_id}`,
          metadata: { type, game_code: body.game_code || slot.game_code, round_id: transaction_id },
        });
      }

      console.log(`WIN: ${user_code} credited ${win}, balance: ${currentBalance} -> ${newBalance}`);
      return jsonResponse({ msg: "", status: true, balance: newBalance, user_code });
    }

    // ── REFUND / CANCEL ──
    if (type === "REFUND" || type === "CANCEL" || type === "ROLLBACK") {
      const refundAmount = bet || win || Number(body.amount || 0);
      const newBalance = currentBalance + refundAmount;

      await supabase
        .from("profiles")
        .update({ balance: newBalance })
        .eq("user_id", user_code);

      if (transaction_id) {
        await supabase.from("transactions").insert({
          user_id: user_code,
          type: "game_refund",
          amount: refundAmount,
          status: "completed",
          payment_method: "playfiver",
          external_id: `pf_${transaction_id}`,
          metadata: { type, original_transaction: body.original_transaction_id, round_id: transaction_id },
        });
      }

      console.log(`REFUND: ${user_code} refunded ${refundAmount}, balance: ${currentBalance} -> ${newBalance}`);
      return jsonResponse({ msg: "", status: true, balance: newBalance, user_code });
    }

    // ── GENERIC TRANSACTION (legacy format) ──
    const newBalance = body.user_balance !== undefined
      ? Number(body.user_balance)
      : currentBalance - bet + win;

    if (bet > 0 && currentBalance < bet && win === 0) {
      return jsonResponse({ msg: "Saldo insuficiente", status: false, balance: currentBalance }, 400);
    }

    await supabase
      .from("profiles")
      .update({ balance: newBalance })
      .eq("user_id", user_code);

    console.log(`GENERIC: ${user_code} balance: ${currentBalance} -> ${newBalance} (bet: ${bet}, win: ${win})`);
    return jsonResponse({ msg: "", status: true, balance: newBalance, user_code });

  } catch (error: any) {
    console.error("Playfiver webhook error:", error);
    return jsonResponse({ msg: error.message, status: false }, 500);
  }
});

async function getFreshBalance(supabase: any, userId: string): Promise<number> {
  const { data } = await supabase
    .from("profiles")
    .select("balance")
    .eq("user_id", userId)
    .single();
  return Number(data?.balance) || 0;
}

function jsonResponse(body: Record<string, any>, status = 200) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Content-Type": "application/json",
  };
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}
