import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useOutletContext } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Search, UserPlus, Percent, DollarSign, Users, TrendingUp, Wallet, Check, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function AdminAffiliatesPage() {
  const { light } = useOutletContext<{ light: boolean }>();
  const [affiliates, setAffiliates] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showPayout, setShowPayout] = useState<any | null>(null);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [email, setEmail] = useState("");
  const [commType, setCommType] = useState("revshare");
  const [cpa, setCpa] = useState("50");
  const [rev, setRev] = useState("30");
  const [baseline, setBaseline] = useState("50");
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from("affiliates").select("*").order("created_at", { ascending: false });
    if (data) {
      const userIds = data.map(a => a.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, email").in("user_id", userIds);
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));
      setAffiliates(data.map(a => ({ ...a, profile: profileMap[a.user_id] || {} })));
    }
  }

  function generateCode() {
    const chars = "abcdefghjkmnpqrstuvwxyz23456789";
    let result = "";
    for (let i = 0; i < 6; i++) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
  }

  async function addAffiliate() {
    if (!email) return;
    setSaving(true);
    const { data: profile } = await supabase.from("profiles").select("user_id").eq("email", email.trim()).single();
    if (!profile) {
      toast({ title: "Usuário não encontrado com esse e-mail", variant: "destructive" });
      setSaving(false);
      return;
    }
    const autoCode = generateCode();
    const { error } = await supabase.from("affiliates").insert({
      user_id: profile.user_id,
      affiliate_code: autoCode,
      commission_type: commType,
      commission_cpa: parseFloat(cpa) || 0,
      commission_revshare: parseFloat(rev) || 0,
      baseline: parseFloat(baseline) || 0,
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Afiliado adicionado!", description: `Código: ${autoCode}` });
      setShowAdd(false);
      setEmail("");
      load();
    }
    setSaving(false);
  }

  async function toggleStatus(aff: any) {
    const newStatus = aff.status === "active" ? "inactive" : "active";
    await supabase.from("affiliates").update({ status: newStatus }).eq("id", aff.id);
    toast({ title: `Afiliado ${newStatus === "active" ? "ativado" : "desativado"}` });
    load();
  }

  async function approvePayout(aff: any) {
    const amount = parseFloat(payoutAmount);
    if (!amount || amount <= 0) {
      toast({ title: "Valor inválido", variant: "destructive" });
      return;
    }
    
    const currentBalance = Number(aff.balance || 0);
    if (amount > currentBalance) {
      toast({ title: "Valor maior que o saldo disponível", description: `Saldo: R$ ${currentBalance.toFixed(2)}`, variant: "destructive" });
      return;
    }

    setSaving(true);

    // 1. Debit from affiliate balance
    const newAffBalance = currentBalance - amount;
    const { error: affError } = await supabase
      .from("affiliates")
      .update({ balance: newAffBalance, updated_at: new Date().toISOString() })
      .eq("id", aff.id);

    if (affError) {
      toast({ title: "Erro ao debitar afiliado", description: affError.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    // 2. Credit to player wallet
    const { error: walletError } = await supabase.rpc("adjust_balance", {
      p_user_id: aff.user_id,
      p_amount: amount,
    });

    if (walletError) {
      // Rollback affiliate balance
      await supabase.from("affiliates").update({ balance: currentBalance }).eq("id", aff.id);
      toast({ title: "Erro ao creditar carteira", description: walletError.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    // 3. Record transaction
    await supabase.from("transactions").insert({
      user_id: aff.user_id,
      type: "affiliate_payout",
      amount,
      status: "completed",
      payment_method: "affiliate",
      metadata: { affiliate_id: aff.id, affiliate_code: aff.affiliate_code },
    });

    toast({ title: "Pagamento aprovado!", description: `R$ ${amount.toFixed(2)} creditado na carteira do afiliado.` });
    setShowPayout(null);
    setPayoutAmount("");
    setSaving(false);
    load();
  }

  const filtered = affiliates.filter(a =>
    (a.profile?.display_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (a.profile?.email || "").toLowerCase().includes(search.toLowerCase()) ||
    (a.affiliate_code || "").toLowerCase().includes(search.toLowerCase())
  );

  const fmt = (v: number) => `R$ ${Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  const cardClass = cn("rounded-xl p-4 border", light ? "bg-white border-gray-200 shadow-sm" : "bg-card border-border/40 card-shadow");
  const sectionClass = cn("rounded-xl border overflow-hidden", light ? "bg-white border-gray-200 shadow-sm" : "bg-card border-border/40 card-shadow");
  const inputClass = cn("h-9 text-sm", light ? "bg-gray-50 border-gray-200" : "bg-secondary border-border/40");

  const totals = affiliates.reduce((acc, a) => ({
    signups: acc.signups + (a.total_signups || 0),
    deposits: acc.deposits + Number(a.total_deposits || 0),
    earnings: acc.earnings + Number(a.total_earnings || 0),
  }), { signups: 0, deposits: 0, earnings: 0 });

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Afiliados", value: affiliates.length, icon: Users, color: "text-blue-500" },
          { label: "Cadastros via Afiliados", value: totals.signups, icon: UserPlus, color: "text-green-500" },
          { label: "Depósitos Indicados", value: fmt(totals.deposits), icon: DollarSign, color: "text-emerald-500" },
          { label: "Comissões Totais", value: fmt(totals.earnings), icon: TrendingUp, color: "text-purple-500" },
        ].map((c) => (
          <div key={c.label} className={cardClass}>
            <c.icon className={cn("h-4 w-4 mb-2", c.color)} />
            <p className={cn("text-lg font-bold font-mono", light ? "text-gray-900" : "text-foreground")}>{c.value}</p>
            <p className={cn("text-[10px]", light ? "text-gray-500" : "text-muted-foreground")}>{c.label}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar afiliados..." value={search} onChange={e => setSearch(e.target.value)} className={cn("pl-10", inputClass)} />
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)} className="bg-primary text-primary-foreground text-xs h-9">
          <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Adicionar Afiliado
        </Button>
      </div>

      {/* Table */}
      <div className={sectionClass}>
        <table className="w-full text-xs">
          <thead>
            <tr className={cn("border-b", light ? "border-gray-200 text-gray-500" : "border-border/40 text-muted-foreground")}>
              <th className="text-left p-3 font-medium">Afiliado</th>
              <th className="text-left p-3 font-medium">Código</th>
              <th className="text-left p-3 font-medium">Tipo</th>
              <th className="text-left p-3 font-medium">Baseline</th>
              <th className="text-left p-3 font-medium">CPA / Rev%</th>
              <th className="text-left p-3 font-medium">Cadastros</th>
              <th className="text-left p-3 font-medium">Ganhos</th>
              <th className="text-left p-3 font-medium">Saldo</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-left p-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(a => {
              const balance = Number(a.balance || 0);
              return (
                <tr key={a.id} className={cn("border-b transition-colors", light ? "border-gray-100 hover:bg-gray-50" : "border-border/20 hover:bg-surface-hover")}>
                  <td className={cn("p-3 font-medium", light ? "text-gray-900" : "text-foreground")}>
                    <div>{a.profile?.display_name || "—"}</div>
                    <div className={cn("text-[10px]", light ? "text-gray-400" : "text-muted-foreground")}>{a.profile?.email}</div>
                  </td>
                  <td className="p-3"><span className="font-mono text-primary">{a.affiliate_code}</span></td>
                  <td className="p-3">
                    <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-semibold", a.commission_type === "cpa" ? "bg-blue-500/15 text-blue-600" : a.commission_type === "hybrid" ? "bg-purple-500/15 text-purple-600" : "bg-emerald-500/15 text-emerald-600")}>
                      {a.commission_type === "cpa" ? "CPA" : a.commission_type === "hybrid" ? "Híbrido" : "RevShare"}
                    </span>
                  </td>
                  <td className={cn("p-3 font-mono", light ? "text-gray-900" : "text-foreground")}>
                    R${Number(a.commission_cpa).toFixed(0)} / {Number(a.commission_revshare).toFixed(0)}%
                  </td>
                  <td className={cn("p-3 font-mono", light ? "text-gray-900" : "text-foreground")}>{a.total_signups || 0}</td>
                  <td className={cn("p-3 font-mono", light ? "text-gray-900" : "text-foreground")}>{fmt(a.total_earnings)}</td>
                  <td className="p-3">
                    <span className={cn("font-mono font-bold", balance >= 0 ? "text-emerald-500" : "text-red-500")}>
                      {balance < 0 ? `-R$ ${Math.abs(balance).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : fmt(balance)}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-semibold", a.status === "active" ? "bg-green-500/15 text-green-600" : "bg-red-500/15 text-red-600")}>
                      {a.status === "active" ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="p-3 flex gap-1">
                    {balance > 0 && (
                      <Button size="sm" variant="ghost" className="h-7 text-[10px] px-2 text-emerald-600" onClick={() => { setShowPayout(a); setPayoutAmount(balance.toFixed(2)); }}>
                        <Wallet className="h-3 w-3 mr-1" /> Pagar
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="h-7 text-[10px] px-2" onClick={() => toggleStatus(a)}>
                      {a.status === "active" ? "Desativar" : "Ativar"}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <p className={cn("p-6 text-center text-sm", light ? "text-gray-400" : "text-muted-foreground")}>Nenhum afiliado.</p>}
      </div>

      {/* Add Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className={cn("max-w-md", light ? "bg-white" : "bg-card border-border/40")}>
          <DialogHeader>
            <DialogTitle className={light ? "text-gray-900" : "text-foreground"}>Novo Afiliado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs">E-mail do usuário</Label>
              <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemplo.com" className={inputClass} />
            </div>
            <p className={cn("text-[11px]", light ? "text-gray-400" : "text-muted-foreground")}>
              O código do afiliado será gerado automaticamente.
            </p>
            <div className="space-y-1">
              <Label className="text-xs">Tipo de comissão</Label>
              <select value={commType} onChange={e => setCommType(e.target.value)} className={cn("w-full h-9 rounded-md px-3 text-sm border", light ? "bg-gray-50 border-gray-200" : "bg-secondary border-border/40 text-foreground")}>
                <option value="revshare">RevShare</option>
                <option value="cpa">CPA</option>
                <option value="hybrid">Híbrido (CPA + RevShare)</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">CPA (R$)</Label>
                <Input type="number" value={cpa} onChange={e => setCpa(e.target.value)} className={inputClass} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">RevShare (%)</Label>
                <Input type="number" value={rev} onChange={e => setRev(e.target.value)} className={inputClass} />
              </div>
            </div>
            {(commType === "cpa" || commType === "hybrid") && (
              <div className="space-y-1">
                <Label className="text-xs">Baseline (R$) — depósito mínimo para ativar CPA</Label>
                <Input type="number" value={baseline} onChange={e => setBaseline(e.target.value)} className={inputClass} />
              </div>
            )}
            <Button onClick={addAffiliate} disabled={saving} className="w-full bg-primary text-primary-foreground text-sm">
              {saving ? "Salvando..." : "Adicionar Afiliado"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payout Dialog */}
      <Dialog open={!!showPayout} onOpenChange={(o) => { if (!o) setShowPayout(null); }}>
        <DialogContent className={cn("max-w-sm", light ? "bg-white" : "bg-card border-border/40")}>
          <DialogHeader>
            <DialogTitle className={light ? "text-gray-900" : "text-foreground"}>Aprovar Pagamento</DialogTitle>
          </DialogHeader>
          {showPayout && (
            <div className="space-y-4">
              <div className={cn("rounded-lg p-3 text-sm", light ? "bg-gray-50" : "bg-secondary/50")}>
                <p className={cn("font-medium", light ? "text-gray-900" : "text-foreground")}>{showPayout.profile?.display_name || "—"}</p>
                <p className={cn("text-xs", light ? "text-gray-500" : "text-muted-foreground")}>{showPayout.profile?.email}</p>
                <p className="mt-2 font-mono text-emerald-500 font-bold">Saldo: {fmt(showPayout.balance)}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Valor a transferir para carteira de jogo</Label>
                <Input type="number" step="0.01" value={payoutAmount} onChange={e => setPayoutAmount(e.target.value)} className={inputClass} />
              </div>
              <p className={cn("text-[11px]", light ? "text-gray-400" : "text-muted-foreground")}>
                O valor será debitado do saldo do afiliado e creditado na carteira de jogo dele.
              </p>
              <div className="flex gap-2">
                <Button onClick={() => approvePayout(showPayout)} disabled={saving} className="flex-1 bg-emerald-600 text-white text-sm hover:bg-emerald-700">
                  <Check className="h-3.5 w-3.5 mr-1.5" /> {saving ? "Processando..." : "Aprovar Pagamento"}
                </Button>
                <Button variant="outline" onClick={() => setShowPayout(null)} className="text-sm">
                  <X className="h-3.5 w-3.5 mr-1.5" /> Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
