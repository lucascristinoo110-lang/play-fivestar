import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Search, Ban, CheckCircle, DollarSign } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [addBalanceUser, setAddBalanceUser] = useState<any>(null);
  const [balanceAmount, setBalanceAmount] = useState("");

  useEffect(() => { fetchUsers(); }, []);

  async function fetchUsers() {
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    setUsers(data || []);
  }

  async function toggleStatus(user: any) {
    const newStatus = user.status === "active" ? "blocked" : "active";
    await supabase.from("profiles").update({ status: newStatus }).eq("id", user.id);
    toast({ title: `Usuário ${newStatus === "active" ? "ativado" : "bloqueado"}` });
    fetchUsers();
  }

  async function addBalance() {
    if (!addBalanceUser || !balanceAmount) return;
    const amount = parseFloat(balanceAmount);
    if (isNaN(amount) || amount <= 0) { toast({ title: "Valor inválido", variant: "destructive" }); return; }
    const newBalance = Number(addBalanceUser.balance) + amount;
    await supabase.from("profiles").update({ balance: newBalance }).eq("id", addBalanceUser.id);
    toast({ title: `R$ ${amount.toFixed(2)} adicionado ao saldo` });
    setAddBalanceUser(null);
    setBalanceAmount("");
    fetchUsers();
  }

  const filtered = users.filter(u =>
    (u.display_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar usuários..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-secondary border-border/40" />
        </div>
      </div>

      <div className="rounded-xl bg-card border border-border/40 card-shadow overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/40 text-muted-foreground">
              <th className="text-left p-3 font-medium">Nome</th>
              <th className="text-left p-3 font-medium">E-mail</th>
              <th className="text-left p-3 font-medium">Saldo</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-left p-3 font-medium">KYC</th>
              <th className="text-left p-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id} className="border-b border-border/20 hover:bg-surface-hover transition-colors">
                <td className="p-3 font-medium text-foreground">{u.display_name || "—"}</td>
                <td className="p-3 text-muted-foreground">{u.email}</td>
                <td className="p-3 font-mono text-foreground">R$ {Number(u.balance).toFixed(2)}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${u.status === "active" ? "bg-primary/15 text-primary" : u.status === "blocked" ? "bg-destructive/15 text-destructive" : "bg-accent/15 text-accent"}`}>
                    {u.status === "active" ? "Ativo" : u.status === "blocked" ? "Bloqueado" : "Pendente"}
                  </span>
                </td>
                <td className="p-3">
                  <span className={`text-[10px] font-semibold ${u.kyc_verified ? "text-primary" : "text-muted-foreground"}`}>
                    {u.kyc_verified ? "Verificado" : "Pendente"}
                  </span>
                </td>
                <td className="p-3 flex gap-1">
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => toggleStatus(u)} title={u.status === "active" ? "Bloquear" : "Ativar"}>
                    {u.status === "active" ? <Ban className="h-3 w-3 text-destructive" /> : <CheckCircle className="h-3 w-3 text-primary" />}
                  </Button>
                  <Dialog open={addBalanceUser?.id === u.id} onOpenChange={open => { if (!open) setAddBalanceUser(null); }}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setAddBalanceUser(u)} title="Adicionar saldo">
                        <DollarSign className="h-3 w-3 text-primary" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-card border-border/40">
                      <DialogHeader>
                        <DialogTitle className="text-foreground">Adicionar saldo - {u.display_name}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Valor (R$)</Label>
                          <Input type="number" value={balanceAmount} onChange={e => setBalanceAmount(e.target.value)} placeholder="100.00" className="bg-secondary border-border/40" />
                        </div>
                        <Button onClick={addBalance} className="w-full bg-primary text-primary-foreground">Adicionar</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Nenhum usuário encontrado.</p>}
      </div>
    </div>
  );
}
