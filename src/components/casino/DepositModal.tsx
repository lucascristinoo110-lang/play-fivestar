import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, QrCode, Copy, CheckCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const presets = [50, 100, 200];

type Step = "amount" | "qrcode" | "success";

export function DepositModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const { settings } = useSiteSettings();
  const [step, setStep] = useState<Step>("amount");
  const [amount, setAmount] = useState<number | "">("");
  const [customAmount, setCustomAmount] = useState("");
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pixCode, setPixCode] = useState("");

  useEffect(() => {
    if (!open) {
      setStep("amount");
      setAmount("");
      setCustomAmount("");
      setTransactionId(null);
      setPixCode("");
    }
  }, [open]);

  // Listen for transaction status change via realtime
  useEffect(() => {
    if (!transactionId || step !== "qrcode") return;

    const channel = supabase
      .channel(`deposit-${transactionId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "transactions",
        filter: `id=eq.${transactionId}`,
      }, (payload) => {
        if (payload.new.status === "completed") {
          setStep("success");
          toast({ title: "Depósito confirmado!", description: `R$ ${Number(payload.new.amount).toFixed(2)} adicionado ao seu saldo.` });
        }
      })
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

  async function handleGenerateQR() {
    const finalAmount = amount || parseFloat(customAmount);
    if (!finalAmount || finalAmount <= 0 || !user) return;

    setLoading(true);
    try {
      const { data: tx, error } = await supabase.from("transactions").insert({
        user_id: user.id,
        type: "deposit",
        amount: Number(finalAmount),
        payment_method: "pix",
        status: "pending",
      }).select().single();

      if (error) throw error;

      setTransactionId(tx.id);

      const { data: pixData, error: pixError } = await supabase.functions.invoke("bspay-create-pix", {
        body: { transaction_id: tx.id, amount: Number(finalAmount) },
      });

      if (pixError || !pixData?.pix_code) {
        setPixCode(`00020126580014br.gov.bcb.pix0136demo-${tx.id}520400005303986540${Number(finalAmount).toFixed(2)}5802BR`);
      } else {
        setPixCode(pixData.pix_code);
      }

      setStep("qrcode");
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
    setLoading(false);
  }

  function copyCode() {
    navigator.clipboard.writeText(pixCode);
    toast({ title: "Código PIX copiado!" });
  }

  if (!open) return null;

  const bannerUrl = (settings as any)?.deposit_banner_url;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-md rounded-2xl bg-card border border-border/40 elevated-shadow overflow-hidden"
        >
          {/* Banner */}
          {bannerUrl && (
            <div className="w-full">
              <img src={bannerUrl} alt="Promoção" className="w-full h-28 object-cover" />
            </div>
          )}

          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border/40">
            <h3 className="text-sm font-semibold text-foreground">Depositar via PIX</h3>
            <button onClick={onClose} className="p-1 rounded-md hover:bg-secondary text-muted-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-5">
            {step === "amount" && (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">Escolha o valor do depósito:</p>

                <div className="grid grid-cols-3 gap-2">
                  {presets.map(v => (
                    <button
                      key={v}
                      onClick={() => { setAmount(v); setCustomAmount(""); }}
                      className={`py-3 rounded-xl text-sm font-bold transition-all border ${
                        amount === v
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-secondary text-foreground border-border/40 hover:border-primary/50"
                      }`}
                    >
                      R$ {v}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-semibold">R$</span>
                  <Input
                    type="number"
                    value={customAmount}
                    onChange={e => { setCustomAmount(e.target.value); setAmount(""); }}
                    placeholder="Outro valor"
                    className="pl-10 bg-secondary border-border/40 h-12 text-sm"
                    min={1}
                  />
                </div>

                {/* Pulsing deposit button */}
                <button
                  onClick={handleGenerateQR}
                  disabled={loading || (!amount && !customAmount)}
                  className="relative w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-50 transition-all hover:brightness-110"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  ) : (
                    <>
                      <span className="absolute inset-0 rounded-xl animate-ping bg-primary/30" />
                      <span className="relative flex items-center justify-center gap-2">
                        <QrCode className="h-5 w-5" />
                        Gerar QR Code PIX
                      </span>
                    </>
                  )}
                </button>
              </div>
            )}

            {step === "qrcode" && (
              <div className="space-y-4 text-center">
                <p className="text-xs text-muted-foreground">Escaneie o QR Code ou copie o código abaixo:</p>

                <div className="mx-auto w-48 h-48 rounded-xl bg-white flex items-center justify-center p-3">
                  <QrCode className="h-20 w-20 text-muted" />
                </div>

                <p className="text-lg font-bold text-foreground font-mono">
                  R$ {(amount || parseFloat(customAmount) || 0).toFixed(2)}
                </p>

                <div className="flex items-center gap-2 bg-secondary rounded-lg p-2">
                  <code className="flex-1 text-[10px] text-muted-foreground break-all text-left">{pixCode.slice(0, 60)}...</code>
                  <button onClick={copyCode} className="p-2 rounded-md hover:bg-surface-hover text-primary shrink-0">
                    <Copy className="h-4 w-4" />
                  </button>
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
                <p className="text-sm text-muted-foreground">Seu saldo foi atualizado. Boas apostas!</p>
                <Button onClick={onClose} className="bg-primary text-primary-foreground font-semibold">
                  Fechar
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
