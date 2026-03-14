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

    // Get all pending bets
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

    // Group bets by match_id
    const matchIds = [...new Set(pendingBets.map(b => b.match_id))];
    let settledCount = 0;

    for (const matchId of matchIds) {
      // Check match result from TheSportsDB
      const res = await fetch(`https://www.thesportsdb.com/api/v1/json/3/lookupevent.php?id=${matchId}`);
      if (!res.ok) continue;

      const data = await res.json();
      const event = data?.events?.[0];
      if (!event || event.intHomeScore == null || event.intAwayScore == null) continue;

      const homeScore = Number(event.intHomeScore);
      const awayScore = Number(event.intAwayScore);

      // Determine result
      let result: "home" | "draw" | "away";
      if (homeScore > awayScore) result = "home";
      else if (homeScore < awayScore) result = "away";
      else result = "draw";

      // Settle each bet for this match
      const matchBets = pendingBets.filter(b => b.match_id === matchId);

      for (const bet of matchBets) {
        const won = bet.bet_type === result;
        const newStatus = won ? "won" : "lost";

        // Update bet status
        await supabase
          .from("bets")
          .update({ status: newStatus, settled_at: new Date().toISOString() })
          .eq("id", bet.id);

        // If won, credit the user's balance
        if (won) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("balance")
            .eq("user_id", bet.user_id)
            .single();

          if (profile) {
            const newBalance = Number(profile.balance || 0) + Number(bet.potential_win);
            await supabase
              .from("profiles")
              .update({ balance: newBalance })
              .eq("user_id", bet.user_id);
          }
        }

        settledCount++;
      }
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
