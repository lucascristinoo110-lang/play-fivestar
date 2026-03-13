import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { DollarSign, Users, ArrowDownToLine, ArrowUpFromLine, Activity } from "lucide-react";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({ totalUsers: 0, totalDeposits: 0, totalWithdrawals: 0, activeToday: 0 });

  useEffect(() => {
    async function load() {
      const [{ count: users }, { data: deps }, { data: wds }] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("transactions").select("amount").eq("type", "deposit").eq("status", "completed"),
        supabase.from("transactions").select("amount").eq("type", "withdraw").eq("status", "completed"),
      ]);
      setStats({
        totalUsers: users || 0,
        totalDeposits: deps?.reduce((s, t) => s + Number(t.amount), 0) || 0,
        totalWithdrawals: wds?.reduce((s, t) => s + Number(t.amount), 0) || 0,
        activeToday: users || 0,
      });
    }
    load();
  }, []);

  const cards = [
    { label: "Total Usuários", value: stats.totalUsers, icon: Users },
    { label: "Depósitos (Total)", value: `R$ ${stats.totalDeposits.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, icon: ArrowDownToLine },
    { label: "Saques (Total)", value: `R$ ${stats.totalWithdrawals.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, icon: ArrowUpFromLine },
    { label: "GGR", value: `R$ ${(stats.totalDeposits - stats.totalWithdrawals).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, icon: DollarSign },
    { label: "Jogadores Ativos", value: stats.activeToday, icon: Activity },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {cards.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-xl bg-card border border-border/40 p-4 card-shadow">
            <div className="flex items-center justify-between mb-2">
              <c.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-lg font-bold font-mono text-foreground">{c.value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{c.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="rounded-xl bg-card border border-border/40 p-6 card-shadow">
        <h2 className="text-sm font-semibold text-foreground mb-4">Últimas Transações</h2>
        <p className="text-sm text-muted-foreground">Os dados aparecerão conforme os jogadores fizerem depósitos e saques.</p>
      </div>
    </div>
  );
}
