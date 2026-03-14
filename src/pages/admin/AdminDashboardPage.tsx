import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { useOutletContext } from "react-router-dom";
import { DollarSign, Users, ArrowDownToLine, ArrowUpFromLine, Activity, TrendingUp, Clock, UserPlus } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { cn } from "@/lib/utils";

type Stats = {
  totalUsers: number;
  totalDeposits: number;
  totalWithdrawals: number;
  activeToday: number;
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
    totalUsers: 0, totalDeposits: 0, totalWithdrawals: 0, activeToday: 0,
    pendingWithdrawals: 0, pendingKyc: 0, todayDeposits: 0, todayWithdrawals: 0, todaySignups: 0
  });
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [recentTx, setRecentTx] = useState<RecentTx[]>([]);
  const [dailyData, setDailyData] = useState<any[]>([]);

  useEffect(() => {
    loadAll();
    const channel = supabase.channel("admin-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => loadAll())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function loadAll() {
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
      supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(10),
      supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(20),
    ]);

    const sumAmount = (data: any[] | null) => data?.reduce((s, t) => s + Number(t.amount), 0) || 0;

    setStats({
      totalUsers: users || 0,
      totalDeposits: sumAmount(allDeps),
      totalWithdrawals: sumAmount(allWds),
      activeToday: todayUsers || 0,
      pendingWithdrawals: pendWds?.length || 0,
      pendingKyc: pendKyc || 0,
      todayDeposits: sumAmount(todayDeps),
      todayWithdrawals: sumAmount(todayWds),
      todaySignups: todayUsers || 0,
    });
    setRecentUsers((latestUsers as RecentUser[]) || []);
    setRecentTx((latestTx as RecentTx[]) || []);

    // Build daily chart from transactions
    const allTx = [...(allDeps || []), ...(allWds || [])];
    // Generate last 7 days
    const days: any[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({ date: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), depositos: 0, saques: 0 });
    }
    // We need full tx data with dates for chart
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
  }

  const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const cardClass = cn("rounded-xl p-4 border", light ? "bg-white border-gray-200 shadow-sm" : "bg-card border-border/40 card-shadow");
  const labelClass = cn("text-[10px] mt-0.5", light ? "text-gray-500" : "text-muted-foreground");
  const valueClass = cn("text-lg font-bold font-mono", light ? "text-gray-900" : "text-foreground");
  const sectionClass = cn("rounded-xl border", light ? "bg-white border-gray-200 shadow-sm" : "bg-card border-border/40 card-shadow");

  const cards = [
    { label: "Total Usuários", value: stats.totalUsers, icon: Users, color: "text-blue-500" },
    { label: "Cadastros Hoje", value: stats.todaySignups, icon: UserPlus, color: "text-green-500" },
    { label: "Depósitos (Total)", value: fmt(stats.totalDeposits), icon: ArrowDownToLine, color: "text-emerald-500" },
    { label: "Depósitos Hoje", value: fmt(stats.todayDeposits), icon: ArrowDownToLine, color: "text-teal-500" },
    { label: "Saques (Total)", value: fmt(stats.totalWithdrawals), icon: ArrowUpFromLine, color: "text-orange-500" },
    { label: "Saques Hoje", value: fmt(stats.todayWithdrawals), icon: ArrowUpFromLine, color: "text-amber-500" },
    { label: "GGR", value: fmt(stats.totalDeposits - stats.totalWithdrawals), icon: DollarSign, color: "text-purple-500" },
    { label: "Saques Pendentes", value: stats.pendingWithdrawals, icon: Clock, color: "text-red-500" },
    { label: "KYC Pendentes", value: stats.pendingKyc, icon: Activity, color: "text-yellow-500" },
    { label: "GGR Hoje", value: fmt(stats.todayDeposits - stats.todayWithdrawals), icon: TrendingUp, color: "text-indigo-500" },
  ];

  const pieData = [
    { name: "Depósitos", value: stats.totalDeposits, color: "#10b981" },
    { name: "Saques", value: stats.totalWithdrawals, color: "#f59e0b" },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {cards.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className={cardClass}>
            <div className="flex items-center justify-between mb-2">
              <c.icon className={cn("h-4 w-4", c.color)} />
            </div>
            <p className={valueClass}>{c.value}</p>
            <p className={labelClass}>{c.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Area Chart - Deposits vs Withdrawals */}
        <div className={cn(sectionClass, "col-span-2 p-6")}>
          <h2 className={cn("text-sm font-semibold mb-4", light ? "text-gray-900" : "text-foreground")}>Depósitos vs Saques (7 dias)</h2>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke={light ? "#e5e7eb" : "#333"} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: light ? "#6b7280" : "#888" }} />
              <YAxis tick={{ fontSize: 11, fill: light ? "#6b7280" : "#888" }} />
              <Tooltip contentStyle={{ backgroundColor: light ? "#fff" : "#1a1a2e", border: "none", borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="depositos" stroke="#10b981" fill="#10b981" fillOpacity={0.2} name="Depósitos" />
              <Area type="monotone" dataKey="saques" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} name="Saques" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className={cn(sectionClass, "p-6")}>
          <h2 className={cn("text-sm font-semibold mb-4", light ? "text-gray-900" : "text-foreground")}>Distribuição Financeira</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => fmt(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <div className={sectionClass}>
          <div className={cn("flex items-center justify-between p-4 border-b", light ? "border-gray-200" : "border-border/40")}>
            <h2 className={cn("text-sm font-semibold flex items-center gap-2", light ? "text-gray-900" : "text-foreground")}>
              <Users className="h-4 w-4 text-blue-500" /> Últimos Cadastros
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className={cn("border-b", light ? "border-gray-200 text-gray-500" : "border-border/40 text-muted-foreground")}>
                  <th className="text-left p-3 font-medium">Nome</th>
                  <th className="text-left p-3 font-medium">E-mail</th>
                  <th className="text-left p-3 font-medium">Saldo</th>
                  <th className="text-left p-3 font-medium">Data</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.map(u => (
                  <tr key={u.id} className={cn("border-b transition-colors", light ? "border-gray-100 hover:bg-gray-50" : "border-border/20 hover:bg-surface-hover")}>
                    <td className={cn("p-3 font-medium", light ? "text-gray-900" : "text-foreground")}>{u.display_name || "—"}</td>
                    <td className={cn("p-3", light ? "text-gray-500" : "text-muted-foreground")}>{u.email}</td>
                    <td className={cn("p-3 font-mono", light ? "text-gray-900" : "text-foreground")}>R$ {Number(u.balance).toFixed(2)}</td>
                    <td className={cn("p-3", light ? "text-gray-500" : "text-muted-foreground")}>{new Date(u.created_at).toLocaleString("pt-BR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {recentUsers.length === 0 && <p className={cn("p-6 text-center text-sm", light ? "text-gray-400" : "text-muted-foreground")}>Nenhum usuário.</p>}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className={sectionClass}>
          <div className={cn("flex items-center justify-between p-4 border-b", light ? "border-gray-200" : "border-border/40")}>
            <h2 className={cn("text-sm font-semibold flex items-center gap-2", light ? "text-gray-900" : "text-foreground")}>
              <DollarSign className="h-4 w-4 text-emerald-500" /> Últimas Transações
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className={cn("border-b", light ? "border-gray-200 text-gray-500" : "border-border/40 text-muted-foreground")}>
                  <th className="text-left p-3 font-medium">Tipo</th>
                  <th className="text-left p-3 font-medium">Valor</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Data</th>
                </tr>
              </thead>
              <tbody>
                {recentTx.map(t => (
                  <tr key={t.id} className={cn("border-b transition-colors", light ? "border-gray-100 hover:bg-gray-50" : "border-border/20 hover:bg-surface-hover")}>
                    <td className="p-3">
                      <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-semibold", t.type === "deposit" ? "bg-emerald-500/15 text-emerald-600" : "bg-orange-500/15 text-orange-600")}>
                        {t.type === "deposit" ? "Depósito" : "Saque"}
                      </span>
                    </td>
                    <td className={cn("p-3 font-mono", light ? "text-gray-900" : "text-foreground")}>R$ {Number(t.amount).toFixed(2)}</td>
                    <td className="p-3">
                      <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-semibold",
                        t.status === "completed" ? "bg-green-500/15 text-green-600" :
                        t.status === "failed" ? "bg-red-500/15 text-red-600" :
                        "bg-yellow-500/15 text-yellow-600"
                      )}>
                        {t.status}
                      </span>
                    </td>
                    <td className={cn("p-3", light ? "text-gray-500" : "text-muted-foreground")}>{new Date(t.created_at).toLocaleString("pt-BR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {recentTx.length === 0 && <p className={cn("p-6 text-center text-sm", light ? "text-gray-400" : "text-muted-foreground")}>Nenhuma transação.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
