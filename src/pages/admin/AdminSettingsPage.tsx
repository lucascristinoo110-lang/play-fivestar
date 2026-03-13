import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Save } from "lucide-react";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from("site_settings").select("*").limit(1).single().then(({ data }) => setSettings(data));
  }, []);

  async function save() {
    if (!settings) return;
    setLoading(true);
    const { error } = await supabase.from("site_settings").update({
      site_name: settings.site_name,
      min_deposit: settings.min_deposit,
      max_deposit: settings.max_deposit,
      min_withdraw: settings.min_withdraw,
      max_withdraw: settings.max_withdraw,
      rollover_multiplier: settings.rollover_multiplier,
      require_kyc_for_withdraw: settings.require_kyc_for_withdraw,
      welcome_bonus_percent: settings.welcome_bonus_percent,
      welcome_bonus_max: settings.welcome_bonus_max,
      maintenance_mode: settings.maintenance_mode,
    }).eq("id", settings.id);
    setLoading(false);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else toast({ title: "Configurações salvas!" });
  }

  if (!settings) return <p className="text-muted-foreground">Carregando...</p>;

  const field = (label: string, key: string, type = "text") => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input type={type} value={settings[key] ?? ""} onChange={e => setSettings({ ...settings, [key]: type === "number" ? parseFloat(e.target.value) || 0 : e.target.value })} className="bg-secondary border-border/40 h-9 text-sm" />
    </div>
  );

  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-xl bg-card border border-border/40 p-6 card-shadow space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Geral</h2>
        {field("Nome do Site", "site_name")}
        <div className="flex items-center gap-3">
          <input type="checkbox" checked={settings.maintenance_mode} onChange={e => setSettings({ ...settings, maintenance_mode: e.target.checked })} className="rounded" />
          <Label className="text-xs">Modo Manutenção</Label>
        </div>
      </div>

      <div className="rounded-xl bg-card border border-border/40 p-6 card-shadow space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Financeiro</h2>
        <div className="grid grid-cols-2 gap-4">
          {field("Depósito Mínimo (R$)", "min_deposit", "number")}
          {field("Depósito Máximo (R$)", "max_deposit", "number")}
          {field("Saque Mínimo (R$)", "min_withdraw", "number")}
          {field("Saque Máximo (R$)", "max_withdraw", "number")}
          {field("Rollover (multiplicador)", "rollover_multiplier", "number")}
        </div>
        <div className="flex items-center gap-3">
          <input type="checkbox" checked={settings.require_kyc_for_withdraw} onChange={e => setSettings({ ...settings, require_kyc_for_withdraw: e.target.checked })} className="rounded" />
          <Label className="text-xs">Exigir KYC para saque</Label>
        </div>
      </div>

      <div className="rounded-xl bg-card border border-border/40 p-6 card-shadow space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Bônus de Boas-Vindas</h2>
        <div className="grid grid-cols-2 gap-4">
          {field("Percentual (%)", "welcome_bonus_percent", "number")}
          {field("Máximo (R$)", "welcome_bonus_max", "number")}
        </div>
      </div>

      <Button onClick={save} disabled={loading} className="bg-primary text-primary-foreground font-semibold">
        <Save className="h-4 w-4 mr-2" />
        {loading ? "Salvando..." : "Salvar Configurações"}
      </Button>
    </div>
  );
}
