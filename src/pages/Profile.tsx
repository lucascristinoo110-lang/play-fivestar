import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CasinoSidebar } from "@/components/casino/CasinoSidebar";
import { TopBar } from "@/components/casino/TopBar";
import { DepositModal } from "@/components/casino/DepositModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { User, Shield, Upload, Wallet, ArrowDownToLine, ArrowUpFromLine, History, FileText, CheckCircle, Clock, XCircle } from "lucide-react";
import { Navigate } from "react-router-dom";

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
  const [tab, setTab] = useState<"overview" | "kyc" | "history">("overview");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [kycDocs, setKycDocs] = useState<KycDoc[]>([]);
  const [depositOpen, setDepositOpen] = useState(false);
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
      supabase.from("kyc_documents").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).then(({ data }) => setKycDocs((data as KycDoc[]) || []));
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
      <CasinoSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onSearch={() => {}} onDeposit={() => setDepositOpen(true)} />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Profile Header */}
          <div className="rounded-xl bg-card border border-border/40 p-6 card-shadow">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">{profile?.display_name || "Jogador"}</h1>
                <p className="text-sm text-muted-foreground">{profile?.email}</p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                {profile?.kyc_verified ? (
                  <span className="flex items-center gap-1 text-xs text-primary font-medium"><CheckCircle className="h-3.5 w-3.5" /> Verificado</span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-accent font-medium"><Clock className="h-3.5 w-3.5" /> Não verificado</span>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-card border border-border/40 p-4 card-shadow text-center">
              <Wallet className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-lg font-bold font-mono text-foreground">R$ {Number(balance).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
              <p className="text-[10px] text-muted-foreground">Saldo Atual</p>
            </div>
            <div className="rounded-xl bg-card border border-border/40 p-4 card-shadow text-center">
              <ArrowDownToLine className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-lg font-bold font-mono text-foreground">R$ {totalDeposits.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
              <p className="text-[10px] text-muted-foreground">Total Depositado</p>
            </div>
            <div className="rounded-xl bg-card border border-border/40 p-4 card-shadow text-center">
              <ArrowUpFromLine className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-lg font-bold font-mono text-foreground">R$ {totalWithdrawals.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
              <p className="text-[10px] text-muted-foreground">Total Sacado</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-border/40 pb-0">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-all ${
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
              <div className="rounded-xl bg-card border border-border/40 p-5 card-shadow space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Dados Pessoais</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Nome</p>
                    <p className="text-foreground font-medium">{profile?.display_name || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">E-mail</p>
                    <p className="text-foreground font-medium">{profile?.email || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">CPF</p>
                    <p className="text-foreground font-medium">{profile?.cpf || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Telefone</p>
                    <p className="text-foreground font-medium">{profile?.phone || "—"}</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <Button onClick={() => setDepositOpen(true)} className="bg-primary text-primary-foreground font-semibold flex-1">
                  <ArrowDownToLine className="h-4 w-4 mr-2" /> Depositar
                </Button>
                <Button variant="outline" className="flex-1 border-border/40" onClick={() => setTab("kyc")}>
                  <Shield className="h-4 w-4 mr-2" /> Verificar Identidade
                </Button>
              </div>
            </div>
          )}

          {tab === "kyc" && (
            <div className="space-y-4">
              <div className="rounded-xl bg-card border border-border/40 p-5 card-shadow space-y-4">
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
                <div className="rounded-xl bg-card border border-border/40 p-5 card-shadow space-y-3">
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
            <div className="rounded-xl bg-card border border-border/40 p-5 card-shadow">
              <h3 className="text-sm font-semibold text-foreground mb-3">Histórico de Transações</h3>
              {transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma transação encontrada.</p>
              ) : (
                <div className="space-y-0">
                  {transactions.map(tx => (
                    <div key={tx.id} className="flex items-center justify-between py-2.5 border-b border-border/20 last:border-0">
                      <div className="flex items-center gap-3">
                        {tx.type === "deposit" ? (
                          <ArrowDownToLine className="h-4 w-4 text-primary" />
                        ) : (
                          <ArrowUpFromLine className="h-4 w-4 text-accent" />
                        )}
                        <div>
                          <p className="text-xs font-medium text-foreground capitalize">{tx.type === "deposit" ? "Depósito" : "Saque"}</p>
                          <p className="text-[10px] text-muted-foreground">{new Date(tx.created_at).toLocaleString("pt-BR")}</p>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <span className={`text-sm font-mono font-semibold ${tx.type === "deposit" ? "text-primary" : "text-foreground"}`}>
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
      <DepositModal open={depositOpen} onClose={() => setDepositOpen(false)} />
    </div>
  );
}
