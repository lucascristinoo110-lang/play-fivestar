import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LEAGUES = [
  { apiId: "4351", name: "Brasileirão Série A" },
  { apiId: "4404", name: "Brasileirão Série B" },
  { apiId: "4405", name: "Copa do Brasil" },
  { apiId: "4480", name: "Copa Libertadores" },
  { apiId: "4481", name: "Copa Sul-Americana" },
  { apiId: "4328", name: "Premier League" },
  { apiId: "4335", name: "La Liga" },
  { apiId: "4332", name: "Serie A (Itália)" },
  { apiId: "4331", name: "Bundesliga" },
  { apiId: "4334", name: "Ligue 1" },
];

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

    let totalInserted = 0;
    let totalUpdated = 0;

    for (const league of LEAGUES) {
      try {
        const [nextRes, pastRes] = await Promise.allSettled([
          fetch(`https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id=${league.apiId}`),
          fetch(`https://www.thesportsdb.com/api/v1/json/3/eventspastleague.php?id=${league.apiId}`),
        ]);

        const nextData = nextRes.status === "fulfilled" && nextRes.value.ok
          ? await nextRes.value.json().catch(() => null)
          : null;
        const pastData = pastRes.status === "fulfilled" && pastRes.value.ok
          ? await pastRes.value.json().catch(() => null)
          : null;

        const events = [
          ...(Array.isArray(nextData?.events) ? nextData.events : []),
          ...(Array.isArray(pastData?.events) ? pastData.events : []),
        ].filter((e: any) => e?.strHomeTeam && e?.strAwayTeam && String(e?.idLeague) === league.apiId);

        for (const e of events) {
          const externalId = String(e.idEvent);
          const kickoff = e.strTimestamp || e.dateEvent;
          if (!kickoff) continue;

          const row = {
            external_id: externalId,
            league_name: league.name,
            league_api_id: league.apiId,
            home_team: e.strHomeTeam,
            away_team: e.strAwayTeam,
            home_badge: e.strHomeTeamBadge || null,
            away_badge: e.strAwayTeamBadge || null,
            kickoff,
            home_score: e.intHomeScore != null ? Number(e.intHomeScore) : null,
            away_score: e.intAwayScore != null ? Number(e.intAwayScore) : null,
            status: e.intHomeScore != null ? "finished" : "upcoming",
            venue: e.strVenue || null,
            city: e.strCity || null,
            updated_at: new Date().toISOString(),
          };

          const { error } = await supabase
            .from("sports_matches")
            .upsert(row, { onConflict: "external_id" });

          if (!error) {
            totalInserted++;
          }
        }
      } catch {
        // skip league on error
      }
    }

    // Clean old matches (older than 30 days and finished)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    await supabase
      .from("sports_matches")
      .delete()
      .eq("status", "finished")
      .lt("kickoff", thirtyDaysAgo);

    return new Response(
      JSON.stringify({ success: true, matches_processed: totalInserted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
