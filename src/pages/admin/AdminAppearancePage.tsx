import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Save, Upload } from "lucide-react";

export default function AdminAppearancePage() {
  const [settings, setSettings] = useState<any>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from("site_settings").select("*").limit(1).single().then(({ data }) => setSettings(data));
  }, []);

  async function uploadLogo() {
    if (!logoFile || !settings) return;
    const ext = logoFile.name.split(".").pop();
    const path = `logo.${ext}`;
    const { error } = await supabase.storage.from("site-assets").upload(path, logoFile, { upsert: true });
    if (error) { toast({ title: "Erro no upload", description: error.message, variant: "destructive" }); return; }
    const { data: { publicUrl } } = supabase.storage.from("site-assets").getPublicUrl(path);
    await supabase.from("site_settings").update({ logo_url: publicUrl }).eq("id", settings.id);
    setSettings({ ...settings, logo_url: publicUrl });
    toast({ title: "Logo atualizada!" });
  }

  async function saveColors() {
    if (!settings) return;
    setLoading(true);
    const { error } = await supabase.from("site_settings").update({
      primary_color: settings.primary_color,
      secondary_color: settings.secondary_color,
      accent_color: settings.accent_color,
      background_color: settings.background_color,
    }).eq("id", settings.id);
    setLoading(false);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Cores salvas! Recarregue a página para aplicar." });
    }
  }

  if (!settings) return <p className="text-muted-foreground">Carregando...</p>;

  const colorField = (label: string, key: string, hint: string) => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input value={settings[key] ?? ""} onChange={e => setSettings({ ...settings, [key]: e.target.value })} placeholder={hint} className="bg-secondary border-border/40 h-9 text-sm font-mono" />
      <p className="text-[10px] text-muted-foreground">Formato HSL: {hint}</p>
    </div>
  );

  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-xl bg-card border border-border/40 p-6 card-shadow space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Logo do Site</h2>
        {settings.logo_url && (
          <img src={settings.logo_url} alt="Logo atual" className="h-16 object-contain rounded-lg bg-secondary p-2" />
        )}
        <div className="flex items-center gap-3">
          <Input type="file" accept="image/*" onChange={e => setLogoFile(e.target.files?.[0] || null)} className="bg-secondary border-border/40 text-sm" />
          <Button onClick={uploadLogo} disabled={!logoFile} size="sm" className="bg-primary text-primary-foreground">
            <Upload className="h-4 w-4 mr-1" /> Upload
          </Button>
        </div>
      </div>

      <div className="rounded-xl bg-card border border-border/40 p-6 card-shadow space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Cores do Sistema</h2>
        <div className="grid grid-cols-2 gap-4">
          {colorField("Cor Primária", "primary_color", "142 70% 45%")}
          {colorField("Cor Secundária", "secondary_color", "222 47% 12%")}
          {colorField("Cor de Destaque", "accent_color", "45 100% 55%")}
          {colorField("Cor de Fundo", "background_color", "222 47% 4%")}
        </div>
        <div className="flex gap-2 mt-2">
          {["primary_color", "secondary_color", "accent_color", "background_color"].map(key => (
            <div key={key} className="w-10 h-10 rounded-lg border border-border/40" style={{ backgroundColor: `hsl(${settings[key]})` }} />
          ))}
        </div>
      </div>

      <Button onClick={saveColors} disabled={loading} className="bg-primary text-primary-foreground font-semibold">
        <Save className="h-4 w-4 mr-2" />
        {loading ? "Salvando..." : "Salvar Aparência"}
      </Button>
    </div>
  );
}
