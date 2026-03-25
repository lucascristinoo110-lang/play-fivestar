import { useState, useEffect, useRef } from "react";
import { trackEvent } from "@/hooks/useMetaPixel";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { X, QrCode, Copy, CheckCircle, Loader2, Zap, Shield, Clock, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import defaultDepositBanner from "@/assets/deposit-banner.png";

const presets = [50, 150, 200, 300];

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
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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
      setCopied(false);
    }
  }, [open]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
      document.body.style.top = `-${window.scrollY}px`;
    } else {
      const scrollY = document.body.style.top;
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.top = "";
      window.scrollTo(0, parseInt(scrollY || "0") * -1);
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.top = "";
    };
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
            trackEvent("Purchase", { value: Number(payload.new.amount), currency: "BRL" });
            toast({ title: "Depósito confirmado!", description: `R$ ${Number(payload.new.amount).toFixed(2)} adicionado ao seu saldo.` });
          }
        },
      )
      .subscribe();

    const interval = setInterval(async () => {
      const { data } = await supabase.from("transactions").select("status").eq("id", transactionId).single();
      if (data?.status === "completed") {
        setStep("success");
        trackEvent("Purchase", { value: Number(amount), currency: "BRL" });
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
      trackEvent("Lead", { value: Number(amount), currency: "BRL" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(pixCode);
    setCopied(true);
    toast({ title: "Código PIX copiado!" });
    setTimeout(() => setCopied(false), 2000);
  }

  if (!open) return null;

  const bannerUrl = settings?.deposit_banner_url || defaultDepositBanner;
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
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm sm:flex sm:items-center sm:justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-x-0 bottom-0 sm:relative sm:inset-auto sm:max-w-md sm:w-full sm:mx-4 bg-card rounded-t-3xl sm:rounded-2xl border-t sm:border border-border/40 flex flex-col"
          style={{
            maxHeight: "calc(100dvh - 40px)",
          }}
        >
          {/* Drag handle on mobile */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>

          {/* Scrollable content */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto overscroll-contain"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {bannerUrl && (
              <div className="w-full shrink-0">
                <img src={bannerUrl} alt="Promoção" className="w-full object-contain rounded-t-3xl sm:rounded-t-2xl" loading="lazy" decoding="async" />
              </div>
            )}

            {/* Header */}
            <div className="relative overflow-hidden shrink-0">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/5 to-transparent" />
              <div className="relative flex items-center justify-between px-5 py-3 border-b border-border/40">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Zap className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Depositar via PIX</h3>
                    <p className="text-[10px] text-primary font-medium">Santiago.bet é regulamentada Portaria N° 178.909</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={onClose} className="p-2 rounded-xl hover:bg-secondary text-muted-foreground">
                    <X className="h-4 w-4" />
                  </button>
                  <span className="shrink-0 px-2.5 py-1 rounded-lg bg-primary/15 border border-primary/30 text-primary text-[10px] font-bold whitespace-nowrap">
                    Mín R$ {minDeposit.toFixed(2)}
                  </span>
                </div>
            </div>

            <div className="px-4 sm:px-5 py-3 sm:py-4">
              {step === "amount" && (
                <div className="space-y-3">
                  {/* Trust badges */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { icon: Clock, text: "Crédito em segundos" },
                      { icon: Shield, text: "100% seguro" },
                      { icon: TrendingUp, text: "Bônus ativo" },
                    ].map(({ icon: Icon, text }) => (
                      <div key={text} className="flex flex-col items-center gap-1 p-2 rounded-lg bg-secondary/50 border border-border/20">
                        <Icon className="h-3.5 w-3.5 text-primary" />
                        <span className="text-[8px] sm:text-[9px] text-muted-foreground font-medium text-center leading-tight">{text}</span>
                      </div>
                    ))}
                  </div>

                  {/* Preset values */}
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-1.5">Escolha o valor:</p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {presets.map((v) => (
                        <button
                          key={v}
                          onClick={() => { setAmount(v); setCustomAmount(""); }}
                          className={`px-2 py-2.5 rounded-lg text-xs font-bold transition-all border ${
                            amount === v
                              ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25"
                              : "bg-secondary text-foreground border-border/40 hover:border-primary/50"
                          }`}
                        >
                          R${v}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom amount - native input for better mobile keyboard */}
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-primary font-bold">R$</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={customAmount}
                      onChange={(e) => { setCustomAmount(e.target.value); setAmount(""); }}
                      placeholder="Informe o valor"
                      min={minDeposit}
                      max={maxDeposit}
                      className="w-full pl-12 pr-4 h-12 rounded-xl bg-secondary border border-border/40 text-foreground text-base font-semibold placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                      onFocus={() => {
                        setTimeout(() => {
                          scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
                        }, 300);
                      }}
                    />
                  </div>

                  {isBelowMin && (
                    <p className="text-[11px] text-destructive font-semibold text-center">
                      ⚠️ Mínimo R$ {minDeposit.toFixed(2)}
                    </p>
                  )}
                  {isAboveMax && (
                    <p className="text-[11px] text-destructive font-semibold text-center">
                      ⚠️ Máximo R$ {maxDeposit.toFixed(2)}
                    </p>
                  )}

                  {/* CTA message */}
                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-primary font-semibold">🔥 Jogadores online agora estão ganhando — deposite e comece a jogar!</p>
                  </div>

                  {/* Submit button */}
                  <button
                    onClick={handleGenerateQR}
                    disabled={loading || !canGenerate}
                    className="relative w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-50 transition-all hover:brightness-110 shadow-lg shadow-primary/30 active:scale-[0.98]"
                  >
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <QrCode className="h-5 w-5" />
                        Depositar Agora
                      </span>
                    )}
                  </button>

                  <p className="text-[10px] text-muted-foreground text-center pb-1">
                    Mín R$ {minDeposit.toFixed(2)} • Máx R$ {maxDeposit.toFixed(2)} • Confirmação automática
                  </p>
                </div>
              )}

              {step === "qrcode" && (
                <div className="space-y-4 text-center">
                  <p className="text-xs text-muted-foreground">Escaneie o QR Code ou copie o código:</p>

                  <div className="mx-auto w-44 h-44 sm:w-52 sm:h-52 rounded-2xl bg-white flex items-center justify-center p-3 shadow-lg">
                    {qrImage ? (
                      <img src={qrImage} alt="QR Code PIX" className="w-full h-full object-contain" loading="eager" decoding="async" />
                    ) : (
                      <QrCode className="h-16 w-16 text-muted" />
                    )}
                  </div>

                  <p className="text-xl font-bold text-foreground font-mono">R$ {finalAmount.toFixed(2)}</p>

                  {/* Copy button - large and prominent */}
                  <button
                    onClick={copyCode}
                    className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-sm shadow-lg transition-all active:scale-[0.98] ${
                      copied
                        ? "bg-emerald-500 text-white shadow-emerald-500/30"
                        : "bg-primary text-primary-foreground shadow-primary/30"
                    }`}
                  >
                    {copied ? <CheckCircle className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                    {copied ? "Código Copiado!" : "Copiar Código PIX"}
                  </button>

                  {/* Pix code - tappable */}
                  <div
                    onClick={copyCode}
                    className="bg-secondary rounded-xl p-3 cursor-pointer active:bg-secondary/80 transition-colors"
                  >
                    <code className="text-[10px] text-muted-foreground break-all block text-left leading-relaxed select-all">{pixCode}</code>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-xs text-accent pb-2">
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
                  <Button onClick={onClose} className="bg-primary text-primary-foreground font-semibold w-full py-3">
                    Jogar Agora
                  </Button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
