import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: pendingBets, error: fetchErr } = await supabase
      .from("bets")
      .select("*")
      .eq("status", "pending");

    if (fetchErr) throw fetchErr;
    if (!pendingBets || pendingBets.length === 0) {
      return new Response(JSON.stringify({ message: "No pending bets", settled: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Collect all unique match IDs (skip "accumulator" placeholder)
    const allMatchIds = new Set<string>();
    for (const bet of pendingBets) {
      if (bet.match_id === "accumulator") {
        const md = bet.match_data as any;
        if (md?.selections) {
          for (const sel of md.selections) {
            if (sel.matchId) allMatchIds.add(sel.matchId);
          }
        }
      } else {
        allMatchIds.add(bet.match_id);
      }
    }

    // Fetch results for all matches
    const matchResults = new Map<string, { homeScore: number; awayScore: number }>();
    for (const matchId of allMatchIds) {
      try {
        const res = await fetch(`https://www.thesportsdb.com/api/v1/json/3/lookupevent.php?id=${matchId}`);
        if (!res.ok) continue;
        const data = await res.json();
        const event = data?.events?.[0];
        if (!event || event.intHomeScore == null || event.intAwayScore == null) continue;
        matchResults.set(matchId, {
          homeScore: Number(event.intHomeScore),
          awayScore: Number(event.intAwayScore),
        });
      } catch { /* skip */ }
    }

    let settledCount = 0;

    for (const bet of pendingBets) {
      let won: boolean | null = null; // null = can't settle yet

      if (bet.bet_type === "accumulator") {
        // Accumulator: all selections must be settled, all must win
        const md = bet.match_data as any;
        if (!md?.selections || !Array.isArray(md.selections)) continue;

        let allResolved = true;
        let allWon = true;

        for (const sel of md.selections) {
          const result = matchResults.get(sel.matchId);
          if (!result) { allResolved = false; break; }
          if (!checkBetResult(sel.betType, result.homeScore, result.awayScore)) {
            allWon = false;
          }
        }

        if (!allResolved) continue; // Wait until all matches have results
        won = allWon;
      } else {
        // Single bet
        const result = matchResults.get(bet.match_id);
        if (!result) continue;
        won = checkBetResult(bet.bet_type, result.homeScore, result.awayScore);
      }

      if (won === null) continue;

      const newStatus = won ? "won" : "lost";
      await supabase.from("bets")
        .update({ status: newStatus, settled_at: new Date().toISOString() })
        .eq("id", bet.id);

      if (won) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("balance")
          .eq("user_id", bet.user_id)
          .single();
        if (profile) {
          const newBalance = Number(profile.balance || 0) + Number(bet.potential_win);
          await supabase.from("profiles")
            .update({ balance: newBalance })
            .eq("user_id", bet.user_id);
        }
      }

      settledCount++;
    }

    return new Response(
      JSON.stringify({ message: `Settled ${settledCount} bets`, settled: settledCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function checkBetResult(betType: string, homeScore: number, awayScore: number): boolean {
  const totalGoals = homeScore + awayScore;

  switch (betType) {
    // 1x2
    case "home": return homeScore > awayScore;
    case "draw": return homeScore === awayScore;
    case "away": return homeScore < awayScore;

    // Double chance
    case "home_draw": return homeScore >= awayScore;
    case "home_away": return homeScore !== awayScore;
    case "draw_away": return homeScore <= awayScore;

    // Over/Under
    case "over_1_5": return totalGoals > 1.5;
    case "under_1_5": return totalGoals < 1.5;
    case "over_2_5": return totalGoals > 2.5;
    case "under_2_5": return totalGoals < 2.5;
    case "over_3_5": return totalGoals > 3.5;
    case "under_3_5": return totalGoals < 3.5;

    // Both teams to score
    case "both_yes": return homeScore > 0 && awayScore > 0;
    case "both_no": return homeScore === 0 || awayScore === 0;

    // Exact score (e.g. "score_2_1")
    default:
      if (betType.startsWith("score_")) {
        const parts = betType.replace("score_", "").split("_");
        return Number(parts[0]) === homeScore && Number(parts[1]) === awayScore;
      }
      return false;
  }
}
