import { forwardRef } from "react";
import { Play, Flame, Sparkles } from "lucide-react";

type GameData = {
  id: string;
  name: string;
  provider: string;
  category: string;
  image_url: string | null;
  game_code: string | null;
  is_hot: boolean;
  is_new: boolean;
};

type GameCardProps = {
  game: GameData;
  index: number;
  onPlay?: (game: GameData) => void;
};

export const GameCard = forwardRef<HTMLDivElement, GameCardProps>(({ game, onPlay }, ref) => {
  return (
    <div
      ref={ref}
      className="group relative rounded-xl overflow-hidden card-shadow game-card-hover cursor-pointer"
      onClick={() => onPlay?.(game)}
    >
      <div className="aspect-[3/4] overflow-hidden bg-secondary">
        {game.image_url ? (
          <img
            src={game.image_url}
            alt={game.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            decoding="async"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
              (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
            }}
          />
        ) : null}
        <div className={`${game.image_url ? "hidden" : ""} w-full h-full bg-secondary flex items-center justify-center`}>
          <span className="text-2xl sm:text-3xl font-bold text-foreground/70">{game.name.charAt(0)}</span>
        </div>
      </div>

      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary flex items-center justify-center shadow-lg">
          <Play className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground ml-0.5" />
        </div>
      </div>

      {game.is_hot && (
        <span className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-destructive/90 text-destructive-foreground text-[8px] sm:text-[10px] font-bold uppercase">
          <Flame className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> Hot
        </span>
      )}
      {game.is_new && !game.is_hot && (
        <span className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-primary/90 text-primary-foreground text-[8px] sm:text-[10px] font-bold uppercase">
          <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> Novo
        </span>
      )}

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/95 to-transparent p-2 sm:p-3 pt-6 sm:pt-8">
        <p className="text-[10px] sm:text-xs font-semibold text-foreground truncate">{game.name}</p>
      </div>
    </div>
  );
});

GameCard.displayName = "GameCard";
