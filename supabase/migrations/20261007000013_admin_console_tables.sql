-- 1. Extend profiles with optional email and account_status for Admin Account Management
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'active';

-- 2. Extend pharmacies with operating_hours for Admin Registry / Storefront display
ALTER TABLE pharmacies
ADD COLUMN IF NOT EXISTS operating_hours TEXT NOT NULL DEFAULT '8:00 AM – 9:00 PM daily';

-- 3. Ensure Admins have full RLS access across operational tables
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
DROP POLICY IF EXISTS "Admins have full access to orders" ON orders;
CREATE POLICY "Admins have full access to orders"
    ON orders FOR ALL USING (get_user_role() = 'admin');

DROP POLICY IF EXISTS "Admins have full access to order items" ON order_items;
CREATE POLICY "Admins have full access to order items"
    ON order_items FOR ALL USING (get_user_role() = 'admin');

DROP POLICY IF EXISTS "Admins can view all messages" ON messages;
CREATE POLICY "Admins can view all messages"
    ON messages FOR SELECT USING (get_user_role() = 'admin');

-- 4. Admin Flags Table (Trust & Safety)
CREATE TABLE IF NOT EXISTS admin_flags (
    flag_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    target_type TEXT NOT NULL CHECK (target_type IN ('customer', 'staff', 'pharmacy')),
    target_id TEXT NOT NULL,
    target_name TEXT NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE admin_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins have full access to flags" ON admin_flags;
CREATE POLICY "Admins have full access to flags"
    ON admin_flags FOR ALL USING (get_user_role() = 'admin');

DROP POLICY IF EXISTS "Authenticated users can create flags" ON admin_flags;
CREATE POLICY "Authenticated users can create flags"
    ON admin_flags FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 5. Admin Audit Log Table
CREATE TABLE IF NOT EXISTS admin_audit_log (
    audit_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins have full access to audit log" ON admin_audit_log;
CREATE POLICY "Admins have full access to audit log"
    ON admin_audit_log FOR ALL USING (get_user_role() = 'admin');

-- 6. Platform Settings & CMS Table
CREATE TABLE IF NOT EXISTS platform_settings (
    id TEXT PRIMARY KEY DEFAULT 'main',
    platform_name TEXT NOT NULL DEFAULT 'CarePoint',
    support_email TEXT NOT NULL DEFAULT 'support@carepoint.ph',
    currency TEXT NOT NULL DEFAULT 'PHP',
    pickup_enabled BOOLEAN NOT NULL DEFAULT true,
    delivery_enabled BOOLEAN NOT NULL DEFAULT true,
    delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 50.00,
    free_delivery_over NUMERIC(10, 2) NOT NULL DEFAULT 1500.00,
    low_stock_threshold INT NOT NULL DEFAULT 10,
    return_window_days INT NOT NULL DEFAULT 7,
    payments JSONB NOT NULL DEFAULT '{"card":true,"gcash":true,"paymaya":true,"paypal":true,"cod":true}'::jsonb,
    homepage_banner JSONB NOT NULL DEFAULT '{"headline":"Your neighborhood apothecary, online.","subtext":"Real pharmacies, real pharmacists, delivered with care.","ctaLabel":"Browse remedies","active":true}'::jsonb,
    pages JSONB NOT NULL DEFAULT '{"about":{"title":"About Us","body":"CarePoint connects neighborhood pharmacies with the customers who rely on them — real pharmacists, real medicine, delivered with care."},"contact":{"title":"Contact","body":"Have a question? Reach the CarePoint team at support@carepoint.ph and we will get back to you within one business day."},"privacy":{"title":"Privacy Policy","body":"CarePoint collects only the information needed to fulfill your orders and never sells your data to third parties."}}'::jsonb,
    faqs JSONB NOT NULL DEFAULT '[{"id":"faq1","q":"How do I know a pharmacy on CarePoint is legitimate?","a":"Every pharmacy is reviewed and approved by our team before it can list products."},{"id":"faq2","q":"Can I order prescription medicine online?","a":"No — CarePoint strictly blocks online checkout for prescription items by law. You can use our Inquiry chat to check in-store availability and purchase in person with a valid prescription."}]'::jsonb,
    promotions JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read platform settings" ON platform_settings;
CREATE POLICY "Anyone can read platform settings"
    ON platform_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only admins can modify platform settings" ON platform_settings;
CREATE POLICY "Only admins can modify platform settings"
    ON platform_settings FOR ALL USING (get_user_role() = 'admin');

-- Seed default platform settings singleton
INSERT INTO platform_settings (id) VALUES ('main') ON CONFLICT (id) DO NOTHING;
