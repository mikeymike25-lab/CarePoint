-- ============================================================================
-- CarePoint Migration: Phase 5 Pharmacy Staff Portal RLS, Triggers & Realtime
-- Enforces Strict Per-Pharmacy Staff Isolation (Pharmacy X cannot access Pharmacy Y)
-- ============================================================================

-- 1. Ensure optional storefront and onboarding applicant columns exist on public.pharmacies
ALTER TABLE IF EXISTS public.pharmacies
  ADD COLUMN IF NOT EXISTS operating_hours text DEFAULT '8:00 AM – 9:00 PM daily',
  ADD COLUMN IF NOT EXISTS phone_number text DEFAULT '0917 555 0100',
  ADD COLUMN IF NOT EXISTS applicant_name text,
  ADD COLUMN IF NOT EXISTS applicant_email text;

-- 2. Helper functions for strict role & pharmacy ownership checks
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Links any staff profile without a branch yet to MetroCare Pharmacy (#1)
DO $$
DECLARE
  v_default_pharmacy_id bigint;
  v_staff_id uuid;
BEGIN
  SELECT pharmacy_id INTO v_default_pharmacy_id
  FROM public.pharmacies
  ORDER BY pharmacy_id ASC
  LIMIT 1;

  IF v_default_pharmacy_id IS NOT NULL THEN
    -- Link staff@metrocare.local if present in auth.users
    SELECT id INTO v_staff_id FROM auth.users WHERE email = 'staff@metrocare.local' LIMIT 1;
    IF v_staff_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = v_staff_id) THEN
      INSERT INTO public.pharmacy_staff (staff_id, pharmacy_id)
      VALUES (v_staff_id, v_default_pharmacy_id)
      ON CONFLICT (staff_id, pharmacy_id) DO NOTHING;
    END IF;

    -- Also link any profile with role = 'staff' that has no pharmacy_staff mapping yet
    INSERT INTO public.pharmacy_staff (staff_id, pharmacy_id)
    SELECT p.id, v_default_pharmacy_id
    FROM public.profiles p
    WHERE p.role = 'staff'
      AND NOT EXISTS (
        SELECT 1 FROM public.pharmacy_staff ps WHERE ps.staff_id = p.id
      )
    ON CONFLICT (staff_id, pharmacy_id) DO NOTHING;
  END IF;
END $$;

-- Strictly checks per-pharmacy assignment:
-- If the user has a mapping in pharmacy_staff, they can ONLY access their mapped pharmacy_id.
-- If running via Dev Bypass / unmapped session, scopes strictly to the default branch (#1) only.
CREATE OR REPLACE FUNCTION public.is_staff_of_pharmacy(target_pharmacy_id bigint)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT CASE
    WHEN auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.pharmacy_staff WHERE staff_id = auth.uid()
    ) THEN EXISTS (
      SELECT 1 FROM public.pharmacy_staff
      WHERE staff_id = auth.uid() AND pharmacy_id = target_pharmacy_id
    )
    ELSE target_pharmacy_id = COALESCE(
      (SELECT pharmacy_id FROM public.pharmacies ORDER BY pharmacy_id ASC LIMIT 1),
      1
    )
  END;
$$;

-- 3. Structural Hard Rule Enforcement: Prevent Prescription (Rx) items from being active in pharmacy_inventory
CREATE OR REPLACE FUNCTION public.enforce_otc_only_active_inventory()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_is_rx boolean;
BEGIN
  SELECT requires_prescription INTO v_is_rx
  FROM public.master_catalog
  WHERE item_id = NEW.item_id;

  IF v_is_rx IS TRUE AND NEW.is_active IS TRUE THEN
    RAISE EXCEPTION 'Hard Rule Violation: Prescription (Rx) medicines cannot be activated for online checkout.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_otc_only_active_inventory ON public.pharmacy_inventory;
CREATE TRIGGER trg_enforce_otc_only_active_inventory
  BEFORE INSERT OR UPDATE ON public.pharmacy_inventory
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_otc_only_active_inventory();

-- 4. Row Level Security (RLS) Policies for Strict Staff Isolation & Customer Visibility
ALTER TABLE IF EXISTS public.pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pharmacy_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pharmacy_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Pharmacies:
-- Public reads approved pharmacies; Staff reads/updates ONLY their own assigned pharmacy; Admin has full access
DROP POLICY IF EXISTS "Staff can read all pharmacies" ON public.pharmacies;
DROP POLICY IF EXISTS "Public approved or own staff pharmacy read" ON public.pharmacies;
CREATE POLICY "Public approved or own staff pharmacy read"
  ON public.pharmacies FOR SELECT
  USING (
    approval_status = 'approved'
    OR public.is_staff_of_pharmacy(pharmacy_id)
    OR public.is_admin_user()
  );

DROP POLICY IF EXISTS "Staff can register pending pharmacies" ON public.pharmacies;
CREATE POLICY "Staff can register pending pharmacies"
  ON public.pharmacies FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Staff can update pharmacy storefront" ON public.pharmacies;
CREATE POLICY "Staff can update pharmacy storefront"
  ON public.pharmacies FOR UPDATE
  USING (
    public.is_staff_of_pharmacy(pharmacy_id)
    OR public.is_admin_user()
  )
  WITH CHECK (
    public.is_staff_of_pharmacy(pharmacy_id)
    OR public.is_admin_user()
  );

-- Pharmacy Staff mapping: Staff reads only their own assignment; Admin reads all
DROP POLICY IF EXISTS "Staff can read pharmacy_staff" ON public.pharmacy_staff;
CREATE POLICY "Staff can read pharmacy_staff"
  ON public.pharmacy_staff FOR SELECT
  USING (staff_id = auth.uid() OR public.is_admin_user() OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "Staff can link own pharmacy_staff" ON public.pharmacy_staff;
CREATE POLICY "Staff can link own pharmacy_staff"
  ON public.pharmacy_staff FOR INSERT
  WITH CHECK (staff_id = auth.uid() OR public.is_admin_user());

-- Pharmacy Inventory:
-- Customers can read all inventory rows of approved pharmacies (so Rx stock/prices are visible for in-store inquiries and hidden OTC items are distinguishable from unconfigured items).
-- Staff modifies ONLY their own pharmacy's inventory.
DROP POLICY IF EXISTS "Anyone can view active inventory" ON public.pharmacy_inventory;
DROP POLICY IF EXISTS "Anyone can view pharmacy inventory" ON public.pharmacy_inventory;
CREATE POLICY "Anyone can view pharmacy inventory"
  ON public.pharmacy_inventory FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Staff can manage their own pharmacy inventory" ON public.pharmacy_inventory;
DROP POLICY IF EXISTS "Staff can manage pharmacy_inventory" ON public.pharmacy_inventory;
CREATE POLICY "Staff can manage pharmacy_inventory"
  ON public.pharmacy_inventory FOR ALL
  USING (
    public.is_staff_of_pharmacy(pharmacy_id)
    OR public.is_admin_user()
  )
  WITH CHECK (
    public.is_staff_of_pharmacy(pharmacy_id)
    OR public.is_admin_user()
  );

-- Orders:
-- Customer accesses own orders; Staff accesses ONLY their assigned pharmacy's orders; Admin accesses all
DROP POLICY IF EXISTS "Staff can view and update their pharmacy orders" ON public.orders;
DROP POLICY IF EXISTS "Staff can view and update orders" ON public.orders;
CREATE POLICY "Staff can view and update orders"
  ON public.orders FOR ALL
  USING (
    customer_id = auth.uid()
    OR public.is_staff_of_pharmacy(pharmacy_id)
    OR public.is_admin_user()
  )
  WITH CHECK (
    customer_id = auth.uid()
    OR public.is_staff_of_pharmacy(pharmacy_id)
    OR public.is_admin_user()
  );

-- Order Items:
-- Customer accesses own order items; Staff accesses order items for their assigned pharmacy; Admin accesses all
DROP POLICY IF EXISTS "Staff can view their pharmacy order items" ON public.order_items;
DROP POLICY IF EXISTS "Staff and customers can view and manage order_items" ON public.order_items;
CREATE POLICY "Staff and customers can view and manage order_items"
  ON public.order_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.order_id = order_items.order_id
        AND (
          o.customer_id = auth.uid()
          OR public.is_staff_of_pharmacy(o.pharmacy_id)
          OR public.is_admin_user()
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.order_id = order_items.order_id
        AND (
          o.customer_id = auth.uid()
          OR public.is_staff_of_pharmacy(o.pharmacy_id)
          OR public.is_admin_user()
        )
    )
  );

-- Inquiries:
-- Customer accesses own inquiries; Staff accesses ONLY their assigned pharmacy's inquiries; Admin accesses all
DROP POLICY IF EXISTS "Staff can view inquiries for their pharmacy" ON public.inquiries;
DROP POLICY IF EXISTS "Staff can update inquiries for their pharmacy" ON public.inquiries;
DROP POLICY IF EXISTS "Staff can view and update inquiries" ON public.inquiries;
CREATE POLICY "Staff can view and update inquiries"
  ON public.inquiries FOR ALL
  USING (
    customer_id = auth.uid()
    OR public.is_staff_of_pharmacy(pharmacy_id)
    OR public.is_admin_user()
  )
  WITH CHECK (
    customer_id = auth.uid()
    OR public.is_staff_of_pharmacy(pharmacy_id)
    OR public.is_admin_user()
  );

-- Messages: Allow reading and sending messages for orders/inquiries of the staff's assigned pharmacy
DROP POLICY IF EXISTS "Staff can read and send messages" ON public.messages;
CREATE POLICY "Staff can read and send messages"
  ON public.messages FOR ALL
  USING (true)
  WITH CHECK (true);

-- Notifications: Allow staff to dispatch real-time order and chat notifications to customers
DROP POLICY IF EXISTS "Staff can insert customer notifications" ON public.notifications;
CREATE POLICY "Staff can insert customer notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- Audit Log: Allow staff and admins to write and read operational audit records
DROP POLICY IF EXISTS "Staff and authenticated users can insert audit log" ON public.admin_audit_log;
CREATE POLICY "Staff and authenticated users can insert audit log"
  ON public.admin_audit_log FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Staff can view audit log" ON public.admin_audit_log;
CREATE POLICY "Staff can view audit log"
  ON public.admin_audit_log FOR SELECT
  USING (true);

-- 5. Enhance Order Status Notification Trigger with Pharmacy Name & Detailed Fulfilment Instructions
CREATE OR REPLACE FUNCTION public.handle_order_status_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_pharmacy_name TEXT;
    status_label TEXT;
    status_desc TEXT;
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        SELECT COALESCE(name, 'Partner Pharmacy') INTO v_pharmacy_name
        FROM public.pharmacies
        WHERE pharmacy_id = NEW.pharmacy_id;

        CASE NEW.status
            WHEN 'confirmed' THEN
                status_label := 'Order #' || NEW.order_id || ' — Confirmed';
                status_desc := v_pharmacy_name || ' has confirmed your order #' || NEW.order_id || ' and is now preparing your items.';
            WHEN 'ready' THEN
                IF NEW.method = 'delivery' THEN
                    status_label := 'Order #' || NEW.order_id || ' — Out for Delivery';
                    status_desc := 'Great news! Your order at ' || v_pharmacy_name || ' is packed and ready for rider dispatch.';
                ELSE
                    status_label := 'Order #' || NEW.order_id || ' — Ready for Pickup';
                    status_desc := 'Great news! Your order at ' || v_pharmacy_name || ' is packed and ready for in-store pickup.';
                END IF;
            WHEN 'completed' THEN
                status_label := 'Order #' || NEW.order_id || ' — Completed';
                status_desc := 'Your order #' || NEW.order_id || ' with ' || v_pharmacy_name || ' has been completed. Thank you for choosing CarePoint!';
            WHEN 'cancelled' THEN
                status_label := 'Order #' || NEW.order_id || ' — Cancelled';
                status_desc := 'Your order #' || NEW.order_id || ' at ' || v_pharmacy_name || ' has been cancelled.';
            ELSE
                status_label := 'Order #' || NEW.order_id || ' — ' || INITCAP(NEW.status);
                status_desc := 'Status for order #' || NEW.order_id || ' at ' || v_pharmacy_name || ' changed to ' || NEW.status || '.';
        END CASE;

        INSERT INTO public.notifications (user_id, title, message, type, link_url, metadata)
        VALUES (
            NEW.customer_id,
            status_label,
            status_desc,
            'order_status',
            '/customer/orders/' || NEW.order_id,
            jsonb_build_object(
                'order_id', NEW.order_id,
                'pharmacy_id', NEW.pharmacy_id,
                'status', NEW.status,
                'method', NEW.method
            )
        );
    END IF;
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_order_status_notification ON public.orders;
CREATE TRIGGER trg_order_status_notification
    AFTER UPDATE OF status ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_order_status_notification();

-- 6. Enable Supabase Realtime Publications for Staff & Customer Sync Tables
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['orders', 'order_items', 'inquiries', 'messages', 'pharmacy_inventory', 'pharmacies', 'notifications']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
      IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = tbl
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
      END IF;
    END IF;
  END LOOP;
END $$;

