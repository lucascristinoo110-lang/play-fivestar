import { useMemo, useState } from "react";
import { games } from "@/data/games";
import { GameCard } from "./GameCard";
import { CategoryTabs, type CategoryFilter } from "./CategoryTabs";
import { ProviderTabs, type ProviderFilter } from "./ProviderTabs";

export function GameGrid({ searchQuery }: { searchQuery: string }) {
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [provider, setProvider] = useState<ProviderFilter>("all");

  const filtered = useMemo(() => {
    return games.filter((g) => {
      if (category === "hot" && !g.isHot) return false;
      if (category === "new" && !g.isNew) return false;
      if (category !== "all" && category !== "hot" && category !== "new" && g.category !== category) return false;
      if (provider !== "all" && g.provider !== provider) return false;
      if (searchQuery && !g.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [category, provider, searchQuery]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <CategoryTabs active={category} onChange={setCategory} />
        <ProviderTabs active={provider} onChange={setProvider} />
      </div>

      {filtered.length > 0 ? (
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
