
CREATE TABLE public.sports_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text UNIQUE,
  league_name text NOT NULL,
  league_api_id text NOT NULL,
  home_team text NOT NULL,
  away_team text NOT NULL,
  home_badge text,
  away_badge text,
  kickoff timestamp with time zone NOT NULL,
  home_score integer,
  away_score integer,
  status text NOT NULL DEFAULT 'upcoming',
  venue text,
  city text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.sports_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read matches" ON public.sports_matches FOR SELECT TO public USING (true);
CREATE POLICY "Admins manage matches" ON public.sports_matches FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
