import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLAYFIVER_API = "https://api.playfivers.com";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, user_id, game_code, provider } = await req.json();

    // Get Playfiver credentials from site_settings
    const { data: settings } = await supabase
      .from("site_settings")
      .select("playfiver_api_key, playfiver_api_url")
      .limit(1)
      .single();

    const rawApiUrl = settings?.playfiver_api_url?.trim();
    const apiUrl = rawApiUrl && /^https?:\/\//.test(rawApiUrl) ? rawApiUrl : PLAYFIVER_API;

    const credential = settings?.playfiver_api_key?.trim() || "";
    // Formato esperado no admin: agentToken:secretKey
    const [token, secretKey] = credential.includes(":") ? credential.split(":") : [credential, ""];

    // ACTION: list_games - fetch all games from Playfiver
    if (action === "list_games") {
      const response = await fetch(`${apiUrl}/api/v2/games`, {
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Playfiver games API error [${response.status}]: ${await response.text()}`);
      }

      const data = await response.json();
      const games = Array.isArray(data?.data) ? data.data : [];

      return new Response(JSON.stringify({
        status: true,
        games,
        total: games.length,
        raw: data,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: list_providers - fetch all providers from Playfiver
    if (action === "list_providers") {
      const response = await fetch(`${apiUrl}/api/v2/providers`, {
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Playfiver providers API error [${response.status}]: ${await response.text()}`);
      }

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: launch_game - launch a game for a user
    if (action === "launch_game") {
      if (!user_id || !game_code || !provider) {
        return new Response(JSON.stringify({ error: "user_id, game_code, and provider are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get user profile for balance
      const { data: profile } = await supabase
        .from("profiles")
        .select("balance, email, user_id")
        .eq("user_id", user_id)
        .single();

      if (!profile) {
        return new Response(JSON.stringify({ error: "User not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const response = await fetch(`${apiUrl}/api/v2/game_launch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentToken: token,
          secretKey: secretKey,
          user_code: profile.user_id,
          game_code: game_code,
          provider: provider,
          game_original: false,
          user_balance: Number(profile.balance) || 0,
          lang: "pt",
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.status) {
        return new Response(JSON.stringify({ error: data.msg || "Failed to launch game", details: data }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        launch_url: data.launch_url,
        user_balance: data.user_balance,
        name: data.name,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action. Use: list_games, list_providers, launch_game" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Playfiver error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
