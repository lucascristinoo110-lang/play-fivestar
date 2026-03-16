import { useState } from "react";
import { CalendarClock, ChevronDown, ChevronUp, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBetSlip } from "@/contexts/BetSlipContext";
import {
  generate1x2, generateDoubleChance, generateOverUnder,
  generateBothScore, generateExactScores, getBetTypeLabel
} from "@/lib/sports-odds";

export type Match = {
  id: string;
  league: string;
  leagueId: string;
  home: string;
  away: string;
  homeBadge: string;
  awayBadge: string;
  kickoff: string;
  homeScore?: number;
  awayScore?: number;
  status: string;
  venue?: string;
  city?: string;
  odds: { home: number; draw: number; away: number };
};

function TeamBadge({ src, name }: { src: string; name: string }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    return <img src={src} alt={name} className="w-7 h-7 object-contain rounded-full bg-secondary/50" loading="lazy" onError={() => setFailed(true)} />;
  }
  return (
    <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-foreground border border-border/30">
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

type OddButtonProps = {
  label: string;
  value: number;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
};

function OddButton({ label, value, selected, onClick, disabled }: OddButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-lg border p-1.5 sm:p-2 text-center transition-all min-w-0",
        selected
          ? "bg-primary/20 border-primary text-primary shadow-sm shadow-primary/20"
          : "bg-secondary border-border/30 hover:bg-primary/10 hover:border-primary/30",
        disabled && "opacity-50 pointer-events-none"
      )}
    >
      <p className="text-[8px] sm:text-[9px] text-muted-foreground truncate">{label}</p>
      <p className="text-xs sm:text-sm font-bold text-primary">{value.toFixed(2)}</p>
    </button>
  );
}

export function MatchCard({ match, showUser }: { match: Match; showUser?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const { addSelection, isSelected } = useBetSlip();
  const isUpcoming = match.status === "upcoming";

  const odds1x2 = match.odds;
  const oddsDouble = generateDoubleChance(match.home, match.away);
  const oddsOU = generateOverUnder(match.home, match.away);
  const oddsBoth = generateBothScore(match.home, match.away);
  const oddsExact = generateExactScores(match.home, match.away);

  function select(market: string, betType: string, odds: number, label: string) {
    addSelection({
      matchId: match.id,
      matchHome: match.home,
      matchAway: match.away,
      league: match.league,
      kickoff: match.kickoff,
      homeBadge: match.homeBadge,
      awayBadge: match.awayBadge,
      venue: match.venue,
      city: match.city,
      matchOdds: match.odds,
      market,
      betType,
      label,
      odds,
    });
  }

  return (
    <div className="rounded-xl border border-border/40 bg-card card-shadow overflow-hidden">
      {/* Header */}
      <div className="px-3 sm:px-4 pt-3 pb-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">{match.league}</span>
          <div className="flex items-center gap-2">
            <span className={cn("text-[10px] px-2 py-0.5 rounded-md font-semibold",
              match.status === "finished" ? "bg-muted text-muted-foreground" : "bg-primary/15 text-primary"
            )}>
              {match.status === "finished" ? "Encerrado" : "Próximo"}
            </span>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <CalendarClock className="h-3 w-3" />
              {new Date(match.kickoff).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </div>

        {/* Teams */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <TeamBadge src={match.homeBadge} name={match.home} />
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground truncate">{match.home}</p>
              {match.homeScore != null && <span className="text-lg font-black text-primary">{match.homeScore}</span>}
            </div>
          </div>
          <span className="text-xs font-bold text-muted-foreground px-2 shrink-0">VS</span>
          <div className="flex items-center gap-2 flex-1 min-w-0 justify-end text-right">
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground truncate">{match.away}</p>
              {match.awayScore != null && <span className="text-lg font-black text-primary">{match.awayScore}</span>}
            </div>
            <TeamBadge src={match.awayBadge} name={match.away} />
          </div>
        </div>

        {match.venue && (
          <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span>{match.venue}{match.city ? ` • ${match.city}` : ""}</span>
          </div>
        )}
      </div>

      {/* 1x2 odds always visible for upcoming */}
      {isUpcoming && (
        <div className="px-3 sm:px-4 pb-2">
          {/* Market header */}
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase">1x2</span>
            <span className="text-[10px] font-semibold text-muted-foreground uppercase">Dupla Chance</span>
          </div>
          <div className="grid grid-cols-6 gap-1.5">
            {/* 1x2 */}
            <OddButton label="1" value={odds1x2.home} selected={isSelected(match.id, "home")} onClick={() => select("1x2", "home", odds1x2.home, "Casa")} />
            <OddButton label="X" value={odds1x2.draw} selected={isSelected(match.id, "draw")} onClick={() => select("1x2", "draw", odds1x2.draw, "Empate")} />
            <OddButton label="2" value={odds1x2.away} selected={isSelected(match.id, "away")} onClick={() => select("1x2", "away", odds1x2.away, "Fora")} />
            {/* Double chance */}
            <OddButton label="1 ou X" value={oddsDouble.home_draw} selected={isSelected(match.id, "home_draw")} onClick={() => select("double_chance", "home_draw", oddsDouble.home_draw, "1 ou Empate")} />
            <OddButton label="1 ou 2" value={oddsDouble.home_away} selected={isSelected(match.id, "home_away")} onClick={() => select("double_chance", "home_away", oddsDouble.home_away, "1 ou 2")} />
            <OddButton label="X ou 2" value={oddsDouble.draw_away} selected={isSelected(match.id, "draw_away")} onClick={() => select("double_chance", "draw_away", oddsDouble.draw_away, "Empate ou 2")} />
          </div>
        </div>
      )}

      {/* Expand button */}
      {isUpcoming && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1 py-2 text-[10px] font-semibold text-primary hover:bg-primary/5 border-t border-border/20 transition-colors"
        >
          {expanded ? "Menos mercados" : `+3 mercados`}
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      )}

      {/* Expanded markets */}
      {expanded && isUpcoming && (
        <div className="px-3 sm:px-4 pb-3 space-y-3 border-t border-border/20 pt-3">
          {/* Over/Under */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">Total de Gols</p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              <OddButton label="Mais 1.5" value={oddsOU.over_1_5} selected={isSelected(match.id, "over_1_5")} onClick={() => select("over_under", "over_1_5", oddsOU.over_1_5, "Mais de 1.5")} />
              <OddButton label="Menos 1.5" value={oddsOU.under_1_5} selected={isSelected(match.id, "under_1_5")} onClick={() => select("over_under", "under_1_5", oddsOU.under_1_5, "Menos de 1.5")} />
              <OddButton label="Mais 2.5" value={oddsOU.over_2_5} selected={isSelected(match.id, "over_2_5")} onClick={() => select("over_under", "over_2_5", oddsOU.over_2_5, "Mais de 2.5")} />
              <OddButton label="Menos 2.5" value={oddsOU.under_2_5} selected={isSelected(match.id, "under_2_5")} onClick={() => select("over_under", "under_2_5", oddsOU.under_2_5, "Menos de 2.5")} />
              <OddButton label="Mais 3.5" value={oddsOU.over_3_5} selected={isSelected(match.id, "over_3_5")} onClick={() => select("over_under", "over_3_5", oddsOU.over_3_5, "Mais de 3.5")} />
              <OddButton label="Menos 3.5" value={oddsOU.under_3_5} selected={isSelected(match.id, "under_3_5")} onClick={() => select("over_under", "under_3_5", oddsOU.under_3_5, "Menos de 3.5")} />
            </div>
          </div>

          {/* Both score */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">Ambas Marcam</p>
            <div className="grid grid-cols-2 gap-1.5 max-w-xs">
              <OddButton label="Sim" value={oddsBoth.both_yes} selected={isSelected(match.id, "both_yes")} onClick={() => select("both_score", "both_yes", oddsBoth.both_yes, "Ambas Sim")} />
              <OddButton label="Não" value={oddsBoth.both_no} selected={isSelected(match.id, "both_no")} onClick={() => select("both_score", "both_no", oddsBoth.both_no, "Ambas Não")} />
            </div>
          </div>

          {/* Exact score */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">Placar Exato</p>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {oddsExact.slice(0, 10).map(es => (
                <OddButton
                  key={es.betType}
                  label={es.score}
                  value={es.odds}
                  selected={isSelected(match.id, es.betType)}
                  onClick={() => select("exact_score", es.betType, es.odds, `Placar ${es.score}`)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
