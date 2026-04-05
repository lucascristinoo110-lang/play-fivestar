import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function AdminDepositsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [approving, setApproving] = useState<string | null>(null);
  const [confirmTx, setConfirmTx] = useState<any>(null);

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

  async function approveDeposit(tx: any) {
    setApproving(tx.id);
    try {
      // 1. Update transaction status to completed
      const { error: updateError } = await supabase
        .from("transactions")
        .update({ status: "completed", metadata: { ...(tx.metadata || {}), manually_approved: true } })
        .eq("id", tx.id);

      if (updateError) throw updateError;

      // 2. Add balance to user via atomic RPC
      const { error: balanceError } = await supabase.rpc("adjust_balance", {
        p_user_id: tx.user_id,
        p_amount: Number(tx.amount),
      });

      if (balanceError) throw balanceError;

      toast({ title: `Depósito de R$ ${Number(tx.amount).toFixed(2)} aprovado com sucesso` });
      load();
    } catch (err: any) {
      toast({ title: "Erro ao aprovar depósito", description: err.message, variant: "destructive" });
    } finally {
      setApproving(null);
      setConfirmTx(null);
    }
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
              <th className="text-left p-3 font-medium">Ações</th>
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
                <td className="p-3">
                  {t.status === "pending" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1 text-primary hover:text-primary"
                      disabled={approving === t.id}
                      onClick={() => setConfirmTx(t)}
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      {approving === t.id ? "..." : "Aprovar"}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {transactions.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Nenhum depósito encontrado.</p>}
      </div>

      <AlertDialog open={!!confirmTx} onOpenChange={(open) => { if (!open) setConfirmTx(null); }}>
        <AlertDialogContent className="bg-card border-border/40">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Confirmar aprovação manual</AlertDialogTitle>
            <AlertDialogDescription>
              Aprovar depósito de <strong className="text-foreground">R$ {confirmTx ? Number(confirmTx.amount).toFixed(2) : ""}</strong> para <strong className="text-foreground">{confirmTx?.profiles?.display_name || "usuário"}</strong>? O saldo será adicionado imediatamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmTx && approveDeposit(confirmTx)}>
              Aprovar e creditar saldo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
