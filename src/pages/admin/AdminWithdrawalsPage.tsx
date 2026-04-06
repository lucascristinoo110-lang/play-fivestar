import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Copy } from "lucide-react";

export default function AdminWithdrawalsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: txData } = await supabase
      .from("transactions")
      .select("*")
      .eq("type", "withdraw")
      .order("created_at", { ascending: false });

    if (!txData || txData.length === 0) {
      setTransactions([]);
      return;
    }

    const userIds = [...new Set(txData.map(t => t.user_id))];
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("user_id, display_name, email, kyc_verified")
      .in("user_id", userIds);

    const profileMap = new Map((profilesData || []).map(p => [p.user_id, p]));

    const merged = txData.map(t => ({
      ...t,
      profiles: profileMap.get(t.user_id) || null,
    }));

    setTransactions(merged);
  }

  async function updateStatus(id: string, status: string) {
    try {
      const { data: tx, error: txError } = await supabase
        .from("transactions")
        .select("id, user_id, amount, status")
        .eq("id", id)
        .single();

      if (txError || !tx) throw txError || new Error("Transação não encontrada");

      // If rejecting, refund the balance back to the user
      if (status === "failed" && tx.status === "pending") {
        const { error: refundError } = await supabase.rpc("adjust_balance", {
          p_user_id: tx.user_id,
          p_amount: Number(tx.amount),
        });
        if (refundError) throw refundError;
      }

      // If approving, balance was already debited at request time — just update status
      const { error } = await supabase.from("transactions").update({ status }).eq("id", id);
      if (error) throw error;

      toast({ title: `Saque ${status === "completed" ? "aprovado" : "rejeitado"}` });
      load();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  }

  function getPixKey(t: any): string {
    const meta = t.metadata as any;
    return meta?.pix_key || "—";
  }

  function copyPixKey(key: string) {
    navigator.clipboard.writeText(key);
    toast({ title: "Chave PIX copiada!" });
  }

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-foreground">Saques</h2>
      <div className="rounded-xl bg-card border border-border/40 card-shadow overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/40 text-muted-foreground">
              <th className="text-left p-3 font-medium">Usuário</th>
              <th className="text-left p-3 font-medium">Valor</th>
              <th className="text-left p-3 font-medium">Chave PIX</th>
              <th className="text-left p-3 font-medium">KYC</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-left p-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(t => {
              const pixKey = getPixKey(t);
              return (
                <tr key={t.id} className="border-b border-border/20 hover:bg-surface-hover transition-colors">
                  <td className="p-3 text-foreground">{(t as any).profiles?.display_name || "—"}</td>
                  <td className="p-3 font-mono text-foreground">R$ {Number(t.amount).toFixed(2)}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-foreground truncate max-w-[160px]" title={pixKey}>{pixKey}</span>
                      {pixKey !== "—" && (
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => copyPixKey(pixKey)}>
                          <Copy className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={`text-[10px] font-semibold ${(t as any).profiles?.kyc_verified ? "text-primary" : "text-destructive"}`}>
                      {(t as any).profiles?.kyc_verified ? "Verificado" : "Pendente"}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${t.status === "completed" ? "bg-primary/15 text-primary" : t.status === "failed" ? "bg-destructive/15 text-destructive" : "bg-accent/15 text-accent"}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="p-3 flex gap-1">
                    {t.status === "pending" && (
                      <>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => updateStatus(t.id, "completed")}>
                          <CheckCircle className="h-3 w-3 text-primary" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => updateStatus(t.id, "failed")}>
                          <XCircle className="h-3 w-3 text-destructive" />
                        </Button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {transactions.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Nenhum saque encontrado.</p>}
      </div>
    </div>
  );
}
