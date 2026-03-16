import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Search, Ban, CheckCircle, DollarSign, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useOutletContext } from "react-router-dom";
import { cn } from "@/lib/utils";
import UserDetailPanel from "@/components/admin/UserDetailPanel";

export default function AdminUsersPage() {
  const { light } = useOutletContext<{ light: boolean }>();
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [addBalanceUser, setAddBalanceUser] = useState<any>(null);
  const [balanceAmount, setBalanceAmount] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);

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
    (u.email || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.cpf || "").includes(search) ||
    (u.phone || "").includes(search)
  );

  function openWhatsApp(phone: string, name: string) {
    // Clean phone: remove non-digits
    let clean = phone.replace(/\D/g, "");
    // Add Brazil country code if not present
    if (clean.length <= 11 && !clean.startsWith("55")) clean = "55" + clean;
    const msg = encodeURIComponent(`Olá ${name || ""}! Tudo bem?`);
    window.open(`https://wa.me/${clean}?text=${msg}`, "_blank");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome, e-mail ou CPF..." value={search} onChange={e => setSearch(e.target.value)} className={cn("pl-10", light ? "bg-white border-slate-200" : "bg-secondary border-border/40")} />
        </div>
        <span className={cn("text-xs font-medium", light ? "text-slate-400" : "text-slate-500")}>
          {filtered.length} usuário{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className={cn("rounded-xl border overflow-hidden", light ? "bg-white border-slate-200 shadow-sm" : "bg-card border-border/40 card-shadow")}>
        <table className="w-full text-xs">
          <thead>
            <tr className={cn("border-b", light ? "border-slate-100 text-slate-400" : "border-border/40 text-muted-foreground")}>
              <th className="text-left p-3 font-medium">Nome</th>
              <th className="text-left p-3 font-medium hidden sm:table-cell">E-mail</th>
              <th className="text-left p-3 font-medium">Saldo</th>
              <th className="text-left p-3 font-medium hidden md:table-cell">Status</th>
              <th className="text-left p-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr
                key={u.id}
                className={cn(
                  "border-b cursor-pointer transition-colors",
                  light ? "border-slate-50 hover:bg-blue-50/50" : "border-border/20 hover:bg-white/[0.02]"
                )}
                onClick={() => setSelectedUser(u)}
              >
                <td className={cn("p-3 font-medium", light ? "text-slate-800" : "text-foreground")}>{u.display_name || "—"}</td>
                <td className={cn("p-3 hidden sm:table-cell", light ? "text-slate-500" : "text-muted-foreground")}>{u.email}</td>
                <td className={cn("p-3 font-mono", light ? "text-slate-800" : "text-foreground")}>R$ {Number(u.balance).toFixed(2)}</td>
                <td className="p-3 hidden md:table-cell">
                  <span className={cn(
                    "px-2 py-0.5 rounded-md text-[10px] font-semibold",
                    u.status === "active" ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-400"
                  )}>
                    {u.status === "active" ? "Ativo" : "Bloqueado"}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setSelectedUser(u)} title="Ver detalhes">
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => toggleStatus(u)} title={u.status === "active" ? "Bloquear" : "Ativar"}>
                      {u.status === "active" ? <Ban className="h-3 w-3 text-destructive" /> : <CheckCircle className="h-3 w-3 text-primary" />}
                    </Button>
                    <Dialog open={addBalanceUser?.id === u.id} onOpenChange={open => { if (!open) setAddBalanceUser(null); }}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setAddBalanceUser(u)} title="Adicionar saldo">
                          <DollarSign className="h-3 w-3 text-primary" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className={cn("border", light ? "bg-white border-slate-200" : "bg-card border-border/40")}>
                        <DialogHeader>
                          <DialogTitle className={light ? "text-slate-800" : "text-foreground"}>Adicionar saldo - {u.display_name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Valor (R$)</Label>
                            <Input type="number" value={balanceAmount} onChange={e => setBalanceAmount(e.target.value)} placeholder="100.00" className={light ? "bg-slate-50 border-slate-200" : "bg-secondary border-border/40"} />
                          </div>
                          <Button onClick={addBalance} className="w-full">Adicionar</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className={cn("p-6 text-center text-sm", light ? "text-slate-400" : "text-muted-foreground")}>Nenhum usuário encontrado.</p>}
      </div>

      <UserDetailPanel
        user={selectedUser}
        open={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        light={light}
      />
    </div>
  );
}
