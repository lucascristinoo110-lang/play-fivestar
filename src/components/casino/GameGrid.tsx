import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { GameCard } from "./GameCard";
import { GamePage } from "./GamePage";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

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
  source?: string;
};

type FilterType = "hot" | "new" | "slots" | "live" | "table" | "crash" | "roulette" | null;

type GameSection = {
  id: string;
  title: string;
  subtitle: string;
  games: Game[];
};

type QueryMode = "featured" | "search" | "filter";

const GAME_FIELDS = "id,name,provider,category,image_url,game_code,is_hot,is_new,sort_order";

function normalizeImageUrl(url: string | null) {
  if (!url) return null;
  const [base, search = ""] = url.split("?");
  if (base.includes("imagensfivers.com") && /\.(png|jpe?g)$/i.test(base)) {
    const webp = base.replace(/\.(png|jpe?g)$/i, ".webp");
    return `${webp}${search ? `?${search}` : ""}`;
  }
  return url;
}

function normalizeGames(data: any[] | null | undefined): Game[] {
  return (data || []).map((game) => ({
    id: String(game.id),
    name: String(game.name || ""),
    provider: String(game.provider || ""),
    category: String(game.category || "slots"),
    image_url: normalizeImageUrl(game.image_url || null),
    game_code: game.game_code || null,
    is_hot: Boolean(game.is_hot),
    is_new: Boolean(game.is_new),
    sort_order: Number(game.sort_order || 0),
  }));
}

function getFilterTitle(filter: FilterType) {
  switch (filter) {
    case "hot": return "Mais Jogados";
    case "new": return "Novos Jogos";
    case "slots": return "Slots em Destaque";
    case "live": return "Cassino ao Vivo";
    case "table": return "Jogos de Mesa";
    case "crash": return "Crash em Alta";
    case "roulette": return "Roletas";
    default: return "Jogos";
  }
}

export function GameGrid({ searchQuery, forcedFilter, onSearch }: { searchQuery: string; forcedFilter?: FilterType; onSearch?: (q: string) => void }) {
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const [mode, setMode] = useState<QueryMode>("featured");
  const [loading, setLoading] = useState(true);
  const [featuredSections, setFeaturedSections] = useState<GameSection[]>([]);
  const [filteredGames, setFilteredGames] = useState<Game[]>([]);

  const [launchUrl, setLaunchUrl] = useState<string | null>(null);
  const [launchName, setLaunchName] = useState("");
  const [launchProvider, setLaunchProvider] = useState("");
  const [launchImage, setLaunchImage] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);

  const trimmedSearch = useMemo(() => searchQuery.trim(), [searchQuery]);

  useEffect(() => {
    let cancelled = false;

    async function loadFeatured() {
      setMode("featured");
      setLoading(true);

      // Load sections from DB
      const { data: dbSections } = await supabase
        .from("home_sections")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");

      if (cancelled || !dbSections || dbSections.length === 0) {
        if (!cancelled) setLoading(false);
        return;
      }

      const imageFilter = (q: any) => q.not("image_url", "is", null).neq("image_url", "");

      const loadedSections = await Promise.all(
        dbSections.map(async (section: any) => {
          let games: Game[] = [];

          if (section.section_type === "curated" && section.curated_game_codes?.length) {
            const { data } = await supabase
              .from("games")
              .select(GAME_FIELDS)
              .eq("is_active", true)
              .in("game_code", section.curated_game_codes);

            const normalized = normalizeGames(data);
            const codeOrder = new Map((section.curated_game_codes as string[]).map((c: string, i: number) => [c, i]));
            normalized.sort((a, b) => (codeOrder.get(a.game_code || "") ?? 99) - (codeOrder.get(b.game_code || "") ?? 99));
            games = normalized;
          } else {
            // filter type
            let query = supabase.from("games").select(GAME_FIELDS).eq("is_active", true);
            query = imageFilter(query);

            if (section.filter_is_hot) query = query.eq("is_hot", true);
            if (section.filter_is_new) query = query.eq("is_new", true);
            if (section.filter_category) query = query.eq("category", section.filter_category);

            const { data } = await query.order("sort_order").limit(section.max_games || 12);
            games = normalizeGames(data);
          }

          return {
            id: section.id,
            title: section.title,
            subtitle: section.subtitle || "",
            games,
          };
        })
      );

      if (cancelled) return;
      setFeaturedSections(loadedSections.filter((s) => s.games.length > 0));
      setLoading(false);
    }

    async function loadByFilter(filter: FilterType) {
      setMode("filter");
      setLoading(true);

      let query = supabase.from("games").select(GAME_FIELDS).eq("is_active", true).not("image_url", "is", null).neq("image_url", "");
      if (filter === "hot") query = query.eq("is_hot", true);
      else if (filter === "new") query = query.eq("is_new", true);
      else if (filter) query = query.eq("category", filter);

      const { data } = await query.order("sort_order").limit(48);
      if (cancelled) return;

      setFilteredGames(normalizeGames(data));
      setLoading(false);
    }

    async function loadSearch(queryText: string) {
      setMode("search");
      setLoading(true);

      const { data } = await supabase
        .from("games")
        .select(GAME_FIELDS)
        .eq("is_active", true)
        .not("image_url", "is", null)
        .neq("image_url", "")
        .ilike("name", `%${queryText}%`)
        .order("is_hot", { ascending: false })
        .order("sort_order")
        .limit(60);

      if (cancelled) return;

      setFilteredGames(normalizeGames(data));
      setLoading(false);
    }

    const debounce = setTimeout(() => {
      if (trimmedSearch.length >= 2) {
        loadSearch(trimmedSearch);
        return;
      }
      if (forcedFilter) {
        loadByFilter(forcedFilter);
        return;
      }
      loadFeatured();
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(debounce);
    };
  }, [trimmedSearch, forcedFilter]);

  function removeGameFromCatalog(gameId: string) {
    setFeaturedSections((sections) =>
      sections
        .map((section) => ({ ...section, games: section.games.filter((item) => item.id !== gameId) }))
        .filter((section) => section.games.length > 0)
    );
    setFilteredGames((games) => games.filter((item) => item.id !== gameId));
  }

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
      const response = await supabase.functions.invoke("playfiver-api", {
        body: { action: "launch_game", user_id: user.id, game_code: game.game_code, provider: game.provider },
      });

      const data = response.data;
      const fnError = response.error;
      let gameDeactivated = false;

      if (fnError) {
        let errorMessage = "Erro ao abrir o jogo";
        try {
          const ctx = (fnError as any)?.context;
          if (ctx && typeof ctx.json === "function") {
            const body = await ctx.json();
            errorMessage = body?.error || body?.provider_message || errorMessage;
            gameDeactivated = Boolean(body?.game_deactivated);
          } else if (typeof (fnError as any)?.message === "string") {
            const msgMatch = (fnError as any).message;
            try {
              const parsed = JSON.parse(msgMatch);
              errorMessage = parsed?.error || parsed?.provider_message || errorMessage;
              gameDeactivated = Boolean(parsed?.game_deactivated);
            } catch {
              errorMessage = msgMatch || errorMessage;
            }
          }
        } catch { /* fallback */ }

        if (gameDeactivated) removeGameFromCatalog(game.id);
        throw new Error(errorMessage);
      }

      if (!data?.launch_url) {
        if (data?.game_deactivated) removeGameFromCatalog(game.id);
        throw new Error(data?.error || data?.provider_message || "Erro ao abrir o jogo");
      }

      setLaunchName(data.name || game.name);
      setLaunchProvider(game.provider);
      setLaunchImage(game.image_url);
      setLaunchUrl(data.launch_url);
    } catch (err: any) {
      toast({
        title: err.message?.includes("removido temporariamente") ? "Jogo indisponível" : "Erro",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLaunching(false);
    }
  }

  const skeletonGrid = (
    <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="aspect-[3/4] rounded-xl shimmer" />
      ))}
    </div>
  );

  return (
    <>
      <div className="space-y-5">
        {isMobile && onSearch && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar jogos..."
              className="pl-10 bg-secondary border-border/40 text-sm h-9 focus-visible:ring-primary/30"
              onChange={(e) => onSearch(e.target.value)}
            />
          </div>
        )}

        {!trimmedSearch && (
          <p className="text-xs text-muted-foreground">
            Exibindo apenas sessões principais para performance no mobile. Pesquise com 2+ letras para acessar o catálogo completo.
          </p>
        )}

        {loading ? (
          skeletonGrid
        ) : mode === "featured" ? (
          <div className="space-y-6">
            {featuredSections.map((section) => (
              <section key={section.id} className="space-y-2">
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-foreground">{section.title}</h2>
                  <p className="text-[11px] sm:text-xs text-muted-foreground">{section.subtitle}</p>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
                  {section.games.map((game, i) => (
                    <GameCard key={`${section.id}-${game.id}`} game={game} index={i} onPlay={handlePlay} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : filteredGames.length > 0 ? (
          <section className="space-y-2">
            <h2 className="text-sm sm:text-base font-bold text-foreground">
              {mode === "search" ? `Resultado para "${trimmedSearch}"` : getFilterTitle(forcedFilter || null)}
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
              {filteredGames.map((game, i) => (
                <GameCard key={game.id} game={game} index={i} onPlay={handlePlay} />
              ))}
            </div>
          </section>
        ) : (
          <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
            Nenhum jogo encontrado.
          </div>
        )}
      </div>

      {launchUrl && <GamePage url={launchUrl} gameName={launchName} provider={launchProvider} imageUrl={launchImage} onClose={() => setLaunchUrl(null)} />}

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
