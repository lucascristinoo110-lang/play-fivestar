import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const rawPayload = await req.json();
    console.log("BSPAY webhook received:", JSON.stringify(rawPayload));

    // BSPAY sends data nested inside requestBody
    const payload = rawPayload.requestBody || rawPayload;

    const externalId =
      payload.external_id ||
      payload.transaction_id ||
      payload.transactionId ||
      payload.id ||
      payload.data?.external_id ||
      payload.data?.transaction_id;

    const rawStatus =
      payload.status ||
      payload.payment_status ||
      payload.paymentStatus ||
      payload.data?.status ||
      payload.event;

    const status = String(rawStatus || "").toLowerCase();

    console.log("Parsed - externalId:", externalId, "status:", status);

    if (!externalId) {
      return new Response(JSON.stringify({ error: "Missing external_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find transaction by external_id or by id
    const { data: transaction } = await supabase
      .from("transactions")
      .select("*")
      .or(`external_id.eq.${externalId},id.eq.${externalId}`)
      .single();

    if (!transaction) {
      console.error("Transaction not found for external_id:", externalId);
      return new Response(JSON.stringify({ error: "Transaction not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (transaction.status === "completed") {
      return new Response(JSON.stringify({ message: "Already processed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if payment was confirmed
    const isConfirmed = ["paid", "completed", "approved", "confirmed", "success", "succeeded"].includes(status);

    if (isConfirmed) {
      // Update transaction status
      await supabase
        .from("transactions")
        .update({ status: "completed", metadata: rawPayload })
        .eq("id", transaction.id);

      // Use atomic adjust_balance RPC
      const depositAmount = Number(payload.amount || transaction.amount) || Number(transaction.amount);
      const newBalance = await supabase.rpc("adjust_balance", {
        p_user_id: transaction.user_id,
        p_amount: depositAmount,
      });

      console.log(`Deposit confirmed: user ${transaction.user_id}, amount ${depositAmount}, result:`, newBalance);

      // Check if this is the user's first completed deposit and bonus is active
      try {
        const { data: siteSettings } = await supabase
          .from("site_settings")
          .select("welcome_bonus_active, welcome_bonus_percent, welcome_bonus_max")
          .limit(1)
          .single();

        if (siteSettings?.welcome_bonus_active && siteSettings.welcome_bonus_percent > 0) {
          // Count completed deposits for this user (excluding current one)
          const { count } = await supabase
            .from("transactions")
            .select("id", { count: "exact", head: true })
            .eq("user_id", transaction.user_id)
            .eq("type", "deposit")
            .eq("status", "completed")
            .neq("id", transaction.id);

          const isFirstDeposit = (count || 0) === 0;

          if (isFirstDeposit) {
            const bonusPercent = Number(siteSettings.welcome_bonus_percent) / 100;
            const bonusMax = Number(siteSettings.welcome_bonus_max) || 99999;
            const bonusAmount = Math.min(depositAmount * bonusPercent, bonusMax);

            if (bonusAmount > 0) {
              // Add bonus to bonus_balance
              const { data: profile } = await supabase
                .from("profiles")
                .select("bonus_balance")
                .eq("user_id", transaction.user_id)
                .single();

              const currentBonus = Number(profile?.bonus_balance || 0);
              await supabase
                .from("profiles")
                .update({ bonus_balance: currentBonus + bonusAmount })
                .eq("user_id", transaction.user_id);

              console.log(`First deposit bonus applied: user ${transaction.user_id}, bonus R$${bonusAmount.toFixed(2)}`);
            }
          }
        }
      } catch (bonusErr) {
        console.error("Error applying bonus:", bonusErr);
        // Don't fail the webhook if bonus fails
      }
    } else if (["failed", "expired", "cancelled", "canceled", "rejected"].includes(status)) {
      await supabase
        .from("transactions")
        .update({ status: "failed", metadata: rawPayload })
        .eq("id", transaction.id);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
