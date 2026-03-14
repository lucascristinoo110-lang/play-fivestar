import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Save, Gamepad2, Plus, Trash2, Edit2, X, Download, Loader2 } from "lucide-react";

type GameRow = {
  id: string;
  name: string;
  provider: string;
  category: string;
  image_url: string | null;
  game_code: string | null;
  is_hot: boolean;
  is_new: boolean;
  is_active: boolean;
  sort_order: number;
};

export default function AdminGamesPage() {
  const [settings, setSettings] = useState<any>(null);
  const [games, setGames] = useState<GameRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editGame, setEditGame] = useState<Partial<GameRow> | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [{ data: s }, { data: g }] = await Promise.all([
      supabase.from("site_settings").select("*").limit(1).single(),
      supabase.from("games").select("*").order("sort_order"),
    ]);
    setSettings(s);
    setGames((g as GameRow[]) || []);
  }

  async function saveProviders() {
    if (!settings) return;
    setLoading(true);
    const { error } = await supabase.from("site_settings").update({
      playfiver_api_key: settings.playfiver_api_key,
      playfiver_api_url: settings.playfiver_api_url,
      igamewin_api_key: settings.igamewin_api_key,
      igamewin_api_url: settings.igamewin_api_url,
    }).eq("id", settings.id);
    setLoading(false);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else toast({ title: "Provedores salvos!" });
  }

  async function saveGame() {
    if (!editGame?.name) return;
    setLoading(true);
    if (editGame.id) {
      await supabase.from("games").update({
        name: editGame.name,
        provider: editGame.provider || "playfiver",
        category: editGame.category || "slots",
        image_url: editGame.image_url,
        game_code: editGame.game_code,
        is_hot: editGame.is_hot || false,
        is_new: editGame.is_new || false,
        is_active: editGame.is_active ?? true,
        sort_order: editGame.sort_order || 0,
      }).eq("id", editGame.id);
    } else {
      await supabase.from("games").insert({
        name: editGame.name,
        provider: editGame.provider || "playfiver",
        category: editGame.category || "slots",
        image_url: editGame.image_url,
        game_code: editGame.game_code,
        is_hot: editGame.is_hot || false,
        is_new: editGame.is_new || false,
        sort_order: editGame.sort_order || 0,
      });
    }
    setLoading(false);
    setEditGame(null);
    setShowForm(false);
    toast({ title: "Jogo salvo!" });
    loadData();
  }

  async function deleteGame(id: string) {
    await supabase.from("games").delete().eq("id", id);
    toast({ title: "Jogo removido" });
    loadData();
  }

  if (!settings) return <p className="text-muted-foreground">Carregando...</p>;

  const field = (label: string, key: string, placeholder: string) => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input value={settings[key] ?? ""} onChange={e => setSettings({ ...settings, [key]: e.target.value })} placeholder={placeholder} className="bg-secondary border-border/40 h-9 text-sm font-mono" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Provider settings */}
      <div className="max-w-2xl space-y-6">
        <div className="rounded-xl bg-card border border-border/40 p-6 card-shadow space-y-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Gamepad2 className="h-4 w-4 text-primary" />
            Provedor: Playfiver
          </h2>
          <p className="text-xs text-muted-foreground">Configure Client ID, Secret e Webhook URL da Playfiver para que os jogos funcionem.</p>
          {field("Client ID / API Key", "playfiver_api_key", "Seu client_id")}
          {field("URL da API / Webhook", "playfiver_api_url", "https://api.playfiver.com")}
        </div>

        <div className="rounded-xl bg-card border border-border/40 p-6 card-shadow space-y-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Gamepad2 className="h-4 w-4 text-accent" />
            Provedor: iGameWin
          </h2>
          {field("API Key", "igamewin_api_key", "Sua chave API")}
          {field("URL da API", "igamewin_api_url", "https://api.igamewin.com")}
        </div>

        <Button onClick={saveProviders} disabled={loading} className="bg-primary text-primary-foreground font-semibold">
          <Save className="h-4 w-4 mr-2" />
          Salvar Provedores
        </Button>
      </div>

      {/* Games management */}
      <div className="rounded-xl bg-card border border-border/40 p-6 card-shadow space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Jogos Cadastrados ({games.length})</h2>
          <Button size="sm" onClick={() => { setEditGame({ provider: "playfiver", category: "slots", is_active: true }); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar Jogo
          </Button>
        </div>

        {/* Game form */}
        {showForm && editGame && (
          <div className="rounded-lg bg-secondary/50 border border-border/40 p-4 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-semibold">{editGame.id ? "Editar Jogo" : "Novo Jogo"}</h3>
              <button onClick={() => { setShowForm(false); setEditGame(null); }}><X className="h-4 w-4 text-muted-foreground" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Nome</Label>
                <Input value={editGame.name || ""} onChange={e => setEditGame({ ...editGame, name: e.target.value })} className="h-8 text-xs bg-secondary" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Provedor</Label>
                <select value={editGame.provider || "playfiver"} onChange={e => setEditGame({ ...editGame, provider: e.target.value })} className="h-8 w-full rounded-md border border-border/40 bg-secondary text-xs px-2">
                  <option value="playfiver">Playfiver</option>
                  <option value="igamewin">iGameWin</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Categoria</Label>
                <select value={editGame.category || "slots"} onChange={e => setEditGame({ ...editGame, category: e.target.value })} className="h-8 w-full rounded-md border border-border/40 bg-secondary text-xs px-2">
                  <option value="slots">Slots</option>
                  <option value="crash">Crash</option>
                  <option value="live">Ao Vivo</option>
                  <option value="table">Mesa</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Código do Jogo</Label>
                <Input value={editGame.game_code || ""} onChange={e => setEditGame({ ...editGame, game_code: e.target.value })} className="h-8 text-xs bg-secondary" placeholder="ex: fortune-tiger" />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">URL da Imagem</Label>
                <Input value={editGame.image_url || ""} onChange={e => setEditGame({ ...editGame, image_url: e.target.value })} className="h-8 text-xs bg-secondary" placeholder="https://..." />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Ordem</Label>
                <Input type="number" value={editGame.sort_order ?? 0} onChange={e => setEditGame({ ...editGame, sort_order: parseInt(e.target.value) || 0 })} className="h-8 text-xs bg-secondary" />
              </div>
              <div className="flex items-center gap-4 pt-4">
                <label className="flex items-center gap-1.5 text-xs">
                  <input type="checkbox" checked={editGame.is_hot || false} onChange={e => setEditGame({ ...editGame, is_hot: e.target.checked })} /> Hot
                </label>
                <label className="flex items-center gap-1.5 text-xs">
                  <input type="checkbox" checked={editGame.is_new || false} onChange={e => setEditGame({ ...editGame, is_new: e.target.checked })} /> Novo
                </label>
                <label className="flex items-center gap-1.5 text-xs">
                  <input type="checkbox" checked={editGame.is_active ?? true} onChange={e => setEditGame({ ...editGame, is_active: e.target.checked })} /> Ativo
                </label>
              </div>
            </div>
            <Button size="sm" onClick={saveGame} disabled={loading} className="bg-primary text-primary-foreground">
              <Save className="h-3 w-3 mr-1" /> Salvar Jogo
            </Button>
          </div>
        )}

        {/* Games list */}
        <div className="overflow-hidden rounded-lg border border-border/20">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/40 text-muted-foreground bg-secondary/30">
                <th className="text-left p-2 font-medium">Nome</th>
                <th className="text-left p-2 font-medium">Provedor</th>
                <th className="text-left p-2 font-medium">Categoria</th>
                <th className="text-left p-2 font-medium">Status</th>
                <th className="text-left p-2 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {games.map(g => (
                <tr key={g.id} className="border-b border-border/20 hover:bg-surface-hover transition-colors">
                  <td className="p-2 text-foreground font-medium">{g.name}</td>
                  <td className="p-2 text-muted-foreground capitalize">{g.provider}</td>
                  <td className="p-2 text-muted-foreground capitalize">{g.category}</td>
                  <td className="p-2">
                    <span className={`text-[10px] font-semibold ${g.is_active ? "text-primary" : "text-destructive"}`}>
                      {g.is_active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="p-2 flex gap-1">
                    <button onClick={() => { setEditGame(g); setShowForm(true); }} className="p-1 hover:bg-secondary rounded">
                      <Edit2 className="h-3 w-3 text-muted-foreground" />
                    </button>
                    <button onClick={() => deleteGame(g.id)} className="p-1 hover:bg-destructive/10 rounded">
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {games.length === 0 && <p className="p-4 text-center text-sm text-muted-foreground">Nenhum jogo cadastrado.</p>}
        </div>
      </div>
    </div>
  );
}
