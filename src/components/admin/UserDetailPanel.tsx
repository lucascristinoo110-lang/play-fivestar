import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  DollarSign, ArrowDownToLine, ArrowUpFromLine, TrendingDown, Gamepad2,
  Calendar, Hash, User, Mail, Phone, Fingerprint, Clock, MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  user: any | null;
  open: boolean;
  onClose: () => void;
  light: boolean;
};

type TabKey = "overview" | "transactions" | "bets";

export default function UserDetailPanel({ user, open, onClose, light }: Props) {
  const [tab, setTab] = useState<TabKey>("overview");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [bets, setBets] = useState<any[]>([]);
  const [casinoHistory, setCasinoHistory] = useState<any[]>([]);
  const [gameNames, setGameNames] = useState<Map<string, string>>(new Map());
  const [stats, setStats] = useState({ totalDeposits: 0, totalWithdrawals: 0, totalBets: 0, totalWins: 0, totalLosses: 0, casinoBets: 0, casinoWins: 0, casinoLosses: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !open) return;
    setTab("overview");
    loadData();
  }, [user?.id, open]);

  async function loadData() {
    if (!user) return;
    setLoading(true);

    const [txRes, betsRes, casinoRes] = await Promise.all([
      supabase.from("transactions").select("*").eq("user_id", user.user_id).order("created_at", { ascending: false }).limit(50),
      supabase.from("bets").select("*").eq("user_id", user.user_id).order("created_at", { ascending: false }).limit(50),
      supabase.from("transactions").select("*").eq("user_id", user.user_id).in("type", ["game_bet", "game_win", "game_refund"]).order("created_at", { ascending: false }).limit(200),
    ]);

    const txs = txRes.data || [];
    const bts = betsRes.data || [];
    const casinoTxs = casinoRes.data || [];
    setTransactions(txs);
    setBets(bts);

    // Group casino transactions by round_id to pair bets with wins
    const roundMap = new Map<string, { bet: any; win: any }>();
    const standalone: any[] = [];

    for (const tx of casinoTxs) {
      const meta = tx.metadata as any;
      const roundId = meta?.round_id || tx.external_id || tx.id;
      const key = String(roundId);

      if (tx.type === "game_bet") {
        if (roundMap.has(key)) {
          roundMap.get(key)!.bet = tx;
        } else {
          roundMap.set(key, { bet: tx, win: null });
        }
      } else if (tx.type === "game_win") {
        if (roundMap.has(key)) {
          roundMap.get(key)!.win = tx;
        } else {
          roundMap.set(key, { bet: null, win: tx });
        }
      } else {
        standalone.push(tx);
      }
    }

    // Build unified casino history
    const history: any[] = [];
    const gameCodes = new Set<string>();

    for (const [, round] of roundMap) {
      const meta = (round.bet?.metadata || round.win?.metadata) as any;
      const gameCode = meta?.game_code || "—";
      gameCodes.add(gameCode);

      const betAmt = round.bet ? Math.abs(Number(round.bet.amount)) : 0;
      const winAmt = round.win ? Math.abs(Number(round.win.amount)) : 0;
      // If there's a bet with no win, or net is negative = loss
      const net = winAmt - betAmt;
      const result = net > 0 ? "won" : net === 0 && winAmt > 0 ? "draw" : "lost";

      history.push({
        id: round.bet?.id || round.win?.id,
        game_code: gameCode,
        bet_amount: betAmt,
        win_amount: winAmt,
        net,
        result,
        created_at: round.bet?.created_at || round.win?.created_at,
      });
    }

    for (const tx of standalone) {
      const meta = tx.metadata as any;
      const gameCode = meta?.game_code || "—";
      gameCodes.add(gameCode);
      history.push({
        id: tx.id,
        game_code: gameCode,
        bet_amount: 0,
        win_amount: Math.abs(Number(tx.amount)),
        net: Number(tx.amount),
        result: tx.type === "game_refund" ? "refund" : "won",
        created_at: tx.created_at,
      });
    }

    history.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setCasinoHistory(history);

    // Fetch game names
    const codeArr = [...gameCodes].filter(c => c && c !== "—");
    if (codeArr.length > 0) {
      const { data: gamesData } = await supabase.from("games").select("game_code, name").in("game_code", codeArr);
      const map = new Map<string, string>();
      (gamesData || []).forEach(g => map.set(g.game_code || "", g.name));
      setGameNames(map);
    }

    const completedDeposits = txs.filter(t => t.type === "deposit" && t.status === "completed");
    const completedWithdrawals = txs.filter(t => t.type === "withdrawal" && t.status === "completed");
    const wonBets = bts.filter(b => b.status === "won");
    const lostBets = bts.filter(b => b.status === "lost");

    const casinoBetTotal = history.reduce((s, h) => s + h.bet_amount, 0);
    const casinoWinTotal = history.filter(h => h.result === "won").reduce((s, h) => s + h.win_amount, 0);
    const casinoLossTotal = history.filter(h => h.result === "lost").reduce((s, h) => s + h.bet_amount, 0);

    setStats({
      totalDeposits: completedDeposits.reduce((s, t) => s + Number(t.amount), 0),
      totalWithdrawals: completedWithdrawals.reduce((s, t) => s + Number(t.amount), 0),
      totalBets: bts.reduce((s, b) => s + Number(b.amount), 0) + casinoBetTotal,
      totalWins: wonBets.reduce((s, b) => s + Number(b.potential_win), 0) + casinoWinTotal,
      totalLosses: lostBets.reduce((s, b) => s + Number(b.amount), 0) + casinoLossTotal,
      casinoBets: casinoBetTotal,
      casinoWins: casinoWinTotal,
      casinoLosses: casinoLossTotal,
    });
    setLoading(false);
  }

  if (!user) return null;

  function openWhatsApp() {
    if (!user?.phone) return;
    let clean = user.phone.replace(/\D/g, "");
    if (clean.length <= 11 && !clean.startsWith("55")) clean = "55" + clean;
    const msg = encodeURIComponent(`Olá ${user.display_name || ""}! Tudo bem?`);
    window.open(`https://wa.me/${clean}?text=${msg}`, "_blank");
  }

  const fmt = (v: number) => `R$ ${v.toFixed(2)}`;
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });

  const tabs: { key: TabKey; label: string }[] = [
    { key: "overview", label: "Resumo" },
    { key: "transactions", label: "Transações" },
    { key: "bets", label: "Apostas" },
  ];

  const cardCls = cn(
    "rounded-xl border p-4",
    light ? "bg-slate-50 border-slate-100" : "bg-slate-800/40 border-white/[0.04]"
  );

  const statCards = [
    { icon: ArrowDownToLine, label: "Total Depositado", value: fmt(stats.totalDeposits), color: "text-emerald-500" },
    { icon: ArrowUpFromLine, label: "Total Sacado", value: fmt(stats.totalWithdrawals), color: "text-orange-500" },
    { icon: Gamepad2, label: "Total Apostado", value: fmt(stats.totalBets), color: "text-blue-500" },
    { icon: DollarSign, label: "Total Ganho", value: fmt(stats.totalWins), color: "text-emerald-400" },
    { icon: TrendingDown, label: "Total Perdido", value: fmt(stats.totalLosses), color: "text-red-400" },
  ];

  const statusMap: Record<string, { label: string; cls: string }> = {
    completed: { label: "Aprovado", cls: "bg-emerald-500/10 text-emerald-500" },
    pending: { label: "Pendente", cls: "bg-amber-500/10 text-amber-500" },
    failed: { label: "Falhou", cls: "bg-red-500/10 text-red-500" },
    won: { label: "Ganhou", cls: "bg-emerald-500/10 text-emerald-500" },
    lost: { label: "Perdeu", cls: "bg-red-500/10 text-red-500" },
    cancelled: { label: "Cancelado", cls: "bg-slate-500/10 text-slate-500" },
  };

  const getStatus = (s: string) => statusMap[s] || { label: s, cls: "bg-slate-500/10 text-slate-400" };

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent
        side="right"
        className={cn(
          "w-full sm:max-w-[520px] p-0 flex flex-col overflow-hidden border-l",
          light ? "bg-white border-slate-200" : "bg-[#0c1221] border-white/[0.06]"
        )}
      >
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 space-y-1 shrink-0">
          <SheetTitle className={cn("text-lg font-bold", light ? "text-slate-800" : "text-white")}>
            {user.display_name || "Sem nome"}
          </SheetTitle>
          <SheetDescription className="space-y-1">
            <div className="flex flex-wrap gap-3 text-xs">
              {user.email && (
                <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {user.email}</span>
              )}
              {user.phone && (
                <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {user.phone}</span>
              )}
              {user.cpf && (
                <span className="flex items-center gap-1"><Fingerprint className="h-3 w-3" /> {user.cpf}</span>
              )}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <span className={cn(
                "px-2 py-0.5 rounded-md text-[10px] font-semibold",
                user.status === "active" ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-400"
              )}>
                {user.status === "active" ? "Ativo" : "Bloqueado"}
              </span>
              <span className={cn(
                "px-2 py-0.5 rounded-md text-[10px] font-semibold",
                user.kyc_verified ? "bg-blue-500/10 text-blue-500" : "bg-slate-500/10 text-slate-400"
              )}>
                KYC: {user.kyc_verified ? "Verificado" : "Pendente"}
              </span>
              <span className={cn("text-xs font-bold ml-auto", light ? "text-slate-800" : "text-white")}>
                Saldo: {fmt(Number(user.balance || 0))}
              </span>
            </div>
            {user.phone && (
              <Button
                size="sm"
                onClick={openWhatsApp}
                className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 h-8"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Enviar WhatsApp
              </Button>
            )}
          </SheetDescription>
        </SheetHeader>

        {/* Tabs */}
        <div className={cn("flex gap-1 px-6 shrink-0 border-b pb-0", light ? "border-slate-100" : "border-white/[0.04]")}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "px-4 py-2.5 text-xs font-semibold transition-all border-b-2 -mb-px",
                tab === t.key
                  ? light ? "border-blue-600 text-blue-600" : "border-emerald-400 text-emerald-400"
                  : light ? "border-transparent text-slate-400 hover:text-slate-600" : "border-transparent text-slate-500 hover:text-slate-300"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : tab === "overview" ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                {statCards.map(({ icon: Icon, label, value, color }) => (
                  <div key={label} className={cardCls}>
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={cn("h-3.5 w-3.5", color)} />
                      <span className={cn("text-[10px] font-medium", light ? "text-slate-400" : "text-slate-500")}>{label}</span>
                    </div>
                    <p className={cn("text-sm font-bold", light ? "text-slate-800" : "text-white")}>{value}</p>
                  </div>
                ))}
                <div className={cardCls}>
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span className={cn("text-[10px] font-medium", light ? "text-slate-400" : "text-slate-500")}>Cadastro</span>
                  </div>
                  <p className={cn("text-sm font-bold", light ? "text-slate-800" : "text-white")}>
                    {user.created_at ? fmtDate(user.created_at) : "—"}
                  </p>
                </div>
              </div>

              {/* Last 5 transactions */}
              <div>
                <p className={cn("text-xs font-semibold mb-2", light ? "text-slate-700" : "text-slate-300")}>Últimas Transações</p>
                {transactions.length === 0 ? (
                  <p className={cn("text-xs", light ? "text-slate-400" : "text-slate-500")}>Nenhuma transação.</p>
                ) : (
                  <div className="space-y-1.5">
                    {transactions.slice(0, 5).map(tx => {
                      const st = getStatus(tx.status);
                      return (
                        <div key={tx.id} className={cn("flex items-center gap-3 p-3 rounded-lg text-xs", light ? "bg-slate-50" : "bg-slate-800/30")}>
                          <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                            tx.type === "deposit" ? "bg-emerald-500/10" : "bg-orange-500/10"
                          )}>
                            {tx.type === "deposit"
                              ? <ArrowDownToLine className="h-3.5 w-3.5 text-emerald-500" />
                              : <ArrowUpFromLine className="h-3.5 w-3.5 text-orange-500" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn("font-medium", light ? "text-slate-700" : "text-slate-200")}>
                              {tx.type === "deposit" ? "Depósito" : "Saque"} — {fmt(Number(tx.amount))}
                            </p>
                            <p className={cn("text-[10px]", light ? "text-slate-400" : "text-slate-500")}>
                              {fmtDate(tx.created_at)}
                            </p>
                          </div>
                          <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-semibold", st.cls)}>{st.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : tab === "transactions" ? (
            <div className="space-y-1.5">
              {transactions.length === 0 ? (
                <p className={cn("text-xs text-center py-8", light ? "text-slate-400" : "text-slate-500")}>Nenhuma transação encontrada.</p>
              ) : transactions.map(tx => {
                const st = getStatus(tx.status);
                return (
                  <div key={tx.id} className={cn("flex items-center gap-3 p-3 rounded-lg text-xs", light ? "bg-slate-50" : "bg-slate-800/30")}>
                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                      tx.type === "deposit" ? "bg-emerald-500/10" : "bg-orange-500/10"
                    )}>
                      {tx.type === "deposit"
                        ? <ArrowDownToLine className="h-3.5 w-3.5 text-emerald-500" />
                        : <ArrowUpFromLine className="h-3.5 w-3.5 text-orange-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("font-medium", light ? "text-slate-700" : "text-slate-200")}>
                        {tx.type === "deposit" ? "Depósito" : "Saque"} — {fmt(Number(tx.amount))}
                      </p>
                      <p className={cn("text-[10px]", light ? "text-slate-400" : "text-slate-500")}>
                        {fmtDate(tx.created_at)} {tx.payment_method ? `• ${tx.payment_method.toUpperCase()}` : ""}
                      </p>
                    </div>
                    <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-semibold", st.cls)}>{st.label}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-1.5">
              {bets.length === 0 ? (
                <p className={cn("text-xs text-center py-8", light ? "text-slate-400" : "text-slate-500")}>Nenhuma aposta encontrada.</p>
              ) : bets.map(bet => {
                const st = getStatus(bet.status);
                return (
                  <div key={bet.id} className={cn("flex items-center gap-3 p-3 rounded-lg text-xs", light ? "bg-slate-50" : "bg-slate-800/30")}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-blue-500/10">
                      <Gamepad2 className="h-3.5 w-3.5 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("font-medium", light ? "text-slate-700" : "text-slate-200")}>
                        {bet.ticket_number} — {fmt(Number(bet.amount))}
                      </p>
                      <p className={cn("text-[10px]", light ? "text-slate-400" : "text-slate-500")}>
                        {fmtDate(bet.created_at)} • Odd: {Number(bet.odds).toFixed(2)} • Ganho pot.: {fmt(Number(bet.potential_win))}
                      </p>
                    </div>
                    <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-semibold", st.cls)}>{st.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
