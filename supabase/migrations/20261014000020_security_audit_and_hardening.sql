-- ============================================================================
-- CarePoint Security Audit & Hardening Migration
-- Fixes Identified Vulnerabilities:
-- 1. Insecure Direct Role Modification / Privilege Escalation on public.profiles
-- 2. Unauthorized Self-Assignment in public.pharmacy_staff
-- 3. Complete Data Privacy Leakage in public.messages (dropping open USING (true))
-- 4. Customer Order Tampering (preventing status/price mutation by customers)
-- 5. Hard Block against self-assigning Admin role during Auth signup
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. HARDEN PROFILES: Prevent unauthorized role or account_status elevation
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If not an admin, prevent changing role or account_status
  IF NOT public.is_admin_user() THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'SECURITY VIOLATION: Unauthorized attempt to change user role.';
    END IF;

    IF NEW.account_status IS DISTINCT FROM OLD.account_status THEN
      RAISE EXCEPTION 'SECURITY VIOLATION: Unauthorized attempt to change account status.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_privilege_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_privilege_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- Harden public.handle_new_user so users cannot pass role='admin' in metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  assigned_role public.user_role;
  v_matched_pharmacy_id BIGINT;
BEGIN
  -- Default to customer. Even if user passes metadata, NEVER allow self-assigning admin!
  BEGIN
    assigned_role := (NEW.raw_user_meta_data->>'role')::public.user_role;
    IF assigned_role = 'admin'::public.user_role THEN
      assigned_role := 'customer'::public.user_role;
    END IF;
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


-- ----------------------------------------------------------------------------
-- 2. HARDEN PHARMACY STAFF: Disallow unauthorized self-assignment
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff can link own pharmacy_staff" ON public.pharmacy_staff;

-- Only Admins can manage pharmacy staff mappings manually
DROP POLICY IF EXISTS "Admins have full access to pharmacy_staff" ON public.pharmacy_staff;
CREATE POLICY "Admins have full access to pharmacy_staff"
  ON public.pharmacy_staff FOR ALL
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());


-- ----------------------------------------------------------------------------
-- 3. HARDEN MESSAGES: Close open RLS policy and enforce strict access control
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff can read and send messages" ON public.messages;
DROP POLICY IF EXISTS "Customers can chat on their orders" ON public.messages;
DROP POLICY IF EXISTS "Staff can chat on their pharmacy orders" ON public.messages;
DROP POLICY IF EXISTS "Authenticated users message isolation" ON public.messages;

-- Messages SELECT Policy: Participant only or Admin
CREATE POLICY "Messages participant select policy"
  ON public.messages FOR SELECT
  USING (
    sender_id = auth.uid()
    OR (
      order_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.order_id = messages.order_id
          AND (o.customer_id = auth.uid() OR public.is_staff_of_pharmacy(o.pharmacy_id))
      )
    )
    OR (
      inquiry_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.inquiries i
        WHERE i.inquiry_id = messages.inquiry_id
          AND (i.customer_id = auth.uid() OR public.is_staff_of_pharmacy(i.pharmacy_id))
      )
    )
    OR public.is_admin_user()
  );

-- Messages INSERT Policy: Must be sender and involved in the thread
CREATE POLICY "Messages participant insert policy"
  ON public.messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND (
      (
        order_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.orders o
          WHERE o.order_id = messages.order_id
            AND (o.customer_id = auth.uid() OR public.is_staff_of_pharmacy(o.pharmacy_id))
        )
      )
      OR (
        inquiry_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.inquiries i
          WHERE i.inquiry_id = messages.inquiry_id
            AND (i.customer_id = auth.uid() OR public.is_staff_of_pharmacy(i.pharmacy_id))
        )
      )
      OR public.is_admin_user()
    )
  );


-- ----------------------------------------------------------------------------
-- 4. HARDEN ORDERS: Disallow customers from modifying order totals or status
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff can view and update orders" ON public.orders;
DROP POLICY IF EXISTS "Customers can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Customers can create orders" ON public.orders;
DROP POLICY IF EXISTS "Staff and Admin can update orders" ON public.orders;

-- Customers can view own orders
CREATE POLICY "Customers can view their own orders"
  ON public.orders FOR SELECT
  USING (customer_id = auth.uid() OR public.is_staff_of_pharmacy(pharmacy_id) OR public.is_admin_user());

-- Customers can insert new orders
CREATE POLICY "Customers can create orders"
  ON public.orders FOR INSERT
  WITH CHECK (customer_id = auth.uid());

-- Only Staff of that pharmacy and Admins can update orders (e.g. status)
CREATE POLICY "Staff and Admin can update orders"
  ON public.orders FOR UPDATE
  USING (public.is_staff_of_pharmacy(pharmacy_id) OR public.is_admin_user())
  WITH CHECK (public.is_staff_of_pharmacy(pharmacy_id) OR public.is_admin_user());

-- Only Admins can delete orders
CREATE POLICY "Admins can delete orders"
  ON public.orders FOR DELETE
  USING (public.is_admin_user());
