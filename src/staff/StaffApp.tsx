import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  IonPage,
  IonContent,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonSplitPane,
  IonMenu,
  IonMenuToggle,
  IonList,
  IonListHeader,
  IonItem,
  IonLabel,
  IonIcon,
  IonModal,
  IonToast,
  IonSpinner,
  useIonRouter,
} from '@ionic/react';
import {
  receiptOutline,
  medkitOutline,
  chatbubblesOutline,
  storefrontOutline,
  barChartOutline,
  logOutOutline,
  refreshOutline,
  searchOutline,
  addOutline,
  closeOutline,
  checkmarkCircleOutline,
  timeOutline,
  bagCheckOutline,
  warningOutline,
  sendOutline,
  volumeHighOutline,
  volumeMuteOutline,
  downloadOutline,
  bicycleOutline,
  callOutline,
  locationOutline,
  informationCircleOutline,
  arrowBackOutline,
  chevronForwardOutline,
  lockClosedOutline,
  keyOutline,
  personOutline,
} from 'ionicons/icons';
import './staff.css';
import { useAuth } from '../shared/context/AuthContext';
import { resolveMedicineImageUrl } from '../shared/data/medicines';
import type { MasterCatalogItem, OrderStatus, InquiryStatus } from '../shared/types/database';
import {
  fetchStaffSnapshot,
  subscribeToStaffRealtime,
  updateOrderStatusByStaff,
  upsertStaffInventoryItem,
  adjustStaffInventoryStock,
  updateStaffInventoryPrice,
  toggleStaffInventoryActive,
  sendStaffReplyMessage,
  toggleInquiryStatusByStaff,
  toggleStoreOpenByStaff,
  saveStorefrontProfileByStaff,
  submitNewPharmacyOnboarding,
  type StaffStateSnapshot,
  type StaffOrder,
  type StaffInventoryItem,
} from './services/staffService';

type StaffTabKey = 'orders' | 'inventory' | 'messages' | 'storefront' | 'sales';

const ORDER_STATUS_META: Record<
  OrderStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  pending: {
    label: 'Pending',
    badgeClass: 'bg-amber-50 text-amber-800 border border-amber-200',
    dotClass: 'bg-amber-500',
  },
  confirmed: {
    label: 'Confirmed · Preparing',
    badgeClass: 'bg-sky-50 text-sky-800 border border-sky-200',
    dotClass: 'bg-sky-500',
  },
  ready: {
    label: 'Ready for Pickup / Delivery',
    badgeClass: 'bg-purple-50 text-purple-800 border border-purple-200',
    dotClass: 'bg-purple-500',
  },
  completed: {
    label: 'Completed',
    badgeClass: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
    dotClass: 'bg-emerald-500',
  },
  cancelled: {
    label: 'Cancelled',
    badgeClass: 'bg-rose-50 text-rose-800 border border-rose-200',
    dotClass: 'bg-rose-500',
  },
};

const ORDER_QUICK_REPLIES: { label: string; text: string }[] = [
  {
    label: '✓ Order Confirmed',
    text: 'Your order is confirmed and being prepared by our pharmacist.',
  },
  {
    label: '📦 Ready for Pickup',
    text: 'Your order is packed and ready for pickup at our counter!',
  },
  {
    label: '🛵 Out for Delivery',
    text: 'Your delivery order has been dispatched and is on the way.',
  },
  {
    label: '📍 Confirm Landmark',
    text: 'Could you please confirm your delivery landmark or contact number?',
  },
];

const INQUIRY_QUICK_REPLIES: { label: string; text: string }[] = [
  {
    label: '✓ In Stock (Bring Rx)',
    text: 'Yes, this item is currently in stock at our branch. Please bring a valid physical prescription to purchase in person.',
  },
  {
    label: '✓ OTC Available',
    text: 'Yes, this OTC medicine is available on our shelf and can be ordered online or in store.',
  },
  {
    label: '✕ Out of Stock',
    text: 'Sorry, this medication is currently out of stock at our branch. We expect a restock soon.',
  },
  {
    label: '🕒 Store Hours',
    text: 'Our pharmacy is open 8:00 AM – 9:00 PM daily. Feel free to visit us!',
  },
];

function isOrderWithinHours(createdIso: string, hours: number): boolean {
  const createdMs = new Date(createdIso).getTime();
  return (Date.now() - createdMs) / 36e5 <= hours;
}

function getInitials(name: string): string {
  const parts = (name || 'Staff').trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0] || 'ST').slice(0, 2).toUpperCase();
}

function playNotificationChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // A5
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch {
    // Ignore audio context restriction
  }
}

export const StaffApp: React.FC = () => {
  const { displayName, user, profile, logout, role } = useAuth();
  const router = useIonRouter();

  // Snapshot State
  const [data, setData] = useState<StaffStateSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [toast, setToast] = useState<{
    message: string;
    color: 'success' | 'danger' | 'warning' | 'primary';
  } | null>(null);

  // Role resolution: checks AuthContext role, profile role, or snapshot isOwner
  const isOwner =
    role === 'pharmacy_owner' ||
    profile?.role === 'pharmacy_owner' ||
    Boolean(data?.isOwner);
  const roleTitle = isOwner ? 'Pharmacy Owner' : 'Pharmacy Staff';
  const actorName = displayName && displayName !== 'Customer' ? displayName : roleTitle;
  const currentUserId = user?.id || profile?.id || null;

  // Navigation & UI state
  const [activeTab, setActiveTab] = useState<StaffTabKey>('orders');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // 1. Live Order Dispatch Filters & Modals
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | 'active' | OrderStatus>('all');
  const [orderMethodFilter, setOrderMethodFilter] = useState<'all' | 'pickup' | 'delivery'>('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [inspectingOrder, setInspectingOrder] = useState<StaffOrder | null>(null);
  const [cancellingOrder, setCancellingOrder] = useState<StaffOrder | null>(null);
  const [cancelReason, setCancelReason] = useState('Item out of stock / requested by customer');

  // 2. Inventory & Shelf Filters & Modals
  const [invSearch, setInvSearch] = useState('');
  const [invCategory, setInvCategory] = useState('All');
  const [invStatusFilter, setInvStatusFilter] = useState<'all' | 'active' | 'inactive' | 'low' | 'out'>('all');
  const [showAddListingModal, setShowAddListingModal] = useState(false);
  const [catalogPickerSearch, setCatalogPickerSearch] = useState('');
  const [selectedCatalogMed, setSelectedCatalogMed] = useState<MasterCatalogItem | null>(null);
  const [listingForm, setListingForm] = useState({ price: '15.00', stock: '50', isActive: true });
  const [editingPriceItem, setEditingPriceItem] = useState<StaffInventoryItem | null>(null);
  const [priceDraft, setPriceDraft] = useState('');

  // 3. Customer Support & Rx Inquiries Inbox State
  const [threadFilter, setThreadFilter] = useState<'all' | 'inquiry' | 'order'>('all');
  const [threadSearch, setThreadSearch] = useState('');
  const [activeThreadKey, setActiveThreadKey] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  // 4. Storefront & Onboarding State
  const [storeForm, setStoreForm] = useState({
    name: '',
    address: '',
    operating_hours: '8:00 AM – 9:00 PM daily',
    phone_number: '0917 555 0199',
  });
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [onboardingForm, setOnboardingForm] = useState(() => ({
    name: '',
    license_number: 'FDA-PH-00' + Math.floor(10 + Math.random() * 89),
    address: '',
    operating_hours: '8:00 AM – 9:00 PM daily',
    phone_number: '0917 555 0199',
    applicant_name: actorName,
    applicant_email: user?.email || 'pharmacist@carepoint.ph',
  }));

  // 5. Sales & Reports Filter State
  const [salesDateFilter, setSalesDateFilter] = useState<'all' | 'today' | '7d' | '30d'>('all');
  const [salesStatusFilter, setSalesStatusFilter] = useState<'all' | 'completed' | 'cancelled'>('all');

  const showToast = useCallback(
    (message: string, color: 'success' | 'danger' | 'warning' | 'primary' = 'success') => {
      setToast({ message, color });
    },
    []
  );

  const loadSnapshot = useCallback(
    async (silent = false) => {
      if (!silent) setIsRefreshing(true);
      try {
        const snap = await fetchStaffSnapshot(currentUserId);
        setData(snap);
        if (snap.activePharmacy) {
          setStoreForm({
            name: snap.activePharmacy.name || '',
            address: snap.activePharmacy.address || '',
            operating_hours: snap.activePharmacy.operating_hours || '8:00 AM – 9:00 PM daily',
            phone_number: snap.activePharmacy.phone_number || '0917 555 0199',
          });
        }
      } catch (err) {
        console.error('Error loading staff portal snapshot:', err);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [currentUserId]
  );

  useEffect(() => {
    loadSnapshot();
  }, [loadSnapshot]);

  // Subscribe to Supabase Realtime for orders, messages, inquiries, inventory & pharmacy approvals
  useEffect(() => {
    const activePhId = data?.activePharmacy?.pharmacy_id || null;
    const unsubscribe = subscribeToStaffRealtime(activePhId, {
      onNewOrder: (newOrd) => {
        if (soundEnabled) playNotificationChime();
        showToast(
          `New Incoming Order #${newOrd?.order_id || ''} (${(newOrd?.method || 'pickup').toUpperCase()})!`,
          'primary'
        );
      },
      onNewMessage: (newMsg) => {
        if (newMsg?.sender_id && newMsg.sender_id !== currentUserId) {
          if (soundEnabled) playNotificationChime();
          showToast('New customer message received!', 'primary');
        }
      },
      onNewInquiry: (newInq) => {
        if (soundEnabled) playNotificationChime();
        showToast(`New Customer Inquiry: ${newInq?.subject || 'Stock Question'}`, 'primary');
      },
      onPharmacyChange: (payload) => {
        const updated: any = payload.new;
        if (
          updated &&
          activePhId &&
          Number(updated.pharmacy_id) === Number(activePhId) &&
          updated.approval_status === 'approved' &&
          data?.activePharmacy?.approval_status === 'pending'
        ) {
          if (soundEnabled) playNotificationChime();
          showToast(`${updated.name} has been APPROVED by Admin and is now live!`, 'success');
        }
      },
      onDataRefresh: () => {
        loadSnapshot(true);
      },
    });

    return () => {
      unsubscribe();
    };
  }, [data?.activePharmacy?.pharmacy_id, data?.activePharmacy?.approval_status, soundEnabled, currentUserId, loadSnapshot, showToast]);

  // Keep inspectingOrder in sync when snapshot refreshes
  useEffect(() => {
    if (inspectingOrder && data?.orders) {
      const updated = data.orders.find((o) => o.order_id === inspectingOrder.order_id);
      if (updated) setInspectingOrder(updated);
    }
  }, [data?.orders, inspectingOrder]);

  // Resolve currently opened conversation thread (null when viewing the Inbox list)
  const threads = data?.threads;
  const activeThread = useMemo(() => {
    if (!threads || !activeThreadKey) return null;
    return threads.find((t) => t.threadKey === activeThreadKey) || null;
  }, [threads, activeThreadKey]);

  // Scroll chat to bottom when opening a thread or receiving new messages
  useEffect(() => {
    if (activeTab === 'messages' && activeThread && chatScrollRef.current) {
      setTimeout(() => {
        if (chatScrollRef.current) {
          chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
      }, 60);
    }
  }, [activeTab, activeThread, activeThread?.messages.length, activeThreadKey]);

  // ============================================================================
  // COMPUTED METRICS & BADGES
  // ============================================================================

  const activePharmacy = data?.activePharmacy || null;
  const currency = data?.currencySymbol || '₱';
  const lowStockThreshold = data?.lowStockThreshold ?? 10;

  const orderCounts = useMemo(() => {
    const orders = data?.orders || [];
    const pending = orders.filter((o) => o.status === 'pending').length;
    const confirmed = orders.filter((o) => o.status === 'confirmed').length;
    const ready = orders.filter((o) => o.status === 'ready').length;
    const completed = orders.filter((o) => o.status === 'completed').length;
    const cancelled = orders.filter((o) => o.status === 'cancelled').length;
    const activeTotal = pending + confirmed + ready;
    return { pending, confirmed, ready, completed, cancelled, activeTotal, total: orders.length };
  }, [data?.orders]);

  const inventoryCounts = useMemo(() => {
    const inv = data?.inventory || [];
    const active = inv.filter((i) => i.is_active && !i.item?.requires_prescription).length;
    const out = inv.filter((i) => i.stock_quantity === 0).length;
    const low = inv.filter((i) => i.stock_quantity > 0 && i.stock_quantity <= lowStockThreshold).length;
    return { total: inv.length, active, low, out, alertCount: low + out };
  }, [data?.inventory, lowStockThreshold]);

  const inboxCounts = useMemo(() => {
    const threads = data?.threads || [];
    const openInquiries = threads.filter((t) => t.kind === 'inquiry' && t.status === 'open').length;
    const withMessages = threads.filter((t) => t.messages.length > 0).length;
    return { total: threads.length, openInquiries, withMessages };
  }, [data?.threads]);

  const navTabs: {
    key: StaffTabKey;
    label: string;
    shortLabel: string;
    icon: string;
    badge?: number;
    badgeColor?: string;
  }[] = [
    {
      key: 'orders',
      label: 'Live Order Dispatch',
      shortLabel: 'Dispatch',
      icon: receiptOutline,
      badge: orderCounts.activeTotal,
      badgeColor: orderCounts.pending > 0 ? 'bg-amber-500 text-white' : 'bg-teal-600 text-white',
    },
    {
      key: 'inventory',
      label: 'Inventory & Shelf',
      shortLabel: 'Inventory',
      icon: medkitOutline,
      badge: inventoryCounts.alertCount,
      badgeColor: 'bg-rose-500 text-white',
    },
    {
      key: 'messages',
      label: 'Customer & Rx Inbox',
      shortLabel: 'Inbox',
      icon: chatbubblesOutline,
      badge: inboxCounts.openInquiries || inboxCounts.withMessages,
      badgeColor: 'bg-teal-600 text-white',
    },
    {
      key: 'storefront',
      label: 'Storefront & Setup',
      shortLabel: 'Storefront',
      icon: storefrontOutline,
      badge: activePharmacy && activePharmacy.approval_status !== 'approved' ? 1 : 0,
      badgeColor: 'bg-amber-500 text-white',
    },
    {
      key: 'sales',
      label: 'Sales & History',
      shortLabel: 'Sales',
      icon: barChartOutline,
    },
  ];

  // ============================================================================
  // ACTION HANDLERS
  // ============================================================================

  const handleOrderStatusTransition = async (
    order: StaffOrder,
    nextStatus: OrderStatus,
    reason?: string
  ) => {
    if (!activePharmacy) return;
    const res = await updateOrderStatusByStaff(
      order,
      nextStatus,
      activePharmacy.name,
      actorName,
      currentUserId,
      reason
    );
    showToast(res.message, res.success ? 'success' : 'danger');
    if (res.success) {
      await loadSnapshot(true);
    }
  };

  const handleConfirmCancelOrder = async () => {
    if (!cancellingOrder) return;
    await handleOrderStatusTransition(
      cancellingOrder,
      'cancelled',
      cancelReason.trim() || 'Cancelled by pharmacy staff'
    );
    setCancellingOrder(null);
    setCancelReason('Item out of stock / requested by customer');
  };

  const handleOpenChatForOrder = (order: StaffOrder) => {
    setInspectingOrder(null);
    setActiveThreadKey(`order_${order.order_id}`);
    setActiveTab('messages');
  };

  const handleStockStep = async (inv: StaffInventoryItem, deltaOrTarget: number, isAbsolute = false) => {
    if (!activePharmacy) return;
    const target = isAbsolute ? deltaOrTarget : Math.max(0, inv.stock_quantity + deltaOrTarget);
    const prodName = inv.item?.brand_name || inv.item?.generic_name || `Item #${inv.item_id}`;
    const res = await adjustStaffInventoryStock(
      activePharmacy.pharmacy_id,
      inv.item_id,
      target,
      prodName,
      activePharmacy.name,
      actorName
    );
    showToast(res.message, res.success ? 'success' : 'danger');
    if (res.success) await loadSnapshot(true);
  };

  const handlePromptCustomStock = async (inv: StaffInventoryItem) => {
    const prodName = inv.item?.brand_name || inv.item?.generic_name || `Item #${inv.item_id}`;
    const raw = window.prompt(`Enter new stock quantity for ${prodName}:`, String(inv.stock_quantity));
    if (raw === null) return;
    const parsed = parseInt(raw, 10);
    if (isNaN(parsed) || parsed < 0) {
      showToast('Please enter a valid non-negative whole number.', 'warning');
      return;
    }
    await handleStockStep(inv, parsed, true);
  };

  const handleSaveEditedPrice = async () => {
    if (!editingPriceItem || !activePharmacy) return;
    const parsed = parseFloat(priceDraft);
    if (isNaN(parsed) || parsed <= 0) {
      showToast('Enter a valid selling price greater than 0.', 'warning');
      return;
    }
    const prodName =
      editingPriceItem.item?.brand_name ||
      editingPriceItem.item?.generic_name ||
      `Item #${editingPriceItem.item_id}`;
    const res = await updateStaffInventoryPrice(
      activePharmacy.pharmacy_id,
      editingPriceItem.item_id,
      parsed,
      prodName,
      activePharmacy.name,
      actorName
    );
    showToast(res.message, res.success ? 'success' : 'danger');
    setEditingPriceItem(null);
    if (res.success) await loadSnapshot(true);
  };

  const handleToggleShelfActive = async (inv: StaffInventoryItem) => {
    if (!activePharmacy) return;
    const prodName = inv.item?.brand_name || inv.item?.generic_name || `Item #${inv.item_id}`;
    const isRx = !!inv.item?.requires_prescription;
    const res = await toggleStaffInventoryActive(
      activePharmacy.pharmacy_id,
      inv.item_id,
      inv.is_active,
      isRx,
      prodName,
      activePharmacy.name,
      actorName
    );
    showToast(res.message, res.success ? 'success' : 'warning');
    if (res.success) await loadSnapshot(true);
  };

  const handleOpenAddListingModal = (preselectMed?: MasterCatalogItem) => {
    const catalog = data?.catalog || [];
    const firstOtc = preselectMed || catalog.find((c) => !c.requires_prescription) || catalog[0] || null;
    setSelectedCatalogMed(firstOtc);
    const existing = data?.inventory.find((i) => i.item_id === firstOtc?.item_id);
    setListingForm({
      price: existing ? String(existing.price) : '15.00',
      stock: existing ? String(existing.stock_quantity) : '50',
      isActive: firstOtc?.requires_prescription ? false : existing ? existing.is_active : true,
    });
    setCatalogPickerSearch('');
    setShowAddListingModal(true);
  };

  const handleSaveCatalogListing = async () => {
    if (!activePharmacy || !selectedCatalogMed) return;
    const parsedPrice = parseFloat(listingForm.price);
    const parsedStock = parseInt(listingForm.stock, 10);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      showToast('Please enter a valid selling price.', 'warning');
      return;
    }
    if (isNaN(parsedStock) || parsedStock < 0) {
      showToast('Please enter a valid stock quantity.', 'warning');
      return;
    }

    const res = await upsertStaffInventoryItem(
      activePharmacy.pharmacy_id,
      selectedCatalogMed,
      parsedPrice,
      parsedStock,
      listingForm.isActive,
      activePharmacy.name,
      actorName
    );
    showToast(res.message, res.success ? 'success' : 'warning');
    if (res.success) {
      setShowAddListingModal(false);
      await loadSnapshot(true);
    }
  };

  const handleSendChatReply = async (customText?: string) => {
    const textToSend = (customText ?? replyText).trim();
    if (!textToSend || !activeThread || !activePharmacy) return;

    setIsSendingReply(true);
    if (!customText) setReplyText('');
    try {
      const res = await sendStaffReplyMessage({
        kind: activeThread.kind,
        targetId: activeThread.targetId,
        content: textToSend,
        senderId: currentUserId,
        customerId: activeThread.customerId,
        pharmacyName: activePharmacy.name,
      });
      if (!res.success) {
        showToast(res.message, 'danger');
        if (!customText) setReplyText(textToSend);
      } else {
        await loadSnapshot(true);
      }
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleToggleInquiryStatus = async () => {
    if (!activeThread || activeThread.kind !== 'inquiry' || !activePharmacy) return;
    const currentStatus = (activeThread.status as InquiryStatus) || 'open';
    const res = await toggleInquiryStatusByStaff(
      activeThread.targetId,
      currentStatus,
      activePharmacy.name,
      actorName
    );
    showToast(res.message, res.success ? 'success' : 'danger');
    if (res.success) await loadSnapshot(true);
  };

  const handleToggleStoreOpen = async () => {
    if (!activePharmacy) return;
    if (!isOwner) {
      showToast('Action restricted: Only the Pharmacy Owner can open or close the storefront.', 'warning');
      return;
    }
    const res = await toggleStoreOpenByStaff(activePharmacy, actorName);
    showToast(res.message, res.success ? 'success' : 'warning');
    if (res.success) await loadSnapshot(true);
  };

  const handleSaveStorefrontProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePharmacy) return;
    if (!isOwner) {
      showToast('Action restricted: Only the Pharmacy Owner can modify storefront settings.', 'warning');
      return;
    }
    if (!storeForm.name.trim() || !storeForm.address.trim()) {
      showToast('Pharmacy name and address are required.', 'warning');
      return;
    }
    const res = await saveStorefrontProfileByStaff(activePharmacy.pharmacy_id, storeForm, actorName);
    showToast(res.message, res.success ? 'success' : 'danger');
    if (res.success) await loadSnapshot(true);
  };

  const handleSubmitNewPharmacyOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) {
      showToast('Action restricted: Only Pharmacy Owners can register new pharmacy branches.', 'warning');
      return;
    }
    if (
      !onboardingForm.name.trim() ||
      !onboardingForm.license_number.trim() ||
      !onboardingForm.address.trim()
    ) {
      showToast('Please fill in Pharmacy Name, FDA License Number, and Store Address.', 'warning');
      return;
    }

    const res = await submitNewPharmacyOnboarding(onboardingForm, currentUserId);
    showToast(res.message, res.success ? 'success' : 'danger');
    if (res.success && res.pharmacy) {
      setShowOnboardingModal(false);
      await loadSnapshot(false);
      setActiveTab('storefront');
    }
  };

  const handleExportSalesCsv = (rows: StaffOrder[]) => {
    const headers = [
      'Order ID',
      'Date',
      'Customer Name',
      'Customer Phone',
      'Fulfillment Method',
      'Status',
      'Items Summary',
      'Total Amount (PHP)',
    ];
    const csvLines = [headers.join(',')];
    rows.forEach((o) => {
      const itemsSummary = (o.items || [])
        .map((i) => `${i.quantity}x ${i.item?.brand_name || i.item?.generic_name || 'Item'}`)
        .join('; ');
      const line = [
        o.order_id,
        `"${new Date(o.created_at).toLocaleString()}"`,
        `"${(o.customer_name || '').replace(/"/g, '""')}"`,
        `"${(o.customer_phone || '').replace(/"/g, '""')}"`,
        o.method,
        o.status,
        `"${itemsSummary.replace(/"/g, '""')}"`,
        o.total_amount.toFixed(2),
      ];
      csvLines.push(line.join(','));
    });

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `carepoint_sales_${(activePharmacy?.name || 'pharmacy')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Sales report CSV exported!', 'success');
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login', 'back', 'replace');
  };

  // ============================================================================
  // PENDING / REJECTED HOLDING BANNER (Phase 5.1)
  // ============================================================================

  const renderApprovalHoldingNotice = () => {
    if (!activePharmacy || activePharmacy.approval_status === 'approved') return null;
    const isPending = activePharmacy.approval_status === 'pending';

    return (
      <div
        className={`mb-6 rounded-2xl border p-5 shadow-xs ${
          isPending
            ? 'bg-amber-50/90 border-amber-300 text-amber-950'
            : 'bg-rose-50/90 border-rose-300 text-rose-950'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                isPending ? 'bg-amber-500 text-white' : 'bg-rose-600 text-white'
              }`}
            >
              <IonIcon icon={isPending ? timeOutline : warningOutline} className="text-2xl" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-mono uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full bg-white/80 border border-current/20">
                  {isPending ? 'Pending Admin Approval' : 'Registration Rejected / Suspended'}
                </span>
                <span className="text-xs font-mono opacity-80">
                  License: {activePharmacy.license_number}
                </span>
              </div>
              <h2 className="text-lg font-bold mt-1">
                {isPending
                  ? `${activePharmacy.name} is awaiting FDA License verification`
                  : `${activePharmacy.name} is currently inactive on the marketplace`}
              </h2>
              <p className="text-xs leading-relaxed opacity-90 mt-1 max-w-2xl">
                {isPending
                  ? 'Your pharmacy onboarding application has been queued in the CarePoint Admin Registry. Once an Administrator approves your registration, your digital storefront will automatically go live and sync via Supabase Realtime.'
                  : 'This pharmacy registration was rejected or suspended by the platform administrator. You can update your credentials in Storefront Settings or switch to an approved pharmacy branch above.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => loadSnapshot()}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs font-semibold"
            >
              <IonIcon icon={refreshOutline} /> Check Approval Status
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // MODULE 1: LIVE ORDER DISPATCH BOARD (Phase 5.3)
  // ============================================================================

  const renderOrdersDispatch = () => {
    const orders = data?.orders || [];
    const q = orderSearch.trim().toLowerCase();

    const filteredOrders = orders.filter((o) => {
      if (orderStatusFilter === 'active') {
        if (!['pending', 'confirmed', 'ready'].includes(o.status)) return false;
      } else if (orderStatusFilter !== 'all' && o.status !== orderStatusFilter) {
        return false;
      }

      if (orderMethodFilter !== 'all' && o.method !== orderMethodFilter) {
        return false;
      }

      if (q) {
        const idMatch = String(o.order_id).includes(q);
        const custMatch = (o.customer_name || '').toLowerCase().includes(q);
        const phoneMatch = (o.customer_phone || '').toLowerCase().includes(q);
        const itemMatch = (o.items || []).some(
          (it) =>
            (it.item?.brand_name || '').toLowerCase().includes(q) ||
            (it.item?.generic_name || '').toLowerCase().includes(q)
        );
        if (!idMatch && !custMatch && !phoneMatch && !itemMatch) return false;
      }
      return true;
    });

    return (
      <div className="space-y-6">
        {renderApprovalHoldingNotice()}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-widest text-teal-700 font-semibold">
              Fulfillment Queue · {activePharmacy?.name || 'Pharmacy'}
            </span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
              Live Order Dispatch Board
            </h1>
            <p className="text-sm text-slate-600">
              Incoming OTC orders stream in real time via Supabase Realtime. Transition statuses to update the customer's live tracker.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSoundEnabled((prev) => !prev)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border ${
                soundEnabled
                  ? 'bg-teal-50 text-teal-700 border-teal-200'
                  : 'bg-white text-slate-500 border-slate-200'
              }`}
            >
              <IonIcon icon={soundEnabled ? volumeHighOutline : volumeMuteOutline} className="text-sm" />
              {soundEnabled ? 'Audio Alerts On' : 'Muted'}
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div
            onClick={() => setOrderStatusFilter('pending')}
            className={`bg-white border rounded-2xl p-4 cursor-pointer transition-all ${
              orderCounts.pending > 0
                ? 'border-amber-400 shadow-[inset_3px_0_0_#f59e0b]'
                : 'border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
                New / Pending
              </span>
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            </div>
            <div className="text-2xl font-mono font-bold text-slate-900 mt-1">
              {orderCounts.pending}
            </div>
            <div className="text-[11px] text-amber-700 font-medium mt-0.5">
              Awaiting pharmacist acceptance
            </div>
          </div>

          <div
            onClick={() => setOrderStatusFilter('confirmed')}
            className="bg-white border border-slate-200 rounded-2xl p-4 cursor-pointer hover:border-sky-300 transition-all"
          >
            <div className="text-[10.5px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
              Confirmed (Preparing)
            </div>
            <div className="text-2xl font-mono font-bold text-sky-700 mt-1">
              {orderCounts.confirmed}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Being packed at counter</div>
          </div>

          <div
            onClick={() => setOrderStatusFilter('ready')}
            className="bg-white border border-slate-200 rounded-2xl p-4 cursor-pointer hover:border-purple-300 transition-all"
          >
            <div className="text-[10.5px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
              Ready (Pickup / Rider)
            </div>
            <div className="text-2xl font-mono font-bold text-purple-700 mt-1">
              {orderCounts.ready}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Ready for handover</div>
          </div>

          <div
            onClick={() => setOrderStatusFilter('completed')}
            className="bg-white border border-slate-200 rounded-2xl p-4 cursor-pointer hover:border-emerald-300 transition-all"
          >
            <div className="text-[10.5px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
              Completed Orders
            </div>
            <div className="text-2xl font-mono font-bold text-emerald-700 mt-1">
              {orderCounts.completed}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Stock automatically deducted</div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="ops-staff-seg">
            {(
              [
                { id: 'all', label: `All (${orderCounts.total})` },
                { id: 'active', label: `Active Queue (${orderCounts.activeTotal})` },
                { id: 'pending', label: `Pending (${orderCounts.pending})` },
                { id: 'confirmed', label: `Confirmed (${orderCounts.confirmed})` },
                { id: 'ready', label: `Ready (${orderCounts.ready})` },
                { id: 'completed', label: `Completed (${orderCounts.completed})` },
                { id: 'cancelled', label: `Cancelled (${orderCounts.cancelled})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setOrderStatusFilter(tab.id)}
                className={orderStatusFilter === tab.id ? 'ops-staff-seg-active' : ''}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={orderMethodFilter}
              onChange={(e) => setOrderMethodFilter(e.target.value as any)}
              className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white"
            >
              <option value="all">All Fulfillment</option>
              <option value="pickup">In-Store Pickup</option>
              <option value="delivery">Home Delivery</option>
            </select>

            <div className="relative flex-1 sm:w-64">
              <IonIcon
                icon={searchOutline}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"
              />
              <input
                type="text"
                placeholder="Search #ID, customer, medicine..."
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Orders Dispatch Table / Cards */}
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              Order Fulfillment Queue
              <span className="px-2 py-0.5 text-xs font-mono rounded-full bg-slate-200 text-slate-700">
                {filteredOrders.length}
              </span>
            </h2>
            <span className="text-xs font-mono text-slate-500">
              Newest orders at top · Realtime active
            </span>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="p-10 text-center">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto mb-3">
                <IonIcon icon={bagCheckOutline} className="text-2xl" />
              </div>
              <div className="text-sm font-bold text-slate-800">No orders match this filter</div>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                When a customer places an order at {activePharmacy?.name || 'your pharmacy'}, it will pop up here immediately with a live alert.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer & Contact</th>
                    <th>Fulfillment</th>
                    <th>Ordered OTC Items</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th className="text-right">Dispatch Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.map((ord) => {
                    const meta = ORDER_STATUS_META[ord.status] || ORDER_STATUS_META.pending;
                    return (
                      <tr key={ord.order_id} className="hover:bg-teal-50/20">
                        <td>
                          <div className="font-mono font-bold text-slate-900">
                            #{ord.order_id}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {new Date(ord.created_at).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </td>

                        <td>
                          <div className="font-semibold text-slate-900">{ord.customer_name}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <IonIcon icon={callOutline} className="text-slate-400 text-xs" />
                            {ord.customer_phone}
                          </div>
                        </td>

                        <td>
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${
                              ord.method === 'delivery'
                                ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                : 'bg-teal-50 text-teal-700 border border-teal-200'
                            }`}
                          >
                            <IonIcon
                              icon={ord.method === 'delivery' ? bicycleOutline : storefrontOutline}
                              className="text-xs"
                            />
                            {ord.method === 'delivery' ? 'Home Delivery' : 'In-Store Pickup'}
                          </span>
                          {ord.method === 'delivery' && ord.delivery_address && (
                            <div
                              title={ord.delivery_address}
                              className="text-[11px] text-slate-500 max-w-[200px] truncate mt-1"
                            >
                              {ord.delivery_address}
                            </div>
                          )}
                        </td>

                        <td>
                          <div className="space-y-0.5 max-w-xs">
                            {(ord.items || []).map((it) => (
                              <div key={it.order_item_id} className="text-xs text-slate-700">
                                <span className="font-bold text-teal-700">{it.quantity}×</span>{' '}
                                <span className="font-medium">
                                  {it.item?.brand_name || it.item?.generic_name || `Item #${it.item_id}`}
                                </span>
                              </div>
                            ))}
                            {(!ord.items || ord.items.length === 0) && (
                              <span className="text-xs text-slate-400">Standard OTC Basket</span>
                            )}
                          </div>
                        </td>

                        <td className="font-mono font-bold text-slate-900">
                          {currency}
                          {ord.total_amount.toFixed(2)}
                        </td>

                        <td>
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${meta.badgeClass}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${meta.dotClass}`} />
                            {meta.label}
                          </span>
                        </td>

                        <td className="text-right">
                          <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                            {ord.status === 'pending' && (
                              <button
                                type="button"
                                onClick={() => handleOrderStatusTransition(ord, 'confirmed')}
                                className="bg-teal-600 text-white text-xs font-semibold"
                              >
                                <IonIcon icon={checkmarkCircleOutline} /> Accept
                              </button>
                            )}

                            {ord.status === 'confirmed' && (
                              <button
                                type="button"
                                onClick={() => handleOrderStatusTransition(ord, 'ready')}
                                className="bg-sky-600 text-white text-xs font-semibold"
                              >
                                <IonIcon icon={bagCheckOutline} /> Mark Ready
                              </button>
                            )}

                            {ord.status === 'ready' && (
                              <button
                                type="button"
                                onClick={() => handleOrderStatusTransition(ord, 'completed')}
                                className="bg-emerald-600 text-white text-xs font-semibold"
                              >
                                <IonIcon icon={checkmarkCircleOutline} /> Complete
                              </button>
                            )}

                            {(ord.status === 'pending' || ord.status === 'confirmed') && (
                              <button
                                type="button"
                                onClick={() => {
                                  setCancellingOrder(ord);
                                  setCancelReason('Requested item out of stock');
                                }}
                                className="bg-rose-600 text-white text-xs font-semibold"
                              >
                                Cancel
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleOpenChatForOrder(ord)}
                              title="Message Customer"
                              className="bg-teal-50 text-teal-700 text-xs font-semibold"
                            >
                              <IonIcon icon={chatbubblesOutline} /> Chat
                            </button>

                            <button
                              type="button"
                              onClick={() => setInspectingOrder(ord)}
                              className="text-xs font-semibold"
                            >
                              Details
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    );
  };

  // ============================================================================
  // MODULE 2: INVENTORY & LISTING MANAGER (Phase 5.2)
  // ============================================================================

  const renderInventoryManager = () => {
    const inventory = data?.inventory || [];
    const categories = [
      'All',
      ...Array.from(new Set(inventory.map((i) => i.item?.category).filter(Boolean) as string[])),
    ];
    const q = invSearch.trim().toLowerCase();

    const filteredInv = inventory.filter((inv) => {
      if (invCategory !== 'All' && inv.item?.category !== invCategory) return false;
      if (invStatusFilter === 'active' && !inv.is_active) return false;
      if (invStatusFilter === 'inactive' && inv.is_active) return false;
      if (invStatusFilter === 'out' && inv.stock_quantity !== 0) return false;
      if (
        invStatusFilter === 'low' &&
        (inv.stock_quantity === 0 || inv.stock_quantity > lowStockThreshold)
      ) {
        return false;
      }
      if (q) {
        const brand = (inv.item?.brand_name || '').toLowerCase();
        const gen = (inv.item?.generic_name || '').toLowerCase();
        const cat = (inv.item?.category || '').toLowerCase();
        if (!brand.includes(q) && !gen.includes(q) && !cat.includes(q)) return false;
      }
      return true;
    });

    const lowOrOutItems = inventory.filter((i) => i.stock_quantity <= lowStockThreshold);

    return (
      <div className="space-y-6">
        {renderApprovalHoldingNotice()}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-widest text-teal-700 font-semibold">
              Store Shelf · {activePharmacy?.name || 'Pharmacy'}
            </span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
              Inventory & OTC Listing Manager
            </h1>
            <p className="text-sm text-slate-600">
              Manage your pharmacy's custom selling prices, live stock quantities, and OTC shelf availability.
            </p>
          </div>

          <button
            type="button"
            onClick={() => handleOpenAddListingModal()}
            className="bg-teal-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl"
          >
            <IonIcon icon={addOutline} className="text-base" />
            Add / Update Catalog Medicine
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="text-[10.5px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
              Total Shelf Listings
            </div>
            <div className="text-2xl font-mono font-bold text-slate-900 mt-1">
              {inventoryCounts.total}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Linked to Master Catalog</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="text-[10.5px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
              Active OTC on App
            </div>
            <div className="text-2xl font-mono font-bold text-emerald-700 mt-1">
              {inventoryCounts.active}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Orderable by customers</div>
          </div>

          <div
            onClick={() => setInvStatusFilter('low')}
            className={`bg-white border rounded-2xl p-4 cursor-pointer ${
              inventoryCounts.low > 0
                ? 'border-amber-400 shadow-[inset_3px_0_0_#f59e0b]'
                : 'border-slate-200'
            }`}
          >
            <div className="text-[10.5px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
              Low Stock (≤ {lowStockThreshold})
            </div>
            <div className="text-2xl font-mono font-bold text-amber-700 mt-1">
              {inventoryCounts.low}
            </div>
            <div className="text-[11px] text-amber-700 mt-0.5">Needs replenishment soon</div>
          </div>

          <div
            onClick={() => setInvStatusFilter('out')}
            className={`bg-white border rounded-2xl p-4 cursor-pointer ${
              inventoryCounts.out > 0
                ? 'border-rose-400 shadow-[inset_3px_0_0_#ef4444]'
                : 'border-slate-200'
            }`}
          >
            <div className="text-[10.5px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
              Out of Stock (0)
            </div>
            <div className="text-2xl font-mono font-bold text-rose-700 mt-1">
              {inventoryCounts.out}
            </div>
            <div className="text-[11px] text-rose-700 mt-0.5">Blocked from checkout</div>
          </div>
        </div>

        {/* Low Stock Quick-Replenish Banner */}
        {lowOrOutItems.length > 0 && (
          <section className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <IonIcon icon={warningOutline} className="text-amber-600 text-lg" />
                <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                  Low & Out-of-Stock Replenishment Alerts ({lowOrOutItems.length})
                </span>
              </div>
              <span className="text-xs text-amber-800">
                Threshold configured at {lowStockThreshold} units
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {lowOrOutItems.slice(0, 6).map((inv) => (
                <div
                  key={inv.item_id}
                  className="bg-white border border-amber-200/80 rounded-xl p-3 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 text-xs truncate">
                      {inv.item?.brand_name || inv.item?.generic_name}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      On hand:{' '}
                      <span
                        className={`font-mono font-bold ${
                          inv.stock_quantity === 0 ? 'text-rose-600' : 'text-amber-700'
                        }`}
                      >
                        {inv.stock_quantity} units
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleStockStep(inv, 25)}
                    className="bg-teal-600 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg shrink-0"
                  >
                    +25 Restock
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Filter Bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="ops-staff-seg">
            {(
              [
                { id: 'all', label: `All (${inventoryCounts.total})` },
                { id: 'active', label: `Active (${inventoryCounts.active})` },
                { id: 'inactive', label: 'Hidden / Rx' },
                { id: 'low', label: `Low Stock (${inventoryCounts.low})` },
                { id: 'out', label: `Out of Stock (${inventoryCounts.out})` },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setInvStatusFilter(f.id)}
                className={invStatusFilter === f.id ? 'ops-staff-seg-active' : ''}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={invCategory}
              onChange={(e) => setInvCategory(e.target.value)}
              className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === 'All' ? 'All Categories' : c}
                </option>
              ))}
            </select>

            <div className="relative flex-1 sm:w-64">
              <IonIcon
                icon={searchOutline}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"
              />
              <input
                type="text"
                placeholder="Search brand or generic..."
                value={invSearch}
                onChange={(e) => setInvSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Inventory Table */}
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              Pharmacy Shelf Inventory
              <span className="px-2 py-0.5 text-xs font-mono rounded-full bg-slate-200 text-slate-700">
                {filteredInv.length}
              </span>
            </h2>
            <span className="text-xs font-mono text-slate-500">
              OTC-only online checkout gatekeeper active
            </span>
          </div>

          {filteredInv.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-bold text-slate-800">No inventory items found</p>
              <p className="text-xs text-slate-500 mt-1">
                Click "Add / Update Catalog Medicine" above to list verified OTC medicines from the CarePoint Master Catalog.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr>
                    <th>Medicine</th>
                    <th>Category & Form</th>
                    <th>Classification</th>
                    <th>Selling Price</th>
                    <th>Stock on Hand</th>
                    <th>Units Sold</th>
                    <th>Shelf Status</th>
                    <th className="text-right">Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInv.map((inv) => {
                    const isRx = !!inv.item?.requires_prescription;
                    const isOut = inv.stock_quantity === 0;
                    const isLow = !isOut && inv.stock_quantity <= lowStockThreshold;
                    return (
                      <tr key={inv.item_id} className="hover:bg-teal-50/20">
                        <td>
                          <div className="flex items-center gap-2.5">
                            {inv.item?.image_url && (
                              <img
                                src={resolveMedicineImageUrl(inv.item.image_url)}
                                alt={inv.item.brand_name || inv.item.generic_name}
                                className="w-9 h-9 rounded-lg object-contain bg-slate-50 border border-slate-200 p-1 shrink-0"
                              />
                            )}
                            <div>
                              <div className="font-bold text-slate-900">
                                {inv.item?.brand_name || inv.item?.generic_name}
                              </div>
                              <div className="text-xs text-slate-500">
                                {inv.item?.generic_name}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="font-medium text-slate-800 text-xs">
                            {inv.item?.category}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {inv.item?.dosage_form}
                          </div>
                        </td>

                        <td>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              isRx
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-teal-50 text-teal-800 border border-teal-200'
                            }`}
                          >
                            {isRx ? 'Rx · In-Store Only' : 'OTC Approved'}
                          </span>
                        </td>

                        <td>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-slate-900">
                              {currency}
                              {inv.price.toFixed(2)}
                            </span>
                            {isOwner ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingPriceItem(inv);
                                  setPriceDraft(inv.price.toFixed(2));
                                }}
                                title="Edit Selling Price"
                                className="px-2 py-1 text-[11px] text-teal-700 bg-teal-50 hover:bg-teal-100 rounded cursor-pointer font-medium"
                              >
                                Edit
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-mono" title="Only Pharmacy Owner can edit selling price">
                                (Locked)
                              </span>
                            )}
                          </div>
                        </td>

                        <td>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`font-mono font-bold text-sm ${
                                isOut
                                  ? 'text-rose-600'
                                  : isLow
                                  ? 'text-amber-700'
                                  : 'text-slate-900'
                              }`}
                            >
                              {inv.stock_quantity}
                            </span>
                            {isOut && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                OUT
                              </span>
                            )}
                            {isLow && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                LOW
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="font-mono text-xs text-slate-600">{inv.sold || 0}</td>

                        <td>
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                              inv.is_active && !isRx
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {isRx
                              ? 'Blocked (Rx)'
                              : inv.is_active
                              ? 'Active on App'
                              : 'Hidden'}
                          </span>
                        </td>

                        <td className="text-right">
                          <div className="inline-flex flex-wrap items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleStockStep(inv, -1)}
                              disabled={inv.stock_quantity <= 0}
                              className="px-2 py-1 text-xs font-mono"
                            >
                              −1
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStockStep(inv, 1)}
                              className="px-2 py-1 text-xs font-mono"
                            >
                              +1
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStockStep(inv, 10)}
                              className="px-2 py-1 text-xs font-mono"
                            >
                              +10
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePromptCustomStock(inv)}
                              className="px-2 py-1 text-xs"
                            >
                              Set…
                            </button>
                            <button
                              type="button"
                              disabled={isRx}
                              onClick={() => handleToggleShelfActive(inv)}
                              title={
                                isRx
                                  ? 'Prescription medicines cannot be activated for online checkout'
                                  : 'Toggle online shelf visibility'
                              }
                              className={
                                inv.is_active && !isRx
                                  ? 'text-xs text-slate-700'
                                  : 'bg-teal-600 text-white text-xs'
                              }
                            >
                              {isRx ? 'Rx Locked' : inv.is_active ? 'Hide' : 'Activate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    );
  };

  // ============================================================================
  // MODULE 3: CUSTOMER SUPPORT & RX INQUIRIES INBOX (Phase 5.4)
  // ============================================================================

  const renderMessagesInbox = () => {
    const threads = data?.threads || [];
    const q = threadSearch.trim().toLowerCase();

    const filteredThreads = threads.filter((t) => {
      if (threadFilter !== 'all' && t.kind !== threadFilter) return false;
      if (q) {
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchCust = t.customerName.toLowerCase().includes(q);
        const matchSub = t.subtitle.toLowerCase().includes(q);
        if (!matchTitle && !matchCust && !matchSub) return false;
      }
      return true;
    });

    // Look up stock for Rx / OTC inquiry medicine if applicable
    const inquiredInventory =
      activeThread?.kind === 'inquiry' && activeThread.inquiry?.item_id
        ? data?.inventory.find((i) => i.item_id === activeThread.inquiry?.item_id)
        : null;

    // VIEW B: DEDICATED CHAT CONVERSATION SCREEN (when a thread item is clicked)
    if (activeThread) {
      const orderItemCount = (activeThread.order?.items || []).reduce(
        (sum, item) => sum + Number(item.quantity || 1),
        0
      );

      return (
        <div className="-mx-4 -my-4 md:mx-0 md:my-0">
          <div className="bg-white md:border md:border-slate-200 md:rounded-2xl md:shadow-xs flex flex-col overflow-hidden h-[calc(100vh-118px)] md:h-[calc(100vh-130px)]">
            {/* Spacious Chat Screen Top Bar */}
            <div className="px-3.5 py-3 border-b border-slate-200 bg-white flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => setActiveThreadKey(null)}
                  title="Back to Inbox"
                  className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 cursor-pointer"
                >
                  <IonIcon icon={arrowBackOutline} className="text-lg" />
                </button>

                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-900 text-[15px] leading-snug truncate">
                    {activeThread.customerName}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate mt-0.5">
                    <span className="font-semibold text-teal-700">
                      {activeThread.kind === 'order'
                        ? `Order #${activeThread.targetId}`
                        : activeThread.badgeText}
                    </span>
                    <span>·</span>
                    <span className="uppercase font-mono text-[10px] font-bold text-slate-600">
                      {activeThread.status}
                    </span>
                    {activeThread.customerPhone && (
                      <>
                        <span>·</span>
                        <span className="truncate">{activeThread.customerPhone}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {activeThread.kind === 'order' && activeThread.order && (
                  <button
                    type="button"
                    onClick={() => setInspectingOrder(activeThread.order!)}
                    className="bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1 cursor-pointer"
                  >
                    <IonIcon icon={receiptOutline} className="text-sm" />
                    <span>Details</span>
                  </button>
                )}

                {activeThread.kind === 'inquiry' && (
                  <button
                    type="button"
                    onClick={handleToggleInquiryStatus}
                    className={
                      activeThread.status === 'open'
                        ? 'bg-emerald-600 text-white text-xs font-semibold px-3 py-1.5 rounded-xl cursor-pointer'
                        : 'bg-slate-100 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-xl cursor-pointer'
                    }
                  >
                    {activeThread.status === 'open' ? 'Resolve' : 'Reopen'}
                  </button>
                )}
              </div>
            </div>

            {/* Context Sub-Banner (Clean Order Metadata OR FDA Rx Compliance Notice) */}
            {activeThread.kind === 'order' && activeThread.order ? (
              <div className="bg-slate-50 border-b border-slate-200/70 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200 font-mono font-bold uppercase text-[10px]">
                    {activeThread.order.method}
                  </span>
                  <span className="font-medium text-slate-700">
                    {orderItemCount || 1} item(s) · {currency}
                    {Number(activeThread.order.total_amount || 0).toFixed(2)}
                  </span>
                </div>
                {activeThread.order.delivery_address && (
                  <div className="text-[11px] text-slate-500 truncate max-w-xs sm:max-w-md">
                    <IonIcon icon={locationOutline} className="inline mr-1 text-teal-600" />
                    {activeThread.order.delivery_address}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-amber-50 border-b border-amber-200/70 px-4 py-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-amber-900 min-w-0">
                  <IonIcon
                    icon={informationCircleOutline}
                    className="text-amber-600 text-base shrink-0"
                  />
                  <span className="truncate">
                    <strong>Rx Compliance:</strong> In-store pickup with valid prescription only.
                  </span>
                </div>
                {inquiredInventory && (
                  <div className="shrink-0 bg-white border border-amber-200 rounded-lg px-2.5 py-1 text-[11px] font-mono">
                    Stock: <strong className="text-teal-700">{inquiredInventory.stock_quantity}</strong>
                  </div>
                )}
              </div>
            )}

            {/* Scrollable Messages Conversation Stream */}
            <div
              ref={chatScrollRef}
              className="flex-1 p-4 space-y-4 overflow-y-auto bg-slate-50"
            >
              {activeThread.messages.length === 0 ? (
                <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-center px-6">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mb-3">
                    <IonIcon icon={chatbubblesOutline} className="text-2xl" />
                  </div>
                  <div className="text-sm font-bold text-slate-800">
                    No messages yet
                  </div>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs">
                    Tap a quick reply chip below or type a message to contact {activeThread.customerName}.
                  </p>
                </div>
              ) : (
                activeThread.messages.map((msg) => {
                  const isStaffSender =
                    msg.sender_id === currentUserId ||
                    msg.sender?.role === 'staff' ||
                    msg.sender?.role === 'admin' ||
                    msg.sender_id === '22222222-2222-2222-2222-222222222222';
                  return (
                    <div
                      key={msg.message_id}
                      className={`flex flex-col ${
                        isStaffSender ? 'items-end' : 'items-start'
                      }`}
                    >
                      <span className="text-[10px] font-bold text-slate-400 mb-1 px-1">
                        {isStaffSender ? 'Staff' : activeThread.customerName}
                      </span>
                      <div
                        className={`max-w-[80%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed shadow-2xs ${
                          isStaffSender
                            ? 'bg-teal-600 text-white rounded-tr-xs'
                            : 'bg-white border border-slate-200/80 text-slate-800 rounded-tl-xs'
                        }`}
                      >
                        {msg.content}
                      </div>
                      <span className="text-[10px] font-medium text-slate-400 mt-1 px-1">
                        {new Date(msg.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Compact Quick Pharmacist Replies Chips + Sleek Rounded Input Bar */}
            <div className="bg-white border-t border-slate-200/80">
              <div className="px-3 pt-2.5 pb-1.5 flex gap-2 overflow-x-auto no-scrollbar">
                {(activeThread.kind === 'order'
                  ? ORDER_QUICK_REPLIES
                  : INQUIRY_QUICK_REPLIES
                ).map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    title={preset.text}
                    onClick={() => handleSendChatReply(preset.text)}
                    className="shrink-0 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 transition-colors text-slate-700 text-xs font-semibold px-3.5 py-1.5 rounded-full cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <div className="px-3 pb-3 pt-1">
                <div className="flex items-center gap-2 bg-slate-100 rounded-full pl-4 pr-1.5 py-1 border border-slate-200/70 focus-within:border-teal-500 focus-within:bg-white transition-colors">
                  <input
                    type="text"
                    placeholder="Type your message..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSendChatReply();
                      }
                    }}
                    className="flex-1 text-sm bg-transparent border-none outline-none py-1.5 text-slate-900 placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    disabled={isSendingReply || !replyText.trim()}
                    onClick={() => handleSendChatReply()}
                    aria-label="Send message"
                    className="w-9 h-9 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0 disabled:opacity-40 cursor-pointer"
                  >
                    <IonIcon icon={sendOutline} className="text-base" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // VIEW A: DEFAULT INBOX THREAD LIST (Click any conversation to open the Chat Screen)
    return (
      <div className="space-y-5">
        {renderApprovalHoldingNotice()}

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-widest text-teal-700 font-semibold">
              Pharmacist Desk · {activePharmacy?.name || 'Pharmacy'}
            </span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
              Customer Support & Rx Inquiries Inbox
            </h1>
            <p className="text-sm text-slate-600">
              Tap any order or prescription inquiry below to open the real-time conversation screen.
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl flex flex-col overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-slate-100 space-y-3 bg-slate-50/50">
            <div className="ops-staff-seg w-full">
              {(
                [
                  { id: 'all', label: `All (${threads.length})` },
                  {
                    id: 'inquiry',
                    label: `Rx / Inquiries (${threads.filter((t) => t.kind === 'inquiry').length})`,
                  },
                  {
                    id: 'order',
                    label: `Orders (${threads.filter((t) => t.kind === 'order').length})`,
                  },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setThreadFilter(tab.id)}
                  className={`flex-1 ${threadFilter === tab.id ? 'ops-staff-seg-active' : ''}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <IonIcon
                icon={searchOutline}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm"
              />
              <input
                type="text"
                placeholder="Search customer, order #, or medicine..."
                value={threadSearch}
                onChange={(e) => setThreadSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-xs border border-slate-200 rounded-xl bg-white"
              />
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredThreads.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs">
                No conversation threads found.
              </div>
            ) : (
              filteredThreads.map((t) => {
                const lastMessage =
                  t.messages.length > 0 ? t.messages[t.messages.length - 1] : null;
                return (
                  <div
                    key={t.threadKey}
                    onClick={() => setActiveThreadKey(t.threadKey)}
                    className="p-4 hover:bg-teal-50/40 active:bg-teal-50/70 cursor-pointer transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            t.kind === 'inquiry'
                              ? t.isRxInquiry
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-teal-100 text-teal-800'
                              : 'bg-sky-100 text-sky-800'
                          }`}
                        >
                          {t.badgeText}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {new Date(t.updatedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <div className="font-bold text-slate-900 text-sm sm:text-base truncate">
                        {t.title}
                      </div>
                      <div className="text-xs text-slate-600 font-medium truncate">
                        Customer: {t.customerName}
                      </div>
                      <div className="text-xs text-slate-500 truncate mt-0.5">
                        {lastMessage ? (
                          <span className="text-slate-700 font-medium">
                            &ldquo;{lastMessage.content}&rdquo;
                          </span>
                        ) : (
                          t.subtitle
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-2.5">
                        <span className="text-[10px] font-mono uppercase text-slate-400">
                          {t.messages.length} {t.messages.length === 1 ? 'message' : 'messages'}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                            t.status === 'open' || t.status === 'pending'
                              ? 'bg-amber-50 text-amber-700'
                              : t.status === 'completed' || t.status === 'closed'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {t.status}
                        </span>
                      </div>
                    </div>

                    <IonIcon
                      icon={chevronForwardOutline}
                      className="text-slate-400 text-lg shrink-0"
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // MODULE 4: STOREFRONT MANAGEMENT & ONBOARDING (Phase 5.1)
  // ============================================================================

  const renderStorefrontSettings = () => {
    return (
      <div className="space-y-6">
        {renderApprovalHoldingNotice()}

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-widest text-teal-700 font-semibold">
              Pharmacy Configuration
            </span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
              Storefront Settings & Onboarding
            </h1>
            <p className="text-sm text-slate-600">
              Manage your assigned branch operating hours, live open/closed availability, or submit a pharmacy registration.
            </p>
          </div>

          {isOwner && (
            <button
              type="button"
              onClick={() => setShowOnboardingModal(true)}
              className="bg-teal-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-1.5"
            >
              <IonIcon icon={addOutline} className="text-base" />
              Register New Pharmacy Application
            </button>
          )}
        </div>

        {activePharmacy && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Live Store Status Card */}
            <div className="lg:col-span-5 space-y-4">
              <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-teal-700 font-bold">
                      Assigned Storefront
                    </span>
                    <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                      {activePharmacy.name}
                    </h2>
                    <p className="text-xs font-mono text-slate-500 mt-0.5">
                      FDA Permit: {activePharmacy.license_number}
                    </p>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                      activePharmacy.approval_status === 'approved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : activePharmacy.approval_status === 'pending'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {activePharmacy.approval_status}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      Online Ordering Availability
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {activePharmacy.approval_status !== 'approved'
                        ? 'Locked until Admin approves your FDA registration'
                        : activePharmacy.is_open
                        ? 'Store is OPEN — customers can place pickup & delivery orders'
                        : 'Store is CLOSED — paused on Customer discovery'}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={!isOwner || activePharmacy.approval_status !== 'approved'}
                      onClick={handleToggleStoreOpen}
                      title={!isOwner ? 'Only Pharmacy Owner can toggle online store availability' : undefined}
                      className={
                        !isOwner
                          ? 'bg-slate-200 text-slate-500 text-xs font-semibold px-4 py-2 rounded-xl cursor-not-allowed border border-slate-300'
                          : activePharmacy.is_open
                          ? 'bg-emerald-600 text-white text-xs font-semibold px-4 py-2 rounded-xl cursor-pointer'
                          : 'bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-xl cursor-pointer'
                      }
                    >
                      {!isOwner
                        ? (activePharmacy.is_open ? 'OPEN · Locked' : 'CLOSED · Locked')
                        : (activePharmacy.is_open ? 'OPEN · Click to Close' : 'CLOSED · Click to Open')}
                    </button>
                    {!isOwner && (
                      <span className="text-[10px] text-amber-700 font-medium">Owner restricted</span>
                    )}
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Operating Hours:</span>
                    <span className="font-semibold text-slate-800">
                      {activePharmacy.operating_hours || '8:00 AM – 9:00 PM daily'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Branch Contact:</span>
                    <span className="font-semibold text-slate-800">
                      {activePharmacy.phone_number || '0917 555 0199'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Delivery Fee (Platform):</span>
                    <span className="font-mono font-semibold text-teal-700">
                      {currency}
                      {(data?.deliveryFee ?? 50).toFixed(2)}
                    </span>
                  </div>
                </div>
              </section>

              {/* Branch Assignment Summary */}
              <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Assigned Pharmacy Branch
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 text-[10px] font-mono font-bold">
                    Verified Branch
                  </span>
                </div>
                <div className="p-3 rounded-xl border border-teal-600 bg-teal-50/70 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 text-xs truncate">
                      {activePharmacy.name} (Branch #{activePharmacy.pharmacy_id})
                    </div>
                    <div className="text-[11px] text-slate-600 truncate">
                      {activePharmacy.license_number} · {activePharmacy.address}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-teal-600 text-white text-[10px] font-bold uppercase shrink-0">
                    Active
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Your account is authorized exclusively for{' '}
                  <strong className="text-slate-700">{activePharmacy.name}</strong>. Built-in CarePoint security protocols safeguard branch privacy, ensuring you only view and manage your pharmacy&apos;s orders, shelf inventory, and customer messages.
                </p>
              </section>
            </div>

            {/* Right Column: Edit Storefront Form */}
            <div className="lg:col-span-7">
              <section className="bg-white border border-slate-200 rounded-2xl p-6">
                <h2 className="text-base font-bold text-slate-900 mb-1">
                  Edit Pharmacy Profile & Operating Hours
                </h2>
                <p className="text-xs text-slate-500 mb-5">
                  Updates sync immediately to the Customer discovery view and Admin directory.
                </p>

                {!isOwner && (
                  <div className="mb-5 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-amber-900">
                    <IonIcon icon={lockClosedOutline} className="text-lg text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <div className="font-bold">Storefront Profile is Restricted to Pharmacy Owner</div>
                      <div className="text-amber-800 mt-0.5 leading-relaxed">
                        You are currently signed in as <strong>Pharmacy Staff</strong>. Only the assigned <strong>Pharmacy Owner</strong> can edit storefront details, operating hours, and pharmacist contact number.
                      </div>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSaveStorefrontProfile} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Pharmacy Business Name
                      </label>
                      <input
                        type="text"
                        value={storeForm.name}
                        disabled={!isOwner}
                        onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
                        className="w-full disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        FDA License / Permit Number (Verified)
                      </label>
                      <input
                        type="text"
                        value={activePharmacy.license_number}
                        disabled
                        className="w-full bg-slate-100 text-slate-500 font-mono cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Branch Street Address & City
                    </label>
                    <input
                      type="text"
                      value={storeForm.address}
                      disabled={!isOwner}
                      onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
                      className="w-full disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Operating Hours
                      </label>
                      <input
                        type="text"
                        value={storeForm.operating_hours}
                        disabled={!isOwner}
                        onChange={(e) =>
                          setStoreForm({ ...storeForm, operating_hours: e.target.value })
                        }
                        placeholder="e.g. 8:00 AM – 9:00 PM daily"
                        className="w-full disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                      />
                      {isOwner && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {[
                            '8:00 AM – 9:00 PM daily',
                            '7:00 AM – 10:00 PM daily',
                            'Open 24 Hours Daily',
                          ].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() =>
                                setStoreForm({ ...storeForm, operating_hours: preset })
                              }
                              className="text-[10px] px-2 py-1 rounded-md bg-slate-50 hover:bg-slate-100 text-slate-600 cursor-pointer"
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Pharmacist Contact Phone
                      </label>
                      <input
                        type="tel"
                        value={storeForm.phone_number}
                        disabled={!isOwner}
                        onChange={(e) =>
                          setStoreForm({ ...storeForm, phone_number: e.target.value })
                        }
                        placeholder="0917 555 0199"
                        className="w-full disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    {isOwner ? (
                      <button
                        type="submit"
                        className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold px-5 py-2.5 rounded-xl cursor-pointer"
                      >
                        Save Storefront Changes
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium italic">
                        <IonIcon icon={lockClosedOutline} className="text-sm" />
                        <span>Pharmacy Owner authorization required to modify storefront</span>
                      </div>
                    )}
                  </div>
                </form>
              </section>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============================================================================
  // MODULE 5: SALES REPORTS & ORDER HISTORY (Phase 5.5)
  // ============================================================================

  const salesReportData = useMemo(() => {
    const orders = data?.orders || [];

    const dateFilteredOrders = orders.filter((o) => {
      if (salesDateFilter === 'all') return true;
      if (salesDateFilter === 'today') return isOrderWithinHours(o.created_at, 24);
      if (salesDateFilter === '7d') return isOrderWithinHours(o.created_at, 24 * 7);
      if (salesDateFilter === '30d') return isOrderWithinHours(o.created_at, 24 * 30);
      return true;
    });

    const filteredHistory = dateFilteredOrders.filter((o) => {
      if (salesStatusFilter === 'all') return true;
      return o.status === salesStatusFilter;
    });

    const completedOrders = dateFilteredOrders.filter((o) => o.status === 'completed');
    const totalRevenue = completedOrders.reduce((acc, o) => acc + Number(o.total_amount || 0), 0);
    const avgOrderValue = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;
    const pickupCount = completedOrders.filter((o) => o.method === 'pickup').length;
    const deliveryCount = completedOrders.filter((o) => o.method === 'delivery').length;

    const topProducts = [...(data?.inventory || [])]
      .filter((i) => (i.sold || 0) > 0)
      .sort((a, b) => (b.sold || 0) - (a.sold || 0))
      .slice(0, 8);

    return {
      dateFilteredOrders,
      filteredHistory,
      completedOrders,
      totalRevenue,
      avgOrderValue,
      pickupCount,
      deliveryCount,
      topProducts,
    };
  }, [data?.orders, data?.inventory, salesDateFilter, salesStatusFilter]);

  const renderSalesAndHistory = () => {
    const {
      dateFilteredOrders,
      filteredHistory,
      completedOrders,
      totalRevenue,
      avgOrderValue,
      pickupCount,
      deliveryCount,
      topProducts,
    } = salesReportData;

    return (
      <div className="space-y-6">
        {renderApprovalHoldingNotice()}

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-widest text-teal-700 font-semibold">
              Pharmacy Analytics · {activePharmacy?.name || 'Pharmacy'}
            </span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
              Sales Reports & Order History
            </h1>
            <p className="text-sm text-slate-600">
              Track fulfilled OTC revenue, top-performing medicines, and exportable transaction history.
            </p>
          </div>

          <button
            type="button"
            onClick={() => handleExportSalesCsv(filteredHistory)}
            className="bg-teal-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl"
          >
            <IonIcon icon={downloadOutline} className="text-base" />
            Export Sales CSV
          </button>
        </div>

        {/* Period Filter */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-3.5">
          <div className="ops-staff-seg">
            {(
              [
                { id: 'all', label: 'All Time' },
                { id: 'today', label: 'Last 24 Hours' },
                { id: '7d', label: 'Last 7 Days' },
                { id: '30d', label: 'Last 30 Days' },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSalesDateFilter(p.id)}
                className={salesDateFilter === p.id ? 'ops-staff-seg-active' : ''}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="ops-staff-seg">
            {(
              [
                { id: 'all', label: 'All Statuses' },
                { id: 'completed', label: 'Completed Only' },
                { id: 'cancelled', label: 'Cancelled Only' },
              ] as const
            ).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSalesStatusFilter(s.id)}
                className={salesStatusFilter === s.id ? 'ops-staff-seg-active' : ''}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="text-[10.5px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
              Completed Revenue
            </div>
            <div className="text-2xl font-mono font-bold text-teal-700 mt-1">
              {currency}
              {totalRevenue.toFixed(2)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              From {completedOrders.length} completed orders
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="text-[10.5px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
              Average Basket Size
            </div>
            <div className="text-2xl font-mono font-bold text-slate-900 mt-1">
              {currency}
              {avgOrderValue.toFixed(2)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Per fulfilled OTC order</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="text-[10.5px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
              Fulfillment Split
            </div>
            <div className="text-lg font-mono font-bold text-slate-900 mt-1">
              {pickupCount} Pickup · {deliveryCount} Delivery
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Completed orders</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="text-[10.5px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
              Total Orders Logged
            </div>
            <div className="text-2xl font-mono font-bold text-slate-900 mt-1">
              {dateFilteredOrders.length}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {dateFilteredOrders.filter((o) => o.status === 'cancelled').length} cancelled
            </div>
          </div>
        </div>

        {/* Top-Selling OTC Products */}
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <h2 className="text-sm font-bold text-slate-900">Top-Selling OTC Medicines</h2>
            <span className="text-xs font-mono text-slate-500">Ranked by units sold</span>
          </div>
          {topProducts.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              No completed product sales recorded yet for this branch.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Medicine</th>
                    <th>Category</th>
                    <th>Unit Price</th>
                    <th>Units Sold</th>
                    <th>Estimated Gross</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {topProducts.map((item, index) => (
                    <tr key={item.item_id}>
                      <td className="font-mono font-bold text-teal-700">#{index + 1}</td>
                      <td>
                        <div className="font-bold text-slate-900">
                          {item.item?.brand_name || item.item?.generic_name}
                        </div>
                        <div className="text-xs text-slate-500">{item.item?.generic_name}</div>
                      </td>
                      <td className="text-xs text-slate-600">{item.item?.category}</td>
                      <td className="font-mono text-xs">
                        {currency}
                        {item.price.toFixed(2)}
                      </td>
                      <td className="font-mono font-bold text-slate-900">{item.sold} units</td>
                      <td className="font-mono font-bold text-emerald-700">
                        {currency}
                        {(item.sold * item.price).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Historical Orders Table */}
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <h2 className="text-sm font-bold text-slate-900">
              Order History ({filteredHistory.length})
            </h2>
            <span className="text-xs font-mono text-slate-500">Click Receipt to inspect items</span>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No orders match the selected date and status filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Date & Time</th>
                    <th>Customer</th>
                    <th>Method</th>
                    <th>Status</th>
                    <th>Total</th>
                    <th className="text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHistory.map((ord) => {
                    const meta = ORDER_STATUS_META[ord.status] || ORDER_STATUS_META.pending;
                    return (
                      <tr key={ord.order_id}>
                        <td className="font-mono font-bold text-slate-900">#{ord.order_id}</td>
                        <td className="text-xs text-slate-600">
                          {new Date(ord.created_at).toLocaleString([], {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </td>
                        <td>
                          <div className="font-semibold text-slate-900">{ord.customer_name}</div>
                          <div className="text-xs text-slate-500">{ord.customer_phone}</div>
                        </td>
                        <td className="uppercase text-xs font-bold text-teal-700">{ord.method}</td>
                        <td>
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${meta.badgeClass}`}
                          >
                            {meta.label}
                          </span>
                        </td>
                        <td className="font-mono font-bold text-slate-900">
                          {currency}
                          {ord.total_amount.toFixed(2)}
                        </td>
                        <td className="text-right">
                          <button
                            type="button"
                            onClick={() => setInspectingOrder(ord)}
                            className="text-xs font-semibold"
                          >
                            View Receipt
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    );
  };

  // ============================================================================
  // MAIN SHELL & MODALS
  // ============================================================================

  const activeTabLabel = navTabs.find((t) => t.key === activeTab)?.label || 'Pharmacy Portal';
  const catalogPickerFiltered = (data?.catalog || []).filter((c) => {
    const q = catalogPickerSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      (c.brand_name || '').toLowerCase().includes(q) ||
      (c.generic_name || '').toLowerCase().includes(q) ||
      (c.category || '').toLowerCase().includes(q)
    );
  });

  return (
    <IonSplitPane
      contentId="staff-main-content"
      when="md"
      style={
        {
          '--side-width': '255px',
          '--side-min-width': '240px',
          '--side-max-width': '265px',
          '--border': '1px solid #e2e8f0',
        } as React.CSSProperties
      }
    >
      {/* SIDEBAR MENU */}
      <IonMenu contentId="staff-main-content" type="overlay" className="border-r border-slate-200">
        <IonHeader className="ion-no-border">
          <IonToolbar
            className="px-4 py-3"
            style={{ '--background': '#ffffff' } as React.CSSProperties}
          >
            <div className="flex items-center gap-2.5">
              <img
                src="/final-logo.png"
                alt="CarePoint"
                className="w-9 h-9 object-contain shrink-0"
              />
              <div className="min-w-0">
                <div className="font-bold text-teal-700 text-lg tracking-tight leading-none">
                  CarePoint
                </div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mt-1">
                  Pharmacy Staff Portal
                </div>
              </div>
            </div>
          </IonToolbar>
        </IonHeader>

        <IonContent
          className="bg-white"
          scrollY={true}
          style={{ '--background': '#ffffff' } as React.CSSProperties}
        >
          <div className="flex flex-col justify-between min-h-full py-3 px-3">
            <div className="space-y-4">
              {/* Active Pharmacy Status Card in Sidebar */}
              {activePharmacy && (
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                      Active Branch
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        activePharmacy.approval_status === 'approved'
                          ? activePharmacy.is_open
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-700'
                          : activePharmacy.approval_status === 'pending'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {activePharmacy.approval_status === 'approved'
                        ? activePharmacy.is_open
                          ? 'Open'
                          : 'Closed'
                        : activePharmacy.approval_status}
                    </span>
                  </div>
                  <div className="font-bold text-slate-900 text-sm truncate">
                    {activePharmacy.name}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {activePharmacy.license_number}
                  </div>
                </div>
              )}

              {/* Navigation Links */}
              <IonList className="bg-transparent py-0 space-y-1">
                <IonListHeader className="px-2 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold min-h-0 mb-1">
                  Store Operations
                </IonListHeader>
                {navTabs.map((item) => {
                  const isActive = activeTab === item.key;
                  return (
                    <IonMenuToggle key={item.key} autoHide={false}>
                      <IonItem
                        button
                        detail={false}
                        lines="none"
                        onClick={() => {
                          setActiveThreadKey(null);
                          setActiveTab(item.key);
                        }}
                        className={`rounded-xl font-semibold text-xs transition-all ${
                          isActive
                            ? 'bg-teal-50 text-teal-700 font-bold'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                        style={
                          {
                            '--background': isActive ? '#f0fdfa' : 'transparent',
                            '--color': isActive ? '#0f766e' : '#475569',
                            '--border-radius': '0.75rem',
                            '--min-height': '42px',
                          } as React.CSSProperties
                        }
                      >
                        <IonIcon
                          icon={item.icon}
                          slot="start"
                          className={`text-lg mr-3 ${
                            isActive ? 'text-teal-600' : 'text-slate-400'
                          }`}
                        />
                        <IonLabel>{item.label}</IonLabel>
                        {!!item.badge && item.badge > 0 && (
                          <span
                            slot="end"
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                              item.badgeColor || 'bg-teal-600 text-white'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </IonItem>
                    </IonMenuToggle>
                  );
                })}
              </IonList>

              {isOwner && (
                <div className="pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowOnboardingModal(true)}
                    className="w-full py-2.5 px-3 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <IonIcon icon={addOutline} className="text-base" />
                    New Pharmacy Onboarding
                  </button>
                </div>
              )}
            </div>

            {/* Staff User Footer */}
            <div className="pt-4 border-t border-slate-200 mt-6 space-y-2">
              <div className="flex items-center gap-2.5 px-2 py-1.5">
                <div className={`w-8 h-8 rounded-full ${isOwner ? 'bg-amber-600' : 'bg-teal-600'} text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-2xs`}>
                  {getInitials(actorName)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-900 truncate">{actorName}</div>
                  <div className="text-[10px] font-mono text-slate-500 truncate flex items-center gap-1">
                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${isOwner ? 'bg-amber-500' : 'bg-teal-500'}`} />
                    <span className="font-semibold text-slate-600">{isOwner ? 'Pharmacy Owner' : 'Pharmacy Staff'}</span>
                  </div>
                </div>
              </div>

              <IonMenuToggle autoHide={false}>
                <IonItem
                  button
                  detail={false}
                  lines="none"
                  onClick={handleLogout}
                  className="rounded-xl text-rose-600 font-semibold text-xs"
                  style={
                    {
                      '--background': 'transparent',
                      '--color': '#e11d48',
                      '--border-radius': '0.75rem',
                      '--min-height': '40px',
                    } as React.CSSProperties
                  }
                >
                  <IonIcon icon={logOutOutline} slot="start" className="text-lg mr-3 text-rose-500" />
                  <IonLabel>Sign Out</IonLabel>
                </IonItem>
              </IonMenuToggle>
            </div>
          </div>
        </IonContent>
      </IonMenu>

      {/* MAIN PAGE CONTENT */}
      <IonPage id="staff-main-content">
        <IonHeader className="ion-no-border bg-white border-b border-slate-200 shadow-2xs z-30">
          <IonToolbar
            className="bg-white"
            style={{ '--background': '#ffffff', backgroundColor: '#ffffff' } as React.CSSProperties}
          >
            <div slot="start" className="flex items-center gap-1.5 sm:gap-2 pl-2">
              <IonButtons className="md:hidden">
                <IonMenuButton className="text-slate-900" />
              </IonButtons>
              <img
                src="/final-logo.png"
                alt="CarePoint Logo"
                className="h-7 w-7 sm:h-8 sm:w-8 object-contain shrink-0"
              />
              <span className="text-base sm:text-xl font-bold text-teal-700 tracking-tight hidden min-[400px]:inline">
                CarePoint
              </span>
              <span className="text-slate-300 hidden md:inline">/</span>
              <span className="text-sm font-semibold text-slate-700 truncate hidden md:inline">
                {activeTabLabel}
              </span>
            </div>

            <div slot="end" className="flex items-center gap-1.5 sm:gap-2 pr-2">
              {/* Assigned Pharmacy Branch Pill (Read-Only) */}
              {activePharmacy && (
                <div
                  title={`Assigned Branch: ${activePharmacy.name} (${activePharmacy.license_number})`}
                  className="inline-flex items-center gap-1 sm:gap-1.5 text-xs font-semibold border border-slate-200 rounded-xl px-2 sm:px-2.5 py-1 bg-slate-50 text-slate-800 shrink-0"
                >
                  <IonIcon icon={storefrontOutline} className="text-teal-600 shrink-0 hidden sm:inline" />
                  <span className="truncate max-w-[80px] min-[390px]:max-w-[120px] sm:max-w-[200px]">
                    {activePharmacy.name.replace(/\s*Pharmacy$/i, '')}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase shrink-0 ${
                      activePharmacy.approval_status === 'approved'
                        ? activePharmacy.is_open
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-700'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {activePharmacy.approval_status === 'approved'
                      ? activePharmacy.is_open
                        ? 'Open'
                        : 'Closed'
                      : activePharmacy.approval_status}
                  </span>
                </div>
              )}

              <span
                className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                  isOwner
                    ? 'bg-amber-50 text-amber-900 border-amber-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <IonIcon icon={isOwner ? keyOutline : personOutline} className="text-xs" />
                <span>{isOwner ? 'Pharmacy Owner' : 'Pharmacy Staff'}</span>
              </span>

              <span className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200 text-[11px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                Realtime
              </span>

              <button
                type="button"
                onClick={() => loadSnapshot()}
                title="Refresh from Supabase"
                className="p-1.5 sm:p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer flex items-center justify-center shrink-0 active:scale-95 transition-all"
              >
                <IonIcon
                  icon={refreshOutline}
                  className={`text-sm ${isRefreshing ? 'animate-spin' : ''}`}
                />
              </button>
            </div>
          </IonToolbar>
        </IonHeader>

        <IonContent style={{ '--background': '#F8FAFC' } as React.CSSProperties}>
          <div className="ops-staff-root min-h-full bg-slate-50 text-slate-900 pb-24 md:pb-10">
            <main className="w-full max-w-7xl mx-auto p-4 md:p-6">
              {isLoading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-600">
                  <IonSpinner name="crescent" color="primary" />
                  <span className="text-xs font-medium text-slate-500">
                    Syncing CarePoint Pharmacy Staff Portal with Supabase...
                  </span>
                </div>
              ) : (
                <>
                  {activeTab === 'orders' && renderOrdersDispatch()}
                  {activeTab === 'inventory' && renderInventoryManager()}
                  {activeTab === 'messages' && renderMessagesInbox()}
                  {activeTab === 'storefront' && renderStorefrontSettings()}
                  {activeTab === 'sales' && renderSalesAndHistory()}
                </>
              )}
            </main>

            {/* MOBILE BOTTOM TAB BAR */}
            <nav
              aria-label="Staff Sections"
              className="ops-staff-bottom-nav md:hidden fixed bottom-0 left-0 right-0 z-40 flex bg-white border-t border-slate-200 shadow-sm px-1 py-1"
            >
              {navTabs.map((t) => {
                const isActive = activeTab === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => {
                      setActiveThreadKey(null);
                      setActiveTab(t.key);
                    }}
                    className={`flex-1 flex flex-col items-center justify-center py-1 text-[10px] font-semibold ${
                      isActive ? 'ops-staff-bottom-active text-teal-600' : 'text-slate-400'
                    }`}
                  >
                    <span
                      className={`relative px-2.5 py-0.5 rounded-full ${
                        isActive ? 'bg-teal-50 text-teal-600' : ''
                      }`}
                    >
                      <IonIcon icon={t.icon} className="text-lg" />
                      {!!t.badge && t.badge > 0 && (
                        <span className="absolute top-0 right-1 w-2 h-2 rounded-full bg-rose-500" />
                      )}
                    </span>
                    <span className="mt-0.5 truncate">{t.shortLabel}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* ============================================================================
              MODALS
              ============================================================================ */}

          {/* 1. Order Detail & Dispatch Inspection Modal */}
          <IonModal isOpen={!!inspectingOrder} onDidDismiss={() => setInspectingOrder(null)}>
            <div className="ops-staff-modal p-6 bg-white text-slate-900 min-h-full flex flex-col justify-between max-w-xl mx-auto w-full overflow-y-auto">
              {inspectingOrder && (
                <>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-teal-700 font-bold">
                          Order Inspection · {activePharmacy?.name}
                        </span>
                        <h3 className="text-lg font-bold text-slate-900">
                          Order #{inspectingOrder.order_id}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setInspectingOrder(null)}
                        className="p-1 text-slate-400 hover:text-slate-700"
                      >
                        <IonIcon icon={closeOutline} className="text-xl" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-xs">
                      <div>
                        <div className="text-slate-400 font-mono uppercase text-[10px]">Customer</div>
                        <div className="font-bold text-slate-900 mt-0.5">
                          {inspectingOrder.customer_name}
                        </div>
                        <div className="text-slate-600">{inspectingOrder.customer_phone}</div>
                      </div>
                      <div>
                        <div className="text-slate-400 font-mono uppercase text-[10px]">
                          Fulfillment & Status
                        </div>
                        <div className="font-bold text-teal-700 uppercase mt-0.5">
                          {inspectingOrder.method}
                        </div>
                        <div className="font-semibold text-slate-800 capitalize">
                          Status: {inspectingOrder.status}
                        </div>
                      </div>
                    </div>

                    {inspectingOrder.method === 'delivery' && (
                      <div className="p-3.5 rounded-xl bg-sky-50/70 border border-sky-200 text-xs space-y-1">
                        <div className="font-bold text-sky-900 flex items-center gap-1.5">
                          <IonIcon icon={locationOutline} /> Delivery Destination
                        </div>
                        <div className="text-slate-800 font-medium">
                          {inspectingOrder.delivery_address || 'Customer Registered Address'}
                        </div>
                        {inspectingOrder.delivery_notes && (
                          <div className="text-slate-600 italic">
                            Note: {inspectingOrder.delivery_notes}
                          </div>
                        )}
                        {inspectingOrder.delivery_lat && inspectingOrder.delivery_lng && (
                          <div className="text-[11px] font-mono text-sky-700">
                            GPS: {Number(inspectingOrder.delivery_lat).toFixed(4)},{' '}
                            {Number(inspectingOrder.delivery_lng).toFixed(4)}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Itemized Breakdown */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700">
                        Ordered OTC Items
                      </div>
                      <div className="divide-y divide-slate-100">
                        {(inspectingOrder.items || []).map((it) => (
                          <div
                            key={it.order_item_id}
                            className="px-3.5 py-2.5 flex items-center justify-between text-xs"
                          >
                            <div>
                              <span className="font-bold text-slate-900">
                                {it.item?.brand_name || it.item?.generic_name || `Item #${it.item_id}`}
                              </span>
                              <span className="text-slate-500 ml-1.5">
                                ({it.quantity} × {currency}
                                {Number(it.unit_price).toFixed(2)})
                              </span>
                            </div>
                            <div className="font-mono font-bold text-slate-900">
                              {currency}
                              {(Number(it.quantity) * Number(it.unit_price)).toFixed(2)}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="px-3.5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-sm font-bold">
                        <span>Total Order Amount</span>
                        <span className="font-mono text-teal-700 text-base">
                          {currency}
                          {inspectingOrder.total_amount.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Status Transition Buttons */}
                    <div className="space-y-2 pt-2">
                      <div className="text-xs font-bold text-slate-700">
                        Update Fulfillment Status (Syncs Live to Customer)
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(['pending', 'confirmed', 'ready', 'completed'] as OrderStatus[]).map(
                          (st) => (
                            <button
                              key={st}
                              type="button"
                              disabled={inspectingOrder.status === st}
                              onClick={() => handleOrderStatusTransition(inspectingOrder, st)}
                              className={
                                inspectingOrder.status === st
                                  ? 'bg-teal-600 text-white text-xs font-semibold'
                                  : 'text-xs font-semibold capitalize'
                              }
                            >
                              {st === 'confirmed'
                                ? 'Accept (Confirmed)'
                                : st === 'ready'
                                ? 'Mark Ready'
                                : st === 'completed'
                                ? 'Complete & Deduct Stock'
                                : 'Pending'}
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-200 mt-6">
                    <button
                      type="button"
                      onClick={() => handleOpenChatForOrder(inspectingOrder)}
                      className="bg-teal-50 text-teal-700 text-xs font-semibold"
                    >
                      <IonIcon icon={chatbubblesOutline} /> Open Customer Chat
                    </button>
                    <button
                      type="button"
                      onClick={() => setInspectingOrder(null)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold"
                    >
                      Close
                    </button>
                  </div>
                </>
              )}
            </div>
          </IonModal>

          {/* 2. Cancel Order Confirmation Modal */}
          <IonModal isOpen={!!cancellingOrder} onDidDismiss={() => setCancellingOrder(null)}>
            <div className="ops-staff-modal p-6 bg-white text-slate-900 min-h-full flex flex-col justify-between max-w-md mx-auto w-full">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-rose-600 font-bold">
                      Cancel Order
                    </span>
                    <h3 className="text-lg font-bold text-slate-900">
                      Cancel Order #{cancellingOrder?.order_id}?
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCancellingOrder(null)}
                    className="p-1 text-slate-400 hover:text-slate-700"
                  >
                    <IonIcon icon={closeOutline} className="text-xl" />
                  </button>
                </div>

                <p className="text-xs text-slate-600">
                  Provide a brief reason for cancelling this order. The customer will receive a real-time notification and chat message.
                </p>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cancellation Reason
                  </label>
                  <textarea
                    rows={3}
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setCancellingOrder(null)}
                  className="text-xs font-semibold"
                >
                  Keep Order
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancelOrder}
                  className="bg-rose-600 text-white text-xs font-semibold"
                >
                  Confirm Cancellation
                </button>
              </div>
            </div>
          </IonModal>

          {/* 3. Edit Unit Price Modal */}
          <IonModal isOpen={!!editingPriceItem} onDidDismiss={() => setEditingPriceItem(null)}>
            <div className="ops-staff-modal p-6 bg-white text-slate-900 min-h-full flex flex-col justify-between max-w-md mx-auto w-full">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-teal-700 font-bold">
                      Custom Store Pricing
                    </span>
                    <h3 className="text-lg font-bold text-slate-900">
                      {editingPriceItem?.item?.brand_name || editingPriceItem?.item?.generic_name}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingPriceItem(null)}
                    className="p-1 text-slate-400 hover:text-slate-700"
                  >
                    <IonIcon icon={closeOutline} className="text-xl" />
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Unit Selling Price ({currency})
                  </label>
                  <input
                    type="number"
                    step="0.50"
                    min="0.50"
                    value={priceDraft}
                    onChange={(e) => setPriceDraft(e.target.value)}
                    className="w-full font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingPriceItem(null)}
                  className="text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditedPrice}
                  className="bg-teal-600 text-white text-xs font-semibold"
                >
                  Save Price
                </button>
              </div>
            </div>
          </IonModal>

          {/* 4. Add / Manage Catalog Medicine Listing Modal */}
          <IonModal
            isOpen={showAddListingModal}
            onDidDismiss={() => setShowAddListingModal(false)}
          >
            <div className="ops-staff-modal p-6 bg-white text-slate-900 min-h-full flex flex-col justify-between max-w-xl mx-auto w-full overflow-y-auto">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-teal-700 font-bold">
                      Master Catalog Lookup
                    </span>
                    <h3 className="text-lg font-bold text-slate-900">
                      Add or Configure Medicine Listing
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddListingModal(false)}
                    className="p-1 text-slate-400 hover:text-slate-700"
                  >
                    <IonIcon icon={closeOutline} className="text-xl" />
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    1. Search CarePoint Master Catalog
                  </label>
                  <input
                    type="text"
                    placeholder="Filter by brand, generic compound, or category..."
                    value={catalogPickerSearch}
                    onChange={(e) => setCatalogPickerSearch(e.target.value)}
                    className="w-full mb-2"
                  />

                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                    {catalogPickerFiltered.map((med) => {
                      const isChosen = selectedCatalogMed?.item_id === med.item_id;
                      const existingInv = data?.inventory.find((i) => i.item_id === med.item_id);
                      return (
                        <div
                          key={med.item_id}
                          onClick={() => {
                            setSelectedCatalogMed(med);
                            setListingForm({
                              price: existingInv ? String(existingInv.price) : '15.00',
                              stock: existingInv ? String(existingInv.stock_quantity) : '50',
                              isActive: med.requires_prescription
                                ? false
                                : existingInv
                                ? existingInv.is_active
                                : true,
                            });
                          }}
                          className={`p-2.5 flex items-center justify-between gap-2 cursor-pointer text-xs ${
                            isChosen ? 'bg-teal-50 font-semibold' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div>
                            <div className="font-bold text-slate-900">
                              {med.brand_name || med.generic_name}{' '}
                              <span className="font-normal text-slate-500">
                                ({med.generic_name})
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {med.category} · {med.dosage_form}
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                              med.requires_prescription
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-teal-100 text-teal-800'
                            }`}
                          >
                            {med.requires_prescription ? 'Rx Only' : 'OTC'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {selectedCatalogMed && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900 text-sm">
                          {selectedCatalogMed.brand_name || selectedCatalogMed.generic_name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {selectedCatalogMed.generic_name} · {selectedCatalogMed.dosage_form}
                        </div>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          selectedCatalogMed.requires_prescription
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-teal-100 text-teal-800'
                        }`}
                      >
                        {selectedCatalogMed.requires_prescription
                          ? 'Rx · In-Store Only'
                          : 'OTC · Online Orderable'}
                      </span>
                    </div>

                    {selectedCatalogMed.requires_prescription && (
                      <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
                        <strong>Hard Rule Enforcement:</strong> Because this is a Prescription (Rx) medication, it will be saved with <code>is_active = false</code> so it is structurally blocked from online checkout while allowing you to track branch stock for customer Rx inquiries.
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Selling Price ({currency})
                        </label>
                        <input
                          type="number"
                          step="0.50"
                          min="0.50"
                          value={listingForm.price}
                          onChange={(e) =>
                            setListingForm({ ...listingForm, price: e.target.value })
                          }
                          className="w-full font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Stock Quantity
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={listingForm.stock}
                          onChange={(e) =>
                            setListingForm({ ...listingForm, stock: e.target.value })
                          }
                          className="w-full font-mono"
                        />
                      </div>
                    </div>

                    {!selectedCatalogMed.requires_prescription && (
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          checked={listingForm.isActive}
                          onChange={(e) =>
                            setListingForm({ ...listingForm, isActive: e.target.checked })
                          }
                        />
                        <span>Activate listing on Customer App shelf immediately</span>
                      </label>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 mt-4">
                <button
                  type="button"
                  onClick={() => setShowAddListingModal(false)}
                  className="text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveCatalogListing}
                  className="bg-teal-600 text-white text-xs font-semibold"
                >
                  Save to Pharmacy Inventory
                </button>
              </div>
            </div>
          </IonModal>

          {/* 5. Pharmacy Staff Onboarding / New Branch Application Modal */}
          <IonModal
            isOpen={showOnboardingModal}
            onDidDismiss={() => setShowOnboardingModal(false)}
          >
            <div className="ops-staff-modal p-6 bg-white text-slate-900 min-h-full flex flex-col justify-between max-w-lg mx-auto w-full overflow-y-auto">
              <form onSubmit={handleSubmitNewPharmacyOnboarding} className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-teal-700 font-bold">
                      Partner Pharmacy Onboarding
                    </span>
                    <h3 className="text-lg font-bold text-slate-900">
                      Submit Pharmacy Registration
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowOnboardingModal(false)}
                    className="p-1 text-slate-400 hover:text-slate-700"
                  >
                    <IonIcon icon={closeOutline} className="text-xl" />
                  </button>
                </div>

                <p className="text-xs text-slate-600">
                  Register a new community pharmacy branch. Applications start in <strong>Pending Approval</strong> status and appear immediately in the Admin Console's <strong>Registry</strong> for FDA permit verification.
                </p>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pharmacy Business Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. St. Luke Community Pharmacy"
                    value={onboardingForm.name}
                    onChange={(e) =>
                      setOnboardingForm({ ...onboardingForm, name: e.target.value })
                    }
                    className="w-full"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      FDA License / Permit # *
                    </label>
                    <input
                      type="text"
                      value={onboardingForm.license_number}
                      onChange={(e) =>
                        setOnboardingForm({ ...onboardingForm, license_number: e.target.value })
                      }
                      className="w-full font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Branch Contact Number
                    </label>
                    <input
                      type="tel"
                      value={onboardingForm.phone_number}
                      onChange={(e) =>
                        setOnboardingForm({ ...onboardingForm, phone_number: e.target.value })
                      }
                      className="w-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Complete Store Address *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 88 Katipunan Ave., Quezon City"
                    value={onboardingForm.address}
                    onChange={(e) =>
                      setOnboardingForm({ ...onboardingForm, address: e.target.value })
                    }
                    className="w-full"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Operating Hours
                  </label>
                  <input
                    type="text"
                    value={onboardingForm.operating_hours}
                    onChange={(e) =>
                      setOnboardingForm({ ...onboardingForm, operating_hours: e.target.value })
                    }
                    className="w-full"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Managing Pharmacist Name
                    </label>
                    <input
                      type="text"
                      value={onboardingForm.applicant_name}
                      onChange={(e) =>
                        setOnboardingForm({ ...onboardingForm, applicant_name: e.target.value })
                      }
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Pharmacist Email
                    </label>
                    <input
                      type="email"
                      value={onboardingForm.applicant_email}
                      onChange={(e) =>
                        setOnboardingForm({ ...onboardingForm, applicant_email: e.target.value })
                      }
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 mt-4">
                  <button
                    type="button"
                    onClick={() => setShowOnboardingModal(false)}
                    className="text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-teal-600 text-white text-xs font-semibold"
                  >
                    Submit for Admin Approval
                  </button>
                </div>
              </form>
            </div>
          </IonModal>

          <IonToast
            isOpen={!!toast}
            message={toast?.message || ''}
            duration={2800}
            onDidDismiss={() => setToast(null)}
            color={toast?.color || 'success'}
            position="top"
          />
        </IonContent>
      </IonPage>
    </IonSplitPane>
  );
};

export default StaffApp;
