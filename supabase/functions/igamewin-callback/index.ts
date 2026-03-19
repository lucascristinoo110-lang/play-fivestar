import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * iGameWin Seamless Wallet Callback
 * 
 * Handles balance queries and bet/win transactions from iGameWin.
 * Methods: getBalance, changeBalance
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    let body: any;
    
    // Support both GET (query params) and POST (json body)
    if (req.method === "GET") {
      const url = new URL(req.url);
      body = Object.fromEntries(url.searchParams.entries());
    } else {
      const text = await req.text();
      try {
        body = JSON.parse(text);
      } catch {
        // Try URL-encoded form data
        body = Object.fromEntries(new URLSearchParams(text).entries());
      }
    }

    console.log("[IGW-CB] Received:", JSON.stringify(body));

    const method = body.method || body.action || body.command || "";
    const userCode = body.user_code || body.username || body.member_account || body.player_uid || body.userid || "";
    const amount = parseFloat(body.amount || body.bet_amount || "0");
    const roundId = body.round_id || body.call_id || body.transaction_id || "";
    const gameCode = body.game_code || "";
    const providerCode = body.provider_code || "";
    const txType = body.type || body.action_type || ""; // bet, win, refund

    // ── GET BALANCE ──
    if (method === "getBalance" || method === "get_balance" || method === "balance" || method === "getbalance") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("balance")
        .eq("user_id", userCode)
        .single();

      if (!profile) {
        console.log("[IGW-CB] User not found:", userCode);
        return respond({ status: 0, msg: "INVALID_USER", balance: 0 });
      }

      const balanceCents = Math.round((profile.balance || 0) * 100);
      console.log("[IGW-CB] getBalance:", userCode, "→", balanceCents);
      return respond({ status: 1, balance: balanceCents, msg: "SUCCESS" });
    }

    // ── CHANGE BALANCE (bet / win / refund) ──
    if (method === "changeBalance" || method === "change_balance" || method === "bet" || method === "win" || method === "refund" || method === "balance_adj") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("balance, user_id")
        .eq("user_id", userCode)
        .single();

      if (!profile) {
        console.log("[IGW-CB] User not found for changeBalance:", userCode);
        return respond({ status: 0, msg: "INVALID_USER", balance: 0 });
      }

      // Determine if this is a debit (bet) or credit (win/refund)
      const amountInReais = amount / 100; // Convert cents to BRL

      // Detect transaction type
      const isBet = txType === "bet" || txType === "debit" || amount < 0 || (method === "bet");
      const isWin = txType === "win" || txType === "credit" || txType === "refund" || (method === "win") || (method === "refund");

      let newBalance: number;

      if (isBet || (!isWin && amountInReais < 0)) {
        // Debit (bet)
        const debitAmount = Math.abs(amountInReais);
        if ((profile.balance || 0) < debitAmount) {
          const balanceCents = Math.round((profile.balance || 0) * 100);
          console.log("[IGW-CB] Insufficient balance:", userCode, "has", profile.balance, "needs", debitAmount);
          return respond({ status: 0, msg: "INSUFFICIENT_BALANCE", balance: balanceCents });
        }

        const { data: result } = await supabase.rpc("debit_balance", {
          p_user_id: userCode,
          p_amount: debitAmount,
        });
        newBalance = result ?? (profile.balance || 0) - debitAmount;

        // Log transaction
        await supabase.from("transactions").insert({
          user_id: userCode,
          type: "casino_bet",
          amount: debitAmount,
          status: "completed",
          payment_method: "igamewin",
          external_id: roundId || undefined,
          metadata: { provider: providerCode, game_code: gameCode, round_id: roundId, source: "igamewin_callback" },
        });
      } else {
        // Credit (win/refund)
        const creditAmount = Math.abs(amountInReais);

        const { data: result } = await supabase.rpc("adjust_balance", {
          p_user_id: userCode,
          p_amount: creditAmount,
        });
        newBalance = result ?? (profile.balance || 0) + creditAmount;

        // Log transaction
        await supabase.from("transactions").insert({
          user_id: userCode,
          type: "casino_win",
          amount: creditAmount,
          status: "completed",
          payment_method: "igamewin",
          external_id: roundId || undefined,
          metadata: { provider: providerCode, game_code: gameCode, round_id: roundId, source: "igamewin_callback" },
        });
      }

      const balanceCents = Math.round(newBalance * 100);
      console.log("[IGW-CB] changeBalance:", userCode, "amount:", amount, "new balance cents:", balanceCents);
      return respond({ status: 1, balance: balanceCents, msg: "SUCCESS" });
    }

    // Unknown method - log and return balance anyway
    console.log("[IGW-CB] Unknown method:", method, "- returning balance");
    const { data: profile } = await supabase
      .from("profiles")
      .select("balance")
      .eq("user_id", userCode)
      .single();

    const bal = Math.round((profile?.balance || 0) * 100);
    return respond({ status: 1, balance: bal, msg: "SUCCESS" });

  } catch (error: any) {
    console.error("[IGW-CB] Error:", error.message);
    return respond({ status: 0, msg: error.message || "INTERNAL_ERROR", balance: 0 });
  }
});

function respond(data: any) {
  return new Response(JSON.stringify(data), {
    status: 200, // Always 200 for seamless wallet callbacks
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
