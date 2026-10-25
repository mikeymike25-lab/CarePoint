-- ============================================================================
-- CarePoint Migration: Partner Pharmacy Inquiry, Admin Decision Email & Staff Auto-Link
-- ============================================================================

-- 1. Extend public.pharmacies with partner inquiry & admin decision metadata
ALTER TABLE IF EXISTS public.pharmacies
  ADD COLUMN IF NOT EXISTS operating_hours TEXT DEFAULT '8:00 AM – 9:00 PM daily',
  ADD COLUMN IF NOT EXISTS phone_number TEXT DEFAULT '0917 555 0100',
  ADD COLUMN IF NOT EXISTS applicant_name TEXT,
  ADD COLUMN IF NOT EXISTS applicant_email TEXT,
  ADD COLUMN IF NOT EXISTS inquiry_notes TEXT,
  ADD COLUMN IF NOT EXISTS admin_decision_note TEXT,
  ADD COLUMN IF NOT EXISTS decided_at TIMESTAMPTZ;

-- 2. Ensure public.profiles has email and account_status columns & backfill emails from auth.users
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'active';

UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id
  AND (p.email IS NULL OR p.email = '');

-- 3. Allow unauthenticated (public) partner pharmacy inquiries on Sign In (pending only)
ALTER TABLE IF EXISTS public.pharmacies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can register pending pharmacies" ON public.pharmacies;
DROP POLICY IF EXISTS "Public and staff can submit pending pharmacy inquiries" ON public.pharmacies;

CREATE POLICY "Public and staff can submit pending pharmacy inquiries"
  ON public.pharmacies FOR INSERT
  WITH CHECK (approval_status = 'pending');

-- 4. Auto-promote & link applicant account when a new user registers with an approved pharmacy's applicant_email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  assigned_role public.user_role;
  v_matched_pharmacy_id BIGINT;
BEGIN
  BEGIN
    assigned_role := (NEW.raw_user_meta_data->>'role')::public.user_role;
  EXCEPTION WHEN OTHERS THEN
    assigned_role := 'customer'::public.user_role;
  END;

  IF assigned_role IS NULL THEN
    assigned_role := 'customer'::public.user_role;
  END IF;

  -- Check if this user's email matches an approved pharmacy inquiry's applicant_email
  IF NEW.email IS NOT NULL THEN
    SELECT pharmacy_id INTO v_matched_pharmacy_id
    FROM public.pharmacies
    WHERE approval_status = 'approved'
      AND LOWER(TRIM(COALESCE(applicant_email, ''))) = LOWER(TRIM(NEW.email))
    ORDER BY pharmacy_id DESC
    LIMIT 1;

    IF v_matched_pharmacy_id IS NOT NULL AND assigned_role = 'customer'::public.user_role THEN
      assigned_role := 'staff'::public.user_role;
    END IF;
  END IF;

  INSERT INTO public.profiles (id, role, full_name, phone_number, email)
  VALUES (
    NEW.id,
    assigned_role,
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'phone_number',
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name,
    phone_number = COALESCE(EXCLUDED.phone_number, public.profiles.phone_number),
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    updated_at = NOW();

  -- If matched to an approved pharmacy, link user in public.pharmacy_staff
  IF v_matched_pharmacy_id IS NOT NULL THEN
    INSERT INTO public.pharmacy_staff (staff_id, pharmacy_id)
    VALUES (NEW.id, v_matched_pharmacy_id)
    ON CONFLICT (staff_id, pharmacy_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Auto-promote & link existing user if Admin approves a pharmacy inquiry matching their email
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
      SET role = 'staff', updated_at = NOW()
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

DROP TRIGGER IF EXISTS trg_auto_link_approved_pharmacy_staff ON public.pharmacies;
CREATE TRIGGER trg_auto_link_approved_pharmacy_staff
  AFTER INSERT OR UPDATE OF approval_status, applicant_email ON public.pharmacies
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_pharmacy_approval_staff_link();
