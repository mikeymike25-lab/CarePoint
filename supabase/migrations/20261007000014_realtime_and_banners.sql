-- =============================================================================
-- Migration: 20261007000014_realtime_and_banners.sql
-- Purpose:
--   1. Enable Supabase Realtime replication on platform_settings, master_catalog,
--      pharmacies, and pharmacy_inventory so Admin edits broadcast immediately
--      to the Customer side.
--   2. Seed all 4 Customer Homepage Carousel Banners (with their exact Customer
--      colors and gradient hexes) into public.platform_settings.homepage_banner.
-- =============================================================================

-- 1. Enable Realtime publication for Admin -> Customer tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'platform_settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_settings;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'master_catalog'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.master_catalog;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'pharmacies'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pharmacies;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'pharmacy_inventory'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pharmacy_inventory;
  END IF;
END $$;

-- 2. Seed all 4 Customer Homepage Carousel Banners with exact Customer colors
INSERT INTO public.platform_settings (id, homepage_banner, updated_at)
VALUES (
  'main',
  '{
    "id": "otc-fast",
    "badgeText": "100% Certified OTC",
    "headline": "Need medicine fast?",
    "subtext": "Compare real-time prices and order genuine OTC remedies from verified local pharmacies in your area.",
    "ctaLabel": "Find Medicine Fast",
    "ctaType": "navigate_search",
    "bgGradient": "from-[#0D9488] to-[#0F766E]",
    "bgColor": "#0D9488",
    "bgColorEnd": "#0F766E",
    "active": true,
    "slides": [
      {
        "id": "otc-fast",
        "badgeText": "100% Certified OTC",
        "headline": "Need medicine fast?",
        "subtext": "Compare real-time prices and order genuine OTC remedies from verified local pharmacies in your area.",
        "ctaLabel": "Find Medicine Fast",
        "ctaType": "navigate_search",
        "bgGradient": "from-[#0D9488] to-[#0F766E]",
        "bgColor": "#0D9488",
        "bgColorEnd": "#0F766E",
        "active": true
      },
      {
        "id": "discounts",
        "badgeText": "Special Privileges • 20% Off",
        "headline": "PWD & Senior Discounts",
        "subtext": "Avail statutory 20% savings on eligible OTC health essentials. Fast verification with your government ID.",
        "ctaLabel": "Discount Guidelines",
        "ctaType": "open_discount_modal",
        "bgGradient": "from-[#C86F58] to-[#B35943]",
        "bgColor": "#C86F58",
        "bgColorEnd": "#B35943",
        "active": true
      },
      {
        "id": "new-pharmacy",
        "badgeText": "New Partner Pharmacies",
        "headline": "Expanded Local Network",
        "subtext": "MetroCare, HealthFirst, and CityCare have expanded branches. Discover more community drugstores nearby.",
        "ctaLabel": "Explore Partner Branches",
        "ctaType": "scroll_pharmacies",
        "bgGradient": "from-[#24828E] to-[#176B76]",
        "bgColor": "#24828E",
        "bgColorEnd": "#176B76",
        "active": true
      },
      {
        "id": "about-carepoint",
        "badgeText": "Safe Healthcare Guarantee",
        "headline": "The CarePoint Standard",
        "subtext": "Strict OTC compliance protects you from counterfeit drugs and prescription hazards with full price transparency.",
        "ctaLabel": "Why Choose CarePoint",
        "ctaType": "open_about_modal",
        "bgGradient": "from-[#167D71] to-[#0E6359]",
        "bgColor": "#167D71",
        "bgColorEnd": "#0E6359",
        "active": true
      }
    ]
  }'::jsonb,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

