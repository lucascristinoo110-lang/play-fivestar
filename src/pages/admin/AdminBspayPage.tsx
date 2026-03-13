import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Save, Shield } from "lucide-react";

export default function AdminBspayPage() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from("site_settings").select("*").limit(1).single().then(({ data }) => setSettings(data));
  }, []);

  async function save() {
    if (!settings) return;
    setLoading(true);
    const { error } = await supabase.from("site_settings").update({
      bspay_client_id: settings.bspay_client_id,
      bspay_client_secret: settings.bspay_client_secret,
      bspay_api_url: settings.bspay_api_url,
    }).eq("id", settings.id);
    setLoading(false);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else toast({ title: "Configurações BSPAY salvas!" });
  }

  if (!settings) return <p className="text-muted-foreground">Carregando...</p>;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-xl bg-card border border-border/40 p-6 card-shadow space-y-4">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Gateway BSPAY - Configuração PIX
        </h2>
        <p className="text-xs text-muted-foreground">Configure as credenciais da API BSPAY para processar depósitos e saques via PIX.</p>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs">URL da API</Label>
            <Input value={settings.bspay_api_url ?? ""} onChange={e => setSettings({ ...settings, bspay_api_url: e.target.value })} placeholder="https://api.bspay.co" className="bg-secondary border-border/40 h-9 text-sm font-mono" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Client ID</Label>
            <Input value={settings.bspay_client_id ?? ""} onChange={e => setSettings({ ...settings, bspay_client_id: e.target.value })} placeholder="Seu client_id" className="bg-secondary border-border/40 h-9 text-sm font-mono" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Client Secret</Label>
            <Input type="password" value={settings.bspay_client_secret ?? ""} onChange={e => setSettings({ ...settings, bspay_client_secret: e.target.value })} placeholder="Seu client_secret" className="bg-secondary border-border/40 h-9 text-sm font-mono" />
          </div>
        </div>
      </div>

      <Button onClick={save} disabled={loading} className="bg-primary text-primary-foreground font-semibold">
        <Save className="h-4 w-4 mr-2" />
        {loading ? "Salvando..." : "Salvar Configurações BSPAY"}
      </Button>
    </div>
  );
}
