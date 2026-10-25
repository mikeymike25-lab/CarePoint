-- Migration: 20260905000009_saved_addresses_and_order_delivery.sql
-- Description: Saved Addresses table with RLS and delivery details for orders

-- 1. Create saved_addresses table
CREATE TABLE IF NOT EXISTS saved_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    label TEXT NOT NULL DEFAULT 'Home',
    recipient_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    address_line TEXT NOT NULL,
    barangay_or_district TEXT,
    city TEXT NOT NULL DEFAULT 'Metro Manila',
    province TEXT,
    postal_code TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    landmark_or_notes TEXT,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_saved_addresses_user ON saved_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_addresses_default ON saved_addresses(user_id, is_default);

-- 2. Enable RLS on saved_addresses
ALTER TABLE saved_addresses ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
DROP POLICY IF EXISTS "Users can view their own saved addresses" ON saved_addresses;
CREATE POLICY "Users can view their own saved addresses"
    ON saved_addresses FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own saved addresses" ON saved_addresses;
CREATE POLICY "Users can create their own saved addresses"
    ON saved_addresses FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own saved addresses" ON saved_addresses;
CREATE POLICY "Users can update their own saved addresses"
    ON saved_addresses FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own saved addresses" ON saved_addresses;
CREATE POLICY "Users can delete their own saved addresses"
    ON saved_addresses FOR DELETE
    USING (auth.uid() = user_id);

-- Admins can view all saved addresses
DROP POLICY IF EXISTS "Admins have full access to saved addresses" ON saved_addresses;
CREATE POLICY "Admins have full access to saved addresses"
    ON saved_addresses FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 4. Extend orders table with delivery fields
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS delivery_address TEXT,
ADD COLUMN IF NOT EXISTS delivery_lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS delivery_lng DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS delivery_notes TEXT,
ADD COLUMN IF NOT EXISTS recipient_name TEXT,
ADD COLUMN IF NOT EXISTS recipient_phone TEXT;
