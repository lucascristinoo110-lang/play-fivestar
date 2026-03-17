import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Save, Info } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { cn } from "@/lib/utils";

export default function AdminSettingsPage() {
  const { light } = useOutletContext<{ light: boolean }>();
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
      welcome_bonus_active: settings.welcome_bonus_active,
      welcome_bonus_percent: settings.welcome_bonus_percent,
      welcome_bonus_max: settings.welcome_bonus_max,
      maintenance_mode: settings.maintenance_mode,
      welcome_popup_active: settings.welcome_popup_active,
      welcome_popup_title: settings.welcome_popup_title,
      welcome_popup_body: settings.welcome_popup_body,
      welcome_popup_button_text: settings.welcome_popup_button_text,
      welcome_popup_timer_minutes: settings.welcome_popup_timer_minutes,
    }).eq("id", settings.id);
    setLoading(false);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else toast({ title: "Configurações salvas!" });
  }

  if (!settings) return <p className="text-muted-foreground">Carregando...</p>;

  const cardCls = cn("rounded-xl border p-6 space-y-4", light ? "bg-white border-slate-200 shadow-sm" : "bg-card border-border/40 card-shadow");
  const labelCls = cn("text-xs font-medium", light ? "text-slate-700" : "text-foreground");
  const hintCls = cn("text-[10px] mt-0.5", light ? "text-slate-400" : "text-muted-foreground");
  const inputCls = cn("h-9 text-sm", light ? "bg-slate-50 border-slate-200" : "bg-secondary border-border/40");

  const field = (label: string, key: string, type = "text", hint?: string) => (
    <div className="space-y-1">
      <Label className={labelCls}>{label}</Label>
      <Input type={type} value={settings[key] ?? ""} onChange={e => setSettings({ ...settings, [key]: type === "number" ? parseFloat(e.target.value) || 0 : e.target.value })} className={inputCls} />
      {hint && <p className={hintCls}>{hint}</p>}
    </div>
  );

  const toggle = (label: string, key: string, hint?: string) => (
    <div className="flex items-start gap-3">
      <input
        type="checkbox"
        checked={!!settings[key]}
        onChange={e => setSettings({ ...settings, [key]: e.target.checked })}
        className="rounded mt-0.5 accent-primary"
      />
      <div>
        <Label className={labelCls}>{label}</Label>
        {hint && <p className={hintCls}>{hint}</p>}
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl space-y-6">
      {/* Geral */}
      <div className={cardCls}>
        <h2 className={cn("text-sm font-semibold", light ? "text-slate-800" : "text-foreground")}>Geral</h2>
        {field("Nome do Site", "site_name")}
        {toggle("Modo Manutenção", "maintenance_mode", "Desativa o site para os jogadores")}
      </div>

      {/* Financeiro */}
      <div className={cardCls}>
        <h2 className={cn("text-sm font-semibold", light ? "text-slate-800" : "text-foreground")}>Financeiro</h2>
        <div className="grid grid-cols-2 gap-4">
          {field("Depósito Mínimo (R$)", "min_deposit", "number")}
          {field("Depósito Máximo (R$)", "max_deposit", "number")}
          {field("Saque Mínimo (R$)", "min_withdraw", "number")}
          {field("Saque Máximo (R$)", "max_withdraw", "number")}
        </div>
        {toggle("Exigir KYC para saque", "require_kyc_for_withdraw", "O usuário precisa verificar identidade antes de sacar")}
      </div>

      {/* Rollover */}
      <div className={cardCls}>
        <div className="flex items-center gap-2">
          <h2 className={cn("text-sm font-semibold", light ? "text-slate-800" : "text-foreground")}>Rollover</h2>
          <div className={cn("px-2 py-0.5 rounded text-[10px] font-semibold", light ? "bg-blue-50 text-blue-600" : "bg-primary/15 text-primary")}>
            Controle de Saque
          </div>
        </div>
        <div className={cn("rounded-lg p-3 flex items-start gap-2 text-xs", light ? "bg-blue-50 text-blue-700" : "bg-primary/10 text-primary")}>
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <p>O rollover define quantas vezes o usuário precisa movimentar (apostar) o valor depositado antes de poder sacar. Ex: Rollover 2x = se depositou R$100, precisa apostar R$200 antes de sacar.</p>
        </div>
        {field("Multiplicador de Rollover", "rollover_multiplier", "number", "Ex: 1 = sem rollover, 2 = 2x o valor depositado, 5 = 5x")}
        <div className={cn("rounded-lg p-3 text-xs space-y-1", light ? "bg-slate-50 text-slate-500" : "bg-secondary/50 text-muted-foreground")}>
          <p><strong>Rollover 1x:</strong> Precisa apostar 1x o depósito (praticamente sem rollover)</p>
          <p><strong>Rollover 3x:</strong> Depósito de R$100 → Precisa apostar R$300 para liberar saque</p>
          <p><strong>Rollover 5x:</strong> Depósito de R$100 → Precisa apostar R$500 para liberar saque</p>
        </div>
      </div>

      {/* Bônus */}
      <div className={cardCls}>
        <div className="flex items-center gap-2">
          <h2 className={cn("text-sm font-semibold", light ? "text-slate-800" : "text-foreground")}>Saldo Bônus (1º Depósito)</h2>
          <div className={cn("px-2 py-0.5 rounded text-[10px] font-semibold",
            settings.welcome_bonus_active
              ? "bg-emerald-500/10 text-emerald-500"
              : light ? "bg-slate-100 text-slate-400" : "bg-secondary text-muted-foreground"
          )}>
            {settings.welcome_bonus_active ? "Ativo" : "Desativado"}
          </div>
        </div>
        {toggle("Ativar Bônus de Primeiro Depósito", "welcome_bonus_active", "Quando ativo, o usuário recebe saldo bônus no primeiro depósito")}
        
        {settings.welcome_bonus_active && (
          <>
            <div className={cn("rounded-lg p-3 flex items-start gap-2 text-xs", light ? "bg-emerald-50 text-emerald-700" : "bg-emerald-500/10 text-emerald-400")}>
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <p>O bônus é calculado como porcentagem do primeiro depósito e adicionado como saldo bônus separado. O saldo bônus está sujeito ao rollover antes de poder ser sacado.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {field("Porcentagem do Bônus (%)", "welcome_bonus_percent", "number", "Ex: 100 = 100% do depósito vira bônus")}
              {field("Valor Máximo do Bônus (R$)", "welcome_bonus_max", "number", "Teto do bônus independente da porcentagem")}
            </div>
            <div className={cn("rounded-lg p-3 text-xs space-y-1", light ? "bg-slate-50 text-slate-500" : "bg-secondary/50 text-muted-foreground")}>
              <p><strong>Exemplo:</strong> Bônus 100% com máximo R$500</p>
              <p>→ Depósito de R$200: recebe R$200 de bônus</p>
              <p>→ Depósito de R$800: recebe R$500 de bônus (limitado pelo máximo)</p>
            </div>
          </>
        )}
      </div>

      <Button onClick={save} disabled={loading} className="bg-primary text-primary-foreground font-semibold">
        <Save className="h-4 w-4 mr-2" />
        {loading ? "Salvando..." : "Salvar Configurações"}
      </Button>
    </div>
  );
}
