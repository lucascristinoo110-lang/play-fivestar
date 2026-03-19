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

    const balance = Number(profile.balance ?? 0).toFixed(4);
    console.log("[IGW-GETBALANCE]", JSON.stringify({ login: userId, balance }));

    return respond({ status: "1", balance });
  } catch (error: any) {
    console.error("[IGW-GETBALANCE]", error.message);
    return respond({ status: "-1", balance: "0.0000", errormsg: error.message || "INTERNAL_ERROR" });
  }
});

function respond(data: Record<string, unknown>) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
