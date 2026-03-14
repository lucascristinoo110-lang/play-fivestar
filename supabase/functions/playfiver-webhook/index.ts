import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Playfiver Webhook Handler
 * Handles two webhook types:
 * 1. BALANCE - Returns user's current balance
 * 2. WinBet/LoseBet - Processes game transactions and updates balance
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

    const { type, user_code } = body;

    if (!user_code) {
      return new Response(JSON.stringify({ msg: "user_code required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user profile by user_id (user_code = user_id in our system)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user_code)
      .single();

    if (profileError || !profile) {
      console.error("User not found:", user_code);
      return new Response(JSON.stringify({ msg: "User not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // TYPE: BALANCE - Return current balance
    if (type === "BALANCE") {
      return new Response(JSON.stringify({
        msg: "",
        balance: Number(profile.balance) || 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // TYPE: Transaction (WinBet, LoseBet, etc.)
    const slot = body.slot || {};
    const bet = Number(slot.bet) || 0;
    const win = Number(slot.win) || 0;
    const currentBalance = Number(profile.balance) || 0;

    // Calculate new balance based on transaction
    // user_after_balance from Playfiver is the source of truth
    const newBalance = body.user_balance !== undefined 
      ? Number(body.user_balance) 
      : currentBalance - bet + win;

    // Check for insufficient balance on bet
    if (bet > 0 && currentBalance < bet && win === 0) {
      return new Response(JSON.stringify({
        msg: "Saldo insuficiente",
        balance: currentBalance,
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update user balance
    await supabase
      .from("profiles")
      .update({ balance: newBalance })
      .eq("user_id", user_code);

    console.log(`Balance updated for ${user_code}: ${currentBalance} -> ${newBalance} (bet: ${bet}, win: ${win})`);

    return new Response(JSON.stringify({
      msg: "",
      balance: newBalance,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Playfiver webhook error:", error);
    return new Response(JSON.stringify({ msg: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
