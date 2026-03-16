ALTER TABLE public.site_settings 
  ADD COLUMN IF NOT EXISTS meta_pixel_id text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS meta_api_key text DEFAULT NULL;