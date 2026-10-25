-- Migration: 20260905000010_user_profile_avatar_and_names.sql
-- Description: Adds avatar_url and sms_updates_enabled to profiles table, and enhances Google OAuth trigger.

-- 1. Add columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS sms_updates_enabled BOOLEAN DEFAULT true;

-- 2. Enhanced Trigger to extract Google OAuth Name and Avatar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  assigned_role public.user_role;
  extracted_name TEXT;
  extracted_avatar TEXT;
BEGIN
  -- Safe role parsing
  BEGIN
    assigned_role := (NEW.raw_user_meta_data->>'role')::public.user_role;
  EXCEPTION WHEN OTHERS THEN
    assigned_role := 'customer'::public.user_role;
  END;

  IF assigned_role IS NULL THEN
    assigned_role := 'customer'::public.user_role;
  END IF;

  -- Extract full_name or name from Google metadata or email fallback
  extracted_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    SPLIT_PART(NEW.email, '@', 1)
  );

  -- Extract avatar URL from Google OAuth
  extracted_avatar := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture'
  );

  INSERT INTO public.profiles (id, role, full_name, phone_number, avatar_url)
  VALUES (
    NEW.id,
    assigned_role,
    extracted_name,
    NEW.raw_user_meta_data->>'phone_number',
    extracted_avatar
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = CASE 
      WHEN EXCLUDED.full_name IS NOT NULL AND EXCLUDED.full_name NOT LIKE '%@%' THEN EXCLUDED.full_name 
      ELSE profiles.full_name 
    END,
    phone_number = COALESCE(EXCLUDED.phone_number, profiles.phone_number),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
