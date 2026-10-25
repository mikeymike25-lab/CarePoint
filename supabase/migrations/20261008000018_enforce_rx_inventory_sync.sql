-- ============================================================================
-- Migration: Ensure Rx items in pharmacy_inventory always have is_active = false
-- Fixes stale pharmacy_inventory rows where master_catalog.requires_prescription = true
-- so Staff can update Rx consultation stock/price without triggering a false-positive
-- online-checkout activation error, and keeps pharmacy_inventory synced when Admin
-- toggles requires_prescription on master_catalog.
-- ============================================================================

-- 1. Clean up any existing pharmacy_inventory rows for Rx medicines
UPDATE public.pharmacy_inventory pi
SET is_active = false,
    updated_at = NOW()
FROM public.master_catalog mc
WHERE pi.item_id = mc.item_id
  AND mc.requires_prescription = true
  AND pi.is_active = true;

-- 2. Trigger on master_catalog to auto-deactivate pharmacy_inventory rows when an item is marked Rx
CREATE OR REPLACE FUNCTION public.sync_rx_catalog_to_inventory()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.requires_prescription = true THEN
    UPDATE public.pharmacy_inventory
    SET is_active = false,
        updated_at = NOW()
    WHERE item_id = NEW.item_id
      AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_rx_catalog_to_inventory ON public.master_catalog;
CREATE TRIGGER trg_sync_rx_catalog_to_inventory
AFTER INSERT OR UPDATE OF requires_prescription ON public.master_catalog
FOR EACH ROW
WHEN (NEW.requires_prescription = true)
EXECUTE FUNCTION public.sync_rx_catalog_to_inventory();
