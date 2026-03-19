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

function normalizeGame(rawGame: any): NormalizedGame | null {
  const gameCode = String(rawGame?.game_code ?? rawGame?.code ?? rawGame?.id ?? "").trim();
  const name = String(rawGame?.name ?? rawGame?.title ?? "").trim();
  if (!gameCode || !name) return null;

  const providerName = String(rawGame?.provider?.name ?? rawGame?.provider ?? rawGame?.vendor ?? "igamewin").trim();
  const imageUrl = String(rawGame?.image_url ?? rawGame?.cover ?? rawGame?.image ?? rawGame?.thumbnail ?? "").trim();

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

async function getSettings(supabase: ReturnType<typeof createClient>) {
  const { data } = await supabase
    .from("site_settings")
    .select("igamewin_api_key, igamewin_api_url")
    .limit(1)
    .single();
  return data;
}

async function fetchIgamewinGames(apiUrl: string, apiKey: string) {
  let gamesRaw: any[] = [];
  let lastError = "";

  for (const endpoint of ["/api/games", "/api/v2/games", "/games", "/api/game/list"]) {
    try {
      const response = await fetch(`${apiUrl}${endpoint}`, {
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "X-Api-Key": apiKey,
        },
      });

      const rawText = await response.text();
      const parsed = parseJsonSafe(rawText);

      if (response.ok && parsed) {
        gamesRaw = Array.isArray(parsed?.data) ? parsed.data
          : Array.isArray(parsed?.games) ? parsed.games
          : Array.isArray(parsed) ? parsed
          : [];

        if (gamesRaw.length > 0) break;
      } else {
        lastError = `${endpoint} -> [${response.status}] ${rawText.slice(0, 200)}`;
      }
    } catch (e: any) {
      lastError = `${endpoint} -> ${e.message}`;
    }
  }

  return { gamesRaw, lastError };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const { action, user_id, game_code, provider } = body;

    const settings = await getSettings(supabase);
    const apiUrl = settings?.igamewin_api_url?.trim();
    const apiKey = settings?.igamewin_api_key?.trim();

    if (!apiUrl || !apiKey) {
      return new Response(
        JSON.stringify({ error: "iGameWin não configurado. Preencha API Key e URL no painel admin." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── LIST GAMES ──
    if (action === "list_games") {
      const response = await fetch(`${apiUrl}/api/games`, {
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "X-Api-Key": apiKey,
        },
      });

      const rawText = await response.text();
      const parsed = parseJsonSafe(rawText);

      if (!response.ok) {
        throw new Error(`iGameWin API error [${response.status}]: ${rawText.slice(0, 500)}`);
      }

      const gamesRaw = Array.isArray(parsed?.data) ? parsed.data
        : Array.isArray(parsed?.games) ? parsed.games
        : Array.isArray(parsed) ? parsed
        : [];

      const games = gamesRaw.map(normalizeGame).filter((g): g is NormalizedGame => Boolean(g));

      return new Response(
        JSON.stringify({ status: true, games, total: games.length, provider_total: gamesRaw.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── SYNC GAMES ──
    if (action === "sync_games") {
      const { gamesRaw, lastError } = await fetchIgamewinGames(apiUrl, apiKey);

      if (gamesRaw.length === 0) {
        return new Response(
          JSON.stringify({
            error: `Nenhum jogo encontrado na API iGameWin. Verifique URL e credenciais. Último erro: ${lastError}`,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const incomingGames = gamesRaw.map(normalizeGame).filter((g): g is NormalizedGame => Boolean(g));

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

      incomingGames.forEach((incoming, index) => {
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
          total_received: incomingGames.length,
          imported: toInsert.length,
          updated: toUpdate.length,
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

      // Get user balance
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

      const userBalance = Number(profile.balance) || 0;

      // Try multiple launch endpoints common in iGaming APIs
      const launchPayloads = [
        {
          endpoint: "/api/game/launch",
          body: {
            api_key: apiKey,
            game_code: game_code,
            player_id: user_id,
            player_name: user_id,
            currency: "BRL",
            balance: userBalance,
            lang: "pt",
            provider: provider || "",
            callback_url: `${supabaseUrl}/functions/v1/playfiver-webhook`,
          },
        },
        {
          endpoint: "/api/v2/game_launch",
          body: {
            api_key: apiKey,
            game_code: game_code,
            user_code: user_id,
            user_balance: userBalance,
            provider: provider || "",
            lang: "pt",
            callback_url: `${supabaseUrl}/functions/v1/playfiver-webhook`,
          },
        },
        {
          endpoint: "/api/games/launch",
          body: {
            token: apiKey,
            game_code: game_code,
            player_id: user_id,
            balance: userBalance,
            currency: "BRL",
            language: "pt",
            provider: provider || "",
          },
        },
      ];

      let lastLaunchError = "";
      let lastParsed: any = null;

      for (const { endpoint, body: launchBody } of launchPayloads) {
        try {
          console.log(`Trying iGameWin launch: ${apiUrl}${endpoint} for game ${game_code}`);
          
          const response = await fetch(`${apiUrl}${endpoint}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json",
              "Authorization": `Bearer ${apiKey}`,
              "X-Api-Key": apiKey,
            },
            body: JSON.stringify(launchBody),
          });

          const rawText = await response.text();
          const parsed = parseJsonSafe(rawText) ?? { raw: rawText };
          lastParsed = parsed;

          console.log(`iGameWin launch response [${response.status}] from ${endpoint}:`, rawText.slice(0, 500));

          // Check for launch URL in various response formats
          const launchUrl = parsed?.launch_url || parsed?.url || parsed?.game_url || parsed?.data?.url || parsed?.data?.launch_url;

          if (response.ok && launchUrl) {
            return new Response(
              JSON.stringify({
                launch_url: launchUrl,
                user_balance: parsed?.user_balance ?? parsed?.balance ?? userBalance,
                name: parsed?.name ?? game_code,
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          lastLaunchError = String(parsed?.msg || parsed?.message || parsed?.error || rawText || "Falha ao abrir jogo");
          
          // If we got a clear error (not 404), don't try other endpoints
          if (response.status !== 404 && response.status !== 405) break;
        } catch (e: any) {
          lastLaunchError = `${endpoint} -> ${e.message}`;
          console.error(`iGameWin launch error at ${endpoint}:`, e.message);
        }
      }

      return new Response(
        JSON.stringify({
          error: lastLaunchError || "Falha ao abrir jogo na iGameWin. Verifique suas credenciais e a URL da API.",
          provider_message: lastLaunchError,
          details: lastParsed,
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
