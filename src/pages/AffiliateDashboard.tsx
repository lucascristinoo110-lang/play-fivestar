import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Users, DollarSign, TrendingUp, Copy, ArrowDownToLine, BarChart3, Home, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function AffiliateDashboard() {
  const { user, loading, signOut } = useAuth();
  const [affiliate, setAffiliate] = useState<any>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [notAffiliate, setNotAffiliate] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    loadData();

    const channel = supabase
      .channel("affiliate-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "affiliates" }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "affiliate_referrals" }, () => loadData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  async function loadData() {
    if (!user) return;

    const { data: aff } = await supabase.from("affiliates").select("*").eq("user_id", user.id).single();
    if (!aff) {
      setNotAffiliate(true);
      return;
    }
    setAffiliate(aff);

    const { data: refs } = await supabase.from("affiliate_referrals").select("*").eq("affiliate_id", aff.id).order("created_at", { ascending: false });
    if (refs) {
      // Get profile names
      const userIds = refs.map(r => r.referred_user_id);
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, email, created_at").in("user_id", userIds);
        const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));
        setReferrals(refs.map(r => ({ ...r, profile: profileMap[r.referred_user_id] || {} })));
      } else {
        setReferrals([]);
      }
    }

    // Chart: last 7 days signups
    const days: any[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({ date: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), cadastros: 0, comissoes: 0 });
    }
    (refs || []).forEach(r => {
      const d = new Date(r.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      const day = days.find(dd => dd.date === d);
      if (day) {
        day.cadastros++;
        day.comissoes += Number(r.commission_earned || 0);
      }
    });
    setChartData(days);
  }

  function copyLink() {
    if (!affiliate) return;
    const link = `${window.location.origin}/?ref=${affiliate.affiliate_code}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Link copiado!", description: link });
  }

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Carregando...</div>;
  if (!user) return <Navigate to="/" replace />;
  if (notAffiliate) return (
    <div className="min-h-screen bg-background flex items-center justify-center text-center p-4">
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-foreground">Acesso Negado</h1>
        <p className="text-sm text-muted-foreground">Você não é um afiliado autorizado. Entre em contato com o suporte.</p>
        <Link to="/" className="text-primary text-sm underline">Voltar ao cassino</Link>
      </div>
    </div>
  );

  const fmt = (v: number) => `R$ ${Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const cards = [
    { label: "Cadastros", value: affiliate?.total_signups || 0, icon: Users, color: "text-blue-500" },
    { label: "Depósitos Indicados", value: fmt(affiliate?.total_deposits), icon: ArrowDownToLine, color: "text-emerald-500" },
    { label: "Comissões Totais", value: fmt(affiliate?.total_earnings), icon: TrendingUp, color: "text-purple-500" },
    { label: "Saldo Disponível", value: fmt(affiliate?.balance), icon: DollarSign, color: "text-primary" },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-56 h-screen sticky top-0 flex flex-col border-r border-border/40 bg-card">
        <div className="h-16 flex items-center px-4 border-b border-border/40">
          <span className="text-lg font-bold text-gradient-green">AFILIADO</span>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm bg-primary/10 text-primary font-medium">
            <BarChart3 className="h-4 w-4" /> Dashboard
          </div>
        </nav>
        <div className="p-2 border-t border-border/40 space-y-0.5">
          <Link to="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-surface-hover">
            <Home className="h-4 w-4" /> Voltar ao site
          </Link>
          <button onClick={signOut} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-destructive hover:bg-destructive/10">
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 h-16 flex items-center justify-between px-6 border-b border-border/40 bg-background/80 backdrop-blur-xl">
          <h1 className="text-lg font-semibold text-foreground">Dashboard do Afiliado</h1>
          <Button size="sm" onClick={copyLink} className="bg-primary text-primary-foreground text-xs h-8">
            <Copy className="h-3.5 w-3.5 mr-1.5" /> Copiar Link
          </Button>
        </header>

        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Affiliate Link */}
          <div className="rounded-xl bg-card border border-border/40 card-shadow p-4">
            <p className="text-xs text-muted-foreground mb-1">Seu link de afiliado:</p>
            <p className="text-sm font-mono text-primary break-all">
              {window.location.origin}/?ref={affiliate?.affiliate_code}
            </p>
            <p className="text-[10px] text-muted-foreground mt-2">
              Tipo: {affiliate?.commission_type === "cpa" ? "CPA" : affiliate?.commission_type === "hybrid" ? "CPA + RevShare" : "RevShare"} •
              CPA: R${Number(affiliate?.commission_cpa).toFixed(0)} •
              RevShare: {Number(affiliate?.commission_revshare).toFixed(0)}%
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {cards.map(c => (
              <div key={c.label} className="rounded-xl bg-card border border-border/40 card-shadow p-4">
                <c.icon className={cn("h-4 w-4 mb-2", c.color)} />
                <p className="text-lg font-bold font-mono text-foreground">{c.value}</p>
                <p className="text-[10px] text-muted-foreground">{c.label}</p>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="rounded-xl bg-card border border-border/40 card-shadow p-6">
            <h2 className="text-sm font-semibold text-foreground mb-4">Cadastros e Comissões (7 dias)</h2>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#888" }} />
                <YAxis tick={{ fontSize: 11, fill: "#888" }} />
                <Tooltip contentStyle={{ backgroundColor: "#1a1a2e", border: "none", borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="cadastros" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} name="Cadastros" />
                <Area type="monotone" dataKey="comissoes" stroke="#10b981" fill="#10b981" fillOpacity={0.2} name="Comissões R$" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Referrals */}
          <div className="rounded-xl bg-card border border-border/40 card-shadow overflow-hidden">
            <div className="p-4 border-b border-border/40">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" /> Indicados ({referrals.length})
              </h2>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/40 text-muted-foreground">
                  <th className="text-left p-3 font-medium">Usuário</th>
                  <th className="text-left p-3 font-medium">Data</th>
                  <th className="text-left p-3 font-medium">Comissão</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map(r => (
                  <tr key={r.id} className="border-b border-border/20 hover:bg-surface-hover transition-colors">
                    <td className="p-3">
                      <div className="font-medium text-foreground">{r.profile?.display_name || "—"}</div>
                      <div className="text-[10px] text-muted-foreground">{r.profile?.email}</div>
                    </td>
                    <td className="p-3 text-muted-foreground">{new Date(r.created_at).toLocaleString("pt-BR")}</td>
                    <td className="p-3 font-mono text-primary">{fmt(r.commission_earned)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {referrals.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Nenhum indicado ainda.</p>}
          </div>
        </main>
      </div>
    </div>
  );
}
