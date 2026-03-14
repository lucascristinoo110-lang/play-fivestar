import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import autorizadoImg from "@/assets/autorizado-fazenda.png";

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
      className="fixed inset-0 z-[100] bg-background/70 backdrop-blur-md flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-sm rounded-2xl overflow-hidden elevated-shadow"
      >
        {/* Header with logo - gradient background */}
        <div
          className="flex items-center justify-center py-8 px-6"
          style={{
            background: "linear-gradient(135deg, hsl(222 47% 8%), hsl(142 50% 15%), hsl(222 47% 6%))",
          }}
        >
          {settings?.logo_url ? (
            <img
              src={settings.logo_url}
              alt={settings?.site_name || "Logo"}
              className="h-16 sm:h-20 w-auto object-contain drop-shadow-lg"
            />
          ) : (
            <span className="text-3xl font-bold text-primary-foreground tracking-tight">
              {settings?.site_name || "NEXUS"}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="bg-card p-6 sm:p-8 space-y-5">
          {blocked ? (
            <div className="text-center space-y-3">
              <h2 className="text-xl font-bold text-foreground">Este site não é para você.</h2>
              <p className="text-sm text-muted-foreground">Você precisa ter mais de 18 anos para acessar.</p>
            </div>
          ) : (
            <>
              <div className="text-center">
                <h2 className="text-xl sm:text-2xl font-black text-foreground uppercase tracking-wide">
                  Você tem mais de<br />18 anos?
                </h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Este site contém conteúdo destinado apenas para maiores de 18 anos.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleNo}
                  className="flex-1 py-3.5 rounded-xl border-2 border-border/60 bg-secondary text-foreground font-bold text-sm uppercase tracking-wide hover:bg-surface-hover transition-all"
                >
                  Não
                </button>
                <button
                  onClick={handleYes}
                  className="flex-1 py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm uppercase tracking-wide hover:bg-primary/90 transition-all"
                >
                  Sim
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer badges */}
        <div className="bg-card border-t border-border/40 px-6 py-4 flex items-center justify-center gap-4">
          <img
            src={autorizadoImg}
            alt="Autorizado pelo Ministério da Fazenda"
            className="h-10 w-auto object-contain"
          />
          <div className="w-px h-8 bg-border/40" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full border-2 border-muted-foreground flex items-center justify-center text-[10px] font-bold text-muted-foreground">
              18+
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
