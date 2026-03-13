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

    const payload = await req.json();
    console.log("BSPAY webhook received:", JSON.stringify(payload));

    const externalId = payload.external_id || payload.transaction_id;
    const status = payload.status;

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
    const isConfirmed = status === "paid" || status === "completed" || status === "approved" || status === "confirmed";

    if (isConfirmed) {
      // Update transaction status
      await supabase
        .from("transactions")
        .update({ status: "completed", metadata: payload })
        .eq("id", transaction.id);

      // Add balance to user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("balance")
        .eq("user_id", transaction.user_id)
        .single();

      const newBalance = (Number(profile?.balance) || 0) + Number(transaction.amount);

      await supabase
        .from("profiles")
        .update({ balance: newBalance })
        .eq("user_id", transaction.user_id);

      console.log(`Deposit confirmed: user ${transaction.user_id}, amount ${transaction.amount}, new balance ${newBalance}`);
    } else if (status === "failed" || status === "expired" || status === "cancelled") {
      await supabase
        .from("transactions")
        .update({ status: "failed", metadata: payload })
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
