-- ============================================================================
-- Migration: 20261020000023_harden_pharmacy_owner_rls.sql
-- Description:
-- 1. Helper function: public.is_pharmacy_owner_of(target_pharmacy_id)
-- 2. Restricts UPDATE on public.pharmacies strictly to Pharmacy Owners & Admins
--    (Staff cannot modify storefront or toggle online availability at DB level)
-- 3. Updates auto-link trigger to promote approved applicants to 'pharmacy_owner'
-- ============================================================================

-- 1. Helper function: checks if the authenticated user is an owner of the pharmacy
CREATE OR REPLACE FUNCTION public.is_pharmacy_owner_of(target_pharmacy_id bigint)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.pharmacy_staff ps ON ps.staff_id = p.id
    WHERE p.id = auth.uid()
      AND p.role = 'pharmacy_owner'
      AND ps.pharmacy_id = target_pharmacy_id
  );
$$;

-- 2. Enforce DB-level restriction on public.pharmacies
-- Staff members can read approved pharmacies, but only Pharmacy Owners and Admins can UPDATE storefront details
DROP POLICY IF EXISTS "Staff can update pharmacy storefront" ON public.pharmacies;
DROP POLICY IF EXISTS "Pharmacy owner can update storefront" ON public.pharmacies;
DROP POLICY IF EXISTS "Pharmacy owner can update pharmacy storefront" ON public.pharmacies;

CREATE POLICY "Pharmacy owner can update pharmacy storefront"
  ON public.pharmacies FOR UPDATE
  USING (
    public.is_pharmacy_owner_of(pharmacy_id)
    OR public.is_admin_user()
  )
  WITH CHECK (
    public.is_pharmacy_owner_of(pharmacy_id)
    OR public.is_admin_user()
  );

-- 3. Update the approval trigger to set role = 'pharmacy_owner' when an applicant's branch is approved
CREATE OR REPLACE FUNCTION public.handle_pharmacy_approval_staff_link()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  IF NEW.approval_status = 'approved' AND NEW.applicant_email IS NOT NULL AND TRIM(NEW.applicant_email) <> '' THEN
    SELECT id INTO v_user_id
    FROM public.profiles
    WHERE LOWER(TRIM(COALESCE(email, ''))) = LOWER(TRIM(NEW.applicant_email))
      AND role <> 'admin'
    LIMIT 1;

    IF v_user_id IS NULL THEN
      SELECT id INTO v_user_id
      FROM auth.users
      WHERE LOWER(TRIM(COALESCE(email, ''))) = LOWER(TRIM(NEW.applicant_email))
      LIMIT 1;
    END IF;

    IF v_user_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id AND role <> 'admin') THEN
      UPDATE public.profiles
      SET role = 'pharmacy_owner', updated_at = NOW()
      WHERE id = v_user_id AND role <> 'admin';

      DELETE FROM public.pharmacy_staff WHERE staff_id = v_user_id;

      INSERT INTO public.pharmacy_staff (staff_id, pharmacy_id)
      VALUES (v_user_id, NEW.pharmacy_id)
      ON CONFLICT (staff_id, pharmacy_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
