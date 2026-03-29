-- Function to check if user is admin or viewer
CREATE OR REPLACE FUNCTION public.has_admin_or_viewer(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'viewer')
  )
$$;

-- Add viewer SELECT policies to all admin-managed tables
CREATE POLICY "Viewers can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_admin_or_viewer(auth.uid()));
CREATE POLICY "Viewers can view all transactions" ON public.transactions FOR SELECT TO authenticated USING (public.has_admin_or_viewer(auth.uid()));
CREATE POLICY "Viewers can view all documents" ON public.kyc_documents FOR SELECT TO authenticated USING (public.has_admin_or_viewer(auth.uid()));
CREATE POLICY "Viewers can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_admin_or_viewer(auth.uid()));
CREATE POLICY "Viewers can view all bets" ON public.bets FOR SELECT TO authenticated USING (public.has_admin_or_viewer(auth.uid()));
CREATE POLICY "Viewers can view affiliates" ON public.affiliates FOR SELECT TO authenticated USING (public.has_admin_or_viewer(auth.uid()));
CREATE POLICY "Viewers can view referrals" ON public.affiliate_referrals FOR SELECT TO authenticated USING (public.has_admin_or_viewer(auth.uid()));