import { supabase } from '../../shared/lib/supabase';
import type { MasterCatalogItem } from '../../shared/types/database';
import { PHILIPPINE_MEDICINES, resolveMedicineImageUrl, type CatalogMedicineData } from '../../shared/data/medicines';

export interface PharmacyListing {
  pharmacyId: number;
  pharmacyName: string;
  address: string;
  distance: string;
  isOpen: boolean;
  rating: number;
  price: number;
  stockQuantity: number;
  isBestPrice?: boolean;
  operatingHours?: string;
  phoneNumber?: string;
}

export interface MedicineDetailData {
  item: MasterCatalogItem;
  listings: PharmacyListing[];
}

export interface PartnerPharmacyCard {
  id: number;
  name: string;
  address: string;
  dist: string;
  status: string;
  isOpen: boolean;
  hours: string;
  phone?: string;
  image: string;
}

const PHARMACY_IMAGES = [
  'https://images.unsplash.com/photo-1586282391129-76a6df230234?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1576602976047-174e57a47881?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?auto=format&fit=crop&w=400&q=80',
];

const DEFAULT_PARTNER_PHARMACIES: PartnerPharmacyCard[] = [
  {
    id: 1,
    name: 'MetroCare Pharmacy',
    address: '123 Main St, Manila',
    dist: '1.2 km away',
    status: 'Open Now',
    isOpen: true,
    hours: '8:00 AM - 10:00 PM',
    phone: '0917 555 0100',
    image: PHARMACY_IMAGES[0],
  },
  {
    id: 2,
    name: 'HealthFirst Chemists',
    address: '45 Quezon Ave, QC',
    dist: '2.8 km away',
    status: 'Open Now',
    isOpen: true,
    hours: '9:00 AM - 9:00 PM',
    phone: '0917 555 0200',
    image: PHARMACY_IMAGES[1],
  },
  {
    id: 3,
    name: 'CityCare Drug',
    address: '88 Taft Ave, Pasay',
    dist: '3.5 km away',
    status: 'Open Now',
    isOpen: true,
    hours: '24 Hours',
    phone: '0917 555 0300',
    image: PHARMACY_IMAGES[2],
  },
];

function buildMockMedicines(): Record<number, MedicineDetailData> {
  const result: Record<number, MedicineDetailData> = {};

  PHILIPPINE_MEDICINES.forEach((m: CatalogMedicineData) => {
    let listings: PharmacyListing[] = [];

    if (m.requires_prescription) {
      listings = [
        {
          pharmacyId: 1,
          pharmacyName: 'MetroCare Pharmacy',
          address: '123 Main St, Manila',
          distance: '1.2 km away',
          isOpen: true,
          rating: 4.8,
          price: m.price,
          stockQuantity: Math.floor(20 + ((m.item_id * 7) % 30)),
          isBestPrice: true,
          operatingHours: '8:00 AM – 9:00 PM daily',
          phoneNumber: '0917 555 0100',
        },
        {
          pharmacyId: 3,
          pharmacyName: 'CityCare Drug',
          address: '88 Taft Ave, Pasay',
          distance: '3.5 km away',
          isOpen: true,
          rating: 4.7,
          price: m.price,
          stockQuantity: Math.floor(12 + ((m.item_id * 5) % 25)),
          isBestPrice: false,
          operatingHours: '24 Hours',
          phoneNumber: '0917 555 0300',
        },
      ];
    } else {
      const p1Price = m.price;
      const p2Price = Number((m.price * (0.95 + ((m.item_id % 5) * 0.025))).toFixed(2));
      const p3Price = Number((m.price * (0.98 + ((m.item_id % 3) * 0.02))).toFixed(2));
      const minPrice = Math.min(p1Price, p2Price, p3Price);

      listings = [
        {
          pharmacyId: 1,
          pharmacyName: 'MetroCare Pharmacy',
          address: '123 Main St, Manila',
          distance: '1.2 km away',
          isOpen: true,
          rating: 4.8,
          price: p1Price,
          stockQuantity: Math.floor(40 + ((m.item_id * 7) % 120)),
          isBestPrice: p1Price === minPrice,
          operatingHours: '8:00 AM – 9:00 PM daily',
          phoneNumber: '0917 555 0100',
        },
        {
          pharmacyId: 2,
          pharmacyName: 'HealthFirst Chemists',
          address: '45 Quezon Ave, QC',
          distance: '2.8 km away',
          isOpen: true,
          rating: 4.6,
          price: p2Price,
          stockQuantity: Math.floor(25 + ((m.item_id * 11) % 90)),
          isBestPrice: p2Price === minPrice,
          operatingHours: '9:00 AM – 9:00 PM daily',
          phoneNumber: '0917 555 0200',
        },
        {
          pharmacyId: 3,
          pharmacyName: 'CityCare Drug',
          address: '88 Taft Ave, Pasay',
          distance: '3.5 km away',
          isOpen: true,
          rating: 4.7,
          price: p3Price,
          stockQuantity: Math.floor(30 + ((m.item_id * 13) % 100)),
          isBestPrice: p3Price === minPrice,
          operatingHours: '24 Hours',
          phoneNumber: '0917 555 0300',
        },
      ];
    }

    result[m.item_id] = {
      item: {
        item_id: m.item_id,
        generic_name: m.generic_name,
        brand_name: m.brand_name,
        category: m.category,
        dosage_form: m.dosage_form,
        requires_prescription: m.requires_prescription,
        indications: m.indications,
        dosage_instructions: m.dosage_instructions,
        packaging: m.packaging,
        side_effects: m.side_effects,
        image_url: resolveMedicineImageUrl(m.slug),
        created_at: new Date('2026-01-01').toISOString(),
      },
      listings,
    };
  });

  return result;
}

export const MOCK_MEDICINES: Record<number, MedicineDetailData> = buildMockMedicines();

function getLocalStoreMeta(): Record<number, any> {
  try {
    const raw = localStorage.getItem('cp_staff_storefront_meta_v1');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function buildDefaultListingsForItem(
  item: MasterCatalogItem,
  approvedPharmacies: any[]
): PharmacyListing[] {
  const storeMeta = getLocalStoreMeta();
  const mockFallback = MOCK_MEDICINES[item.item_id]?.listings;
  const defaultPrice = mockFallback?.[0]?.price || 15.0;

  if (approvedPharmacies && approvedPharmacies.length > 0) {
    return approvedPharmacies.map((ph, idx) => {
      const local = storeMeta[ph.pharmacy_id] || {};
      const effectiveIsOpen =
        local.is_open !== undefined ? Boolean(local.is_open) : (ph.is_open ?? true);

      return {
        pharmacyId: ph.pharmacy_id,
        pharmacyName: ph.name,
        address: ph.address || 'Metro Manila',
        distance: `${(1.2 + idx * 1.1).toFixed(1)} km away`,
        isOpen: effectiveIsOpen,
        rating: Number((4.8 - (idx % 3) * 0.1).toFixed(1)),
        price: defaultPrice,
        stockQuantity: 45,
        isBestPrice: idx === 0,
        operatingHours: ph.operating_hours || local.operating_hours || '8:00 AM – 9:00 PM daily',
        phoneNumber: ph.phone_number || local.phone_number || '0917 555 0100',
      };
    });
  }

  return (mockFallback || [
    {
      pharmacyId: 1,
      pharmacyName: 'MetroCare Pharmacy',
      address: '123 Main St, Manila',
      distance: '1.2 km away',
      isOpen: true,
      rating: 4.8,
      price: defaultPrice,
      stockQuantity: 50,
      isBestPrice: true,
      operatingHours: '8:00 AM – 9:00 PM daily',
      phoneNumber: '0917 555 0100',
    },
  ]).map((l) => {
    const local = storeMeta[l.pharmacyId] || {};
    return {
      ...l,
      isOpen: local.is_open !== undefined ? Boolean(local.is_open) : l.isOpen,
    };
  });
}

export async function fetchMedicineDetail(itemId: number): Promise<MedicineDetailData | null> {
  try {
    const [{ data: catalogItem, error: catError }, { data: invData }, { data: phData }] =
      await Promise.all([
        supabase.from('master_catalog').select('*').eq('item_id', itemId).maybeSingle(),
        supabase
          .from('pharmacy_inventory')
          .select(
            `
            price,
            stock_quantity,
            is_active,
            pharmacy_id,
            pharmacies (
              pharmacy_id,
              name,
              address,
              is_open,
              approval_status,
              operating_hours,
              phone_number
            )
          `
          )
          .eq('item_id', itemId)
          .order('pharmacy_id', { ascending: true }),
        supabase
          .from('pharmacies')
          .select('*')
          .eq('approval_status', 'approved')
          .order('pharmacy_id', { ascending: true }),
      ]);

    if (!catError && catalogItem) {
      const approvedInv = (invData || []).filter(
        (inv: any) => !inv.pharmacies || inv.pharmacies.approval_status === 'approved'
      );

      const relevantInv = approvedInv.filter((inv: any) =>
        // For OTC items, show active listings; for Rx items, allow in-store consultation listings
        catalogItem.requires_prescription ? true : inv.is_active !== false
      );

      if (relevantInv.length > 0) {
        let lowestPrice = Infinity;
        relevantInv.forEach((inv: any) => {
          const p = Number(inv.price);
          if (p < lowestPrice) lowestPrice = p;
        });

        const storeMeta = getLocalStoreMeta();
        const listings: PharmacyListing[] = relevantInv.map((inv: any, idx: number) => {
          const phId = inv.pharmacy_id;
          const local = storeMeta[phId] || {};
          const effectiveIsOpen =
            local.is_open !== undefined
              ? Boolean(local.is_open)
              : (inv.pharmacies?.is_open ?? true);

          return {
            pharmacyId: phId,
            pharmacyName: inv.pharmacies?.name || 'Partner Pharmacy',
            address: inv.pharmacies?.address || 'Metro Manila',
            distance: `${(1.2 + idx * 1.1).toFixed(1)} km away`,
            isOpen: effectiveIsOpen,
            rating: Number((4.8 - (idx % 3) * 0.1).toFixed(1)),
            price: Number(inv.price),
            stockQuantity: Number(inv.stock_quantity),
            isBestPrice: Number(inv.price) === lowestPrice,
            operatingHours: inv.pharmacies?.operating_hours || local.operating_hours || '8:00 AM – 9:00 PM daily',
            phoneNumber: inv.pharmacies?.phone_number || local.phone_number || '0917 555 0100',
          };
        });

        return {
          item: {
            ...catalogItem,
            image_url: resolveMedicineImageUrl(catalogItem.image_url),
          },
          listings,
        };
      }

      // If approvedInv has rows but all are is_active === false (Staff explicitly hid this OTC item), return empty listings
      if (approvedInv.length > 0 && !catalogItem.requires_prescription) {
        return {
          item: {
            ...catalogItem,
            image_url: resolveMedicineImageUrl(catalogItem.image_url),
          },
          listings: [],
        };
      }

      // Catalog item exists in Supabase (e.g., newly added by Admin with no inventory rows yet), build listings from approved pharmacies
      return {
        item: {
          ...catalogItem,
          image_url: resolveMedicineImageUrl(catalogItem.image_url),
        },
        listings: buildDefaultListingsForItem(catalogItem, phData || []),
      };
    }
  } catch (e) {
    console.warn('Supabase query failed, falling back to local catalog seed data:', e);
  }

  return MOCK_MEDICINES[itemId] || null;
}

/**
 * Fetches all medicines live from Supabase (`master_catalog` + `pharmacy_inventory` + `pharmacies`),
 * so any medicine added, edited, or reclassified in Admin/Staff immediately appears on the Customer side.
 */
export async function fetchLiveMedicines(): Promise<MedicineDetailData[]> {
  try {
    const [{ data: catalogRows, error: catErr }, { data: invRows }, { data: phRows }] =
      await Promise.all([
        supabase.from('master_catalog').select('*').order('item_id', { ascending: true }),
        supabase
          .from('pharmacy_inventory')
          .select(
            `
            price,
            stock_quantity,
            is_active,
            pharmacy_id,
            item_id,
            pharmacies (
              pharmacy_id,
              name,
              address,
              is_open,
              approval_status,
              operating_hours,
              phone_number
            )
          `
          )
          .order('pharmacy_id', { ascending: true }),
        supabase
          .from('pharmacies')
          .select('*')
          .eq('approval_status', 'approved')
          .order('pharmacy_id', { ascending: true }),
      ]);

    if (!catErr && catalogRows && catalogRows.length > 0) {
      const invByItem = new Map<number, any[]>();
      (invRows || []).forEach((inv: any) => {
        const phApproved = !inv.pharmacies || inv.pharmacies.approval_status === 'approved';
        if (!phApproved) return;
        const arr = invByItem.get(inv.item_id) || [];
        arr.push(inv);
        invByItem.set(inv.item_id, arr);
      });

      const approvedPharmacies = phRows || [];

      return catalogRows.map((cat: MasterCatalogItem) => {
        const rawInv = invByItem.get(cat.item_id) || [];
        const visibleInv = rawInv.filter((inv) =>
          cat.requires_prescription ? true : inv.is_active !== false
        );

        let listings: PharmacyListing[];
        if (visibleInv.length > 0) {
          let lowestPrice = Infinity;
          visibleInv.forEach((inv) => {
            const p = Number(inv.price);
            if (p < lowestPrice) lowestPrice = p;
          });

          const storeMeta = getLocalStoreMeta();
          listings = visibleInv.map((inv, idx) => {
            const phId = inv.pharmacy_id;
            const local = storeMeta[phId] || {};
            const effectiveIsOpen =
              local.is_open !== undefined
                ? Boolean(local.is_open)
                : (inv.pharmacies?.is_open ?? true);

            return {
              pharmacyId: phId,
              pharmacyName: inv.pharmacies?.name || local.name || 'Partner Pharmacy',
              address: inv.pharmacies?.address || local.address || 'Metro Manila',
              distance: `${(1.2 + idx * 1.1).toFixed(1)} km away`,
              isOpen: effectiveIsOpen,
              rating: Number((4.8 - (idx % 3) * 0.1).toFixed(1)),
              price: Number(inv.price),
              stockQuantity: Number(inv.stock_quantity),
              isBestPrice: Number(inv.price) === lowestPrice,
              operatingHours: inv.pharmacies?.operating_hours || local.operating_hours || '8:00 AM – 9:00 PM daily',
              phoneNumber: inv.pharmacies?.phone_number || local.phone_number || '0917 555 0100',
            };
          });
        } else if (rawInv.length > 0 && !cat.requires_prescription) {
          // Staff explicitly hid this OTC item on all pharmacies that carry it
          listings = [];
        } else {
          listings = buildDefaultListingsForItem(cat, approvedPharmacies);
        }

        return {
          item: {
            ...cat,
            image_url: resolveMedicineImageUrl(
              cat.image_url || MOCK_MEDICINES[cat.item_id]?.item.image_url
            ),
          },
          listings,
        };
      });
    }
  } catch (e) {
    console.warn('Failed to fetch live medicines from Supabase, using fallback:', e);
  }

  const storeMeta = getLocalStoreMeta();
  return Object.values(MOCK_MEDICINES).map((med) => ({
    ...med,
    listings: med.listings.map((l) => {
      const local = storeMeta[l.pharmacyId] || {};
      return {
        ...l,
        isOpen: local.is_open !== undefined ? Boolean(local.is_open) : l.isOpen,
      };
    }),
  }));
}

/**
 * Fetches all approved pharmacies live from Supabase (`public.pharmacies`),
 * so any pharmacy approved or updated in Admin/Staff immediately shows up in Customer "Partner Pharmacies".
 */
export async function fetchPartnerPharmacies(): Promise<PartnerPharmacyCard[]> {
  const storeMeta = getLocalStoreMeta();
  try {
    const { data, error } = await supabase
      .from('pharmacies')
      .select('*')
      .eq('approval_status', 'approved')
      .order('pharmacy_id', { ascending: true });

    if (!error && data && data.length > 0) {
      return data.map((ph: any, idx: number) => {
        const local = storeMeta[ph.pharmacy_id] || {};
        const effectiveIsOpen =
          local.is_open !== undefined ? Boolean(local.is_open) : Boolean(ph.is_open);
        return {
          id: ph.pharmacy_id,
          name: ph.name,
          address: ph.address || 'Metro Manila',
          dist: `${(1.2 + idx * 1.1).toFixed(1)} km away`,
          status: effectiveIsOpen ? 'Open Now' : 'Closed',
          isOpen: effectiveIsOpen,
          hours: ph.operating_hours || local.operating_hours || '8:00 AM - 9:00 PM',
          phone: ph.phone_number || local.phone_number || '0917 555 0100',
          image: PHARMACY_IMAGES[idx % PHARMACY_IMAGES.length],
        };
      });
    }
  } catch (e) {
    console.warn('Failed to fetch partner pharmacies from Supabase:', e);
  }

  return DEFAULT_PARTNER_PHARMACIES.map((ph) => {
    const local = storeMeta[ph.id] || {};
    const effectiveIsOpen =
      local.is_open !== undefined ? Boolean(local.is_open) : ph.isOpen;
    return {
      ...ph,
      isOpen: effectiveIsOpen,
      status: effectiveIsOpen ? 'Open Now' : 'Closed',
    };
  });
}

/**
 * Subscribes to Supabase Realtime changes on `master_catalog`, `pharmacy_inventory`, and `pharmacies`.
 */
export function subscribeToCustomerCatalogRealtime(onChange: () => void): () => void {
  const channelName = `customer-catalog-live-sync-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const channel = supabase
    .channel(channelName)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'master_catalog' }, () => onChange())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pharmacy_inventory' }, () => onChange())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pharmacies' }, () => onChange())
    .subscribe();

  const handleCustomEvent = () => onChange();
  window.addEventListener('carepoint:pharmacy_updated', handleCustomEvent);
  window.addEventListener('storage', handleCustomEvent);

  return () => {
    supabase.removeChannel(channel);
    window.removeEventListener('carepoint:pharmacy_updated', handleCustomEvent);
    window.removeEventListener('storage', handleCustomEvent);
  };
}

export function getAllMedicines(): MedicineDetailData[] {
  return Object.values(MOCK_MEDICINES);
}

export function getFeaturedOTCMedicines(): MedicineDetailData[] {
  return Object.values(MOCK_MEDICINES).filter((m) => !m.item.requires_prescription);
}
