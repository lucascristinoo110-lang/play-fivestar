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

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { transaction_id, amount } = await req.json();

    if (!transaction_id || !amount) {
      return new Response(JSON.stringify({ error: "transaction_id and amount required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get BSPAY credentials from site_settings
    const { data: settings } = await supabase
      .from("site_settings")
      .select("bspay_api_url, bspay_client_id, bspay_client_secret")
      .limit(1)
      .single();

    if (!settings?.bspay_client_id || !settings?.bspay_client_secret) {
      return new Response(JSON.stringify({
        pix_code: `00020126580014br.gov.bcb.pix0136${transaction_id}520400005303986540${Number(amount).toFixed(2)}5802BR`,
        message: "BSPAY not configured - demo mode",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiUrl = settings.bspay_api_url || "https://api.bspay.co";

    // BSPAY uses the client_secret directly as Bearer token
    // The client_id is the API key / token
    const bearerToken = settings.bspay_client_secret;

    // Build webhook URL for payment confirmation
    const webhookUrl = `${supabaseUrl}/functions/v1/bspay-webhook`;

    // Create PIX charge directly - no OAuth needed
    const pixResponse = await fetch(`${apiUrl}/v2/pix/qrcode`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${bearerToken}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        amount: Number(amount),
        external_id: transaction_id,
        postbackUrl: webhookUrl,
        payerQuestion: `Depósito - ${transaction_id}`,
      }),
    });

    if (!pixResponse.ok) {
      const pixError = await pixResponse.text();
      console.error("BSPAY PIX error:", pixResponse.status, pixError);
      throw new Error(`BSPAY PIX creation failed [${pixResponse.status}]: ${pixError}`);
    }

    const pixData = await pixResponse.json();
    console.log("BSPAY PIX response:", JSON.stringify(pixData));

    // Update transaction with external references
    await supabase
      .from("transactions")
      .update({
        external_id: pixData.transactionId || pixData.transaction_id || pixData.id,
        metadata: pixData,
      })
      .eq("id", transaction_id);

    return new Response(JSON.stringify({
      pix_code: pixData.pixCopiaECola || pixData.pix_copy_paste || pixData.qrCode || pixData.qr_code || pixData.pix_code,
      qr_code_image: pixData.qrCodeImage || pixData.qr_code_image || pixData.qr_code_base64,
      transaction_id: pixData.transactionId || pixData.id,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("BSPAY error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
