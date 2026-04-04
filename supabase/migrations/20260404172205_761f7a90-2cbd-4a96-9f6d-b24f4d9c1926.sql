
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS playfiver_live_api_key text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS playfiver_live_active boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS playfiver_slots_active boolean DEFAULT true;
