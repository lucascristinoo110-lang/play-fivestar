import { useState } from "react";
import { X, Maximize2, Minimize2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type GameLauncherProps = {
  url: string;
  gameName: string;
  onClose: () => void;
};

export function GameLauncher({ url, gameName, onClose }: GameLauncherProps) {
  const [fullscreen, setFullscreen] = useState(true);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[90] bg-background flex flex-col"
      >
        {/* Header */}
        <div className="h-12 flex items-center justify-between px-4 bg-card border-b border-border/40 shrink-0">
          <span className="text-sm font-semibold text-foreground truncate">{gameName}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFullscreen(!fullscreen)}
              className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground"
            >
              {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Game iframe */}
        <div className="flex-1 bg-black">
          <iframe
            src={url}
            className="w-full h-full border-0"
            allow="autoplay; fullscreen; clipboard-write"
            allowFullScreen
            title={gameName}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
