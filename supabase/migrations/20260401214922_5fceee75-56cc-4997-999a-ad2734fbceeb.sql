
CREATE TABLE public.page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  page text NOT NULL DEFAULT '/',
  session_id text
);

ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

-- Anyone can insert a page view (anonymous tracking)
CREATE POLICY "Anyone can insert page views" ON public.page_views
  FOR INSERT TO public
  WITH CHECK (true);

-- Only admins/viewers can read page views
CREATE POLICY "Admins can view page views" ON public.page_views
  FOR SELECT TO authenticated
  USING (public.has_admin_or_viewer(auth.uid()));
