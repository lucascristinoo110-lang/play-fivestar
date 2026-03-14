
-- Affiliates table
CREATE TABLE public.affiliates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  affiliate_code text UNIQUE NOT NULL,
  commission_type text NOT NULL DEFAULT 'revshare',
  commission_cpa numeric DEFAULT 0,
  commission_revshare numeric DEFAULT 30,
  total_clicks integer DEFAULT 0,
  total_signups integer DEFAULT 0,
  total_deposits numeric DEFAULT 0,
  total_earnings numeric DEFAULT 0,
  balance numeric DEFAULT 0,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Affiliate referrals
CREATE TABLE public.affiliate_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  referred_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  commission_earned numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(referred_user_id)
);

-- Promo banners
CREATE TABLE public.promo_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  image_url text NOT NULL,
  link_url text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Promo message (top bar)
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS promo_message text;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS promo_message_active boolean DEFAULT false;

-- RLS
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_banners ENABLE ROW LEVEL SECURITY;

-- Affiliates: users can read own, admins all
CREATE POLICY "Users can read own affiliate" ON public.affiliates FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage affiliates" ON public.affiliates FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Referrals: affiliates read own, admins all
CREATE POLICY "Affiliates read own referrals" ON public.affiliate_referrals FOR SELECT TO authenticated USING (
  affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Admins manage referrals" ON public.affiliate_referrals FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Banners: public read, admin write
CREATE POLICY "Public read banners" ON public.promo_banners FOR SELECT USING (true);
CREATE POLICY "Admins manage banners" ON public.promo_banners FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Realtime for affiliates
ALTER PUBLICATION supabase_realtime ADD TABLE public.affiliates;
ALTER PUBLICATION supabase_realtime ADD TABLE public.affiliate_referrals;
