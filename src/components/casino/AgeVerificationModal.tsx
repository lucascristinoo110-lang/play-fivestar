import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Check, ShieldAlert } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export function AgeVerificationModal() {
  const [show, setShow] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const { settings } = useSiteSettings();

  useEffect(() => {
    const verified = localStorage.getItem("age-verified");
    if (!verified) setShow(true);
  }, []);

  function handleYes() {
    localStorage.setItem("age-verified", "true");
    setShow(false);
  }

  function handleNo() {
    setBlocked(true);
  }

  if (!show && !blocked) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] bg-background/60 backdrop-blur-md flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-sm rounded-2xl bg-card border border-border/40 elevated-shadow overflow-hidden text-center"
      >
        <div className="p-8 space-y-6">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto overflow-hidden">
            {settings?.logo_url ? (
              <img src={settings.logo_url} alt={settings?.site_name || "Logo"} className="h-10 w-auto object-contain" />
            ) : (
              <ShieldAlert className="h-8 w-8 text-primary" />
            )}
          </div>

          {blocked ? (
            <>
              <h2 className="text-xl font-bold text-foreground">Este site não é para você.</h2>
              <p className="text-sm text-muted-foreground">Você precisa ter mais de 18 anos para acessar este site.</p>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-foreground">
                Você tem mais de<br />18 anos?
              </h2>
              <p className="text-sm text-muted-foreground">Este site contém conteúdo destinado apenas para maiores de 18 anos.</p>
              <div className="flex gap-3">
                <button
                  onClick={handleNo}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl border border-border/40 bg-secondary text-foreground font-semibold text-sm hover:bg-surface-hover transition-all"
                >
                  <X className="h-4 w-4" /> Não
                </button>
                <button
                  onClick={handleYes}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all"
                >
                  <Check className="h-4 w-4" /> Sim
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
