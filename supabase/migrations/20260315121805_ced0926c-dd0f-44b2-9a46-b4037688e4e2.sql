
ALTER TABLE public.promo_banners 
  ADD COLUMN IF NOT EXISTS placement text NOT NULL DEFAULT 'home';

ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
