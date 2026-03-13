import { motion } from "framer-motion";

const recentWins = [
  { player: "J***a", game: "Fortune Tiger", amount: 1250.00, img: "🐯" },
  { player: "M***o", game: "Gates of Olympus", amount: 3420.50, img: "⚡" },
  { player: "R***s", game: "Sweet Bonanza", amount: 890.00, img: "🍬" },
  { player: "A***a", game: "Aviator", amount: 2100.00, img: "✈️" },
  { player: "L***n", game: "Fortune Rabbit", amount: 670.30, img: "🐰" },
  { player: "P***o", game: "Big Bass Bonanza", amount: 1580.00, img: "🐟" },
  { player: "C***a", game: "Fortune Mouse", amount: 450.00, img: "🐭" },
  { player: "D***s", game: "Mines", amount: 980.00, img: "💎" },
  { player: "F***a", game: "Book of Dead", amount: 2350.00, img: "📖" },
  { player: "T***o", game: "Dog House", amount: 1120.00, img: "🐕" },
];

// Duplicate for seamless loop
const items = [...recentWins, ...recentWins];

export function RecentWinsCarousel() {
  return (
    <div className="relative overflow-hidden rounded-xl bg-card border border-border/40 card-shadow py-3">
      <div className="flex items-center gap-2 px-4 mb-2">
        <span className="text-xs font-semibold text-primary uppercase tracking-wider">🏆 Últimos Ganhos</span>
      </div>
      <div className="overflow-hidden">
        <motion.div
          className="flex gap-3 px-4"
          animate={{ x: [0, -50 * recentWins.length * 4] }}
          transition={{
            x: { repeat: Infinity, repeatType: "loop", duration: 30, ease: "linear" },
          }}
        >
          {items.map((win, i) => (
            <div
              key={i}
              className="flex-shrink-0 flex items-center gap-2 bg-secondary/60 rounded-lg px-3 py-2 border border-border/20"
            >
              <span className="text-lg">{win.img}</span>
              <div className="whitespace-nowrap">
                <p className="text-[10px] text-muted-foreground">{win.player} ganhou</p>
                <p className="text-xs font-bold text-primary font-mono">R$ {win.amount.toFixed(2)}</p>
                <p className="text-[9px] text-muted-foreground">{win.game}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
