import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Load Resend settings
    const { data: settings } = await supabase
      .from("site_settings")
      .select("id, resend_api_key, resend_from_email, site_name")
      .limit(1)
      .single();

    const resendKey = settings?.resend_api_key?.trim();
    if (!resendKey) {
      console.log("Resend not configured, skipping automations");
      return new Response(JSON.stringify({ skipped: true, reason: "Resend not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fromEmail = settings?.resend_from_email || "noreply@seudominio.com";
    const siteName = settings?.site_name || "Casino";

    // Load active templates
    const { data: templates } = await supabase
      .from("email_templates")
      .select("*")
      .eq("is_active", true);

    if (!templates || templates.length === 0) {
      console.log("No active templates");
      return new Response(JSON.stringify({ skipped: true, reason: "No active templates" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalSent = 0;
    let totalFailed = 0;

    // Helper: check if email was already sent for this template+user combo
    async function alreadySent(templateId: string, userId: string): Promise<boolean> {
      const { data } = await supabase
        .from("email_log")
        .select("id")
        .eq("template_id", templateId)
        .eq("recipient_user_id", userId)
        .eq("status", "sent")
        .limit(1);
      return (data && data.length > 0);
    }

    // Helper: send email
    async function sendEmail(templateId: string, recipientEmail: string, recipientUserId: string, subject: string, bodyHtml: string) {
      try {
        const finalSubject = subject.replace(/\{\{site_name\}\}/g, siteName);
        const finalBody = bodyHtml
          .replace(/\{\{site_name\}\}/g, siteName)
          .replace(/\{\{email\}\}/g, recipientEmail)
          .replace(/\{\{site_url\}\}/g, Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", "") || "");

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: `${siteName} <${fromEmail}>`,
            to: [recipientEmail],
            subject: finalSubject,
            html: finalBody,
          }),
        });

        const resData = await res.json();

        await supabase.from("email_log").insert({
          template_id: templateId,
          recipient_email: recipientEmail,
          recipient_user_id: recipientUserId,
          status: res.ok ? "sent" : "failed",
          error_message: res.ok ? null : JSON.stringify(resData),
        });

        if (res.ok) totalSent++;
        else totalFailed++;

        // Rate limit delay
        await new Promise(r => setTimeout(r, 150));
      } catch (e: any) {
        totalFailed++;
        await supabase.from("email_log").insert({
          template_id: templateId,
          recipient_email: recipientEmail,
          recipient_user_id: recipientUserId,
          status: "failed",
          error_message: e.message,
        });
      }
    }

    for (const template of templates) {
      const triggerType = template.trigger_type;
      const delayHours = Number(template.trigger_delay_hours) || 0;

      // ── signup_completed: send to users who signed up and haven't received this email yet ──
      if (triggerType === "signup_completed") {
        // Get users who signed up in the last 24h
        const cutoff = new Date();
        cutoff.setHours(cutoff.getHours() - 24);

        const { data: profiles } = await supabase
          .from("profiles")
          .select("email, user_id, created_at")
          .not("email", "is", null)
          .gte("created_at", cutoff.toISOString())
          .limit(200);

        for (const profile of (profiles || [])) {
          if (!profile.email) continue;
          const sent = await alreadySent(template.id, profile.user_id);
          if (sent) continue;
          await sendEmail(template.id, profile.email, profile.user_id, template.subject, template.body_html);
        }
      }

      // ── deposit_pending: users who signed up but never completed a deposit ──
      if (triggerType === "deposit_pending") {
        const cutoff = new Date();
        cutoff.setHours(cutoff.getHours() - Math.max(delayHours, 1));
        const upperCutoff = new Date();
        upperCutoff.setHours(upperCutoff.getHours() - Math.max(delayHours, 1) + 24);

        const { data: profiles } = await supabase
          .from("profiles")
          .select("email, user_id, created_at")
          .not("email", "is", null)
          .lte("created_at", cutoff.toISOString())
          .limit(500);

        if (profiles && profiles.length > 0) {
          const userIds = profiles.map(p => p.user_id);
          const { data: depositors } = await supabase
            .from("transactions")
            .select("user_id")
            .in("user_id", userIds)
            .eq("type", "deposit")
            .eq("status", "completed");

          const depositorIds = new Set(depositors?.map(d => d.user_id) ?? []);

          for (const profile of profiles) {
            if (!profile.email || depositorIds.has(profile.user_id)) continue;
            const sent = await alreadySent(template.id, profile.user_id);
            if (sent) continue;
            await sendEmail(template.id, profile.email, profile.user_id, template.subject, template.body_html);
          }
        }
      }

      // ── post_signup_inactive: X hours after signup without deposit ──
      if (triggerType === "post_signup_inactive") {
        const hoursAgo = new Date();
        hoursAgo.setHours(hoursAgo.getHours() - delayHours);
        // Window: users who signed up between delayHours and delayHours+6 hours ago
        const windowEnd = new Date();
        windowEnd.setHours(windowEnd.getHours() - delayHours - 6);

        const { data: profiles } = await supabase
          .from("profiles")
          .select("email, user_id, created_at")
          .not("email", "is", null)
          .lte("created_at", hoursAgo.toISOString())
          .gte("created_at", windowEnd.toISOString())
          .limit(500);

        if (profiles && profiles.length > 0) {
          const userIds = profiles.map(p => p.user_id);
          const { data: depositors } = await supabase
            .from("transactions")
            .select("user_id")
            .in("user_id", userIds)
            .eq("type", "deposit")
            .eq("status", "completed");

          const depositorIds = new Set(depositors?.map(d => d.user_id) ?? []);

          for (const profile of profiles) {
            if (!profile.email || depositorIds.has(profile.user_id)) continue;
            const sent = await alreadySent(template.id, profile.user_id);
            if (sent) continue;
            await sendEmail(template.id, profile.email, profile.user_id, template.subject, template.body_html);
          }
        }
      }

      // ── manual with delay (scheduled automations): send to all users who haven't received it ──
      if (triggerType === "manual" && delayHours > 0) {
        // These are scheduled flows - send to users who registered more than delayHours ago
        // and haven't received this template yet
        const cutoff = new Date();
        cutoff.setHours(cutoff.getHours() - delayHours);

        const { data: profiles } = await supabase
          .from("profiles")
          .select("email, user_id, created_at")
          .not("email", "is", null)
          .lte("created_at", cutoff.toISOString())
          .limit(500);

        if (profiles && profiles.length > 0) {
          // Check who hasn't deposited
          const userIds = profiles.map(p => p.user_id);
          const { data: depositors } = await supabase
            .from("transactions")
            .select("user_id")
            .in("user_id", userIds)
            .eq("type", "deposit")
            .eq("status", "completed");

          const depositorIds = new Set(depositors?.map(d => d.user_id) ?? []);

          for (const profile of profiles) {
            if (!profile.email || depositorIds.has(profile.user_id)) continue;
            const sent = await alreadySent(template.id, profile.user_id);
            if (sent) continue;
            await sendEmail(template.id, profile.email, profile.user_id, template.subject, template.body_html);
          }
        }
      }
    }

    console.log(`Automations processed: ${totalSent} sent, ${totalFailed} failed`);

    return new Response(
      JSON.stringify({ success: true, sent: totalSent, failed: totalFailed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Automation error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
