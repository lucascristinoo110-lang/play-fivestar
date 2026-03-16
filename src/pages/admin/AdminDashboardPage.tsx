import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { useOutletContext } from "react-router-dom";
import { DollarSign, Users, ArrowDownToLine, ArrowUpFromLine, Activity, TrendingUp, Clock, UserPlus, RefreshCw, Zap } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { cn } from "@/lib/utils";

type Stats = {
  totalUsers: number;
  totalDeposits: number;
  totalWithdrawals: number;
  pendingWithdrawals: number;
  pendingKyc: number;
  todayDeposits: number;
  todayWithdrawals: number;
  todaySignups: number;
};

type RecentUser = {
  id: string;
  display_name: string | null;
  email: string | null;
  balance: number;
  status: string;
  created_at: string;
};

type RecentTx = {
  id: string;
  type: string;
  amount: number;
  status: string;
  created_at: string;
  user_id: string;
};

export default function AdminDashboardPage() {
  const { light } = useOutletContext<{ light: boolean }>();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0, totalDeposits: 0, totalWithdrawals: 0,
    pendingWithdrawals: 0, pendingKyc: 0, todayDeposits: 0, todayWithdrawals: 0, todaySignups: 0
  });
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [recentTx, setRecentTx] = useState<RecentTx[]>([]);
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const loadAll = useCallback(async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const [
      { count: users },
      { data: allDeps },
      { data: allWds },
      { data: pendWds },
      { count: pendKyc },
      { data: todayDeps },
      { data: todayWds },
      { count: todayUsers },
      { data: latestUsers },
      { data: latestTx },
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("transactions").select("amount").eq("type", "deposit").eq("status", "completed"),
      supabase.from("transactions").select("amount").eq("type", "withdraw").eq("status", "completed"),
      supabase.from("transactions").select("id").eq("type", "withdraw").eq("status", "pending"),
      supabase.from("kyc_documents").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("transactions").select("amount").eq("type", "deposit").eq("status", "completed").gte("created_at", todayISO),
      supabase.from("transactions").select("amount").eq("type", "withdraw").eq("status", "completed").gte("created_at", todayISO),
      supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", todayISO),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(8),
      supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(15),
    ]);

    const sumAmount = (data: any[] | null) => data?.reduce((s, t) => s + Number(t.amount), 0) || 0;

    setStats({
      totalUsers: users || 0,
      totalDeposits: sumAmount(allDeps),
      totalWithdrawals: sumAmount(allWds),
      pendingWithdrawals: pendWds?.length || 0,
      pendingKyc: pendKyc || 0,
      todayDeposits: sumAmount(todayDeps),
      todayWithdrawals: sumAmount(todayWds),
      todaySignups: todayUsers || 0,
    });
    setRecentUsers((latestUsers as RecentUser[]) || []);
    setRecentTx((latestTx as RecentTx[]) || []);

    const days: any[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({ date: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), depositos: 0, saques: 0 });
    }
    const { data: chartTx } = await supabase.from("transactions").select("amount, type, status, created_at").eq("status", "completed").gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString());
    (chartTx || []).forEach(tx => {
      const txDate = new Date(tx.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      const day = days.find(d => d.date === txDate);
      if (day) {
        if (tx.type === "deposit") day.depositos += Number(tx.amount);
        else day.saques += Number(tx.amount);
      }
    });
    setDailyData(days);
    setLastUpdate(new Date());
  }, []);

  useEffect(() => {
    loadAll();
    const channel = supabase.channel("admin-dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "kyc_documents" }, () => loadAll())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadAll]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadAll();
    setTimeout(() => setRefreshing(false), 600);
  }

  const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  const ggr = stats.totalDeposits - stats.totalWithdrawals;
  const ggrToday = stats.todayDeposits - stats.todayWithdrawals;

  const cardBg = light
    ? "bg-white border-slate-200/60 shadow-sm shadow-slate-200/50"
    : "bg-[#111827]/60 border-white/[0.06] shadow-lg shadow-black/10";

  const sectionBg = light
    ? "bg-white border-slate-200/60 shadow-sm shadow-slate-200/50"
    : "bg-[#111827]/60 border-white/[0.06] shadow-lg shadow-black/10";

  const iconColor = (gradient: string) => {
    if (gradient.includes("blue")) return "#3b82f6";
    if (gradient.includes("cyan")) return "#06b6d4";
    if (gradient.includes("emerald")) return "#10b981";
    if (gradient.includes("teal")) return "#14b8a6";
    if (gradient.includes("orange")) return "#f97316";
    if (gradient.includes("amber")) return "#f59e0b";
    if (gradient.includes("purple")) return "#a855f7";
    if (gradient.includes("indigo")) return "#6366f1";
    if (gradient.includes("rose")) return "#f43f5e";
    if (gradient.includes("yellow")) return "#eab308";
    if (gradient.includes("red")) return "#ef4444";
    return "#10b981";
  };

  const cards = [
    { label: "Total Usuários", value: String(stats.totalUsers), icon: Users, gradient: "from-blue-500 to-blue-600", bg: light ? "bg-blue-50" : "bg-blue-500/10" },
    { label: "Cadastros Hoje", value: String(stats.todaySignups), icon: UserPlus, gradient: "from-cyan-500 to-cyan-600", bg: light ? "bg-cyan-50" : "bg-cyan-500/10" },
    { label: "Depósitos Total", value: fmt(stats.totalDeposits), icon: ArrowDownToLine, gradient: "from-emerald-500 to-emerald-600", bg: light ? "bg-emerald-50" : "bg-emerald-500/10" },
    { label: "Depósitos Hoje", value: fmt(stats.todayDeposits), icon: Zap, gradient: "from-teal-500 to-teal-600", bg: light ? "bg-teal-50" : "bg-teal-500/10" },
    { label: "Saques Total", value: fmt(stats.totalWithdrawals), icon: ArrowUpFromLine, gradient: "from-orange-500 to-orange-600", bg: light ? "bg-orange-50" : "bg-orange-500/10" },
    { label: "Saques Hoje", value: fmt(stats.todayWithdrawals), icon: ArrowUpFromLine, gradient: "from-amber-500 to-amber-600", bg: light ? "bg-amber-50" : "bg-amber-500/10" },
    { label: "GGR Total", value: fmt(ggr), icon: DollarSign, gradient: ggr >= 0 ? "from-purple-500 to-purple-600" : "from-red-500 to-red-600", bg: ggr >= 0 ? (light ? "bg-purple-50" : "bg-purple-500/10") : (light ? "bg-red-50" : "bg-red-500/10") },
    { label: "GGR Hoje", value: fmt(ggrToday), icon: TrendingUp, gradient: ggrToday >= 0 ? "from-indigo-500 to-indigo-600" : "from-red-500 to-red-600", bg: ggrToday >= 0 ? (light ? "bg-indigo-50" : "bg-indigo-500/10") : (light ? "bg-red-50" : "bg-red-500/10") },
    { label: "Saques Pendentes", value: String(stats.pendingWithdrawals), icon: Clock, gradient: "from-rose-500 to-rose-600", bg: light ? "bg-rose-50" : "bg-rose-500/10" },
    { label: "KYC Pendentes", value: String(stats.pendingKyc), icon: Activity, gradient: "from-yellow-500 to-yellow-600", bg: light ? "bg-yellow-50" : "bg-yellow-500/10" },
  ];

  const pieData = [
    { name: "Depósitos", value: stats.totalDeposits, color: "#10b981" },
    { name: "Saques", value: stats.totalWithdrawals, color: "#f59e0b" },
  ];

  const statusLabel = (s: string) => {
    if (s === "completed") return "Aprovado";
    if (s === "failed") return "Falhou";
    return "Pendente";
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={cn("text-xl font-bold tracking-tight", light ? "text-slate-800" : "text-white")}>Visão Geral</h2>
          <p className={cn("text-xs mt-0.5", light ? "text-slate-400" : "text-slate-500")}>
            Atualizado às {lastUpdate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} • Tempo real ativo
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all border",
            light
              ? "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm"
              : "bg-white/[0.04] border-white/[0.08] text-slate-300 hover:bg-white/[0.08]"
          )}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
          Atualizar
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {cards.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.4 }}
            className={cn("rounded-2xl p-4 border transition-all hover:scale-[1.02]", cardBg)}
          >
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center mb-3", c.bg)}>
              <c.icon className="h-[18px] w-[18px]" style={{ color: iconColor(c.gradient) }} />
            </div>
            <p className={cn("text-lg font-bold font-mono tracking-tight leading-none", light ? "text-slate-800" : "text-white")}>{c.value}</p>
            <p className={cn("text-[11px] font-medium mt-1.5", light ? "text-slate-400" : "text-slate-500")}>{c.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={cn("col-span-1 lg:col-span-2 rounded-2xl border p-5", sectionBg)}>
          <h3 className={cn("text-sm font-bold mb-4", light ? "text-slate-700" : "text-slate-200")}>Depósitos vs Saques — Últimos 7 dias</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={dailyData}>
              <defs>
                <linearGradient id="gradDep" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradSaq" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={light ? "#e2e8f0" : "#1e293b"} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: light ? "#94a3b8" : "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: light ? "#94a3b8" : "#64748b" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: light ? "#fff" : "#1e293b",
                  border: light ? "1px solid #e2e8f0" : "1px solid #334155",
                  borderRadius: 12,
                  fontSize: 12,
                  boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
                }}
                formatter={(v: number) => fmt(v)}
              />
              <Area type="monotone" dataKey="depositos" stroke="#10b981" strokeWidth={2.5} fill="url(#gradDep)" name="Depósitos" />
              <Area type="monotone" dataKey="saques" stroke="#f59e0b" strokeWidth={2.5} fill="url(#gradSaq)" name="Saques" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className={cn("rounded-2xl border p-5", sectionBg)}>
          <h3 className={cn("text-sm font-bold mb-4", light ? "text-slate-700" : "text-slate-200")}>Distribuição</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" strokeWidth={0}>
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ backgroundColor: light ? "#fff" : "#1e293b", border: "none", borderRadius: 12, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2">
            {pieData.map(p => (
              <div key={p.name} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                <span className={cn("text-[11px] font-medium", light ? "text-slate-500" : "text-slate-400")}>{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Users */}
        <div className={cn("rounded-2xl border overflow-hidden", sectionBg)}>
          <div className={cn("flex items-center gap-2 px-5 py-4 border-b", light ? "border-slate-100" : "border-white/[0.06]")}>
            <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", light ? "bg-blue-50" : "bg-blue-500/10")}>
              <Users className="h-3.5 w-3.5 text-blue-500" />
            </div>
            <h3 className={cn("text-sm font-bold", light ? "text-slate-700" : "text-slate-200")}>Últimos Cadastros</h3>
          </div>
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full">
              <thead>
                <tr className={cn("text-[11px] font-semibold uppercase tracking-wide", light ? "text-slate-400 bg-slate-50/50" : "text-slate-500 bg-white/[0.02]")}>
                  <th className="text-left px-5 py-3">Nome</th>
                  <th className="text-left px-5 py-3">E-mail</th>
                  <th className="text-right px-5 py-3">Saldo</th>
                  <th className="text-right px-5 py-3">Data</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.map(u => (
                  <tr key={u.id} className={cn("border-t transition-colors", light ? "border-slate-100 hover:bg-slate-50/70" : "border-white/[0.04] hover:bg-white/[0.02]")}>
                    <td className={cn("px-5 py-3 text-[13px] font-semibold", light ? "text-slate-700" : "text-slate-200")}>{u.display_name || "—"}</td>
                    <td className={cn("px-5 py-3 text-[12px]", light ? "text-slate-400" : "text-slate-500")}>{u.email}</td>
                    <td className={cn("px-5 py-3 text-[13px] font-mono font-semibold text-right", light ? "text-slate-700" : "text-emerald-400")}>R$ {Number(u.balance).toFixed(2)}</td>
                    <td className={cn("px-5 py-3 text-[11px] text-right whitespace-nowrap", light ? "text-slate-400" : "text-slate-500")}>{new Date(u.created_at).toLocaleString("pt-BR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {recentUsers.length === 0 && <p className={cn("p-8 text-center text-sm", light ? "text-slate-300" : "text-slate-600")}>Nenhum usuário.</p>}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className={cn("rounded-2xl border overflow-hidden", sectionBg)}>
          <div className={cn("flex items-center gap-2 px-5 py-4 border-b", light ? "border-slate-100" : "border-white/[0.06]")}>
            <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", light ? "bg-emerald-50" : "bg-emerald-500/10")}>
              <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <h3 className={cn("text-sm font-bold", light ? "text-slate-700" : "text-slate-200")}>Últimas Transações</h3>
          </div>
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full">
              <thead>
                <tr className={cn("text-[11px] font-semibold uppercase tracking-wide", light ? "text-slate-400 bg-slate-50/50" : "text-slate-500 bg-white/[0.02]")}>
                  <th className="text-left px-5 py-3">Tipo</th>
                  <th className="text-right px-5 py-3">Valor</th>
                  <th className="text-center px-5 py-3">Status</th>
                  <th className="text-right px-5 py-3">Data</th>
                </tr>
              </thead>
              <tbody>
                {recentTx.map(t => (
                  <tr key={t.id} className={cn("border-t transition-colors", light ? "border-slate-100 hover:bg-slate-50/70" : "border-white/[0.04] hover:bg-white/[0.02]")}>
                    <td className="px-5 py-3">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold",
                        t.type === "deposit"
                          ? light ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : light ? "bg-orange-50 text-orange-700 border border-orange-200" : "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                      )}>
                        {t.type === "deposit" ? "Depósito" : "Saque"}
                      </span>
                    </td>
                    <td className={cn("px-5 py-3 text-[13px] font-mono font-semibold text-right", light ? "text-slate-700" : "text-white")}>R$ {Number(t.amount).toFixed(2)}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold",
                        t.status === "completed"
                          ? light ? "bg-green-50 text-green-700 border border-green-200" : "bg-green-500/10 text-green-400 border border-green-500/20"
                          : t.status === "failed"
                            ? light ? "bg-red-50 text-red-700 border border-red-200" : "bg-red-500/10 text-red-400 border border-red-500/20"
                            : light ? "bg-yellow-50 text-yellow-700 border border-yellow-200" : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                      )}>
                        {statusLabel(t.status)}
                      </span>
                    </td>
                    <td className={cn("px-5 py-3 text-[11px] text-right whitespace-nowrap", light ? "text-slate-400" : "text-slate-500")}>{new Date(t.created_at).toLocaleString("pt-BR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {recentTx.length === 0 && <p className={cn("p-8 text-center text-sm", light ? "text-slate-300" : "text-slate-600")}>Nenhuma transação.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
