import { useState, useEffect } from "react";
import { X, ArrowLeft, Minimize2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";

type GamePageProps = {
  url: string;
  gameName: string;
  provider: string;
  imageUrl?: string | null;
  onClose: () => void;
};

export function GamePage({ url, gameName, provider, imageUrl, onClose }: GamePageProps) {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [showBar, setShowBar] = useState(true);
  const isMobile = useIsMobile();

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Auto-hide bar on mobile after 3s
  useEffect(() => {
    if (!isMobile) return;
    const t = setTimeout(() => setShowBar(false), 3000);
    return () => clearTimeout(t);
  }, [isMobile]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[90] bg-black flex flex-col"
      >
        {/* Top bar — always visible on desktop, toggleable on mobile */}
        {(showBar || !isMobile) && (
          <div className="h-10 sm:h-12 flex items-center justify-between px-3 sm:px-4 bg-card/95 backdrop-blur-sm border-b border-border/30 shrink-0 z-10">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Voltar</span>
            </button>
            <span className="text-xs sm:text-sm font-semibold text-foreground truncate max-w-[50%]">{gameName}</span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Tap zone on mobile to toggle bar */}
        {isMobile && !showBar && (
          <button
            onClick={() => setShowBar(true)}
            className="absolute top-0 left-0 right-0 h-10 z-20"
            aria-label="Mostrar barra"
          />
        )}

        {/* Game iframe — full remaining space */}
        <div className="flex-1 relative">
          {!iframeLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          <iframe
            src={url}
            className="w-full h-full border-0"
            allow="autoplay; fullscreen; clipboard-write"
            allowFullScreen
            title={gameName}
            onLoad={() => setIframeLoaded(true)}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
