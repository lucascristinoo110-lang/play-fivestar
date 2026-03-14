import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, CalendarClock, ChevronRight, Trophy } from "lucide-react";

type SportsMatch = {
  id: string;
  league: string;
  home: string;
  away: string;
  kickoff: string;
  odds: { home: number; draw: number; away: number };
};

const FALLBACK_MATCHES: SportsMatch[] = [
  { id: "f1", league: "Brasil Série A", home: "Flamengo", away: "Palmeiras", kickoff: new Date(Date.now() + 3 * 3600000).toISOString(), odds: { home: 2.05, draw: 3.18, away: 3.22 } },
  { id: "f2", league: "Brasil Série A", home: "Corinthians", away: "São Paulo", kickoff: new Date(Date.now() + 7 * 3600000).toISOString(), odds: { home: 2.34, draw: 3.01, away: 2.98 } },
  { id: "f3", league: "Copa Libertadores", home: "Atlético-MG", away: "River Plate", kickoff: new Date(Date.now() + 11 * 3600000).toISOString(), odds: { home: 2.61, draw: 3.11, away: 2.52 } },
  { id: "f4", league: "Champions League", home: "Real Madrid", away: "Manchester City", kickoff: new Date(Date.now() + 16 * 3600000).toISOString(), odds: { home: 2.74, draw: 3.27, away: 2.3 } },
];

function deterministicOdds(home: string, away: string) {
  const seed = `${home}-${away}`.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return { home: Number((1.7 + (seed % 95) / 100).toFixed(2)), draw: Number((2.8 + (seed % 55) / 100).toFixed(2)), away: Number((1.8 + ((seed * 3) % 95) / 100).toFixed(2)) };
}

export function SportsHighlights() {
  const navigate = useNavigate();
  const [matches, setMatches] = useState<SportsMatch[]>(FALLBACK_MATCHES);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await Promise.allSettled([
          fetch("https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id=4351"),
          fetch("https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id=4480"),
        ]);
        const events = (await Promise.all(res.map(async r => {
          if (r.status !== "fulfilled" || !r.value.ok) return [];
          const d = await r.value.json().catch(() => null);
          return Array.isArray(d?.events) ? d.events : [];
        }))).flat();

        const mapped = events
          .filter((e: any) => e?.strHomeTeam && e?.strAwayTeam && (e?.strTimestamp || e?.dateEvent))
          .map((e: any) => ({
            id: String(e.idEvent),
            league: String(e.strLeague || "Futebol"),
            home: e.strHomeTeam,
            away: e.strAwayTeam,
            kickoff: e.strTimestamp || e.dateEvent,
            odds: deterministicOdds(e.strHomeTeam, e.strAwayTeam),
          }))
          .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())
          .slice(0, 16);

        if (!cancelled && mapped.length) setMatches(mapped);
      } catch { /* fallback */ }
    }
    load();
    const iv = setInterval(load, 60000);
    return () => { cancelled = true; clearInterval(iv); };
  }, []);

  useEffect(() => {
    if (matches.length <= 1) return;
    const iv = setInterval(() => setActiveIndex(p => (p + 1) % matches.length), 5000);
    return () => clearInterval(iv);
  }, [matches]);

  const m = matches[activeIndex] || FALLBACK_MATCHES[0];
  const hyp = useMemo(() => ({ home: (100 * m.odds.home).toFixed(2), draw: (100 * m.odds.draw).toFixed(2), away: (100 * m.odds.away).toFixed(2) }), [m]);

  return (
    <section id="futebol" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" />
          Futebol • Próximos Jogos
        </h2>
        <button onClick={() => navigate("/football")} className="text-[11px] text-primary font-semibold flex items-center gap-1 hover:underline">
          Ver todos <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <button onClick={() => navigate("/football")} className="w-full text-left rounded-xl border border-border/40 bg-card card-shadow p-4 hover:bg-surface-hover transition-colors">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{m.league}</p>
            <p className="text-lg sm:text-xl font-bold text-foreground mt-1">
              {m.home} <span className="text-muted-foreground">vs</span> {m.away}
            </p>
            <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
              <CalendarClock className="h-3.5 w-3.5" />
              {new Date(m.kickoff).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4">
          {[{ l: "Casa", v: m.odds.home }, { l: "Empate", v: m.odds.draw }, { l: "Fora", v: m.odds.away }].map(o => (
            <div key={o.l} className="rounded-lg bg-secondary border border-border/30 p-2 text-center">
              <p className="text-[10px] text-muted-foreground">{o.l}</p>
              <p className="text-sm font-bold text-primary">{o.v.toFixed(2)}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2 mt-3">
          {[{ l: "Casa", v: hyp.home }, { l: "Empate", v: hyp.draw }, { l: "Fora", v: hyp.away }].map(o => (
            <div key={o.l} className="rounded-md bg-primary/10 border border-primary/20 p-2 text-center">
              <p className="text-[10px] text-muted-foreground">Retorno R$100 ({o.l})</p>
              <p className="text-xs font-semibold text-primary">R$ {o.v}</p>
            </div>
          ))}
        </div>
      </button>
    </section>
  );
}
