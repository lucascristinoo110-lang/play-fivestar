ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS resend_api_key text;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS resend_from_email text DEFAULT 'noreply@seudominio.com';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS resend_connected boolean DEFAULT false;

CREATE TABLE public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text NOT NULL,
  body_html text NOT NULL,
  trigger_type text NOT NULL DEFAULT 'manual',
  trigger_delay_hours numeric DEFAULT 0,
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage email templates" ON public.email_templates
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  body_html text NOT NULL,
  recipient_filter jsonb DEFAULT '{}'::jsonb,
  total_recipients integer DEFAULT 0,
  sent_count integer DEFAULT 0,
  failed_count integer DEFAULT 0,
  status text DEFAULT 'draft',
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage campaigns" ON public.email_campaigns
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.email_campaigns(id) ON DELETE SET NULL,
  template_id uuid REFERENCES public.email_templates(id) ON DELETE SET NULL,
  recipient_email text NOT NULL,
  recipient_user_id uuid,
  status text DEFAULT 'pending',
  error_message text,
  sent_at timestamptz DEFAULT now()
);

ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage email log" ON public.email_log
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.email_templates (name, subject, body_html, trigger_type, trigger_delay_hours, is_active) VALUES
('Cadastro Concluído', 'Bem-vindo! 🎰', '<h1>Bem-vindo!</h1><p>Seu cadastro foi concluído com sucesso. Faça seu primeiro depósito e comece a jogar!</p>', 'signup_completed', 0, false),
('Depósito Não Pago', 'Seu depósito está pendente ⏳', '<h1>Depósito Pendente</h1><p>Notamos que você iniciou um depósito mas ainda não finalizou.</p>', 'deposit_pending', 1, false),
('Inatividade 3h após Cadastro', 'Esqueceu de nós? 🎁', '<h1>Volte e Jogue!</h1><p>Você se cadastrou há algumas horas mas ainda não fez seu primeiro depósito.</p>', 'post_signup_inactive', 3, false);