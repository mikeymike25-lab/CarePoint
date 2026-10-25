-- ============================================================================
-- CarePoint Security Hardening Migration (Phase 2)
-- Fixes:
-- 1. Close is_staff_of_pharmacy default branch backdoor (dev bypass removal)
-- 2. Restrict order_items RLS (drop over-permissive FOR ALL for customers)
-- 3. Database-level price & OTC integrity trigger on order_items
-- 4. Automatic order total recalculation trigger on order_items
-- 5. Safe rollback deletion policy for empty pending orders
-- 6. Lock down notifications INSERT and admin_audit_log SELECT
-- 7. Restrict pharmacy_staff SELECT to staff owner and admins
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. CLOSE BRANCH BACKDOOR: Enforce authentic membership in pharmacy_staff
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_staff_of_pharmacy(target_pharmacy_id bigint)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT CASE
    WHEN auth.uid() IS NOT NULL THEN EXISTS (
      SELECT 1 FROM public.pharmacy_staff
      WHERE staff_id = auth.uid() AND pharmacy_id = target_pharmacy_id
    )
    ELSE false
  END;
$$;

-- ----------------------------------------------------------------------------
-- 2. HARDEN ORDER ITEMS: Restrict RLS policies
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff and customers can view and manage order_items" ON public.order_items;
DROP POLICY IF EXISTS "Customers can view their own order items" ON public.order_items;
DROP POLICY IF EXISTS "Customers can add items to their orders" ON public.order_items;
DROP POLICY IF EXISTS "Staff can view their pharmacy order items" ON public.order_items;
DROP POLICY IF EXISTS "Order items select policy" ON public.order_items;
DROP POLICY IF EXISTS "Order items insert policy" ON public.order_items;
DROP POLICY IF EXISTS "Staff and admin can update order items" ON public.order_items;
DROP POLICY IF EXISTS "Admins can delete order items" ON public.order_items;

-- Select: Customers can view their own order items; Staff for their branch; Admin for all
CREATE POLICY "Order items select policy"
  ON public.order_items FOR SELECT
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
  );

-- Insert: Customers can add items to their own orders; Admins can add
CREATE POLICY "Order items insert policy"
  ON public.order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.order_id = order_items.order_id
        AND (o.customer_id = auth.uid() OR public.is_admin_user())
    )
  );

-- Update: Only Staff for their branch or Admins (Customers CANNOT alter items post-checkout)
CREATE POLICY "Staff and admin can update order items"
  ON public.order_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.order_id = order_items.order_id
        AND (public.is_staff_of_pharmacy(o.pharmacy_id) OR public.is_admin_user())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.order_id = order_items.order_id
        AND (public.is_staff_of_pharmacy(o.pharmacy_id) OR public.is_admin_user())
    )
  );

-- Delete: Admins only
CREATE POLICY "Admins can delete order items"
  ON public.order_items FOR DELETE
  USING (public.is_admin_user());

-- ----------------------------------------------------------------------------
-- 3. ALLOW CUSTOMERS TO CLEAN UP EMPTY PENDING ORDERS (Rollback Support)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Customers can delete own pending empty orders" ON public.orders;
CREATE POLICY "Customers can delete own pending empty orders"
  ON public.orders FOR DELETE
  USING (
    customer_id = auth.uid()
    AND status = 'pending'
    AND NOT EXISTS (
      SELECT 1 FROM public.order_items oi WHERE oi.order_id = orders.order_id
    )
  );

-- ----------------------------------------------------------------------------
-- 4. DATABASE-LEVEL PRICE & OTC INTEGRITY TRIGGER ON ORDER_ITEMS
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_and_price_order_item()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pharmacy_id BIGINT;
  v_is_rx BOOLEAN;
  v_inv_price NUMERIC(10, 2);
  v_inv_stock INT;
  v_is_active BOOLEAN;
BEGIN
  -- 1. Ensure master_catalog item is not prescription
  SELECT requires_prescription INTO v_is_rx
  FROM public.master_catalog
  WHERE item_id = NEW.item_id;

  IF v_is_rx IS TRUE THEN
    RAISE EXCEPTION 'SAFETY VIOLATION: Cannot order prescription items online.';
  END IF;

  -- 2. Fetch target pharmacy ID from the parent order
  SELECT pharmacy_id INTO v_pharmacy_id
  FROM public.orders
  WHERE order_id = NEW.order_id;

  IF v_pharmacy_id IS NULL THEN
    RAISE EXCEPTION 'Invalid order reference for order item.';
  END IF;

  -- 3. Verify pharmacy inventory listing and price
  SELECT price, stock_quantity, is_active
  INTO v_inv_price, v_inv_stock, v_is_active
  FROM public.pharmacy_inventory
  WHERE pharmacy_id = v_pharmacy_id AND item_id = NEW.item_id;

  IF v_inv_price IS NULL OR v_is_active IS NOT TRUE THEN
    RAISE EXCEPTION 'Item is not currently available for online checkout at this pharmacy.';
  END IF;

  IF v_inv_stock < NEW.quantity THEN
    RAISE EXCEPTION 'Requested quantity exceeds available pharmacy inventory stock.';
  END IF;

  -- Authoritatively set the unit price from the verified pharmacy inventory
  NEW.unit_price := v_inv_price;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_and_price_order_item ON public.order_items;
CREATE TRIGGER trg_validate_and_price_order_item
  BEFORE INSERT OR UPDATE ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_and_price_order_item();

-- ----------------------------------------------------------------------------
-- 5. AUTOMATIC ORDER TOTAL SYNCHRONIZATION TRIGGER
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recalculate_order_total()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id BIGINT;
  v_method public.delivery_method;
  v_items_sum NUMERIC(10, 2);
  v_fee NUMERIC(10, 2) := 0;
BEGIN
  v_order_id := COALESCE(NEW.order_id, OLD.order_id);

  SELECT method INTO v_method
  FROM public.orders
  WHERE order_id = v_order_id;

  IF v_method = 'delivery'::public.delivery_method THEN
    v_fee := 50.00;
  END IF;

  SELECT COALESCE(SUM(quantity * unit_price), 0)
  INTO v_items_sum
  FROM public.order_items
  WHERE order_id = v_order_id;

  UPDATE public.orders
  SET total_amount = v_items_sum + v_fee,
      updated_at = NOW()
  WHERE order_id = v_order_id;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalculate_order_total ON public.order_items;
CREATE TRIGGER trg_recalculate_order_total
  AFTER INSERT OR UPDATE OR DELETE ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.recalculate_order_total();

-- ----------------------------------------------------------------------------
-- 6. HARDEN NOTIFICATIONS & AUDIT LOG POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff can insert customer notifications" ON public.notifications;
DROP POLICY IF EXISTS "Staff and Admins can insert notifications" ON public.notifications;
CREATE POLICY "Staff and Admins can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (
    public.is_admin_user()
    OR EXISTS (
      SELECT 1 FROM public.pharmacy_staff WHERE staff_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('staff', 'admin')
    )
  );

DROP POLICY IF EXISTS "Staff can view audit log" ON public.admin_audit_log;
DROP POLICY IF EXISTS "Staff and Admins can view audit log" ON public.admin_audit_log;
CREATE POLICY "Staff and Admins can view audit log"
  ON public.admin_audit_log FOR SELECT
  USING (
    public.is_admin_user()
    OR EXISTS (
      SELECT 1 FROM public.pharmacy_staff WHERE staff_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('staff', 'admin')
    )
  );

-- ----------------------------------------------------------------------------
-- 7. RESTRICT PHARMACY STAFF SELECT
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff can read pharmacy_staff" ON public.pharmacy_staff;
DROP POLICY IF EXISTS "Staff and admin can read pharmacy_staff" ON public.pharmacy_staff;
CREATE POLICY "Staff and admin can read pharmacy_staff"
  ON public.pharmacy_staff FOR SELECT
  USING (
    staff_id = auth.uid()
    OR public.is_admin_user()
  );
