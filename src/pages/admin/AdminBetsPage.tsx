import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOutletContext } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Ticket, Clock, CheckCircle, XCircle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getBetTypeLabel } from "@/lib/sports-odds";

type Bet = {
  id: string;
  ticket_number: string;
  match_data: any;
  bet_type: string;
  odds: number;
  amount: number;
  potential_win: number;
  status: string;
  created_at: string;
  user_id: string;
  user_email?: string;
};

const statusConfig: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  pending: { label: "Pendente", icon: Clock, color: "text-yellow-500", bg: "bg-yellow-500/10" },
  won: { label: "Ganhou", icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  lost: { label: "Perdeu", icon: XCircle, color: "text-red-500", bg: "bg-red-500/10" },
  cancelled: { label: "Cancelado", icon: XCircle, color: "text-gray-400", bg: "bg-gray-400/10" },
};

const betTypeLabel = (t: string) => getBetTypeLabel(t);

export default function AdminBetsPage() {
  const { light } = useOutletContext<{ light: boolean }>();
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    loadBets();

    const channel = supabase
      .channel("admin-bets-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "bets" }, () => {
        loadBets();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function loadBets() {
    const { data: betsData } = await supabase
      .from("bets")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (!betsData) { setLoading(false); return; }

    // Get user emails
    const userIds = [...new Set(betsData.map(b => b.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, email, display_name")
      .in("user_id", userIds);

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

    const enriched = betsData.map(b => ({
      ...b,
      user_email: profileMap.get(b.user_id)?.email || profileMap.get(b.user_id)?.display_name || "—",
    }));

    setBets(enriched);
    setLoading(false);
  }

  const filtered = filter === "all" ? bets : bets.filter(b => b.status === filter);

  const stats = {
    total: bets.length,
    pending: bets.filter(b => b.status === "pending").length,
    won: bets.filter(b => b.status === "won").length,
    lost: bets.filter(b => b.status === "lost").length,
    totalWagered: bets.reduce((s, b) => s + Number(b.amount), 0),
    totalPaid: bets.filter(b => b.status === "won").reduce((s, b) => s + Number(b.potential_win), 0),
  };

  const sectionClass = cn("rounded-xl border p-4", light ? "bg-white border-gray-200 shadow-sm" : "bg-card border-border/40 card-shadow");

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <h2 className={cn("text-lg font-bold flex items-center gap-2", light ? "text-gray-900" : "text-foreground")}>
          <Ticket className="h-5 w-5 text-primary" /> Bilhetes de Apostas
        </h2>
        <Button size="sm" variant="outline" onClick={loadBets} className="text-xs">
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Atualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        {[
          { label: "Total", value: stats.total },
          { label: "Pendentes", value: stats.pending },
          { label: "Ganhos", value: stats.won },
          { label: "Perdidos", value: stats.lost },
          { label: "Apostado", value: `R$ ${stats.totalWagered.toFixed(2)}` },
          { label: "Pago", value: `R$ ${stats.totalPaid.toFixed(2)}` },
        ].map(s => (
          <div key={s.label} className={sectionClass + " text-center"}>
            <p className={cn("text-[10px]", light ? "text-gray-400" : "text-muted-foreground")}>{s.label}</p>
            <p className={cn("text-base font-bold", light ? "text-gray-900" : "text-foreground")}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {[
          { key: "all", label: "Todos" },
          { key: "pending", label: "Pendentes" },
          { key: "won", label: "Ganhos" },
          { key: "lost", label: "Perdidos" },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn("shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
              filter === f.key
                ? light ? "bg-blue-600 text-white" : "bg-primary text-primary-foreground"
                : light ? "bg-gray-100 text-gray-500" : "bg-secondary text-muted-foreground"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Bets Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className={cn("text-center py-16 text-sm", light ? "text-gray-400" : "text-muted-foreground")}>
          Nenhum bilhete encontrado.
        </div>
      ) : (
        <div className={cn("rounded-xl border overflow-hidden", light ? "bg-white border-gray-200" : "bg-card border-border/40")}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className={cn("border-b", light ? "bg-gray-50 border-gray-200" : "bg-secondary/50 border-border/40")}>
                  <th className="text-left px-4 py-3 font-semibold">Bilhete</th>
                  <th className="text-left px-4 py-3 font-semibold">Usuário</th>
                  <th className="text-left px-4 py-3 font-semibold">Partida</th>
                  <th className="text-left px-4 py-3 font-semibold">Aposta</th>
                  <th className="text-right px-4 py-3 font-semibold">Valor</th>
                  <th className="text-right px-4 py-3 font-semibold">Retorno</th>
                  <th className="text-center px-4 py-3 font-semibold">Status</th>
                  <th className="text-right px-4 py-3 font-semibold">Data</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(bet => {
                  const cfg = statusConfig[bet.status] || statusConfig.pending;
                  const StatusIcon = cfg.icon;
                  const md = bet.match_data as any;
                  return (
                    <tr key={bet.id} className={cn("border-b", light ? "border-gray-100 hover:bg-gray-50" : "border-border/20 hover:bg-surface-hover")}>
                      <td className="px-4 py-3 font-mono font-bold">{bet.ticket_number}</td>
                      <td className={cn("px-4 py-3 truncate max-w-[120px]", light ? "text-gray-600" : "text-muted-foreground")}>{bet.user_email}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{md?.home} vs {md?.away}</p>
                        <p className={cn("text-[10px]", light ? "text-gray-400" : "text-muted-foreground")}>{md?.league}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded bg-primary/15 text-primary font-semibold text-[10px]">
                          {betTypeLabel(bet.bet_type)} @ {Number(bet.odds).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">R$ {Number(bet.amount).toFixed(2)}</td>
                      <td className={cn("px-4 py-3 text-right font-semibold", bet.status === "won" ? "text-emerald-500" : bet.status === "lost" ? "text-red-400 line-through" : "")}>
                        R$ {Number(bet.potential_win).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md", cfg.color, cfg.bg)}>
                          <StatusIcon className="h-3 w-3" />
                          {cfg.label}
                        </span>
                      </td>
                      <td className={cn("px-4 py-3 text-right", light ? "text-gray-400" : "text-muted-foreground")}>
                        {new Date(bet.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
