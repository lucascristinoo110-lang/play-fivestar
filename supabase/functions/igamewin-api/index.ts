import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function parseJsonSafe(raw: string) {
  try { return JSON.parse(raw); } catch { return null; }
}

function normalizeCategory(name: string) {
  const lower = name.toLowerCase();
  if (/(roulette|roleta)/.test(lower)) return "roulette";
  if (/(aviator|spaceman|mines|jetx|crash|plinko|dice)/.test(lower)) return "crash";
  if (/(live|bacará|baccarat|blackjack|dragon tiger)/.test(lower)) return "live";
  if (/(table|mesa|poker)/.test(lower)) return "table";
  return "slots";
}

type NormalizedGame = {
  name: string;
  provider: string;
  category: string;
  image_url: string | null;
  game_code: string;
  is_new: boolean;
  is_hot: boolean;
  is_active: boolean;
  source: string;
};

/** Parse igamewin_api_key as "agentCode:agentToken" */
function parseCredentials(raw: string) {
  const trimmed = raw.trim();
  const idx = trimmed.indexOf(":");
  if (idx === -1) return { agentCode: "", agentToken: trimmed };
  return { agentCode: trimmed.slice(0, idx).trim(), agentToken: trimmed.slice(idx + 1).trim() };
}

/** Call iGameWin API v1 — single POST endpoint with method field */
async function callIgamewin(apiUrl: string, agentCode: string, agentToken: string, method: string, params: Record<string, unknown> = {}) {
  const body = { agent_code: agentCode, agent_token: agentToken, method, ...params };
  console.log(`iGameWin call: ${method}`, JSON.stringify({ ...body, agent_token: "***" }));

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify(body),
  });

  const rawText = await response.text();
  const parsed = parseJsonSafe(rawText);
  console.log(`iGameWin response [${response.status}]:`, rawText.slice(0, 500));

  return { response, rawText, parsed };
}

function normalizeGame(rawGame: any): NormalizedGame | null {
  const gameCode = String(rawGame?.game_code ?? rawGame?.code ?? rawGame?.id ?? "").trim();
  const name = String(rawGame?.name ?? rawGame?.title ?? "").trim();
  if (!gameCode || !name) return null;

  const providerName = String(rawGame?.provider?.name ?? rawGame?.provider ?? rawGame?.provider_code ?? rawGame?.vendor ?? "igamewin").trim();
  const imageUrl = String(rawGame?.image_url ?? rawGame?.cover ?? rawGame?.image ?? rawGame?.thumbnail ?? rawGame?.img ?? "").trim();

  return {
    name,
    provider: providerName,
    category: normalizeCategory(name),
    image_url: imageUrl || null,
    game_code: gameCode,
    is_new: false,
    is_hot: false,
    is_active: true,
    source: "igamewin",
  };
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const { action, user_id, game_code, provider } = body;

    const { data: settings } = await supabase
      .from("site_settings")
      .select("igamewin_api_key, igamewin_api_url")
      .limit(1)
      .single();

    const apiUrl = settings?.igamewin_api_url?.trim();
    const rawKey = settings?.igamewin_api_key?.trim();

    if (!apiUrl || !rawKey) {
      return new Response(
        JSON.stringify({ error: "iGameWin não configurado. Preencha API Key (agentCode:agentToken) e URL no painel admin." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { agentCode, agentToken } = parseCredentials(rawKey);
    if (!agentToken) {
      return new Response(
        JSON.stringify({ error: "Agent Token da iGameWin não configurado. Use o formato agentCode:agentToken no campo API Key." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── LIST GAMES ──
    if (action === "list_games") {
      // First get providers, then get games for each
      const { parsed: providerData } = await callIgamewin(apiUrl, agentCode, agentToken, "providerList");
      
      const providers = Array.isArray(providerData?.providers) ? providerData.providers
        : Array.isArray(providerData?.data) ? providerData.data
        : [];

      const allGames: NormalizedGame[] = [];
      for (const prov of providers) {
        const provCode = String(prov?.code ?? prov?.provider_code ?? prov?.name ?? "").trim();
        if (!provCode) continue;
        const { parsed: gameData } = await callIgamewin(apiUrl, agentCode, agentToken, "gameList", { provider_code: provCode });
        const gamesRaw = Array.isArray(gameData?.games) ? gameData.games
          : Array.isArray(gameData?.data) ? gameData.data
          : [];
        const normalized = gamesRaw.map(normalizeGame).filter((g): g is NormalizedGame => Boolean(g));
        allGames.push(...normalized);
      }

      return new Response(
        JSON.stringify({ status: true, games: allGames, total: allGames.length, providers_found: providers.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── SYNC GAMES ──
    if (action === "sync_games") {
      // Get provider list
      const { parsed: providerData, rawText: provRaw } = await callIgamewin(apiUrl, agentCode, agentToken, "providerList");
      
      const providers = Array.isArray(providerData?.providers) ? providerData.providers
        : Array.isArray(providerData?.data) ? providerData.data
        : [];

      if (providers.length === 0) {
        return new Response(
          JSON.stringify({ error: `Nenhum provedor encontrado na iGameWin. Resposta: ${provRaw?.slice(0, 300)}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const allIncoming: NormalizedGame[] = [];
      for (const prov of providers) {
        const provCode = String(prov?.code ?? prov?.provider_code ?? prov?.name ?? "").trim();
        if (!provCode) continue;
        try {
          const { parsed: gameData } = await callIgamewin(apiUrl, agentCode, agentToken, "gameList", { provider_code: provCode });
          const gamesRaw = Array.isArray(gameData?.games) ? gameData.games
            : Array.isArray(gameData?.data) ? gameData.data
            : [];
          const normalized = gamesRaw.map(normalizeGame).filter((g): g is NormalizedGame => Boolean(g));
          allIncoming.push(...normalized);
        } catch (e: any) {
          console.warn(`Failed to fetch games for provider ${provCode}:`, e.message);
        }
      }

      if (allIncoming.length === 0) {
        return new Response(
          JSON.stringify({ error: "Nenhum jogo encontrado nos provedores da iGameWin." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: existingGames } = await supabase
        .from("games")
        .select("id, name, provider, game_code, image_url, category, is_active, source");

      const existingByCode = new Map<string, any>();
      for (const game of existingGames ?? []) {
        if (game.game_code) {
          existingByCode.set(`${game.game_code}::${game.provider}`, game);
        }
      }

      const toInsert: any[] = [];
      const toUpdate: Array<{ id: string; payload: any }> = [];

      allIncoming.forEach((incoming, index) => {
        const key = `${incoming.game_code}::${incoming.provider}`;
        const existing = existingByCode.get(key);

        if (existing) {
          const needsUpdate =
            existing.name !== incoming.name ||
            (existing.image_url || null) !== incoming.image_url ||
            existing.is_active !== true ||
            existing.source !== "igamewin";

          if (needsUpdate) {
            toUpdate.push({
              id: existing.id,
              payload: { name: incoming.name, image_url: incoming.image_url, category: incoming.category, is_active: true, source: "igamewin" },
            });
          }
          return;
        }

        toInsert.push({ ...incoming, is_hot: false, is_new: false, sort_order: index });
      });

      for (const chunk of chunkArray(toUpdate, 100)) {
        await Promise.all(chunk.map(({ id, payload }) => supabase.from("games").update(payload).eq("id", id)));
      }

      for (const chunk of chunkArray(toInsert, 200)) {
        const { error } = await supabase.from("games").insert(chunk);
        if (error) throw new Error(`Erro ao importar jogos: ${error.message}`);
      }

      return new Response(
        JSON.stringify({
          status: true,
          total_received: allIncoming.length,
          imported: toInsert.length,
          updated: toUpdate.length,
          providers_found: providers.length,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── LAUNCH GAME ──
    if (action === "launch_game") {
      if (!user_id || !game_code) {
        return new Response(
          JSON.stringify({ error: "user_id e game_code são obrigatórios" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("balance, user_id")
        .eq("user_id", user_id)
        .single();

      if (!profile) {
        return new Response(
          JSON.stringify({ error: "Usuário não encontrado" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // First ensure user exists in iGameWin
      try {
        await callIgamewin(apiUrl, agentCode, agentToken, "createUser", {
          user_code: user_id,
        });
      } catch (e) {
        console.log("createUser may already exist, continuing...");
      }

      // Deposit balance (in centavos) 
      const balanceCents = Math.floor((Number(profile.balance) || 0) * 100);
      if (balanceCents > 0) {
        try {
          await callIgamewin(apiUrl, agentCode, agentToken, "deposit", {
            user_code: user_id,
            amount: balanceCents,
          });
        } catch (e) {
          console.log("deposit error (may already have funds):", e);
        }
      }

      // Launch game
      const { parsed, rawText } = await callIgamewin(apiUrl, agentCode, agentToken, "launchGame", {
        user_code: user_id,
        provider_code: provider || "",
        game_code: game_code,
        lang: "pt",
      });

      const launchUrl = parsed?.launch_url || parsed?.url || parsed?.game_url || parsed?.data?.url || parsed?.data?.launch_url;

      if (launchUrl) {
        return new Response(
          JSON.stringify({
            launch_url: launchUrl,
            user_balance: parsed?.user_balance ?? parsed?.balance,
            name: parsed?.name ?? game_code,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const errorMsg = String(parsed?.msg || parsed?.message || parsed?.error || rawText || "Falha ao abrir jogo");
      return new Response(
        JSON.stringify({
          error: errorMsg,
          provider_message: errorMsg,
          details: parsed,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Ação inválida. Use: list_games, sync_games, launch_game" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("iGameWin error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
