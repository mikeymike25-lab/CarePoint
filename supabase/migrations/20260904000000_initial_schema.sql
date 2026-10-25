-- 1. Custom Types / Enums
CREATE TYPE user_role AS ENUM ('customer', 'staff', 'admin');
CREATE TYPE pharmacy_approval_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'ready', 'completed', 'cancelled');
CREATE TYPE delivery_method AS ENUM ('pickup', 'delivery');

-- 2. Profiles Table (Extends Supabase auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY, -- Links directly to auth.users.id
    role user_role NOT NULL DEFAULT 'customer',
    full_name TEXT NOT NULL,
    phone_number TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Pharmacies Table
CREATE TABLE pharmacies (
    pharmacy_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL,
    license_number TEXT NOT NULL UNIQUE,
    address TEXT NOT NULL,
    approval_status pharmacy_approval_status NOT NULL DEFAULT 'pending',
    is_open BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Pharmacy Staff Mapping
-- Associates a staff user with a specific pharmacy
CREATE TABLE pharmacy_staff (
    staff_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    pharmacy_id BIGINT REFERENCES pharmacies(pharmacy_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (staff_id, pharmacy_id)
);

-- 5. Master Catalog
-- Central database of all allowed medicines. Managed by Admins.
CREATE TABLE master_catalog (
    item_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    generic_name TEXT NOT NULL,
    brand_name TEXT,
    category TEXT NOT NULL,
    dosage_form TEXT NOT NULL,
    requires_prescription BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Pharmacy Inventory
-- specific inventory and pricing for each pharmacy based on master catalog
CREATE TABLE pharmacy_inventory (
    pharmacy_id BIGINT REFERENCES pharmacies(pharmacy_id) ON DELETE CASCADE,
    item_id BIGINT REFERENCES master_catalog(item_id) ON DELETE RESTRICT,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    stock_quantity INT NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (pharmacy_id, item_id)
);

-- 7. Orders Table
CREATE TABLE orders (
    order_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id UUID REFERENCES profiles(id) ON DELETE RESTRICT NOT NULL,
    pharmacy_id BIGINT REFERENCES pharmacies(pharmacy_id) ON DELETE RESTRICT NOT NULL,
    status order_status NOT NULL DEFAULT 'pending',
    method delivery_method NOT NULL DEFAULT 'pickup',
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Order Items
CREATE TABLE order_items (
    order_item_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id BIGINT REFERENCES orders(order_id) ON DELETE CASCADE NOT NULL,
    item_id BIGINT REFERENCES master_catalog(item_id) ON DELETE RESTRICT NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0)
);

-- 9. Messages Table (Real-time chat per order)
CREATE TABLE messages (
    message_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id BIGINT REFERENCES orders(order_id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Indexes for common access patterns
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_inventory_pharmacy ON pharmacy_inventory(pharmacy_id);
CREATE INDEX idx_inventory_item ON pharmacy_inventory(item_id);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_pharmacy ON orders(pharmacy_id);
CREATE INDEX idx_messages_order ON messages(order_id);
