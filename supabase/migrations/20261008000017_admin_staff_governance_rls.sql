-- ============================================================================
-- CarePoint Migration: Admin Staff Governance, Role Promotion & Branch Assignment RLS
-- Allows Admin to promote Customers to Staff, demote Staff to Customer, and
-- assign/reassign Staff members to specific Pharmacy branches (public.pharmacy_staff).
-- ============================================================================

-- 0. Ensure helper functions exist for RLS evaluation
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role::TEXT FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN AS $$
  SELECT COALESCE((SELECT role::TEXT = 'admin' FROM public.profiles WHERE id = auth.uid()), false);
$$ LANGUAGE sql SECURITY DEFINER;

-- 1. Ensure Admins have full CRUD access on public.profiles (including role promotion & account status)
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins have full access to profiles" ON public.profiles;
CREATE POLICY "Admins have full access to profiles"
  ON public.profiles FOR ALL
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

-- 2. Ensure Admins have full CRUD access on public.pharmacy_staff (assign/reassign/remove branch mapping)
ALTER TABLE IF EXISTS public.pharmacy_staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins have full access to pharmacy staff" ON public.pharmacy_staff;
DROP POLICY IF EXISTS "Admins have full access to pharmacy_staff" ON public.pharmacy_staff;
CREATE POLICY "Admins have full access to pharmacy_staff"
  ON public.pharmacy_staff FOR ALL
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

-- 3. Add public.pharmacy_staff to supabase_realtime publication for live branch reassignment sync
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pharmacy_staff') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'pharmacy_staff'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.pharmacy_staff;
    END IF;
  END IF;
END $$;
