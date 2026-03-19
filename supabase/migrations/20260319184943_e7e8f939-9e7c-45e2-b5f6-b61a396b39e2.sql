DELETE FROM games
WHERE id NOT IN (
  SELECT DISTINCT ON (game_code) id
  FROM games
  ORDER BY game_code, created_at ASC
);