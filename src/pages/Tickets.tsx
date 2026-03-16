import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Ticket, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { getBetTypeLabel, getMarketLabel } from "@/lib/sports-odds";

type Bet = {
  id: string;
  ticket_number: string;
  match_id: string;
  match_data: any;
  bet_type: string;
  odds: number;
  amount: number;
  potential_win: number;
  status: string;
  created_at: string;
  settled_at: string | null;
};

const statusConfig: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  pending: { label: "Pendente", icon: Clock, color: "text-yellow-500", bg: "bg-yellow-500/10" },
  won: { label: "Ganhou", icon: CheckCircle, color: "text-primary", bg: "bg-primary/10" },
  lost: { label: "Perdeu", icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" },
  cancelled: { label: "Cancelado", icon: XCircle, color: "text-muted-foreground", bg: "bg-muted" },
};

export default function TicketsPage() {
  const { user } = useAuth();
  const { settings } = useSiteSettings();
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    if (!user) return;
    loadBets();

    // Realtime updates
    const channel = supabase
      .channel("my-bets")
      .on("postgres_changes", { event: "*", schema: "public", table: "bets", filter: `user_id=eq.${user.id}` }, () => {
        loadBets();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  async function loadBets() {
    if (!user) return;
    const { data } = await supabase
      .from("bets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setBets((data as Bet[]) || []);
    setLoading(false);
  }

  const filtered = filter === "all" ? bets : bets.filter(b => b.status === filter);

  const stats = {
    total: bets.length,
    pending: bets.filter(b => b.status === "pending").length,
    won: bets.filter(b => b.status === "won").length,
    lost: bets.filter(b => b.status === "lost").length,
    totalWagered: bets.reduce((s, b) => s + Number(b.amount), 0),
    totalWon: bets.filter(b => b.status === "won").reduce((s, b) => s + Number(b.potential_win), 0),
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Ticket className="h-12 w-12 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">Faça login para ver seus bilhetes</p>
          <Link to="/" className="text-primary text-sm font-semibold hover:underline">Voltar ao início</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <header className="sticky top-0 z-30 h-14 flex items-center gap-3 px-4 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <Link to="/football" className="p-2 rounded-lg hover:bg-secondary text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        {settings?.logo_url && <img src={settings.logo_url} alt="" className="h-7 w-auto object-contain" />}
        <h1 className="text-sm font-bold flex items-center gap-2">
          <Ticket className="h-4 w-4 text-primary" /> Meus Bilhetes
        </h1>
      </header>

      <div className="p-3 sm:p-6 space-y-4 max-w-3xl mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: "Apostas", value: stats.total },
            { label: "Pendentes", value: stats.pending },
            { label: "Ganhas", value: stats.won },
            { label: "Total Ganho", value: `R$ ${stats.totalWon.toFixed(2)}` },
          ].map(s => (
            <div key={s.label} className="rounded-xl bg-card border border-border/40 p-3 text-center">
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
              <p className="text-base font-bold text-foreground">{s.value}</p>
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
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === f.key ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Bet list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <Ticket className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">
              {filter === "all" ? "Você ainda não fez nenhuma aposta." : "Nenhum bilhete encontrado com esse filtro."}
            </p>
            <Link to="/football" className="text-primary text-xs font-semibold hover:underline">Ir para Futebol</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(bet => {
              const cfg = statusConfig[bet.status] || statusConfig.pending;
              const StatusIcon = cfg.icon;
              const md = bet.match_data as any;

              return (
                <div key={bet.id} className="rounded-xl border border-border/40 bg-card card-shadow p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-foreground">{bet.ticket_number}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(bet.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md ${cfg.color} ${cfg.bg}`}>
                      <StatusIcon className="h-3 w-3" />
                      {cfg.label}
                    </span>
                  </div>

                  {/* Match info */}
                  <div className="bg-secondary/30 rounded-lg p-3">
                    {bet.bet_type === "accumulator" && md?.selections ? (
                      <div className="space-y-2">
                        <p className="text-[10px] text-primary font-semibold uppercase">Aposta Acumulada • {md.selections.length} seleções</p>
                        {md.selections.map((sel: any, i: number) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span className="text-foreground">{sel.home} vs {sel.away}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-primary/15 text-primary font-semibold">
                              {sel.label || getBetTypeLabel(sel.betType)} @ {Number(sel.odds).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <>
                        <p className="text-[10px] text-muted-foreground uppercase">{md?.league}</p>
                        <p className="text-xs font-semibold text-foreground mt-0.5">{md?.home} vs {md?.away}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] px-2 py-0.5 rounded bg-primary/15 text-primary font-semibold">
                            {md?.label || getBetTypeLabel(bet.bet_type)} @ {Number(bet.odds).toFixed(2)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Amounts */}
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Apostado</p>
                      <p className="text-sm font-bold text-foreground">R$ {Number(bet.amount).toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground">
                        {bet.status === "won" ? "Ganho" : "Retorno potencial"}
                      </p>
                      <p className={`text-sm font-bold ${bet.status === "won" ? "text-primary" : bet.status === "lost" ? "text-destructive line-through" : "text-foreground"}`}>
                        R$ {Number(bet.potential_win).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
