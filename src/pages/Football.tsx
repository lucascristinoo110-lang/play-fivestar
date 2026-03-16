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

type League = { id: string; name: string; country: string; apiId: string };

const LEAGUES: League[] = [
  { id: "brasileirao", name: "Brasileirão Série A", country: "🇧🇷", apiId: "4351" },
  { id: "brasileirao-b", name: "Brasileirão Série B", country: "🇧🇷", apiId: "4404" },
  { id: "copa-brasil", name: "Copa do Brasil", country: "🇧🇷", apiId: "4405" },
  { id: "libertadores", name: "Copa Libertadores", country: "🌎", apiId: "4480" },
  { id: "sulamericana", name: "Copa Sul-Americana", country: "🌎", apiId: "4481" },
  { id: "premier", name: "Premier League", country: "🏴", apiId: "4328" },
  { id: "laliga", name: "La Liga", country: "🇪🇸", apiId: "4335" },
  { id: "seriea", name: "Serie A (Itália)", country: "🇮🇹", apiId: "4332" },
  { id: "bundesliga", name: "Bundesliga", country: "🇩🇪", apiId: "4331" },
  { id: "ligue1", name: "Ligue 1", country: "🇫🇷", apiId: "4334" },
  { id: "champions", name: "Champions League", country: "🇪🇺", apiId: "4480" },
  { id: "europa", name: "Europa League", country: "🇪🇺", apiId: "4481" },
];

function getBrazilianFallbackMatches(league: League): Match[] {
  const teams: Record<string, string[][]> = {
    "4351": [["Flamengo","Palmeiras"],["Corinthians","São Paulo"],["Atlético-MG","Cruzeiro"],["Grêmio","Internacional"],["Botafogo","Fluminense"],["Santos","Bahia"],["Fortaleza","Vasco da Gama"],["Athletico-PR","Coritiba"]],
    "4404": [["Sport","Ceará"],["Guarani","Ponte Preta"],["Vila Nova","Goiás"],["Avaí","Chapecoense"],["Operário-PR","CRB"],["Novorizontino","Mirassol"]],
    "4405": [["Flamengo","Cruzeiro"],["Palmeiras","Grêmio"],["São Paulo","Atlético-MG"],["Corinthians","Internacional"],["Botafogo","Fortaleza"],["Santos","Bahia"]],
    "4480": [["Flamengo","River Plate"],["Palmeiras","Boca Juniors"],["Atlético-MG","Peñarol"],["São Paulo","Nacional"],["Grêmio","Cerro Porteño"],["Internacional","Olimpia"]],
    "4481": [["Fortaleza","Independiente"],["Athletico-PR","LDU Quito"],["Cruzeiro","Racing"],["Vasco","Defensa y Justicia"],["Bahia","Talleres"],["Santos","Colón"]],
  };
  const leagueTeams = teams[league.apiId] || teams["4351"];
  const now = Date.now();
  return leagueTeams.map(([home, away], i) => ({
    id: `fb-${league.apiId}-${i}`,
    league: league.name, leagueId: league.apiId,
    home, away,
    homeBadge: getTeamBadge(home), awayBadge: getTeamBadge(away),
    kickoff: new Date(now + (i + 1) * 86400000 + i * 7200000).toISOString(),
    status: "upcoming", venue: "", city: "",
    odds: generate1x2(home, away),
  }));
}

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
    if (!league) return;
    try {
      const [nextRes, pastRes] = await Promise.allSettled([
        fetch(`https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id=${league.apiId}`),
        fetch(`https://www.thesportsdb.com/api/v1/json/3/eventspastleague.php?id=${league.apiId}`),
      ]);
      const nextData = nextRes.status === "fulfilled" && nextRes.value.ok ? await nextRes.value.json() : null;
      const pastData = pastRes.status === "fulfilled" && pastRes.value.ok ? await pastRes.value.json() : null;
      const allEvents = [...(Array.isArray(nextData?.events) ? nextData.events : []), ...(Array.isArray(pastData?.events) ? pastData.events : [])];
      const correctEvents = allEvents.filter((e: any) => e?.strHomeTeam && e?.strAwayTeam && String(e?.idLeague) === league.apiId);
      const seen = new Set<string>();
      const unique = correctEvents.filter((e: any) => { const id = String(e?.idEvent || ""); if (!id || seen.has(id)) return false; seen.add(id); return true; });
      const mapped: Match[] = unique.map((e: any) => ({
        id: String(e.idEvent), league: e.strLeague || league.name, leagueId: String(e.idLeague),
        home: e.strHomeTeam, away: e.strAwayTeam,
        homeBadge: e.strHomeTeamBadge || getTeamBadge(e.strHomeTeam),
        awayBadge: e.strAwayTeamBadge || getTeamBadge(e.strAwayTeam),
        kickoff: e.strTimestamp || e.dateEvent,
        homeScore: e.intHomeScore != null ? Number(e.intHomeScore) : undefined,
        awayScore: e.intAwayScore != null ? Number(e.intAwayScore) : undefined,
        status: e.intHomeScore != null ? "finished" : "upcoming",
        venue: e.strVenue || "", city: e.strCity || "",
        odds: generate1x2(e.strHomeTeam, e.strAwayTeam),
      }));
      mapped.sort((a, b) => {
        if (a.status === "upcoming" && b.status === "finished") return -1;
        if (a.status === "finished" && b.status === "upcoming") return 1;
        if (a.status === "upcoming") return new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime();
        return new Date(b.kickoff).getTime() - new Date(a.kickoff).getTime();
      });
      setMatches(mapped.length === 0 ? getBrazilianFallbackMatches(league) : mapped);
    } catch {
      setMatches(getBrazilianFallbackMatches(LEAGUES.find(l => l.id === leagueId)!));
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadMatches(activeLeague); }, [activeLeague, loadMatches]);
  useEffect(() => { const iv = setInterval(() => loadMatches(activeLeague), 60000); return () => clearInterval(iv); }, [activeLeague, loadMatches]);

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

          {/* League tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-3 px-3">
            {LEAGUES.map(l => (
              <button key={l.id} onClick={() => setActiveLeague(l.id)}
                className={`shrink-0 px-3 py-2 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
                  activeLeague === l.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-surface-hover"
                }`}
              >{l.country} {l.name}</button>
            ))}
          </div>

          {/* View tabs */}
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

          {/* Matches */}
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-32 rounded-xl shimmer" />)}</div>
          ) : displayedMatches.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground text-sm">
              {viewTab === "proximos" ? "Nenhum jogo próximo encontrado para esta liga." : "Nenhum jogo encerrado encontrado para esta liga."}
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
