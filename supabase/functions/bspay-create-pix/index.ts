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
      // Return a demo PIX code when BSPAY is not configured
      return new Response(JSON.stringify({
        pix_code: `00020126580014br.gov.bcb.pix0136${transaction_id}520400005303986540${Number(amount).toFixed(2)}5802BR`,
        message: "BSPAY not configured - demo mode",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiUrl = settings.bspay_api_url || "https://api.bspay.co";

    // Authenticate with BSPAY
    const authResponse = await fetch(`${apiUrl}/v2/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: settings.bspay_client_id,
        client_secret: settings.bspay_client_secret,
        grant_type: "client_credentials",
      }),
    });

    if (!authResponse.ok) {
      const authError = await authResponse.text();
      throw new Error(`BSPAY auth failed [${authResponse.status}]: ${authError}`);
    }

    const { access_token } = await authResponse.json();

    // Create PIX charge
    const pixResponse = await fetch(`${apiUrl}/v2/pix/qrcode`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Number(amount),
        external_id: transaction_id,
        description: `Depósito - ${transaction_id}`,
      }),
    });

    if (!pixResponse.ok) {
      const pixError = await pixResponse.text();
      throw new Error(`BSPAY PIX creation failed [${pixResponse.status}]: ${pixError}`);
    }

    const pixData = await pixResponse.json();

    // Update transaction with external_id
    await supabase
      .from("transactions")
      .update({
        external_id: pixData.id || pixData.transaction_id,
        metadata: pixData,
      })
      .eq("id", transaction_id);

    return new Response(JSON.stringify({
      pix_code: pixData.pix_copy_paste || pixData.qr_code || pixData.pix_code,
      qr_code_image: pixData.qr_code_image || pixData.qr_code_base64,
      transaction_id: pixData.id,
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
