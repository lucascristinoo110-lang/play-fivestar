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

/** Call iGameWin API — single POST endpoint with method field */
async function callIgw(apiUrl: string, agentCode: string, agentToken: string, method: string, params: Record<string, unknown> = {}) {
  const body = { method, agent_code: agentCode, agent_token: agentToken, ...params };
  console.log(`[IGW] → ${method}`, JSON.stringify({ ...body, agent_token: "***" }));

  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  const json = parseJsonSafe(text);
  console.log(`[IGW] ← ${method} [${res.status}]:`, text.slice(0, 500));

  if (json && json.status === 0) {
    throw new Error(json.msg || json.error || "API_ERROR");
  }

  return { res, text, json };
}

function normalizeGame(rawGame: any): NormalizedGame | null {
  const gameCode = String(rawGame?.game_code ?? rawGame?.code ?? rawGame?.id ?? "").trim();
  const name = String(rawGame?.name ?? rawGame?.title ?? "").trim();
  if (!gameCode || !name) return null;

  const providerName = String(rawGame?.provider?.name ?? rawGame?.provider ?? rawGame?.provider_code ?? rawGame?.vendor ?? "igamewin").trim();
  const imageUrl = String(rawGame?.image_url ?? rawGame?.cover ?? rawGame?.image ?? rawGame?.thumbnail ?? rawGame?.img ?? "").trim();

  return {
    name, provider: providerName,
    category: normalizeCategory(name),
    image_url: imageUrl || null,
    game_code: gameCode,
    is_new: false, is_hot: false, is_active: true, source: "igamewin",
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
      .limit(1).single();

    const apiUrl = settings?.igamewin_api_url?.trim();
    const rawKey = settings?.igamewin_api_key?.trim();

    if (!apiUrl || !rawKey) {
      return new Response(JSON.stringify({ error: "iGameWin não configurado. Preencha API Key (agentCode:agentToken) e URL no painel admin." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { agentCode, agentToken } = parseCredentials(rawKey);
    if (!agentCode || !agentToken) {
      return new Response(JSON.stringify({ error: "Credenciais incompletas. Use o formato agentCode:agentToken no campo API Key." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const ok = (data: unknown) => new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const fail = (msg: string, status = 400, extra = {}) => new Response(JSON.stringify({ error: msg, ...extra }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // ── LIST / SYNC helpers ──
    async function fetchAllGames() {
      const { json: provData } = await callIgw(apiUrl, agentCode, agentToken, "provider_list");
      const providers = Array.isArray(provData?.providers) ? provData.providers
        : Array.isArray(provData?.data) ? provData.data : [];

      const all: NormalizedGame[] = [];
      for (const p of providers) {
        const code = String(p?.code ?? p?.provider_code ?? p?.name ?? "").trim();
        if (!code) continue;
        try {
          const { json: gData } = await callIgw(apiUrl, agentCode, agentToken, "game_list", { provider_code: code });
          const raw = Array.isArray(gData?.games) ? gData.games : Array.isArray(gData?.data) ? gData.data : [];
          all.push(...raw.map(normalizeGame).filter((g): g is NormalizedGame => Boolean(g)));
        } catch (e: any) {
          console.warn(`Skip provider ${code}: ${e.message}`);
        }
      }
      return { games: all, providersCount: providers.length };
    }

    // ── LIST GAMES ──
    if (action === "list_games") {
      const { games, providersCount } = await fetchAllGames();
      return ok({ status: true, games, total: games.length, providers_found: providersCount });
    }

    // ── SYNC GAMES ──
    if (action === "sync_games") {
      const { games: incoming, providersCount } = await fetchAllGames();

      if (incoming.length === 0) {
        return fail(`Nenhum jogo encontrado (${providersCount} provedores verificados). Verifique credenciais.`);
      }

      const { data: existing } = await supabase.from("games").select("id, name, provider, game_code, image_url, category, is_active, source");
      const byKey = new Map<string, any>();
      for (const g of existing ?? []) {
        if (g.game_code) byKey.set(`${g.game_code}::${g.provider}`, g);
      }

      const toInsert: any[] = [];
      const toUpdate: { id: string; payload: any }[] = [];

      incoming.forEach((g, i) => {
        const key = `${g.game_code}::${g.provider}`;
        const ex = byKey.get(key);
        if (ex) {
          if (ex.name !== g.name || (ex.image_url || null) !== g.image_url || !ex.is_active || ex.source !== "igamewin") {
            toUpdate.push({ id: ex.id, payload: { name: g.name, image_url: g.image_url, category: g.category, is_active: true, source: "igamewin" } });
          }
        } else {
          toInsert.push({ ...g, sort_order: i });
        }
      });

      for (const chunk of chunkArray(toUpdate, 100))
        await Promise.all(chunk.map(({ id, payload }) => supabase.from("games").update(payload).eq("id", id)));
      for (const chunk of chunkArray(toInsert, 200)) {
        const { error } = await supabase.from("games").insert(chunk);
        if (error) throw new Error(`Erro ao importar: ${error.message}`);
      }

      return ok({ status: true, total_received: incoming.length, imported: toInsert.length, updated: toUpdate.length, providers_found: providersCount });
    }

    // ── LAUNCH GAME ──
    if (action === "launch_game") {
      if (!user_id || !game_code) return fail("user_id e game_code são obrigatórios");

      const { data: profile } = await supabase.from("profiles").select("balance, user_id").eq("user_id", user_id).single();
      if (!profile) return fail("Usuário não encontrado", 404);

      // Ensure user exists in iGameWin (ignore DUPLICATED_USER)
      try {
        await callIgw(apiUrl, agentCode, agentToken, "user_create", { user_code: user_id });
      } catch (e: any) {
        if (!e.message?.includes("DUPLICATED_USER")) console.warn("user_create warning:", e.message);
      }

      // Launch game
      try {
        const { json } = await callIgw(apiUrl, agentCode, agentToken, "game_launch", {
          user_code: user_id,
          provider_code: provider || "",
          game_code,
          lang: "pt",
        });

        const launchUrl = json?.launch_url || json?.url || json?.game_url || json?.data?.url || json?.data?.launch_url;
        if (launchUrl) {
          return ok({ launch_url: launchUrl, user_balance: json?.user_balance ?? json?.balance, name: json?.name ?? game_code });
        }

        return fail(json?.msg || json?.message || "Nenhuma URL de jogo retornada pela iGameWin");
      } catch (e: any) {
        return fail(e.message || "Erro ao lançar jogo na iGameWin", 400, { provider_message: e.message });
      }
    }

    return fail("Ação inválida. Use: list_games, sync_games, launch_game");
  } catch (error: any) {
    console.error("iGameWin error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
