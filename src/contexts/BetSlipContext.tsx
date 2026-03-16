import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from "react";

export type BetSelection = {
  matchId: string;
  matchHome: string;
  matchAway: string;
  league: string;
  kickoff: string;
  homeBadge: string;
  awayBadge: string;
  venue?: string;
  city?: string;
  matchOdds: { home: number; draw: number; away: number };
  market: string; // "1x2", "double_chance", "over_under", "both_score", "exact_score"
  betType: string; // "home", "draw", "away", "home_draw", "over_2.5", "both_yes", "score_2_1", etc.
  label: string; // Display label e.g. "Casa", "1 ou Empate", "Mais de 2.5"
  odds: number;
};

type BetSlipContextType = {
  selections: BetSelection[];
  addSelection: (sel: BetSelection) => void;
  removeSelection: (matchId: string, betType: string) => void;
  clearSlip: () => void;
  isSelected: (matchId: string, betType: string) => boolean;
  totalOdds: number;
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
};

const BetSlipContext = createContext<BetSlipContextType | null>(null);

export function BetSlipProvider({ children }: { children: ReactNode }) {
  const [selections, setSelections] = useState<BetSelection[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const addSelection = useCallback((sel: BetSelection) => {
    setSelections(prev => {
      // Remove any existing selection from same match + same market
      const filtered = prev.filter(
        s => !(s.matchId === sel.matchId && s.market === sel.market)
      );
      return [...filtered, sel];
    });
    setIsOpen(true);
  }, []);

  const removeSelection = useCallback((matchId: string, betType: string) => {
    setSelections(prev => prev.filter(s => !(s.matchId === matchId && s.betType === betType)));
  }, []);

  const clearSlip = useCallback(() => {
    setSelections([]);
    setIsOpen(false);
  }, []);

  const isSelected = useCallback((matchId: string, betType: string) => {
    return selections.some(s => s.matchId === matchId && s.betType === betType);
  }, [selections]);

  const totalOdds = useMemo(() => {
    if (selections.length === 0) return 0;
    return selections.reduce((acc, s) => acc * s.odds, 1);
  }, [selections]);

  return (
    <BetSlipContext.Provider value={{ selections, addSelection, removeSelection, clearSlip, isSelected, totalOdds, isOpen, setIsOpen }}>
      {children}
    </BetSlipContext.Provider>
  );
}

export function useBetSlip() {
  const ctx = useContext(BetSlipContext);
  if (!ctx) throw new Error("useBetSlip must be used within BetSlipProvider");
  return ctx;
}
