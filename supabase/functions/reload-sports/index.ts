import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ESPN soccer league slugs we track
const TRACKED_LEAGUES = [
  "bra.1",
  "bra.2",
  "bra.copa_do_brazil",
  "conmebol.libertadores",
  "conmebol.sudamericana",
  "eng.1",
  "esp.1",
  "ita.1",
  "ger.1",
  "fra.1",
  "uefa.champions",
  "uefa.europa",
  "uefa.europa.conf",
  "fifa.world",
  "fifa.friendly",
  "fifa.worldq.uefa",
  "fifa.worldq.conmebol",
  "club.fifa",
];

const LOOKBACK_DAYS = 1;
const LOOKAHEAD_DAYS = 10;
const STALE_MATCH_GRACE_HOURS = 6;
const FINISHED_RETENTION_DAYS = 14;

function formatDateForEspn(date: Date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

async function fetchEspnLeagueDate(league: string, date: string) {
  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/scoreboard?dates=${date}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0 (compatible; LovableSportsSync/1.0)",
    },
  });
  if (!res.ok) {
    throw new Error(`ESPN ${league} ${date} HTTP ${res.status}`);
  }
  return await res.json();
}

function mapStatus(state: string | undefined) {
  if (state === "post") return "finished";
  if (state === "in") return "live";
  return "upcoming";
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

    let isCron = false;
    try {
      const bodyJson = await req.clone().json();
      isCron = bodyJson?.source === "cron";
    } catch { /* no body */ }

    if (!isCron) {
      const token = authHeader?.replace("Bearer ", "");
      if (!token) throw new Error("No token");

      const authClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
      );

      const { data: { user }, error: authErr } = await authClient.auth.getUser(token);
      if (authErr || !user) throw new Error("Unauthorized");

      const { data: roleData } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!roleData) throw new Error("Not admin");
    }

    console.log("Starting sports reload from ESPN...");

    const baseDate = new Date();
    const dates: string[] = [];
    for (let offset = -LOOKBACK_DAYS; offset <= LOOKAHEAD_DAYS; offset++) {
      const d = new Date(baseDate);
      d.setUTCDate(d.getUTCDate() + offset);
      dates.push(formatDateForEspn(d));
    }

    let processed = 0;
    let errors = 0;
    const seenExternalIds = new Set<string>();

    for (const league of TRACKED_LEAGUES) {
      for (const date of dates) {
        try {
          const payload = await fetchEspnLeagueDate(league, date);
          const events = Array.isArray(payload?.events) ? payload.events : [];
          if (events.length === 0) continue;

          const leagueInfo = Array.isArray(payload?.leagues) ? payload.leagues[0] : null;
          const leagueName = leagueInfo?.name || league;
          const leagueApiId = String(leagueInfo?.id || league);

          for (const event of events) {
            const eventId = event?.id;
            const competition = Array.isArray(event?.competitions) ? event.competitions[0] : null;
            const competitors = Array.isArray(competition?.competitors) ? competition.competitors : [];
            if (!eventId || !competition || competitors.length < 2) continue;

            const home = competitors.find((c: any) => c.homeAway === "home") || competitors[0];
            const away = competitors.find((c: any) => c.homeAway === "away") || competitors[1];
            const homeTeam = home?.team?.displayName || home?.team?.name || "";
            const awayTeam = away?.team?.displayName || away?.team?.name || "";
            const kickoff = event?.date || competition?.date;
            if (!homeTeam || !awayTeam || !kickoff) continue;

            const externalId = `espn-${eventId}`;
            if (seenExternalIds.has(externalId)) continue;
            seenExternalIds.add(externalId);

            const status = mapStatus(event?.status?.type?.state);

            const homeScore = home?.score != null && home.score !== "" ? Number(home.score) : null;
            const awayScore = away?.score != null && away.score !== "" ? Number(away.score) : null;

            const row = {
              external_id: externalId,
              league_name: leagueName,
              league_api_id: leagueApiId,
              home_team: homeTeam,
              away_team: awayTeam,
              home_badge: home?.team?.logo || null,
              away_badge: away?.team?.logo || null,
              kickoff: new Date(kickoff).toISOString(),
              home_score: Number.isFinite(homeScore) ? homeScore : null,
              away_score: Number.isFinite(awayScore) ? awayScore : null,
              status,
              venue: competition?.venue?.fullName || null,
              city: competition?.venue?.address?.city || competition?.venue?.address?.country || null,
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
          console.log(`League ${league} date ${date} failed: ${error instanceof Error ? error.message : "unknown"}`);
        }
      }
    }

    const staleMatchCutoff = new Date(Date.now() - STALE_MATCH_GRACE_HOURS * 3600000).toISOString();
    const oldFinishedCutoff = new Date(Date.now() - FINISHED_RETENTION_DAYS * 86400000).toISOString();

    await adminClient
      .from("sports_matches")
      .delete()
      .in("status", ["upcoming", "live"])
      .lt("kickoff", staleMatchCutoff);

    await adminClient
      .from("sports_matches")
      .delete()
      .eq("status", "finished")
      .lt("kickoff", oldFinishedCutoff);

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
