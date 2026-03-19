import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").single();
    if (!roleData) return new Response(JSON.stringify({ error: "Acesso negado" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({}));
    const { action } = body;

    // Get Resend settings
    const { data: settings } = await supabase.from("site_settings").select("resend_api_key, resend_from_email, site_name").limit(1).single();
    const resendKey = settings?.resend_api_key?.trim();

    if (action === "test_connection") {
      if (!resendKey) return new Response(JSON.stringify({ connected: false, error: "API Key não configurada" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const res = await fetch("https://api.resend.com/domains", {
        headers: { Authorization: `Bearer ${resendKey}` },
      });

      if (res.ok) {
        const data = await res.json();
        await supabase.from("site_settings").update({ resend_connected: true }).eq("id", settings?.id ?? "");
        return new Response(JSON.stringify({ connected: true, domains: data?.data?.map((d: any) => d.name) ?? [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } else {
        await supabase.from("site_settings").update({ resend_connected: false }).eq("id", settings?.id ?? "");
        return new Response(JSON.stringify({ connected: false, error: `Resend retornou ${res.status}` }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Helper to get filtered recipients
    async function getFilteredRecipients(filter: any) {
      let query = supabase.from("profiles").select("email, user_id").not("email", "is", null);
      
      if (filter?.days_since_signup) {
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - Number(filter.days_since_signup));
        query = query.gte("created_at", daysAgo.toISOString());
      }

      const { data: profiles } = await query.limit(1000);
      let recipients = (profiles || []).filter((p: any) => p.email);

      if (filter?.has_deposit === false) {
        const userIds = recipients.map((r: any) => r.user_id);
        if (userIds.length > 0) {
          const { data: depositors } = await supabase.from("transactions").select("user_id").in("user_id", userIds).eq("type", "deposit").eq("status", "completed");
          const depositorIds = new Set(depositors?.map((d: any) => d.user_id) ?? []);
          recipients = recipients.filter((r: any) => !depositorIds.has(r.user_id));
        }
      }

      return recipients;
    }

    if (action === "count_recipients") {
      const { filter } = body;
      const recipients = await getFilteredRecipients(filter || {});
      return new Response(JSON.stringify({ count: recipients.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "send_campaign") {
      if (!resendKey) return new Response(JSON.stringify({ error: "Resend não configurado" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const { campaign_id } = body;
      if (!campaign_id) return new Response(JSON.stringify({ error: "campaign_id obrigatório" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const { data: campaign } = await supabase.from("email_campaigns").select("*").eq("id", campaign_id).single();
      if (!campaign) return new Response(JSON.stringify({ error: "Campanha não encontrada" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const filter = campaign.recipient_filter as any;
      const recipients = await getFilteredRecipients(filter);

      if (!recipients.length) return new Response(JSON.stringify({ error: "Nenhum destinatário encontrado" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const fromEmail = settings?.resend_from_email || "noreply@seudominio.com";
      const siteName = settings?.site_name || "Casino";

      await supabase.from("email_campaigns").update({ total_recipients: recipients.length, status: "sending", sent_at: new Date().toISOString() }).eq("id", campaign_id);

      let sentCount = 0;
      let failedCount = 0;

      for (const recipient of recipients) {
        try {
          const htmlBody = campaign.body_html
            .replace(/\{\{site_name\}\}/g, siteName)
            .replace(/\{\{site_url\}\}/g, Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", "") || "")
            .replace(/\{\{email\}\}/g, recipient.email);

          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: `${siteName} <${fromEmail}>`,
              to: [recipient.email],
              subject: campaign.subject.replace(/\{\{site_name\}\}/g, siteName),
              html: htmlBody,
            }),
          });

          const resData = await res.json();

          await supabase.from("email_log").insert({
            campaign_id,
            recipient_email: recipient.email,
            recipient_user_id: recipient.user_id,
            status: res.ok ? "sent" : "failed",
            error_message: res.ok ? null : JSON.stringify(resData),
          });

          if (res.ok) sentCount++;
          else failedCount++;

          // Small delay to avoid rate limits
          await new Promise(r => setTimeout(r, 100));
        } catch (e: any) {
          failedCount++;
          await supabase.from("email_log").insert({
            campaign_id,
            recipient_email: recipient.email,
            recipient_user_id: recipient.user_id,
            status: "failed",
            error_message: e.message,
          });
        }
      }

      await supabase.from("email_campaigns").update({ sent_count: sentCount, failed_count: failedCount, status: "completed" }).eq("id", campaign_id);

      return new Response(JSON.stringify({ success: true, sent: sentCount, failed: failedCount }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "send_automation") {
      if (!resendKey) return new Response(JSON.stringify({ error: "Resend não configurado" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const { template_id, user_id: targetUserId } = body;
      
      const { data: template } = await supabase.from("email_templates").select("*").eq("id", template_id).single();
      if (!template) return new Response(JSON.stringify({ error: "Template não encontrado" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const { data: profile } = await supabase.from("profiles").select("email, user_id").eq("user_id", targetUserId).single();
      if (!profile?.email) return new Response(JSON.stringify({ error: "Usuário sem email" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const fromEmail = settings?.resend_from_email || "noreply@seudominio.com";
      const siteName = settings?.site_name || "Casino";

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: `${siteName} <${fromEmail}>`,
          to: [profile.email],
          subject: template.subject.replace(/\{\{site_name\}\}/g, siteName),
          html: template.body_html.replace(/\{\{site_name\}\}/g, siteName).replace(/\{\{email\}\}/g, profile.email),
        }),
      });

      const resData = await res.json();

      await supabase.from("email_log").insert({
        template_id,
        recipient_email: profile.email,
        recipient_user_id: profile.user_id,
        status: res.ok ? "sent" : "failed",
        error_message: res.ok ? null : JSON.stringify(resData),
      });

      return new Response(JSON.stringify({ success: res.ok, data: resData }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Ação inválida. Use: test_connection, send_campaign, send_automation" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("Email error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
