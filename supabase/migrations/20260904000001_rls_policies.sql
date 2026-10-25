-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 1. HARD COMPLIANCE LOCK (Triggers before RLS)
-- Structurally prevents any prescription items from being inserted into order_items
CREATE OR REPLACE FUNCTION check_prescription_block()
RETURNS TRIGGER AS $$
DECLARE
    is_rx BOOLEAN;
BEGIN
    SELECT requires_prescription INTO is_rx 
    FROM master_catalog 
    WHERE item_id = NEW.item_id;

    IF is_rx = TRUE THEN
        RAISE EXCEPTION 'SAFETY VIOLATION: Cannot order prescription items online.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER block_rx_orders
BEFORE INSERT OR UPDATE ON order_items
FOR EACH ROW
EXECUTE FUNCTION check_prescription_block();


-- 2. Helper Functions for RLS
CREATE OR REPLACE FUNCTION get_user_role() RETURNS TEXT AS $$
    SELECT role::TEXT FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;


-- 3. RLS Policies

-- PROFILES
CREATE POLICY "Users can view their own profile" 
    ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Admins have full access to profiles" 
    ON profiles FOR ALL USING (get_user_role() = 'admin');

-- PHARMACIES
CREATE POLICY "Anyone can view approved pharmacies" 
    ON pharmacies FOR SELECT USING (approval_status = 'approved');
CREATE POLICY "Staff can view their own pharmacy pending status" 
    ON pharmacies FOR SELECT USING (
        pharmacy_id IN (SELECT pharmacy_id FROM pharmacy_staff WHERE staff_id = auth.uid())
    );
CREATE POLICY "Admins have full access to pharmacies" 
    ON pharmacies FOR ALL USING (get_user_role() = 'admin');

-- PHARMACY STAFF
CREATE POLICY "Staff can view their own mappings" 
    ON pharmacy_staff FOR SELECT USING (staff_id = auth.uid());
CREATE POLICY "Admins have full access to pharmacy staff" 
    ON pharmacy_staff FOR ALL USING (get_user_role() = 'admin');

-- MASTER CATALOG
CREATE POLICY "Anyone can view master catalog" 
    ON master_catalog FOR SELECT USING (true);
CREATE POLICY "Only admins can modify catalog" 
    ON master_catalog FOR ALL USING (get_user_role() = 'admin');

-- PHARMACY INVENTORY
CREATE POLICY "Anyone can view active inventory" 
    ON pharmacy_inventory FOR SELECT USING (is_active = true);
CREATE POLICY "Staff can manage their own pharmacy inventory" 
    ON pharmacy_inventory FOR ALL USING (
        pharmacy_id IN (SELECT pharmacy_id FROM pharmacy_staff WHERE staff_id = auth.uid())
    );
CREATE POLICY "Admins have full access to inventory" 
    ON pharmacy_inventory FOR ALL USING (get_user_role() = 'admin');

-- ORDERS
CREATE POLICY "Customers can view their own orders" 
    ON orders FOR SELECT USING (customer_id = auth.uid());
CREATE POLICY "Customers can create orders" 
    ON orders FOR INSERT WITH CHECK (customer_id = auth.uid());
CREATE POLICY "Staff can view and update their pharmacy orders" 
    ON orders FOR ALL USING (
        pharmacy_id IN (SELECT pharmacy_id FROM pharmacy_staff WHERE staff_id = auth.uid())
    );
CREATE POLICY "Admins can view all orders" 
    ON orders FOR SELECT USING (get_user_role() = 'admin');

-- ORDER ITEMS
CREATE POLICY "Customers can view their own order items" 
    ON order_items FOR SELECT USING (
        order_id IN (SELECT order_id FROM orders WHERE customer_id = auth.uid())
    );
CREATE POLICY "Customers can add items to their orders" 
    ON order_items FOR INSERT WITH CHECK (
        order_id IN (SELECT order_id FROM orders WHERE customer_id = auth.uid())
    );
CREATE POLICY "Staff can view their pharmacy order items" 
    ON order_items FOR SELECT USING (
        order_id IN (SELECT order_id FROM orders WHERE pharmacy_id IN (SELECT pharmacy_id FROM pharmacy_staff WHERE staff_id = auth.uid()))
    );

-- MESSAGES
CREATE POLICY "Customers can chat on their orders" 
    ON messages FOR ALL USING (
        order_id IN (SELECT order_id FROM orders WHERE customer_id = auth.uid())
    ) WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Staff can chat on their pharmacy orders" 
    ON messages FOR ALL USING (
        order_id IN (SELECT order_id FROM orders WHERE pharmacy_id IN (SELECT pharmacy_id FROM pharmacy_staff WHERE staff_id = auth.uid()))
    ) WITH CHECK (sender_id = auth.uid());
