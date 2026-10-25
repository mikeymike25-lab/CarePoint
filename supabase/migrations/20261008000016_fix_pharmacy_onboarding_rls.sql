-- Allow SELECT on newly onboarded ('pending' / 'rejected') pharmacies for Staff onboarding and status banner display,
-- while Customer queries strictly filter by approval_status = 'approved'.
DROP POLICY IF EXISTS "Public approved or own staff pharmacy read" ON public.pharmacies;
DROP POLICY IF EXISTS "Public approved or staff pharmacy read" ON public.pharmacies;

CREATE POLICY "Public approved or staff pharmacy read"
  ON public.pharmacies FOR SELECT
  USING (
    approval_status IN ('approved', 'pending', 'rejected')
    OR public.is_staff_of_pharmacy(pharmacy_id)
    OR public.is_admin_user()
  );
