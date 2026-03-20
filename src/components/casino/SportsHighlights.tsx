import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarClock, ChevronRight, Trophy } from "lucide-react";
import { getTeamBadge } from "@/lib/team-badges";
import { generate1x2 } from "@/lib/sports-odds";
import { supabase } from "@/integrations/supabase/client";

// Fallback matches shown when DB is empty (before admin reloads)
function getFallbackMatches(): SportsMatch[] {
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const pairs: [string, string, string, number][] = [
    ["Flamengo", "Palmeiras", "Brasileirão", 1],
    ["Corinthians", "São Paulo", "Brasileirão", 2],
    ["Atlético-MG", "Cruzeiro", "Brasileirão", 3],
    ["Grêmio", "Internacional", "Brasileirão", 4],
    ["Botafogo", "Fluminense", "Brasileirão", 5],
    ["Santos", "Bahia", "Brasileirão", 6],
  ];
  return pairs.map(([home, away, league, d], i) => ({
    id: `fallback-${i}`,
    league,
    home, away,
    homeBadge: getTeamBadge(home),
    awayBadge: getTeamBadge(away),
    kickoff: new Date(base + d * 86400000 + 72000000).toISOString(),
    odds: generate1x2(home, away),
  }));
}

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

function TeamBadge({ src, name }: { src: string; name: string }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    return <img src={src} alt={name} className="w-8 h-8 sm:w-10 sm:h-10 object-contain rounded-full bg-secondary/50" loading="lazy" onError={() => setFailed(true)} />;
  }
  return (
    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-foreground border border-border/30">
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

export function SportsHighlights() {
  const navigate = useNavigate();
  const [matches, setMatches] = useState<SportsMatch[]>(getFallbackMatches());
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("sports_matches")
        .select("*")
        .eq("status", "upcoming")
        .order("kickoff", { ascending: true })
        .limit(16);

      if (data && data.length > 0) {
        setMatches(data.map((e: any) => ({
          id: e.id,
          league: e.league_name,
          home: e.home_team,
          away: e.away_team,
          homeBadge: e.home_badge || getTeamBadge(e.home_team),
          awayBadge: e.away_badge || getTeamBadge(e.away_team),
          kickoff: e.kickoff,
          odds: generate1x2(e.home_team, e.away_team),
        })));
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (matches.length <= 1) return;
    const iv = setInterval(() => setActiveIndex(p => (p + 1) % matches.length), 5000);
    return () => clearInterval(iv);
  }, [matches.length]);

  const m = matches[activeIndex] || matches[0];
  const hyp = useMemo(() => {
    if (!m) return { home: "0", draw: "0", away: "0" };
    return {
      home: (100 * m.odds.home).toFixed(2),
      draw: (100 * m.odds.draw).toFixed(2),
      away: (100 * m.odds.away).toFixed(2),
    };
  }, [m]);

  if (matches.length === 0) return null;

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
