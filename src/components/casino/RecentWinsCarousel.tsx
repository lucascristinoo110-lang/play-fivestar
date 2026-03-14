const recentWins = [
  { player: "J***a", game: "Fortune Tiger", amount: 1250.0, img: "🐯" },
  { player: "M***o", game: "Gates of Olympus", amount: 3420.5, img: "⚡" },
  { player: "R***s", game: "Sweet Bonanza", amount: 890.0, img: "🍬" },
  { player: "A***a", game: "Aviator", amount: 2100.0, img: "✈️" },
  { player: "L***n", game: "Fortune Rabbit", amount: 670.3, img: "🐰" },
  { player: "P***o", game: "Big Bass Bonanza", amount: 1580.0, img: "🐟" },
];

const items = [...recentWins, ...recentWins];

export function RecentWinsCarousel() {
  return (
    <div className="relative overflow-hidden rounded-xl bg-card border border-border/40 card-shadow py-2 sm:py-3">
      <div className="flex items-center gap-2 px-3 sm:px-4 mb-1.5 sm:mb-2">
        <span className="text-[10px] sm:text-xs font-semibold text-primary uppercase tracking-wider">🏆 Últimos Ganhos</span>
      </div>

      <div className="overflow-hidden">
        <div className="flex gap-2 sm:gap-3 px-3 sm:px-4 marquee-track">
          {items.map((win, i) => (
            <div
              key={`${win.player}-${i}`}
              className="flex-shrink-0 flex items-center gap-1.5 sm:gap-2 bg-secondary/60 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 border border-border/20"
            >
              <span className="text-base sm:text-lg">{win.img}</span>
              <div className="whitespace-nowrap">
                <p className="text-[8px] sm:text-[10px] text-muted-foreground">{win.player} ganhou</p>
                <p className="text-[10px] sm:text-xs font-bold text-primary font-mono">R$ {win.amount.toFixed(2)}</p>
                <p className="text-[8px] sm:text-[9px] text-muted-foreground">{win.game}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
