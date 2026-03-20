import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TRACKED_LEAGUES: Record<string, string[]> = {
  Brazil: ["Brasileirão Betano", "Brasileirão Série B", "Copa do Brasil"],
  "South America": ["Copa Libertadores", "Copa Sudamericana"],
  England: ["Premier League"],
  Spain: ["LaLiga"],
  Italy: ["Serie A"],
  Germany: ["Bundesliga"],
  France: ["Ligue 1"],
  Europe: ["UEFA Champions League", "UEFA Europa League"],
};

function isTrackedLeague(category: string, tournament: string) {
  return Object.entries(TRACKED_LEAGUES).some(([allowedCategory, allowedTournaments]) => {
    const categoryMatches =
      category === allowedCategory ||
      (allowedCategory === "South America" && (category === "South America" || category === "World"));

    if (!categoryMatches) return false;

    return allowedTournaments.some(
      (label) => tournament.includes(label) || label.includes(tournament),
    );
  });
}

function formatDate(date: Date) {
  return date.toISOString().split("T")[0];
}

function parseProxyJson(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Could not extract JSON from proxy response");
  }

  return JSON.parse(text.slice(start, end + 1));
}

async function fetchSofascoreDate(date: string) {
  const proxyUrl = `https://r.jina.ai/http://https://api.sofascore.com/api/v1/sport/football/scheduled-events/${date}`;
  const res = await fetch(proxyUrl, {
    headers: {
      Accept: "text/plain, application/json",
      "X-Return-Format": "text",
    },
  });

  if (!res.ok) {
    throw new Error(`Proxy fetch failed for ${date} [${res.status}]`);
  }

  const text = await res.text();
  return parseProxyJson(text);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const token = authHeader?.replace("Bearer ", "");
    if (!token) throw new Error("No token");

    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );

    const {
      data: { user },
      error: authErr,
    } = await authClient.auth.getUser(token);

    if (authErr || !user) throw new Error("Unauthorized");

    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) throw new Error("Not admin");

    console.log("Admin verified, starting sports reload via proxy...");

    const baseDate = new Date();
    const dates: string[] = [];
    for (let offset = -2; offset <= 7; offset++) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + offset);
      dates.push(formatDate(d));
    }

    let processed = 0;
    let errors = 0;
    const seenExternalIds = new Set<string>();

    for (const date of dates) {
      try {
        console.log(`Fetching events for ${date}...`);
        const payload = await fetchSofascoreDate(date);
        const events = Array.isArray(payload?.events) ? payload.events : [];
        console.log(`Fetched ${events.length} events for ${date}`);

        for (const event of events) {
          const category = event?.tournament?.category?.name || "";
          const tournament = event?.tournament?.name || "";

          if (!isTrackedLeague(category, tournament)) continue;

          const eventId = event?.id;
          const homeTeam = event?.homeTeam?.name || "";
          const awayTeam = event?.awayTeam?.name || "";
          const startTimestamp = event?.startTimestamp;

          if (!eventId || !homeTeam || !awayTeam || !startTimestamp) continue;

          const externalId = `sofascore-${eventId}`;
          if (seenExternalIds.has(externalId)) continue;
          seenExternalIds.add(externalId);

          const statusType = event?.status?.type || "notstarted";
          const status = statusType === "finished"
            ? "finished"
            : statusType === "inprogress"
              ? "live"
              : "upcoming";

          const row = {
            external_id: externalId,
            league_name: tournament,
            league_api_id: String(event?.tournament?.uniqueTournament?.id || event?.tournament?.id || "0"),
            home_team: homeTeam,
            away_team: awayTeam,
            home_badge: event?.homeTeam?.id
              ? `https://api.sofascore.app/api/v1/team/${event.homeTeam.id}/image`
              : null,
            away_badge: event?.awayTeam?.id
              ? `https://api.sofascore.app/api/v1/team/${event.awayTeam.id}/image`
              : null,
            kickoff: new Date(startTimestamp * 1000).toISOString(),
            home_score: event?.homeScore?.current ?? null,
            away_score: event?.awayScore?.current ?? null,
            status,
            venue: event?.venue?.stadium?.name || null,
            city: event?.venue?.city?.name || null,
            updated_at: new Date().toISOString(),
          };

          const { error } = await adminClient
            .from("sports_matches")
            .upsert(row, { onConflict: "external_id" });

          if (error) {
            errors += 1;
            console.log(`Upsert failed for ${externalId}: ${error.message}`);
            continue;
          }

          processed += 1;
        }
      } catch (error) {
        errors += 1;
        console.log(`Date ${date} failed: ${error instanceof Error ? error.message : "unknown error"}`);
      }
    }

    const cutoff = new Date(Date.now() - 14 * 86400000).toISOString();
    await adminClient
      .from("sports_matches")
      .delete()
      .eq("status", "finished")
      .lt("kickoff", cutoff);

    console.log(`Done! Processed: ${processed}, Errors: ${errors}`);

    return new Response(JSON.stringify({ success: true, matches_processed: processed, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Fatal reload-sports error:", message);

    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
