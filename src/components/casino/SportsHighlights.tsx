import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarClock, ChevronRight, Trophy } from "lucide-react";
import { getTeamBadge } from "@/lib/team-badges";


type SportsMatch = {
  id: string;
  league: string;
  home: string;
  away: string;
  homeBadge: string;
  awayBadge: string;
  kickoff: string;
  odds: { home: number; draw: number; away: number };
};

const BRAZILIAN_LEAGUES = [
  { id: "4351", name: "Brasileirão Série A" },
  { id: "4404", name: "Brasileirão Série B" },
  { id: "4405", name: "Copa do Brasil" },
  { id: "4480", name: "Copa Libertadores" },
];

function deterministicOdds(home: string, away: string) {
  const seed = `${home}-${away}`.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return {
    home: Number((1.7 + (seed % 95) / 100).toFixed(2)),
    draw: Number((2.8 + (seed % 55) / 100).toFixed(2)),
    away: Number((1.8 + ((seed * 3) % 95) / 100).toFixed(2)),
  };
}

// Deterministic Brazilian fallback data so all users see the same matches
function getBrazilianFallbackMatches(): SportsMatch[] {
  const now = new Date();
  const baseTime = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const matches: Array<[string, string, string, number]> = [
    ["Flamengo", "Palmeiras", "Brasileirão Série A", 1],
    ["Corinthians", "São Paulo", "Brasileirão Série A", 2],
    ["Atlético-MG", "Cruzeiro", "Brasileirão Série A", 3],
    ["Grêmio", "Internacional", "Brasileirão Série A", 4],
    ["Botafogo", "Fluminense", "Brasileirão Série A", 5],
    ["Santos", "Bahia", "Brasileirão Série A", 6],
    ["Fortaleza", "Vasco da Gama", "Copa do Brasil", 7],
    ["Flamengo", "River Plate", "Copa Libertadores", 8],
    ["Palmeiras", "Boca Juniors", "Copa Libertadores", 9],
    ["Sport", "Ceará", "Brasileirão Série B", 10],
  ];

  return matches.map(([home, away, league, dayOffset], i) => ({
    id: `br-${i}`,
    league,
    home,
    away,
    homeBadge: getTeamBadge(home),
    awayBadge: getTeamBadge(away),
    kickoff: new Date(baseTime + dayOffset * 86400000 + 72000000).toISOString(), // 20:00
    odds: deterministicOdds(home, away),
  }));
}

function TeamBadge({ src, name }: { src: string; name: string }) {
  if (src) {
    return <img src={src} alt={name} className="w-8 h-8 sm:w-10 sm:h-10 object-contain rounded-full bg-secondary/50" loading="lazy" />;
  }
  return (
    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-foreground border border-border/30">
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

export function SportsHighlights() {
  const navigate = useNavigate();
  const [matches, setMatches] = useState<SportsMatch[]>(getBrazilianFallbackMatches());
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await Promise.allSettled(
          BRAZILIAN_LEAGUES.map(l =>
            fetch(`https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id=${l.id}`)
          )
        );
        const events = (await Promise.all(res.map(async (r, i) => {
          if (r.status !== "fulfilled" || !r.value.ok) return [];
          const d = await r.value.json().catch(() => null);
          return (Array.isArray(d?.events) ? d.events : [])
            // CRITICAL: Only include events that actually belong to the requested league
            .filter((e: any) => String(e?.idLeague) === BRAZILIAN_LEAGUES[i].id)
            .map((e: any) => ({
              ...e,
              _leagueName: BRAZILIAN_LEAGUES[i].name,
            }));
        }))).flat();

        const mapped = events
          .filter((e: any) => e?.strHomeTeam && e?.strAwayTeam && (e?.strTimestamp || e?.dateEvent))
          .map((e: any) => ({
            id: String(e.idEvent),
            league: e._leagueName || String(e.strLeague || "Futebol"),
            home: e.strHomeTeam,
            away: e.strAwayTeam,
            homeBadge: e.strHomeTeamBadge || getTeamBadge(e.strHomeTeam),
            awayBadge: e.strAwayTeamBadge || getTeamBadge(e.strAwayTeam),
            kickoff: e.strTimestamp || e.dateEvent,
            odds: deterministicOdds(e.strHomeTeam, e.strAwayTeam),
          }))
          .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())
          .slice(0, 16);

        // Only use API data if we got actual Brazilian league matches
        if (!cancelled && mapped.length > 0) {
          setMatches(mapped);
        }
        // Otherwise keep the fallback Brazilian data
      } catch { /* keep fallback */ }
    }
    load();
    const iv = setInterval(load, 300000); // refresh every 5 minutes
    return () => { cancelled = true; clearInterval(iv); };
  }, []);

  useEffect(() => {
    if (matches.length <= 1) return;
    const iv = setInterval(() => setActiveIndex(p => (p + 1) % matches.length), 5000);
    return () => clearInterval(iv);
  }, [matches.length]);

  const m = matches[activeIndex] || matches[0];
  const hyp = useMemo(() => ({
    home: (100 * m.odds.home).toFixed(2),
    draw: (100 * m.odds.draw).toFixed(2),
    away: (100 * m.odds.away).toFixed(2),
  }), [m]);

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
        <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{m.league}</p>

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <TeamBadge src={m.homeBadge} name={m.home} />
            <span className="text-sm sm:text-base font-bold text-foreground truncate">{m.home}</span>
          </div>
          <div className="px-3 text-center shrink-0">
            <span className="text-xs font-bold text-muted-foreground">VS</span>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
              <CalendarClock className="h-3 w-3" />
              {new Date(m.kickoff).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
            <span className="text-sm sm:text-base font-bold text-foreground truncate text-right">{m.away}</span>
            <TeamBadge src={m.awayBadge} name={m.away} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4">
          {[{ l: "Casa", v: m.odds.home }, { l: "Empate", v: m.odds.draw }, { l: "Fora", v: m.odds.away }].map(o => (
            <div key={o.l} className="rounded-lg bg-secondary border border-border/30 p-2 text-center">
              <p className="text-[10px] text-muted-foreground">{o.l}</p>
              <p className="text-sm font-bold text-primary">{o.v.toFixed(2)}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2 mt-2">
          {[{ l: "Casa", v: hyp.home }, { l: "Empate", v: hyp.draw }, { l: "Fora", v: hyp.away }].map(o => (
            <div key={o.l} className="rounded-md bg-primary/10 border border-primary/20 p-1.5 text-center">
              <p className="text-[9px] text-muted-foreground">R$100 → {o.l}</p>
              <p className="text-[11px] font-semibold text-primary">R$ {o.v}</p>
            </div>
          ))}
        </div>
      </button>

      <div className="flex justify-center gap-1.5">
        {matches.slice(0, 10).map((_, i) => (
          <button
            key={i}
            onClick={() => setActiveIndex(i)}
            className={`w-1.5 h-1.5 rounded-full transition-all ${i === activeIndex ? "bg-primary w-4" : "bg-foreground/20"}`}
          />
        ))}
      </div>
    </section>
  );
}
