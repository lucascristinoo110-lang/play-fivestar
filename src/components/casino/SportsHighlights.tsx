import { useEffect, useMemo, useState } from "react";
import { Activity, CalendarClock, ChevronRight, Trophy } from "lucide-react";

type SportsMatch = {
  id: string;
  league: string;
  home: string;
  away: string;
  kickoff: string;
  odds: {
    home: number;
    draw: number;
    away: number;
  };
};

const FALLBACK_MATCHES: SportsMatch[] = [
  {
    id: "fallback-1",
    league: "Brasil Série A",
    home: "Flamengo",
    away: "Palmeiras",
    kickoff: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    odds: { home: 2.05, draw: 3.18, away: 3.22 },
  },
  {
    id: "fallback-2",
    league: "Brasil Série A",
    home: "Corinthians",
    away: "São Paulo",
    kickoff: new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString(),
    odds: { home: 2.34, draw: 3.01, away: 2.98 },
  },
  {
    id: "fallback-3",
    league: "Copa Libertadores",
    home: "Atlético-MG",
    away: "River Plate",
    kickoff: new Date(Date.now() + 11 * 60 * 60 * 1000).toISOString(),
    odds: { home: 2.61, draw: 3.11, away: 2.52 },
  },
  {
    id: "fallback-4",
    league: "Champions League",
    home: "Real Madrid",
    away: "Manchester City",
    kickoff: new Date(Date.now() + 16 * 60 * 60 * 1000).toISOString(),
    odds: { home: 2.74, draw: 3.27, away: 2.3 },
  },
];

function deterministicOdds(home: string, away: string) {
  const seed = `${home}-${away}`.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const homeOdd = Number((1.7 + ((seed % 95) / 100)).toFixed(2));
  const drawOdd = Number((2.8 + ((seed % 55) / 100)).toFixed(2));
  const awayOdd = Number((1.8 + (((seed * 3) % 95) / 100)).toFixed(2));
  return { home: homeOdd, draw: drawOdd, away: awayOdd };
}

function mapApiEvent(event: any): SportsMatch | null {
  const home = String(event?.strHomeTeam || "").trim();
  const away = String(event?.strAwayTeam || "").trim();
  if (!home || !away) return null;

  const kickoff = event?.strTimestamp || event?.dateEvent;
  if (!kickoff) return null;

  return {
    id: String(event?.idEvent || `${home}-${away}-${kickoff}`),
    league: String(event?.strLeague || "Futebol").trim(),
    home,
    away,
    kickoff,
    odds: deterministicOdds(home, away),
  };
}

export function SportsHighlights() {
  const [matches, setMatches] = useState<SportsMatch[]>(FALLBACK_MATCHES);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadMatches() {
      try {
        const endpoints = [
          "https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id=4351",
          "https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id=4480",
        ];

        const responses = await Promise.allSettled(endpoints.map((url) => fetch(url)));
        const payloads = await Promise.all(
          responses.map(async (res) => {
            if (res.status !== "fulfilled" || !res.value.ok) return [];
            const parsed = await res.value.json().catch(() => null);
            return Array.isArray(parsed?.events) ? parsed.events : [];
          }),
        );

        const apiMatches = payloads
          .flat()
          .map(mapApiEvent)
          .filter((item): item is SportsMatch => Boolean(item))
          .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())
          .slice(0, 16);

        if (!cancelled && apiMatches.length) {
          setMatches(apiMatches);
        }
      } catch {
        // fallback já setado no estado
      }
    }

    loadMatches();
    const interval = setInterval(loadMatches, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (matches.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % matches.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [matches]);

  const activeMatch = matches[activeIndex] || FALLBACK_MATCHES[0];

  const hypothetical = useMemo(() => {
    const stake = 100;
    return {
      home: (stake * activeMatch.odds.home).toFixed(2),
      draw: (stake * activeMatch.odds.draw).toFixed(2),
      away: (stake * activeMatch.odds.away).toFixed(2),
    };
  }, [activeMatch]);

  return (
    <section id="futebol" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" />
          Futebol • Próximos Jogos / Super Odds
        </h2>
        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Activity className="h-3.5 w-3.5 text-primary" /> atualização automática
        </span>
      </div>

      <button className="w-full text-left rounded-xl border border-border/40 bg-card card-shadow p-4 hover:bg-surface-hover transition-colors">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{activeMatch.league}</p>
            <p className="text-lg sm:text-xl font-bold text-foreground mt-1">
              {activeMatch.home} <span className="text-muted-foreground">vs</span> {activeMatch.away}
            </p>
            <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
              <CalendarClock className="h-3.5 w-3.5" />
              {new Date(activeMatch.kickoff).toLocaleString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="rounded-lg bg-secondary border border-border/30 p-2 text-center">
            <p className="text-[10px] text-muted-foreground">Casa</p>
            <p className="text-sm font-bold text-primary">{activeMatch.odds.home.toFixed(2)}</p>
          </div>
          <div className="rounded-lg bg-secondary border border-border/30 p-2 text-center">
            <p className="text-[10px] text-muted-foreground">Empate</p>
            <p className="text-sm font-bold text-primary">{activeMatch.odds.draw.toFixed(2)}</p>
          </div>
          <div className="rounded-lg bg-secondary border border-border/30 p-2 text-center">
            <p className="text-[10px] text-muted-foreground">Fora</p>
            <p className="text-sm font-bold text-primary">{activeMatch.odds.away.toFixed(2)}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="rounded-md bg-primary/10 border border-primary/20 p-2 text-center">
            <p className="text-[10px] text-muted-foreground">Retorno R$100 (Casa)</p>
            <p className="text-xs font-semibold text-primary">R$ {hypothetical.home}</p>
          </div>
          <div className="rounded-md bg-primary/10 border border-primary/20 p-2 text-center">
            <p className="text-[10px] text-muted-foreground">Retorno R$100 (Empate)</p>
            <p className="text-xs font-semibold text-primary">R$ {hypothetical.draw}</p>
          </div>
          <div className="rounded-md bg-primary/10 border border-primary/20 p-2 text-center">
            <p className="text-[10px] text-muted-foreground">Retorno R$100 (Fora)</p>
            <p className="text-xs font-semibold text-primary">R$ {hypothetical.away}</p>
          </div>
        </div>
      </button>
    </section>
  );
}
