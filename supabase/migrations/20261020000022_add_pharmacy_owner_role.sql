-- ============================================================================
-- Migration: Add pharmacy_owner role and update staff RLS policies
-- ============================================================================

-- 1. Safely add 'pharmacy_owner' to user_role ENUM type if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'pharmacy_owner'
  ) THEN
    ALTER TYPE user_role ADD VALUE 'pharmacy_owner';
  END IF;
END $$;

-- 2. Update get_user_role function if needed
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text FROM public.profiles WHERE id = auth.uid();
$$;

-- 3. Update staff-accessible RLS policies to allow both 'staff' and 'pharmacy_owner'
DO $$
BEGIN
  -- Profiles update check
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pharmacy_staff') THEN
    -- Ensure both staff and pharmacy_owner can read/interact with their assigned branch
    DROP POLICY IF EXISTS "Staff and admin can read pharmacy_staff" ON public.pharmacy_staff;
    CREATE POLICY "Staff and admin can read pharmacy_staff"
      ON public.pharmacy_staff FOR SELECT
      USING (
        staff_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END $$;
