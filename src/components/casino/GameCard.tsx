import { Play, Flame, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

type GameData = {
  id: string;
  name: string;
  provider: string;
  category: string;
  image_url: string | null;
  is_hot: boolean;
  is_new: boolean;
};

export function GameCard({ game, index }: { game: GameData; index: number }) {
  // Fallback gradient for games without images
  const gradients = [
    "from-purple-600 to-blue-600",
    "from-red-600 to-orange-500",
    "from-green-600 to-teal-500",
    "from-pink-600 to-rose-500",
    "from-indigo-600 to-violet-500",
    "from-amber-600 to-yellow-500",
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.03 }}
      className="group relative rounded-xl overflow-hidden card-shadow game-card-hover cursor-pointer"
    >
      {/* Image */}
      <div className="aspect-[3/4] overflow-hidden">
        {game.image_url ? (
          <img
            src={game.image_url}
            alt={game.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
              (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
            }}
          />
        ) : null}
        <div className={`${game.image_url ? "hidden" : ""} w-full h-full bg-gradient-to-br ${gradients[index % gradients.length]} flex items-center justify-center`}>
          <span className="text-3xl font-bold text-white/80">{game.name.charAt(0)}</span>
        </div>
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg">
          <Play className="h-5 w-5 text-primary-foreground ml-0.5" />
        </div>
      </div>

      {/* Badges */}
      {game.is_hot && (
        <span className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-destructive/90 text-destructive-foreground text-[10px] font-bold uppercase">
          <Flame className="h-3 w-3" /> Hot
        </span>
      )}
      {game.is_new && !game.is_hot && (
        <span className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/90 text-primary-foreground text-[10px] font-bold uppercase">
          <Sparkles className="h-3 w-3" /> Novo
        </span>
      )}

      {/* Info */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/95 to-transparent p-3 pt-8">
        <p className="text-xs font-semibold text-foreground truncate">{game.name}</p>
        <p className="text-[10px] text-muted-foreground capitalize">{game.provider}</p>
      </div>
    </motion.div>
  );
}
