import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Trophy, Ticket, Loader2 } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { SportsHeroBanner } from "@/components/casino/SportsHeroBanner";
import { BottomNavBar } from "@/components/casino/BottomNavBar";
import { getTeamBadge } from "@/lib/team-badges";
import { generate1x2 } from "@/lib/sports-odds";
import { BetSlipProvider } from "@/contexts/BetSlipContext";
import { MatchCard, type Match } from "@/components/sports/MatchCard";
import { BetSlip } from "@/components/sports/BetSlip";
import { supabase } from "@/integrations/supabase/client";

type League = { id: string; name: string; country: string; dbFilter: string };

const LEAGUES: League[] = [
  { id: "brasileirao", name: "Brasileirão", country: "🇧🇷", dbFilter: "Brasileirão Betano" },
  { id: "brasileirao-b", name: "Série B", country: "🇧🇷", dbFilter: "Brasileirão Série B" },
  { id: "copa-brasil", name: "Copa do Brasil", country: "🇧🇷", dbFilter: "Copa do Brasil" },
  { id: "libertadores", name: "Libertadores", country: "🌎", dbFilter: "Copa Libertadores" },
  { id: "sulamericana", name: "Sul-Americana", country: "🌎", dbFilter: "Copa Sudamericana" },
  { id: "premier", name: "Premier League", country: "🏴", dbFilter: "Premier League" },
  { id: "laliga", name: "LaLiga", country: "🇪🇸", dbFilter: "LaLiga" },
  { id: "seriea", name: "Serie A", country: "🇮🇹", dbFilter: "Serie A" },
  { id: "bundesliga", name: "Bundesliga", country: "🇩🇪", dbFilter: "Bundesliga" },
  { id: "ligue1", name: "Ligue 1", country: "🇫🇷", dbFilter: "Ligue 1" },
  { id: "todos", name: "Todos", country: "⚽", dbFilter: "" },
];

function FootballContent() {
  const { settings } = useSiteSettings();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [activeLeague, setActiveLeague] = useState("brasileirao");
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewTab, setViewTab] = useState<"proximos" | "encerrados">("proximos");

  const loadMatches = useCallback(async (leagueId: string) => {
    setLoading(true);
    const league = LEAGUES.find(l => l.id === leagueId);
    if (!league) { setLoading(false); return; }

    let query = supabase
      .from("sports_matches")
      .select("*");

    if (league.dbFilter) {
      query = query.ilike("league_name", `%${league.dbFilter}%`);
    }

    const { data } = await query.order("kickoff", { ascending: true });

    if (data && data.length > 0) {
      const mapped: Match[] = data.map((e: any) => ({
        id: e.id,
        league: e.league_name,
        leagueId: e.league_api_id,
        home: e.home_team,
        away: e.away_team,
        homeBadge: e.home_badge || getTeamBadge(e.home_team),
        awayBadge: e.away_badge || getTeamBadge(e.away_team),
        kickoff: e.kickoff,
        homeScore: e.home_score,
        awayScore: e.away_score,
        status: e.status || "upcoming",
        venue: e.venue || "",
        city: e.city || "",
        odds: e.custom_odds_home != null
          ? { home: Number(e.custom_odds_home), draw: Number(e.custom_odds_draw), away: Number(e.custom_odds_away) }
          : generate1x2(e.home_team, e.away_team),
        featuredSports: e.featured_sports || false,
      }));
      mapped.sort((a, b) => {
        if (a.status === "upcoming" && b.status === "finished") return -1;
        if (a.status === "finished" && b.status === "upcoming") return 1;
        if (a.status === "upcoming") return new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime();
        return new Date(b.kickoff).getTime() - new Date(a.kickoff).getTime();
      });
      setMatches(mapped);
    } else {
      setMatches([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadMatches(activeLeague); }, [activeLeague, loadMatches]);

  const upcomingMatches = matches.filter(m => m.status === "upcoming");
  const finishedMatches = matches.filter(m => m.status === "finished");
  const displayedMatches = viewTab === "proximos" ? upcomingMatches : finishedMatches;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-30 h-14 flex items-center gap-3 px-4 border-b border-border/40 bg-background/80 backdrop-blur-xl shrink-0">
        <Link to="/" className="p-2 rounded-lg hover:bg-secondary text-muted-foreground"><ArrowLeft className="h-5 w-5" /></Link>
        {settings?.logo_url && <Link to="/"><img src={settings.logo_url} alt="" className="h-7 w-auto object-contain" /></Link>}
        <h1 className="text-sm font-bold flex items-center gap-2 flex-1"><Trophy className="h-4 w-4 text-primary" /> Esportes</h1>
        {user && (
          <button onClick={() => navigate("/tickets")} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-secondary text-xs font-semibold text-foreground">
            <Ticket className="h-3.5 w-3.5 text-primary" /> Bilhetes
          </button>
        )}
      </header>

      <main className={`flex-1 overflow-y-auto ${isMobile ? "pb-28" : "pb-4"}`}>
        <div className="max-w-4xl mx-auto p-3 sm:p-6 space-y-4">
          <SportsHeroBanner />

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-3 px-3">
            {LEAGUES.map(l => (
              <button key={l.id} onClick={() => setActiveLeague(l.id)}
                className={`shrink-0 px-3 py-2 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
                  activeLeague === l.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-surface-hover"
                }`}
              >{l.country} {l.name}</button>
            ))}
          </div>

          <div className="flex gap-2">
            <button onClick={() => setViewTab("proximos")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                viewTab === "proximos" ? "bg-primary/15 text-primary border border-primary/30" : "bg-secondary text-muted-foreground border border-border/30"
              }`}
            >⚽ Próximos ({upcomingMatches.length})</button>
            <button onClick={() => setViewTab("encerrados")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                viewTab === "encerrados" ? "bg-muted text-foreground border border-border/50" : "bg-secondary text-muted-foreground border border-border/30"
              }`}
            >🏁 Encerrados ({finishedMatches.length})</button>
          </div>

          {loading ? (
            <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-32 rounded-xl shimmer" />)}</div>
          ) : displayedMatches.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground text-sm">
              {viewTab === "proximos"
                ? "Nenhum jogo próximo. O admin precisa recarregar os jogos no painel."
                : "Nenhum jogo encerrado encontrado para esta liga."}
            </div>
          ) : (
            <div className="space-y-3">
              {displayedMatches.map(m => <MatchCard key={m.id} match={m} />)}
            </div>
          )}
        </div>
      </main>

      {isMobile && <BottomNavBar onDeposit={() => {}} />}
      <BetSlip />
    </div>
  );
}

export default function Football() {
  return (
    <BetSlipProvider>
      <FootballContent />
    </BetSlipProvider>
  );
}
