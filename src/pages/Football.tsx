import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Trophy, Activity, CalendarClock } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

type League = {
  id: string;
  name: string;
  country: string;
  apiId: string;
};

type Match = {
  id: string;
  league: string;
  home: string;
  away: string;
  kickoff: string;
  homeScore?: number;
  awayScore?: number;
  status: string;
  odds: { home: number; draw: number; away: number };
};

const LEAGUES: League[] = [
  { id: "brasileirao", name: "Brasileirão Série A", country: "🇧🇷", apiId: "4351" },
  { id: "libertadores", name: "Copa Libertadores", country: "🌎", apiId: "4480" },
  { id: "premier", name: "Premier League", country: "🏴", apiId: "4328" },
  { id: "laliga", name: "La Liga", country: "🇪🇸", apiId: "4335" },
  { id: "seriea", name: "Serie A (Itália)", country: "🇮🇹", apiId: "4332" },
  { id: "champions", name: "Champions League", country: "🇪🇺", apiId: "4480" },
];

function deterministicOdds(home: string, away: string) {
  const seed = `${home}-${away}`.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return {
    home: Number((1.7 + (seed % 95) / 100).toFixed(2)),
    draw: Number((2.8 + (seed % 55) / 100).toFixed(2)),
    away: Number((1.8 + ((seed * 3) % 95) / 100).toFixed(2)),
  };
}

export default function Football() {
  const { settings } = useSiteSettings();
  const [activeLeague, setActiveLeague] = useState<string>("brasileirao");
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMatches(activeLeague);
  }, [activeLeague]);

  async function loadMatches(leagueId: string) {
    setLoading(true);
    const league = LEAGUES.find(l => l.id === leagueId);
    if (!league) return;

    try {
      const [nextRes, liveRes] = await Promise.allSettled([
        fetch(`https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id=${league.apiId}`),
        fetch(`https://www.thesportsdb.com/api/v1/json/3/eventspastleague.php?id=${league.apiId}`),
      ]);

      const nextData = nextRes.status === "fulfilled" && nextRes.value.ok ? await nextRes.value.json() : null;
      const pastData = liveRes.status === "fulfilled" && liveRes.value.ok ? await liveRes.value.json() : null;

      const allEvents = [
        ...(Array.isArray(nextData?.events) ? nextData.events : []),
        ...(Array.isArray(pastData?.events) ? pastData.events.slice(0, 10) : []),
      ];

      const mapped: Match[] = allEvents
        .filter((e: any) => e?.strHomeTeam && e?.strAwayTeam)
        .map((e: any) => ({
          id: String(e.idEvent),
          league: league.name,
          home: e.strHomeTeam,
          away: e.strAwayTeam,
          kickoff: e.strTimestamp || e.dateEvent,
          homeScore: e.intHomeScore != null ? Number(e.intHomeScore) : undefined,
          awayScore: e.intAwayScore != null ? Number(e.intAwayScore) : undefined,
          status: e.intHomeScore != null ? "finished" : "upcoming",
          odds: deterministicOdds(e.strHomeTeam, e.strAwayTeam),
        }))
        .slice(0, 30);

      setMatches(mapped);
    } catch {
      setMatches([]);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-30 h-14 flex items-center gap-3 px-4 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <Link to="/" className="p-2 rounded-lg hover:bg-secondary text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        {settings?.logo_url && <img src={settings.logo_url} alt="" className="h-7 w-auto object-contain" />}
        <h1 className="text-sm font-bold flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" /> Futebol • Apostas Esportivas
        </h1>
      </header>

      <div className="p-3 sm:p-6 space-y-4 max-w-5xl mx-auto">
        {/* League Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {LEAGUES.map(l => (
            <button
              key={l.id}
              onClick={() => setActiveLeague(l.id)}
              className={`shrink-0 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeLeague === l.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:bg-surface-hover"
              }`}
            >
              {l.country} {l.name}
            </button>
          ))}
        </div>

        {/* Matches */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl shimmer" />
            ))}
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground text-sm">Nenhum jogo encontrado para esta liga.</div>
        ) : (
          <div className="space-y-3">
            {matches.map(m => (
              <div key={m.id} className="rounded-xl border border-border/40 bg-card card-shadow p-4 hover:bg-surface-hover transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{m.league}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${
                    m.status === "finished" ? "bg-muted text-muted-foreground" : "bg-primary/15 text-primary"
                  }`}>
                    {m.status === "finished" ? "Encerrado" : "Próximo"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-bold text-foreground">
                      {m.home}
                      {m.homeScore != null && <span className="ml-2 text-primary">{m.homeScore}</span>}
                    </p>
                    <p className="text-sm font-bold text-foreground mt-1">
                      {m.away}
                      {m.awayScore != null && <span className="ml-2 text-primary">{m.awayScore}</span>}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1 justify-end">
                      <CalendarClock className="h-3 w-3" />
                      {new Date(m.kickoff).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>

                {m.status === "upcoming" && (
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <button className="rounded-lg bg-secondary border border-border/30 p-2 text-center hover:bg-primary/10 hover:border-primary/30 transition-all">
                      <p className="text-[9px] text-muted-foreground">Casa</p>
                      <p className="text-sm font-bold text-primary">{m.odds.home.toFixed(2)}</p>
                    </button>
                    <button className="rounded-lg bg-secondary border border-border/30 p-2 text-center hover:bg-primary/10 hover:border-primary/30 transition-all">
                      <p className="text-[9px] text-muted-foreground">Empate</p>
                      <p className="text-sm font-bold text-primary">{m.odds.draw.toFixed(2)}</p>
                    </button>
                    <button className="rounded-lg bg-secondary border border-border/30 p-2 text-center hover:bg-primary/10 hover:border-primary/30 transition-all">
                      <p className="text-[9px] text-muted-foreground">Fora</p>
                      <p className="text-sm font-bold text-primary">{m.odds.away.toFixed(2)}</p>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
