import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLAYFIVER_API = "http://72.62.162.29";
const CASINO_KEY_HEADER = { "X-Casino-Key": "meuSegredoCasino2026" };
const SUPPORTED_ACTIONS = ["list_games", "list_providers", "launch_game", "sync_games"] as const;

type PlayfiverSettings = {
  playfiver_api_key?: string | null;
  playfiver_api_url?: string | null;
};

type NormalizedGame = {
  name: string;
  provider: string;
  category: string;
  image_url: string | null;
  game_code: string;
  is_new: boolean;
  is_hot: boolean;
  is_active: boolean;
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
  return trimmed && /^https?:\/\//i.test(trimmed) ? trimmed : PLAYFIVER_API;
}

function parsePlayfiverCredentials(settings: PlayfiverSettings) {
  const raw = settings.playfiver_api_key?.trim() ?? "";
  if (!raw) return { token: "", secretKey: "" };

  const separatorIndex = raw.indexOf(":");
  if (separatorIndex === -1) {
    return { token: raw, secretKey: "" };
  }

  return {
    token: raw.slice(0, separatorIndex).trim(),
    secretKey: raw.slice(separatorIndex + 1).trim(),
  };
}

function normalizeProvider(value: unknown) {
  const parsed = String(value ?? "").trim();
  return parsed || "PLAYFIVER";
}

function normalizeCategory(name: string, provider: string) {
  const normalized = `${name} ${provider}`.toLowerCase();
  if (/(aviator|spaceman|mines|jetx|crash|plinko|dice)/.test(normalized)) return "crash";
  if (/(live|bacará|baccarat|blackjack|roulette|roleta|poker|dragon tiger)/.test(normalized)) return "live";
  if (/(table|mesa)/.test(normalized)) return "table";
  return "slots";
}

function normalizeGame(rawGame: any): NormalizedGame | null {
  const gameCode = String(rawGame?.game_code ?? rawGame?.code ?? "").trim();
  const name = String(rawGame?.name ?? rawGame?.title ?? "").trim();

  if (!gameCode || !name) return null;

  const provider = normalizeProvider(rawGame?.provider?.name ?? rawGame?.provider);
  const imageUrl = String(rawGame?.image_url ?? rawGame?.cover ?? rawGame?.image ?? "").trim();

  return {
    name,
    provider,
    category: normalizeCategory(name, provider),
    image_url: imageUrl || null,
    game_code: gameCode,
    is_new: false,
    is_hot: false,
    is_active: true,
  };
}

async function fetchPlayfiverGames(apiUrl: string) {
  const response = await fetch(`${apiUrl}/api/v2/games`, {
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
  });

  const rawText = await response.text();
  const parsed = parseJsonSafe(rawText);

  if (!response.ok) {
    throw new Error(`Playfiver games API error [${response.status}]: ${rawText}`);
  }

  const gamesRaw = Array.isArray(parsed?.data) ? parsed.data : [];
  const games = gamesRaw
    .map(normalizeGame)
    .filter((game): game is NormalizedGame => Boolean(game));

  return { games, raw: parsed, rawTotal: gamesRaw.length };
}

function normalizeLaunchError(message: string) {
  const lower = message.toLowerCase();

  if (lower.includes("ip não permitido") || lower.includes("ip nao permitido")) {
    return "IP do backend não permitido na Playfiver. Libere o IP do servidor no painel da Playfiver e tente novamente.";
  }

  if (
    lower.includes("não autorizado") ||
    lower.includes("nao autorizado") ||
    lower.includes("unauthorized") ||
    lower.includes("token") ||
    lower.includes("secret")
  ) {
    return "Credenciais da Playfiver inválidas. Revise Agent Token e Secret Key no admin.";
  }

  return message;
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const { action, user_id, game_code, provider } = body;

    if (!SUPPORTED_ACTIONS.includes(action)) {
      return new Response(JSON.stringify({
        error: `Ação inválida. Use: ${SUPPORTED_ACTIONS.join(", ")}`,
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: settings } = await supabase
      .from("site_settings")
      .select("playfiver_api_key, playfiver_api_url")
      .limit(1)
      .single();

    const apiUrl = resolveApiUrl(settings?.playfiver_api_url);

    if (action === "list_games") {
      const { games, raw, rawTotal } = await fetchPlayfiverGames(apiUrl);

      return new Response(JSON.stringify({
        status: true,
        games,
        total: games.length,
        provider_total: rawTotal,
        raw,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list_providers") {
      const response = await fetch(`${apiUrl}/api/v2/providers`, {
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
      });

      const rawText = await response.text();
      const parsed = parseJsonSafe(rawText) ?? { raw: rawText };

      if (!response.ok) {
        throw new Error(`Playfiver providers API error [${response.status}]: ${rawText}`);
      }

      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "sync_games") {
      const { games: incomingGames } = await fetchPlayfiverGames(apiUrl);

      const { data: existingGames, error: existingError } = await supabase
        .from("games")
        .select("id, name, provider, game_code, image_url, category, is_active");

      if (existingError) {
        throw new Error(`Erro ao ler jogos existentes: ${existingError.message}`);
      }

      const existingList = existingGames ?? [];
      const existingByCodeProvider = new Map<string, any>();
      const existingLegacyByName = new Map<string, any>();

      for (const game of existingList) {
        const key = `${game.game_code || ""}::${game.provider || ""}`;
        if (game.game_code) existingByCodeProvider.set(key, game);

        if (String(game.provider || "").toLowerCase() === "playfiver") {
          existingLegacyByName.set(String(game.name || "").trim().toLowerCase(), game);
        }
      }

      const toInsert: Array<Omit<NormalizedGame, "is_hot" | "is_new"> & { is_hot: boolean; is_new: boolean; sort_order: number }> = [];
      const toUpdate: Array<{ id: string; payload: Partial<NormalizedGame> }> = [];

      incomingGames.forEach((incoming, index) => {
        const exactKey = `${incoming.game_code}::${incoming.provider}`;
        const sameRecord = existingByCodeProvider.get(exactKey);

        if (sameRecord) {
          const needsUpdate =
            sameRecord.name !== incoming.name ||
            (sameRecord.image_url || null) !== incoming.image_url ||
            (sameRecord.category || "slots") !== incoming.category ||
            sameRecord.is_active !== true;

          if (needsUpdate) {
            toUpdate.push({
              id: sameRecord.id,
              payload: {
                name: incoming.name,
                image_url: incoming.image_url,
                category: incoming.category,
                is_active: true,
              },
            });
          }

          return;
        }

        const legacy = existingLegacyByName.get(incoming.name.trim().toLowerCase());
        if (legacy) {
          toUpdate.push({
            id: legacy.id,
            payload: {
              name: incoming.name,
              provider: incoming.provider,
              game_code: incoming.game_code,
              image_url: incoming.image_url,
              category: incoming.category,
              is_active: true,
            },
          });
          existingLegacyByName.delete(incoming.name.trim().toLowerCase());
          return;
        }

        toInsert.push({
          ...incoming,
          is_hot: false,
          is_new: false,
          sort_order: index,
        });
      });

      for (const updateChunk of chunkArray(toUpdate, 100)) {
        await Promise.all(
          updateChunk.map(({ id, payload }) =>
            supabase.from("games").update(payload).eq("id", id)
          ),
        );
      }

      for (const insertChunk of chunkArray(toInsert, 200)) {
        const { error } = await supabase.from("games").insert(insertChunk);
        if (error) {
          throw new Error(`Erro ao importar jogos: ${error.message}`);
        }
      }

      return new Response(JSON.stringify({
        status: true,
        total_received: incomingGames.length,
        imported: toInsert.length,
        updated: toUpdate.length,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // launch_game
    if (!user_id || !game_code || !provider) {
      return new Response(JSON.stringify({ error: "user_id, game_code e provider são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { token, secretKey } = parsePlayfiverCredentials(settings || {});

    if (!token || !secretKey) {
      return new Response(JSON.stringify({
        error: "Playfiver não configurado corretamente. Preencha Agent Token e Secret Key no painel admin.",
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedProvider = String(provider).trim();

    const { data: profile } = await supabase
      .from("profiles")
      .select("balance, user_id")
      .eq("user_id", user_id)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: "Usuário não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch(`${apiUrl}/api/v2/game_launch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        agentToken: token,
        secretKey,
        user_code: profile.user_id,
        game_code,
        provider: normalizedProvider,
        game_original: false,
        user_balance: Number(profile.balance) || 0,
        lang: "pt",
      }),
    });

    const rawText = await response.text();
    const parsed = parseJsonSafe(rawText) ?? { raw: rawText };

    if (!response.ok || !parsed?.status || !parsed?.launch_url) {
      const providerMessage = String(parsed?.msg || parsed?.message || rawText || "Falha ao abrir jogo");
      return new Response(JSON.stringify({
        error: normalizeLaunchError(providerMessage),
        provider_message: providerMessage,
        details: parsed,
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      launch_url: parsed.launch_url,
      user_balance: parsed.user_balance,
      name: parsed.name,
    }), {
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
