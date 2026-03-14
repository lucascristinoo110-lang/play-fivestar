import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

const banners = [
  {
    title: "Sua sorte, nossa tecnologia.",
    subtitle: "342 jogadores ativos agora • Depósito confirmado em 1.2s",
    cta: "Jogar Agora",
    bg: "linear-gradient(135deg, hsl(var(--primary) / 0.3), hsl(var(--accent) / 0.15))",
  },
  {
    title: "Bônus de até 100% no primeiro depósito!",
    subtitle: "Deposite agora e dobre seu saldo para jogar.",
    cta: "Depositar",
    bg: "linear-gradient(135deg, hsl(var(--accent) / 0.3), hsl(var(--primary) / 0.15))",
  },
  {
    title: "Fortune Tiger & Gates of Olympus",
    subtitle: "Os slots mais populares do Brasil estão aqui.",
    cta: "Ver Jogos",
    bg: "linear-gradient(135deg, hsl(var(--destructive) / 0.2), hsl(var(--primary) / 0.15))",
  },
];

export function HeroBanner() {
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => setCurrent(i => (i + 1) % banners.length), []);
  const prev = useCallback(() => setCurrent(i => (i - 1 + banners.length) % banners.length), []);

  useEffect(() => {
    const interval = setInterval(next, 5000);
    return () => clearInterval(interval);
  }, [next]);

  const b = banners[current];

  return (
    <div className="relative rounded-xl overflow-hidden card-shadow">
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="relative h-36 sm:h-48 md:h-56 lg:h-64 flex items-center"
          style={{ background: b.bg }}
        >
          <div className="absolute right-10 top-1/2 -translate-y-1/2 w-32 sm:w-48 h-32 sm:h-48 rounded-full bg-primary/10 blur-3xl" />

          <div className="relative z-10 px-4 sm:px-8">
            <h2 className="text-lg sm:text-2xl md:text-3xl font-bold text-foreground mb-1 sm:mb-2">{b.title}</h2>
            <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 max-w-md">{b.subtitle}</p>
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-xs sm:text-sm">
              {b.cta}
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>

      <button onClick={prev} className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 p-1 sm:p-1.5 rounded-full bg-background/60 backdrop-blur-sm text-foreground hover:bg-background/80 transition">
        <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
      </button>
      <button onClick={next} className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 p-1 sm:p-1.5 rounded-full bg-background/60 backdrop-blur-sm text-foreground hover:bg-background/80 transition">
        <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
      </button>

      <div className="absolute bottom-2 sm:bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        {banners.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-all ${i === current ? "bg-primary w-4 sm:w-6" : "bg-foreground/30"}`}
          />
        ))}
      </div>
    </div>
  );
}
