-- Deactivate one duplicate Bac Bo (keep f5e5f0b3)
UPDATE games SET is_active = false WHERE id = '7b13c53e-6473-427f-bc74-f9d5b6e586e1';

-- Rename the PT version
UPDATE games SET name = 'Bac Bo PT' WHERE id = '76a1e373-5d64-43db-b5d3-0c61f353f68a';
UPDATE games SET name = 'Bac Bo BR' WHERE id = 'd649fab5-892f-46ed-9bfb-6a69cc73d1c6' AND is_active = true;

-- Fix Lightning Roulette image with a known working alternative
UPDATE games SET image_url = 'https://imagensfivers.com/Games/Pragmatic-Play/PP_rla.webp' WHERE id = 'daa14824-162d-41a1-a27f-dd932c1fb02b';