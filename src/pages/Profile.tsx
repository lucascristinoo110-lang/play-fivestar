import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CasinoSidebar } from "@/components/casino/CasinoSidebar";
import { TopBar } from "@/components/casino/TopBar";
import { BottomNavBar } from "@/components/casino/BottomNavBar";
import { DepositModal } from "@/components/casino/DepositModal";
import { AuthOverlayModal, type AuthMode } from "@/components/casino/AuthOverlayModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { User, Shield, Upload, Wallet, ArrowDownToLine, ArrowUpFromLine, History, FileText, CheckCircle, Clock, XCircle } from "lucide-react";
import { Navigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

type Transaction = {
  id: string;
  type: string;
  amount: number;
  status: string;
  created_at: string;
};

type KycDoc = {
  id: string;
  document_type: string;
  status: string;
  created_at: string;
  rejection_reason: string | null;
};

export default function Profile() {
  const { user, profile, loading: authLoading } = useAuth();
  const isMobile = useIsMobile();
  const [tab, setTab] = useState<"overview" | "kyc" | "history">("overview");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [kycDocs, setKycDocs] = useState<KycDoc[]>([]);
  const [depositOpen, setDepositOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState<"rg" | "cnh">("rg");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawPixKey, setWithdrawPixKey] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);

  async function loadUserData(userId: string) {
    const [{ data: tx }, { data: docs }] = await Promise.all([
      supabase.from("transactions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
      supabase.from("kyc_documents").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    ]);

    setTransactions((tx as Transaction[]) || []);
    setKycDocs((docs as KycDoc[]) || []);
  }

  useEffect(() => {
    if (!user) return;
    loadUserData(user.id);
  }, [user]);

  if (authLoading) return null;
  if (!user) return <Navigate to="/login" />;

  const totalDeposits = transactions.filter(t => t.type === "deposit" && t.status === "completed").reduce((s, t) => s + Number(t.amount), 0);
  const totalWithdrawals = transactions.filter(t => t.type === "withdraw" && t.status === "completed").reduce((s, t) => s + Number(t.amount), 0);
  const pendingWithdrawals = transactions
    .filter(t => t.type === "withdraw" && t.status === "pending")
    .reduce((s, t) => s + Number(t.amount), 0);
  const balance = Number(profile?.balance ?? 0);
  const availableToWithdraw = Math.max(0, balance - pendingWithdrawals);

  async function handleUploadDoc(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${docType}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("kyc-documents").upload(path, file);
    if (uploadError) {
      toast({ title: "Erro no upload", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from("kyc-documents").getPublicUrl(path);
    const { error } = await supabase.from("kyc_documents").insert({
      user_id: user.id,
      document_type: docType === "rg" ? "RG" : "CNH",
      file_url: publicUrl,
    });
    setUploading(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Documento enviado!", description: "Aguarde a análise da equipe." });
      await loadUserData(user.id);
    }
  }

  async function handleWithdrawRequest() {
    if (!user) return;
    const amount = Number(withdrawAmount);
    if (!amount || amount <= 0) {
      toast({ title: "Valor inválido", description: "Informe um valor válido para saque.", variant: "destructive" });
      return;
    }
    if (!withdrawPixKey.trim()) {
      toast({ title: "Chave PIX obrigatória", description: "Informe sua chave PIX para receber o saque.", variant: "destructive" });
      return;
    }
    if (amount > availableToWithdraw) {
      toast({ title: "Saldo insuficiente", description: "Você não possui saldo disponível para este saque.", variant: "destructive" });
      return;
    }

    // Rollover check: user must have wagered (total deposits * rollover_multiplier) before withdrawing
    try {
      const { data: siteSettings } = await supabase.from("site_settings").select("rollover_multiplier").limit(1).single();
      const rollover = Number(siteSettings?.rollover_multiplier ?? 1);

      if (rollover > 0) {
        const { data: deposits } = await supabase
          .from("transactions")
          .select("amount")
          .eq("user_id", user.id)
          .eq("type", "deposit")
          .eq("status", "completed");

        const totalDeposited = (deposits || []).reduce((s, d) => s + Number(d.amount), 0);
        const requiredWager = totalDeposited * rollover;

        const { data: betsData } = await supabase
          .from("bets")
          .select("amount")
          .eq("user_id", user.id);

        const totalWagered = (betsData || []).reduce((s, b) => s + Number(b.amount), 0);

        if (totalWagered < requiredWager) {
          toast({
            title: "Rollover não atingido",
            description: `Você precisa apostar R$ ${requiredWager.toFixed(2)} antes de sacar. Apostado até agora: R$ ${totalWagered.toFixed(2)}.`,
            variant: "destructive",
          });
          return;
        }
      }
    } catch (err) {
      console.error("Rollover check error:", err);
    }

    setWithdrawing(true);
    const { error } = await supabase.from("transactions").insert({
      user_id: user.id,
      type: "withdraw",
      amount,
      payment_method: "pix",
      status: "pending",
      metadata: { pix_key: withdrawPixKey.trim() },
    });
    setWithdrawing(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Saque solicitado!", description: "Aguarde aprovação." });
      setWithdrawAmount("");
      setWithdrawPixKey("");
      await loadUserData(user.id);
    }
  }

  const statusIcon = (s: string) => {
    if (s === "approved" || s === "completed") return <CheckCircle className="h-3.5 w-3.5 text-primary" />;
    if (s === "rejected" || s === "failed") return <XCircle className="h-3.5 w-3.5 text-destructive" />;
    return <Clock className="h-3.5 w-3.5 text-accent" />;
  };

  const tabs = [
    { id: "overview" as const, label: "Visão Geral", icon: Wallet },
    { id: "kyc" as const, label: "Verificação", icon: Shield },
    { id: "history" as const, label: "Histórico", icon: History },
  ];

  return (
    <div className="flex min-h-screen w-full bg-background">
      {!user && authMode && (
        <AuthOverlayModal open={!!authMode} mode={authMode} onModeChange={setAuthMode} onClose={() => setAuthMode(null)} />
      )}

      {isMobile && sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
      )}

      <div className={`${isMobile ? "fixed inset-y-0 left-0 z-50 transition-transform duration-200" : ""} ${isMobile && !sidebarOpen ? "-translate-x-full" : "translate-x-0"}`}>
        <CasinoSidebar onClose={() => setSidebarOpen(false)} />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          onSearch={() => {}}
          onDeposit={() => setDepositOpen(true)}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          onOpenAuth={setAuthMode}
        />
        <main className={`flex-1 p-3 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto ${isMobile ? "pb-24" : ""}`}>
          {/* Profile Header */}
          <div className="rounded-xl bg-card border border-border/40 p-4 sm:p-6 card-shadow">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <User className="h-5 w-5 sm:h-7 sm:w-7 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-sm sm:text-lg font-bold text-foreground truncate">{profile?.display_name || "Jogador"}</h1>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">{profile?.email}</p>
              </div>
              <div className="shrink-0">
                {profile?.kyc_verified ? (
                  <span className="flex items-center gap-1 text-[10px] sm:text-xs text-primary font-medium"><CheckCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Verificado</span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] sm:text-xs text-accent font-medium"><Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Não verificado</span>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="rounded-xl bg-card border border-border/40 p-3 sm:p-4 card-shadow text-center">
              <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-primary mx-auto mb-1" />
              <p className="text-xs sm:text-lg font-bold font-mono text-foreground">R$ {Number(balance).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground">Saldo Atual</p>
            </div>
            <div className="rounded-xl bg-card border border-border/40 p-3 sm:p-4 card-shadow text-center">
              <ArrowDownToLine className="h-4 w-4 sm:h-5 sm:w-5 text-primary mx-auto mb-1" />
              <p className="text-xs sm:text-lg font-bold font-mono text-foreground">R$ {totalDeposits.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground">Total Depositado</p>
            </div>
            <div className="rounded-xl bg-card border border-border/40 p-3 sm:p-4 card-shadow text-center">
              <ArrowUpFromLine className="h-4 w-4 sm:h-5 sm:w-5 text-primary mx-auto mb-1" />
              <p className="text-xs sm:text-lg font-bold font-mono text-foreground">R$ {totalWithdrawals.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground">Total Sacado</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-border/40 pb-0 overflow-x-auto scrollbar-hide">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-[11px] sm:text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
                  tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {tab === "overview" && (
            <div className="space-y-4">
              <div className="rounded-xl bg-card border border-border/40 p-4 sm:p-5 card-shadow space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Dados Pessoais</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Nome</p>
                    <p className="text-foreground font-medium text-xs sm:text-sm">{profile?.display_name || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">E-mail</p>
                    <p className="text-foreground font-medium text-xs sm:text-sm truncate">{profile?.email || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">CPF</p>
                    <p className="text-foreground font-medium text-xs sm:text-sm">{profile?.cpf || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Telefone</p>
                    <p className="text-foreground font-medium text-xs sm:text-sm">{profile?.phone || "—"}</p>
                  </div>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button onClick={() => setDepositOpen(true)} className="bg-primary text-primary-foreground font-semibold w-full text-xs sm:text-sm">
                  <ArrowDownToLine className="h-4 w-4 mr-2" /> Depositar
                </Button>
                <Button variant="outline" className="border-border/40 w-full text-xs sm:text-sm" onClick={() => setTab("kyc")}>
                  <Shield className="h-4 w-4 mr-2" /> Verificar Identidade
                </Button>
              </div>

              <div className="rounded-xl bg-card border border-border/40 p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <h4 className="text-sm font-semibold text-foreground">Solicitar saque via PIX</h4>
                  <span className="text-[10px] sm:text-xs text-muted-foreground">Disponível: R$ {availableToWithdraw.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="rounded-lg bg-accent/10 border border-accent/30 p-3">
                  <p className="text-[11px] text-accent font-medium">
                    ⚠️ A chave PIX informada deve pertencer a uma conta no mesmo CPF cadastrado na plataforma ({profile?.cpf || "não informado"}). Saques para contas de terceiros serão recusados.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    type="number"
                    min={1}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="Valor do saque"
                    className="bg-secondary border-border/40 text-sm"
                  />
                  <Input
                    value={withdrawPixKey}
                    onChange={(e) => setWithdrawPixKey(e.target.value)}
                    placeholder="Sua chave PIX (CPF, e-mail, celular ou aleatória)"
                    className="bg-secondary border-border/40 text-sm"
                  />
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <p className="text-[11px] text-muted-foreground">Saques entram como pendentes até aprovação.</p>
                  <Button onClick={handleWithdrawRequest} disabled={withdrawing || !withdrawAmount || !withdrawPixKey.trim()} className="bg-primary text-primary-foreground font-semibold w-full sm:w-auto text-xs sm:text-sm">
                    <ArrowUpFromLine className="h-4 w-4 mr-2" /> {withdrawing ? "Enviando..." : "Solicitar saque"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {tab === "kyc" && (
            <div className="space-y-4">
              <div className="rounded-xl bg-card border border-border/40 p-4 sm:p-5 card-shadow space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Enviar Documento de Identificação</h3>
                <p className="text-xs text-muted-foreground">Para realizar saques, envie uma foto legível do seu RG ou CNH.</p>
                <div className="flex gap-2">
                  <button onClick={() => setDocType("rg")} className={`px-4 py-2 rounded-lg text-xs font-medium border ${docType === "rg" ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-foreground border-border/40"}`}>
                    RG
                  </button>
                  <button onClick={() => setDocType("cnh")} className={`px-4 py-2 rounded-lg text-xs font-medium border ${docType === "cnh" ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-foreground border-border/40"}`}>
                    CNH
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <Input type="file" accept="image/*,.pdf" onChange={handleUploadDoc} className="bg-secondary border-border/40 text-sm" />
                  {uploading && <span className="text-xs text-accent animate-pulse">Enviando...</span>}
                </div>
              </div>

              {kycDocs.length > 0 && (
                <div className="rounded-xl bg-card border border-border/40 p-4 sm:p-5 card-shadow space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Documentos Enviados</h3>
                  {kycDocs.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between py-2 border-b border-border/20 last:border-0">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-foreground">{doc.document_type}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {statusIcon(doc.status ?? "pending")}
                        <span className="text-[10px] text-muted-foreground capitalize">{doc.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "history" && (
            <div className="rounded-xl bg-card border border-border/40 p-4 sm:p-5 card-shadow">
              <h3 className="text-sm font-semibold text-foreground mb-3">Histórico de Transações</h3>
              {transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma transação encontrada.</p>
              ) : (
                <div className="space-y-0">
                  {transactions.map(tx => (
                    <div key={tx.id} className="flex items-center justify-between py-2.5 border-b border-border/20 last:border-0">
                      <div className="flex items-center gap-2 sm:gap-3">
                        {tx.type === "deposit" ? (
                          <ArrowDownToLine className="h-4 w-4 text-primary shrink-0" />
                        ) : (
                          <ArrowUpFromLine className="h-4 w-4 text-accent shrink-0" />
                        )}
                        <div>
                          <p className="text-xs font-medium text-foreground capitalize">{tx.type === "deposit" ? "Depósito" : "Saque"}</p>
                          <p className="text-[10px] text-muted-foreground">{new Date(tx.created_at).toLocaleString("pt-BR")}</p>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <span className={`text-xs sm:text-sm font-mono font-semibold ${tx.type === "deposit" ? "text-primary" : "text-foreground"}`}>
                          {tx.type === "deposit" ? "+" : "-"} R$ {Number(tx.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                        {statusIcon(tx.status ?? "pending")}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {isMobile && <BottomNavBar onDeposit={() => setDepositOpen(true)} onOpenAuth={setAuthMode} />}
      <DepositModal open={depositOpen} onClose={() => setDepositOpen(false)} />
    </div>
  );
}
