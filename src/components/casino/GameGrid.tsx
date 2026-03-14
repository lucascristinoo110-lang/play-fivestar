import { useMemo, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { GameCard } from "./GameCard";
import { CategoryTabs, type CategoryFilter } from "./CategoryTabs";
import { GameLauncher } from "./GameLauncher";
import { toast } from "@/hooks/use-toast";

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
  const { user } = useAuth();
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [launchUrl, setLaunchUrl] = useState<string | null>(null);
  const [launchName, setLaunchName] = useState("");
  const [launching, setLaunching] = useState(false);

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
      if (searchQuery && !g.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [category, searchQuery, games]);

  async function handlePlay(game: Game) {
    if (!user) {
      toast({ title: "Faça login para jogar", description: "Você precisa estar logado para jogar.", variant: "destructive" });
      return;
    }

    if (!game.game_code) {
      toast({ title: "Jogo indisponível", description: "Este jogo não possui código configurado.", variant: "destructive" });
      return;
    }

    setLaunching(true);
    try {
      const { data, error } = await supabase.functions.invoke("playfiver-api", {
        body: {
          action: "launch_game",
          user_id: user.id,
          game_code: game.game_code,
          provider: game.provider,
        },
      });

      if (error || !data?.launch_url) {
        throw new Error(data?.error || "Erro ao abrir o jogo");
      }

      setLaunchName(data.name || game.name);
      setLaunchUrl(data.launch_url);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
    setLaunching(false);
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CategoryTabs active={category} onChange={setCategory} />
        </div>

        {loading ? (
          <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-xl shimmer" />
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
            {filtered.map((game, i) => (
              <GameCard key={game.id} game={game} index={i} onPlay={handlePlay} />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
            Nenhum jogo encontrado.
          </div>
        )}
      </div>

      {/* Game Launcher */}
      {launchUrl && (
        <GameLauncher
          url={launchUrl}
          gameName={launchName}
          onClose={() => setLaunchUrl(null)}
        />
      )}

      {/* Launching overlay */}
      {launching && (
        <div className="fixed inset-0 z-[80] bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-foreground font-semibold">Carregando jogo...</p>
          </div>
        </div>
      )}
    </>
  );
}
