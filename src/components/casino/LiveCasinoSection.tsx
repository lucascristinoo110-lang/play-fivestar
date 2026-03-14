import { Tv } from "lucide-react";

const liveGames = [
  { name: "Lightning Roulette", img: "https://img.casinocontentserver.com/lightning-roulette-300x300.jpg" },
  { name: "Crazy Time", img: "https://img.casinocontentserver.com/crazy-time-300x300.jpg" },
  { name: "Mega Ball", img: "https://img.casinocontentserver.com/mega-ball-300x300.jpg" },
  { name: "Blackjack VIP", img: "https://img.casinocontentserver.com/blackjack-vip-300x300.jpg" },
  { name: "Baccarat Live", img: "https://img.casinocontentserver.com/baccarat-live-300x300.jpg" },
  { name: "Dream Catcher", img: "https://img.casinocontentserver.com/dream-catcher-300x300.jpg" },
];

export function LiveCasinoSection() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Tv className="h-5 w-5 text-destructive" />
        <h2 className="text-lg font-bold text-foreground">Ao Vivo</h2>
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive/75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive" />
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {liveGames.map((game, i) => (
          <div
            key={game.name}
            className="group relative aspect-square rounded-xl overflow-hidden card-shadow game-card-hover cursor-pointer bg-secondary"
          >
            <div className="w-full h-full bg-gradient-to-br from-destructive/30 to-primary/10 flex flex-col items-center justify-center gap-2 p-4">
              <Tv className="h-8 w-8 text-destructive/60" />
              <span className="text-xs font-semibold text-foreground text-center leading-tight">{game.name}</span>
              <span className="text-[10px] text-muted-foreground">AO VIVO</span>
            </div>
            <div className="absolute inset-0 bg-background/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-destructive flex items-center justify-center shadow-lg">
                <Tv className="h-5 w-5 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
