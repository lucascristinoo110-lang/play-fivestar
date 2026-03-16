import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useOutletContext } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Save, Megaphone, Eye, MousePointerClick, UserPlus, DollarSign, Activity } from "lucide-react";

export default function AdminAdsPage() {
  const { light } = useOutletContext<{ light: boolean }>();
  const [pixelId, setPixelId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [settingsId, setSettingsId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    const { data } = await supabase
      .from("site_settings")
      .select("id, meta_pixel_id, meta_api_key")
      .limit(1)
      .single();
    if (data) {
      setSettingsId(data.id);
      setPixelId((data as any).meta_pixel_id || "");
      setApiKey((data as any).meta_api_key || "");
    }
  }

  async function saveSettings() {
    if (!settingsId) return;
    setSaving(true);
    const { error } = await supabase
      .from("site_settings")
      .update({
        meta_pixel_id: pixelId || null,
        meta_api_key: apiKey || null,
      } as any)
      .eq("id", settingsId);

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Configurações de anúncios salvas!" });
    }
    setSaving(false);
  }

  const card = cn(
    "rounded-2xl border p-6 space-y-5",
    light ? "bg-white border-slate-200 shadow-sm" : "bg-slate-900/50 border-white/[0.06]"
  );

  const inputClass = cn(
    "h-10 text-sm rounded-xl",
    light ? "bg-slate-50 border-slate-200" : "bg-slate-800/60 border-white/[0.08] text-white"
  );

  const events = [
    { icon: Eye, label: "PageView", desc: "Disparado a cada visita no site" },
    { icon: UserPlus, label: "CompleteRegistration", desc: "Disparado ao criar conta" },
    { icon: DollarSign, label: "Purchase", desc: "Disparado ao confirmar depósito (valor incluído)" },
    { icon: MousePointerClick, label: "Lead", desc: "Disparado ao iniciar depósito" },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center",
          light ? "bg-blue-50 text-blue-600" : "bg-blue-500/10 text-blue-400"
        )}>
          <Megaphone className="h-5 w-5" />
        </div>
        <div>
          <h2 className={cn("text-lg font-bold", light ? "text-slate-800" : "text-white")}>
            Anúncios & Pixel
          </h2>
          <p className={cn("text-xs", light ? "text-slate-400" : "text-slate-500")}>
            Configure o Meta Pixel para rastrear conversões
          </p>
        </div>
      </div>

      {/* Configuration */}
      <div className={card}>
        <div className="flex items-center gap-2 mb-1">
          <Activity className="h-4 w-4 text-blue-500" />
          <h3 className={cn("text-sm font-semibold", light ? "text-slate-800" : "text-white")}>
            Configuração do Meta Pixel
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Pixel ID *</Label>
            <Input
              value={pixelId}
              onChange={(e) => setPixelId(e.target.value)}
              placeholder="Ex: 123456789012345"
              className={inputClass}
            />
            <p className={cn("text-[10px]", light ? "text-slate-400" : "text-slate-500")}>
              Encontre no Meta Events Manager → Fontes de dados
            </p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Chave API (Conversions API) — Opcional</Label>
            <Input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Ex: EAABsbCS..."
              type="password"
              className={inputClass}
            />
            <p className={cn("text-[10px]", light ? "text-slate-400" : "text-slate-500")}>
              Para envio server-side via Conversions API
            </p>
          </div>
        </div>

        <Button
          size="sm"
          onClick={saveSettings}
          disabled={saving}
          className={cn(
            "text-xs font-semibold rounded-xl px-5",
            light ? "bg-blue-600 hover:bg-blue-700 text-white" : ""
          )}
        >
          <Save className="h-3.5 w-3.5 mr-1.5" />
          {saving ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </div>

      {/* Events tracked */}
      <div className={card}>
        <h3 className={cn("text-sm font-semibold", light ? "text-slate-800" : "text-white")}>
          Eventos Rastreados
        </h3>
        <p className={cn("text-xs -mt-3", light ? "text-slate-400" : "text-slate-500")}>
          Esses eventos são enviados automaticamente para o Meta quando o Pixel ID está configurado.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {events.map(({ icon: Icon, label, desc }) => (
            <div
              key={label}
              className={cn(
                "flex items-start gap-3 p-4 rounded-xl border",
                light
                  ? "bg-slate-50 border-slate-100"
                  : "bg-slate-800/40 border-white/[0.04]"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                light ? "bg-blue-100 text-blue-600" : "bg-blue-500/10 text-blue-400"
              )}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className={cn("text-sm font-semibold", light ? "text-slate-800" : "text-white")}>
                  {label}
                </p>
                <p className={cn("text-[11px] leading-relaxed", light ? "text-slate-400" : "text-slate-500")}>
                  {desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className={cn(
        "rounded-2xl border p-5",
        light ? "bg-amber-50 border-amber-200" : "bg-amber-500/5 border-amber-500/10"
      )}>
        <h3 className={cn("text-sm font-semibold mb-2", light ? "text-amber-800" : "text-amber-400")}>
          📌 Como configurar
        </h3>
        <ol className={cn(
          "text-xs space-y-1.5 list-decimal list-inside leading-relaxed",
          light ? "text-amber-700" : "text-amber-300/80"
        )}>
          <li>Acesse o <strong>Meta Events Manager</strong> → Fontes de Dados</li>
          <li>Copie o <strong>Pixel ID</strong> e cole acima</li>
          <li>(Opcional) Em Configurações → Gerar Token de Acesso, copie a chave da <strong>Conversions API</strong></li>
          <li>Salve e pronto! Os eventos serão rastreados automaticamente</li>
        </ol>
      </div>
    </div>
  );
}
