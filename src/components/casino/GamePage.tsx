import { useState, useEffect, useMemo } from "react";
import { X, ArrowLeft, Heart, Users, Star, Maximize2, Minimize2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type GamePageProps = {
  url: string;
  gameName: string;
  provider: string;
  imageUrl?: string | null;
  onClose: () => void;
};

function generateLikes(gameName: string) {
  let hash = 0;
  for (let i = 0; i < gameName.length; i++) {
    hash = (hash << 5) - hash + gameName.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash % 8000) + 1200;
}

function generatePlayers(gameName: string) {
  let hash = 0;
  for (let i = 0; i < gameName.length; i++) {
    hash = (hash << 3) + hash + gameName.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash % 400) + 50;
}

function generateRating(gameName: string) {
  let hash = 0;
  for (let i = 0; i < gameName.length; i++) {
    hash = (hash << 2) + hash + gameName.charCodeAt(i);
    hash |= 0;
  }
  return (Math.abs(hash % 15) + 35) / 10;
}

export function GamePage({ url, gameName, provider, imageUrl, onClose }: GamePageProps) {
  const [liked, setLiked] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  const likes = useMemo(() => generateLikes(gameName), [gameName]);
  const players = useMemo(() => generatePlayers(gameName), [gameName]);
  const rating = useMemo(() => generateRating(gameName), [gameName]);

  const displayLikes = liked ? likes + 1 : likes;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  if (fullscreen) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] bg-black flex flex-col"
        >
          <div className="h-10 flex items-center justify-between px-3 bg-card/90 backdrop-blur-sm shrink-0">
            <span className="text-xs font-semibold text-foreground truncate">{gameName}</span>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setFullscreen(false)} className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground">
                <Minimize2 className="h-3.5 w-3.5" />
              </button>
              <button onClick={onClose} className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="flex-1">
            <iframe src={url} className="w-full h-full border-0" allow="autoplay; fullscreen; clipboard-write" allowFullScreen title={gameName} />
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[90] bg-background flex flex-col overflow-y-auto"
      >
        {/* Top bar */}
        <div className="h-12 flex items-center justify-between px-4 bg-card border-b border-border/40 shrink-0 sticky top-0 z-10">
          <button onClick={onClose} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Voltar ao Cassino</span>
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => setFullscreen(true)} className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground">
              <Maximize2 className="h-4 w-4" />
            </button>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Game iframe */}
        <div className="w-full bg-black relative" style={{ aspectRatio: "16/9", maxHeight: "70vh" }}>
          {!iframeLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
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

        {/* Game info */}
        <div className="p-4 sm:p-6 space-y-4 max-w-4xl mx-auto w-full">
          {/* Title row */}
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">{gameName}</h1>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{provider}</p>
            </div>
            <button
              onClick={() => setLiked(!liked)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-all duration-200 ${
                liked
                  ? "bg-destructive/10 border-destructive/30 text-destructive"
                  : "bg-secondary border-border/40 text-muted-foreground hover:text-foreground"
              }`}
            >
              <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
              <span className="text-xs font-semibold">{displayLikes.toLocaleString("pt-BR")}</span>
            </button>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5 text-primary" />
              <span><strong className="text-foreground">{players}</strong> jogando agora</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
              <span><strong className="text-foreground">{rating.toFixed(1)}</strong>/5.0</span>
            </div>
          </div>

          {/* Fullscreen CTA */}
          <button
            onClick={() => setFullscreen(true)}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <Maximize2 className="h-4 w-4" />
            Jogar em Tela Cheia
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
