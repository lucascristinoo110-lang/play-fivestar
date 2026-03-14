-- Bets table for sports betting
CREATE TABLE public.bets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ticket_number text NOT NULL UNIQUE,
  match_id text NOT NULL,
  match_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  bet_type text NOT NULL,
  odds numeric NOT NULL,
  amount numeric NOT NULL,
  potential_win numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  settled_at timestamptz
);

-- Enable RLS
ALTER TABLE public.bets ENABLE ROW LEVEL SECURITY;

-- Users can view their own bets
CREATE POLICY "Users can view own bets" ON public.bets FOR SELECT USING (auth.uid() = user_id);

-- Users can create own bets
CREATE POLICY "Users can insert own bets" ON public.bets FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can manage all bets
CREATE POLICY "Admins manage all bets" ON public.bets FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Function to generate ticket number
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.ticket_number := 'SB-' || LPAD(FLOOR(RANDOM() * 999999)::text, 6, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_ticket_number
  BEFORE INSERT ON public.bets
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_ticket_number();

-- Enable realtime for bets
ALTER PUBLICATION supabase_realtime ADD TABLE public.bets;