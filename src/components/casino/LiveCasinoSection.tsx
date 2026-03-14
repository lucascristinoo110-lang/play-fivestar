import { Tv } from "lucide-react";

const liveGames = [
  { name: "Lightning Roulette", emoji: "⚡" },
  { name: "Crazy Time", emoji: "🎡" },
  { name: "Mega Ball", emoji: "🎱" },
  { name: "Blackjack VIP", emoji: "🃏" },
  { name: "Baccarat Live", emoji: "🎴" },
  { name: "Dream Catcher", emoji: "🌈" },
];

export function LiveCasinoSection() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Tv className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />
        <h2 className="text-base sm:text-lg font-bold text-foreground">Ao Vivo</h2>
        <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive/75" />
          <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-destructive" />
        </span>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
        {liveGames.map((game) => (
          <div
            key={game.name}
            className="group relative aspect-square rounded-xl overflow-hidden card-shadow game-card-hover cursor-pointer bg-secondary"
          >
            <div className="w-full h-full bg-gradient-to-br from-destructive/30 to-primary/10 flex flex-col items-center justify-center gap-1.5 sm:gap-2 p-2 sm:p-4">
              <span className="text-2xl sm:text-3xl">{game.emoji}</span>
              <span className="text-[10px] sm:text-xs font-semibold text-foreground text-center leading-tight">{game.name}</span>
              <span className="text-[8px] sm:text-[10px] text-muted-foreground">AO VIVO</span>
            </div>
            <div className="absolute inset-0 bg-background/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-destructive flex items-center justify-center shadow-lg">
                <Tv className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
