import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { useOutletContext } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Save, Gamepad2, Plus, Trash2, Edit2, Download, Loader2, Upload, Search, Image, Copy, Check, LayoutGrid } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AdminSectionsManager from "@/components/admin/AdminSectionsManager";

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

const CATEGORIES = [
  { value: "slots", label: "Slots" },
  { value: "crash", label: "Crash" },
  { value: "live", label: "Cassino ao Vivo" },
  { value: "table", label: "Mesa" },
  { value: "roulette", label: "Roletas" },
  { value: "fish", label: "Fish" },
  { value: "arcade", label: "Arcade" },
  { value: "virtual", label: "Virtual" },
  { value: "bingo", label: "Bingo" },
  { value: "pgsoft", label: "PG Soft" },
  { value: "evolution", label: "Evolution" },
];

function splitPlayfiverCredential(value?: string | null) {
  const raw = value?.trim() ?? "";
  const separatorIndex = raw.indexOf(":");
  if (!raw) return { token: "", secret: "" };
  if (separatorIndex === -1) return { token: raw, secret: "" };
  return { token: raw.slice(0, separatorIndex).trim(), secret: raw.slice(separatorIndex + 1).trim() };
}

export default function AdminGamesPage() {
  const { light } = useOutletContext<{ light: boolean }>();
  const [settings, setSettings] = useState<any>(null);
  const [games, setGames] = useState<GameRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importingIgamewin, setImportingIgamewin] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editGame, setEditGame] = useState<Partial<GameRow> | null>(null);
  const [playfiverToken, setPlayfiverToken] = useState("");
  const [playfiverSecret, setPlayfiverSecret] = useState("");
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterProvider, setFilterProvider] = useState("all");
  const [uploading, setUploading] = useState(false);
  const [copiedCallback, setCopiedCallback] = useState(false);

  const callbackUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/playfiver-webhook`;

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [{ data: s }, { data: g }] = await Promise.all([
      supabase.from("site_settings").select("*").limit(1).single(),
      supabase.from("games").select("*").order("sort_order"),
    ]);
    setSettings(s);
    setGames((g as GameRow[]) || []);
    const parsed = splitPlayfiverCredential(s?.playfiver_api_key);
    setPlayfiverToken(parsed.token);
    setPlayfiverSecret(parsed.secret);
  }

  const hasPlayfiverCredential = useMemo(
    () => Boolean(playfiverToken.trim() && playfiverSecret.trim()),
    [playfiverToken, playfiverSecret],
  );

  async function saveProviders() {
    if (!settings) return;
    if ((playfiverToken.trim() && !playfiverSecret.trim()) || (!playfiverToken.trim() && playfiverSecret.trim())) {
      toast({ title: "Credencial incompleta", description: "Preencha Agent Token e Secret Key para salvar a Playfiver.", variant: "destructive" });
      return;
    }
    const playfiverCredential = hasPlayfiverCredential ? `${playfiverToken.trim()}:${playfiverSecret.trim()}` : null;
    setLoading(true);
    const { error } = await supabase.from("site_settings").update({
      playfiver_api_key: playfiverCredential,
      playfiver_api_url: settings.playfiver_api_url,
      igamewin_api_key: settings.igamewin_api_key,
      igamewin_api_url: settings.igamewin_api_url,
    }).eq("id", settings.id);
    setLoading(false);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Provedores salvos!" });
    loadData();
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editGame) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `games/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("site-assets").upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "Erro no upload", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("site-assets").getPublicUrl(path);
    setEditGame({ ...editGame, image_url: urlData.publicUrl });
    setUploading(false);
    toast({ title: "Imagem enviada!" });
  }

  async function saveGame() {
    if (!editGame?.name) return;
    setLoading(true);
    const payload = {
      name: editGame.name,
      provider: editGame.provider || "playfiver",
      category: editGame.category || "slots",
      image_url: editGame.image_url,
      game_code: editGame.game_code,
      is_hot: editGame.is_hot || false,
      is_new: editGame.is_new || false,
      is_active: editGame.is_active ?? true,
      sort_order: editGame.sort_order || 0,
    };

    if (editGame.id) {
      const { error } = await supabase.from("games").update(payload).eq("id", editGame.id);
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); setLoading(false); return; }
    } else {
      const { error } = await supabase.from("games").insert(payload);
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); setLoading(false); return; }
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

  async function importFromPlayfiver() {
    if (!hasPlayfiverCredential) {
      toast({ title: "Credenciais ausentes", description: "Preencha Agent Token e Secret Key da Playfiver antes de importar.", variant: "destructive" });
      return;
    }
    setImporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("playfiver-api", { body: { action: "sync_games" } });
      if (error || !data?.status) throw new Error(data?.error || "Erro ao importar jogos da Playfiver");
      toast({ title: "Importação concluída", description: `${data.imported} novos e ${data.updated} atualizados (${data.total_received} recebidos).` });
      loadData();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
    setImporting(false);
  }

  async function importFromIgamewin() {
    if (!settings?.igamewin_api_key || !settings?.igamewin_api_url) {
      toast({ title: "Credenciais ausentes", description: "Configure API Key e URL da iGameWin antes de importar.", variant: "destructive" });
      return;
    }
    setImportingIgamewin(true);
    try {
      const { data, error } = await supabase.functions.invoke("igamewin-api", { body: { action: "sync_games" } });
      if (error || !data?.status) throw new Error(data?.error || "Erro ao importar jogos da iGameWin");
      toast({ title: "Importação concluída", description: `${data.imported} novos e ${data.updated} atualizados (${data.total_received} recebidos).` });
      loadData();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
    setImportingIgamewin(false);
  }

  const filtered = games.filter(g => {
    const matchSearch = g.name.toLowerCase().includes(search.toLowerCase()) || (g.game_code || "").toLowerCase().includes(search.toLowerCase());
    const matchCategory = filterCategory === "all" || g.category === filterCategory;
    const matchProvider = filterProvider === "all" || g.provider.toLowerCase().includes(filterProvider.toLowerCase());
    return matchSearch && matchCategory && matchProvider;
  });

  if (!settings) return <p className={cn("text-sm", light ? "text-gray-400" : "text-muted-foreground")}>Carregando...</p>;

  const cardClass = cn("rounded-xl border p-6 space-y-4", light ? "bg-white border-gray-200 shadow-sm" : "bg-card border-border/40 card-shadow");
  const inputClass = cn("h-9 text-sm font-mono", light ? "bg-gray-50 border-gray-200" : "bg-secondary border-border/40");
  const selectClass = cn("h-9 w-full rounded-md border text-sm px-3", light ? "bg-gray-50 border-gray-200 text-gray-900" : "bg-secondary border-border/40 text-foreground");
  const sectionClass = cn("rounded-xl border overflow-hidden", light ? "bg-white border-gray-200 shadow-sm" : "bg-card border-border/40 card-shadow");

  const field = (label: string, key: string, placeholder: string) => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input value={settings[key] ?? ""} onChange={(e) => setSettings({ ...settings, [key]: e.target.value })} placeholder={placeholder} className={inputClass} />
    </div>
  );

  return (
    <div className="space-y-6">
      <Tabs defaultValue="catalog" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="catalog"><Gamepad2 className="h-3.5 w-3.5 mr-1.5" />Catálogo</TabsTrigger>
          <TabsTrigger value="sections"><LayoutGrid className="h-3.5 w-3.5 mr-1.5" />Seções</TabsTrigger>
          <TabsTrigger value="providers"><Save className="h-3.5 w-3.5 mr-1.5" />Provedores</TabsTrigger>
        </TabsList>

        {/* ── PROVIDERS TAB ── */}
        <TabsContent value="providers">
          <div className="max-w-2xl space-y-6">
            <div className={cardClass}>
              <h2 className={cn("text-sm font-semibold flex items-center gap-2", light ? "text-gray-900" : "text-foreground")}>
                <Gamepad2 className="h-4 w-4 text-primary" /> Provedor: Playfiver
              </h2>
              <Tabs defaultValue="token" className="space-y-3">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="token">Agent Token</TabsTrigger>
                  <TabsTrigger value="secret">Secret Key</TabsTrigger>
                </TabsList>
                <TabsContent value="token" className="space-y-1">
                  <Label className="text-xs">Agent Token</Label>
                  <Input value={playfiverToken} onChange={(e) => setPlayfiverToken(e.target.value)} placeholder="Cole o agentToken" className={inputClass} />
                </TabsContent>
                <TabsContent value="secret" className="space-y-1">
                  <Label className="text-xs">Secret Key</Label>
                  <Input type="password" value={playfiverSecret} onChange={(e) => setPlayfiverSecret(e.target.value)} placeholder="Cole a secretKey" className={inputClass} />
                </TabsContent>
              </Tabs>
              {field("URL da API (opcional)", "playfiver_api_url", "https://api.playfivers.com")}
              <div className="space-y-1">
                <Label className="text-xs">URL de Callback (copie e cole no painel Playfiver)</Label>
                <div className="flex gap-2">
                  <Input value={callbackUrl} readOnly className={cn(inputClass, "flex-1 text-[11px] select-all")} />
                  <Button type="button" size="sm" variant="outline" className="h-9 px-3 shrink-0" onClick={() => {
                    navigator.clipboard.writeText(callbackUrl);
                    setCopiedCallback(true);
                    setTimeout(() => setCopiedCallback(false), 2000);
                    toast({ title: "URL copiada!" });
                  }}>
                    {copiedCallback ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
                <p className={cn("text-[10px]", light ? "text-gray-400" : "text-muted-foreground")}>
                  Cole esta URL no campo "Callback URL" do painel da sua conta Playfiver.
                </p>
              </div>
            </div>

            <div className={cardClass}>
              <h2 className={cn("text-sm font-semibold flex items-center gap-2", light ? "text-gray-900" : "text-foreground")}>
                <Gamepad2 className="h-4 w-4 text-accent" /> Provedor: iGameWin
              </h2>
              {field("API Key (agentCode:agentToken)", "igamewin_api_key", "meuAgente:meuToken123")}
              {field("URL da API", "igamewin_api_url", "https://igamewin.com/api/v1")}
              <p className={cn("text-[10px]", light ? "text-gray-400" : "text-muted-foreground")}>
                Use o formato <strong>agentCode:agentToken</strong> no campo API Key. URL padrão: https://igamewin.com/api/v1
              </p>
            </div>

            <Button onClick={saveProviders} disabled={loading} className="bg-primary text-primary-foreground font-semibold">
              <Save className="h-4 w-4 mr-2" /> Salvar Provedores
            </Button>
          </div>
        </TabsContent>

        {/* ── CATALOG TAB ── */}
        <TabsContent value="catalog">
          <div className={sectionClass}>
            <div className={cn("p-4 border-b flex items-center justify-between flex-wrap gap-3", light ? "border-gray-200" : "border-border/40")}>
              <h2 className={cn("text-sm font-semibold", light ? "text-gray-900" : "text-foreground")}>
                Jogos Cadastrados ({filtered.length}/{games.length})
              </h2>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={importFromPlayfiver} disabled={importing} className={cn("text-xs h-8", light ? "bg-white border-gray-200" : "")}>
                  {importing ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1" />}
                  Importar Playfiver
                </Button>
                <Button size="sm" variant="outline" onClick={importFromIgamewin} disabled={importingIgamewin} className={cn("text-xs h-8", light ? "bg-white border-gray-200" : "")}>
                  {importingIgamewin ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1" />}
                  Importar iGameWin
                </Button>
                <Button size="sm" onClick={() => { setEditGame({ provider: "playfiver", category: "slots", is_active: true }); setShowForm(true); }} className="bg-primary text-primary-foreground text-xs h-8">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar Jogo
                </Button>
              </div>
            </div>

            {/* Filters */}
            <div className={cn("p-4 border-b flex items-center gap-3 flex-wrap", light ? "border-gray-200 bg-gray-50/50" : "border-border/40 bg-secondary/20")}>
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Buscar por nome ou código..." value={search} onChange={e => setSearch(e.target.value)} className={cn("pl-9 h-8 text-xs", inputClass)} />
              </div>
              <select value={filterProvider} onChange={e => setFilterProvider(e.target.value)} className={cn("h-8 rounded-md border text-xs px-2", light ? "bg-white border-gray-200" : "bg-secondary border-border/40 text-foreground")}>
                <option value="all">Todos provedores</option>
                <option value="playfiver">Playfiver</option>
                <option value="igamewin">iGameWin</option>
                <option value="evolution">Evolution</option>
                <option value="pgsoft">PG Soft</option>
                <option value="pragmatic">Pragmatic</option>
              </select>
              <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className={cn("h-8 rounded-md border text-xs px-2", light ? "bg-white border-gray-200" : "bg-secondary border-border/40 text-foreground")}>
                <option value="all">Todas categorias</option>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>

            {/* Games table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className={cn("border-b", light ? "border-gray-200 text-gray-500 bg-gray-50/50" : "border-border/40 text-muted-foreground bg-secondary/30")}>
                    <th className="text-left p-2.5 font-medium w-10"></th>
                    <th className="text-left p-2.5 font-medium">Nome</th>
                    <th className="text-left p-2.5 font-medium">Código</th>
                    <th className="text-left p-2.5 font-medium">Provedor</th>
                    <th className="text-left p-2.5 font-medium">Categoria</th>
                    <th className="text-left p-2.5 font-medium">Status</th>
                    <th className="text-left p-2.5 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((g) => (
                    <tr key={g.id} className={cn("border-b transition-colors", light ? "border-gray-100 hover:bg-gray-50" : "border-border/20 hover:bg-surface-hover")}>
                      <td className="p-2.5">
                        {g.image_url ? (
                          <img src={g.image_url} alt={g.name} className="w-8 h-8 rounded object-cover" />
                        ) : (
                          <div className={cn("w-8 h-8 rounded flex items-center justify-center", light ? "bg-gray-100" : "bg-secondary")}>
                            <Image className="h-3 w-3 text-muted-foreground" />
                          </div>
                        )}
                      </td>
                      <td className={cn("p-2.5 font-medium", light ? "text-gray-900" : "text-foreground")}>
                        {g.name}
                        <div className="flex gap-1 mt-0.5">
                          {g.is_hot && <span className="text-[9px] px-1 rounded bg-orange-500/15 text-orange-500 font-semibold">HOT</span>}
                          {g.is_new && <span className="text-[9px] px-1 rounded bg-blue-500/15 text-blue-500 font-semibold">NOVO</span>}
                        </div>
                      </td>
                      <td className={cn("p-2.5 font-mono text-[10px]", light ? "text-gray-500" : "text-muted-foreground")}>{g.game_code || "—"}</td>
                      <td className={cn("p-2.5 uppercase text-[10px]", light ? "text-gray-500" : "text-muted-foreground")}>{g.provider}</td>
                      <td className="p-2.5">
                        <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-semibold", light ? "bg-gray-100 text-gray-600" : "bg-secondary text-muted-foreground")}>
                          {CATEGORIES.find(c => c.value === g.category)?.label || g.category}
                        </span>
                      </td>
                      <td className="p-2.5">
                        <span className={cn("text-[10px] font-semibold", g.is_active ? "text-primary" : "text-destructive")}>
                          {g.is_active ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="p-2.5 flex gap-1">
                        <button onClick={() => { setEditGame(g); setShowForm(true); }} className={cn("p-1.5 rounded", light ? "hover:bg-gray-100" : "hover:bg-secondary")}>
                          <Edit2 className="h-3 w-3 text-muted-foreground" />
                        </button>
                        <button onClick={() => deleteGame(g.id)} className="p-1.5 rounded hover:bg-destructive/10">
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && <p className={cn("p-6 text-center text-sm", light ? "text-gray-400" : "text-muted-foreground")}>Nenhum jogo encontrado.</p>}
            </div>
          </div>
        </TabsContent>

        {/* ── SECTIONS TAB ── */}
        <TabsContent value="sections">
          <AdminSectionsManager light={light} />
        </TabsContent>
      </Tabs>

      {/* Edit/Add Dialog */}
      <Dialog open={showForm} onOpenChange={(o) => { if (!o) { setShowForm(false); setEditGame(null); } }}>
        <DialogContent className={cn("max-w-lg", light ? "bg-white" : "bg-card border-border/40")}>
          <DialogHeader>
            <DialogTitle className={light ? "text-gray-900" : "text-foreground"}>
              {editGame?.id ? "Editar Jogo" : "Novo Jogo"}
            </DialogTitle>
          </DialogHeader>
          {editGame && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Imagem do Jogo</Label>
                <div className="flex items-start gap-3">
                  {editGame.image_url ? (
                    <img src={editGame.image_url} alt="" className="w-20 h-20 rounded-lg object-cover border" />
                  ) : (
                    <div className={cn("w-20 h-20 rounded-lg flex items-center justify-center border", light ? "bg-gray-50 border-gray-200" : "bg-secondary border-border/40")}>
                      <Image className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 space-y-2">
                    <label className={cn("flex items-center justify-center gap-2 h-9 rounded-md border text-xs font-medium cursor-pointer transition-colors", light ? "border-gray-200 hover:bg-gray-50" : "border-border/40 hover:bg-secondary")}>
                      {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                      {uploading ? "Enviando..." : "Upload Imagem"}
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                    <Input value={editGame.image_url || ""} onChange={(e) => setEditGame({ ...editGame, image_url: e.target.value })} placeholder="Ou cole a URL da imagem" className={cn("h-8 text-[11px]", inputClass)} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Nome do Jogo</Label>
                  <Input value={editGame.name || ""} onChange={(e) => setEditGame({ ...editGame, name: e.target.value })} className={cn("h-9 text-sm", inputClass)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Código do Jogo</Label>
                  <Input value={editGame.game_code || ""} onChange={(e) => setEditGame({ ...editGame, game_code: e.target.value })} placeholder="ex: 126" className={cn("h-9 text-sm font-mono", inputClass)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Provedor</Label>
                  <select value={editGame.provider || "playfiver"} onChange={(e) => setEditGame({ ...editGame, provider: e.target.value })} className={selectClass}>
                    <option value="playfiver">Playfiver</option>
                    <option value="igamewin">iGameWin</option>
                    <option value="evolution">Evolution</option>
                    <option value="pgsoft">PG Soft</option>
                    <option value="pragmatic">Pragmatic Play</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Categoria / Seção</Label>
                  <select value={editGame.category || "slots"} onChange={(e) => setEditGame({ ...editGame, category: e.target.value })} className={selectClass}>
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Ordem de exibição</Label>
                  <Input type="number" value={editGame.sort_order ?? 0} onChange={(e) => setEditGame({ ...editGame, sort_order: parseInt(e.target.value) || 0 })} className={cn("h-9 text-sm", inputClass)} />
                </div>
                <div className="flex items-center gap-4 pt-5">
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input type="checkbox" checked={editGame.is_hot || false} onChange={(e) => setEditGame({ ...editGame, is_hot: e.target.checked })} /> 🔥 Hot
                  </label>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input type="checkbox" checked={editGame.is_new || false} onChange={(e) => setEditGame({ ...editGame, is_new: e.target.checked })} /> ✨ Novo
                  </label>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input type="checkbox" checked={editGame.is_active ?? true} onChange={(e) => setEditGame({ ...editGame, is_active: e.target.checked })} /> Ativo
                  </label>
                </div>
              </div>

              <Button onClick={saveGame} disabled={loading} className="w-full bg-primary text-primary-foreground text-sm">
                <Save className="h-3.5 w-3.5 mr-1.5" /> {editGame.id ? "Salvar Alterações" : "Adicionar Jogo"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
