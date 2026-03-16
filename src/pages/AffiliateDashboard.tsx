import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Users, DollarSign, TrendingUp, Copy, ArrowDownToLine, BarChart3, Home, LogOut, Mail, Lock, Eye, EyeOff, Menu, X, UserPlus, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useIsMobile } from "@/hooks/use-mobile";

function AffiliateLogin({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      onLogin();
    } catch (err: any) {
      toast({ title: "Erro no login", description: err.message || "Credenciais inválidas.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Painel do Afiliado</h1>
          <p className="text-sm text-muted-foreground">Faça login com sua conta de jogador</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl bg-card border border-border/40 p-6 card-shadow">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="seu@email.com" className="pl-10" required />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={password} onChange={e => setPassword(e.target.value)} type={showPass ? "text" : "password"} placeholder="••••••••" className="pl-10 pr-10" required />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>
        <p className="text-center text-xs text-muted-foreground">
          Use o mesmo login da sua conta de jogador.{" "}
          <Link to="/" className="text-primary underline">Voltar ao cassino</Link>
        </p>
      </div>
    </div>
  );
}

export default function AffiliateDashboard() {
  const { user, loading, signOut } = useAuth();
  const isMobile = useIsMobile();
  const [affiliate, setAffiliate] = useState<any>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [subAffiliates, setSubAffiliates] = useState<any[]>([]);
  const [notAffiliate, setNotAffiliate] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);
  const [forceReload, setForceReload] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "subaffiliates">("dashboard");
  const [expandedSub, setExpandedSub] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadData();

    const channel = supabase
      .channel("affiliate-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "affiliates" }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "affiliate_referrals" }, () => loadData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, forceReload]);

  async function loadData() {
    if (!user) return;

    const { data: aff } = await supabase.from("affiliates").select("*").eq("user_id", user.id).single();
    if (!aff) {
      setNotAffiliate(true);
      return;
    }
    setAffiliate(aff);

    // Load referrals
    const { data: refs } = await supabase.from("affiliate_referrals").select("*").eq("affiliate_id", aff.id).order("created_at", { ascending: false });
    if (refs) {
      const userIds = refs.map(r => r.referred_user_id);
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, email, created_at").in("user_id", userIds);
        const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));
        setReferrals(refs.map(r => ({ ...r, profile: profileMap[r.referred_user_id] || {} })));
      } else {
        setReferrals([]);
      }
    }

    // Load sub-affiliates (affiliates that were referred by this affiliate's referrals)
    // Sub-affiliate = an affiliate whose user_id is in our referral list
    const { data: allAffiliates } = await supabase.from("affiliates").select("*");
    if (allAffiliates && refs) {
      const referredUserIds = refs.map(r => r.referred_user_id);
      const subs = allAffiliates.filter(a => referredUserIds.includes(a.user_id) && a.id !== aff.id);
      
      // For each sub-affiliate, load their referrals
      const subsWithRefs = await Promise.all(subs.map(async (sub) => {
        const { data: subRefs } = await supabase.from("affiliate_referrals").select("*").eq("affiliate_id", sub.id);
        const { data: subProfile } = await supabase.from("profiles").select("display_name, email").eq("user_id", sub.user_id).single();
        return { ...sub, referrals: subRefs || [], profile: subProfile || {} };
      }));
      
      setSubAffiliates(subsWithRefs);
    }

    // Chart data
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
  if (!user) return <AffiliateLogin onLogin={() => setForceReload(p => p + 1)} />;
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
    { label: "Depósitos", value: fmt(affiliate?.total_deposits), icon: ArrowDownToLine, color: "text-emerald-500" },
    { label: "Comissões", value: fmt(affiliate?.total_earnings), icon: TrendingUp, color: "text-purple-500" },
    { label: "Saldo", value: fmt(affiliate?.balance), icon: DollarSign, color: "text-primary" },
  ];

  const navItems = [
    { id: "dashboard" as const, label: "Dashboard", icon: BarChart3 },
    { id: "subaffiliates" as const, label: "Subafiliados", icon: UserPlus },
  ];

  const totalSubEarnings = subAffiliates.reduce((acc, s) => acc + Number(s.total_earnings || 0), 0);
  const totalSubSignups = subAffiliates.reduce((acc, s) => acc + (s.total_signups || 0), 0);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile overlay */}
      {isMobile && mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "h-screen flex flex-col border-r border-border/40 bg-card",
        isMobile 
          ? "fixed inset-y-0 left-0 z-50 w-60 transition-transform duration-200 " + (mobileMenuOpen ? "translate-x-0" : "-translate-x-full")
          : "w-56 sticky top-0"
      )}>
        <div className="h-14 sm:h-16 flex items-center justify-between px-4 border-b border-border/40">
          <span className="text-lg font-bold text-gradient-green">AFILIADO</span>
          {isMobile && (
            <button onClick={() => setMobileMenuOpen(false)} className="p-1.5 rounded-md hover:bg-surface-hover text-muted-foreground">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); if (isMobile) setMobileMenuOpen(false); }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
                activeTab === item.id ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-surface-hover"
              )}
            >
              <item.icon className="h-4 w-4" /> {item.label}
            </button>
          ))}
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
        <header className="sticky top-0 z-30 h-14 sm:h-16 flex items-center justify-between px-3 sm:px-6 border-b border-border/40 bg-background/80 backdrop-blur-xl">
          {isMobile && (
            <button onClick={() => setMobileMenuOpen(true)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground shrink-0">
              <Menu className="h-5 w-5" />
            </button>
          )}
          <h1 className="text-sm sm:text-lg font-semibold text-foreground flex-1 text-center sm:text-left">
            {activeTab === "dashboard" ? "Dashboard" : "Subafiliados"}
          </h1>
          <Button size="sm" onClick={copyLink} className="bg-primary text-primary-foreground text-[11px] sm:text-xs h-8">
            <Copy className="h-3.5 w-3.5 mr-1" /> <span className="hidden sm:inline">Copiar Link</span><span className="sm:hidden">Link</span>
          </Button>
        </header>

        <main className="flex-1 p-3 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto">
          {activeTab === "dashboard" && (
            <>
              {/* Affiliate Link */}
              <div className="rounded-xl bg-card border border-border/40 card-shadow p-3 sm:p-4">
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Seu link de afiliado:</p>
                <p className="text-xs sm:text-sm font-mono text-primary break-all">
                  {window.location.origin}/?ref={affiliate?.affiliate_code}
                </p>
                <p className="text-[10px] text-muted-foreground mt-2">
                  Tipo: {affiliate?.commission_type === "cpa" ? "CPA" : affiliate?.commission_type === "hybrid" ? "CPA + RevShare" : "RevShare"} •
                  CPA: R${Number(affiliate?.commission_cpa).toFixed(0)} •
                  RevShare: {Number(affiliate?.commission_revshare).toFixed(0)}%
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                {cards.map(c => (
                  <div key={c.label} className="rounded-xl bg-card border border-border/40 card-shadow p-3 sm:p-4">
                    <c.icon className={cn("h-4 w-4 mb-1 sm:mb-2", c.color)} />
                    <p className="text-sm sm:text-lg font-bold font-mono text-foreground">{c.value}</p>
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground">{c.label}</p>
                  </div>
                ))}
              </div>

              {/* Chart */}
              <div className="rounded-xl bg-card border border-border/40 card-shadow p-4 sm:p-6">
                <h2 className="text-xs sm:text-sm font-semibold text-foreground mb-3 sm:mb-4">Cadastros e Comissões (7 dias)</h2>
                <ResponsiveContainer width="100%" height={isMobile ? 180 : 250}>
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="date" tick={{ fontSize: isMobile ? 9 : 11, fill: "#888" }} />
                    <YAxis tick={{ fontSize: isMobile ? 9 : 11, fill: "#888" }} width={isMobile ? 30 : 40} />
                    <Tooltip contentStyle={{ backgroundColor: "#1a1a2e", border: "none", borderRadius: 8, fontSize: 12 }} />
                    <Area type="monotone" dataKey="cadastros" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} name="Cadastros" />
                    <Area type="monotone" dataKey="comissoes" stroke="#10b981" fill="#10b981" fillOpacity={0.2} name="Comissões R$" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Referrals */}
              <div className="rounded-xl bg-card border border-border/40 card-shadow overflow-hidden">
                <div className="p-3 sm:p-4 border-b border-border/40">
                  <h2 className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-500" /> Indicados ({referrals.length})
                  </h2>
                </div>
                
                {isMobile ? (
                  /* Mobile: card list */
                  <div className="divide-y divide-border/20">
                    {referrals.map(r => (
                      <div key={r.id} className="p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-medium text-foreground">{r.profile?.display_name || "—"}</p>
                            <p className="text-[10px] text-muted-foreground">{r.profile?.email}</p>
                          </div>
                          <span className="font-mono text-xs text-primary">{fmt(r.commission_earned)}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleString("pt-BR")}</p>
                      </div>
                    ))}
                    {referrals.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Nenhum indicado ainda.</p>}
                  </div>
                ) : (
                  /* Desktop: table */
                  <>
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
                  </>
                )}
              </div>
            </>
          )}

          {activeTab === "subaffiliates" && (
            <>
              {/* Sub-affiliate stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                <div className="rounded-xl bg-card border border-border/40 card-shadow p-3 sm:p-4">
                  <UserPlus className="h-4 w-4 mb-1 text-blue-500" />
                  <p className="text-sm sm:text-lg font-bold font-mono text-foreground">{subAffiliates.length}</p>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground">Subafiliados</p>
                </div>
                <div className="rounded-xl bg-card border border-border/40 card-shadow p-3 sm:p-4">
                  <Users className="h-4 w-4 mb-1 text-emerald-500" />
                  <p className="text-sm sm:text-lg font-bold font-mono text-foreground">{totalSubSignups}</p>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground">Cadastros dos Subs</p>
                </div>
                <div className="rounded-xl bg-card border border-border/40 card-shadow p-3 sm:p-4 col-span-2 sm:col-span-1">
                  <TrendingUp className="h-4 w-4 mb-1 text-purple-500" />
                  <p className="text-sm sm:text-lg font-bold font-mono text-foreground">{fmt(totalSubEarnings)}</p>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground">Comissões dos Subs</p>
                </div>
              </div>

              {/* Info box */}
              <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 sm:p-4">
                <h3 className="text-xs sm:text-sm font-semibold text-primary mb-1">Como funciona a Subafiliação?</h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground leading-relaxed">
                  Quando alguém se cadastra pelo seu link e também se torna afiliado, essa pessoa vira seu <strong className="text-foreground">subafiliado (nível 1)</strong>. 
                  Você acompanha aqui as estatísticas dos seus subafiliados — cadastros, depósitos e comissões que eles geram. 
                  Isso permite que você veja o alcance total da sua rede de indicação.
                </p>
              </div>

              {/* Sub-affiliates list */}
              <div className="rounded-xl bg-card border border-border/40 card-shadow overflow-hidden">
                <div className="p-3 sm:p-4 border-b border-border/40">
                  <h2 className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-blue-500" /> Seus Subafiliados ({subAffiliates.length})
                  </h2>
                </div>

                {subAffiliates.length === 0 ? (
                  <div className="p-6 text-center">
                    <UserPlus className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Nenhum subafiliado ainda.</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Quando seus indicados se tornarem afiliados, eles aparecerão aqui.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/20">
                    {subAffiliates.map(sub => (
                      <div key={sub.id}>
                        <button
                          onClick={() => setExpandedSub(expandedSub === sub.id ? null : sub.id)}
                          className="w-full p-3 sm:p-4 flex items-center justify-between hover:bg-surface-hover transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                              <Users className="h-4 w-4 text-blue-500" />
                            </div>
                            <div className="min-w-0 text-left">
                              <p className="text-xs sm:text-sm font-medium text-foreground truncate">{sub.profile?.display_name || "—"}</p>
                              <p className="text-[10px] text-muted-foreground truncate">{sub.profile?.email} • Código: <span className="text-primary font-mono">{sub.affiliate_code}</span></p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                            <div className="text-right hidden sm:block">
                              <p className="text-xs font-mono text-foreground">{sub.total_signups || 0} cadastros</p>
                              <p className="text-[10px] text-muted-foreground">{fmt(sub.total_earnings)}</p>
                            </div>
                            <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-semibold", sub.status === "active" ? "bg-green-500/15 text-green-600" : "bg-red-500/15 text-red-600")}>
                              {sub.status === "active" ? "Ativo" : "Inativo"}
                            </span>
                            {expandedSub === sub.id ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                          </div>
                        </button>

                        {expandedSub === sub.id && (
                          <div className="px-3 sm:px-4 pb-3 sm:pb-4 bg-secondary/30">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                              <div className="rounded-lg bg-card border border-border/30 p-2 text-center">
                                <p className="text-[10px] text-muted-foreground">Cadastros</p>
                                <p className="text-sm font-bold font-mono text-foreground">{sub.total_signups || 0}</p>
                              </div>
                              <div className="rounded-lg bg-card border border-border/30 p-2 text-center">
                                <p className="text-[10px] text-muted-foreground">Depósitos</p>
                                <p className="text-sm font-bold font-mono text-foreground">{fmt(sub.total_deposits)}</p>
                              </div>
                              <div className="rounded-lg bg-card border border-border/30 p-2 text-center">
                                <p className="text-[10px] text-muted-foreground">Comissões</p>
                                <p className="text-sm font-bold font-mono text-foreground">{fmt(sub.total_earnings)}</p>
                              </div>
                              <div className="rounded-lg bg-card border border-border/30 p-2 text-center">
                                <p className="text-[10px] text-muted-foreground">Indicados</p>
                                <p className="text-sm font-bold font-mono text-foreground">{sub.referrals?.length || 0}</p>
                              </div>
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                              Tipo: {sub.commission_type === "cpa" ? "CPA" : sub.commission_type === "hybrid" ? "Híbrido" : "RevShare"} •
                              Membro desde: {new Date(sub.created_at).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
