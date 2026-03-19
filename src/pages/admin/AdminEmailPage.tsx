import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useOutletContext } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Mail, Send, Settings, CheckCircle2, XCircle, Loader2,
  Plus, Trash2, ToggleLeft, ToggleRight, Clock, Users, BarChart3
} from "lucide-react";

type Tab = "config" | "campaigns" | "automations" | "logs";

export default function AdminEmailPage() {
  const { light } = useOutletContext<{ light: boolean }>();
  const [tab, setTab] = useState<Tab>("config");
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"unknown" | "connected" | "error">("unknown");
  const [connectionError, setConnectionError] = useState("");

  // Campaigns
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [newCampaign, setNewCampaign] = useState({ subject: "", body_html: "", recipient_filter: { days_since_signup: 30 } });
  const [sending, setSending] = useState<string | null>(null);

  // Automations
  const [templates, setTemplates] = useState<any[]>([]);

  // Logs
  const [logs, setLogs] = useState<any[]>([]);

  const cardCls = cn("rounded-xl border p-6 space-y-4", light ? "bg-white border-slate-200 shadow-sm" : "bg-card border-border/40 card-shadow");
  const labelCls = cn("text-xs font-medium", light ? "text-slate-700" : "text-foreground");
  const inputCls = cn("h-9 text-sm", light ? "bg-slate-50 border-slate-200" : "bg-secondary border-border/40");

  useEffect(() => {
    loadSettings();
    loadCampaigns();
    loadTemplates();
    loadLogs();
  }, []);

  async function loadSettings() {
    const { data } = await supabase.from("site_settings").select("*").limit(1).single();
    setSettings(data);
    if (data?.resend_connected) setConnectionStatus("connected");
    else if (data?.resend_api_key) setConnectionStatus("unknown");
  }

  async function loadCampaigns() {
    const { data } = await supabase.from("email_campaigns").select("*").order("created_at", { ascending: false });
    setCampaigns(data ?? []);
  }

  async function loadTemplates() {
    const { data } = await supabase.from("email_templates").select("*").order("created_at", { ascending: true });
    setTemplates(data ?? []);
  }

  async function loadLogs() {
    const { data } = await supabase.from("email_log").select("*").order("sent_at", { ascending: false }).limit(100);
    setLogs(data ?? []);
  }

  async function saveResendConfig() {
    if (!settings) return;
    setLoading(true);
    const { error } = await supabase.from("site_settings").update({
      resend_api_key: settings.resend_api_key,
      resend_from_email: settings.resend_from_email,
    }).eq("id", settings.id);
    setLoading(false);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else toast({ title: "API Key salva!" });
  }

  async function testConnection() {
    setTesting(true);
    setConnectionError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ action: "test_connection" }),
      });
      const data = await res.json();
      if (data.connected) {
        setConnectionStatus("connected");
        toast({ title: "✅ Resend conectado!", description: `Domínios: ${data.domains?.join(", ") || "nenhum"}` });
      } else {
        setConnectionStatus("error");
        setConnectionError(data.error || "Falha na conexão");
        toast({ title: "❌ Erro na conexão", description: data.error, variant: "destructive" });
      }
    } catch (e: any) {
      setConnectionStatus("error");
      setConnectionError(e.message);
    }
    setTesting(false);
  }

  async function createCampaign() {
    if (!newCampaign.subject || !newCampaign.body_html) return toast({ title: "Preencha todos os campos", variant: "destructive" });
    const { error } = await supabase.from("email_campaigns").insert({
      subject: newCampaign.subject,
      body_html: newCampaign.body_html,
      recipient_filter: newCampaign.recipient_filter,
    });
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Campanha criada!" });
      setNewCampaign({ subject: "", body_html: "", recipient_filter: { days_since_signup: 30 } });
      loadCampaigns();
    }
  }

  async function sendCampaign(campaignId: string) {
    setSending(campaignId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ action: "send_campaign", campaign_id: campaignId }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "✅ Campanha enviada!", description: `${data.sent} enviados, ${data.failed} falharam` });
        loadCampaigns();
        loadLogs();
      } else {
        toast({ title: "Erro", description: data.error, variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
    setSending(null);
  }

  async function toggleTemplate(id: string, currentActive: boolean) {
    await supabase.from("email_templates").update({ is_active: !currentActive }).eq("id", id);
    loadTemplates();
    toast({ title: !currentActive ? "Automação ativada" : "Automação desativada" });
  }

  async function updateTemplate(id: string, field: string, value: string) {
    await supabase.from("email_templates").update({ [field]: value }).eq("id", id);
    loadTemplates();
  }

  const tabs: { key: Tab; icon: any; label: string }[] = [
    { key: "config", icon: Settings, label: "Configuração" },
    { key: "campaigns", icon: Send, label: "Disparos" },
    { key: "automations", icon: Clock, label: "Automações" },
    { key: "logs", icon: BarChart3, label: "Logs" },
  ];

  return (
    <div className="max-w-4xl space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
              tab === t.key
                ? light ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-primary/15 text-primary border border-primary/30"
                : light ? "text-slate-500 hover:bg-slate-50" : "text-muted-foreground hover:bg-secondary/50"
            )}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Config Tab */}
      {tab === "config" && (
        <div className="space-y-4">
          <div className={cardCls}>
            <div className="flex items-center justify-between">
              <h2 className={cn("text-sm font-semibold flex items-center gap-2", light ? "text-slate-800" : "text-foreground")}>
                <Mail className="h-4 w-4" /> Integração Resend
              </h2>
              <div className={cn("flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-semibold",
                connectionStatus === "connected" ? "bg-emerald-500/15 text-emerald-500" :
                connectionStatus === "error" ? "bg-destructive/15 text-destructive" :
                light ? "bg-slate-100 text-slate-400" : "bg-secondary text-muted-foreground"
              )}>
                {connectionStatus === "connected" ? <><CheckCircle2 className="h-3 w-3" /> Conectado</> :
                 connectionStatus === "error" ? <><XCircle className="h-3 w-3" /> Erro</> :
                 "Não verificado"}
              </div>
            </div>

            {connectionError && (
              <div className={cn("rounded-lg p-3 text-xs", light ? "bg-red-50 text-red-700" : "bg-destructive/10 text-destructive")}>
                {connectionError}
              </div>
            )}

            <div className="space-y-1">
              <Label className={labelCls}>API Key do Resend</Label>
              <Input
                type="password"
                placeholder="re_xxxxxxxxxxxx"
                value={settings?.resend_api_key ?? ""}
                onChange={e => setSettings({ ...settings, resend_api_key: e.target.value })}
                className={inputCls}
              />
              <p className={cn("text-[10px]", light ? "text-slate-400" : "text-muted-foreground")}>
                Obtenha em <a href="https://resend.com/api-keys" target="_blank" className="underline">resend.com/api-keys</a>
              </p>
            </div>

            <div className="space-y-1">
              <Label className={labelCls}>E-mail Remetente</Label>
              <Input
                placeholder="noreply@seudominio.com"
                value={settings?.resend_from_email ?? ""}
                onChange={e => setSettings({ ...settings, resend_from_email: e.target.value })}
                className={inputCls}
              />
              <p className={cn("text-[10px]", light ? "text-slate-400" : "text-muted-foreground")}>
                O domínio precisa estar verificado no Resend
              </p>
            </div>

            <div className="flex gap-2">
              <Button onClick={saveResendConfig} disabled={loading} size="sm">
                {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                Salvar
              </Button>
              <Button onClick={testConnection} disabled={testing} variant="outline" size="sm">
                {testing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                Testar Conexão
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Campaigns Tab */}
      {tab === "campaigns" && (
        <div className="space-y-4">
          <div className={cardCls}>
            <h2 className={cn("text-sm font-semibold flex items-center gap-2", light ? "text-slate-800" : "text-foreground")}>
              <Plus className="h-4 w-4" /> Novo Disparo em Massa
            </h2>

            <div className="space-y-1">
              <Label className={labelCls}>Assunto do Email</Label>
              <Input
                placeholder="Promoção exclusiva para você! 🎰"
                value={newCampaign.subject}
                onChange={e => setNewCampaign({ ...newCampaign, subject: e.target.value })}
                className={inputCls}
              />
            </div>

            <div className="space-y-1">
              <Label className={labelCls}>Corpo do Email (HTML)</Label>
              <textarea
                rows={6}
                placeholder="<h1>Título</h1><p>Conteúdo do email...</p>"
                value={newCampaign.body_html}
                onChange={e => setNewCampaign({ ...newCampaign, body_html: e.target.value })}
                className={cn("w-full rounded-md px-3 py-2 text-sm resize-y font-mono", inputCls)}
              />
              <p className={cn("text-[10px]", light ? "text-slate-400" : "text-muted-foreground")}>
                Variáveis: {"{{site_name}}"}, {"{{email}}"}, {"{{site_url}}"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className={labelCls}>Cadastrados nos últimos X dias</Label>
                <Input
                  type="number"
                  value={(newCampaign.recipient_filter as any)?.days_since_signup ?? 30}
                  onChange={e => setNewCampaign({ ...newCampaign, recipient_filter: { ...newCampaign.recipient_filter, days_since_signup: Number(e.target.value) } })}
                  className={inputCls}
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(newCampaign.recipient_filter as any)?.has_deposit === false}
                    onChange={e => setNewCampaign({ ...newCampaign, recipient_filter: { ...newCampaign.recipient_filter, has_deposit: e.target.checked ? false : undefined } })}
                    className="rounded accent-primary"
                  />
                  <span className={labelCls}>Apenas sem depósito</span>
                </label>
              </div>
            </div>

            <Button onClick={createCampaign} size="sm">
              <Plus className="h-3 w-3 mr-1" /> Criar Campanha
            </Button>
          </div>

          {/* Campaign List */}
          {campaigns.length > 0 && (
            <div className={cardCls}>
              <h2 className={cn("text-sm font-semibold flex items-center gap-2", light ? "text-slate-800" : "text-foreground")}>
                <Send className="h-4 w-4" /> Campanhas
              </h2>
              <div className="space-y-3">
                {campaigns.map(c => (
                  <div key={c.id} className={cn("rounded-lg border p-4 flex items-center justify-between", light ? "border-slate-200 bg-slate-50" : "border-border/40 bg-secondary/30")}>
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-sm font-medium truncate", light ? "text-slate-800" : "text-foreground")}>{c.subject}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={cn("text-[10px]", light ? "text-slate-400" : "text-muted-foreground")}>
                          <Users className="h-3 w-3 inline mr-1" />{c.total_recipients} destinatários
                        </span>
                        <span className={cn("px-2 py-0.5 rounded text-[10px] font-semibold",
                          c.status === "completed" ? "bg-emerald-500/15 text-emerald-500" :
                          c.status === "sending" ? "bg-amber-500/15 text-amber-500" :
                          light ? "bg-slate-100 text-slate-500" : "bg-secondary text-muted-foreground"
                        )}>
                          {c.status === "completed" ? `✅ ${c.sent_count} enviados` : c.status === "sending" ? "⏳ Enviando..." : "📝 Rascunho"}
                        </span>
                      </div>
                    </div>
                    {c.status === "draft" && (
                      <Button
                        size="sm"
                        onClick={() => sendCampaign(c.id)}
                        disabled={sending === c.id || connectionStatus !== "connected"}
                      >
                        {sending === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                        Enviar
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Automations Tab */}
      {tab === "automations" && (
        <div className="space-y-4">
          <div className={cn("rounded-lg p-3 flex items-start gap-2 text-xs", light ? "bg-blue-50 text-blue-700" : "bg-primary/10 text-primary")}>
            <Clock className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <p>Automações enviam emails automaticamente quando o gatilho é acionado. Ative/desative cada fluxo individualmente.</p>
          </div>

          {templates.map(t => (
            <div key={t.id} className={cardCls}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={() => toggleTemplate(t.id, t.is_active)}>
                    {t.is_active
                      ? <ToggleRight className="h-6 w-6 text-emerald-500" />
                      : <ToggleLeft className={cn("h-6 w-6", light ? "text-slate-300" : "text-muted-foreground")} />}
                  </button>
                  <div>
                    <h3 className={cn("text-sm font-semibold", light ? "text-slate-800" : "text-foreground")}>{t.name}</h3>
                    <p className={cn("text-[10px]", light ? "text-slate-400" : "text-muted-foreground")}>
                      Gatilho: {t.trigger_type === "signup_completed" ? "Cadastro concluído" :
                                t.trigger_type === "deposit_pending" ? "Depósito não pago" :
                                t.trigger_type === "post_signup_inactive" ? `${t.trigger_delay_hours}h após cadastro sem depósito` :
                                t.trigger_type}
                    </p>
                  </div>
                </div>
                <span className={cn("px-2 py-0.5 rounded text-[10px] font-semibold",
                  t.is_active ? "bg-emerald-500/15 text-emerald-500" : light ? "bg-slate-100 text-slate-400" : "bg-secondary text-muted-foreground"
                )}>
                  {t.is_active ? "Ativo" : "Desativado"}
                </span>
              </div>

              <div className="space-y-1">
                <Label className={labelCls}>Assunto</Label>
                <Input
                  value={t.subject}
                  onChange={e => updateTemplate(t.id, "subject", e.target.value)}
                  className={inputCls}
                />
              </div>

              <div className="space-y-1">
                <Label className={labelCls}>Corpo HTML</Label>
                <textarea
                  rows={4}
                  value={t.body_html}
                  onChange={e => updateTemplate(t.id, "body_html", e.target.value)}
                  className={cn("w-full rounded-md px-3 py-2 text-sm resize-y font-mono", inputCls)}
                />
              </div>

              {t.trigger_type !== "signup_completed" && (
                <div className="space-y-1">
                  <Label className={labelCls}>Delay (horas)</Label>
                  <Input
                    type="number"
                    value={t.trigger_delay_hours}
                    onChange={e => updateTemplate(t.id, "trigger_delay_hours", e.target.value)}
                    className={cn("w-32", inputCls)}
                  />
                </div>
              )}
            </div>
          ))}

          {/* Add custom template */}
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await supabase.from("email_templates").insert({
                name: "Novo Fluxo Personalizado",
                subject: "Assunto do email",
                body_html: "<h1>Título</h1><p>Conteúdo</p>",
                trigger_type: "manual",
                is_active: false,
              });
              loadTemplates();
              toast({ title: "Template criado!" });
            }}
          >
            <Plus className="h-3 w-3 mr-1" /> Adicionar Fluxo Personalizado
          </Button>
        </div>
      )}

      {/* Logs Tab */}
      {tab === "logs" && (
        <div className={cardCls}>
          <h2 className={cn("text-sm font-semibold flex items-center gap-2", light ? "text-slate-800" : "text-foreground")}>
            <BarChart3 className="h-4 w-4" /> Últimos Envios
          </h2>
          {logs.length === 0 ? (
            <p className={cn("text-xs", light ? "text-slate-400" : "text-muted-foreground")}>Nenhum email enviado ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className={cn("border-b", light ? "border-slate-200 text-slate-500" : "border-border/40 text-muted-foreground")}>
                    <th className="text-left p-2 font-medium">Email</th>
                    <th className="text-left p-2 font-medium">Status</th>
                    <th className="text-left p-2 font-medium">Data</th>
                    <th className="text-left p-2 font-medium">Erro</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(l => (
                    <tr key={l.id} className={cn("border-b", light ? "border-slate-100" : "border-border/20")}>
                      <td className={cn("p-2 font-mono", light ? "text-slate-700" : "text-foreground")}>{l.recipient_email}</td>
                      <td className="p-2">
                        <span className={cn("px-2 py-0.5 rounded text-[10px] font-semibold",
                          l.status === "sent" ? "bg-emerald-500/15 text-emerald-500" : "bg-destructive/15 text-destructive"
                        )}>
                          {l.status === "sent" ? "✅ Enviado" : "❌ Falhou"}
                        </span>
                      </td>
                      <td className={cn("p-2 font-mono", light ? "text-slate-400" : "text-muted-foreground")}>
                        {new Date(l.sent_at).toLocaleString("pt-BR")}
                      </td>
                      <td className={cn("p-2 max-w-[200px] truncate", light ? "text-red-500" : "text-destructive")}>{l.error_message || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
