import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Search, X, Plus, Image } from "lucide-react";

type GameRow = {
  id: string;
  name: string;
  image_url: string | null;
  game_code: string | null;
  provider: string;
  category: string;
  is_active: boolean;
};

interface GamePickerProps {
  allGames: GameRow[];
  selectedCodes: string[];
  onCodesChange: (codes: string[]) => void;
  light: boolean;
}

export default function GamePickerForSection({ allGames, selectedCodes, onCodesChange, light }: GamePickerProps) {
  const [search, setSearch] = useState("");

  const selectedGames = useMemo(
    () => selectedCodes.map(code => allGames.find(g => g.game_code === code)).filter(Boolean) as GameRow[],
    [selectedCodes, allGames]
  );

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return allGames
      .filter(g => g.game_code && !selectedCodes.includes(g.game_code))
      .filter(g => g.name.toLowerCase().includes(q) || (g.game_code || "").toLowerCase().includes(q) || g.provider.toLowerCase().includes(q))
      .slice(0, 20);
  }, [search, allGames, selectedCodes]);

  function addGame(code: string) {
    if (!selectedCodes.includes(code)) {
      onCodesChange([...selectedCodes, code]);
    }
    setSearch("");
  }

  function removeGame(code: string) {
    onCodesChange(selectedCodes.filter(c => c !== code));
  }

  return (
    <div className="space-y-3">
      {/* Search to add */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar jogo para adicionar..."
          className={cn("pl-8 h-8 text-xs", light ? "bg-gray-50 border-gray-200" : "bg-secondary border-border/40")}
        />
      </div>

      {/* Search results dropdown */}
      {searchResults.length > 0 && (
        <div className={cn("rounded-lg border max-h-48 overflow-y-auto", light ? "bg-white border-gray-200 shadow-sm" : "bg-card border-border/40")}>
          {searchResults.map(g => (
            <button
              key={g.id}
              type="button"
              onClick={() => addGame(g.game_code!)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-left transition-colors",
                light ? "hover:bg-gray-50 border-b border-gray-100 last:border-0" : "hover:bg-secondary/50 border-b border-border/20 last:border-0"
              )}
            >
              {g.image_url ? (
                <img src={g.image_url} alt="" className="w-7 h-7 rounded object-cover shrink-0" />
              ) : (
                <div className={cn("w-7 h-7 rounded flex items-center justify-center shrink-0", light ? "bg-gray-100" : "bg-secondary")}>
                  <Image className="h-3 w-3 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className={cn("text-xs font-medium truncate", light ? "text-gray-900" : "text-foreground")}>{g.name}</p>
                <p className={cn("text-[10px] truncate", light ? "text-gray-400" : "text-muted-foreground")}>
                  {g.provider} · {g.game_code}
                </p>
              </div>
              <Plus className="h-3.5 w-3.5 text-primary shrink-0" />
            </button>
          ))}
        </div>
      )}

      {search.trim() && searchResults.length === 0 && (
        <p className={cn("text-[10px] text-center py-2", light ? "text-gray-400" : "text-muted-foreground")}>
          Nenhum jogo encontrado.
        </p>
      )}

      {/* Selected games list */}
      {selectedGames.length > 0 && (
        <div className="space-y-1">
          <p className={cn("text-[10px] font-medium", light ? "text-gray-500" : "text-muted-foreground")}>
            {selectedGames.length} jogo(s) na seção
          </p>
          <div className={cn("rounded-lg border divide-y max-h-52 overflow-y-auto", light ? "bg-white border-gray-200 divide-gray-100" : "bg-card border-border/40 divide-border/20")}>
            {selectedGames.map(g => (
              <div key={g.game_code} className={cn("flex items-center gap-2 px-3 py-1.5", light ? "hover:bg-gray-50" : "hover:bg-secondary/30")}>
                {g.image_url ? (
                  <img src={g.image_url} alt="" className="w-6 h-6 rounded object-cover shrink-0" />
                ) : (
                  <div className={cn("w-6 h-6 rounded flex items-center justify-center shrink-0", light ? "bg-gray-100" : "bg-secondary")}>
                    <Image className="h-2.5 w-2.5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className={cn("text-[11px] font-medium truncate", light ? "text-gray-900" : "text-foreground")}>{g.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeGame(g.game_code!)}
                  className="p-1 rounded hover:bg-destructive/10 shrink-0"
                >
                  <X className="h-3 w-3 text-destructive" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedGames.length === 0 && (
        <p className={cn("text-[10px] text-center py-3 rounded-lg border border-dashed", light ? "text-gray-400 border-gray-200" : "text-muted-foreground border-border/40")}>
          Nenhum jogo adicionado. Use a busca acima para adicionar.
        </p>
      )}
    </div>
  );
}
