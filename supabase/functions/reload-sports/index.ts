import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Leagues we want to track (by SofaScore tournament category + name)
const TRACKED_LEAGUES: Record<string, string[]> = {
  "Brazil": [
    "Brasileirão Betano",
    "Brasileirão Série B",
    "Copa do Brasil",
    "Copa do Brasil U20",
  ],
  "South America": [
    "Copa Libertadores",
    "Copa Sudamericana",
  ],
  "England": ["Premier League"],
  "Spain": ["LaLiga"],
  "Italy": ["Serie A"],
  "Germany": ["Bundesliga"],
  "France": ["Ligue 1"],
  "Europe": ["UEFA Champions League", "UEFA Europa League"],
};

function isTrackedLeague(category: string, tournament: string): boolean {
  for (const [cat, tournaments] of Object.entries(TRACKED_LEAGUES)) {
    if (category === cat || (cat === "South America" && (category === "South America" || category === "World"))) {
      if (tournaments.some(t => tournament.includes(t) || t.includes(tournament))) {
        return true;
      }
    }
  }
  return false;
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify admin
    const token = authHeader?.replace("Bearer ", "");
    if (!token) throw new Error("No token");
    const { data: { user }, error: authErr } = await createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    ).auth.getUser(token);
    if (authErr || !user) throw new Error("Unauthorized");

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) throw new Error("Not admin");

    console.log("Admin verified, starting to fetch matches...");

    // Fetch next 7 days of events from SofaScore
    const today = new Date();
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      dates.push(formatDate(d));
    }

    let totalProcessed = 0;
    let totalErrors = 0;
    const seenIds = new Set<string>();

    for (const date of dates) {
      try {
        console.log(`Fetching events for ${date}...`);
        const res = await fetch(
          `https://api.sofascore.com/api/v1/sport/football/scheduled-events/${date}`,
          {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              "Accept": "application/json",
            },
          }
        );

        if (!res.ok) {
          console.log(`Failed to fetch ${date}: ${res.status}`);
          continue;
        }

        const data = await res.json();
        const events = data?.events || [];
        console.log(`Got ${events.length} total events for ${date}`);

        for (const e of events) {
          const category = e?.tournament?.category?.name || "";
          const tournament = e?.tournament?.name || "";

          if (!isTrackedLeague(category, tournament)) continue;

          const externalId = `sofascore-${e.id}`;
          if (seenIds.has(externalId)) continue;
          seenIds.add(externalId);

          const homeTeam = e?.homeTeam?.name || "";
          const awayTeam = e?.awayTeam?.name || "";
          if (!homeTeam || !awayTeam) continue;

          const startTimestamp = e?.startTimestamp;
          if (!startTimestamp) continue;

          const kickoff = new Date(startTimestamp * 1000).toISOString();

          // Determine status
          const statusCode = e?.status?.type || "notstarted";
          let status = "upcoming";
          let homeScore: number | null = null;
          let awayScore: number | null = null;

          if (statusCode === "finished") {
            status = "finished";
            homeScore = e?.homeScore?.current ?? null;
            awayScore = e?.awayScore?.current ?? null;
          } else if (statusCode === "inprogress") {
            status = "live";
            homeScore = e?.homeScore?.current ?? null;
            awayScore = e?.awayScore?.current ?? null;
          }

          // Build league display name
          let leagueName = tournament;
          if (category === "Brazil" && !tournament.includes("Brasil")) {
            leagueName = tournament;
          }

          const row = {
            external_id: externalId,
            league_name: leagueName,
            league_api_id: String(e?.tournament?.uniqueTournament?.id || e?.tournament?.id || "0"),
            home_team: homeTeam,
            away_team: awayTeam,
            home_badge: e?.homeTeam?.id
              ? `https://api.sofascore.app/api/v1/team/${e.homeTeam.id}/image`
              : null,
            away_badge: e?.awayTeam?.id
              ? `https://api.sofascore.app/api/v1/team/${e.awayTeam.id}/image`
              : null,
            kickoff,
            home_score: homeScore,
            away_score: awayScore,
            status,
            venue: e?.venue?.stadium?.name || null,
            city: e?.venue?.city?.name || null,
            updated_at: new Date().toISOString(),
          };

          const { error } = await supabase
            .from("sports_matches")
            .upsert(row, { onConflict: "external_id" });

          if (error) {
            console.log(`Error upserting ${externalId}: ${error.message}`);
            totalErrors++;
          } else {
            totalProcessed++;
          }
        }

        // Small delay between date requests to avoid rate limiting
        await new Promise(r => setTimeout(r, 500));
      } catch (err: any) {
        console.log(`Error fetching date ${date}: ${err.message}`);
      }
    }

    // Also fetch past 3 days for recently finished matches
    for (let i = 1; i <= 3; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const date = formatDate(d);

      try {
        console.log(`Fetching past events for ${date}...`);
        const res = await fetch(
          `https://api.sofascore.com/api/v1/sport/football/scheduled-events/${date}`,
          {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              "Accept": "application/json",
            },
          }
        );

        if (!res.ok) continue;
        const data = await res.json();
        const events = data?.events || [];

        for (const e of events) {
          const category = e?.tournament?.category?.name || "";
          const tournament = e?.tournament?.name || "";
          if (!isTrackedLeague(category, tournament)) continue;

          const externalId = `sofascore-${e.id}`;
          if (seenIds.has(externalId)) continue;
          seenIds.add(externalId);

          const homeTeam = e?.homeTeam?.name || "";
          const awayTeam = e?.awayTeam?.name || "";
          if (!homeTeam || !awayTeam) continue;

          const startTimestamp = e?.startTimestamp;
          if (!startTimestamp) continue;

          const row = {
            external_id: externalId,
            league_name: tournament,
            league_api_id: String(e?.tournament?.uniqueTournament?.id || e?.tournament?.id || "0"),
            home_team: homeTeam,
            away_team: awayTeam,
            home_badge: e?.homeTeam?.id
              ? `https://api.sofascore.app/api/v1/team/${e.homeTeam.id}/image`
              : null,
            away_badge: e?.awayTeam?.id
              ? `https://api.sofascore.app/api/v1/team/${e.awayTeam.id}/image`
              : null,
            kickoff: new Date(startTimestamp * 1000).toISOString(),
            home_score: e?.homeScore?.current ?? null,
            away_score: e?.awayScore?.current ?? null,
            status: (e?.status?.type === "finished") ? "finished" : "upcoming",
            venue: e?.venue?.stadium?.name || null,
            city: e?.venue?.city?.name || null,
            updated_at: new Date().toISOString(),
          };

          const { error } = await supabase
            .from("sports_matches")
            .upsert(row, { onConflict: "external_id" });
          if (!error) totalProcessed++;
        }

        await new Promise(r => setTimeout(r, 500));
      } catch { /* skip */ }
    }

    // Clean very old finished matches (> 14 days)
    const cutoff = new Date(Date.now() - 14 * 86400000).toISOString();
    await supabase
      .from("sports_matches")
      .delete()
      .eq("status", "finished")
      .lt("kickoff", cutoff);

    console.log(`Done! Processed: ${totalProcessed}, Errors: ${totalErrors}`);

    return new Response(
      JSON.stringify({ success: true, matches_processed: totalProcessed, errors: totalErrors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Fatal error:", err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
