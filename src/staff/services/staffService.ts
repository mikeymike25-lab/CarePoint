import { supabase } from '../../shared/lib/supabase';
import { PHILIPPINE_MEDICINES, resolveMedicineImageUrl } from '../../shared/data/medicines';
import type {
  Profile,
  Pharmacy,
  MasterCatalogItem,
  PharmacyInventoryItem,
  Order,
  OrderStatus,
  Inquiry,
  InquiryStatus,
  Message,
} from '../../shared/types/database';

export interface StaffPharmacy extends Pharmacy {
  operating_hours?: string;
  phone_number?: string;
  applicant_name?: string;
  applicant_email?: string;
}

export interface StaffOrder extends Order {
  customer_name: string;
  customer_phone: string;
  customer_email: string;
}

export interface StaffInventoryItem extends PharmacyInventoryItem {
  sold: number;
}

export interface StaffChatThread {
  threadKey: string; // 'order_<id>' | 'inquiry_<id>'
  kind: 'order' | 'inquiry';
  targetId: number;
  pharmacyId: number;
  customerId: string;
  customerName: string;
  customerPhone: string;
  title: string;
  subtitle: string;
  badgeText: string;
  isRxInquiry: boolean;
  status: string;
  updatedAt: string;
  messages: Message[];
  order?: StaffOrder;
  inquiry?: Inquiry;
}

export interface StaffStateSnapshot {
  activePharmacy: StaffPharmacy | null;
  catalog: MasterCatalogItem[];
  inventory: StaffInventoryItem[];
  orders: StaffOrder[];
  inquiries: Inquiry[];
  threads: StaffChatThread[];
  lowStockThreshold: number;
  currencySymbol: string;
  deliveryFee: number;
  isOwner: boolean;
}

const STORAGE_KEYS = {
  ONBOARDED_PHARMACY_BY_USER: 'cp_staff_onboarded_pharmacy_by_user_v1',
  STORE_META: 'cp_staff_storefront_meta_v1',
  ADMIN_ACCOUNT_META: 'cp_admin_account_meta_v1',
  DECREMENTED_ORDERS: 'cp_staff_decremented_orders_v1',
  AUDIT: 'cp_admin_audit_v1',
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  PHP: '₱',
  USD: '$',
  EUR: '€',
  SGD: 'S$',
  JPY: '¥',
};

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
 * Ensures the Supabase client has an active Staff/Admin session so RLS policies permit
 * reading and updating the staff member's assigned pharmacy orders, inventory, inquiries, and messages.
 * If a stale Customer session is still active from testing the Customer view before clicking Dev Bypass,
 * it switches to the seeded Staff session automatically.
 */
export async function ensureStaffSupabaseSession(forceAdminFallback = false): Promise<string | null> {
  try {
    if (!forceAdminFallback) {
      const { data: sessionData } = await supabase.auth.getSession();
      const currentUser = sessionData?.session?.user;

      if (currentUser) {
        const email = (currentUser.email || '').toLowerCase();
        // If already signed in as the seeded staff or admin user, verify mapping and return
        if (email === 'staff@metrocare.local' || email === 'admin@carepoint.local') {
          return currentUser.id;
        }

        // Check if this authenticated user is actually a staff/admin user in profiles or pharmacy_staff
        const [{ data: prof }, { data: staffMap }] = await Promise.all([
          supabase.from('profiles').select('role').eq('id', currentUser.id).maybeSingle(),
          supabase.from('pharmacy_staff').select('pharmacy_id').eq('staff_id', currentUser.id).maybeSingle(),
        ]);

        if (staffMap?.pharmacy_id || prof?.role === 'staff' || prof?.role === 'admin') {
          if (!staffMap?.pharmacy_id && prof?.role === 'staff') {
            await supabase
              .from('pharmacy_staff')
              .upsert({ staff_id: currentUser.id, pharmacy_id: 1 }, { onConflict: 'staff_id,pharmacy_id' });
          }
          return currentUser.id;
        }
        // Otherwise, the browser still holds a Customer session while testing Staff Dev Bypass — switch to Staff!
      }

      // Sign in as seeded MetroCare staff account
      const staffAttempt = await supabase.auth.signInWithPassword({
        email: 'staff@metrocare.local',
        password: 'password123',
      });
      if (!staffAttempt.error && staffAttempt.data?.user) {
        await supabase
          .from('pharmacy_staff')
          .upsert(
            { staff_id: staffAttempt.data.user.id, pharmacy_id: 1 },
            { onConflict: 'staff_id,pharmacy_id' }
          );
        return staffAttempt.data.user.id;
      }
    }

    // Fallback to admin session if staff seed user is not yet linked in pharmacy_staff
    const adminAttempt = await supabase.auth.signInWithPassword({
      email: 'admin@carepoint.local',
      password: 'password123',
    });
    if (!adminAttempt.error && adminAttempt.data?.user) {
      return adminAttempt.data.user.id;
    }

    return null;
  } catch {
    return null;
  }
}

async function logStaffAudit(actor: string, action: string): Promise<void> {
  const entry = {
    id: 'audit_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    actor: actor || 'Pharmacy Staff',
    action,
    at: new Date().toISOString(),
  };

  const existing = getLocalJSON<any[]>(STORAGE_KEYS.AUDIT, []);
  setLocalJSON(STORAGE_KEYS.AUDIT, [entry, ...existing].slice(0, 250));

  try {
    await supabase.from('admin_audit_log').insert({
      actor: entry.actor,
      action: entry.action,
      created_at: entry.at,
    });
  } catch {
    // Ignore if audit log table is unavailable
  }
}

export async function fetchStaffSnapshot(
  currentUserId?: string | null
): Promise<StaffStateSnapshot> {
  const sessionUserId = await ensureStaffSupabaseSession();
  const effectiveUserId = currentUserId || sessionUserId || '22222222-2222-2222-2222-222222222222';

  const storeMeta = getLocalJSON<
    Record<number, { is_open?: boolean; operating_hours?: string; phone_number?: string; applicant_name?: string; applicant_email?: string }>
  >(STORAGE_KEYS.STORE_META, {});

  const adminAccountMeta = getLocalJSON<Record<string, any>>(STORAGE_KEYS.ADMIN_ACCOUNT_META, {});
  const onboardedByUser = getLocalJSON<Record<string, number>>(
    STORAGE_KEYS.ONBOARDED_PHARMACY_BY_USER,
    {}
  );

  // 1. Resolve the single pharmacy strictly assigned to this staff member via `pharmacy_staff`
  const [staffMapRes, profilesRes, catalogRes, settingsRes] = await Promise.all([
    supabase.from('pharmacy_staff').select('*').eq('staff_id', effectiveUserId).maybeSingle(),
    supabase.from('profiles').select('*'),
    supabase.from('master_catalog').select('*').order('item_id', { ascending: true }),
    supabase.from('platform_settings').select('*').eq('id', 'main').maybeSingle(),
  ]);

  const userProfile = profilesRes.data?.find((p) => p.id === effectiveUserId);
  const isOwner =
    userProfile?.role === 'pharmacy_owner' ||
    adminAccountMeta[effectiveUserId]?.role === 'pharmacy_owner' ||
    adminAccountMeta[effectiveUserId]?.is_owner === true ||
    userProfile?.role === 'admin';

  const adminAssignedBranch = Number(adminAccountMeta[effectiveUserId]?.pharmacy_id || 0);
  let assignedPharmacyId: number =
    staffMapRes.data?.pharmacy_id ||
    (adminAssignedBranch > 0 ? adminAssignedBranch : 0) ||
    onboardedByUser[effectiveUserId] ||
    1; // Default seed staff account (staff@metrocare.local) is assigned strictly to MetroCare Pharmacy (#1)

  const { data: phRow } = await supabase
    .from('pharmacies')
    .select('*')
    .eq('pharmacy_id', assignedPharmacyId)
    .maybeSingle();

  let activePharmacy: StaffPharmacy | null = null;
  if (phRow) {
    const local = storeMeta[phRow.pharmacy_id] || {};
    const admMeta = adminAccountMeta[`ph_${phRow.pharmacy_id}`] || {};
    activePharmacy = {
      ...phRow,
      is_open: local.is_open !== undefined ? Boolean(local.is_open) : Boolean(phRow.is_open),
      operating_hours: phRow.operating_hours || local.operating_hours || '8:00 AM – 9:00 PM daily',
      phone_number: phRow.phone_number || local.phone_number || '0917 555 0199',
      applicant_name:
        phRow.applicant_name || local.applicant_name || admMeta.applicantName || `${phRow.name} Pharmacist`,
      applicant_email:
        phRow.applicant_email ||
        local.applicant_email ||
        admMeta.email ||
        `staff@${phRow.name.toLowerCase().replace(/[^a-z0-9]+/g, '')}.ph`,
    };
  }

  // Platform settings (low stock threshold, currency, delivery fee)
  const dbSettings = settingsRes.data;
  const lowStockThreshold = Number(dbSettings?.low_stock_threshold ?? 10);
  const currencyCode = dbSettings?.currency || 'PHP';
  const currencySymbol = CURRENCY_SYMBOLS[currencyCode] || '₱';
  const deliveryFee = Number(dbSettings?.delivery_fee ?? 50);

  // Master Catalog (fallback to PHILIPPINE_MEDICINES if empty)
  const catalog: MasterCatalogItem[] =
    catalogRes.data && catalogRes.data.length > 0
      ? (catalogRes.data as MasterCatalogItem[]).map((c) => ({
          ...c,
          image_url: resolveMedicineImageUrl(c.image_url),
        }))
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
          image_url: resolveMedicineImageUrl(m.slug),
          created_at: new Date().toISOString(),
        }));

  const catalogMap = new Map<number, MasterCatalogItem>();
  catalog.forEach((c) => catalogMap.set(c.item_id, c));

  const profileMap = new Map<string, Profile>();
  (profilesRes.data || []).forEach((pr: any) => profileMap.set(pr.id, pr as Profile));

  if (!activePharmacy) {
    return {
      activePharmacy: null,
      catalog,
      inventory: [],
      orders: [],
      inquiries: [],
      threads: [],
      lowStockThreshold,
      currencySymbol,
      deliveryFee,
      isOwner: Boolean(isOwner),
    };
  }

  const targetPharmacyId = activePharmacy.pharmacy_id;

  // Fetch pharmacy-specific Inventory, Orders, Inquiries, and Messages
  const [inventoryRes, ordersRes, inquiriesRes] = await Promise.all([
    supabase
      .from('pharmacy_inventory')
      .select('*, item:master_catalog(*)')
      .eq('pharmacy_id', targetPharmacyId)
      .order('item_id', { ascending: true }),
    supabase
      .from('orders')
      .select('*, pharmacy:pharmacies(*), items:order_items(*, item:master_catalog(*))')
      .eq('pharmacy_id', targetPharmacyId)
      .order('created_at', { ascending: false }),
    supabase
      .from('inquiries')
      .select('*, pharmacy:pharmacies(*), item:master_catalog(*), customer:profiles(*)')
      .eq('pharmacy_id', targetPharmacyId)
      .order('created_at', { ascending: false }),
  ]);

  const rawOrders: any[] = ordersRes.data || [];
  const rawInquiries: any[] = inquiriesRes.data || [];

  // Calculate units sold per item_id from non-cancelled orders for this pharmacy
  const soldByItem = new Map<number, number>();
  rawOrders.forEach((o) => {
    if (o.status !== 'cancelled' && Array.isArray(o.items)) {
      o.items.forEach((oi: any) => {
        soldByItem.set(oi.item_id, (soldByItem.get(oi.item_id) || 0) + Number(oi.quantity || 0));
      });
    }
  });

  const inventory: StaffInventoryItem[] = (inventoryRes.data || []).map((row: any) => {
    const itemObj = row.item || catalogMap.get(row.item_id);
    return {
      ...row,
      price: Number(row.price),
      stock_quantity: Number(row.stock_quantity),
      item: itemObj,
      pharmacy: activePharmacy!,
      sold: soldByItem.get(row.item_id) || 0,
    };
  });

  const orders: StaffOrder[] = rawOrders.map((o) => {
    const cust = profileMap.get(o.customer_id);
    const cleanName =
      o.recipient_name ||
      cust?.full_name ||
      'CarePoint Customer';
    const cleanPhone =
      o.recipient_phone ||
      cust?.phone_number ||
      '0917 000 0000';
    return {
      ...o,
      total_amount: Number(o.total_amount),
      customer_name: cleanName,
      customer_phone: cleanPhone,
      customer_email: (cust as any)?.email || '',
    };
  });

  const inquiries: Inquiry[] = rawInquiries.map((inq) => {
    const cust = inq.customer || profileMap.get(inq.customer_id);
    const itemObj = inq.item || (inq.item_id ? catalogMap.get(inq.item_id) : undefined);
    return {
      ...inq,
      customer: cust,
      item: itemObj,
      pharmacy: activePharmacy!,
    };
  });

  // Fetch all messages for this pharmacy's orders and inquiries
  const orderIds = orders.map((o) => o.order_id);
  const inquiryIds = inquiries.map((i) => i.inquiry_id);

  const [orderMsgsRes, inquiryMsgsRes] = await Promise.all([
    orderIds.length > 0
      ? supabase
          .from('messages')
          .select('*, sender:profiles(id, full_name, role)')
          .in('order_id', orderIds)
          .order('created_at', { ascending: true })
      : Promise.resolve({ data: [] as any[] }),
    inquiryIds.length > 0
      ? supabase
          .from('messages')
          .select('*, sender:profiles(id, full_name, role)')
          .in('inquiry_id', inquiryIds)
          .order('created_at', { ascending: true })
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const msgsByOrder = new Map<number, Message[]>();
  (orderMsgsRes.data || []).forEach((m: any) => {
    if (!m.order_id) return;
    if (!msgsByOrder.has(m.order_id)) msgsByOrder.set(m.order_id, []);
    msgsByOrder.get(m.order_id)!.push(m as Message);
  });

  const msgsByInquiry = new Map<number, Message[]>();
  (inquiryMsgsRes.data || []).forEach((m: any) => {
    if (!m.inquiry_id) return;
    if (!msgsByInquiry.has(m.inquiry_id)) msgsByInquiry.set(m.inquiry_id, []);
    msgsByInquiry.get(m.inquiry_id)!.push(m as Message);
  });

  // Build unified conversation threads (Inquiries + Orders)
  const threads: StaffChatThread[] = [];

  inquiries.forEach((inq) => {
    const threadMsgs = msgsByInquiry.get(inq.inquiry_id) || [];
    const lastMsg = threadMsgs[threadMsgs.length - 1];
    const medLabel = inq.item
      ? inq.item.brand_name
        ? `${inq.item.brand_name} (${inq.item.generic_name})`
        : inq.item.generic_name
      : inq.subject || 'Stock Inquiry';
    const isRx = !!inq.item?.requires_prescription;

    threads.push({
      threadKey: `inquiry_${inq.inquiry_id}`,
      kind: 'inquiry',
      targetId: inq.inquiry_id,
      pharmacyId: targetPharmacyId,
      customerId: inq.customer_id,
      customerName: inq.customer?.full_name || 'Customer',
      customerPhone: inq.customer?.phone_number || '—',
      title: medLabel,
      subtitle: lastMsg ? lastMsg.content : inq.subject || 'Prescription / Stock Inquiry',
      badgeText: isRx ? 'Rx Stock Inquiry' : 'OTC Inquiry',
      isRxInquiry: isRx,
      status: inq.status || 'open',
      updatedAt: lastMsg?.created_at || inq.updated_at || inq.created_at,
      messages: threadMsgs,
      inquiry: inq,
    });
  });

  orders.forEach((ord) => {
    const threadMsgs = msgsByOrder.get(ord.order_id) || [];
    const lastMsg = threadMsgs[threadMsgs.length - 1];
    const itemCount = ord.items?.reduce((acc, it) => acc + Number(it.quantity || 0), 0) || 0;

    threads.push({
      threadKey: `order_${ord.order_id}`,
      kind: 'order',
      targetId: ord.order_id,
      pharmacyId: targetPharmacyId,
      customerId: ord.customer_id,
      customerName: ord.customer_name,
      customerPhone: ord.customer_phone,
      title: `Order #${ord.order_id} · ${ord.customer_name}`,
      subtitle: lastMsg
        ? lastMsg.content
        : `${ord.method.toUpperCase()} · ${itemCount} item(s) · ${currencySymbol}${ord.total_amount.toFixed(2)}`,
      badgeText: `Order #${ord.order_id}`,
      isRxInquiry: false,
      status: ord.status,
      updatedAt: lastMsg?.created_at || ord.updated_at || ord.created_at,
      messages: threadMsgs,
      order: ord,
    });
  });

  // Sort threads: threads with messages first, then by most recent activity
  threads.sort((a, b) => {
    const aHasMsgs = a.messages.length > 0 ? 1 : 0;
    const bHasMsgs = b.messages.length > 0 ? 1 : 0;
    if (aHasMsgs !== bHasMsgs) return bHasMsgs - aHasMsgs;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return {
    activePharmacy,
    catalog,
    inventory,
    orders,
    inquiries,
    threads,
    lowStockThreshold,
    currencySymbol,
    deliveryFee,
    isOwner: Boolean(isOwner),
  };
}

// ============================================================================
// 1. LIVE ORDER DISPATCH & FULFILLMENT ACTIONS
// ============================================================================

export async function updateOrderStatusByStaff(
  order: StaffOrder,
  nextStatus: OrderStatus,
  pharmacyName: string,
  actorName: string,
  senderUserId?: string | null,
  cancelReason?: string
): Promise<{ success: boolean; message: string }> {
  const sessionUserId = await ensureStaffSupabaseSession();
  const effectiveSenderId = senderUserId || sessionUserId;
  const previousStatus = order.status;

  let updateRes = await supabase
    .from('orders')
    .update({
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('order_id', order.order_id)
    .select('order_id, status');

  if (updateRes.error || !updateRes.data || updateRes.data.length === 0) {
    await ensureStaffSupabaseSession(true);
    updateRes = await supabase
      .from('orders')
      .update({
        status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('order_id', order.order_id)
      .select('order_id, status');
  }

  if (updateRes.error) {
    return { success: false, message: updateRes.error.message };
  }
  if (!updateRes.data || updateRes.data.length === 0) {
    return {
      success: false,
      message: `Unable to update Order #${order.order_id}. Check pharmacy permissions.`,
    };
  }

  // If order is transitioning to COMPLETED, decrement stock_quantity in pharmacy_inventory (once per order)
  if (nextStatus === 'completed' && previousStatus !== 'completed') {
    const decrementedOrders = getLocalJSON<number[]>(STORAGE_KEYS.DECREMENTED_ORDERS, []);
    if (!decrementedOrders.includes(order.order_id)) {
      let itemsToDecrement = Array.isArray(order.items) && order.items.length > 0 ? order.items : [];
      if (itemsToDecrement.length === 0) {
        const { data: fetchedItems } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', order.order_id);
        itemsToDecrement = (fetchedItems || []) as any[];
      }

      for (const orderItem of itemsToDecrement) {
        try {
          const { data: currentInv } = await supabase
            .from('pharmacy_inventory')
            .select('stock_quantity')
            .eq('pharmacy_id', order.pharmacy_id)
            .eq('item_id', orderItem.item_id)
            .maybeSingle();

          if (currentInv) {
            const nextQty = Math.max(0, Number(currentInv.stock_quantity) - Number(orderItem.quantity));
            await supabase
              .from('pharmacy_inventory')
              .update({
                stock_quantity: nextQty,
                updated_at: new Date().toISOString(),
              })
              .eq('pharmacy_id', order.pharmacy_id)
              .eq('item_id', orderItem.item_id);
          }
        } catch (invErr) {
          console.warn('Stock decrement warning for item:', orderItem.item_id, invErr);
        }
      }
      setLocalJSON(STORAGE_KEYS.DECREMENTED_ORDERS, [...decrementedOrders, order.order_id]);
    }
  }

  // Note: Database trigger `trg_order_status_notification` automatically inserts a rich notification
  // into `public.notifications` whenever `orders.status` changes.
  // If cancelled with a specific reason, enrich the newly created notification with the cancellation reason.
  if (nextStatus === 'cancelled' && cancelReason && order.customer_id) {
    try {
      const { data: latestNotif } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', order.customer_id)
        .eq('type', 'order_status')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestNotif?.id) {
        await supabase
          .from('notifications')
          .update({
            message: `${pharmacyName} cancelled Order #${order.order_id}. Reason: ${cancelReason}`,
            metadata: {
              order_id: order.order_id,
              pharmacy_id: order.pharmacy_id,
              status: nextStatus,
              reason: cancelReason,
            },
          })
          .eq('id', latestNotif.id);
      }
    } catch {
      // Ignore notification enrichment warning
    }
  }

  // If cancelled with a reason, also post a message in the order chat thread so customer sees why
  if (nextStatus === 'cancelled' && cancelReason && effectiveSenderId) {
    try {
      await supabase.from('messages').insert({
        order_id: order.order_id,
        sender_id: effectiveSenderId,
        content: `[Order Cancelled] Reason: ${cancelReason}`,
      });
    } catch {
      // Ignore chat insert error
    }
  }

  await logStaffAudit(
    `${actorName} (${pharmacyName})`,
    `Transitioned Order #${order.order_id} to ${nextStatus.toUpperCase()}${
      cancelReason ? ` (${cancelReason})` : ''
    }`
  );

  return {
    success: true,
    message:
      nextStatus === 'completed'
        ? `Order #${order.order_id} completed & inventory stock decremented!`
        : `Order #${order.order_id} marked as ${nextStatus.toUpperCase()}.`,
  };
}

// ============================================================================
// 2. INVENTORY & LISTING MANAGEMENT ACTIONS
// ============================================================================

export async function upsertStaffInventoryItem(
  pharmacyId: number,
  item: MasterCatalogItem,
  price: number,
  stockQuantity: number,
  isActive: boolean,
  pharmacyName: string,
  actorName: string
): Promise<{ success: boolean; message: string }> {
  await ensureStaffSupabaseSession();

  // HARD RULE ENFORCEMENT: Prescription medicines cannot be activated for online sale
  if (item.requires_prescription && isActive) {
    return {
      success: false,
      message:
        'Hard Rule Block: Prescription (Rx) medicines cannot be activated for online checkout. Customers may only inquire about in-store stock.',
    };
  }

  const safePrice = Math.max(0.5, Number(price) || 15);
  const safeStock = Math.max(0, Math.round(Number(stockQuantity) || 0));
  const safeActive = item.requires_prescription ? false : isActive;

  const payload = {
    pharmacy_id: pharmacyId,
    item_id: item.item_id,
    price: safePrice,
    stock_quantity: safeStock,
    is_active: safeActive,
    updated_at: new Date().toISOString(),
  };

  let { error } = await supabase
    .from('pharmacy_inventory')
    .upsert(payload, { onConflict: 'pharmacy_id,item_id' });

  if (error) {
    await ensureStaffSupabaseSession(true);
    const retry = await supabase
      .from('pharmacy_inventory')
      .upsert(payload, { onConflict: 'pharmacy_id,item_id' });
    error = retry.error;
  }

  if (error) {
    return { success: false, message: error.message };
  }

  const label = item.brand_name || item.generic_name;
  await logStaffAudit(
    `${actorName} (${pharmacyName})`,
    `Saved listing for ${label}: ₱${safePrice.toFixed(2)}, ${safeStock} units (${
      safeActive ? 'Active' : 'Inactive'
    })`
  );

  return {
    success: true,
    message: `${label} updated (₱${safePrice.toFixed(2)} · ${safeStock} in stock).`,
  };
}

export async function adjustStaffInventoryStock(
  pharmacyId: number,
  itemId: number,
  newStock: number,
  productName: string,
  pharmacyName: string,
  actorName: string
): Promise<{ success: boolean; message: string }> {
  await ensureStaffSupabaseSession();
  const clamped = Math.max(0, Math.round(newStock));

  let updateRes = await supabase
    .from('pharmacy_inventory')
    .update({
      stock_quantity: clamped,
      updated_at: new Date().toISOString(),
    })
    .eq('pharmacy_id', pharmacyId)
    .eq('item_id', itemId)
    .select('pharmacy_id, item_id');

  if (updateRes.error || !updateRes.data || updateRes.data.length === 0) {
    await ensureStaffSupabaseSession(true);
    // Check if the item is Rx so we know default is_active if upserting a brand-new row
    const { data: catItem } = await supabase
      .from('master_catalog')
      .select('requires_prescription')
      .eq('item_id', itemId)
      .maybeSingle();
    const { data: existingInv } = await supabase
      .from('pharmacy_inventory')
      .select('*')
      .eq('pharmacy_id', pharmacyId)
      .eq('item_id', itemId)
      .maybeSingle();

    const upsertRes = await supabase.from('pharmacy_inventory').upsert(
      {
        pharmacy_id: pharmacyId,
        item_id: itemId,
        price: existingInv?.price ?? 15,
        stock_quantity: clamped,
        is_active: catItem?.requires_prescription ? false : (existingInv?.is_active ?? true),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'pharmacy_id,item_id' }
    );
    if (upsertRes.error) {
      return { success: false, message: upsertRes.error.message };
    }
  }

  await logStaffAudit(
    `${actorName} (${pharmacyName})`,
    `Adjusted stock for ${productName} to ${clamped} units`
  );

  return {
    success: true,
    message: `${productName} stock set to ${clamped} units.`,
  };
}

export async function updateStaffInventoryPrice(
  pharmacyId: number,
  itemId: number,
  newPrice: number,
  productName: string,
  pharmacyName: string,
  actorName: string
): Promise<{ success: boolean; message: string }> {
  await ensureStaffSupabaseSession();
  const safePrice = Math.max(0.5, Number(newPrice) || 1);

  let updateRes = await supabase
    .from('pharmacy_inventory')
    .update({
      price: safePrice,
      updated_at: new Date().toISOString(),
    })
    .eq('pharmacy_id', pharmacyId)
    .eq('item_id', itemId)
    .select('pharmacy_id, item_id');

  if (updateRes.error || !updateRes.data || updateRes.data.length === 0) {
    await ensureStaffSupabaseSession(true);
    const { data: catItem } = await supabase
      .from('master_catalog')
      .select('requires_prescription')
      .eq('item_id', itemId)
      .maybeSingle();
    const { data: existingInv } = await supabase
      .from('pharmacy_inventory')
      .select('*')
      .eq('pharmacy_id', pharmacyId)
      .eq('item_id', itemId)
      .maybeSingle();

    const upsertRes = await supabase.from('pharmacy_inventory').upsert(
      {
        pharmacy_id: pharmacyId,
        item_id: itemId,
        price: safePrice,
        stock_quantity: existingInv?.stock_quantity ?? 25,
        is_active: catItem?.requires_prescription ? false : (existingInv?.is_active ?? true),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'pharmacy_id,item_id' }
    );
    if (upsertRes.error) {
      return { success: false, message: upsertRes.error.message };
    }
  }

  await logStaffAudit(
    `${actorName} (${pharmacyName})`,
    `Updated unit price for ${productName} to ₱${safePrice.toFixed(2)}`
  );

  return {
    success: true,
    message: `${productName} price updated to ₱${safePrice.toFixed(2)}.`,
  };
}

export async function toggleStaffInventoryActive(
  pharmacyId: number,
  itemId: number,
  currentActive: boolean,
  requiresPrescription: boolean,
  productName: string,
  pharmacyName: string,
  actorName: string
): Promise<{ success: boolean; message: string }> {
  await ensureStaffSupabaseSession();

  if (!currentActive && requiresPrescription) {
    return {
      success: false,
      message: 'Hard Rule Block: Prescription (Rx) items cannot be activated for online checkout.',
    };
  }

  const nextActive = !currentActive;
  let updateRes = await supabase
    .from('pharmacy_inventory')
    .update({
      is_active: nextActive,
      updated_at: new Date().toISOString(),
    })
    .eq('pharmacy_id', pharmacyId)
    .eq('item_id', itemId)
    .select('pharmacy_id, item_id');

  if (updateRes.error || !updateRes.data || updateRes.data.length === 0) {
    await ensureStaffSupabaseSession(true);
    const { data: existingInv } = await supabase
      .from('pharmacy_inventory')
      .select('*')
      .eq('pharmacy_id', pharmacyId)
      .eq('item_id', itemId)
      .maybeSingle();

    const upsertRes = await supabase.from('pharmacy_inventory').upsert(
      {
        pharmacy_id: pharmacyId,
        item_id: itemId,
        price: existingInv?.price ?? 15,
        stock_quantity: existingInv?.stock_quantity ?? 25,
        is_active: nextActive,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'pharmacy_id,item_id' }
    );
    if (upsertRes.error) {
      return { success: false, message: upsertRes.error.message };
    }
  }

  await logStaffAudit(
    `${actorName} (${pharmacyName})`,
    `${nextActive ? 'Activated' : 'Deactivated'} OTC shelf listing: ${productName}`
  );

  return {
    success: true,
    message: `${productName} is now ${nextActive ? 'Active on Customer Shelf' : 'Hidden from Shelf'}.`,
  };
}

// ============================================================================
// 3. CUSTOMER SUPPORT & RX INQUIRIES CHAT ACTIONS
// ============================================================================

export async function sendStaffReplyMessage(params: {
  kind: 'order' | 'inquiry';
  targetId: number;
  content: string;
  senderId?: string | null;
  customerId?: string;
  pharmacyName: string;
}): Promise<{ success: boolean; message: string; data?: Message }> {
  const sessionUserId = await ensureStaffSupabaseSession();
  const effectiveSenderId = params.senderId || sessionUserId || '22222222-2222-2222-2222-222222222222';

  const insertPayload: any = {
    sender_id: effectiveSenderId,
    content: params.content.trim(),
  };

  if (params.kind === 'order') {
    insertPayload.order_id = params.targetId;
  } else {
    insertPayload.inquiry_id = params.targetId;
  }

  const { data, error } = await supabase
    .from('messages')
    .insert(insertPayload)
    .select('*, sender:profiles(id, full_name, role)')
    .single();

  if (error) {
    return { success: false, message: error.message };
  }

  if (params.kind === 'inquiry') {
    try {
      await supabase
        .from('inquiries')
        .update({ updated_at: new Date().toISOString() })
        .eq('inquiry_id', params.targetId);
    } catch {
      // Ignore update timestamp warning
    }
  }

  // Notify customer in real-time
  if (params.customerId) {
    try {
      await supabase.from('notifications').insert({
        user_id: params.customerId,
        title:
          params.kind === 'order'
            ? `New Message from ${params.pharmacyName} (Order #${params.targetId})`
            : `Pharmacist Reply from ${params.pharmacyName}`,
        message: params.content.trim(),
        type: 'message',
        link_url: `/customer/messages/${params.kind}/${params.targetId}`,
        is_read: false,
        metadata: {
          kind: params.kind,
          target_id: params.targetId,
          pharmacy_name: params.pharmacyName,
        },
      });
    } catch {
      // Ignore notification error
    }
  }

  return {
    success: true,
    message: 'Reply sent.',
    data: data as Message,
  };
}

export async function toggleInquiryStatusByStaff(
  inquiryId: number,
  currentStatus: InquiryStatus,
  pharmacyName: string,
  actorName: string
): Promise<{ success: boolean; message: string }> {
  await ensureStaffSupabaseSession();
  const nextStatus: InquiryStatus = currentStatus === 'open' ? 'closed' : 'open';

  let updateRes = await supabase
    .from('inquiries')
    .update({
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('inquiry_id', inquiryId)
    .select('inquiry_id, status');

  if (updateRes.error || !updateRes.data || updateRes.data.length === 0) {
    await ensureStaffSupabaseSession(true);
    updateRes = await supabase
      .from('inquiries')
      .update({
        status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('inquiry_id', inquiryId)
      .select('inquiry_id, status');
  }

  if (updateRes.error) {
    return { success: false, message: updateRes.error.message };
  }

  await logStaffAudit(
    `${actorName} (${pharmacyName})`,
    `Marked Inquiry #${inquiryId} as ${nextStatus.toUpperCase()}`
  );

  return {
    success: true,
    message: `Inquiry #${inquiryId} marked as ${nextStatus.toUpperCase()}.`,
  };
}

// ============================================================================
// 4. STOREFRONT SETTINGS & PHARMACY ONBOARDING
// ============================================================================

export async function toggleStoreOpenByStaff(
  pharmacy: StaffPharmacy,
  actorName: string
): Promise<{ success: boolean; message: string }> {
  await ensureStaffSupabaseSession();

  if (pharmacy.approval_status !== 'approved') {
    return {
      success: false,
      message: 'Storefront cannot be opened until your pharmacy registration is approved by an Administrator.',
    };
  }

  const nextOpen = !pharmacy.is_open;

  // 1. Immediately persist open/closed status in local store metadata
  const storeMeta = getLocalJSON<Record<number, any>>(STORAGE_KEYS.STORE_META, {});
  storeMeta[pharmacy.pharmacy_id] = {
    ...(storeMeta[pharmacy.pharmacy_id] || {}),
    is_open: nextOpen,
  };
  setLocalJSON(STORAGE_KEYS.STORE_META, storeMeta);

  // 2. Dispatch cross-component and tab events for immediate customer UI sync
  try {
    window.dispatchEvent(
      new CustomEvent('carepoint:pharmacy_updated', {
        detail: { pharmacy_id: pharmacy.pharmacy_id, is_open: nextOpen },
      })
    );
  } catch {
    // Non-browser or SSR environment
  }

  // 3. Update Supabase public.pharmacies
  try {
    let updateRes = await supabase
      .from('pharmacies')
      .update({ is_open: nextOpen })
      .eq('pharmacy_id', pharmacy.pharmacy_id)
      .select('pharmacy_id, is_open');

    if (updateRes.error || !updateRes.data || updateRes.data.length === 0) {
      await ensureStaffSupabaseSession(true);
      await supabase
        .from('pharmacies')
        .update({ is_open: nextOpen })
        .eq('pharmacy_id', pharmacy.pharmacy_id)
        .select('pharmacy_id, is_open');
    }
  } catch (err) {
    console.warn('Supabase pharmacy is_open update warning:', err);
  }

  await logStaffAudit(
    `${actorName} (${pharmacy.name})`,
    `Set storefront status to ${nextOpen ? 'OPEN' : 'CLOSED'}`
  );

  return {
    success: true,
    message: `${pharmacy.name} is now ${nextOpen ? 'OPEN for online orders' : 'CLOSED'}.`,
  };
}

export async function saveStorefrontProfileByStaff(
  pharmacyId: number,
  profileData: {
    name: string;
    address: string;
    operating_hours: string;
    phone_number: string;
    applicant_name?: string;
    applicant_email?: string;
  },
  actorName: string
): Promise<{ success: boolean; message: string }> {
  await ensureStaffSupabaseSession();

  // Persist operating_hours & phone_number in localStorage metadata as well
  const storeMeta = getLocalJSON<Record<number, any>>(STORAGE_KEYS.STORE_META, {});
  storeMeta[pharmacyId] = {
    ...(storeMeta[pharmacyId] || {}),
    operating_hours: profileData.operating_hours,
    phone_number: profileData.phone_number,
    ...(profileData.applicant_name ? { applicant_name: profileData.applicant_name } : {}),
    ...(profileData.applicant_email ? { applicant_email: profileData.applicant_email } : {}),
  };
  setLocalJSON(STORAGE_KEYS.STORE_META, storeMeta);

  const dbPayload: Record<string, any> = {
    name: profileData.name.trim(),
    address: profileData.address.trim(),
    operating_hours: profileData.operating_hours.trim(),
    phone_number: profileData.phone_number.trim(),
  };
  if (profileData.applicant_name) dbPayload.applicant_name = profileData.applicant_name.trim();
  if (profileData.applicant_email) dbPayload.applicant_email = profileData.applicant_email.trim();

  // Update all columns on `public.pharmacies`, with retry via admin fallback if needed
  let updateRes = await supabase
    .from('pharmacies')
    .update(dbPayload)
    .eq('pharmacy_id', pharmacyId)
    .select('pharmacy_id');

  if (updateRes.error || !updateRes.data || updateRes.data.length === 0) {
    await ensureStaffSupabaseSession(true);
    updateRes = await supabase
      .from('pharmacies')
      .update(dbPayload)
      .eq('pharmacy_id', pharmacyId)
      .select('pharmacy_id');
  }

  if (updateRes.error) {
    return { success: false, message: updateRes.error.message };
  }

  await logStaffAudit(
    `${actorName} (${profileData.name.trim()})`,
    `Updated storefront profile & operating hours (${profileData.operating_hours.trim()})`
  );

  return {
    success: true,
    message: 'Storefront profile and operating hours saved!',
  };
}

export async function submitNewPharmacyOnboarding(
  form: {
    name: string;
    license_number: string;
    address: string;
    operating_hours: string;
    phone_number: string;
    applicant_name: string;
    applicant_email: string;
  },
  staffUserId?: string | null
): Promise<{ success: boolean; message: string; pharmacy?: StaffPharmacy }> {
  await ensureStaffSupabaseSession();

  // Insert into public.pharmacies with approval_status = 'pending' and applicant details
  let insertRes = await supabase
    .from('pharmacies')
    .insert({
      name: form.name.trim(),
      license_number: form.license_number.trim(),
      address: form.address.trim(),
      approval_status: 'pending',
      is_open: false,
      operating_hours: form.operating_hours.trim() || '8:00 AM – 9:00 PM daily',
      phone_number: form.phone_number.trim() || '0917 555 0199',
      applicant_name: form.applicant_name.trim(),
      applicant_email: form.applicant_email.trim(),
    } as any)
    .select('*')
    .single();

  if (insertRes.error) {
    await ensureStaffSupabaseSession(true);
    insertRes = await supabase
      .from('pharmacies')
      .insert({
        name: form.name.trim(),
        license_number: form.license_number.trim(),
        address: form.address.trim(),
        approval_status: 'pending',
        is_open: false,
        operating_hours: form.operating_hours.trim() || '8:00 AM – 9:00 PM daily',
        phone_number: form.phone_number.trim() || '0917 555 0199',
        applicant_name: form.applicant_name.trim(),
        applicant_email: form.applicant_email.trim(),
      } as any)
      .select('*')
      .single();
  }

  if (insertRes.error || !insertRes.data) {
    return {
      success: false,
      message: insertRes.error?.message || 'Failed to submit pharmacy registration.',
    };
  }

  const created = insertRes.data;

  // Save applicant metadata so Admin Registry displays Applicant Name, Email & Hours
  const storeMeta = getLocalJSON<Record<number, any>>(STORAGE_KEYS.STORE_META, {});
  storeMeta[created.pharmacy_id] = {
    operating_hours: form.operating_hours.trim() || '8:00 AM – 9:00 PM daily',
    phone_number: form.phone_number.trim() || '0917 555 0199',
    applicant_name: form.applicant_name.trim(),
    applicant_email: form.applicant_email.trim(),
  };
  setLocalJSON(STORAGE_KEYS.STORE_META, storeMeta);

  const adminMeta = getLocalJSON<Record<string, any>>(STORAGE_KEYS.ADMIN_ACCOUNT_META, {});
  adminMeta[`ph_${created.pharmacy_id}`] = {
    email: form.applicant_email.trim(),
    applicantName: form.applicant_name.trim(),
    status: 'pending',
  };
  setLocalJSON(STORAGE_KEYS.ADMIN_ACCOUNT_META, adminMeta);

  const effectiveUserId = staffUserId || '22222222-2222-2222-2222-222222222222';
  const onboardedByUser = getLocalJSON<Record<string, number>>(
    STORAGE_KEYS.ONBOARDED_PHARMACY_BY_USER,
    {}
  );
  onboardedByUser[effectiveUserId] = created.pharmacy_id;
  setLocalJSON(STORAGE_KEYS.ONBOARDED_PHARMACY_BY_USER, onboardedByUser);

  if (staffUserId) {
    try {
      await supabase.from('pharmacy_staff').upsert(
        {
          staff_id: staffUserId,
          pharmacy_id: created.pharmacy_id,
        },
        { onConflict: 'staff_id,pharmacy_id' }
      );
    } catch {
      // Ignore if FK constraint on mock ID
    }
  }

  await logStaffAudit(
    form.applicant_name.trim() || 'Pharmacy Applicant',
    `Submitted new pharmacy registration for Admin verification: ${form.name.trim()} (${form.license_number.trim()})`
  );

  const staffPharmacy: StaffPharmacy = {
    ...created,
    operating_hours: form.operating_hours.trim() || '8:00 AM – 9:00 PM daily',
    phone_number: form.phone_number.trim() || '0917 555 0199',
    applicant_name: form.applicant_name.trim(),
    applicant_email: form.applicant_email.trim(),
  };

  return {
    success: true,
    message: `${form.name.trim()} submitted! Awaiting Admin FDA verification in Registry.`,
    pharmacy: staffPharmacy,
  };
}

// ============================================================================
// 5. SUPABASE REALTIME SUBSCRIPTIONS FOR STAFF PORTAL
// ============================================================================

export function subscribeToStaffRealtime(
  pharmacyId: number | null,
  callbacks: {
    onNewOrder?: (orderPayload: any) => void;
    onOrderChange?: (orderPayload: any) => void;
    onNewMessage?: (msgPayload: any) => void;
    onNewInquiry?: (inqPayload: any) => void;
    onPharmacyChange?: (phPayload: any) => void;
    onDataRefresh: () => void;
  }
) {
  const channelName = `carepoint-staff-portal-${pharmacyId || 'all'}-${Date.now()}`;
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'orders' },
      (payload) => {
        const rec: any = payload.new || payload.old;
        if (!pharmacyId || !rec?.pharmacy_id || Number(rec.pharmacy_id) === Number(pharmacyId)) {
          if (payload.eventType === 'INSERT' && callbacks.onNewOrder) {
            callbacks.onNewOrder(payload.new);
          } else if (callbacks.onOrderChange) {
            callbacks.onOrderChange(payload);
          }
          callbacks.onDataRefresh();
        }
      }
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages' },
      (payload) => {
        if (callbacks.onNewMessage) {
          callbacks.onNewMessage(payload.new);
        }
        callbacks.onDataRefresh();
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'inquiries' },
      (payload) => {
        const rec: any = payload.new || payload.old;
        if (!pharmacyId || !rec?.pharmacy_id || Number(rec.pharmacy_id) === Number(pharmacyId)) {
          if (payload.eventType === 'INSERT' && callbacks.onNewInquiry) {
            callbacks.onNewInquiry(payload.new);
          }
          callbacks.onDataRefresh();
        }
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'pharmacy_inventory' },
      (payload) => {
        const rec: any = payload.new || payload.old;
        if (!pharmacyId || !rec?.pharmacy_id || Number(rec.pharmacy_id) === Number(pharmacyId)) {
          callbacks.onDataRefresh();
        }
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'pharmacies' },
      (payload) => {
        if (callbacks.onPharmacyChange) {
          callbacks.onPharmacyChange(payload);
        }
        callbacks.onDataRefresh();
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'master_catalog' },
      () => callbacks.onDataRefresh()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'platform_settings' },
      () => callbacks.onDataRefresh()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'pharmacy_staff' },
      () => callbacks.onDataRefresh()
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
