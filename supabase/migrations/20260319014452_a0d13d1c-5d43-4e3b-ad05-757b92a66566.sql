
CREATE TABLE public.home_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text DEFAULT '',
  section_type text NOT NULL DEFAULT 'filter',
  filter_category text,
  filter_is_hot boolean DEFAULT false,
  filter_is_new boolean DEFAULT false,
  curated_game_codes text[] DEFAULT '{}',
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  max_games integer DEFAULT 12,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.home_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read sections" ON public.home_sections FOR SELECT TO public USING (true);
CREATE POLICY "Admins manage sections" ON public.home_sections FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.home_sections (title, subtitle, section_type, filter_is_hot, sort_order) VALUES
('🔥 Mais Jogados Agora', 'Jogos com maior tração no cassino', 'filter', true, 0);

INSERT INTO public.home_sections (title, subtitle, section_type, filter_category, sort_order) VALUES
('🎰 Roletas', 'As melhores roletas ao vivo e virtuais', 'filter', 'roulette', 1);

INSERT INTO public.home_sections (title, subtitle, section_type, curated_game_codes, sort_order) VALUES
('🔴 Cassino ao Vivo', 'As mesas mais quentes com dealers reais', 'curated',
 ARRAY['EVOLIVE_LightningTable01','EVOLIVE_BacBo00000000001','EVOLIVE_TopCard000000001','EVOLIVE_MegaBall00000001','EVOLIVE_LightningBac0001','EVOLIVE_XxxtremeLigh0001','EVOLIVE_LightningBacBo01','EVOLIVE_oytmvb9m1zysmc44','EVOLIVE_mrfykemt5slanyi5','EVOLIVE_SuperSicBo000001','EVOLIVE_gwbaccarat000001','EVOLIVE_NoCommBac0000001'],
 2);

INSERT INTO public.home_sections (title, subtitle, section_type, curated_game_codes, sort_order) VALUES
('🐉 Destaques PG Soft', 'Fortune Snake, Dragon Hatch e os mais jogados da PG', 'curated',
 ARRAY['1879752','1695365','1543462','1451122','1402846','1799745','87','42','75','89','130','48'],
 3);

INSERT INTO public.home_sections (title, subtitle, section_type, filter_category, sort_order) VALUES
('Slots Campeões', 'Títulos que mais convertem em sessão', 'filter', 'slots', 4);

INSERT INTO public.home_sections (title, subtitle, section_type, filter_category, sort_order) VALUES
('Crash e Multiplicadores', 'Sessão para gatilho de ação rápida', 'filter', 'crash', 5);
