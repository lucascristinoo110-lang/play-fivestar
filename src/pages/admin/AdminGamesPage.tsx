import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Save, Gamepad2 } from "lucide-react";

export default function AdminGamesPage() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from("site_settings").select("*").limit(1).single().then(({ data }) => setSettings(data));
  }, []);

  async function save() {
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
    else toast({ title: "Configurações de provedores salvas!" });
  }

  if (!settings) return <p className="text-muted-foreground">Carregando...</p>;

  const field = (label: string, key: string, placeholder: string) => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input value={settings[key] ?? ""} onChange={e => setSettings({ ...settings, [key]: e.target.value })} placeholder={placeholder} className="bg-secondary border-border/40 h-9 text-sm font-mono" />
    </div>
  );

  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-xl bg-card border border-border/40 p-6 card-shadow space-y-4">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Gamepad2 className="h-4 w-4 text-primary" />
          Provedor: Playfiver
        </h2>
        {field("API Key", "playfiver_api_key", "Sua chave API")}
        {field("URL da API", "playfiver_api_url", "https://api.playfiver.com")}
      </div>

      <div className="rounded-xl bg-card border border-border/40 p-6 card-shadow space-y-4">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Gamepad2 className="h-4 w-4 text-accent" />
          Provedor: iGameWin
        </h2>
        {field("API Key", "igamewin_api_key", "Sua chave API")}
        {field("URL da API", "igamewin_api_url", "https://api.igamewin.com")}
      </div>

      <Button onClick={save} disabled={loading} className="bg-primary text-primary-foreground font-semibold">
        <Save className="h-4 w-4 mr-2" />
        {loading ? "Salvando..." : "Salvar Provedores"}
      </Button>
    </div>
  );
}
