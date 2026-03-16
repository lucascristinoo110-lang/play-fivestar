import { useState } from "react";
import { X, Ticket, Trash2, Loader2, CheckCircle, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBetSlip } from "@/contexts/BetSlipContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

export function BetSlip() {
  const { selections, removeSelection, clearSlip, totalOdds, isOpen, setIsOpen } = useBetSlip();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [betAmount, setBetAmount] = useState("");
  const [placing, setPlacing] = useState(false);
  const [success, setSuccess] = useState<{ ticket: string; potentialWin: number } | null>(null);

  const balance = profile?.balance ?? 0;
  const amount = parseFloat(betAmount) || 0;
  const potentialWin = amount * totalOdds;
  const isAccumulator = selections.length > 1;

  if (selections.length === 0 && !success) {
    // Show empty cupom indicator so user knows it exists
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={cn("fixed z-50 bg-primary/90 text-primary-foreground flex items-center gap-2 px-4 py-2.5 shadow-lg backdrop-blur-sm transition-all hover:bg-primary",
          isMobile ? "bottom-16 left-0 right-0 rounded-t-xl justify-center" : "bottom-4 right-4 rounded-xl"
        )}
      >
        <Ticket className="h-4 w-4" />
        <span className="text-sm font-bold">Cupom</span>
        <span className="text-[10px] opacity-80">• Selecione uma odd</span>
      </button>
    );
  }

  async function placeBet() {
    if (!user || amount <= 0) return;
    if (amount > balance) {
      toast({ title: "Saldo insuficiente", variant: "destructive" });
      return;
    }

    setPlacing(true);
    try {
      // Debit balance
      const { error: balErr } = await supabase.from("profiles").update({ balance: balance - amount }).eq("user_id", user.id);
      if (balErr) throw balErr;

      if (isAccumulator) {
        // Single bet row for accumulator
        const matchData = {
          type: "accumulator",
          selections: selections.map(s => ({
            matchId: s.matchId,
            home: s.matchHome,
            away: s.matchAway,
            league: s.league,
            kickoff: s.kickoff,
            homeBadge: s.homeBadge,
            awayBadge: s.awayBadge,
            market: s.market,
            betType: s.betType,
            label: s.label,
            odds: s.odds,
          })),
        };

        const { data: bet, error } = await supabase.from("bets").insert({
          user_id: user.id,
          ticket_number: "temp",
          match_id: "accumulator",
          match_data: matchData,
          bet_type: "accumulator",
          odds: Number(totalOdds.toFixed(2)),
          amount,
          potential_win: Number(potentialWin.toFixed(2)),
        }).select().single();

        if (error) throw error;
        setSuccess({ ticket: bet.ticket_number, potentialWin: Number(potentialWin.toFixed(2)) });
      } else {
        // Single bet
        const sel = selections[0];
        const matchData = {
          home: sel.matchHome,
          away: sel.matchAway,
          homeBadge: sel.homeBadge,
          awayBadge: sel.awayBadge,
          league: sel.league,
          kickoff: sel.kickoff,
          venue: sel.venue,
          city: sel.city,
          odds: sel.matchOdds,
          market: sel.market,
          label: sel.label,
        };

        const { data: bet, error } = await supabase.from("bets").insert({
          user_id: user.id,
          ticket_number: "temp",
          match_id: sel.matchId,
          match_data: matchData,
          bet_type: sel.betType,
          odds: sel.odds,
          amount,
          potential_win: Number(potentialWin.toFixed(2)),
        }).select().single();

        if (error) throw error;
        setSuccess({ ticket: bet.ticket_number, potentialWin: Number(potentialWin.toFixed(2)) });
      }

      toast({ title: "Aposta realizada!" });
      clearSlip();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setPlacing(false);
    }
  }

  // Success screen
  if (success) {
    return (
      <div className={cn("fixed z-50 left-0 right-0 bg-card border-t border-border/40 shadow-2xl rounded-t-2xl p-5 space-y-3 safe-area-bottom text-center",
        isMobile ? "bottom-16" : "bottom-0 max-w-md right-4 left-auto rounded-2xl border"
      )}>
        <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
          <CheckCircle className="h-7 w-7 text-primary" />
        </div>
        <h3 className="text-base font-bold text-foreground">Aposta Realizada!</h3>
        <div className="bg-secondary/50 rounded-lg p-3 space-y-1">
          <p className="text-xs text-muted-foreground">Número do bilhete</p>
          <p className="text-lg font-black text-primary font-mono">{success.ticket}</p>
          <p className="text-xs text-muted-foreground">Retorno potencial: <strong className="text-foreground">R$ {success.potentialWin.toFixed(2)}</strong></p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setSuccess(null)}>Continuar</Button>
          <Button className="flex-1 bg-primary text-primary-foreground" onClick={() => { setSuccess(null); navigate("/tickets"); }}>Ver Bilhetes</Button>
        </div>
      </div>
    );
  }

  // Minimized bar
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={cn("fixed z-50 left-0 right-0 bg-primary text-primary-foreground flex items-center justify-between px-4 py-3 shadow-lg",
          isMobile ? "bottom-16 rounded-t-xl" : "bottom-0 max-w-md right-4 left-auto rounded-t-xl"
        )}
      >
        <div className="flex items-center gap-2">
          <Ticket className="h-4 w-4" />
          <span className="text-sm font-bold">Cupom ({selections.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold">Odds: {totalOdds.toFixed(2)}</span>
          <ChevronUp className="h-4 w-4" />
        </div>
      </button>
    );
  }

  // Full betslip
  return (
    <div className={cn("fixed z-50 bg-card border-t border-border/40 shadow-2xl rounded-t-2xl safe-area-bottom flex flex-col",
      isMobile ? "bottom-16 left-0 right-0 max-h-[70vh]" : "bottom-0 right-4 w-[380px] max-h-[80vh] rounded-2xl border"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/20 shrink-0">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Ticket className="h-4 w-4 text-primary" />
          Cupom {isAccumulator && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary font-semibold">Acumulada</span>}
          <span className="text-muted-foreground font-normal">({selections.length})</span>
        </h3>
        <div className="flex items-center gap-1">
          <button onClick={clearSlip} className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive/70" title="Limpar">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Selections */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {selections.map(sel => (
          <div key={`${sel.matchId}-${sel.betType}`} className="bg-secondary/50 rounded-lg p-2.5 relative">
            <button
              onClick={() => removeSelection(sel.matchId, sel.betType)}
              className="absolute top-1.5 right-1.5 p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
            <p className="text-[10px] text-muted-foreground uppercase">{sel.league}</p>
            <p className="text-xs font-semibold text-foreground pr-5">{sel.matchHome} vs {sel.matchAway}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] px-2 py-0.5 rounded bg-primary/15 text-primary font-semibold">
                {sel.label} @ {sel.odds.toFixed(2)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-border/20 p-3 space-y-2.5 shrink-0">
        {isAccumulator && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Odds combinadas</span>
            <span className="font-bold text-primary">{totalOdds.toFixed(2)}</span>
          </div>
        )}

        <div className="flex gap-2 items-end">
          <div className="flex-1 space-y-1">
            <label className="text-[10px] text-muted-foreground">Valor (Saldo: R$ {Number(balance).toFixed(2)})</label>
            <Input
              type="number"
              inputMode="decimal"
              value={betAmount}
              onChange={e => setBetAmount(e.target.value)}
              placeholder="R$ 0,00"
              className="bg-secondary border-border/40 h-9 text-sm"
            />
          </div>
          <div className="text-right pb-0.5">
            <p className="text-[10px] text-muted-foreground">Retorno</p>
            <p className="text-sm font-black text-primary">R$ {potentialWin.toFixed(2)}</p>
          </div>
        </div>

        <div className="flex gap-1">
          {[10, 25, 50, 100].map(v => (
            <button
              key={v}
              onClick={() => setBetAmount(String(v))}
              className={cn("flex-1 py-1.5 rounded-lg text-[11px] font-semibold border transition-all",
                betAmount === String(v) ? "bg-primary text-primary-foreground border-primary" : "bg-secondary border-border/30 text-foreground"
              )}
            >
              R${v}
            </button>
          ))}
        </div>

        <Button
          onClick={placeBet}
          disabled={placing || !user || amount <= 0 || amount > balance}
          className="w-full bg-primary text-primary-foreground font-bold h-10 shadow-lg shadow-primary/25"
        >
          {!user ? "Faça login para apostar" : placing ? <Loader2 className="h-4 w-4 animate-spin" /> : `Apostar R$ ${betAmount || "0,00"}`}
        </Button>
      </div>
    </div>
  );
}
