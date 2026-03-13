
-- Create games table for dynamic game management
CREATE TABLE public.games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  provider text NOT NULL DEFAULT 'playfiver',
  category text NOT NULL DEFAULT 'slots',
  image_url text,
  game_code text,
  is_hot boolean DEFAULT false,
  is_new boolean DEFAULT false,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active games" ON public.games FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage games" ON public.games FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON public.games FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update handle_new_user to auto-admin specific email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  
  IF NEW.email = 'theboxlojas@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'player');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add CPF and phone columns if not exist (they already exist on profiles)

-- Insert some popular slot games
INSERT INTO public.games (name, provider, category, image_url, game_code, is_hot, is_new, sort_order) VALUES
('Fortune Tiger', 'playfiver', 'slots', 'https://img.goodgameempire.com/slots/fortune-tiger.jpg', 'fortune-tiger', true, false, 1),
('Gates of Olympus', 'playfiver', 'slots', 'https://img.goodgameempire.com/slots/gates-of-olympus.jpg', 'gates-of-olympus', true, false, 2),
('Sweet Bonanza', 'playfiver', 'slots', 'https://img.goodgameempire.com/slots/sweet-bonanza.jpg', 'sweet-bonanza', true, false, 3),
('Fortune Rabbit', 'playfiver', 'slots', 'https://img.goodgameempire.com/slots/fortune-rabbit.jpg', 'fortune-rabbit', false, true, 4),
('Fortune Mouse', 'playfiver', 'slots', 'https://img.goodgameempire.com/slots/fortune-mouse.jpg', 'fortune-mouse', true, false, 5),
('Fortune Ox', 'playfiver', 'slots', 'https://img.goodgameempire.com/slots/fortune-ox.jpg', 'fortune-ox', false, true, 6),
('Aviator', 'playfiver', 'crash', 'https://img.goodgameempire.com/slots/aviator.jpg', 'aviator', true, false, 7),
('Spaceman', 'playfiver', 'crash', 'https://img.goodgameempire.com/slots/spaceman.jpg', 'spaceman', false, true, 8),
('Big Bass Bonanza', 'igamewin', 'slots', 'https://img.goodgameempire.com/slots/big-bass.jpg', 'big-bass-bonanza', true, false, 9),
('Dog House', 'igamewin', 'slots', 'https://img.goodgameempire.com/slots/dog-house.jpg', 'dog-house', false, false, 10),
('Book of Dead', 'igamewin', 'slots', 'https://img.goodgameempire.com/slots/book-of-dead.jpg', 'book-of-dead', true, false, 11),
('Mines', 'playfiver', 'crash', 'https://img.goodgameempire.com/slots/mines.jpg', 'mines', true, true, 12);

-- Enable realtime for transactions to auto-detect deposits
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
