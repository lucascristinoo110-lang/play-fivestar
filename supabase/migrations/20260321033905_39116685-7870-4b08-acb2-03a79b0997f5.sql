
ALTER TABLE public.sports_matches
  ADD COLUMN IF NOT EXISTS featured_home boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured_sports boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS custom_odds_home numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS custom_odds_draw numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS custom_odds_away numeric DEFAULT NULL;
