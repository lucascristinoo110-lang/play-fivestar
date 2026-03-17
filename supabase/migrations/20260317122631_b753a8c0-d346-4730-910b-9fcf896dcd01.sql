
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS welcome_popup_active boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS welcome_popup_title text DEFAULT '🎁 SEU SALDO ESTÁ PRONTO PARA SER LIBERADO',
  ADD COLUMN IF NOT EXISTS welcome_popup_body text DEFAULT E'Você já desbloqueou o benefício exclusivo.\n\n💰 Seu primeiro depósito será ativado com até 3X MAIS SALDO\n✅ Sem rollover\n✅ Saque liberado\n\n⚠️ Falta apenas 1 passo para liberar:\n\n👉 Faça um depósito mínimo agora para ativar seu saldo\n\n⏳ Oferta válida por poucos minutos',
  ADD COLUMN IF NOT EXISTS welcome_popup_button_text text DEFAULT '👉 ATIVAR MEU SALDO AGORA',
  ADD COLUMN IF NOT EXISTS welcome_popup_timer_minutes integer DEFAULT 10;
