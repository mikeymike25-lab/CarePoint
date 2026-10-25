import { supabase } from '../../shared/lib/supabase';
import { PHILIPPINE_MEDICINES } from '../../shared/data/medicines';
import type {
  Profile,
  Pharmacy,
  MasterCatalogItem,
  PharmacyInventoryItem,
  Order,
  PharmacyApprovalStatus,
  UserRole,
} from '../../shared/types/database';

export interface AdminStaffRecord {
  staff_id: string;
  pharmacy_id: number;
  full_name: string;
  email: string;
  phone_number: string | null;
  status: 'active' | 'pending' | 'rejected' | 'disabled';
  is_owner: boolean;
  pharmacy?: Pharmacy;
}

export interface AdminCustomerRecord extends Profile {
  email?: string;
  account_status?: 'active' | 'disabled';
  orders_count?: number;
}

export interface AdminFlag {
  id: string;
  targetType: 'customer' | 'staff' | 'pharmacy';
  targetId: string;
  targetName: string;
  reason: string;
  status: 'open' | 'resolved';
  createdAt: string;
}

export interface AdminAuditEntry {
  id: string;
  actor: string;
  action: string;
  at: string;
}

export interface AdminPromotion {
  id: string;
  title: string;
  text: string;
  active: boolean;
}

export interface AdminFaq {
  id: string;
  q: string;
  a: string;
}

export interface AdminBanner {
  id: string;
  badgeText: string;
  headline: string;
  subtext: string;
  ctaLabel: string;
  ctaType: 'navigate_search' | 'scroll_pharmacies' | 'open_discount_modal' | 'open_about_modal';
  bgGradient: string;
  bgColor: string;
  bgColorEnd: string;
  active: boolean;
}

export interface AdminStaticPage {
  title: string;
  body: string;
}

export interface PlatformSettings {
  platformName: string;
  supportEmail: string;
  currency: 'PHP' | 'USD' | 'EUR' | 'SGD' | 'JPY';
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  deliveryFee: number;
  freeDeliveryOver: number;
  lowStockThreshold: number;
  returnWindowDays: number;
  payments: {
    card: boolean;
    gcash: boolean;
    paymaya: boolean;
    paypal: boolean;
    cod: boolean;
  };
}

export interface AdminStateSnapshot {
  pharmacies: (Pharmacy & { operating_hours?: string })[];
  customers: AdminCustomerRecord[];
  staff: AdminStaffRecord[];
  admins: (Profile & { email?: string })[];
  catalog: MasterCatalogItem[];
  inventory: (PharmacyInventoryItem & { sold?: number })[];
  orders: (Order & { customer_name?: string; customer_email?: string; pharmacy_name?: string })[];
  flags: AdminFlag[];
  auditLog: AdminAuditEntry[];
  settings: PlatformSettings;
  homepageBanner: AdminBanner;
  homepageBanners: AdminBanner[];
  promotions: AdminPromotion[];
  pages: Record<string, AdminStaticPage>;
  faqs: AdminFaq[];
  avgResponseHours: string | null;
}

const STORAGE_KEYS = {
  FLAGS: 'cp_admin_flags_v1',
  AUDIT: 'cp_admin_audit_v1',
  SETTINGS: 'cp_admin_settings_v1',
  CMS: 'cp_admin_cms_v1',
  ACCOUNT_META: 'cp_admin_account_meta_v1',
};

export const DEFAULT_SETTINGS: PlatformSettings = {
  platformName: 'CarePoint',
  supportEmail: 'support@carepoint.ph',
  currency: 'PHP',
  pickupEnabled: true,
  deliveryEnabled: true,
  deliveryFee: 50,
  freeDeliveryOver: 1500,
  lowStockThreshold: 10,
  returnWindowDays: 7,
  payments: {
    card: true,
    gcash: true,
    paymaya: true,
    paypal: true,
    cod: true,
  },
};

export const DEFAULT_BANNERS: AdminBanner[] = [
  {
    id: 'otc-fast',
    badgeText: '100% Certified OTC',
    headline: 'Need medicine fast?',
    subtext: 'Compare real-time prices and order genuine OTC remedies from verified local pharmacies in your area.',
    ctaLabel: 'Find Medicine Fast',
    ctaType: 'navigate_search',
    bgGradient: 'from-[#0D9488] to-[#0F766E]',
    bgColor: '#0D9488',
    bgColorEnd: '#0F766E',
    active: true,
  },
  {
    id: 'discounts',
    badgeText: 'Special Privileges • 20% Off',
    headline: 'PWD & Senior Discounts',
    subtext: 'Avail statutory 20% savings on eligible OTC health essentials. Fast verification with your government ID.',
    ctaLabel: 'Discount Guidelines',
    ctaType: 'open_discount_modal',
    bgGradient: 'from-[#C86F58] to-[#B35943]',
    bgColor: '#C86F58',
    bgColorEnd: '#B35943',
    active: true,
  },
  {
    id: 'new-pharmacy',
    badgeText: 'New Partner Pharmacies',
    headline: 'Expanded Local Network',
    subtext: 'MetroCare, HealthFirst, and CityCare have expanded branches. Discover more community drugstores nearby.',
    ctaLabel: 'Explore Partner Branches',
    ctaType: 'scroll_pharmacies',
    bgGradient: 'from-[#24828E] to-[#176B76]',
    bgColor: '#24828E',
    bgColorEnd: '#176B76',
    active: true,
  },
  {
    id: 'about-carepoint',
    badgeText: 'Safe Healthcare Guarantee',
    headline: 'The CarePoint Standard',
    subtext: 'Strict OTC compliance protects you from counterfeit drugs and prescription hazards with full price transparency.',
    ctaLabel: 'Why Choose CarePoint',
    ctaType: 'open_about_modal',
    bgGradient: 'from-[#167D71] to-[#0E6359]',
    bgColor: '#167D71',
    bgColorEnd: '#0E6359',
    active: true,
  },
];

export const DEFAULT_BANNER: AdminBanner = DEFAULT_BANNERS[0];

function parseColorsFromGrad(grad: string | undefined, fallbackStart: string, fallbackEnd: string) {
  if (!grad) return { bgColor: fallbackStart, bgColorEnd: fallbackEnd };
  const hexes = grad.match(/#[0-9a-fA-F]{6}/g);
  if (hexes && hexes.length >= 2) {
    return { bgColor: hexes[0], bgColorEnd: hexes[hexes.length - 1] };
  }
  if (hexes && hexes.length === 1) {
    return { bgColor: hexes[0], bgColorEnd: hexes[0] };
  }
  return { bgColor: fallbackStart, bgColorEnd: fallbackEnd };
}

export function normalizeAdminBanners(raw: any): AdminBanner[] {
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((item: any, idx: number) => {
      const def = DEFAULT_BANNERS[idx % DEFAULT_BANNERS.length];
      const parsed = parseColorsFromGrad(item.bgGradient, def.bgColor, def.bgColorEnd);
      const bgColor = item.bgColor || parsed.bgColor;
      const bgColorEnd = item.bgColorEnd || parsed.bgColorEnd;
      return {
        id: item.id || def.id || `banner_${idx + 1}`,
        badgeText: item.badgeText || def.badgeText || 'Featured Highlight',
        headline: item.headline || def.headline || 'CarePoint Pharmacy',
        subtext: item.subtext || def.subtext || '',
        ctaLabel: item.ctaLabel || def.ctaLabel || 'Find Medicine Fast',
        ctaType: item.ctaType || def.ctaType || 'navigate_search',
        bgGradient: item.bgGradient || `from-[${bgColor}] to-[${bgColorEnd}]`,
        bgColor,
        bgColorEnd,
        active: item.active !== false,
      };
    });
  }
  if (raw && typeof raw === 'object' && Array.isArray(raw.slides) && raw.slides.length > 0) {
    return normalizeAdminBanners(raw.slides);
  }
  if (raw && typeof raw === 'object' && typeof raw.headline === 'string') {
    const isOldDefault = raw.headline === 'Your neighborhood apothecary, online.';
    const def = DEFAULT_BANNERS[0];
    const parsed = parseColorsFromGrad(raw.bgGradient, def.bgColor, def.bgColorEnd);
    const firstSlide: AdminBanner = {
      ...def,
      badgeText: raw.badgeText || def.badgeText,
      headline: isOldDefault ? def.headline : raw.headline,
      subtext: isOldDefault || !raw.subtext ? def.subtext : raw.subtext,
      ctaLabel: isOldDefault || !raw.ctaLabel ? def.ctaLabel : raw.ctaLabel,
      ctaType: raw.ctaType || def.ctaType,
      bgColor: raw.bgColor || parsed.bgColor,
      bgColorEnd: raw.bgColorEnd || parsed.bgColorEnd,
      active: raw.active !== false,
    };
    return [firstSlide, ...DEFAULT_BANNERS.slice(1)];
  }
  return DEFAULT_BANNERS;
}

export const DEFAULT_PAGES: Record<string, AdminStaticPage> = {
  about: {
    title: 'About Us',
    body: 'CarePoint connects neighborhood pharmacies with the customers who rely on them — real pharmacists, real medicine, delivered with care.',
  },
  contact: {
    title: 'Contact',
    body: "Have a question? Reach the CarePoint team at support@carepoint.ph and we'll get back to you within one business day.",
  },
  privacy: {
    title: 'Privacy Policy',
    body: 'CarePoint collects only the information needed to fulfill your orders and never sells your data to third parties.',
  },
};

export const DEFAULT_FAQS: AdminFaq[] = [
  {
    id: 'faq1',
    q: 'How do I know a pharmacy on CarePoint is legitimate?',
    a: 'Every pharmacy is reviewed and approved by our team before it can list products.',
  },
  {
    id: 'faq2',
    q: 'Can I order prescription medicine online?',
    a: 'No — CarePoint strictly blocks online checkout for prescription items by law. You can use our Inquiry chat to check in-store stock and purchase in person with a valid prescription.',
  },
];

function getLocalJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setLocalJSON<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('Local storage write warning:', e);
  }
}

/**
 * Ensures the Supabase client is authenticated as Admin so RLS policies (`get_user_role() = 'admin'`)
 * grant full access to pending pharmacies, all orders, profiles, and inventory.
 */
export async function ensureAdminSupabaseSession(): Promise<boolean> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session?.user) {
      return true;
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'admin@carepoint.local',
      password: 'password123',
    });
    return !error && !!data.user;
  } catch {
    return false;
  }
}

export async function recordAuditLog(actor: string, action: string): Promise<AdminAuditEntry> {
  const entry: AdminAuditEntry = {
    id: 'audit_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    actor: actor || 'System Administrator',
    action,
    at: new Date().toISOString(),
  };

  const existing = getLocalJSON<AdminAuditEntry[]>(STORAGE_KEYS.AUDIT, []);
  const next = [entry, ...existing].slice(0, 250);
  setLocalJSON(STORAGE_KEYS.AUDIT, next);

  try {
    await supabase.from('admin_audit_log').insert({
      actor: entry.actor,
      action: entry.action,
      created_at: entry.at,
    });
  } catch {
    // Table may not be migrated yet; localStorage keeps audit trail intact
  }

  return entry;
}

export async function fetchAdminSnapshot(): Promise<AdminStateSnapshot> {
  await ensureAdminSupabaseSession();

  const accountMeta = getLocalJSON<
    Record<
      string,
      {
        email?: string;
        status?: 'active' | 'pending' | 'rejected' | 'disabled';
        role?: 'customer' | 'staff' | 'admin';
        pharmacy_id?: number;
        is_owner?: boolean;
        full_name?: string;
        phone_number?: string;
      }
    >
  >(STORAGE_KEYS.ACCOUNT_META, {});

  // 1. Fetch Pharmacies, Profiles, Staff mappings, Master Catalog, Inventory, Orders, Messages
  const [
    pharmaciesRes,
    profilesRes,
    staffMapRes,
    catalogRes,
    inventoryRes,
    ordersRes,
    messagesRes,
  ] = await Promise.all([
    supabase.from('pharmacies').select('*').order('pharmacy_id', { ascending: true }),
    supabase.from('profiles').select('*').order('created_at', { ascending: true }),
    supabase.from('pharmacy_staff').select('*'),
    supabase.from('master_catalog').select('*').order('item_id', { ascending: true }),
    supabase
      .from('pharmacy_inventory')
      .select('*, pharmacy:pharmacies(*), item:master_catalog(*)')
      .order('item_id', { ascending: true }),
    supabase
      .from('orders')
      .select('*, pharmacy:pharmacies(*), items:order_items(*, item:master_catalog(*))')
      .order('created_at', { ascending: false }),
    supabase.from('messages').select('order_id, inquiry_id, sender_id, created_at').order('created_at', { ascending: true }),
  ]);

  const storeMeta = getLocalJSON<Record<number, any>>('cp_staff_storefront_meta_v1', {});

  const pharmacies: (Pharmacy & {
    operating_hours?: string;
    phone_number?: string;
    applicant_name?: string;
    applicant_email?: string;
  })[] = (pharmaciesRes.data || []).map((p: any) => {
    const local = storeMeta[p.pharmacy_id] || {};
    const admMeta = accountMeta[`ph_${p.pharmacy_id}`] || {};
    return {
      ...p,
      operating_hours: p.operating_hours || local.operating_hours || '8:00 AM – 9:00 PM daily',
      phone_number: p.phone_number || local.phone_number || admMeta.phone_number || '0917 555 0100',
      applicant_name:
        p.applicant_name || local.applicant_name || (admMeta as any).applicantName || admMeta.full_name,
      applicant_email: p.applicant_email || local.applicant_email || admMeta.email,
    };
  });

  const pharmacyMap = new Map<number, Pharmacy & { operating_hours?: string }>();
  pharmacies.forEach((ph) => pharmacyMap.set(Number(ph.pharmacy_id), ph));

  const allProfiles: any[] = profilesRes.data || [];
  const staffMappings: any[] = staffMapRes.data || [];
  const ordersRaw: any[] = ordersRes.data || [];

  // Build profile lookup map
  const profileMap = new Map<string, any>();
  allProfiles.forEach((pr) => profileMap.set(pr.id, pr));

  // Count orders per customer
  const orderCountByCustomer = new Map<string, number>();
  ordersRaw.forEach((o) => {
    orderCountByCustomer.set(o.customer_id, (orderCountByCustomer.get(o.customer_id) || 0) + 1);
  });

  // Customers list (exclude any profile promoted to staff in DB or accountMeta)
  const customers: AdminCustomerRecord[] = allProfiles
    .filter((p) => {
      const effectiveRole = accountMeta[p.id]?.role || p.role;
      return effectiveRole === 'customer';
    })
    .map((p) => {
      const meta = accountMeta[p.id] || {};
      const slugEmail =
        p.email ||
        meta.email ||
        `${p.full_name.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '')}@carepoint.ph`;
      return {
        ...p,
        role: 'customer',
        full_name: meta.full_name || p.full_name,
        phone_number: meta.phone_number ?? p.phone_number,
        email: slugEmail,
        account_status: (p.account_status || meta.status || 'active') as 'active' | 'disabled',
        orders_count: orderCountByCustomer.get(p.id) || 0,
      };
    });

  // Admins list
  const admins: (Profile & { email?: string })[] = allProfiles
    .filter((p) => (accountMeta[p.id]?.role || p.role) === 'admin')
    .map((p) => {
      const meta = accountMeta[p.id] || {};
      return {
        ...p,
        email:
          p.email ||
          meta.email ||
          (p.id === '11111111-1111-1111-1111-111111111111'
            ? 'admin@carepoint.local'
            : `${p.full_name.toLowerCase().replace(/[^a-z0-9]+/g, '.')}@carepoint.ph`),
      };
    });

  // Map staff_id -> pharmacy_id from public.pharmacy_staff
  const pharmacyIdByStaff = new Map<string, number>();
  staffMappings.forEach((m) => {
    if (m.staff_id && m.pharmacy_id) {
      pharmacyIdByStaff.set(String(m.staff_id), Number(m.pharmacy_id));
    }
  });

  const staffRecords: AdminStaffRecord[] = [];
  const pharmaciesWithStaff = new Set<number>();

  // 1) Include all real staff profiles (including promoted customers & multiple staff per pharmacy)
  allProfiles
    .filter((p) => {
      const r = accountMeta[p.id]?.role || p.role;
      return r === 'staff' || r === 'pharmacy_owner';
    })
    .forEach((p) => {
      const meta = accountMeta[p.id] || {};
      const assignedPhId =
        Number(meta.pharmacy_id) ||
        pharmacyIdByStaff.get(p.id) ||
        pharmacies[0]?.pharmacy_id ||
        1;
      const ph = pharmacyMap.get(assignedPhId) || pharmacies[0];
      if (ph) {
        pharmaciesWithStaff.add(Number(ph.pharmacy_id));
      }

      const phMeta = ph ? accountMeta[`ph_${ph.pharmacy_id}`] || {} : {};
      const derivedStatus: AdminStaffRecord['status'] =
        meta.status ||
        (p.account_status as any) ||
        (ph?.approval_status === 'pending'
          ? 'pending'
          : ph?.approval_status === 'rejected'
          ? 'rejected'
          : phMeta.status === 'disabled'
          ? 'disabled'
          : 'active');

      staffRecords.push({
        staff_id: p.id,
        pharmacy_id: assignedPhId,
        full_name: meta.full_name || p.full_name,
        email:
          p.email ||
          meta.email ||
          `${(meta.full_name || p.full_name).toLowerCase().replace(/[^a-z0-9]+/g, '.')}@pharmacy.ph`,
        phone_number: meta.phone_number ?? p.phone_number ?? '09171111111',
        status: derivedStatus,
        is_owner: meta.is_owner !== undefined ? !!meta.is_owner : (p.role === 'pharmacy_owner'),
        pharmacy: ph,
      });
    });

  // 2) For any pharmacy without a mapped profile row yet, include its representative entry
  pharmacies.forEach((ph) => {
    if (pharmaciesWithStaff.has(Number(ph.pharmacy_id))) return;
    const synthId = `ph_staff_${ph.pharmacy_id}`;
    const meta = accountMeta[synthId] || accountMeta[`ph_${ph.pharmacy_id}`] || {};
    if (meta.role === 'customer') return; // Demoted

    const targetPhId = Number(meta.pharmacy_id) || Number(ph.pharmacy_id);
    const targetPh = pharmacyMap.get(targetPhId) || ph;
    const statusFromPh: AdminStaffRecord['status'] =
      meta.status ||
      (targetPh.approval_status === 'pending'
        ? 'pending'
        : targetPh.approval_status === 'rejected'
        ? 'rejected'
        : 'active');

    staffRecords.push({
      staff_id: synthId,
      pharmacy_id: targetPhId,
      full_name:
        meta.full_name ||
        (meta as any).applicantName ||
        (targetPh as any).applicant_name ||
        `${ph.name} Representative`,
      email:
        meta.email ||
        (targetPh as any).applicant_email ||
        `staff@${ph.name.toLowerCase().replace(/[^a-z0-9]+/g, '')}.ph`,
      phone_number: meta.phone_number || (targetPh as any).phone_number || '09171111111',
      status: statusFromPh,
      is_owner: meta.is_owner !== undefined ? !!meta.is_owner : true,
      pharmacy: targetPh,
    });
  });

  // Master Catalog (fallback to PHILIPPINE_MEDICINES if empty)
  const catalog: MasterCatalogItem[] =
    catalogRes.data && catalogRes.data.length > 0
      ? (catalogRes.data as MasterCatalogItem[])
      : PHILIPPINE_MEDICINES.map((m) => ({
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
          image_url: `/medicines/${m.slug}.svg`,
          created_at: new Date().toISOString(),
        }));

  // Calculate sold units per (pharmacy_id, item_id) from completed orders
  const soldMap = new Map<string, number>();
  ordersRaw.forEach((o) => {
    if (o.status !== 'cancelled' && Array.isArray(o.items)) {
      o.items.forEach((it: any) => {
        const key = `${o.pharmacy_id}_${it.item_id}`;
        soldMap.set(key, (soldMap.get(key) || 0) + Number(it.quantity || 0));
      });
    }
  });

  const inventory: (PharmacyInventoryItem & { sold?: number })[] = (inventoryRes.data || []).map((inv: any) => ({
    ...inv,
    price: Number(inv.price),
    stock_quantity: Number(inv.stock_quantity),
    sold: soldMap.get(`${inv.pharmacy_id}_${inv.item_id}`) || 0,
  }));

  // Enrich orders with customer & pharmacy names
  const orders = ordersRaw.map((o) => {
    const cust = profileMap.get(o.customer_id);
    return {
      ...o,
      total_amount: Number(o.total_amount),
      customer_name: cust?.full_name || o.recipient_name || 'Customer',
      customer_email: cust?.email || cust?.phone_number || '',
      pharmacy_name: o.pharmacy?.name || `Pharmacy #${o.pharmacy_id}`,
    };
  });

  // Compute average first reply time (hours) across conversations
  let avgResponseHours: string | null = null;
  const msgs = messagesRes.data || [];
  if (msgs.length > 0) {
    const threadsMap = new Map<string, any[]>();
    msgs.forEach((m: any) => {
      const key = m.order_id ? `o_${m.order_id}` : `i_${m.inquiry_id}`;
      if (!threadsMap.has(key)) threadsMap.set(key, []);
      threadsMap.get(key)!.push(m);
    });
    const diffs: number[] = [];
    threadsMap.forEach((threadMsgs) => {
      const firstCust = threadMsgs.find((m) => profileMap.get(m.sender_id)?.role === 'customer');
      const firstStaff = threadMsgs.find((m) => profileMap.get(m.sender_id)?.role !== 'customer');
      if (firstCust && firstStaff) {
        const t1 = new Date(firstCust.created_at).getTime();
        const t2 = new Date(firstStaff.created_at).getTime();
        if (t2 > t1) diffs.push((t2 - t1) / 36e5);
      }
    });
    if (diffs.length > 0) {
      avgResponseHours = (diffs.reduce((a, b) => a + b, 0) / diffs.length).toFixed(1);
    }
  }

  // Load Flags, Audit Log, Settings & CMS (try Supabase first, merge with localStorage)
  let flags = getLocalJSON<AdminFlag[]>(STORAGE_KEYS.FLAGS, [
    {
      id: 'flag_1',
      targetType: 'pharmacy',
      targetId: '3',
      targetName: 'QuickMeds Pending',
      reason: 'Awaiting FDA license document verification prior to marketplace activation.',
      status: 'open',
      createdAt: new Date().toISOString(),
    },
  ]);

  try {
    const { data: dbFlags, error: flagErr } = await supabase
      .from('admin_flags')
      .select('*')
      .order('created_at', { ascending: false });
    if (!flagErr && dbFlags && dbFlags.length > 0) {
      flags = dbFlags.map((f: any) => ({
        id: String(f.flag_id),
        targetType: f.target_type,
        targetId: f.target_id,
        targetName: f.target_name,
        reason: f.reason,
        status: f.status,
        createdAt: f.created_at,
      }));
      setLocalJSON(STORAGE_KEYS.FLAGS, flags);
    }
  } catch {
    // Fallback to local flags
  }

  let auditLog = getLocalJSON<AdminAuditEntry[]>(STORAGE_KEYS.AUDIT, [
    {
      id: 'audit_init_1',
      actor: 'System Administrator',
      action: 'Initialized CarePoint Master OTC Catalog (40 verified Philippine medicines)',
      at: new Date(Date.now() - 3600_000 * 2).toISOString(),
    },
    {
      id: 'audit_init_2',
      actor: 'System Administrator',
      action: 'Approved MetroCare Pharmacy (FDA-PH-001) and HealthFirst Chemists (FDA-PH-002)',
      at: new Date(Date.now() - 3600_000 * 5).toISOString(),
    },
  ]);

  try {
    const { data: dbAudit, error: auditErr } = await supabase
      .from('admin_audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(150);
    if (!auditErr && dbAudit && dbAudit.length > 0) {
      auditLog = dbAudit.map((a: any) => ({
        id: String(a.audit_id),
        actor: a.actor,
        action: a.action,
        at: a.created_at,
      }));
      setLocalJSON(STORAGE_KEYS.AUDIT, auditLog);
    }
  } catch {
    // Fallback to local audit log
  }

  let settings = getLocalJSON<PlatformSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  const localCms = getLocalJSON<{
    banner?: AdminBanner;
    banners?: AdminBanner[];
    promotions: AdminPromotion[];
    pages: Record<string, AdminStaticPage>;
    faqs: AdminFaq[];
  }>(STORAGE_KEYS.CMS, {
    banner: DEFAULT_BANNER,
    banners: DEFAULT_BANNERS,
    promotions: [
      {
        id: 'promo1',
        title: '🌿 Free Delivery Over ₱1,500',
        text: 'Order essential OTC vitamins and first-aid remedies from verified neighborhood pharmacies.',
        active: true,
      },
    ],
    pages: DEFAULT_PAGES,
    faqs: DEFAULT_FAQS,
  });

  let homepageBanners = normalizeAdminBanners(localCms.banners || localCms.banner);

  try {
    const { data: dbSettings, error: setErr } = await supabase
      .from('platform_settings')
      .select('*')
      .eq('id', 'main')
      .maybeSingle();
    if (!setErr && dbSettings) {
      settings = {
        platformName: dbSettings.platform_name ?? settings.platformName,
        supportEmail: dbSettings.support_email ?? settings.supportEmail,
        currency: dbSettings.currency ?? settings.currency,
        pickupEnabled: dbSettings.pickup_enabled ?? settings.pickupEnabled,
        deliveryEnabled: dbSettings.delivery_enabled ?? settings.deliveryEnabled,
        deliveryFee: Number(dbSettings.delivery_fee ?? settings.deliveryFee),
        freeDeliveryOver: Number(dbSettings.free_delivery_over ?? settings.freeDeliveryOver),
        lowStockThreshold: Number(dbSettings.low_stock_threshold ?? settings.lowStockThreshold),
        returnWindowDays: Number(dbSettings.return_window_days ?? settings.returnWindowDays),
        payments: dbSettings.payments ?? settings.payments,
      };
      if (dbSettings.homepage_banner) {
        homepageBanners = normalizeAdminBanners(dbSettings.homepage_banner);
      }
      if (dbSettings.pages) localCms.pages = dbSettings.pages;
      if (dbSettings.faqs) localCms.faqs = dbSettings.faqs;
      if (dbSettings.promotions) localCms.promotions = dbSettings.promotions;
    }
  } catch {
    // Fallback to local settings/CMS
  }

  return {
    pharmacies,
    customers,
    staff: staffRecords,
    admins,
    catalog,
    inventory,
    orders,
    flags,
    auditLog,
    settings,
    homepageBanner: homepageBanners[0] || DEFAULT_BANNER,
    homepageBanners,
    promotions: localCms.promotions,
    pages: localCms.pages,
    faqs: localCms.faqs,
    avgResponseHours,
  };
}

// ============================================================================
// 1. REGISTRY / PHARMACY APPROVALS
// ============================================================================

export async function updatePharmacyApproval(
  pharmacyId: number,
  decision: PharmacyApprovalStatus,
  actorName: string,
  options?: {
    recipientEmail?: string;
    applicantName?: string;
    emailSubject?: string;
    decisionNote?: string;
  }
): Promise<{ success: boolean; message: string; autoLinkedStaff?: boolean }> {
  await ensureAdminSupabaseSession();
  const isOpen = decision === 'approved';

  let ph: any = null;
  const extendedUpdate: Record<string, any> = {
    approval_status: decision,
    is_open: isOpen,
    decided_at: new Date().toISOString(),
  };
  if (options?.decisionNote !== undefined) {
    extendedUpdate.admin_decision_note = options.decisionNote;
  }
  if (options?.recipientEmail) {
    extendedUpdate.applicant_email = options.recipientEmail.trim().toLowerCase();
  }
  if (options?.applicantName) {
    extendedUpdate.applicant_name = options.applicantName.trim();
  }

  const extRes = await supabase
    .from('pharmacies')
    .update(extendedUpdate)
    .eq('pharmacy_id', pharmacyId)
    .select('*')
    .maybeSingle();

  if (extRes.error) {
    // Fallback if extended columns are not yet pushed to Supabase
    const coreRes = await supabase
      .from('pharmacies')
      .update({
        approval_status: decision,
        is_open: isOpen,
      })
      .eq('pharmacy_id', pharmacyId)
      .select('*')
      .maybeSingle();

    if (coreRes.error) {
      return { success: false, message: coreRes.error.message };
    }
    ph = coreRes.data;
  } else {
    ph = extRes.data;
  }

  let autoLinkedStaff = false;
  const targetEmail = (options?.recipientEmail || ph?.applicant_email || '').trim().toLowerCase();

  // If newly approved, ensure the pharmacy has active inventory listings for OTC catalog items
  // and auto-promote/link any existing Customer profile whose email matches the applicant_email.
  if (decision === 'approved') {
    const { data: existingInv } = await supabase
      .from('pharmacy_inventory')
      .select('item_id')
      .eq('pharmacy_id', pharmacyId)
      .limit(1);

    if (!existingInv || existingInv.length === 0) {
      const { data: otcItems } = await supabase
        .from('master_catalog')
        .select('item_id')
        .eq('requires_prescription', false);

      if (otcItems && otcItems.length > 0) {
        const seedPriceMap = new Map<number, number>();
        PHILIPPINE_MEDICINES.forEach((m) => seedPriceMap.set(m.item_id, m.price));

        const rows = otcItems.map((it: any) => ({
          pharmacy_id: pharmacyId,
          item_id: it.item_id,
          price: seedPriceMap.get(it.item_id) || 15.0,
          stock_quantity: 45,
          is_active: true,
        }));
        await supabase
          .from('pharmacy_inventory')
          .upsert(rows, { onConflict: 'pharmacy_id,item_id' });
      }
    }

    if (targetEmail) {
      const { data: matchedProfiles } = await supabase
        .from('profiles')
        .select('id, role, full_name, email')
        .ilike('email', targetEmail);

      const candidate = (matchedProfiles || []).find((pr: any) => pr.role !== 'admin');
      if (candidate) {
        await supabase
          .from('profiles')
          .update({ role: 'staff', updated_at: new Date().toISOString() })
          .eq('id', candidate.id);

        await supabase.from('pharmacy_staff').delete().eq('staff_id', candidate.id);
        await supabase
          .from('pharmacy_staff')
          .upsert({ staff_id: candidate.id, pharmacy_id: pharmacyId }, { onConflict: 'staff_id,pharmacy_id' });

        const meta = getLocalJSON<Record<string, any>>(STORAGE_KEYS.ACCOUNT_META, {});
        meta[candidate.id] = {
          ...(meta[candidate.id] || {}),
          role: 'staff',
          pharmacy_id: pharmacyId,
          is_owner: true,
          status: 'active',
          email: targetEmail,
        };
        setLocalJSON(STORAGE_KEYS.ACCOUNT_META, meta);
        autoLinkedStaff = true;
      }
    }
  }

  const phName = ph?.name || `Pharmacy #${pharmacyId}`;
  const emailSuffix = targetEmail ? ` (Confirmation email prepared for ${targetEmail})` : '';
  await recordAuditLog(
    actorName,
    decision === 'approved'
      ? `Approved pharmacy registration: ${phName}${emailSuffix}${autoLinkedStaff ? ' & auto-linked Staff account' : ''}`
      : `Rejected pharmacy registration: ${phName}${emailSuffix}`
  );

  return {
    success: true,
    autoLinkedStaff,
    message:
      decision === 'approved'
        ? `${phName} approved and is now live on the marketplace!${autoLinkedStaff ? ' Existing user account automatically promoted to Pharmacy Staff.' : ''}`
        : `${phName} registration rejected.`,
  };
}

// ============================================================================
// 2. ACCOUNTS & STAFF GOVERNANCE (Customers, Staff Assignment/Promotion, Admins)
// ============================================================================

export async function saveCustomerAccountAdmin(
  id: string,
  fullName: string,
  email: string,
  phoneNumber: string,
  status: 'active' | 'disabled',
  actorName: string
): Promise<{ success: boolean; message: string }> {
  await ensureAdminSupabaseSession();

  const accountMeta = getLocalJSON<Record<string, any>>(STORAGE_KEYS.ACCOUNT_META, {});
  accountMeta[id] = {
    ...(accountMeta[id] || {}),
    full_name: fullName,
    phone_number: phoneNumber,
    email,
    status,
    role: 'customer',
  };
  setLocalJSON(STORAGE_KEYS.ACCOUNT_META, accountMeta);

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: fullName,
      phone_number: phoneNumber || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    return { success: false, message: error.message };
  }

  await recordAuditLog(actorName, `Updated customer account ${fullName} (${status})`);
  return { success: true, message: 'Customer account updated.' };
}

/**
 * Promotes a normal Customer account to Pharmacy Staff and assigns them to a specific Pharmacy branch.
 */
export async function promoteCustomerToStaffAdmin(
  customerId: string,
  fullName: string,
  email: string,
  phoneNumber: string | null,
  pharmacyId: number,
  pharmacyName: string,
  isOwner: boolean,
  actorName: string
): Promise<{ success: boolean; message: string }> {
  await ensureAdminSupabaseSession();

  // 1. Update local metadata immediately
  const roleValue: UserRole = isOwner ? 'pharmacy_owner' : 'staff';
  const accountMeta = getLocalJSON<Record<string, any>>(STORAGE_KEYS.ACCOUNT_META, {});
  accountMeta[customerId] = {
    ...(accountMeta[customerId] || {}),
    full_name: fullName,
    email,
    phone_number: phoneNumber || '09171111111',
    role: roleValue,
    pharmacy_id: Number(pharmacyId),
    is_owner: isOwner,
    status: 'active',
  };
  setLocalJSON(STORAGE_KEYS.ACCOUNT_META, accountMeta);

  // 2. Update public.profiles role
  await supabase
    .from('profiles')
    .update({
      role: roleValue,
      updated_at: new Date().toISOString(),
    })
    .eq('id', customerId);

  // 3. Assign staff member exclusively to the selected pharmacy in public.pharmacy_staff
  await supabase.from('pharmacy_staff').delete().eq('staff_id', customerId);
  await supabase.from('pharmacy_staff').insert({
    staff_id: customerId,
    pharmacy_id: Number(pharmacyId),
  });

  await recordAuditLog(
    actorName,
    `Promoted customer ${fullName} to ${isOwner ? 'Pharmacy Manager/Owner' : 'Pharmacy Staff'} and assigned to ${pharmacyName} (#${pharmacyId})`
  );

  return {
    success: true,
    message: `${fullName} promoted to Pharmacy Staff and assigned to ${pharmacyName}!`,
  };
}

/**
 * Updates an existing Pharmacy Staff account, including reassigning their Pharmacy branch, role designation, or status.
 */
export async function saveStaffAccountAdmin(
  staffId: string,
  fullName: string,
  email: string,
  phoneNumber: string,
  pharmacyId: number,
  pharmacyName: string,
  status: 'active' | 'pending' | 'rejected' | 'disabled',
  isOwner: boolean,
  actorName: string
): Promise<{ success: boolean; message: string }> {
  await ensureAdminSupabaseSession();

  const roleValue: UserRole = isOwner ? 'pharmacy_owner' : 'staff';
  const accountMeta = getLocalJSON<Record<string, any>>(STORAGE_KEYS.ACCOUNT_META, {});
  accountMeta[staffId] = {
    ...(accountMeta[staffId] || {}),
    full_name: fullName,
    email,
    phone_number: phoneNumber,
    pharmacy_id: Number(pharmacyId),
    status,
    is_owner: isOwner,
    role: roleValue,
  };
  setLocalJSON(STORAGE_KEYS.ACCOUNT_META, accountMeta);

  if (!staffId.startsWith('ph_staff_')) {
    await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        phone_number: phoneNumber || null,
        role: roleValue,
        updated_at: new Date().toISOString(),
      })
      .eq('id', staffId);

    // Reassign single pharmacy branch in public.pharmacy_staff
    await supabase.from('pharmacy_staff').delete().eq('staff_id', staffId);
    await supabase.from('pharmacy_staff').insert({
      staff_id: staffId,
      pharmacy_id: Number(pharmacyId),
    });
  }

  await recordAuditLog(
    actorName,
    `Updated staff account ${fullName} — assigned to ${pharmacyName} (#${pharmacyId}) [${status}]`
  );

  return {
    success: true,
    message: `Staff account ${fullName} updated and assigned to ${pharmacyName}.`,
  };
}

/**
 * Creates a new Pharmacy Staff profile and assigns them to a Pharmacy branch.
 */
export async function addNewStaffAccountAdmin(
  fullName: string,
  email: string,
  phoneNumber: string,
  pharmacyId: number,
  pharmacyName: string,
  isOwner: boolean,
  actorName: string
): Promise<{ success: boolean; message: string }> {
  await ensureAdminSupabaseSession();
  const newId = crypto.randomUUID
    ? crypto.randomUUID()
    : `bbbbbbbb-bbbb-4bbb-8bbb-${Date.now().toString().slice(-12).padStart(12, '0')}`;

  const roleValue: UserRole = isOwner ? 'pharmacy_owner' : 'staff';
  const accountMeta = getLocalJSON<Record<string, any>>(STORAGE_KEYS.ACCOUNT_META, {});
  accountMeta[newId] = {
    full_name: fullName,
    email,
    phone_number: phoneNumber || '09171111111',
    role: roleValue,
    pharmacy_id: Number(pharmacyId),
    is_owner: isOwner,
    status: 'active',
  };
  setLocalJSON(STORAGE_KEYS.ACCOUNT_META, accountMeta);

  const { error: profErr } = await supabase.from('profiles').insert({
    id: newId,
    role: roleValue,
    full_name: fullName,
    phone_number: phoneNumber || '09171111111',
    notifications_enabled: true,
    dark_mode: false,
  });

  if (profErr) {
    return { success: false, message: profErr.message };
  }

  await supabase.from('pharmacy_staff').insert({
    staff_id: newId,
    pharmacy_id: Number(pharmacyId),
  });

  await recordAuditLog(
    actorName,
    `Added new Pharmacy Staff ${fullName} (${email}) and assigned to ${pharmacyName} (#${pharmacyId})`
  );

  return {
    success: true,
    message: `${fullName} added and assigned to ${pharmacyName}.`,
  };
}

/**
 * Demotes a Pharmacy Staff account back to a normal Customer account and unlinks their pharmacy assignment.
 */
export async function demoteStaffToCustomerAdmin(
  staffId: string,
  fullName: string,
  actorName: string
): Promise<{ success: boolean; message: string }> {
  await ensureAdminSupabaseSession();

  const accountMeta = getLocalJSON<Record<string, any>>(STORAGE_KEYS.ACCOUNT_META, {});
  accountMeta[staffId] = {
    ...(accountMeta[staffId] || {}),
    role: 'customer',
    status: 'active',
  };
  delete accountMeta[staffId].pharmacy_id;
  delete accountMeta[staffId].is_owner;
  setLocalJSON(STORAGE_KEYS.ACCOUNT_META, accountMeta);

  if (!staffId.startsWith('ph_staff_')) {
    await supabase.from('pharmacy_staff').delete().eq('staff_id', staffId);
    await supabase
      .from('profiles')
      .update({
        role: 'customer',
        updated_at: new Date().toISOString(),
      })
      .eq('id', staffId);
  }

  await recordAuditLog(actorName, `Demoted ${fullName} from Pharmacy Staff to Customer`);
  return {
    success: true,
    message: `${fullName} is now a standard Customer account.`,
  };
}

export async function toggleAccountStatusAdmin(
  type: 'customer' | 'staff',
  id: string,
  currentStatus: string,
  name: string,
  pharmacyId?: number,
  actorName: string = 'System Administrator'
): Promise<{ success: boolean; message: string }> {
  await ensureAdminSupabaseSession();
  const nextStatus: 'active' | 'disabled' = currentStatus === 'active' ? 'disabled' : 'active';

  const accountMeta = getLocalJSON<Record<string, any>>(STORAGE_KEYS.ACCOUNT_META, {});
  accountMeta[id] = { ...(accountMeta[id] || {}), status: nextStatus };
  if (pharmacyId && id.startsWith('ph_staff_')) {
    accountMeta[`ph_${pharmacyId}`] = { ...(accountMeta[`ph_${pharmacyId}`] || {}), status: nextStatus };
  }
  setLocalJSON(STORAGE_KEYS.ACCOUNT_META, accountMeta);

  await recordAuditLog(
    actorName,
    `${nextStatus === 'active' ? 'Activated' : 'Suspended'} ${type} account ${name}`
  );

  return {
    success: true,
    message: `Account ${nextStatus === 'active' ? 'activated' : 'suspended'}.`,
  };
}

export async function removeAccountAdmin(
  type: 'customer' | 'staff',
  id: string,
  name: string,
  pharmacyId?: number,
  actorName: string = 'System Administrator'
): Promise<{ success: boolean; message: string }> {
  await ensureAdminSupabaseSession();

  if (type === 'customer') {
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) {
      return { success: false, message: `Cannot delete customer with active orders (${error.message}). Try suspending instead.` };
    }
    await recordAuditLog(actorName, `Removed customer account ${name}`);
    return { success: true, message: 'Customer account removed.' };
  } else {
    if (!id.startsWith('ph_staff_')) {
      await supabase.from('pharmacy_staff').delete().eq('staff_id', id);
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) {
        return { success: false, message: `Cannot delete staff profile (${error.message}). Try disabling instead.` };
      }
    } else if (pharmacyId) {
      const accountMeta = getLocalJSON<Record<string, any>>(STORAGE_KEYS.ACCOUNT_META, {});
      accountMeta[id] = { ...(accountMeta[id] || {}), role: 'customer', status: 'disabled' };
      setLocalJSON(STORAGE_KEYS.ACCOUNT_META, accountMeta);
    }
    await recordAuditLog(actorName, `Removed staff account ${name}`);
    return { success: true, message: 'Staff account removed.' };
  }
}

export async function addAdminAccount(
  fullName: string,
  email: string,
  phoneNumber: string,
  actorName: string
): Promise<{ success: boolean; message: string }> {
  await ensureAdminSupabaseSession();
  const newId = crypto.randomUUID ? crypto.randomUUID() : `aaaaaaaa-aaaa-4aaa-8aaa-${Date.now().toString().slice(-12).padStart(12, '0')}`;

  const accountMeta = getLocalJSON<Record<string, any>>(STORAGE_KEYS.ACCOUNT_META, {});
  accountMeta[newId] = { email, status: 'active' };
  setLocalJSON(STORAGE_KEYS.ACCOUNT_META, accountMeta);

  const { error } = await supabase.from('profiles').insert({
    id: newId,
    role: 'admin',
    full_name: fullName,
    phone_number: phoneNumber || '09170000000',
    notifications_enabled: true,
    dark_mode: false,
  });

  if (error) {
    return { success: false, message: error.message };
  }

  await recordAuditLog(actorName, `Added site administrator ${fullName} (${email})`);
  return { success: true, message: 'Administrator added.' };
}

export async function updateAdminAccount(
  id: string,
  fullName: string,
  email: string,
  phoneNumber: string,
  actorName: string
): Promise<{ success: boolean; message: string }> {
  await ensureAdminSupabaseSession();

  const accountMeta = getLocalJSON<Record<string, any>>(STORAGE_KEYS.ACCOUNT_META, {});
  accountMeta[id] = { ...(accountMeta[id] || {}), email };
  setLocalJSON(STORAGE_KEYS.ACCOUNT_META, accountMeta);

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: fullName,
      phone_number: phoneNumber || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    return { success: false, message: error.message };
  }

  await recordAuditLog(actorName, `Updated site administrator ${fullName}`);
  return { success: true, message: 'Administrator updated.' };
}

export async function deleteAdminAccount(
  id: string,
  name: string,
  actorName: string
): Promise<{ success: boolean; message: string }> {
  await ensureAdminSupabaseSession();
  const { error } = await supabase.from('profiles').delete().eq('id', id);
  if (error) {
    return { success: false, message: error.message };
  }
  await recordAuditLog(actorName, `Deleted site administrator ${name}`);
  return { success: true, message: 'Administrator deleted.' };
}

// ============================================================================
// 3. MASTER CATALOG (HERBAL INDEX — OTC STRUCTURAL GATEKEEPER)
// ============================================================================

export async function toggleCatalogRx(
  item: MasterCatalogItem,
  actorName: string
): Promise<{ success: boolean; message: string }> {
  await ensureAdminSupabaseSession();
  const nextRx = !item.requires_prescription;

  const { error } = await supabase
    .from('master_catalog')
    .update({ requires_prescription: nextRx })
    .eq('item_id', item.item_id);

  if (error) {
    return { success: false, message: error.message };
  }

  // HARD RULE: If reclassified to Rx, structurally deactivate from online checkout inventory
  if (nextRx) {
    await supabase
      .from('pharmacy_inventory')
      .update({ is_active: false })
      .eq('item_id', item.item_id);
  }

  await recordAuditLog(
    actorName,
    `Reclassified ${item.brand_name || item.generic_name} (#${item.item_id}) to ${nextRx ? 'Rx Only (Blocked from online checkout)' : 'OTC Approved'}`
  );

  return {
    success: true,
    message: `Updated ${item.brand_name || item.generic_name} to ${nextRx ? 'Rx Only' : 'OTC Approved'}.`,
  };
}

export async function deleteCatalogMedicine(
  itemId: number,
  name: string,
  actorName: string
): Promise<{ success: boolean; message: string }> {
  await ensureAdminSupabaseSession();
  await supabase.from('pharmacy_inventory').delete().eq('item_id', itemId);
  const { error } = await supabase.from('master_catalog').delete().eq('item_id', itemId);
  if (error) {
    return { success: false, message: error.message };
  }
  await recordAuditLog(actorName, `Removed ${name} (#${itemId}) from Master Catalog`);
  return { success: true, message: `Removed ${name} from catalog.` };
}

export async function saveCatalogMedicine(
  med: Partial<MasterCatalogItem> & { default_price?: number },
  actorName: string
): Promise<{ success: boolean; message: string }> {
  await ensureAdminSupabaseSession();

  const categorySvgMap: Record<string, string> = {
    'Pain Relief': '/medicines/biogesic.svg',
    'Cold & Flu': '/medicines/neozep-forte.svg',
    'Vitamins': '/medicines/enervon-c.svg',
    'Digestive': '/medicines/kremil-s.svg',
    'Allergy': '/medicines/allerta.svg',
    'First Aid': '/medicines/betadine.svg',
    'Antibiotic': '/medicines/amoxil.svg',
    'Blood Pressure': '/medicines/norvasc.svg',
  };

  let targetItemId = med.item_id;
  if (!targetItemId) {
    const { data: maxRow } = await supabase
      .from('master_catalog')
      .select('item_id')
      .order('item_id', { ascending: false })
      .limit(1)
      .maybeSingle();
    targetItemId = (maxRow?.item_id || 40) + 1;
  }

  const payload: any = {
    item_id: targetItemId,
    brand_name: med.brand_name,
    generic_name: med.generic_name,
    category: med.category,
    dosage_form: med.dosage_form,
    requires_prescription: !!med.requires_prescription,
    indications:
      med.indications ||
      `Verified ${med.category || 'healthcare'} product (${med.generic_name}) listed in the CarePoint catalog.`,
    dosage_instructions:
      med.dosage_instructions ||
      'Follow the dosage instructions on the package label or consult a licensed pharmacist.',
    packaging: med.packaging || med.dosage_form || 'Standard pack',
    side_effects:
      med.side_effects || 'Generally well-tolerated when used according to package directions.',
    image_url:
      med.image_url || categorySvgMap[med.category || ''] || '/medicines/biogesic.svg',
  };

  const { data, error } = await supabase
    .from('master_catalog')
    .upsert(payload, { onConflict: 'item_id' })
    .select('*')
    .single();

  if (error) {
    return { success: false, message: error.message };
  }

  // HARD RULE: If updated to Rx, structurally deactivate online checkout inventory across all pharmacies
  if (data && data.requires_prescription) {
    await supabase
      .from('pharmacy_inventory')
      .update({ is_active: false })
      .eq('item_id', data.item_id);
  }

  await recordAuditLog(
    actorName,
    `${med.item_id ? 'Updated' : 'Added'} Master Catalog medicine: ${med.brand_name} (${med.generic_name})`
  );

  return {
    success: true,
    message: `${med.brand_name} saved to Master Catalog.`,
  };
}

// ============================================================================
// 4. TRUST & SAFETY FLAGS
// ============================================================================

export async function resolveAdminFlag(
  flagId: string,
  actorName: string
): Promise<{ success: boolean; message: string }> {
  const flags = getLocalJSON<AdminFlag[]>(STORAGE_KEYS.FLAGS, []);
  const target = flags.find((f) => f.id === flagId);
  const updated = flags.map((f) => (f.id === flagId ? { ...f, status: 'resolved' as const } : f));
  setLocalJSON(STORAGE_KEYS.FLAGS, updated);

  try {
    if (/^\d+$/.test(flagId)) {
      await supabase.from('admin_flags').update({ status: 'resolved' }).eq('flag_id', Number(flagId));
    }
  } catch {
    // Fallback handled
  }

  await recordAuditLog(actorName, `Resolved account flag on ${target?.targetName || flagId}`);
  return { success: true, message: 'Flag resolved.' };
}

export async function createAdminFlag(
  targetType: 'customer' | 'staff' | 'pharmacy',
  targetId: string,
  targetName: string,
  reason: string,
  actorName: string
): Promise<{ success: boolean; message: string }> {
  const newFlag: AdminFlag = {
    id: 'flag_' + Date.now(),
    targetType,
    targetId,
    targetName,
    reason,
    status: 'open',
    createdAt: new Date().toISOString(),
  };

  const flags = getLocalJSON<AdminFlag[]>(STORAGE_KEYS.FLAGS, []);
  setLocalJSON(STORAGE_KEYS.FLAGS, [newFlag, ...flags]);

  try {
    await supabase.from('admin_flags').insert({
      target_type: targetType,
      target_id: targetId,
      target_name: targetName,
      reason,
      status: 'open',
    });
  } catch {
    // Local storage already updated
  }

  await recordAuditLog(actorName, `Flagged ${targetType} account ${targetName}: ${reason}`);
  return { success: true, message: 'Flag raised for review.' };
}

// ============================================================================
// 5. SETTINGS & CMS (Banner, Promotions, Pages, FAQs)
// ============================================================================

function broadcastCmsSync() {
  try {
    localStorage.setItem('cp_cms_last_updated', String(Date.now()));
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const bc = new BroadcastChannel('carepoint_cms_sync');
      bc.postMessage({ type: 'cms_updated', at: Date.now() });
      bc.close();
    }
  } catch {
    // Ignore broadcast errors
  }
}

export async function saveAdminSettings(
  settings: PlatformSettings,
  actorName: string
): Promise<{ success: boolean; message: string }> {
  await ensureAdminSupabaseSession();
  setLocalJSON(STORAGE_KEYS.SETTINGS, settings);

  try {
    const { error } = await supabase.from('platform_settings').upsert(
      {
        id: 'main',
        platform_name: settings.platformName,
        support_email: settings.supportEmail,
        currency: settings.currency,
        pickup_enabled: settings.pickupEnabled,
        delivery_enabled: settings.deliveryEnabled,
        delivery_fee: settings.deliveryFee,
        free_delivery_over: settings.freeDeliveryOver,
        low_stock_threshold: settings.lowStockThreshold,
        return_window_days: settings.returnWindowDays,
        payments: settings.payments,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
    if (error) {
      return { success: false, message: error.message };
    }
  } catch {
    // Local fallback saved
  }

  broadcastCmsSync();
  await recordAuditLog(actorName, 'Updated platform settings & fulfillment rules');
  return { success: true, message: 'Settings saved.' };
}

export async function saveAdminCmsData(
  cms: {
    banner?: AdminBanner;
    banners?: AdminBanner[];
    promotions: AdminPromotion[];
    pages: Record<string, AdminStaticPage>;
    faqs: AdminFaq[];
  },
  auditDescription: string,
  actorName: string
): Promise<{ success: boolean; message: string }> {
  await ensureAdminSupabaseSession();
  const slides =
    cms.banners && cms.banners.length > 0
      ? cms.banners
      : normalizeAdminBanners(cms.banner);
  const primary = slides[0] || DEFAULT_BANNER;

  setLocalJSON(STORAGE_KEYS.CMS, {
    banner: primary,
    banners: slides,
    promotions: cms.promotions,
    pages: cms.pages,
    faqs: cms.faqs,
  });

  try {
    const { error } = await supabase.from('platform_settings').upsert(
      {
        id: 'main',
        homepage_banner: {
          ...primary,
          slides,
        },
        promotions: cms.promotions,
        pages: cms.pages,
        faqs: cms.faqs,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
    if (error) {
      return { success: false, message: error.message };
    }
  } catch {
    // Local fallback saved
  }

  broadcastCmsSync();
  await recordAuditLog(actorName, auditDescription);
  return { success: true, message: 'Content updated.' };
}

// ============================================================================
// 6. SUPABASE REALTIME SUBSCRIPTION FOR ADMIN CONSOLE
// ============================================================================

export function subscribeToAdminRealtime(
  onOrderEvent: (payload: any) => void,
  onDataChange: () => void
) {
  const channel = supabase
    .channel('carepoint-admin-console-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'orders' },
      (payload) => {
        onOrderEvent(payload);
        onDataChange();
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'pharmacies' },
      () => onDataChange()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'pharmacy_staff' },
      () => onDataChange()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'pharmacy_inventory' },
      () => onDataChange()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'master_catalog' },
      () => onDataChange()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'profiles' },
      () => onDataChange()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'platform_settings' },
      () => onDataChange()
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
