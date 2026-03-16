import { useState, useEffect } from "react";
import { trackEvent } from "@/hooks/useMetaPixel";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, QrCode, Copy, CheckCircle, Loader2, Zap, Shield, Clock, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const presets = [30, 50, 100, 200, 500];

type Step = "amount" | "qrcode" | "success";

function buildQrImageFromPixCode(pixCode: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=340x340&data=${encodeURIComponent(pixCode)}`;
}

export function DepositModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const { settings } = useSiteSettings();
  const [step, setStep] = useState<Step>("amount");
  const [amount, setAmount] = useState<number | "">("");
  const [customAmount, setCustomAmount] = useState("");
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pixCode, setPixCode] = useState("");
  const [qrImage, setQrImage] = useState<string | null>(null);

  const minDeposit = settings?.min_deposit ?? 10;
  const maxDeposit = settings?.max_deposit ?? 50000;

  useEffect(() => {
    if (!open) {
      setStep("amount");
      setAmount("");
      setCustomAmount("");
      setTransactionId(null);
      setPixCode("");
      setQrImage(null);
    }
  }, [open]);

  useEffect(() => {
    if (!transactionId || step !== "qrcode") return;

    const channel = supabase
      .channel(`deposit-${transactionId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "transactions", filter: `id=eq.${transactionId}` },
        (payload) => {
          if (payload.new.status === "completed") {
            setStep("success");
            toast({ title: "Depósito confirmado!", description: `R$ ${Number(payload.new.amount).toFixed(2)} adicionado ao seu saldo.` });
          }
        },
      )
      .subscribe();

    const interval = setInterval(async () => {
      const { data } = await supabase.from("transactions").select("status").eq("id", transactionId).single();
      if (data?.status === "completed") {
        setStep("success");
        toast({ title: "Depósito confirmado!" });
      }
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [transactionId, step]);

  function getFinalAmount(): number {
    return Number(amount) || parseFloat(customAmount) || 0;
  }

  async function handleGenerateQR() {
    const finalAmount = getFinalAmount();
    if (!finalAmount || finalAmount <= 0 || !user) return;

    if (finalAmount < minDeposit) {
      toast({ title: "Valor mínimo", description: `O depósito mínimo é R$ ${minDeposit.toFixed(2)}.`, variant: "destructive" });
      return;
    }
    if (finalAmount > maxDeposit) {
      toast({ title: "Valor máximo", description: `O depósito máximo é R$ ${maxDeposit.toFixed(2)}.`, variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data: tx, error } = await supabase
        .from("transactions")
        .insert({ user_id: user.id, type: "deposit", amount: finalAmount, payment_method: "pix", status: "pending" })
        .select()
        .single();

      if (error || !tx) throw error || new Error("Não foi possível criar a transação.");
      setTransactionId(tx.id);

      const { data: pixData, error: pixError } = await supabase.functions.invoke("bspay-create-pix", {
        body: { transaction_id: tx.id, amount: finalAmount },
      });

      if (pixError || !pixData?.pix_code) {
        throw new Error(pixData?.error || pixError?.message || "Não foi possível gerar o PIX agora.");
      }

      setPixCode(String(pixData.pix_code));
      setQrImage(pixData.qr_code_image || buildQrImageFromPixCode(String(pixData.pix_code)));
      setStep("qrcode");
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(pixCode);
    toast({ title: "Código PIX copiado!" });
  }

  if (!open) return null;

  const bannerUrl = settings?.deposit_banner_url;
  const finalAmount = getFinalAmount();
  const isBelowMin = finalAmount > 0 && finalAmount < minDeposit;
  const isAboveMax = finalAmount > maxDeposit;
  const canGenerate = finalAmount >= minDeposit && finalAmount <= maxDeposit;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-card border border-border/40 elevated-shadow overflow-hidden max-h-[90vh] overflow-y-auto overscroll-contain touch-pan-y"
          style={{ touchAction: "pan-y" }}
        >
          {bannerUrl && (
            <div className="w-full">
              <img src={bannerUrl} alt="Promoção" className="w-full h-24 sm:h-28 object-cover" loading="lazy" decoding="async" />
            </div>
          )}

          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/5 to-transparent" />
            <div className="relative flex items-center justify-between p-4 border-b border-border/40">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Zap className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Depositar via PIX</h3>
                  <p className="text-[10px] text-primary font-medium">Crédito instantâneo • 24h</p>
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-5">
            {step === "amount" && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-secondary/50 border border-border/20">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[9px] text-muted-foreground font-medium text-center leading-tight">Crédito em segundos</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-secondary/50 border border-border/20">
                    <Shield className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[9px] text-muted-foreground font-medium text-center leading-tight">100% seguro</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-secondary/50 border border-border/20">
                    <TrendingUp className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[9px] text-muted-foreground font-medium text-center leading-tight">Bônus ativo</span>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-foreground mb-2">Escolha o valor:</p>
                  <div className="grid grid-cols-5 gap-1.5">
                    {presets.map((v) => (
                      <button
                        key={v}
                        onClick={() => { setAmount(v); setCustomAmount(""); }}
                        className={`py-2.5 rounded-xl text-xs font-bold transition-all border ${
                          amount === v
                            ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25"
                            : "bg-secondary text-foreground border-border/40 hover:border-primary/50 hover:bg-secondary/80"
                        }`}
                      >
                        R${v}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-semibold">R$</span>
                  <Input
                    type="number"
                    value={customAmount}
                    onChange={(e) => { setCustomAmount(e.target.value); setAmount(""); }}
                    placeholder="Outro valor"
                    className="pl-10 bg-secondary border-border/40 h-12 text-sm"
                    min={minDeposit}
                    max={maxDeposit}
                  />
                </div>

                {isBelowMin && (
                  <p className="text-[11px] text-destructive font-semibold text-center">
                    ⚠️ O valor mínimo para depósito é R$ {minDeposit.toFixed(2)}
                  </p>
                )}
                {isAboveMax && (
                  <p className="text-[11px] text-destructive font-semibold text-center">
                    ⚠️ O valor máximo para depósito é R$ {maxDeposit.toFixed(2)}
                  </p>
                )}

                <div className="bg-primary/10 border border-primary/20 rounded-lg p-2.5 text-center">
                  <p className="text-[11px] text-primary font-semibold">🔥 Jogadores online agora estão ganhando — deposite e comece a jogar!</p>
                </div>

                <button
                  onClick={handleGenerateQR}
                  disabled={loading || !canGenerate}
                  className="relative w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-50 transition-all hover:brightness-110 shadow-lg shadow-primary/30"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  ) : (
                    <>
                      <span className="absolute inset-0 rounded-xl animate-ping bg-primary/20" />
                      <span className="relative flex items-center justify-center gap-2">
                        <QrCode className="h-5 w-5" />
                        Depositar Agora
                      </span>
                    </>
                  )}
                </button>

                <p className="text-[10px] text-muted-foreground text-center">
                  Depósito mínimo R$ {minDeposit.toFixed(2)} • Máximo R$ {maxDeposit.toFixed(2)} • Confirmação automática
                </p>
              </div>
            )}

            {step === "qrcode" && (
              <div className="space-y-3 text-center">
                <p className="text-xs text-muted-foreground">Escaneie o QR Code ou copie o código abaixo:</p>

                <div className="mx-auto w-40 h-40 sm:w-52 sm:h-52 rounded-xl bg-white flex items-center justify-center p-2">
                  {qrImage ? (
                    <img src={qrImage} alt="QR Code PIX" className="w-full h-full object-contain" loading="eager" decoding="async" />
                  ) : (
                    <QrCode className="h-14 w-14 sm:h-20 sm:w-20 text-muted" />
                  )}
                </div>

                <p className="text-base font-bold text-foreground font-mono">R$ {finalAmount.toFixed(2)}</p>

                <button
                  onClick={copyCode}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-lg shadow-primary/30 active:scale-95 transition-transform"
                >
                  <Copy className="h-4 w-4" />
                  Copiar Código PIX
                </button>

                <div className="bg-secondary rounded-lg p-2.5 max-h-20 overflow-y-auto">
                  <code className="text-[10px] text-muted-foreground break-all block text-left select-all">{pixCode}</code>
                </div>

                <div className="flex items-center justify-center gap-2 text-xs text-accent">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Aguardando pagamento...
                </div>
              </div>
            )}

            {step === "success" && (
              <div className="space-y-4 text-center py-6">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                  <CheckCircle className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Depósito Confirmado!</h3>
                <p className="text-sm text-muted-foreground">Seu saldo foi atualizado. Boa sorte! 🍀</p>
                <Button onClick={onClose} className="bg-primary text-primary-foreground font-semibold">
                  Jogar Agora
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
