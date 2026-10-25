import { supabase } from '../../shared/lib/supabase';
import type { CartItem, OrderStatus, DeliveryMethod, Order } from '../../shared/types/database';

export interface CheckoutOptions {
  method: DeliveryMethod;
  paymentMethod: 'cash' | 'mock_gcash' | 'mock_card';
  deliveryAddress?: string;
  deliveryLat?: number | null;
  deliveryLng?: number | null;
  deliveryNotes?: string | null;
  recipientName?: string | null;
  recipientPhone?: string | null;
}

export async function placeOrder(items: CartItem[], options: CheckoutOptions, customerId?: string): Promise<{ success: boolean; message: string }> {
  if (items.length === 0) {
    return { success: false, message: 'Cart is empty.' };
  }

  if (!customerId) {
    return { success: false, message: 'Please sign in to place an order.' };
  }

  // Hard Compliance Check 1: Structural Rx blocker on cart items
  const flaggedRx = items.find((i) => i.requiresPrescription);
  if (flaggedRx) {
    return {
      success: false,
      message: `Safety Block: "${flaggedRx.brandName || flaggedRx.genericName}" is a prescription item and cannot be ordered online. CarePoint strictly dispenses OTC items.`,
    };
  }

  // Hard Compliance Check 2: Verify against master_catalog to prevent manipulated payload attacks
  try {
    const itemIds = Array.from(new Set(items.map((i) => i.itemId)));
    const { data: catalogItems } = await supabase
      .from('master_catalog')
      .select('item_id, requires_prescription, brand_name, generic_name')
      .in('item_id', itemIds);

    if (catalogItems) {
      const rxCatalogItem = catalogItems.find((c: any) => c.requires_prescription === true);
      if (rxCatalogItem) {
        return {
          success: false,
          message: `Safety Block: "${rxCatalogItem.brand_name || rxCatalogItem.generic_name}" requires a doctor prescription and cannot be purchased online.`,
        };
      }
    }
  } catch (checkErr) {
    console.warn('Pre-checkout catalog verification warning:', checkErr);
  }

  // Group items by pharmacy
  const pharmacyGroups = items.reduce((groups, item) => {
    if (!groups[item.pharmacyId]) {
      groups[item.pharmacyId] = [];
    }
    groups[item.pharmacyId].push(item);
    return groups;
  }, {} as Record<number, CartItem[]>);

  try {
    // We will attempt to create an order for each pharmacy
    for (const pharmacyIdStr of Object.keys(pharmacyGroups)) {
      const pharmacyId = parseInt(pharmacyIdStr, 10);
      const groupItems = pharmacyGroups[pharmacyId];

      // Verification: Check if pharmacy is actively open
      const { data: pharmacyRow } = await supabase
        .from('pharmacies')
        .select('pharmacy_id, name, is_open, approval_status')
        .eq('pharmacy_id', pharmacyId)
        .maybeSingle();

      let isPharmacyOpen = pharmacyRow ? Boolean(pharmacyRow.is_open) : true;
      try {
        const rawMeta = localStorage.getItem('cp_staff_storefront_meta_v1');
        if (rawMeta) {
          const parsed = JSON.parse(rawMeta);
          if (parsed[pharmacyId]?.is_open !== undefined) {
            isPharmacyOpen = Boolean(parsed[pharmacyId].is_open);
          }
        }
      } catch {
        // ignore
      }

      const branchName = pharmacyRow?.name || groupItems[0]?.pharmacyName || 'Partner Pharmacy';

      if (!isPharmacyOpen) {
        return {
          success: false,
          message: `Cannot place order: "${branchName}" is currently CLOSED and not accepting orders. Please remove its items or check back later.`,
        };
      }

      // Pre-check pharmacy inventory for price integrity, active status, and stock availability
      const itemIds = groupItems.map((i) => i.itemId);
      const { data: invRows, error: invErr } = await supabase
        .from('pharmacy_inventory')
        .select(`
          item_id,
          price,
          stock_quantity,
          is_active,
          master_catalog:master_catalog(requires_prescription, brand_name, generic_name)
        `)
        .eq('pharmacy_id', pharmacyId)
        .in('item_id', itemIds);

      if (invErr) {
        console.warn('Inventory pre-order verification warning:', invErr);
      }

      const invMap = new Map<number, any>();
      if (invRows) {
        invRows.forEach((r: any) => invMap.set(r.item_id, r));
      }

      for (const item of groupItems) {
        const inv = invMap.get(item.itemId);
        if (inv) {
          if (!inv.is_active) {
            return {
              success: false,
              message: `"${item.brandName || item.genericName}" is no longer available at this branch.`,
            };
          }
          if (inv.master_catalog?.requires_prescription) {
            return {
              success: false,
              message: `Safety Block: "${item.brandName || item.genericName}" is a prescription item and cannot be ordered online.`,
            };
          }
          if (inv.stock_quantity < item.quantity) {
            return {
              success: false,
              message: `Insufficient stock for "${item.brandName || item.genericName}" (${inv.stock_quantity} available, ${item.quantity} requested).`,
            };
          }
        }
      }

      // Calculate total using authoritative live catalog price
      const subtotal = groupItems.reduce((acc, curr) => {
        const inv = invMap.get(curr.itemId);
        const unitPrice = inv && inv.price != null ? Number(inv.price) : curr.price;
        return acc + unitPrice * curr.quantity;
      }, 0);

      const deliveryFee = options.method === 'delivery' ? 50 : 0;
      const totalAmount = subtotal + deliveryFee;

      // 1. Insert Order
      const orderPayload: any = {
        customer_id: customerId,
        pharmacy_id: pharmacyId,
        status: 'pending' as OrderStatus,
        method: options.method,
        total_amount: totalAmount,
      };

      if (options.method === 'delivery' && options.deliveryAddress) {
        orderPayload.delivery_address = options.deliveryAddress;
        orderPayload.delivery_lat = options.deliveryLat ?? null;
        orderPayload.delivery_lng = options.deliveryLng ?? null;
        orderPayload.delivery_notes = options.deliveryNotes ?? null;
        orderPayload.recipient_name = options.recipientName ?? null;
        orderPayload.recipient_phone = options.recipientPhone ?? null;
      }

      let orderData: any = null;
      let orderError: any = null;

      const res = await supabase
        .from('orders')
        .insert(orderPayload)
        .select()
        .single();

      orderData = res.data;
      orderError = res.error;

      // Fallback if remote schema does not have the delivery columns yet
      if (orderError && (orderError.message?.includes('delivery_') || orderError.message?.includes('column'))) {
        console.warn('Orders table missing delivery columns, retrying basic insert:', orderError.message);
        const retryRes = await supabase
          .from('orders')
          .insert({
            customer_id: customerId,
            pharmacy_id: pharmacyId,
            status: 'pending' as OrderStatus,
            method: options.method,
            total_amount: totalAmount,
          })
          .select()
          .single();

        orderData = retryRes.data;
        orderError = retryRes.error;
      }

      if (orderError) {
        console.error('Error creating order in Supabase:', orderError);
        return { success: false, message: 'Database error: ' + orderError.message };
      }

      if (orderData) {
        // 2. Insert Order Items using verified unit price
        const orderItemsPayload = groupItems.map(item => {
          const inv = invMap.get(item.itemId);
          const unitPrice = inv && inv.price != null ? Number(inv.price) : item.price;
          return {
            order_id: orderData.order_id,
            item_id: item.itemId,
            quantity: item.quantity,
            unit_price: unitPrice,
          };
        });

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItemsPayload);

        if (itemsError) {
          console.error('Error creating order items:', itemsError);
          // Rollback: delete orphaned pending order so no zombie empty order remains
          try {
            await supabase.from('orders').delete().eq('order_id', orderData.order_id);
          } catch (cleanupErr) {
            console.error('Failed to cleanup orphaned order:', cleanupErr);
          }
          return { success: false, message: 'Failed to create order items: ' + (itemsError.message || 'Item validation failed') };
        }

        // Note: Database trigger `trg_order_created_notification` automatically creates the
        // customer notification when a row is inserted into `public.orders`.
      }
    }

    return {
      success: true,
      message: `Successfully placed ${Object.keys(pharmacyGroups).length > 1 ? 'orders' : 'order'}!`
    };

  } catch (err: any) {
    console.error('Unexpected error placing order:', err);
    return {
      success: false,
      message: err.message || 'An unexpected error occurred while placing your order.'
    };
  }
}


export async function getOrders(customerId: string): Promise<{ data: Order[] | null, error: any }> {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      pharmacy:pharmacies(*),
      items:order_items(
        *,
        item:master_catalog(*)
      )
    `)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  return { data: data as Order[] | null, error };
}

export async function getOrderDetails(orderId: number): Promise<{ data: Order | null, error: any }> {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      pharmacy:pharmacies(*),
      items:order_items(
        *,
        item:master_catalog(*)
      )
    `)
    .eq('order_id', orderId)
    .single();

  return { data: data as Order | null, error };
}

export function subscribeToOrder(orderId: number, callback: (payload: any) => void) {
  const channel = supabase
    .channel(`customer-order-detail-${orderId}-${Date.now()}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'orders', filter: `order_id=eq.${orderId}` },
      callback
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'pharmacies' },
      callback
    )
    .subscribe();

  return channel;
}

export function subscribeToCustomerOrders(customerId: string, onChange: () => void): () => void {
  const channel = supabase
    .channel(`customer-orders-list-${customerId}-${Date.now()}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'orders' },
      (payload) => {
        const rec: any = payload.new || payload.old;
        if (!rec?.customer_id || rec.customer_id === customerId) {
          onChange();
        }
      }
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'pharmacies' },
      () => onChange()
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function updateOrderStatus(
  orderId: number,
  status: OrderStatus,
  _customerId?: string
): Promise<{ success: boolean; error?: any }> {
  try {
    const { error } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('order_id', orderId);

    if (error) throw error;

    // Database trigger `trg_order_status_notification` automatically dispatches the notification.
    return { success: true };
  } catch (err: any) {
    console.error('Failed to update order status:', err);
    return { success: false, error: err };
  }
}

