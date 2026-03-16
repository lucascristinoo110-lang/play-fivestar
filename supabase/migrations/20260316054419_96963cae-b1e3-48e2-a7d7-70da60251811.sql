-- Add more HOT games to reach 12
UPDATE games SET is_hot = true WHERE is_active = true AND game_code IN (
  'vs10txbigbass',   -- Big Bass Splash
  'vs20sugarrush',   -- Sugar Rush
  '1543462',         -- Fortune Rabbit
  '98',              -- Fortune Ox
  '1695365'          -- Fortune Dragon
) AND is_hot = false;