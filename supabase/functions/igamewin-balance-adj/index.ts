import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const raw = await req.text();
    let body: Record<string, unknown> = {};

    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      body = Object.fromEntries(new URLSearchParams(raw).entries());
    }

    const login = String(body.login ?? body.user_code ?? body.username ?? "").trim();
    const userId = login;
    const amountRaw = Number.parseFloat(String(body.amount ?? "0"));
    const type = String(body.type ?? "").toLowerCase();
    const roundId = String(body.txid ?? body.call_id ?? body.transaction_id ?? body.roundid ?? "").trim();
    const gameCode = String(body.game_code ?? "").trim();
    const providerCode = String(body.provider_code ?? "").trim();

    if (!userId) {
      return respond({ status: "-1", balance: "0.0000", errormsg: "INVALID_USER" });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("balance")
      .eq("user_id", userId)
      .maybeSingle();

    if (!profile) {
      return respond({ status: "-1", balance: "0.0000", errormsg: "INVALID_USER" });
    }

    const currentBalance = Number(profile.balance ?? 0);
    const absAmount = Math.abs(amountRaw);
    const isDebit = amountRaw < 0 || type === "bet" || type === "cancelwin";
    const signedAmount = isDebit ? -absAmount : absAmount;

    let newBalance = currentBalance;

    if (signedAmount < 0) {
      const debitAmount = Math.abs(signedAmount);
      if (currentBalance < debitAmount) {
        return respond({
          status: "-1",
          balance: currentBalance.toFixed(4),
          errormsg: "INSUFFICIENT_BALANCE",
        });
      }

      const { data } = await supabase.rpc("debit_balance", {
        p_user_id: userId,
        p_amount: debitAmount,
      });

      newBalance = Number(data ?? currentBalance - debitAmount);

      await supabase.from("transactions").insert({
        user_id: userId,
        type: "casino_bet",
        amount: debitAmount,
        status: "completed",
        payment_method: "igamewin",
        external_id: roundId || undefined,
        metadata: {
          provider: providerCode || null,
          game_code: gameCode || null,
          round_id: roundId || null,
          source: "igamewin_balance_adj",
          raw_type: type || null,
        },
      });
    } else {
      const { data } = await supabase.rpc("adjust_balance", {
        p_user_id: userId,
        p_amount: signedAmount,
      });

      newBalance = Number(data ?? currentBalance + signedAmount);

      await supabase.from("transactions").insert({
        user_id: userId,
        type: "casino_win",
        amount: signedAmount,
        status: "completed",
        payment_method: "igamewin",
        external_id: roundId || undefined,
        metadata: {
          provider: providerCode || null,
          game_code: gameCode || null,
          round_id: roundId || null,
          source: "igamewin_balance_adj",
          raw_type: type || null,
        },
      });
    }

    const balance = newBalance.toFixed(4);
    console.log("[IGW-BALANCE-ADJ]", JSON.stringify({ login: userId, amount: amountRaw, type, balance }));

    return respond({ status: "1", balance });
  } catch (error: any) {
    console.error("[IGW-BALANCE-ADJ]", error.message);
    return respond({ status: "-1", balance: "0.0000", errormsg: error.message || "INTERNAL_ERROR" });
  }
});

function respond(data: Record<string, unknown>) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
