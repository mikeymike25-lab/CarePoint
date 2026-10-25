-- CarePoint Database Seed Data
-- Run this using `supabase db reset` locally to populate mock data

-- 1. Mock Users (auth.users)
-- NOTE: In a real Supabase environment, users sign up via GoTrue.
-- We manually insert them here for local testing purposes.
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
VALUES
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'admin@carepoint.local', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'staff@metrocare.local', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'customer@carepoint.local', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');

-- 2. Profiles
INSERT INTO profiles (id, role, full_name, phone_number) VALUES
  ('11111111-1111-1111-1111-111111111111', 'admin', 'System Administrator', '09170000000'),
  ('22222222-2222-2222-2222-222222222222', 'staff', 'MetroCare Manager', '09171111111'),
  ('33333333-3333-3333-3333-333333333333', 'customer', 'Juan Dela Cruz', '09172222222');

-- 3. Pharmacies
INSERT INTO pharmacies (name, license_number, address, approval_status, is_open) VALUES
  ('MetroCare Pharmacy', 'FDA-PH-001', '123 Main St, Manila', 'approved', true),
  ('HealthFirst Chemists', 'FDA-PH-002', '45 Quezon Ave, QC', 'approved', false),
  ('QuickMeds Pending', 'FDA-PH-003', '67 Taft Ave, Manila', 'pending', false);

-- 4. Pharmacy Staff Mappings
-- Link staff@metrocare.local (222...222) to MetroCare Pharmacy (ID: 1)
INSERT INTO pharmacy_staff (staff_id, pharmacy_id) VALUES
  ('22222222-2222-2222-2222-222222222222', 1);

-- 5. Master Catalog
-- A mix of OTC and strict Prescription (Rx) items
INSERT INTO master_catalog (generic_name, brand_name, category, dosage_form, requires_prescription) VALUES
  ('Paracetamol', 'Biogesic', 'Pain Relief', '500mg Tablet', false),
  ('Cetirizine', 'Alnix', 'Allergy', '10mg Tablet', false),
  ('Loperamide', 'Diatabs', 'Digestive', '2mg Capsule', false),
  ('Ascorbic Acid', 'Poten-Cee', 'Vitamins', '500mg Tablet', false),
  ('Ibuprofen', 'Advil', 'Pain Relief', '200mg Softgel', false),
  ('Amoxicillin', 'Amoxil', 'Antibiotic', '500mg Capsule', true),     -- Rx locked!
  ('Losartan', 'Cozaar', 'Blood Pressure', '50mg Tablet', true);      -- Rx locked!

-- 6. Pharmacy Inventory (MetroCare only for now)
INSERT INTO pharmacy_inventory (pharmacy_id, item_id, price, stock_quantity) VALUES
  (1, 1, 7.50, 150), -- Biogesic
  (1, 2, 25.00, 45), -- Alnix
  (1, 3, 8.00, 60),  -- Diatabs
  (1, 4, 6.50, 200), -- Poten-Cee
  (1, 6, 12.00, 0);  -- Amoxicillin (Can't be bought online anyway due to trigger, but might be tracked in store)
