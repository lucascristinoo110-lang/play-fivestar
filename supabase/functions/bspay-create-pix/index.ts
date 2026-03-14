import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type AuthCandidate = {
  label: string;
  headers: Record<string, string>;
};

function parseJsonSafe(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function resolveApiUrl(rawApiUrl?: string | null) {
  const trimmed = rawApiUrl?.trim();
  return trimmed && /^https?:\/\//i.test(trimmed) ? trimmed : "https://api.bspay.co";
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((v) => v?.trim()).filter(Boolean) as string[]));
}

async function fetchOAuthTokens(apiUrl: string, clientId: string, clientSecret: string) {
  const endpoint = `${apiUrl}/v2/oauth/token`;
  const tokens: string[] = [];

  const addToken = (source: string, value?: string) => {
    const token = String(value || "").trim();
    if (token && !tokens.includes(token)) {
      console.log(`BSPAY OAuth token obtido (${source})`);
      tokens.push(token);
    }
  };

  const basicAuth = btoa(`${clientId}:${clientSecret}`);

  // Basic auth (observado como formato aceito)
  try {
    const formBody = new URLSearchParams({ grant_type: "client_credentials" });

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
        "Authorization": `Basic ${basicAuth}`,
      },
      body: formBody.toString(),
    });

    const rawText = await response.text();
    const parsed = parseJsonSafe(rawText);

    if (response.ok) {
      addToken("basic", parsed?.access_token || parsed?.token);
    } else {
      console.error(`BSPAY OAuth erro (basic) [${response.status}]:`, rawText);
    }
  } catch (error) {
    console.error("BSPAY OAuth falha (basic):", error);
  }

  // Fallback JSON
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    const rawText = await response.text();
    const parsed = parseJsonSafe(rawText);

    if (response.ok) {
      addToken("json", parsed?.access_token || parsed?.token);
    } else {
      console.error(`BSPAY OAuth erro (json) [${response.status}]:`, rawText);
    }
  } catch (error) {
    console.error("BSPAY OAuth falha (json):", error);
  }

  return tokens;
}

function buildAuthCandidates(tokens: string[]) {
  const candidates: AuthCandidate[] = [];

  for (const token of tokens) {
    // Prioriza modo que chegou mais longe na API (retornou validação de payload)
    candidates.push(
      {
        label: "bearer_x_api_key",
        headers: {
          "Authorization": `Bearer ${token}`,
          "x-api-key": token,
        },
      },
      {
        label: "bearer",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      },
    );
  }

  return candidates;
}

function normalizeDocument(value?: string | null) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length >= 11) return digits.slice(0, 14);
  return "00000000000";
}

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

    const [{ data: settings }, { data: transaction }] = await Promise.all([
      supabase
        .from("site_settings")
        .select("bspay_api_url, bspay_client_id, bspay_client_secret")
        .limit(1)
        .single(),
      supabase
        .from("transactions")
        .select("id, user_id")
        .eq("id", transaction_id)
        .single(),
    ]);

    const clientId = settings?.bspay_client_id?.trim() ?? "";
    const clientSecret = settings?.bspay_client_secret?.trim() ?? "";

    if (!clientId && !clientSecret) {
      return new Response(JSON.stringify({
        pix_code: `00020126580014br.gov.bcb.pix0136${transaction_id}520400005303986540${Number(amount).toFixed(2)}5802BR`,
        message: "BSPAY not configured - demo mode",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!transaction) {
      return new Response(JSON.stringify({ error: "Transação não encontrada." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, email, cpf")
      .eq("user_id", transaction.user_id)
      .single();

    const apiUrl = resolveApiUrl(settings?.bspay_api_url);
    const webhookUrl = `${supabaseUrl}/functions/v1/bspay-webhook`;

    const baseTokens = uniqueStrings([clientSecret, clientId]);
    const oauthTokens = clientId && clientSecret ? await fetchOAuthTokens(apiUrl, clientId, clientSecret) : [];
    const allTokens = uniqueStrings([...baseTokens, ...oauthTokens]);

    if (allTokens.length === 0) {
      throw new Error("Nenhum token BSPAY disponível para autenticação.");
    }

    const authCandidates = buildAuthCandidates(allTokens);

    let pixData: any = null;
    let lastError = "";

    for (const auth of authCandidates) {
      const pixResponse = await fetch(`${apiUrl}/v2/pix/qrcode`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          ...auth.headers,
        },
        body: JSON.stringify({
          amount: Number(amount),
          external_id: transaction_id,
          postbackUrl: webhookUrl,
          payerQuestion: `Depósito - ${transaction_id}`,
          payer: {
            name: profile?.display_name || "Cliente",
            document: normalizeDocument(profile?.cpf),
            email: profile?.email || "cliente@exemplo.com",
          },
        }),
      });

      const rawText = await pixResponse.text();
      const parsed = parseJsonSafe(rawText) ?? { raw: rawText };

      const hasPixCode = Boolean(
        parsed?.pixCopiaECola ||
          parsed?.pix_copy_paste ||
          parsed?.qrCode ||
          parsed?.qr_code ||
          parsed?.pix_code,
      );

      if (pixResponse.ok && hasPixCode) {
        console.log(`BSPAY PIX criado com sucesso (${auth.label})`);
        pixData = parsed;
        break;
      }

      lastError = `BSPAY PIX falhou [${pixResponse.status}] (${auth.label}): ${rawText}`;
      console.error(lastError);
    }

    if (!pixData) {
      throw new Error(lastError || "BSPAY PIX creation failed");
    }

    await supabase
      .from("transactions")
      .update({
        external_id: pixData.transactionId || pixData.transaction_id || pixData.id || null,
        metadata: pixData,
      })
      .eq("id", transaction_id);

    return new Response(JSON.stringify({
      pix_code: pixData.pixCopiaECola || pixData.pix_copy_paste || pixData.qrCode || pixData.qr_code || pixData.pix_code,
      qr_code_image: pixData.qrCodeImage || pixData.qr_code_image || pixData.qr_code_base64 || null,
      transaction_id: pixData.transactionId || pixData.transaction_id || pixData.id || transaction_id,
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
