import { useMemo, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GameCard } from "./GameCard";
import { CategoryTabs, type CategoryFilter } from "./CategoryTabs";
import { ProviderTabs, type ProviderFilter } from "./ProviderTabs";

type Game = {
  id: string;
  name: string;
  provider: string;
  category: string;
  image_url: string | null;
  game_code: string | null;
  is_hot: boolean;
  is_new: boolean;
  sort_order: number;
};

export function GameGrid({ searchQuery }: { searchQuery: string }) {
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [provider, setProvider] = useState<ProviderFilter>("all");
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("games")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => {
        setGames((data as Game[]) || []);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    return games.filter((g) => {
      if (category === "hot" && !g.is_hot) return false;
      if (category === "new" && !g.is_new) return false;
      if (category !== "all" && category !== "hot" && category !== "new" && g.category !== category) return false;
      if (provider !== "all" && g.provider !== provider) return false;
      if (searchQuery && !g.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [category, provider, searchQuery, games]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <CategoryTabs active={category} onChange={setCategory} />
        <ProviderTabs active={provider} onChange={setProvider} />
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] rounded-xl shimmer" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filtered.map((game, i) => (
            <GameCard key={game.id} game={game} index={i} />
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
          Nenhum jogo encontrado.
        </div>
      )}
    </div>
  );
}
