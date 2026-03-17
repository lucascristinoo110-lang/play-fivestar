import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function AdminDepositsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: txData } = await supabase
      .from("transactions")
      .select("*")
      .eq("type", "deposit")
      .order("created_at", { ascending: false });

    if (!txData || txData.length === 0) { setTransactions([]); return; }

    const userIds = [...new Set(txData.map(t => t.user_id))];
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("user_id, display_name, email")
      .in("user_id", userIds);

    const profileMap = new Map((profilesData || []).map(p => [p.user_id, p]));
    setTransactions(txData.map(t => ({ ...t, profiles: profileMap.get(t.user_id) || null })));
  }

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-foreground">Depósitos</h2>
      <div className="rounded-xl bg-card border border-border/40 card-shadow overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/40 text-muted-foreground">
              <th className="text-left p-3 font-medium">Usuário</th>
              <th className="text-left p-3 font-medium">Valor</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-left p-3 font-medium">Data</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(t => (
              <tr key={t.id} className="border-b border-border/20 hover:bg-surface-hover transition-colors">
                <td className="p-3 text-foreground">{t.profiles?.display_name || "—"}</td>
                <td className="p-3 font-mono text-foreground">R$ {Number(t.amount).toFixed(2)}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${t.status === "completed" ? "bg-primary/15 text-primary" : t.status === "failed" ? "bg-destructive/15 text-destructive" : "bg-accent/15 text-accent"}`}>
                    {t.status}
                  </span>
                </td>
                <td className="p-3 text-muted-foreground">{new Date(t.created_at).toLocaleString("pt-BR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {transactions.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Nenhum depósito encontrado.</p>}
      </div>
    </div>
  );
}
