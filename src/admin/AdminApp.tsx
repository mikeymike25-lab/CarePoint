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
  shieldCheckmarkOutline,
  peopleOutline,
  medkitOutline,
  receiptOutline,
  flagOutline,
  barChartOutline,
  createOutline,
  bookOutline,
  settingsOutline,
  logOutOutline,
  storefrontOutline,
  searchOutline,
  addOutline,
  closeOutline,
  cloudUploadOutline,
  downloadOutline,
  refreshOutline,
  ellipsisHorizontalOutline,
  sparklesOutline,
  megaphoneOutline,
  documentTextOutline,
  helpCircleOutline,
  carOutline,
  cardOutline,
  mailOutline,
  copyOutline,
  openOutline,
} from 'ionicons/icons';
import './admin.css';
import { useAuth } from '../shared/context/AuthContext';
import { supabase } from '../shared/lib/supabase';
import { resolveMedicineImageUrl } from '../shared/data/medicines';
import type { MasterCatalogItem, OrderStatus, Pharmacy } from '../shared/types/database';
import {
  fetchAdminSnapshot,
  subscribeToAdminRealtime,
  updatePharmacyApproval,
  saveCustomerAccountAdmin,
  promoteCustomerToStaffAdmin,
  saveStaffAccountAdmin,
  addNewStaffAccountAdmin,
  demoteStaffToCustomerAdmin,
  toggleAccountStatusAdmin,
  removeAccountAdmin,
  addAdminAccount,
  updateAdminAccount,
  deleteAdminAccount,
  toggleCatalogRx,
  deleteCatalogMedicine,
  saveCatalogMedicine,
  resolveAdminFlag,
  createAdminFlag,
  saveAdminSettings,
  saveAdminCmsData,
  recordAuditLog,
  DEFAULT_SETTINGS,
  DEFAULT_BANNERS,
  type AdminStateSnapshot,
  type AdminCustomerRecord,
  type AdminStaffRecord,
  type PlatformSettings,
  type AdminBanner,
  type AdminPromotion,
  type AdminFaq,
} from './services/adminService';

type AdminTabKey =
  | 'approvals'
  | 'accounts'
  | 'catalog'
  | 'orders'
  | 'flags'
  | 'reports'
  | 'content'
  | 'audit'
  | 'settings';

interface ParsedCSVRow {
  item_id?: number;
  brand_name: string;
  generic_name: string;
  category: string;
  dosage_form: string;
  requires_prescription: boolean;
  default_price: number;
  indications: string;
  dosage_instructions: string;
  packaging: string;
  side_effects: string;
  image_url: string;
}

const CURRENCY_SYMBOLS: Record<string, { symbol: string; label: string }> = {
  PHP: { symbol: '₱', label: 'Philippine Peso (₱)' },
  USD: { symbol: '$', label: 'US Dollar ($)' },
  EUR: { symbol: '€', label: 'Euro (€)' },
  SGD: { symbol: 'S$', label: 'Singapore Dollar (S$)' },
  JPY: { symbol: '¥', label: 'Japanese Yen (¥)' },
};

const PAYMENT_METHODS = [
  { id: 'card' as const, label: 'Credit / Debit Card (Sandbox)' },
  { id: 'gcash' as const, label: 'GCash E-Wallet (Sandbox)' },
  { id: 'paymaya' as const, label: 'Maya / PayMaya (Sandbox)' },
  { id: 'paypal' as const, label: 'PayPal (Sandbox)' },
  { id: 'cod' as const, label: 'Cash on Pickup / Delivery' },
];

const ORDER_STATUS_FLOW: OrderStatus[] = ['pending', 'confirmed', 'ready', 'completed', 'cancelled'];

export const AdminApp: React.FC = () => {
  const { displayName, user, logout } = useAuth();
  const router = useIonRouter();
  const actorName = displayName || 'System Administrator';

  // Active Navigation State
  const [activeTab, setActiveTab] = useState<AdminTabKey>('approvals');
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);

  // Backend Data Snapshot
  const [data, setData] = useState<AdminStateSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; color: 'success' | 'danger' | 'warning' | 'primary' } | null>(
    null
  );

  // Filters & Search
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategory, setCatalogCategory] = useState('All');
  const [catalogRegFilter, setCatalogRegFilter] = useState<'All' | 'OTC' | 'Rx'>('All');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | OrderStatus>('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [auditFilter, setAuditFilter] = useState('');

  // Modals State
  // 1. Accounts: Edit Customer, Promote Customer to Staff, Add/Edit/Assign Staff, Add/Edit Admin
  const [editingCustomer, setEditingCustomer] = useState<AdminCustomerRecord | null>(null);
  const [custForm, setCustForm] = useState({
    name: '',
    email: '',
    phone: '',
    status: 'active' as 'active' | 'disabled',
  });

  const [promotingCustomer, setPromotingCustomer] = useState<AdminCustomerRecord | null>(null);
  const [promoteForm, setPromoteForm] = useState<{
    pharmacyId: number;
    isOwner: boolean;
  }>({
    pharmacyId: 1,
    isOwner: false,
  });

  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<AdminStaffRecord | null>(null);
  const [staffForm, setStaffForm] = useState<{
    name: string;
    email: string;
    phone: string;
    pharmacyId: number;
    isOwner: boolean;
    status: 'active' | 'pending' | 'rejected' | 'disabled';
  }>({
    name: '',
    email: '',
    phone: '',
    pharmacyId: 1,
    isOwner: false,
    status: 'active',
  });

  const [showAdminModal, setShowAdminModal] = useState(false);
  const [editingAdminId, setEditingAdminId] = useState<string | null>(null);
  const [adminForm, setAdminForm] = useState({ name: '', email: '', phone: '' });

  // 3. Catalog: Medicine Detail Modal, Add/Edit Medicine Modal, CSV Import Preview
  const [selectedMed, setSelectedMed] = useState<MasterCatalogItem | null>(null);
  const [showMedFormModal, setShowMedFormModal] = useState(false);
  const [medForm, setMedForm] = useState<{
    item_id?: number;
    brand_name: string;
    generic_name: string;
    category: string;
    dosage_form: string;
    requires_prescription: boolean;
    default_price: string;
    indications: string;
    dosage_instructions: string;
    packaging: string;
    side_effects: string;
    image_url: string;
  }>({
    brand_name: '',
    generic_name: '',
    category: 'Pain Relief',
    dosage_form: '500mg Tablet',
    requires_prescription: false,
    default_price: '12.00',
    indications: '',
    dosage_instructions: '',
    packaging: '',
    side_effects: '',
    image_url: '/medicines/biogesic.jpg',
  });

  const [isUploadingCSV, setIsUploadingCSV] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedCSVRow[]>([]);
  const [showCSVPreviewModal, setShowCSVPreviewModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 4. Orders: Inspect Order Modal
  const [inspectingOrder, setInspectingOrder] = useState<any | null>(null);

  // 5. Flags: Raise Flag Modal
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [flagForm, setFlagForm] = useState({
    targetType: 'customer' as 'customer' | 'staff' | 'pharmacy',
    targetName: '',
    reason: '',
  });

  // 6. CMS Modals: Banner, Promo, Static Page, FAQ
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [bannerForm, setBannerForm] = useState<AdminBanner>({
    ...DEFAULT_BANNERS[0],
  });

  const [showPromoModal, setShowPromoModal] = useState(false);
  const [editingPromoId, setEditingPromoId] = useState<string | null>(null);
  const [promoForm, setPromoForm] = useState({ title: '', text: '' });

  const [editingPageKey, setEditingPageKey] = useState<string | null>(null);
  const [pageForm, setPageForm] = useState({ title: '', body: '' });

  const [showFaqModal, setShowFaqModal] = useState(false);
  const [editingFaqId, setEditingFaqId] = useState<string | null>(null);
  const [faqForm, setFaqForm] = useState({ q: '', a: '' });

  // 7. Settings Form State
  const [settingsDraft, setSettingsDraft] = useState<PlatformSettings>(DEFAULT_SETTINGS);

  const showToast = (
    message: string,
    color: 'success' | 'danger' | 'warning' | 'primary' = 'success'
  ) => {
    setToast({ message, color });
  };

  const loadSnapshot = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const snap = await fetchAdminSnapshot();
      setData(snap);
      setSettingsDraft(snap.settings);
    } catch (e: any) {
      console.error('Admin snapshot load error:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSnapshot();

    const unsubscribe = subscribeToAdminRealtime(
      (payload) => {
        if (payload.eventType === 'INSERT' && payload.new) {
          showToast(`🛎️ New order #${payload.new.order_id} received in real-time!`, 'primary');
        }
      },
      () => {
        loadSnapshot(true);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [loadSnapshot]);

  // Helper formatters
  const currencySymbol = useMemo(() => {
    const code = data?.settings?.currency || 'PHP';
    return CURRENCY_SYMBOLS[code]?.symbol || '₱';
  }, [data?.settings?.currency]);

  const money = useCallback(
    (amount: number) => `${currencySymbol}${Number(amount || 0).toFixed(2)}`,
    [currencySymbol]
  );

  const fmtDate = (iso?: string) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString('en-PH', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  const initials = (name: string) =>
    (name || 'Admin')
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

  // Badges & Counts for Navigation
  const pendingPharmaciesCount = useMemo(
    () => (data?.pharmacies || []).filter((p) => p.approval_status === 'pending').length,
    [data?.pharmacies]
  );
  const openFlagsCount = useMemo(
    () => (data?.flags || []).filter((f) => f.status === 'open').length,
    [data?.flags]
  );
  const pendingOrdersCount = useMemo(
    () => (data?.orders || []).filter((o) => o.status === 'pending').length,
    [data?.orders]
  );
  const approvedPharmaciesCount = useMemo(
    () => (data?.pharmacies || []).filter((p) => p.approval_status === 'approved').length,
    [data?.pharmacies]
  );

  const navGroups: {
    group: string;
    items: { key: AdminTabKey; label: string; icon: string; badge?: number }[];
  }[] = useMemo(
    () => [
      {
        group: 'Marketplace',
        items: [
          { key: 'approvals', label: 'Registry', icon: shieldCheckmarkOutline, badge: pendingPharmaciesCount },
          { key: 'accounts', label: 'Accounts', icon: peopleOutline },
          { key: 'catalog', label: 'Herbal Index', icon: medkitOutline },
          { key: 'orders', label: 'All Orders', icon: receiptOutline, badge: pendingOrdersCount },
        ],
      },
      {
        group: 'Trust & safety',
        items: [
          { key: 'flags', label: 'Flags', icon: flagOutline, badge: openFlagsCount },
          { key: 'audit', label: 'Audit Trail', icon: bookOutline },
        ],
      },
      {
        group: 'Insight',
        items: [{ key: 'reports', label: 'Tally', icon: barChartOutline }],
      },
      {
        group: 'Publishing',
        items: [{ key: 'content', label: 'Content', icon: createOutline }],
      },
      {
        group: 'System',
        items: [{ key: 'settings', label: 'Settings', icon: settingsOutline }],
      },
    ],
    [pendingPharmaciesCount, pendingOrdersCount, openFlagsCount]
  );

  const allTabs = useMemo(() => navGroups.flatMap((g) => g.items), [navGroups]);

  const activeTabLabel = useMemo(
    () => allTabs.find((t) => t.key === activeTab)?.label || 'Registry',
    [allTabs, activeTab]
  );

  // ============================================================================
  // CSV PARSER & BULK IMPORTER
  // ============================================================================
  const parseCSVText = (text: string): ParsedCSVRow[] => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return [];

    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let insideQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' && (i === 0 || line[i - 1] !== '\\')) {
          insideQuotes = !insideQuotes;
        } else if (char === ',' && !insideQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result.map((col) => col.replace(/^"(.*)"$/, '$1').replace(/""/g, '"'));
    };

    const headers = parseLine(lines[0]).map((h) => h.toLowerCase());
    const rows: ParsedCSVRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = parseLine(lines[i]);
      if (cols.length < headers.length) continue;

      const rowObj: any = {};
      headers.forEach((h, idx) => {
        rowObj[h] = cols[idx];
      });

      const requiresPrescription =
        String(rowObj.requires_prescription).toLowerCase() === 'true' ||
        String(rowObj.requires_prescription) === '1' ||
        String(rowObj.category).toLowerCase().includes('antibiotic') ||
        String(rowObj.category).toLowerCase().includes('pressure');

      rows.push({
        item_id: rowObj.item_id ? parseInt(rowObj.item_id, 10) : undefined,
        brand_name: rowObj.brand_name || 'Generic Product',
        generic_name: rowObj.generic_name || 'Generic Compound',
        category: rowObj.category || 'General',
        dosage_form: rowObj.dosage_form || 'Tablet',
        requires_prescription: requiresPrescription,
        default_price: parseFloat(rowObj.default_price || '10.00'),
        indications: rowObj.indications || '',
        dosage_instructions: rowObj.dosage_instructions || '',
        packaging: rowObj.packaging || '',
        side_effects: rowObj.side_effects || '',
        image_url: resolveMedicineImageUrl(rowObj.image_url) || '/medicines/biogesic.jpg',
      });
    }

    return rows;
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = parseCSVText(evt.target?.result as string);
        if (!parsed.length) {
          showToast('Failed to parse CSV. Ensure valid headers exist.', 'danger');
          return;
        }
        setParsedRows(parsed);
        setShowCSVPreviewModal(true);
      } catch (err: any) {
        showToast(`CSV parse error: ${err.message}`, 'danger');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const commitCSVImport = async () => {
    setIsUploadingCSV(true);
    try {
      const baseLen = data?.catalog.length || 40;
      const payload = parsedRows.map((r, idx) => ({
        item_id: r.item_id || baseLen + idx + 1,
        brand_name: r.brand_name,
        generic_name: r.generic_name,
        category: r.category,
        dosage_form: r.dosage_form,
        requires_prescription: r.requires_prescription,
        indications: r.indications,
        dosage_instructions: r.dosage_instructions,
        packaging: r.packaging,
        side_effects: r.side_effects,
        image_url: r.image_url,
      }));

      const { error } = await supabase.from('master_catalog').upsert(payload, { onConflict: 'item_id' });
      if (error) {
        console.warn('Supabase CSV upsert warning:', error.message);
      }

      await recordAuditLog(actorName, `Bulk imported ${parsedRows.length} medicines into Master Catalog via CSV`);
      setShowCSVPreviewModal(false);
      setParsedRows([]);
      await loadSnapshot(true);
      showToast(`Imported ${payload.length} medicine records to Master Catalog!`, 'success');
    } catch (err: any) {
      showToast(`CSV import failed: ${err.message}`, 'danger');
    } finally {
      setIsUploadingCSV(false);
    }
  };

  // ============================================================================
  // ACTION HANDLERS (Admin Governance: Pharmacies, Staff, Accounts, Master Catalog)
  // ============================================================================
  const [decisionModalPharmacy, setDecisionModalPharmacy] = useState<Pharmacy | null>(null);
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);
  const [emailStatusBanner, setEmailStatusBanner] = useState<{
    type: 'success' | 'warning' | 'error';
    title: string;
    detail: string;
  } | null>(null);
  const [sentEmailsMap, setSentEmailsMap] = useState<
    Record<number, { sentAt: string; to: string; method: string; decision: string }>
  >(() => {
    try {
      const raw = localStorage.getItem('cp_admin_sent_emails_v1');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const markEmailSentForPharmacy = (
    pharmacyId: number,
    to: string,
    method: string,
    decision: string
  ) => {
    setSentEmailsMap((prev) => {
      const next = {
        ...prev,
        [pharmacyId]: {
          sentAt: new Date().toISOString(),
          to,
          method,
          decision,
        },
      };
      try {
        localStorage.setItem('cp_admin_sent_emails_v1', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const isDemoPlaceholderEmail = (email: string) => {
    const clean = email.trim().toLowerCase();
    if (!clean) return false;
    return (
      clean.endsWith('.local') ||
      clean.endsWith('@pharmacy.ph') ||
      clean.endsWith('@carepoint.ph') ||
      clean.endsWith('@example.com')
    );
  };

  const [decisionForm, setDecisionForm] = useState<{
    decision: 'approved' | 'rejected';
    applicantName: string;
    recipientEmail: string;
    decisionNote: string;
    subject: string;
    body: string;
    customEditedBody: boolean;
  }>({
    decision: 'approved',
    applicantName: '',
    recipientEmail: '',
    decisionNote: '',
    subject: '',
    body: '',
    customEditedBody: false,
  });

  const buildEmailTemplate = useCallback(
    (
      ph: Pharmacy,
      decision: 'approved' | 'rejected',
      applicantName: string,
      recipientEmail: string,
      decisionNote: string
    ) => {
      const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://carepoint.ph';
      const cleanName = applicantName.trim() || `${ph.name} Representative`;
      const cleanEmail = recipientEmail.trim() || 'owner@pharmacy.ph';

      if (decision === 'approved') {
        const subject = `[CarePoint] Partner Pharmacy Application Approved — ${ph.name}`;
        const body = [
          `Dear ${cleanName},`,
          ``,
          `Congratulations! Your Partner Pharmacy Inquiry for ${ph.name} (FDA License: ${ph.license_number}) has been verified and APPROVED by the CarePoint Regulatory Team.`,
          ``,
          `Branch Summary:`,
          `• Pharmacy Name: ${ph.name}`,
          `• FDA License #: ${ph.license_number}`,
          `• Address: ${ph.address}`,
          `• Operating Hours: ${ph.operating_hours || '8:00 AM – 9:00 PM daily'}`,
          decisionNote.trim() ? `• Admin Note: ${decisionNote.trim()}` : null,
          ``,
          `How to Access Your Pharmacy Staff Portal:`,
          `1. Open CarePoint at ${appUrl}/register (or ${appUrl}/login if you already have an account).`,
          `2. Sign up or sign in using this exact email address: ${cleanEmail}`,
          `3. Your account is automatically linked as Pharmacy Staff for ${ph.name}, giving you immediate access to manage your OTC inventory, pricing, and incoming orders.`,
          ``,
          `Welcome to the CarePoint Partner Network!`,
          ``,
          `Warm regards,`,
          `${actorName}`,
          `CarePoint Regulatory & Marketplace Operations`,
        ]
          .filter((line) => line !== null)
          .join('\n');

        return { subject, body };
      } else {
        const reasonText =
          decisionNote.trim() ||
          'Unable to verify FDA License number or branch documentation against regulatory records.';
        const subject = `[CarePoint] Update on Your Partner Pharmacy Inquiry — ${ph.name}`;
        const body = [
          `Dear ${cleanName},`,
          ``,
          `Thank you for submitting a Partner Pharmacy Inquiry for ${ph.name} (FDA License: ${ph.license_number}) on CarePoint.`,
          ``,
          `After reviewing your submission, we are unable to approve your pharmacy storefront at this time for the following reason:`,
          `• ${reasonText}`,
          ``,
          `If you would like to provide updated regulatory documentation or corrected branch details, please reply directly to this email or submit an updated inquiry on CarePoint.`,
          ``,
          `Sincerely,`,
          `${actorName}`,
          `CarePoint Regulatory & Marketplace Operations`,
        ].join('\n');

        return { subject, body };
      }
    },
    [actorName]
  );

  const openPharmacyDecisionModal = (ph: Pharmacy, initialDecision: 'approved' | 'rejected') => {
    const staffRep = data?.staff.find((s) => Number(s.pharmacy_id) === Number(ph.pharmacy_id));
    const defaultName = ph.applicant_name || staffRep?.full_name || `${ph.name} Owner`;
    const defaultEmail = ph.applicant_email || staffRep?.email || '';
    const defaultNote =
      initialDecision === 'approved'
        ? 'FDA License verified and branch details approved for OTC marketplace operations.'
        : 'Unable to verify FDA License number with regulatory registry.';

    const { subject, body } = buildEmailTemplate(
      ph,
      initialDecision,
      defaultName,
      defaultEmail,
      defaultNote
    );

    setEmailStatusBanner(null);
    setDecisionModalPharmacy(ph);
    setDecisionForm({
      decision: initialDecision,
      applicantName: defaultName,
      recipientEmail: defaultEmail,
      decisionNote: defaultNote,
      subject,
      body,
      customEditedBody: false,
    });
  };

  const updateDecisionFieldsAndSyncTemplate = (
    updates: Partial<{
      decision: 'approved' | 'rejected';
      applicantName: string;
      recipientEmail: string;
      decisionNote: string;
    }>,
    forceResetBody = false
  ) => {
    if (!decisionModalPharmacy) return;
    setDecisionForm((prev) => {
      const nextDecision = updates.decision ?? prev.decision;
      const nextName = updates.applicantName ?? prev.applicantName;
      const nextEmail = updates.recipientEmail ?? prev.recipientEmail;
      const nextNote =
        updates.decision && updates.decision !== prev.decision && updates.decisionNote === undefined
          ? nextDecision === 'approved'
            ? 'FDA License verified and branch details approved for OTC marketplace operations.'
            : 'Unable to verify FDA License number with regulatory registry.'
          : updates.decisionNote ?? prev.decisionNote;

      if (!prev.customEditedBody || forceResetBody || updates.decision !== undefined) {
        const { subject, body } = buildEmailTemplate(
          decisionModalPharmacy,
          nextDecision,
          nextName,
          nextEmail,
          nextNote
        );
        return {
          ...prev,
          decision: nextDecision,
          applicantName: nextName,
          recipientEmail: nextEmail,
          decisionNote: nextNote,
          subject,
          body,
          customEditedBody: false,
        };
      }

      return {
        ...prev,
        decision: nextDecision,
        applicantName: nextName,
        recipientEmail: nextEmail,
        decisionNote: nextNote,
      };
    });
  };

  const DEFAULT_GMAIL_RELAY_URL = '';

  const [gmailRelayUrl, setGmailRelayUrl] = useState<string>(() => {
    try {
      return (
        localStorage.getItem('cp_admin_gmail_relay_url_v1') ||
        import.meta.env.VITE_GMAIL_RELAY_URL ||
        DEFAULT_GMAIL_RELAY_URL
      );
    } catch {
      return import.meta.env.VITE_GMAIL_RELAY_URL || DEFAULT_GMAIL_RELAY_URL;
    }
  });
  const [relayUrlInput, setRelayUrlInput] = useState<string>(() => {
    try {
      return (
        localStorage.getItem('cp_admin_gmail_relay_url_v1') ||
        import.meta.env.VITE_GMAIL_RELAY_URL ||
        DEFAULT_GMAIL_RELAY_URL
      );
    } catch {
      return DEFAULT_GMAIL_RELAY_URL;
    }
  });
  const [showRelaySetup, setShowRelaySetup] = useState(false);

  const GMAIL_RELAY_SCRIPT_CODE = `function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    GmailApp.sendEmail(data.to, data.subject, data.body, {
      name: data.senderName || 'CarePoint Regulatory & Marketplace Operations'
    });
    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

  const handleCopyGmailRelayScript = async () => {
    try {
      await navigator.clipboard.writeText(GMAIL_RELAY_SCRIPT_CODE);
      showToast('10-line Gmail Instant Relay script copied! Paste it in script.google.com', 'success');
    } catch {
      showToast('Could not copy automatically — please copy the script from the box.', 'warning');
    }
  };

  const handleSaveGmailRelayUrl = () => {
    const clean = relayUrlInput.trim();
    if (clean && !clean.startsWith('https://script.google.com/macros/s/')) {
      showToast(
        'Please paste a valid Google Apps Script Web App URL (starts with https://script.google.com/macros/s/...)',
        'warning'
      );
      return;
    }
    setGmailRelayUrl(clean);
    try {
      if (clean) {
        localStorage.setItem('cp_admin_gmail_relay_url_v1', clean);
      } else {
        localStorage.removeItem('cp_admin_gmail_relay_url_v1');
      }
    } catch {}
    setShowRelaySetup(false);
    setEmailStatusBanner(null);
    showToast(
      clean
        ? '⚡ Instant Send connected! Clicking "Instant Send" will now email any address in 1 click.'
        : 'Instant Send relay URL cleared.',
      'success'
    );
  };

  const handleCopyDecisionEmail = async () => {
    const fullText = `To: ${decisionForm.recipientEmail}\nSubject: ${decisionForm.subject}\n\n${decisionForm.body}`;
    try {
      await navigator.clipboard.writeText(fullText);
      showToast('Templated email copied to clipboard!', 'primary');
    } catch {
      showToast('Could not copy automatically — please select and copy the text.', 'warning');
    }
  };

  const handleConfirmPharmacyDecision = async (
    launchMode: 'direct' | 'gmail' | 'mailto' | 'none'
  ) => {
    if (!decisionModalPharmacy) return;
    const targetEmail = decisionForm.recipientEmail.trim();
    if (launchMode !== 'none' && !targetEmail) {
      setEmailStatusBanner({
        type: 'error',
        title: 'Recipient Email Required',
        detail: 'Please enter a valid recipient email address before sending.',
      });
      showToast('Please enter a recipient email address to send the notification.', 'warning');
      return;
    }

    if (launchMode !== 'none' && isDemoPlaceholderEmail(targetEmail)) {
      setEmailStatusBanner({
        type: 'warning',
        title: `Demo Placeholder Email Detected (${targetEmail})`,
        detail:
          'Seeded demo addresses like @metrocare.local or @pharmacy.ph do not have real mail servers. Replace it above with a real email address (e.g. your @gmail.com) to send a real email!',
      });
      showToast('Replace the demo .local email with a real email address first.', 'warning');
      return;
    }

    const activeRelayUrl = gmailRelayUrl.trim();
    const emailJsServiceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
    const emailJsTemplateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
    const emailJsPublicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
    const hasEmailJs = Boolean(emailJsServiceId && emailJsTemplateId && emailJsPublicKey);

    if (launchMode === 'direct' && !activeRelayUrl && !hasEmailJs) {
      setShowRelaySetup(true);
      setEmailStatusBanner({
        type: 'warning',
        title: '⚡ Connect Your Gmail Instant Relay Below (1-Minute Setup)',
        detail:
          'To send emails silently in the background to ANY email address without opening a tab, paste your 10-line Google Apps Script Web App URL in the setup box below — or click "Send via Gmail" to send immediately in a new tab.',
      });
      showToast('Connect your Gmail Relay URL in the setup box, or click "Send via Gmail".', 'warning');
      return;
    }

    // IMPORTANT: Open Gmail or mailto synchronously BEFORE any await so the browser popup blocker never blocks it!
    if (launchMode === 'gmail' && targetEmail) {
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
        targetEmail
      )}&su=${encodeURIComponent(decisionForm.subject)}&body=${encodeURIComponent(
        decisionForm.body
      )}`;
      window.open(gmailUrl, '_blank', 'noopener,noreferrer');
    } else if (launchMode === 'mailto' && targetEmail) {
      const mailtoUrl = `mailto:${encodeURIComponent(
        targetEmail
      )}?subject=${encodeURIComponent(decisionForm.subject)}&body=${encodeURIComponent(
        decisionForm.body
      )}`;
      window.location.href = mailtoUrl;
    }

    setIsSubmittingDecision(true);
    setEmailStatusBanner(null);
    try {
      let shouldKeepModalOpen = false;
      let directSuccessDetail = '';

      if (launchMode === 'direct' && targetEmail) {
        if (activeRelayUrl) {
          let relayOk = false;
          let relayErr = '';
          try {
            const relayRes = await fetch(activeRelayUrl, {
              method: 'POST',
              redirect: 'follow',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({
                to: targetEmail,
                subject: decisionForm.subject,
                body: decisionForm.body,
                senderName: 'CarePoint Regulatory & Marketplace Operations',
              }),
            });
            const relayJson: any = await relayRes.json().catch(() => null);
            if (relayRes.ok && (!relayJson || relayJson.success !== false)) {
              relayOk = true;
            } else {
              relayErr = relayJson?.error || `HTTP ${relayRes.status}`;
            }
          } catch {
            // Fallback with no-cors in case browser blocks reading redirect response
            try {
              await fetch(activeRelayUrl, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                  to: targetEmail,
                  subject: decisionForm.subject,
                  body: decisionForm.body,
                  senderName: 'CarePoint Regulatory & Marketplace Operations',
                }),
              });
              relayOk = true;
            } catch (e: any) {
              relayErr = e?.message || 'Network error calling Gmail Relay';
            }
          }

          if (relayOk) {
            markEmailSentForPharmacy(
              decisionModalPharmacy.pharmacy_id,
              targetEmail,
              'Instant Send',
              decisionForm.decision
            );
            directSuccessDetail = `✓ Email Sent Instantly to ${targetEmail}`;
          } else {
            shouldKeepModalOpen = true;
            setEmailStatusBanner({
              type: 'error',
              title: 'Instant Relay Failed',
              detail: `Could not reach your Google Apps Script URL (${relayErr}). Check your Web App deployment permissions ("Who has access: Anyone") or click "Send via Gmail".`,
            });
          }
        } else if (hasEmailJs) {
          const ejsRes = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              service_id: emailJsServiceId,
              template_id: emailJsTemplateId,
              user_id: emailJsPublicKey,
              template_params: {
                to_email: targetEmail,
                to_name: decisionForm.applicantName.trim() || decisionModalPharmacy.name,
                pharmacy_name: decisionModalPharmacy.name,
                subject: decisionForm.subject,
                message: decisionForm.body,
              },
            }),
          });
          if (ejsRes.ok) {
            markEmailSentForPharmacy(
              decisionModalPharmacy.pharmacy_id,
              targetEmail,
              'Instant Send',
              decisionForm.decision
            );
            directSuccessDetail = `✓ Email Sent Instantly to ${targetEmail}`;
          }
        }
      } else if (launchMode === 'gmail' || launchMode === 'mailto') {
        markEmailSentForPharmacy(
          decisionModalPharmacy.pharmacy_id,
          targetEmail,
          launchMode === 'gmail' ? 'Gmail' : 'Mail App',
          decisionForm.decision
        );
        directSuccessDetail = `✓ Email Sent (${launchMode === 'gmail' ? 'Gmail' : 'Mail App'} opened for ${targetEmail})`;
      }

      const res = await updatePharmacyApproval(
        decisionModalPharmacy.pharmacy_id,
        decisionForm.decision,
        actorName,
        {
          recipientEmail: targetEmail,
          applicantName: decisionForm.applicantName.trim(),
          emailSubject: decisionForm.subject.trim(),
          decisionNote: `${decisionForm.decisionNote.trim()}${
            directSuccessDetail ? ' [EMAIL_SENT]' : ''
          }`,
        }
      );

      if (!res.success) {
        showToast(res.message, 'danger');
        return;
      }

      await loadSnapshot(true);

      if (shouldKeepModalOpen) {
        showToast('Decision saved! Check the relay error notice inside the modal.', 'warning');
      } else {
        showToast(
          directSuccessDetail ? `${res.message} · ${directSuccessDetail}` : res.message,
          'success'
        );
        setDecisionModalPharmacy(null);
      }
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  const openEditCustomer = (c: AdminCustomerRecord) => {
    setEditingCustomer(c);
    setCustForm({
      name: c.full_name,
      email: c.email || '',
      phone: c.phone_number || '',
      status: c.account_status || 'active',
    });
  };

  const handleSaveCustomer = async () => {
    if (!editingCustomer) return;
    if (!custForm.name.trim() || !custForm.email.trim()) {
      showToast('Name and email are required.', 'warning');
      return;
    }
    const res = await saveCustomerAccountAdmin(
      editingCustomer.id,
      custForm.name.trim(),
      custForm.email.trim(),
      custForm.phone.trim(),
      custForm.status,
      actorName
    );
    showToast(res.message, res.success ? 'success' : 'danger');
    if (res.success) {
      setEditingCustomer(null);
      await loadSnapshot(true);
    }
  };

  const openPromoteCustomer = (c: AdminCustomerRecord) => {
    const defaultPhId = data?.pharmacies?.[0]?.pharmacy_id || 1;
    setPromotingCustomer(c);
    setPromoteForm({
      pharmacyId: Number(defaultPhId),
      isOwner: false,
    });
  };

  const handlePromoteCustomerToStaff = async () => {
    if (!promotingCustomer) return;
    const targetPh = (data?.pharmacies || []).find(
      (p) => Number(p.pharmacy_id) === Number(promoteForm.pharmacyId)
    );
    const phName = targetPh?.name || `Pharmacy #${promoteForm.pharmacyId}`;
    const res = await promoteCustomerToStaffAdmin(
      promotingCustomer.id,
      promotingCustomer.full_name,
      promotingCustomer.email || '',
      promotingCustomer.phone_number,
      Number(promoteForm.pharmacyId),
      phName,
      promoteForm.isOwner,
      actorName
    );
    showToast(res.message, res.success ? 'success' : 'danger');
    if (res.success) {
      setPromotingCustomer(null);
      await loadSnapshot(true);
    }
  };

  const openAddStaffModal = () => {
    const defaultPhId = data?.pharmacies?.[0]?.pharmacy_id || 1;
    setEditingStaff(null);
    setStaffForm({
      name: '',
      email: '',
      phone: '09171111111',
      pharmacyId: Number(defaultPhId),
      isOwner: false,
      status: 'active',
    });
    setShowStaffModal(true);
  };

  const openEditStaffModal = (s: AdminStaffRecord) => {
    setEditingStaff(s);
    setStaffForm({
      name: s.full_name,
      email: s.email || '',
      phone: s.phone_number || '09171111111',
      pharmacyId: Number(s.pharmacy_id),
      isOwner: !!s.is_owner,
      status: s.status || 'active',
    });
    setShowStaffModal(true);
  };

  const handleSaveStaffAccount = async () => {
    if (!staffForm.name.trim() || !staffForm.email.trim()) {
      showToast('Staff full name and email are required.', 'warning');
      return;
    }
    const targetPh = (data?.pharmacies || []).find(
      (p) => Number(p.pharmacy_id) === Number(staffForm.pharmacyId)
    );
    const phName = targetPh?.name || `Pharmacy #${staffForm.pharmacyId}`;

    const res = editingStaff
      ? await saveStaffAccountAdmin(
          editingStaff.staff_id,
          staffForm.name.trim(),
          staffForm.email.trim(),
          staffForm.phone.trim(),
          Number(staffForm.pharmacyId),
          phName,
          staffForm.status,
          staffForm.isOwner,
          actorName
        )
      : await addNewStaffAccountAdmin(
          staffForm.name.trim(),
          staffForm.email.trim(),
          staffForm.phone.trim(),
          Number(staffForm.pharmacyId),
          phName,
          staffForm.isOwner,
          actorName
        );
    showToast(res.message, res.success ? 'success' : 'danger');
    if (res.success) {
      setShowStaffModal(false);
      setEditingStaff(null);
      await loadSnapshot(true);
    }
  };

  const handleQuickAssignPharmacy = async (s: AdminStaffRecord, newPharmacyId: number) => {
    const targetPh = (data?.pharmacies || []).find(
      (p) => Number(p.pharmacy_id) === Number(newPharmacyId)
    );
    const phName = targetPh?.name || `Pharmacy #${newPharmacyId}`;
    const res = await saveStaffAccountAdmin(
      s.staff_id,
      s.full_name,
      s.email || '',
      s.phone_number || '09171111111',
      Number(newPharmacyId),
      phName,
      s.status,
      s.is_owner,
      actorName
    );
    showToast(res.message, res.success ? 'success' : 'danger');
    if (res.success) await loadSnapshot(true);
  };

  const handleDemoteStaff = async (s: AdminStaffRecord) => {
    if (
      !window.confirm(
        `Demote ${s.full_name} back to a normal Customer account and unassign them from ${
          s.pharmacy?.name || 'their pharmacy'
        }?`
      )
    ) {
      return;
    }
    const res = await demoteStaffToCustomerAdmin(s.staff_id, s.full_name, actorName);
    showToast(res.message, res.success ? 'success' : 'danger');
    if (res.success) await loadSnapshot(true);
  };

  const handleToggleAccount = async (
    type: 'customer' | 'staff',
    id: string,
    currentStatus: string,
    name: string,
    pharmacyId?: number
  ) => {
    const res = await toggleAccountStatusAdmin(type, id, currentStatus, name, pharmacyId, actorName);
    showToast(res.message, res.success ? 'success' : 'danger');
    if (res.success) await loadSnapshot(true);
  };

  const handleRemoveAccount = async (
    type: 'customer' | 'staff',
    id: string,
    name: string,
    pharmacyId?: number
  ) => {
    if (!window.confirm(`Permanently remove ${name}'s account?`)) return;
    const res = await removeAccountAdmin(type, id, name, pharmacyId, actorName);
    showToast(res.message, res.success ? 'success' : 'danger');
    if (res.success) await loadSnapshot(true);
  };

  const handleSaveAdmin = async () => {
    if (!adminForm.name.trim() || !adminForm.email.trim()) {
      showToast('Administrator name and email are required.', 'warning');
      return;
    }
    const res = editingAdminId
      ? await updateAdminAccount(
          editingAdminId,
          adminForm.name.trim(),
          adminForm.email.trim(),
          adminForm.phone.trim(),
          actorName
        )
      : await addAdminAccount(
          adminForm.name.trim(),
          adminForm.email.trim(),
          adminForm.phone.trim(),
          actorName
        );
    showToast(res.message, res.success ? 'success' : 'danger');
    if (res.success) {
      setShowAdminModal(false);
      setEditingAdminId(null);
      await loadSnapshot(true);
    }
  };

  const handleDeleteAdmin = async (id: string, name: string) => {
    if ((data?.admins.length || 0) <= 1) {
      showToast('At least one administrator must remain.', 'warning');
      return;
    }
    if (id === user?.id) {
      showToast('You cannot delete your own account.', 'warning');
      return;
    }
    if (!window.confirm(`Delete administrator ${name}?`)) return;
    const res = await deleteAdminAccount(id, name, actorName);
    showToast(res.message, res.success ? 'success' : 'danger');
    if (res.success) await loadSnapshot(true);
  };

  const handleToggleRx = async (item: MasterCatalogItem) => {
    const res = await toggleCatalogRx(item, actorName);
    showToast(res.message, res.success ? 'success' : 'danger');
    if (res.success) await loadSnapshot(true);
  };

  const handleDeleteCatalogItem = async (item: MasterCatalogItem) => {
    const label = item.brand_name || item.generic_name;
    if (!window.confirm(`Remove ${label} from the Master Catalog?`)) return;
    const res = await deleteCatalogMedicine(item.item_id, label, actorName);
    showToast(res.message, res.success ? 'success' : 'danger');
    if (res.success) await loadSnapshot(true);
  };

  const handleSaveCatalogMedicine = async () => {
    if (!medForm.brand_name.trim() || !medForm.generic_name.trim()) {
      showToast('Brand name and generic name are required.', 'warning');
      return;
    }
    const res = await saveCatalogMedicine(
      {
        item_id: medForm.item_id,
        brand_name: medForm.brand_name.trim(),
        generic_name: medForm.generic_name.trim(),
        category: medForm.category,
        dosage_form: medForm.dosage_form.trim(),
        requires_prescription: medForm.requires_prescription,
        default_price: parseFloat(medForm.default_price) || 12,
        indications: medForm.indications.trim(),
        dosage_instructions: medForm.dosage_instructions.trim(),
        packaging: medForm.packaging.trim(),
        side_effects: medForm.side_effects.trim(),
        image_url: resolveMedicineImageUrl(medForm.image_url.trim()) || '/medicines/biogesic.jpg',
      },
      actorName
    );
    showToast(res.message, res.success ? 'success' : 'danger');
    if (res.success) {
      setShowMedFormModal(false);
      await loadSnapshot(true);
    }
  };

  const handleResolveFlag = async (flagId: string) => {
    const res = await resolveAdminFlag(flagId, actorName);
    showToast(res.message, 'success');
    await loadSnapshot(true);
  };

  const handleCreateFlag = async () => {
    if (!flagForm.targetName.trim() || !flagForm.reason.trim()) {
      showToast('Account name and reason are required.', 'warning');
      return;
    }
    const res = await createAdminFlag(
      flagForm.targetType,
      'target_' + Date.now(),
      flagForm.targetName.trim(),
      flagForm.reason.trim(),
      actorName
    );
    showToast(res.message, 'success');
    setShowFlagModal(false);
    setFlagForm({ targetType: 'customer', targetName: '', reason: '' });
    await loadSnapshot(true);
  };

  // CMS Handlers
  const commitCmsUpdate = async (
    next: Partial<{
      banner: AdminBanner;
      banners: AdminBanner[];
      promotions: AdminPromotion[];
      pages: Record<string, { title: string; body: string }>;
      faqs: AdminFaq[];
    }>,
    auditDesc: string
  ) => {
    if (!data) return;
    const banners = next.banners || data.homepageBanners || DEFAULT_BANNERS;
    const cmsPayload = {
      banner: next.banner || banners[0] || DEFAULT_BANNERS[0],
      banners,
      promotions: next.promotions || data.promotions,
      pages: next.pages || data.pages,
      faqs: next.faqs || data.faqs,
    };
    const res = await saveAdminCmsData(cmsPayload, auditDesc, actorName);
    showToast(res.message, 'success');
    await loadSnapshot(true);
  };

  const handleSaveSettings = async () => {
    if (!settingsDraft.platformName.trim() || !settingsDraft.supportEmail.trim()) {
      showToast('Platform name and support email are required.', 'warning');
      return;
    }
    if (!settingsDraft.pickupEnabled && !settingsDraft.deliveryEnabled) {
      showToast('Enable at least one fulfillment option.', 'warning');
      return;
    }
    if (!Object.values(settingsDraft.payments).some(Boolean)) {
      showToast('Enable at least one payment option.', 'warning');
      return;
    }
    const res = await saveAdminSettings(settingsDraft, actorName);
    showToast(res.message, 'success');
    await loadSnapshot(true);
  };

  const handleResetSettings = async () => {
    if (!window.confirm('Reset all platform settings to their defaults?')) return;
    setSettingsDraft(DEFAULT_SETTINGS);
    await saveAdminSettings(DEFAULT_SETTINGS, actorName);
    showToast('Settings restored to defaults.', 'success');
    await loadSnapshot(true);
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login', 'back', 'replace');
  };

  // ============================================================================
  // RENDER HELPERS FOR EACH OF THE 9 CONSOLE VIEWS
  // ============================================================================

  // 1. REGISTRY (PHARMACY APPROVALS)
  const renderApprovals = () => {
    const pharmacies = data?.pharmacies || [];
    const pendingPharmacies = pharmacies.filter((p) => p.approval_status === 'pending');
    const approvedPharmacies = pharmacies.filter((p) => p.approval_status === 'approved');
    const rejectedPharmacies = pharmacies.filter((p) => p.approval_status === 'rejected');

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-widest text-teal-700 font-semibold">
              Marketplace
            </span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">Registry</h1>
            <p className="text-sm text-slate-600">
              Pharmacy applications submitted via the Staff Portal awaiting regulatory review and active marketplace directory.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-100 border border-slate-200 text-slate-600 text-xs font-mono">
            <IonIcon icon={shieldCheckmarkOutline} className="text-teal-700 text-sm" />
            Regulatory Gatekeeper · Applications submitted by Pharmacy Staff
          </span>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div
            className={`bg-white border rounded-md p-4 ${
              pendingPharmacies.length > 0
                ? 'border-amber-400 shadow-[inset_3px_0_0_#d97706]'
                : 'border-slate-200'
            }`}
          >
            <div className="text-[10.5px] font-mono uppercase tracking-wider text-slate-500">
              Pending review
            </div>
            <div className="text-2xl font-mono font-semibold text-slate-900 mt-1">
              {pendingPharmacies.length}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-md p-4">
            <div className="text-[10.5px] font-mono uppercase tracking-wider text-slate-500">
              Approved pharmacies
            </div>
            <div className="text-2xl font-mono font-semibold text-emerald-700 mt-1">
              {approvedPharmacies.length}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-md p-4">
            <div className="text-[10.5px] font-mono uppercase tracking-wider text-slate-500">
              Rejected
            </div>
            <div className="text-2xl font-mono font-semibold text-slate-900 mt-1">
              {rejectedPharmacies.length}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-md p-4">
            <div className="text-[10.5px] font-mono uppercase tracking-wider text-slate-500">
              Pharmacy accounts
            </div>
            <div className="text-2xl font-mono font-semibold text-slate-900 mt-1">
              {data?.staff.length || 0}
            </div>
          </div>
        </div>

        {/* Pending Queue Panel */}
        <section className="bg-white border border-slate-200 rounded-md overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              Applications
              <span className="px-2 py-0.5 text-xs font-mono rounded bg-slate-200 text-slate-700">
                {pendingPharmacies.length}
              </span>
            </h2>
            <span className="text-xs font-mono text-slate-500">Oldest first as submitted</span>
          </div>

          {pendingPharmacies.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center mx-auto mb-2">
                <IonIcon icon={shieldCheckmarkOutline} className="text-xl" />
              </div>
              <div className="text-sm font-semibold text-slate-800">Registry is clear.</div>
              <p className="text-xs text-slate-500 mt-0.5">
                No pending registrations — new Partner Pharmacy Inquiries submitted on Sign In will queue here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px] border-collapse">
                <thead className="bg-[#F4F6F3] border-b border-slate-200 text-[10.5px] font-mono uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="py-2.5 px-3">Pharmacy</th>
                    <th className="py-2.5 px-3">License #</th>
                    <th className="py-2.5 px-3">Location &amp; Phone</th>
                    <th className="py-2.5 px-3">Hours</th>
                    <th className="py-2.5 px-3">Applicant &amp; Email</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Decision &amp; Email</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {pendingPharmacies.map((ph) => {
                    const staffRep = data?.staff.find((s) => s.pharmacy_id === ph.pharmacy_id);
                    const applicantName = ph.applicant_name || staffRep?.full_name || `${ph.name} Owner`;
                    const applicantEmail = ph.applicant_email || staffRep?.email || 'owner@pharmacy.ph';
                    const emailSentInfo =
                      sentEmailsMap[ph.pharmacy_id] ||
                      (ph.admin_decision_note?.includes('[EMAIL_SENT]')
                        ? { sentAt: ph.decided_at || '', to: applicantEmail, method: 'Email', decision: ph.approval_status }
                        : null);
                    return (
                      <tr key={ph.pharmacy_id} className="hover:bg-teal-50/30">
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900">{ph.name}</div>
                          {ph.inquiry_notes && (
                            <div className="text-[11px] text-slate-500 mt-0.5 max-w-xs line-clamp-2">
                              Note: {ph.inquiry_notes}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-xs text-slate-600">
                          {ph.license_number}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="text-slate-700">{ph.address}</div>
                          {ph.phone_number && (
                            <div className="text-xs font-mono text-slate-500 mt-0.5">{ph.phone_number}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-xs">
                          {ph.operating_hours || '8:00 AM – 9:00 PM daily'}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-medium text-slate-800">{applicantName}</div>
                          <div className="text-xs font-mono text-teal-700">{applicantEmail}</div>
                          {emailSentInfo && (
                            <span className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              ✓ Email Sent
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                            pending
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openPharmacyDecisionModal(ph, 'approved')}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer"
                            >
                              <IonIcon icon={mailOutline} className="text-xs" />
                              Approve &amp; Email
                            </button>
                            <button
                              type="button"
                              onClick={() => openPharmacyDecisionModal(ph, 'rejected')}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold cursor-pointer"
                            >
                              <IonIcon icon={mailOutline} className="text-xs" />
                              Reject &amp; Email
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

        {/* Active & Historical Pharmacy Directory */}
        <section className="bg-white border border-slate-200 rounded-md overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              Marketplace Pharmacies Directory
              <span className="px-2 py-0.5 text-xs font-mono rounded bg-slate-200 text-slate-700">
                {pharmacies.length}
              </span>
            </h2>
            <span className="text-xs font-mono text-slate-500">Supabase `public.pharmacies`</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px] border-collapse">
              <thead className="bg-[#F4F6F3] border-b border-slate-200 text-[10.5px] font-mono uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-2.5 px-3">ID</th>
                  <th className="py-2.5 px-3">Pharmacy</th>
                  <th className="py-2.5 px-3">FDA License</th>
                  <th className="py-2.5 px-3">Contact Email &amp; Status</th>
                  <th className="py-2.5 px-3">Address</th>
                  <th className="py-2.5 px-3">Storefront</th>
                  <th className="py-2.5 px-3">Approval Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {pharmacies.map((ph) => {
                  const staffRep = data?.staff.find((s) => s.pharmacy_id === ph.pharmacy_id);
                  const contactEmail = ph.applicant_email || staffRep?.email || '—';
                  const emailSentInfo =
                    sentEmailsMap[ph.pharmacy_id] ||
                    (ph.admin_decision_note?.includes('[EMAIL_SENT]')
                      ? { sentAt: ph.decided_at || '', to: contactEmail, method: 'Email', decision: ph.approval_status }
                      : null);
                  return (
                    <tr key={ph.pharmacy_id} className="hover:bg-teal-50/30">
                      <td className="py-2.5 px-3 font-mono text-xs text-slate-500">
                        #{ph.pharmacy_id}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{ph.name}</td>
                      <td className="py-2.5 px-3 font-mono text-xs text-slate-600">
                        {ph.license_number}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-mono text-xs text-slate-600">{contactEmail}</div>
                        {emailSentInfo ? (
                          <span
                            className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                            title={`Email sent to ${emailSentInfo.to} via ${emailSentInfo.method}`}
                          >
                            ✓ Email Sent
                          </span>
                        ) : (
                          <span className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-slate-100">
                            Not Sent
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">{ph.address}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-mono font-medium ${
                            ph.is_open
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {ph.is_open ? 'Open' : 'Closed'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${
                            ph.approval_status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : ph.approval_status === 'rejected'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {ph.approval_status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              openPharmacyDecisionModal(
                                ph,
                                ph.approval_status === 'rejected' ? 'rejected' : 'approved'
                              )
                            }
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded border text-xs font-semibold cursor-pointer ${
                              emailSentInfo
                                ? 'border-emerald-600 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'border-teal-600 text-teal-700 hover:bg-teal-50'
                            }`}
                            title="Open templated email composer"
                          >
                            <IonIcon icon={mailOutline} className="text-xs" />
                            {emailSentInfo ? '✓ Email Sent' : 'Email'}
                          </button>
                          {ph.approval_status !== 'approved' && (
                            <button
                              type="button"
                              onClick={() => openPharmacyDecisionModal(ph, 'approved')}
                              className="px-2.5 py-1 rounded border border-emerald-600 text-emerald-700 hover:bg-emerald-50 text-xs font-semibold cursor-pointer"
                            >
                              Approve
                            </button>
                          )}
                          {ph.approval_status === 'approved' && (
                            <button
                              type="button"
                              onClick={() => openPharmacyDecisionModal(ph, 'rejected')}
                              className="px-2.5 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                            >
                              Suspend
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  };

  // 2. ACCOUNTS (Customers, Administrators, Pharmacy Staff & Branch Assignment)
  const renderAccounts = () => {
    const customers = data?.customers || [];
    const staffList = data?.staff || [];
    const admins = data?.admins || [];
    const pharmacies = data?.pharmacies || [];
    const suspendedCount = customers.filter((c) => c.account_status === 'disabled').length;

    return (
      <div className="space-y-6">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-widest text-teal-700 font-semibold">
            Marketplace
          </span>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">Accounts &amp; Staff Governance</h1>
          <p className="text-sm text-slate-600">
            Manage customers, promote users to Pharmacy Staff, assign staff to pharmacy branches, and govern platform administrators.
          </p>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200 rounded-md p-4">
            <div className="text-[10.5px] font-mono uppercase tracking-wider text-slate-500">
              Customers
            </div>
            <div className="text-2xl font-mono font-semibold text-slate-900 mt-1">
              {customers.length}
            </div>
          </div>
          <div
            className={`bg-white border rounded-md p-4 ${
              suspendedCount > 0
                ? 'border-amber-400 shadow-[inset_3px_0_0_#f59e0b]'
                : 'border-slate-200'
            }`}
          >
            <div className="text-[10.5px] font-mono uppercase tracking-wider text-slate-500">
              Suspended
            </div>
            <div className="text-2xl font-mono font-semibold text-slate-900 mt-1">
              {suspendedCount}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-md p-4">
            <div className="text-[10.5px] font-mono uppercase tracking-wider text-slate-500">
              Pharmacy staff
            </div>
            <div className="text-2xl font-mono font-semibold text-slate-900 mt-1">
              {staffList.length}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-md p-4">
            <div className="text-[10.5px] font-mono uppercase tracking-wider text-slate-500">
              Administrators
            </div>
            <div className="text-2xl font-mono font-semibold text-slate-900 mt-1">
              {admins.length}
            </div>
          </div>
        </div>

        {/* Customers Table */}
        <section className="bg-white border border-slate-200 rounded-md overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              Customers
              <span className="px-2 py-0.5 text-xs font-mono rounded bg-slate-200 text-slate-700">
                {customers.length}
              </span>
            </h2>
            <span className="text-xs font-mono text-slate-500">
              Promote any customer to Pharmacy Staff &amp; assign a branch
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px] border-collapse">
              <thead className="bg-[#F4F6F3] border-b border-slate-200 text-[10.5px] font-mono uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3">Email / Phone</th>
                  <th className="py-2.5 px-3 text-right">Orders</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {customers.map((c) => {
                  const isActive = (c.account_status || 'active') === 'active';
                  return (
                    <tr key={c.id} className="hover:bg-teal-50/30">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{c.full_name}</td>
                      <td className="py-2.5 px-3 font-mono text-xs text-slate-600">
                        <div>{c.email}</div>
                        {c.phone_number && (
                          <div className="text-[11px] text-slate-400">{c.phone_number}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">{c.orders_count || 0}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${
                            isActive
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {isActive ? 'active' : 'suspended'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5 flex-wrap justify-end">
                          <button
                            type="button"
                            onClick={() => openPromoteCustomer(c)}
                            className="px-2.5 py-1 rounded bg-teal-50 border border-teal-600 text-teal-800 hover:bg-teal-100 text-xs font-semibold cursor-pointer"
                            title="Promote this customer to Pharmacy Staff and assign them to a pharmacy branch"
                          >
                            Promote to Staff
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditCustomer(c)}
                            className="px-2.5 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleToggleAccount(
                                'customer',
                                c.id,
                                isActive ? 'active' : 'disabled',
                                c.full_name
                              )
                            }
                            className="px-2.5 py-1 rounded text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                          >
                            {isActive ? 'Suspend' : 'Reinstate'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveAccount('customer', c.id, c.full_name)}
                            className="px-2.5 py-1 rounded bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {customers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No customers yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Pharmacy Staff & Branch Assignment Panel */}
        <section className="bg-white border border-slate-200 rounded-md overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-slate-50/70">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <IonIcon icon={storefrontOutline} className="text-teal-700" />
                Pharmacy Staff &amp; Branch Assignment
                <span className="px-2 py-0.5 text-xs font-mono rounded bg-slate-200 text-slate-700">
                  {staffList.length}
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Assign or reassign staff to any pharmacy branch (`public.pharmacy_staff`), edit staff roles, or demote back to customer.
              </p>
            </div>
            <button
              type="button"
              onClick={openAddStaffModal}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer"
            >
              <IonIcon icon={addOutline} /> Add / Assign Staff
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px] border-collapse">
              <thead className="bg-[#F4F6F3] border-b border-slate-200 text-[10.5px] font-mono uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-2.5 px-3">Person</th>
                  <th className="py-2.5 px-3">Assigned Pharmacy Branch</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Branch Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {staffList.map((s) => {
                  const phStatus = s.pharmacy?.approval_status || 'pending';
                  const isRealProfile = !s.staff_id.startsWith('staff_');
                  return (
                    <tr key={s.staff_id} className="hover:bg-teal-50/30">
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900">{s.full_name}</div>
                        <div className="text-xs font-mono text-slate-500">{s.email}</div>
                        {s.phone_number && (
                          <div className="text-[11px] font-mono text-slate-400">{s.phone_number}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <select
                          aria-label={`Assign pharmacy branch for ${s.full_name}`}
                          value={s.pharmacy_id}
                          onChange={(e) => handleQuickAssignPharmacy(s, Number(e.target.value))}
                          className="text-xs border border-slate-300 rounded px-2 py-1 bg-white text-slate-800 font-medium focus:outline-none focus:border-teal-600"
                        >
                          {pharmacies.map((ph) => (
                            <option key={ph.pharmacy_id} value={ph.pharmacy_id}>
                              #{ph.pharmacy_id} · {ph.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${
                            s.is_owner
                              ? 'bg-teal-100 text-teal-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {s.is_owner ? 'Pharmacy Owner' : 'Pharmacy Staff'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${
                            s.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : s.status === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${
                            phStatus === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : phStatus === 'rejected'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {phStatus}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5 flex-wrap justify-end">
                          <button
                            type="button"
                            onClick={() => openEditStaffModal(s)}
                            className="px-2.5 py-1 rounded border border-teal-600 text-teal-800 hover:bg-teal-50 text-xs font-semibold cursor-pointer"
                          >
                            Edit / Assign
                          </button>
                          {isRealProfile && (
                            <button
                              type="button"
                              onClick={() => handleDemoteStaff(s)}
                              className="px-2.5 py-1 rounded border border-amber-400 bg-amber-50 text-amber-800 hover:bg-amber-100 text-xs font-semibold cursor-pointer"
                              title="Demote back to Customer role and unassign from branch"
                            >
                              Demote
                            </button>
                          )}
                          {s.status !== 'pending' && (
                            <button
                              type="button"
                              onClick={() =>
                                handleToggleAccount(
                                  'staff',
                                  s.staff_id,
                                  s.status,
                                  s.full_name,
                                  s.pharmacy_id
                                )
                              }
                              className="px-2.5 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                            >
                              {s.status === 'active' ? 'Disable' : 'Activate'}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              handleRemoveAccount('staff', s.staff_id, s.full_name, s.pharmacy_id)
                            }
                            className="px-2.5 py-1 rounded bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Administrators Panel */}
        <section className="bg-white border border-slate-200 rounded-md overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <IonIcon icon={shieldCheckmarkOutline} className="text-teal-700" />
              Administrators
              <span className="px-2 py-0.5 text-xs font-mono rounded bg-slate-200 text-slate-700">
                {admins.length}
              </span>
            </h2>
            <button
              type="button"
              onClick={() => {
                setEditingAdminId(null);
                setAdminForm({ name: '', email: '', phone: '' });
                setShowAdminModal(true);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer"
            >
              <IonIcon icon={addOutline} /> Add admin
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px] border-collapse">
              <thead className="bg-[#F4F6F3] border-b border-slate-200 text-[10.5px] font-mono uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {admins.map((a) => {
                  const isMe = a.id === user?.id || a.id === '11111111-1111-1111-1111-111111111111';
                  return (
                    <tr key={a.id} className="hover:bg-teal-50/30">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {a.full_name}{' '}
                        {isMe && <span className="text-xs font-normal text-slate-400">(you)</span>}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-xs text-slate-600">{a.email}</td>
                      <td className="py-2.5 px-3">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-teal-100 text-teal-800">
                          Administrator
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingAdminId(a.id);
                              setAdminForm({
                                name: a.full_name,
                                email: a.email || '',
                                phone: a.phone_number || '',
                              });
                              setShowAdminModal(true);
                            }}
                            className="px-2.5 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={isMe}
                            onClick={() => handleDeleteAdmin(a.id, a.full_name)}
                            className="px-2.5 py-1 rounded bg-rose-700 hover:bg-rose-800 disabled:opacity-40 text-white text-xs font-semibold cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  };

  // 3. HERBAL INDEX (MASTER OTC CATALOG GATEKEEPER)
  const renderCatalogAndInventory = () => {
    const catalog = data?.catalog || [];
    const rxCount = catalog.filter((m) => m.requires_prescription).length;
    const otcCount = catalog.length - rxCount;
    const categories = ['All', ...Array.from(new Set(catalog.map((m) => m.category)))];

    const filteredCatalog = catalog.filter((m) => {
      const q = catalogSearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        (m.brand_name || '').toLowerCase().includes(q) ||
        m.generic_name.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        m.dosage_form.toLowerCase().includes(q);
      const matchesCat =
        catalogCategory === 'All' || m.category.toLowerCase() === catalogCategory.toLowerCase();
      const matchesReg =
        catalogRegFilter === 'All' ||
        (catalogRegFilter === 'OTC' && !m.requires_prescription) ||
        (catalogRegFilter === 'Rx' && m.requires_prescription);
      return matchesSearch && matchesCat && matchesReg;
    });

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-widest text-teal-700 font-semibold">
              Master Catalog Governance
            </span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
              Herbal Index (Master OTC Gatekeeper)
            </h1>
            <p className="text-sm text-slate-600">
              Platform-wide master catalog — reclassify prescription items, import CSV datasets, and gatekeep OTC compliance. (Branch stock &amp; shelf pricing are managed by Pharmacy Staff.)
            </p>
          </div>
        </div>

        {/* Hard Rule Compliance Banner */}
        <div className="bg-teal-50 text-teal-900 border border-teal-200 rounded-2xl p-4 flex items-start gap-3 shadow-xs">
          <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
            <IonIcon icon={shieldCheckmarkOutline} className="text-lg" />
          </div>
          <div className="text-xs leading-relaxed text-teal-900">
            <span className="font-bold text-teal-800">CarePoint OTC Structural Gate Active: </span>
            Prescription medicines (<code className="text-rose-700 bg-rose-100 px-1 py-0.5 rounded font-mono">requires_prescription = true</code>) are
            structurally blocked at the database trigger &amp; master catalog level from ever reaching customer checkout.
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200 rounded-md p-4">
            <div className="text-[10.5px] font-mono uppercase tracking-wider text-slate-500">
              Master Listings
            </div>
            <div className="text-2xl font-mono font-semibold text-slate-900 mt-1">
              {catalog.length}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-md p-4">
            <div className="text-[10.5px] font-mono uppercase tracking-wider text-slate-500">
              Over the counter (OTC)
            </div>
            <div className="text-2xl font-mono font-semibold text-emerald-700 mt-1">
              {otcCount}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-md p-4">
            <div className="text-[10.5px] font-mono uppercase tracking-wider text-slate-500">
              Prescription (Rx Gated)
            </div>
            <div className="text-2xl font-mono font-semibold text-rose-700 mt-1">{rxCount}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-md p-4">
            <div className="text-[10.5px] font-mono uppercase tracking-wider text-slate-500">
              Categories
            </div>
            <div className="text-2xl font-mono font-semibold text-slate-900 mt-1">
              {categories.length - 1}
            </div>
          </div>
        </div>

        {/* Bulk CSV Action Bar + Add Medicine */}
        <section className="bg-white border border-slate-200 rounded-md p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <IonIcon icon={cloudUploadOutline} className="text-teal-700 text-base" />
              Master Catalog CSV Pipeline &amp; Direct Entry
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Export the 40-item Philippine OTC/Rx dataset, bulk-import CSV updates to Supabase, or add a medicine directly.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/philippines_otc_medicines.csv"
              download="philippines_otc_medicines.csv"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-semibold transition-colors"
            >
              <IonIcon icon={downloadOutline} />
              Download CSV (40 items)
            </a>
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv"
              onChange={handleCSVUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded border border-teal-700 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold cursor-pointer"
            >
              <IonIcon icon={cloudUploadOutline} />
              Import CSV Catalog
            </button>
            <button
              type="button"
              onClick={() => {
                setMedForm({
                  brand_name: '',
                  generic_name: '',
                  category: 'Pain Relief',
                  dosage_form: '500mg Tablet',
                  requires_prescription: false,
                  default_price: '12.00',
                  indications: '',
                  dosage_instructions: '',
                  packaging: '',
                  side_effects: '',
                  image_url: '/medicines/biogesic.jpg',
                });
                setShowMedFormModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer"
            >
              <IonIcon icon={addOutline} />
              Add Medicine
            </button>
          </div>
        </section>

        {/* Filter & Table Section */}
        <section className="bg-white border border-slate-200 rounded-md overflow-hidden">
          <div className="p-3.5 border-b border-slate-200 space-y-3 bg-slate-50/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <IonIcon
                  icon={searchOutline}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Search brand, generic name, category, or dosage..."
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-teal-600 text-slate-900"
                />
              </div>
              <div className="ops-seg inline-flex bg-[#E2E6E2] p-0.5 rounded border border-slate-300">
                {(['All', 'OTC', 'Rx'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setCatalogRegFilter(mode)}
                    className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
                      catalogRegFilter === mode
                        ? 'ops-seg-active bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {mode === 'All'
                      ? `All (${catalog.length})`
                      : mode === 'OTC'
                      ? `OTC (${otcCount})`
                      : `Rx (${rxCount})`}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCatalogCategory(cat)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap cursor-pointer ${
                    catalogCategory === cat
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px] border-collapse">
              <thead className="bg-[#F4F6F3] border-b border-slate-200 text-[10.5px] font-mono uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-2.5 px-3">ID</th>
                  <th className="py-2.5 px-3">Medicine</th>
                  <th className="py-2.5 px-3">Generic Compound</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Dosage Form</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredCatalog.map((m) => {
                  const slug = (m.brand_name || m.generic_name)
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-');
                  const imgSrc = resolveMedicineImageUrl(m.image_url || slug);
                  return (
                    <tr key={m.item_id} className="hover:bg-teal-50/30">
                      <td className="py-2 px-3 font-mono text-xs text-slate-400">
                        #{m.item_id}
                      </td>
                      <td className="py-2 px-3">
                        <div
                          onClick={() => setSelectedMed(m)}
                          className="flex items-center gap-2.5 cursor-pointer group"
                        >
                          <img
                            src={imgSrc}
                            alt={m.brand_name || m.generic_name}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/medicines/biogesic.jpg';
                            }}
                            className="w-8 h-8 rounded bg-slate-100 border border-slate-200 object-contain p-0.5 shrink-0"
                          />
                          <span className="font-semibold text-slate-900 group-hover:text-teal-700 underline-offset-2 group-hover:underline">
                            {m.brand_name || m.generic_name}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-slate-600 text-xs">{m.generic_name}</td>
                      <td className="py-2 px-3">
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-medium">
                          {m.category}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-500 text-xs">{m.dosage_form}</td>
                      <td className="py-2 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                            m.requires_prescription
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          }`}
                        >
                          {m.requires_prescription ? 'Rx' : 'OTC'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedMed(m)}
                            className="px-2 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-medium cursor-pointer"
                          >
                            Details
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleRx(m)}
                            className="px-2.5 py-1 rounded border border-slate-300 text-slate-800 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                          >
                            {m.requires_prescription ? '→ OTC' : '→ Rx'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCatalogItem(m)}
                            className="px-2.5 py-1 rounded bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  };

  // 4. ALL ORDERS (READ-ONLY PLATFORM-WIDE ORDER MONITOR)
  const renderOrders = () => {
    const orders = data?.orders || [];
    const gmv = orders
      .filter((o) => o.status === 'completed')
      .reduce((s, o) => s + Number(o.total_amount || 0), 0);
    const pendingCount = orders.filter((o) => o.status === 'pending').length;
    const inProgressCount = orders.filter(
      (o) => o.status === 'confirmed' || o.status === 'ready'
    ).length;

    const filteredOrders = orders.filter((o) => {
      const matchesStatus = orderStatusFilter === 'all' || o.status === orderStatusFilter;
      const q = orderSearch.trim().toLowerCase();
      const matchesQuery =
        !q ||
        String(o.order_id).includes(q) ||
        (o.customer_name || '').toLowerCase().includes(q) ||
        (o.pharmacy_name || '').toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-widest text-teal-700 font-semibold">
              Marketplace
            </span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">All orders</h1>
            <p className="text-sm text-slate-600">
              Live read-only monitor of every order across every pharmacy on the marketplace (synced via Supabase Realtime).
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-100 border border-slate-200 text-slate-600 text-xs font-mono">
            <IonIcon icon={receiptOutline} className="text-teal-700 text-sm" />
            Read-Only Monitor · Order fulfillment is handled by Pharmacy Staff
          </span>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200 rounded-md p-4">
            <div className="text-[10.5px] font-mono uppercase tracking-wider text-slate-500">
              Orders
            </div>
            <div className="text-2xl font-mono font-semibold text-slate-900 mt-1">
              {orders.length}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-md p-4">
            <div className="text-[10.5px] font-mono uppercase tracking-wider text-slate-500">
              Pending
            </div>
            <div className="text-2xl font-mono font-semibold text-amber-700 mt-1">
              {pendingCount}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-md p-4">
            <div className="text-[10.5px] font-mono uppercase tracking-wider text-slate-500">
              In progress
            </div>
            <div className="text-2xl font-mono font-semibold text-teal-700 mt-1">
              {inProgressCount}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-md p-4">
            <div className="text-[10.5px] font-mono uppercase tracking-wider text-slate-500">
              Completed value
            </div>
            <div className="text-2xl font-mono font-semibold text-emerald-700 mt-1">
              {money(gmv)}
            </div>
          </div>
        </div>

        <section className="bg-white border border-slate-200 rounded-md overflow-hidden">
          <div className="p-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70">
            <div className="ops-seg inline-flex flex-wrap gap-1 bg-[#E2E6E2] p-1 rounded border border-slate-300">
              {(['all', 'pending', 'confirmed', 'ready', 'completed', 'cancelled'] as const).map(
                (st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setOrderStatusFilter(st)}
                    className={`px-2.5 py-1 rounded text-xs font-semibold capitalize cursor-pointer ${
                      orderStatusFilter === st
                        ? 'ops-seg-active bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {st}
                  </button>
                )
              )}
            </div>

            <div className="relative w-full sm:w-64">
              <IonIcon
                icon={searchOutline}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Filter by #id, customer, pharmacy..."
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-teal-600 text-slate-900"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px] border-collapse">
              <thead className="bg-[#F4F6F3] border-b border-slate-200 text-[10.5px] font-mono uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-2.5 px-3">Order</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Pharmacy</th>
                  <th className="py-2.5 px-3">Method</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Placed</th>
                  <th className="py-2.5 px-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredOrders.map((o) => (
                  <tr key={o.order_id} className="hover:bg-teal-50/30">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                      #{o.order_id}
                    </td>
                    <td className="py-2.5 px-3 text-slate-800">{o.customer_name}</td>
                    <td className="py-2.5 px-3 text-slate-700">{o.pharmacy_name}</td>
                    <td className="py-2.5 px-3 capitalize text-xs font-mono text-slate-600">
                      {o.method}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                      {money(o.total_amount)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${
                          o.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : o.status === 'cancelled'
                            ? 'bg-rose-100 text-rose-800'
                            : o.status === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-teal-100 text-teal-800'
                        }`}
                      >
                        {o.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-xs text-slate-500">
                      {fmtDate(o.created_at)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => setInspectingOrder(o)}
                        className="px-2.5 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      No orders match this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  };

  // 5. FLAGS (TRUST & SAFETY)
  const renderFlags = () => {
    const flags = data?.flags || [];
    const openCount = flags.filter((f) => f.status === 'open').length;

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-widest text-teal-700 font-semibold">
              Trust &amp; safety
            </span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">Flags</h1>
            <p className="text-sm text-slate-600">
              Reports raised against customer and pharmacy accounts.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowFlagModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer"
          >
            <IonIcon icon={addOutline} className="text-base" />
            Raise Flag
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div
            className={`bg-white border rounded-md p-4 ${
              openCount > 0
                ? 'border-rose-400 shadow-[inset_3px_0_0_#e11d48]'
                : 'border-slate-200'
            }`}
          >
            <div className="text-[10.5px] font-mono uppercase tracking-wider text-slate-500">
              Open
            </div>
            <div className="text-2xl font-mono font-semibold text-slate-900 mt-1">{openCount}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-md p-4">
            <div className="text-[10.5px] font-mono uppercase tracking-wider text-slate-500">
              Resolved
            </div>
            <div className="text-2xl font-mono font-semibold text-emerald-700 mt-1">
              {flags.length - openCount}
            </div>
          </div>
        </div>

        <section className="bg-white border border-slate-200 rounded-md overflow-hidden">
          {flags.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-sm font-semibold text-slate-800">No flags.</div>
              <p className="text-xs text-slate-500 mt-0.5">
                Nothing has been reported. Flagged accounts will queue here for review.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px] border-collapse">
                <thead className="bg-[#F4F6F3] border-b border-slate-200 text-[10.5px] font-mono uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="py-2.5 px-3">Account</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Reason</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {flags.map((f) => (
                    <tr key={f.id} className="hover:bg-teal-50/30">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{f.targetName}</td>
                      <td className="py-2.5 px-3 font-mono text-xs text-slate-500">
                        {f.targetType}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">{f.reason}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${
                            f.status === 'open'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {f.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {f.status === 'open' && (
                          <button
                            type="button"
                            onClick={() => handleResolveFlag(f.id)}
                            className="px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer"
                          >
                            Resolve
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    );
  };

  // 6. TALLY (REPORTS & MARKETPLACE HEALTH)
  const renderReports = () => {
    const orders = data?.orders || [];
    const totalOrders = orders.length;
    const gmv = orders
      .filter((o) => o.status === 'completed')
      .reduce((s, o) => s + Number(o.total_amount || 0), 0);
    const activeCustomers = (data?.customers || []).filter(
      (c) => (c.account_status || 'active') === 'active'
    ).length;

    const byStatus = ORDER_STATUS_FLOW.map((s) => ({
      s,
      n: orders.filter((o) => o.status === s).length,
    }));
    const maxN = Math.max(1, ...byStatus.map((b) => b.n));

    return (
      <div className="space-y-6">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-widest text-teal-700 font-semibold">
            Insight
          </span>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">Tally</h1>
          <p className="text-sm text-slate-600">Marketplace health at a glance.</p>
        </div>

        {/* 6-KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white border border-slate-200 rounded-md p-3.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
              Total orders
            </div>
            <div className="text-xl font-mono font-semibold text-slate-900 mt-1">{totalOrders}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-md p-3.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
              Completed value
            </div>
            <div className="text-xl font-mono font-semibold text-emerald-700 mt-1">
              {money(gmv)}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-md p-3.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
              Active pharmacies
            </div>
            <div className="text-xl font-mono font-semibold text-slate-900 mt-1">
              {approvedPharmaciesCount}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-md p-3.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
              Active customers
            </div>
            <div className="text-xl font-mono font-semibold text-slate-900 mt-1">
              {activeCustomers}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-md p-3.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
              Avg. first reply
            </div>
            <div className="text-xl font-mono font-semibold text-slate-900 mt-1">
              {data?.avgResponseHours ? `${data.avgResponseHours} hrs` : '—'}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-md p-3.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
              Open flags
            </div>
            <div className="text-xl font-mono font-semibold text-rose-700 mt-1">
              {openFlagsCount}
            </div>
          </div>
        </div>

        {/* Orders by Status Horizontal Bar Chart */}
        <section className="bg-white border border-slate-200 rounded-md overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
            <h2 className="text-sm font-semibold text-slate-900">Orders by status</h2>
            <span className="text-xs font-mono text-slate-500">n = {totalOrders}</span>
          </div>
          <div className="p-4 space-y-2.5">
            {byStatus.map((b) => {
              const pct = totalOrders ? Math.round((b.n / totalOrders) * 100) : 0;
              const widthPct = b.n ? Math.max(4, (b.n / maxN) * 100) : 0;
              return (
                <div
                  key={b.s}
                  className="grid grid-cols-[120px_1fr] items-center gap-4 py-1 px-2 rounded hover:bg-slate-50"
                >
                  <span className="text-xs font-mono uppercase font-semibold text-slate-700">
                    {b.s}
                  </span>
                  <div className="flex items-center gap-3 border-l border-slate-300 pl-3 min-h-[24px]">
                    <div
                      className={`h-3.5 rounded-r transition-all ${
                        b.n > 0 ? 'bg-teal-600' : 'bg-slate-200 w-0.5'
                      }`}
                      style={{ width: b.n > 0 ? `${widthPct}%` : '2px' }}
                    />
                    <span className="text-xs font-mono text-slate-700">
                      {b.n} {totalOrders > 0 && <span className="text-slate-400">({pct}%)</span>}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    );
  };

  // 7. CONTENT MANAGEMENT SYSTEM (CMS)
  const renderContent = () => {
    const banners = data?.homepageBanners && data.homepageBanners.length > 0
      ? data.homepageBanners
      : DEFAULT_BANNERS;
    const activeBannerCount = banners.filter((b) => b.active !== false).length;
    const promotions = data?.promotions || [];
    const pages = data?.pages || {};
    const faqs = data?.faqs || [];

    return (
      <div className="space-y-6">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-widest text-teal-700 font-semibold">
            Publishing
          </span>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">Content</h1>
          <p className="text-sm text-slate-600">
            Manage all Customer Homepage Carousel Banners (including custom colors), promotions, static pages, and FAQs in real time.
          </p>
        </div>

        {/* Homepage Carousel Banners (All 4 Customer Slides + Custom Banners) */}
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="px-4 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-slate-50/70">
            <div className="flex items-center gap-2">
              <IonIcon icon={sparklesOutline} className="text-teal-700 text-base" />
              <h2 className="text-sm font-bold text-slate-900">
                Customer Homepage Carousel Banners
              </h2>
              <span className="px-2 py-0.5 text-xs font-mono rounded-full bg-teal-100 text-teal-800 font-semibold">
                {activeBannerCount} active / {banners.length} total
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!window.confirm('Restore the 4 default Customer Homepage Banners and colors?')) return;
                  commitCmsUpdate(
                    { banners: DEFAULT_BANNERS, banner: DEFAULT_BANNERS[0] },
                    'Restored default 4 Customer Homepage Carousel Banners'
                  );
                }}
                className="px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Reset 4 Defaults
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingBannerId(null);
                  setBannerForm({
                    id: 'banner_' + Date.now(),
                    badgeText: 'Special Announcement',
                    headline: '',
                    subtext: '',
                    ctaLabel: 'Find Medicine Fast',
                    ctaType: 'navigate_search',
                    bgGradient: 'from-[#0D9488] to-[#0F766E]',
                    bgColor: '#0D9488',
                    bgColorEnd: '#0F766E',
                    active: true,
                  });
                  setShowBannerModal(true);
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold cursor-pointer shadow-2xs"
              >
                <IonIcon icon={addOutline} /> Add Banner
              </button>
            </div>
          </div>

          <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            {banners.map((b, idx) => {
              const startHex = b.bgColor || DEFAULT_BANNERS[idx % DEFAULT_BANNERS.length].bgColor;
              const endHex = b.bgColorEnd || startHex;
              return (
                <div
                  key={b.id || idx}
                  className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-xs flex flex-col justify-between"
                >
                  {/* Exact Customer AdCarousel Banner Preview */}
                  <div
                    className={`p-5 sm:p-6 text-white relative min-h-[195px] flex flex-col justify-between overflow-hidden transition-opacity ${
                      b.active === false ? 'opacity-60' : ''
                    }`}
                    style={{
                      background: `linear-gradient(135deg, ${startHex} 0%, ${endHex} 100%)`,
                    }}
                  >
                    <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />

                    <div className="relative z-10">
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold backdrop-blur-sm bg-white/20 text-white border border-white/20">
                          <IonIcon icon={shieldCheckmarkOutline} className="text-xs" />
                          <span>{b.badgeText || `Slide #${idx + 1}`}</span>
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider font-bold ${
                            b.active !== false
                              ? 'bg-white/25 text-white border border-white/30'
                              : 'bg-slate-900/60 text-slate-200'
                          }`}
                        >
                          Slide {idx + 1} · {b.active !== false ? 'Live' : 'Hidden'}
                        </span>
                      </div>

                      <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white mb-1.5 leading-snug">
                        {b.headline}
                      </h3>

                      <p className="text-white/90 text-xs sm:text-sm leading-relaxed mb-4">
                        {b.subtext}
                      </p>
                    </div>

                    <div className="relative z-10 flex items-center justify-between pt-1">
                      <span
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-xs font-bold shadow-xs"
                        style={{ color: endHex }}
                      >
                        {b.ctaLabel || 'Explore'} →
                      </span>
                    </div>
                  </div>

                  {/* Admin Controls Bar */}
                  <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
                      <span
                        className="w-4 h-4 rounded-full border border-slate-300 shadow-2xs shrink-0"
                        style={{
                          background: `linear-gradient(135deg, ${startHex} 0%, ${endHex} 100%)`,
                        }}
                      />
                      <span>
                        {startHex.toUpperCase()} → {endHex.toUpperCase()}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingBannerId(b.id);
                          setBannerForm({
                            ...b,
                            bgColor: startHex,
                            bgColorEnd: endHex,
                          });
                          setShowBannerModal(true);
                        }}
                        className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                      >
                        Edit &amp; Color
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const next = banners.map((item) =>
                            item.id === b.id ? { ...item, active: !item.active } : item
                          );
                          commitCmsUpdate(
                            { banners: next, banner: next[0] },
                            `${b.active ? 'Hidden' : 'Activated'} homepage banner: ${b.headline}`
                          );
                        }}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                      >
                        {b.active !== false ? 'Hide' : 'Show'}
                      </button>
                      {banners.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (!window.confirm(`Remove banner "${b.headline}"?`)) return;
                            const next = banners.filter((item) => item.id !== b.id);
                            commitCmsUpdate(
                              { banners: next, banner: next[0] },
                              `Removed homepage banner: ${b.headline}`
                            );
                          }}
                          className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Promotions */}
        <section className="bg-white border border-slate-200 rounded-md overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <IonIcon icon={megaphoneOutline} className="text-teal-700" />
              Promotions
              <span className="px-2 py-0.5 text-xs font-mono rounded bg-slate-200 text-slate-700">
                {promotions.length}
              </span>
            </h2>
            <button
              type="button"
              onClick={() => {
                setEditingPromoId(null);
                setPromoForm({ title: '', text: '' });
                setShowPromoModal(true);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer"
            >
              <IonIcon icon={addOutline} /> Add promotion
            </button>
          </div>
          {promotions.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              No promotions yet. Active promotions appear as notices on the homepage.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px] border-collapse">
                <thead className="bg-[#F4F6F3] border-b border-slate-200 text-[10.5px] font-mono uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="py-2.5 px-3">Title</th>
                    <th className="py-2.5 px-3">Message</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {promotions.map((p) => (
                    <tr key={p.id} className="hover:bg-teal-50/30">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{p.title}</td>
                      <td className="py-2.5 px-3 text-slate-600">{p.text}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${
                            p.active
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {p.active ? 'active' : 'hidden'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPromoId(p.id);
                              setPromoForm({ title: p.title, text: p.text });
                              setShowPromoModal(true);
                            }}
                            className="px-2.5 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const next = promotions.map((x) =>
                                x.id === p.id ? { ...x, active: !x.active } : x
                              );
                              commitCmsUpdate(
                                { promotions: next },
                                `${p.active ? 'Hidden' : 'Activated'} promotion: ${p.title}`
                              );
                            }}
                            className="px-2.5 py-1 rounded text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                          >
                            {p.active ? 'Hide' : 'Show'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const next = promotions.filter((x) => x.id !== p.id);
                              commitCmsUpdate({ promotions: next }, `Removed promotion: ${p.title}`);
                            }}
                            className="px-2.5 py-1 rounded bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Static Pages */}
        <section className="bg-white border border-slate-200 rounded-md overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/70">
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <IonIcon icon={documentTextOutline} className="text-teal-700" />
              Static pages
            </h2>
          </div>
          <div className="divide-y divide-slate-200">
            {Object.entries(pages).map(([key, p]) => (
              <div
                key={key}
                className="px-4 py-3 grid grid-cols-[80px_1fr_auto] items-center gap-4"
              >
                <span className="font-mono text-xs text-teal-700">/{key}</span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900">{p.title}</div>
                  <div className="text-xs text-slate-500 truncate">{p.body}</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingPageKey(key);
                    setPageForm({ title: p.title, body: p.body });
                  }}
                  className="px-2.5 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                >
                  Edit
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* FAQs */}
        <section className="bg-white border border-slate-200 rounded-md overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <IonIcon icon={helpCircleOutline} className="text-teal-700" />
              FAQs
              <span className="px-2 py-0.5 text-xs font-mono rounded bg-slate-200 text-slate-700">
                {faqs.length}
              </span>
            </h2>
            <button
              type="button"
              onClick={() => {
                setEditingFaqId(null);
                setFaqForm({ q: '', a: '' });
                setShowFaqModal(true);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer"
            >
              <IonIcon icon={addOutline} /> Add FAQ
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px] border-collapse">
              <thead className="bg-[#F4F6F3] border-b border-slate-200 text-[10.5px] font-mono uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-2.5 px-3">Question</th>
                  <th className="py-2.5 px-3">Answer</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {faqs.map((f) => (
                  <tr key={f.id} className="hover:bg-teal-50/30">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{f.q}</td>
                    <td className="py-2.5 px-3 text-slate-600">{f.a}</td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingFaqId(f.id);
                            setFaqForm({ q: f.q, a: f.a });
                            setShowFaqModal(true);
                          }}
                          className="px-2.5 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const next = faqs.filter((x) => x.id !== f.id);
                            commitCmsUpdate({ faqs: next }, `Removed FAQ: ${f.q}`);
                          }}
                          className="px-2.5 py-1 rounded bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  };

  // 8. AUDIT TRAIL
  const renderAudit = () => {
    const allLogs = data?.auditLog || [];
    const q = auditFilter.trim().toLowerCase();
    const filtered = allLogs.filter(
      (e) => !q || e.action.toLowerCase().includes(q) || e.actor.toLowerCase().includes(q)
    );

    return (
      <div className="space-y-6">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-widest text-teal-700 font-semibold">
            Trust &amp; safety
          </span>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">Audit trail</h1>
          <p className="text-sm text-slate-600">
            A running record of administrative and account-management activity across the platform.
          </p>
        </div>

        <section className="bg-white border border-slate-200 rounded-md overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-4 bg-slate-50/70">
            <div className="relative flex-1 max-w-sm">
              <IonIcon
                icon={searchOutline}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Filter by actor or action…"
                value={auditFilter}
                onChange={(e) => setAuditFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-teal-600 text-slate-900"
              />
            </div>
            <span className="text-xs font-mono text-slate-500">
              {filtered.length} of {allLogs.length} entries
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12.5px] border-collapse">
              <thead className="bg-[#F4F6F3] border-b border-slate-200 text-[10.5px] font-mono uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Actor</th>
                  <th className="py-2.5 px-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-teal-50/30">
                    <td className="py-2 px-3 font-mono text-slate-500 whitespace-nowrap">
                      {fmtDate(e.at)}
                    </td>
                    <td className="py-2 px-3 font-medium text-slate-800 whitespace-nowrap">
                      {e.actor}
                    </td>
                    <td className="py-2 px-3 text-slate-700">{e.action}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-slate-500">
                      No audit entries match that filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  };

  // 9. PLATFORM SETTINGS
  const renderSettings = () => {
    return (
      <div className="space-y-6 pb-16">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-widest text-teal-700 font-semibold">
            System
          </span>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
            Settings &amp; configuration
          </h1>
          <p className="text-sm text-slate-600">
            Platform-wide rules every pharmacy and shopper follows.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* General Panel */}
          <section className="bg-white border border-slate-200 rounded-md p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <IonIcon icon={storefrontOutline} className="text-teal-700" />
              General
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Platform name
              </label>
              <input
                type="text"
                value={settingsDraft.platformName}
                onChange={(e) =>
                  setSettingsDraft({ ...settingsDraft, platformName: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:border-teal-600 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Support email
              </label>
              <input
                type="email"
                value={settingsDraft.supportEmail}
                onChange={(e) =>
                  setSettingsDraft({ ...settingsDraft, supportEmail: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:border-teal-600 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Currency</label>
              <select
                value={settingsDraft.currency}
                onChange={(e) =>
                  setSettingsDraft({
                    ...settingsDraft,
                    currency: e.target.value as PlatformSettings['currency'],
                  })
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded bg-white text-slate-900"
              >
                {Object.entries(CURRENCY_SYMBOLS).map(([code, c]) => (
                  <option key={code} value={code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Default low-stock alert
                </label>
                <input
                  type="number"
                  value={settingsDraft.lowStockThreshold}
                  onChange={(e) =>
                    setSettingsDraft({
                      ...settingsDraft,
                      lowStockThreshold: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Return window (days)
                </label>
                <input
                  type="number"
                  value={settingsDraft.returnWindowDays}
                  onChange={(e) =>
                    setSettingsDraft({
                      ...settingsDraft,
                      returnWindowDays: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded text-slate-900"
                />
              </div>
            </div>
          </section>

          {/* Shipping & Fulfillment Panel */}
          <section className="bg-white border border-slate-200 rounded-md p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <IonIcon icon={carOutline} className="text-teal-700" />
              Shipping &amp; fulfillment
            </h2>

            <div className="space-y-2">
              <label className="flex items-center gap-2.5 text-sm text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settingsDraft.pickupEnabled}
                  onChange={(e) =>
                    setSettingsDraft({ ...settingsDraft, pickupEnabled: e.target.checked })
                  }
                  className="rounded border-slate-300 text-teal-700"
                />
                <span>Allow in-store pickup</span>
              </label>

              <label className="flex items-center gap-2.5 text-sm text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settingsDraft.deliveryEnabled}
                  onChange={(e) =>
                    setSettingsDraft({ ...settingsDraft, deliveryEnabled: e.target.checked })
                  }
                  className="rounded border-slate-300 text-teal-700"
                />
                <span>Allow home delivery</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Delivery fee ({currencySymbol})
                </label>
                <input
                  type="number"
                  value={settingsDraft.deliveryFee}
                  onChange={(e) =>
                    setSettingsDraft({
                      ...settingsDraft,
                      deliveryFee: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Free delivery over (0 = never)
                </label>
                <input
                  type="number"
                  value={settingsDraft.freeDeliveryOver}
                  onChange={(e) =>
                    setSettingsDraft({
                      ...settingsDraft,
                      freeDeliveryOver: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded text-slate-900"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200">
              <div className="text-xs font-mono uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                <IonIcon icon={cardOutline} /> Sandbox Payment Options
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PAYMENT_METHODS.map((pm) => (
                  <label
                    key={pm.id}
                    className="flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={settingsDraft.payments[pm.id]}
                      onChange={(e) =>
                        setSettingsDraft({
                          ...settingsDraft,
                          payments: {
                            ...settingsDraft.payments,
                            [pm.id]: e.target.checked,
                          },
                        })
                      }
                      className="rounded border-slate-300 text-teal-700"
                    />
                    <span>{pm.label}</span>
                  </label>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Disabled methods disappear from sandbox checkout immediately.
              </p>
            </div>
          </section>
        </div>

        {/* Sticky Save Bar */}
        <div className="bg-white text-slate-700 border border-slate-200 px-4 py-3.5 rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-medium text-slate-600 flex items-center gap-2">
            <IonIcon icon={settingsOutline} className="text-teal-600 text-base" />
            Changes apply to every pharmacy and shopper as soon as you save.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetSettings}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Reset to defaults
            </button>
            <button
              type="button"
              onClick={handleSaveSettings}
              className="px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold cursor-pointer shadow-xs"
            >
              Save settings
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <IonSplitPane contentId="admin-main-content">
      {/* SIDE PANEL (Matches Customer SideMenu.tsx — Drawer on mobile, Pinned sidebar on desktop) */}
      <IonMenu
        contentId="admin-main-content"
        type="overlay"
        style={{ '--width': '256px', '--background': '#ffffff' } as React.CSSProperties}
      >
        <IonHeader className="ion-no-border bg-white border-b border-slate-100">
          <IonToolbar
            className="px-2 pt-1 pb-1 bg-white"
            style={{ '--background': '#ffffff' } as React.CSSProperties}
          >
            <div className="flex items-center gap-2.5 px-3 py-1.5">
              <img
                src="/final-logo.png"
                alt="CarePoint Logo"
                className="h-8 w-8 object-contain"
              />
              <div>
                <div className="text-xl font-bold text-teal-700 tracking-tight leading-none">
                  CarePoint
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">
                  Admin Console
                </div>
              </div>
            </div>
          </IonToolbar>
        </IonHeader>

        <IonContent
          scrollY={true}
          style={{ '--background': '#ffffff', '--overflow': 'auto' } as React.CSSProperties}
        >
          <div className="flex flex-col justify-between py-2 pb-8">
            <div>
              {/* Live Marketplace Status Pill */}
              <div className="mx-3 mb-2.5 p-2.5 rounded-2xl bg-teal-50/70 border border-teal-100">
                <div className="text-[10px] font-bold uppercase tracking-wider text-teal-700">
                  Environment
                </div>
                <div className="font-bold text-xs text-slate-900 mt-0.5 truncate">
                  {data?.settings.platformName || 'CarePoint'} Marketplace
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] font-medium text-teal-700">
                  <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                  <span>
                    Live · {approvedPharmaciesCount}{' '}
                    {approvedPharmaciesCount === 1 ? 'pharmacy' : 'pharmacies'}
                  </span>
                </div>
              </div>

              {/* Navigation Groups */}
              {navGroups.map((g) => (
                <IonList key={g.group} lines="none" className="px-2 py-0.5 bg-transparent">
                  <IonListHeader className="px-3 mb-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 min-h-0">
                    <IonLabel className="my-0">{g.group}</IonLabel>
                  </IonListHeader>
                  {g.items.map((item) => {
                    const isActive = activeTab === item.key;
                    return (
                      <IonMenuToggle key={item.key} autoHide={false}>
                        <IonItem
                          button
                          detail={false}
                          onClick={() => setActiveTab(item.key)}
                          className={`rounded-xl mb-0.5 font-medium text-sm transition-colors ${
                            isActive
                              ? 'text-teal-700 bg-teal-50 font-bold'
                              : 'text-slate-600'
                          }`}
                          style={
                            {
                              '--background': isActive ? '#f0fdfa' : 'transparent',
                              '--padding-start': '12px',
                              '--min-height': '40px',
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
                              className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-teal-100 text-teal-800"
                            >
                              {item.badge}
                            </span>
                          )}
                        </IonItem>
                      </IonMenuToggle>
                    );
                  })}
                </IonList>
              ))}
            </div>

            {/* Sidebar Footer (Admin Profile + Sign Out) */}
            <div className="px-3 pt-3 mt-2 border-t border-slate-100 space-y-1.5">
              <div className="flex items-center gap-2.5 px-2 py-1">
                <span className="w-8 h-8 rounded-full bg-teal-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  {initials(actorName)}
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 truncate">{actorName}</div>
                  <div className="text-[11px] text-slate-500">System Administrator</div>
                </div>
              </div>

              <IonMenuToggle autoHide={false}>
                <IonItem
                  button
                  detail={false}
                  onClick={handleLogout}
                  className="rounded-xl text-rose-600 font-semibold text-sm"
                  style={
                    {
                      '--background': 'transparent',
                      '--padding-start': '12px',
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

      {/* MAIN PAGE CONTENT (Matches Customer Home.tsx + CustomerApp.tsx) */}
      <IonPage id="admin-main-content">
        <IonHeader className="ion-no-border bg-white border-b border-slate-200 shadow-2xs z-30">
          <IonToolbar
            className="bg-white"
            style={{ '--background': '#ffffff', backgroundColor: '#ffffff' } as React.CSSProperties}
          >
            <div slot="start" className="flex items-center gap-2 pl-2">
              <IonButtons className="md:hidden">
                <IonMenuButton className="text-slate-900" />
              </IonButtons>
              <img
                src="/final-logo.png"
                alt="CarePoint Logo"
                className="h-8 w-8 object-contain shrink-0"
              />
              <span className="text-base sm:text-xl font-bold text-teal-700 tracking-tight hidden min-[400px]:inline">
                CarePoint
              </span>
              <span className="text-slate-300 hidden sm:inline">/</span>
              <span className="text-sm font-semibold text-slate-600 truncate hidden sm:inline">
                {activeTabLabel}
              </span>
            </div>

            <div slot="end" className="flex items-center gap-2 pr-2">
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200 text-[11px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                Live sync
              </span>

              <button
                type="button"
                onClick={() => loadSnapshot()}
                title="Refresh from Supabase"
                className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer flex items-center justify-center shrink-0 active:scale-95 transition-all"
              >
                <IonIcon
                  icon={refreshOutline}
                  className={`text-sm ${isRefreshing ? 'animate-spin' : ''}`}
                />
              </button>

              <span
                title={actorName}
                className="w-8 h-8 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center shrink-0"
              >
                {initials(actorName)}
              </span>
            </div>
          </IonToolbar>
        </IonHeader>

        <IonContent style={{ '--background': '#F8FAFC' } as React.CSSProperties}>
          <div className="ops-admin-root min-h-full bg-slate-50 text-slate-900 pb-24 md:pb-10">
            {/* Main Content Area */}
            <main className="w-full max-w-7xl mx-auto p-4 md:p-6">
              {isLoading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-600">
                  <IonSpinner name="crescent" color="primary" />
                  <span className="text-xs font-medium text-slate-500">
                    Syncing CarePoint Admin Console with Supabase...
                  </span>
                </div>
              ) : (
                <>
                  {activeTab === 'approvals' && renderApprovals()}
                  {activeTab === 'accounts' && renderAccounts()}
                  {activeTab === 'catalog' && renderCatalogAndInventory()}
                  {activeTab === 'orders' && renderOrders()}
                  {activeTab === 'flags' && renderFlags()}
                  {activeTab === 'reports' && renderReports()}
                  {activeTab === 'content' && renderContent()}
                  {activeTab === 'audit' && renderAudit()}
                  {activeTab === 'settings' && renderSettings()}
                </>
              )}
            </main>

            {/* MOBILE BOTTOM TAB BAR (White bar with Teal-600 active state, matching CustomerApp.tsx) */}
            <nav
              aria-label="Sections"
              className="ops-bottom-nav md:hidden fixed bottom-0 left-0 right-0 z-40 flex bg-white border-t border-slate-200 shadow-sm px-1.5 py-1"
            >
              {allTabs.slice(0, 4).map((t) => {
                const isActive = activeTab === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setActiveTab(t.key)}
                    className={`flex-1 flex flex-col items-center justify-center py-1.5 text-[11px] font-semibold ${
                      isActive ? 'ops-bottom-active text-teal-600' : 'text-slate-400'
                    }`}
                  >
                    <span
                      className={`relative px-3 py-0.5 rounded-full ${
                        isActive ? 'bg-teal-50 text-teal-600' : ''
                      }`}
                    >
                      <IonIcon icon={t.icon} className="text-lg" />
                      {!!t.badge && t.badge > 0 && (
                        <span className="absolute top-0.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />
                      )}
                    </span>
                    <span className="mt-0.5 truncate">{t.label}</span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setMobileMoreOpen(true)}
                className={`flex-1 flex flex-col items-center justify-center py-1.5 text-[11px] font-semibold ${
                  allTabs.slice(4).some((t) => t.key === activeTab)
                    ? 'ops-bottom-active text-teal-600'
                    : 'text-slate-400'
                }`}
              >
                <span
                  className={`px-3 py-0.5 rounded-full ${
                    allTabs.slice(4).some((t) => t.key === activeTab)
                      ? 'bg-teal-50 text-teal-600'
                      : ''
                  }`}
                >
                  <IonIcon icon={ellipsisHorizontalOutline} className="text-lg" />
                </span>
                <span className="mt-0.5">More</span>
              </button>
            </nav>

            {/* MOBILE MORE SHEET */}
            {mobileMoreOpen && (
              <div
                onClick={() => setMobileMoreOpen(false)}
                className="md:hidden fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-end"
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="w-full bg-white rounded-t-3xl p-5 space-y-3 shadow-xl border-t border-slate-100"
                >
                  <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto" />
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
                    More Admin Modules
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {allTabs.slice(4).map((t) => (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => {
                          setActiveTab(t.key);
                          setMobileMoreOpen(false);
                        }}
                        className={`flex items-center gap-2.5 p-3 rounded-2xl border text-left text-xs font-semibold ${
                          activeTab === t.key
                            ? 'border-teal-600 bg-teal-50 text-teal-800'
                            : 'border-slate-200 bg-white text-slate-700'
                        }`}
                      >
                        <IonIcon icon={t.icon} className="text-base text-teal-600" />
                        <span>{t.label}</span>
                      </button>
                    ))}
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex justify-end">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="px-3.5 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold flex items-center gap-1.5"
                    >
                      <IonIcon icon={logOutOutline} /> Sign Out
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

        {/* ============================================================================
            MODALS
            ============================================================================ */}

        {/* 1A. Promote Customer to Pharmacy Staff Modal */}
        <IonModal isOpen={!!promotingCustomer} onDidDismiss={() => setPromotingCustomer(null)}>
          <div className="ops-admin-modal p-6 bg-white text-slate-900 min-h-full flex flex-col justify-between max-w-lg mx-auto w-full">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-teal-700">
                    Staff Governance &amp; Branch Assignment
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">
                    Promote to Pharmacy Staff
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setPromotingCustomer(null)}
                  className="p-1 text-slate-400 hover:text-slate-700"
                >
                  <IonIcon icon={closeOutline} className="text-xl" />
                </button>
              </div>

              {promotingCustomer && (
                <div className="p-3.5 rounded-lg bg-teal-50/70 border border-teal-200 text-xs space-y-1">
                  <div className="font-bold text-slate-900 text-sm">
                    {promotingCustomer.full_name}
                  </div>
                  <div className="font-mono text-slate-600">{promotingCustomer.email}</div>
                  {promotingCustomer.phone_number && (
                    <div className="font-mono text-slate-500">{promotingCustomer.phone_number}</div>
                  )}
                  <p className="text-[11px] text-teal-800 pt-1">
                    Promoting this account updates their `public.profiles` role to <code>staff</code> and binds them to the selected pharmacy branch in `public.pharmacy_staff`.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assign to Pharmacy Branch
                </label>
                <select
                  value={promoteForm.pharmacyId}
                  onChange={(e) =>
                    setPromoteForm({ ...promoteForm, pharmacyId: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded bg-white"
                >
                  {(data?.pharmacies || []).map((ph) => (
                    <option key={ph.pharmacy_id} value={ph.pharmacy_id}>
                      #{ph.pharmacy_id} · {ph.name} ({ph.approval_status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Branch Role
                </label>
                <select
                  value={promoteForm.isOwner ? 'owner' : 'staff'}
                  onChange={(e) =>
                    setPromoteForm({ ...promoteForm, isOwner: e.target.value === 'owner' })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded bg-white"
                >
                  <option value="staff">Pharmacy Staff (Order Fulfillment &amp; Stock)</option>
                  <option value="owner">Pharmacy Owner (Storefront Management &amp; Full Access)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setPromotingCustomer(null)}
                className="px-4 py-2 rounded text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePromoteCustomerToStaff}
                className="px-4 py-2 rounded bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer"
              >
                Promote &amp; Assign Branch
              </button>
            </div>
          </div>
        </IonModal>

        {/* 1B. Add / Edit & Assign Pharmacy Staff Modal */}
        <IonModal isOpen={showStaffModal} onDidDismiss={() => setShowStaffModal(false)}>
          <div className="ops-admin-modal p-6 bg-white text-slate-900 min-h-full flex flex-col justify-between max-w-lg mx-auto w-full">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-teal-700">
                    Pharmacy Staff &amp; Branch Assignment
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">
                    {editingStaff ? `Edit / Reassign ${editingStaff.full_name}` : 'Add & Assign Pharmacy Staff'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowStaffModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-700"
                >
                  <IonIcon icon={closeOutline} className="text-xl" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Staff Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. RPh. Sofia Reyes"
                  value={staffForm.name}
                  onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="staff@pharmacy.ph"
                    value={staffForm.email}
                    onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    placeholder="09170000000"
                    value={staffForm.phone}
                    onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assigned Pharmacy Branch (`public.pharmacy_staff`)
                </label>
                <select
                  value={staffForm.pharmacyId}
                  onChange={(e) =>
                    setStaffForm({ ...staffForm, pharmacyId: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded bg-white"
                >
                  {(data?.pharmacies || []).map((ph) => (
                    <option key={ph.pharmacy_id} value={ph.pharmacy_id}>
                      #{ph.pharmacy_id} · {ph.name} ({ph.approval_status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Branch Role
                  </label>
                  <select
                    value={staffForm.isOwner ? 'owner' : 'staff'}
                    onChange={(e) =>
                      setStaffForm({ ...staffForm, isOwner: e.target.value === 'owner' })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded bg-white"
                  >
                    <option value="staff">Pharmacy Staff (Order Fulfillment &amp; Stock)</option>
                    <option value="owner">Pharmacy Owner (Storefront Management &amp; Full Access)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Account Status
                  </label>
                  <select
                    value={staffForm.status}
                    onChange={(e) =>
                      setStaffForm({
                        ...staffForm,
                        status: e.target.value as 'active' | 'pending' | 'rejected' | 'disabled',
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowStaffModal(false)}
                className="px-4 py-2 rounded text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveStaffAccount}
                className="px-4 py-2 rounded bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer"
              >
                {editingStaff ? 'Save & Update Branch' : 'Create & Assign Staff'}
              </button>
            </div>
          </div>
        </IonModal>

        {/* 2. Edit Customer Account Modal */}
        <IonModal isOpen={!!editingCustomer} onDidDismiss={() => setEditingCustomer(null)}>
          <div className="ops-admin-modal p-6 bg-white text-slate-900 min-h-full flex flex-col justify-between max-w-lg mx-auto w-full">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-teal-700">
                    Customer account
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">
                    Edit {editingCustomer?.full_name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="p-1 text-slate-400 hover:text-slate-700"
                >
                  <IonIcon icon={closeOutline} className="text-xl" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Name</label>
                <input
                  type="text"
                  value={custForm.name}
                  onChange={(e) => setCustForm({ ...custForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={custForm.email}
                  onChange={(e) => setCustForm({ ...custForm, email: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={custForm.phone}
                  onChange={(e) => setCustForm({ ...custForm, phone: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                <select
                  value={custForm.status}
                  onChange={(e) =>
                    setCustForm({ ...custForm, status: e.target.value as 'active' | 'disabled' })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded bg-white"
                >
                  <option value="active">Active</option>
                  <option value="disabled">Suspended</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setEditingCustomer(null)}
                className="px-4 py-2 rounded text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCustomer}
                className="px-4 py-2 rounded bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold"
              >
                Save
              </button>
            </div>
          </div>
        </IonModal>

        {/* 3. Add / Edit Administrator Modal */}
        <IonModal isOpen={showAdminModal} onDidDismiss={() => setShowAdminModal(false)}>
          <div className="ops-admin-modal p-6 bg-white text-slate-900 min-h-full flex flex-col justify-between max-w-lg mx-auto w-full">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-teal-700">
                    Administrators
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">
                    {editingAdminId ? 'Edit administrator' : 'Add an administrator'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAdminModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-700"
                >
                  <IonIcon icon={closeOutline} className="text-xl" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="Full name"
                  value={adminForm.name}
                  onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  placeholder="admin@carepoint.ph"
                  value={adminForm.email}
                  onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contact Phone
                </label>
                <input
                  type="text"
                  placeholder="09170000000"
                  value={adminForm.phone}
                  onChange={(e) => setAdminForm({ ...adminForm, phone: e.target.value })}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowAdminModal(false)}
                className="px-4 py-2 rounded text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAdmin}
                className="px-4 py-2 rounded bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold"
              >
                {editingAdminId ? 'Save' : 'Create'}
              </button>
            </div>
          </div>
        </IonModal>

        {/* 4. Add / Edit Master Catalog Medicine Modal */}
        <IonModal isOpen={showMedFormModal} onDidDismiss={() => setShowMedFormModal(false)}>
          <div className="ops-admin-modal p-6 bg-white text-slate-900 min-h-full flex flex-col justify-between max-w-xl mx-auto w-full overflow-y-auto">
            <div className="space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-teal-700">
                    Herbal Index · Master Catalog
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">
                    {medForm.item_id ? 'Edit Medicine' : 'Add Medicine to Master Catalog'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMedFormModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-700"
                >
                  <IonIcon icon={closeOutline} className="text-xl" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Brand Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Biogesic"
                    value={medForm.brand_name}
                    onChange={(e) => setMedForm({ ...medForm, brand_name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Generic Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Paracetamol"
                    value={medForm.generic_name}
                    onChange={(e) => setMedForm({ ...medForm, generic_name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category
                  </label>
                  <select
                    value={medForm.category}
                    onChange={(e) => setMedForm({ ...medForm, category: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded bg-white"
                  >
                    {[
                      'Pain Relief',
                      'Cold & Flu',
                      'Digestive',
                      'Vitamins',
                      'Allergy',
                      'First Aid',
                      'Antibiotic',
                      'Blood Pressure',
                    ].map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Dosage Form
                  </label>
                  <input
                    type="text"
                    value={medForm.dosage_form}
                    onChange={(e) => setMedForm({ ...medForm, dosage_form: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Default Price (₱)
                  </label>
                  <input
                    type="number"
                    value={medForm.default_price}
                    onChange={(e) => setMedForm({ ...medForm, default_price: e.target.value })}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2.5 p-3 rounded bg-slate-50 border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={medForm.requires_prescription}
                  onChange={(e) =>
                    setMedForm({ ...medForm, requires_prescription: e.target.checked })
                  }
                  className="rounded border-slate-300 text-rose-600"
                />
                <span className="text-xs font-semibold text-slate-800">
                  Requires Prescription (Rx Only — Structurally blocked from online checkout)
                </span>
              </label>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Indications
                </label>
                <textarea
                  rows={2}
                  value={medForm.indications}
                  onChange={(e) => setMedForm({ ...medForm, indications: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Dosage &amp; Administration
                </label>
                <textarea
                  rows={2}
                  value={medForm.dosage_instructions}
                  onChange={(e) => setMedForm({ ...medForm, dosage_instructions: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 mt-4">
              <button
                type="button"
                onClick={() => setShowMedFormModal(false)}
                className="px-4 py-2 rounded text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCatalogMedicine}
                className="px-4 py-2 rounded bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold"
              >
                Save to Master Catalog
              </button>
            </div>
          </div>
        </IonModal>

        {/* 5. Medicine Details Modal */}
        <IonModal isOpen={!!selectedMed} onDidDismiss={() => setSelectedMed(null)}>
          {selectedMed && (
            <div className="ops-admin-modal p-6 bg-white text-slate-900 min-h-full flex flex-col justify-between max-w-xl mx-auto w-full overflow-y-auto">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <img
                      src={resolveMedicineImageUrl(selectedMed.image_url || selectedMed.brand_name || selectedMed.generic_name)}
                      alt={selectedMed.brand_name || selectedMed.generic_name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/medicines/biogesic.jpg';
                      }}
                      className="w-12 h-12 rounded bg-slate-100 border border-slate-200 p-1 object-contain"
                    />
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        {selectedMed.brand_name || selectedMed.generic_name}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {selectedMed.generic_name} · {selectedMed.dosage_form}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedMed(null)}
                    className="p-1 text-slate-400 hover:text-slate-700"
                  >
                    <IonIcon icon={closeOutline} className="text-xl" />
                  </button>
                </div>

                <div
                  className={`p-3 rounded border text-xs font-semibold flex items-center justify-between ${
                    selectedMed.requires_prescription
                      ? 'bg-rose-50 border-rose-200 text-rose-800'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  }`}
                >
                  <span>
                    {selectedMed.requires_prescription
                      ? 'Prescription Gated (Online Checkout Structurally Blocked)'
                      : 'OTC Approved (Available for Customer Checkout)'}
                  </span>
                  <span className="font-mono">ID #{selectedMed.item_id}</span>
                </div>

                {selectedMed.indications && (
                  <div>
                    <h4 className="text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-1">
                      Therapeutic Indications
                    </h4>
                    <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded border border-slate-200">
                      {selectedMed.indications}
                    </p>
                  </div>
                )}

                {selectedMed.dosage_instructions && (
                  <div>
                    <h4 className="text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-1">
                      Dosage &amp; Administration
                    </h4>
                    <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded border border-slate-200">
                      {selectedMed.dosage_instructions}
                    </p>
                  </div>
                )}

                {selectedMed.side_effects && (
                  <div>
                    <h4 className="text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-1">
                      Safety &amp; Side Effects
                    </h4>
                    <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded border border-slate-200">
                      {selectedMed.side_effects}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-200 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    handleToggleRx(selectedMed);
                    setSelectedMed(null);
                  }}
                  className="px-3 py-1.5 rounded border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Reclassify to {selectedMed.requires_prescription ? 'OTC' : 'Rx Only'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMed(null)}
                  className="px-4 py-1.5 rounded bg-slate-900 text-white text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </IonModal>

        {/* 6. CSV Preview Modal */}
        <IonModal isOpen={showCSVPreviewModal} onDidDismiss={() => setShowCSVPreviewModal(false)}>
          <div className="ops-admin-modal p-6 bg-white text-slate-900 min-h-full flex flex-col justify-between max-w-4xl mx-auto w-full overflow-y-auto">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    CSV Import Preview ({parsedRows.length} items parsed)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Verify parsed medicines before committing to Supabase `master_catalog`.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCSVPreviewModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-700"
                >
                  <IonIcon icon={closeOutline} className="text-xl" />
                </button>
              </div>

              <div className="my-4 max-h-96 overflow-y-auto border border-slate-200 rounded">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 sticky top-0 border-b border-slate-200 font-mono">
                    <tr>
                      <th className="p-2">Brand</th>
                      <th className="p-2">Generic</th>
                      <th className="p-2">Category</th>
                      <th className="p-2">Dosage</th>
                      <th className="p-2">Regulation</th>
                      <th className="p-2">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {parsedRows.map((r, i) => (
                      <tr key={i}>
                        <td className="p-2 font-bold">{r.brand_name}</td>
                        <td className="p-2 text-slate-600">{r.generic_name}</td>
                        <td className="p-2">{r.category}</td>
                        <td className="p-2 text-slate-500">{r.dosage_form}</td>
                        <td className="p-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                              r.requires_prescription
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {r.requires_prescription ? 'Rx Only' : 'OTC'}
                          </span>
                        </td>
                        <td className="p-2 font-mono">{money(r.default_price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <span className="text-xs text-slate-500">
                {parsedRows.filter((r) => !r.requires_prescription).length} OTC ·{' '}
                {parsedRows.filter((r) => r.requires_prescription).length} Rx
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCSVPreviewModal(false)}
                  className="px-4 py-2 rounded text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isUploadingCSV}
                  onClick={commitCSVImport}
                  className="px-4 py-2 rounded bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold"
                >
                  {isUploadingCSV ? 'Importing...' : 'Commit & Populate Master Catalog'}
                </button>
              </div>
            </div>
          </div>
        </IonModal>

        {/* 7. Inspect Order Modal */}
        <IonModal isOpen={!!inspectingOrder} onDidDismiss={() => setInspectingOrder(null)}>
          {inspectingOrder && (
            <div className="ops-admin-modal p-6 bg-white text-slate-900 min-h-full flex flex-col justify-between max-w-lg mx-auto w-full">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-teal-700">
                      Order Detail
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

                <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded border border-slate-200">
                  <div>
                    <div className="text-slate-400 font-mono uppercase text-[10px]">Customer</div>
                    <div className="font-semibold text-slate-900 mt-0.5">
                      {inspectingOrder.customer_name}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400 font-mono uppercase text-[10px]">Pharmacy</div>
                    <div className="font-semibold text-slate-900 mt-0.5">
                      {inspectingOrder.pharmacy_name}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400 font-mono uppercase text-[10px]">
                      Fulfillment
                    </div>
                    <div className="font-semibold capitalize text-slate-800 mt-0.5">
                      {inspectingOrder.method}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400 font-mono uppercase text-[10px]">Placed</div>
                    <div className="font-mono text-slate-700 mt-0.5">
                      {fmtDate(inspectingOrder.created_at)}
                    </div>
                  </div>
                </div>

                {inspectingOrder.delivery_address && (
                  <div className="text-xs bg-slate-50 p-3 rounded border border-slate-200">
                    <div className="text-slate-400 font-mono uppercase text-[10px]">
                      Delivery Address
                    </div>
                    <div className="text-slate-800 mt-0.5">{inspectingOrder.delivery_address}</div>
                  </div>
                )}

                <div>
                  <h4 className="text-xs font-mono uppercase tracking-wider text-slate-500 mb-2">
                    Ordered Items
                  </h4>
                  {Array.isArray(inspectingOrder.items) && inspectingOrder.items.length > 0 ? (
                    <div className="border border-slate-200 rounded divide-y divide-slate-200 text-xs">
                      {inspectingOrder.items.map((it: any, idx: number) => (
                        <div key={idx} className="p-2.5 flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-slate-900">
                              {it.item?.brand_name || it.item?.generic_name || `Item #${it.item_id}`}
                            </span>
                            <span className="text-slate-500 ml-2">× {it.quantity}</span>
                          </div>
                          <span className="font-mono font-semibold">
                            {money(Number(it.unit_price) * Number(it.quantity))}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">
                      Order total recorded: {money(inspectingOrder.total_amount)}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-sm font-bold">
                  <span>Total Amount</span>
                  <span className="font-mono text-teal-800">
                    {money(inspectingOrder.total_amount)}
                  </span>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setInspectingOrder(null)}
                  className="px-4 py-2 rounded bg-slate-900 text-white text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </IonModal>

        {/* 8. Raise Flag Modal */}
        <IonModal isOpen={showFlagModal} onDidDismiss={() => setShowFlagModal(false)}>
          <div className="ops-admin-modal p-6 bg-white text-slate-900 min-h-full flex flex-col justify-between max-w-lg mx-auto w-full">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-teal-700">
                    Trust &amp; safety
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">Raise Account Flag</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFlagModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-700"
                >
                  <IonIcon icon={closeOutline} className="text-xl" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Account Type
                </label>
                <select
                  value={flagForm.targetType}
                  onChange={(e) =>
                    setFlagForm({
                      ...flagForm,
                      targetType: e.target.value as 'customer' | 'staff' | 'pharmacy',
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded bg-white"
                >
                  <option value="customer">Customer</option>
                  <option value="staff">Pharmacy Staff</option>
                  <option value="pharmacy">Pharmacy Storefront</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Account Name
                </label>
                <input
                  type="text"
                  placeholder="Account or Pharmacy name"
                  value={flagForm.targetName}
                  onChange={(e) => setFlagForm({ ...flagForm, targetName: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason</label>
                <textarea
                  rows={3}
                  placeholder="Describe why this account is being flagged for review..."
                  value={flagForm.reason}
                  onChange={(e) => setFlagForm({ ...flagForm, reason: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowFlagModal(false)}
                className="px-4 py-2 rounded text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateFlag}
                className="px-4 py-2 rounded bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold"
              >
                Submit Flag
              </button>
            </div>
          </div>
        </IonModal>

        {/* 9. CMS Banner Modal (with Color Picker & Live Customer Preview) */}
        <IonModal isOpen={showBannerModal} onDidDismiss={() => setShowBannerModal(false)}>
          <div className="ops-admin-modal p-6 bg-white text-slate-900 min-h-full flex flex-col justify-between max-w-xl mx-auto w-full overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-teal-700">
                    Customer Carousel Slide
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">
                    {editingBannerId ? 'Edit Banner & Color' : 'Add New Homepage Banner'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBannerModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-700"
                >
                  <IonIcon icon={closeOutline} className="text-xl" />
                </button>
              </div>

              {/* Live Customer Preview Card */}
              <div>
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-1.5">
                  Live Customer Preview
                </div>
                <div
                  className="p-5 rounded-2xl text-white relative overflow-hidden shadow-sm flex flex-col justify-between min-h-[160px]"
                  style={{
                    background: `linear-gradient(135deg, ${bannerForm.bgColor || '#0D9488'} 0%, ${
                      bannerForm.bgColorEnd || bannerForm.bgColor || '#0F766E'
                    } 100%)`,
                  }}
                >
                  <div className="relative z-10">
                    <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold backdrop-blur-sm bg-white/20 text-white border border-white/20 mb-2">
                      <IonIcon icon={shieldCheckmarkOutline} className="text-xs" />
                      <span>{bannerForm.badgeText || 'Featured Highlight'}</span>
                    </span>
                    <div className="text-lg font-bold tracking-tight text-white mb-1">
                      {bannerForm.headline || 'Banner Headline'}
                    </div>
                    <p className="text-white/90 text-xs leading-relaxed mb-3">
                      {bannerForm.subtext || 'Banner subtitle description will appear here.'}
                    </p>
                  </div>
                  <div className="relative z-10">
                    <span
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white text-xs font-bold shadow-xs"
                      style={{
                        color: bannerForm.bgColorEnd || bannerForm.bgColor || '#0F766E',
                      }}
                    >
                      {bannerForm.ctaLabel || 'Find Medicine Fast'} →
                    </span>
                  </div>
                </div>
              </div>

              {/* Color Picker + Preset Swatches */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="text-xs font-bold text-slate-800">
                  Banner Color &amp; Gradient Customizer
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Primary / Start Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={bannerForm.bgColor || '#0D9488'}
                        onChange={(e) =>
                          setBannerForm({
                            ...bannerForm,
                            bgColor: e.target.value,
                            bgGradient: `from-[${e.target.value}] to-[${
                              bannerForm.bgColorEnd || e.target.value
                            }]`,
                          })
                        }
                        className="w-10 h-9 rounded border border-slate-300 cursor-pointer p-0.5 bg-white"
                      />
                      <input
                        type="text"
                        value={bannerForm.bgColor || '#0D9488'}
                        onChange={(e) =>
                          setBannerForm({
                            ...bannerForm,
                            bgColor: e.target.value,
                            bgGradient: `from-[${e.target.value}] to-[${
                              bannerForm.bgColorEnd || e.target.value
                            }]`,
                          })
                        }
                        className="flex-1 px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Secondary / End Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={bannerForm.bgColorEnd || '#0F766E'}
                        onChange={(e) =>
                          setBannerForm({
                            ...bannerForm,
                            bgColorEnd: e.target.value,
                            bgGradient: `from-[${
                              bannerForm.bgColor || '#0D9488'
                            }] to-[${e.target.value}]`,
                          })
                        }
                        className="w-10 h-9 rounded border border-slate-300 cursor-pointer p-0.5 bg-white"
                      />
                      <input
                        type="text"
                        value={bannerForm.bgColorEnd || '#0F766E'}
                        onChange={(e) =>
                          setBannerForm({
                            ...bannerForm,
                            bgColorEnd: e.target.value,
                            bgGradient: `from-[${
                              bannerForm.bgColor || '#0D9488'
                            }] to-[${e.target.value}]`,
                          })
                        }
                        className="flex-1 px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Preset Customer Palette Swatches */}
                <div>
                  <span className="block text-[11px] font-medium text-slate-500 mb-1.5">
                    Customer Theme Presets:
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {[
                      { label: 'CarePoint Teal (Slide 1)', c1: '#0D9488', c2: '#0F766E' },
                      { label: 'Terracotta Rose (Slide 2)', c1: '#C86F58', c2: '#B35943' },
                      { label: 'Ocean Teal (Slide 3)', c1: '#24828E', c2: '#176B76' },
                      { label: 'Eucalyptus Jade (Slide 4)', c1: '#167D71', c2: '#0E6359' },
                      { label: 'Royal Blue', c1: '#2563EB', c2: '#1D4ED8' },
                      { label: 'Amethyst', c1: '#7C3AED', c2: '#5B21B6' },
                      { label: 'Midnight Slate', c1: '#1E293B', c2: '#0F766E' },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() =>
                          setBannerForm({
                            ...bannerForm,
                            bgColor: preset.c1,
                            bgColorEnd: preset.c2,
                            bgGradient: `from-[${preset.c1}] to-[${preset.c2}]`,
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-slate-300 bg-white hover:bg-slate-100 text-[11px] font-medium text-slate-700 cursor-pointer"
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0"
                          style={{
                            background: `linear-gradient(135deg, ${preset.c1} 0%, ${preset.c2} 100%)`,
                          }}
                        />
                        <span>{preset.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Badge Text
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 100% Certified OTC"
                    value={bannerForm.badgeText}
                    onChange={(e) => setBannerForm({ ...bannerForm, badgeText: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Headline
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Need medicine fast?"
                    value={bannerForm.headline}
                    onChange={(e) => setBannerForm({ ...bannerForm, headline: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Subtext</label>
                <textarea
                  rows={2}
                  value={bannerForm.subtext}
                  onChange={(e) => setBannerForm({ ...bannerForm, subtext: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Button Label
                  </label>
                  <input
                    type="text"
                    value={bannerForm.ctaLabel}
                    onChange={(e) => setBannerForm({ ...bannerForm, ctaLabel: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Button Action
                  </label>
                  <select
                    value={bannerForm.ctaType}
                    onChange={(e) =>
                      setBannerForm({
                        ...bannerForm,
                        ctaType: e.target.value as AdminBanner['ctaType'],
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded bg-white"
                  >
                    <option value="navigate_search">Search OTC Medicines</option>
                    <option value="scroll_pharmacies">Scroll to Partner Pharmacies</option>
                    <option value="open_discount_modal">Open PWD &amp; Senior Discount Guide</option>
                    <option value="open_about_modal">Open About CarePoint Modal</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bannerForm.active}
                  onChange={(e) => setBannerForm({ ...bannerForm, active: e.target.checked })}
                />
                <span>Show this banner on Customer Homepage Carousel</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 mt-4">
              <button
                type="button"
                onClick={() => setShowBannerModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!bannerForm.headline.trim()) {
                    showToast('Banner headline is required.', 'warning');
                    return;
                  }
                  const currentList =
                    data?.homepageBanners && data.homepageBanners.length > 0
                      ? data.homepageBanners
                      : DEFAULT_BANNERS;
                  const updatedBanner: AdminBanner = {
                    ...bannerForm,
                    headline: bannerForm.headline.trim(),
                    subtext: bannerForm.subtext.trim(),
                    badgeText: bannerForm.badgeText.trim() || 'Featured Highlight',
                    ctaLabel: bannerForm.ctaLabel.trim() || 'Find Medicine Fast',
                    bgColor: bannerForm.bgColor || '#0D9488',
                    bgColorEnd: bannerForm.bgColorEnd || bannerForm.bgColor || '#0F766E',
                    bgGradient: `from-[${bannerForm.bgColor || '#0D9488'}] to-[${
                      bannerForm.bgColorEnd || bannerForm.bgColor || '#0F766E'
                    }]`,
                  };
                  const nextBanners = editingBannerId
                    ? currentList.map((b) => (b.id === editingBannerId ? updatedBanner : b))
                    : [...currentList, updatedBanner];
                  commitCmsUpdate(
                    { banners: nextBanners, banner: nextBanners[0] },
                    `${editingBannerId ? 'Updated' : 'Added'} homepage banner: ${updatedBanner.headline}`
                  );
                  setShowBannerModal(false);
                }}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold cursor-pointer shadow-xs"
              >
                {editingBannerId ? 'Save Banner Changes' : 'Add Banner to Homepage'}
              </button>
            </div>
          </div>
        </IonModal>

        {/* 10. CMS Promotion Modal */}
        <IonModal isOpen={showPromoModal} onDidDismiss={() => setShowPromoModal(false)}>
          <div className="ops-admin-modal p-6 bg-white text-slate-900 min-h-full flex flex-col justify-between max-w-lg mx-auto w-full">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-teal-700">
                    Promotions
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">
                    {editingPromoId ? 'Edit promotion' : 'Add a promotion'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPromoModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-700"
                >
                  <IonIcon icon={closeOutline} className="text-xl" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  placeholder="e.g. 🌿 Weekend sale"
                  value={promoForm.title}
                  onChange={(e) => setPromoForm({ ...promoForm, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Text</label>
                <input
                  type="text"
                  placeholder="Short promo message"
                  value={promoForm.text}
                  onChange={(e) => setPromoForm({ ...promoForm, text: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowPromoModal(false)}
                className="px-4 py-2 rounded text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!promoForm.title.trim() || !promoForm.text.trim()) {
                    showToast('Fill in both promotion fields.', 'warning');
                    return;
                  }
                  const list = data?.promotions || [];
                  const next = editingPromoId
                    ? list.map((p) =>
                        p.id === editingPromoId
                          ? { ...p, title: promoForm.title.trim(), text: promoForm.text.trim() }
                          : p
                      )
                    : [
                        ...list,
                        {
                          id: 'promo_' + Date.now(),
                          title: promoForm.title.trim(),
                          text: promoForm.text.trim(),
                          active: true,
                        },
                      ];
                  commitCmsUpdate(
                    { promotions: next },
                    `${editingPromoId ? 'Updated' : 'Added'} promotion: ${promoForm.title.trim()}`
                  );
                  setShowPromoModal(false);
                }}
                className="px-4 py-2 rounded bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold"
              >
                {editingPromoId ? 'Save' : 'Add promotion'}
              </button>
            </div>
          </div>
        </IonModal>

        {/* 11. CMS Static Page Modal */}
        <IonModal isOpen={!!editingPageKey} onDidDismiss={() => setEditingPageKey(null)}>
          <div className="ops-admin-modal p-6 bg-white text-slate-900 min-h-full flex flex-col justify-between max-w-xl mx-auto w-full">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-teal-700">
                    Static page · /{editingPageKey}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">Edit page</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingPageKey(null)}
                  className="p-1 text-slate-400 hover:text-slate-700"
                >
                  <IonIcon icon={closeOutline} className="text-xl" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  value={pageForm.title}
                  onChange={(e) => setPageForm({ ...pageForm, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Content</label>
                <textarea
                  rows={6}
                  value={pageForm.body}
                  onChange={(e) => setPageForm({ ...pageForm, body: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setEditingPageKey(null)}
                className="px-4 py-2 rounded text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!editingPageKey) return;
                  const nextPages = {
                    ...(data?.pages || {}),
                    [editingPageKey]: {
                      title: pageForm.title.trim(),
                      body: pageForm.body.trim(),
                    },
                  };
                  commitCmsUpdate(
                    { pages: nextPages },
                    `Updated the "${pageForm.title.trim()}" static page`
                  );
                  setEditingPageKey(null);
                }}
                className="px-4 py-2 rounded bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold"
              >
                Save page
              </button>
            </div>
          </div>
        </IonModal>

        {/* 12. CMS FAQ Modal */}
        <IonModal isOpen={showFaqModal} onDidDismiss={() => setShowFaqModal(false)}>
          <div className="ops-admin-modal p-6 bg-white text-slate-900 min-h-full flex flex-col justify-between max-w-lg mx-auto w-full">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-teal-700">
                    FAQs
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">
                    {editingFaqId ? 'Edit FAQ' : 'Add an FAQ'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFaqModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-700"
                >
                  <IonIcon icon={closeOutline} className="text-xl" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Question</label>
                <input
                  type="text"
                  placeholder="Question"
                  value={faqForm.q}
                  onChange={(e) => setFaqForm({ ...faqForm, q: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Answer</label>
                <textarea
                  rows={3}
                  placeholder="Answer"
                  value={faqForm.a}
                  onChange={(e) => setFaqForm({ ...faqForm, a: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowFaqModal(false)}
                className="px-4 py-2 rounded text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!faqForm.q.trim() || !faqForm.a.trim()) {
                    showToast('Fill in both question and answer.', 'warning');
                    return;
                  }
                  const list = data?.faqs || [];
                  const next = editingFaqId
                    ? list.map((f) =>
                        f.id === editingFaqId
                          ? { ...f, q: faqForm.q.trim(), a: faqForm.a.trim() }
                          : f
                      )
                    : [...list, { id: 'faq_' + Date.now(), q: faqForm.q.trim(), a: faqForm.a.trim() }];
                  commitCmsUpdate(
                    { faqs: next },
                    `${editingFaqId ? 'Updated' : 'Added'} FAQ: ${faqForm.q.trim()}`
                  );
                  setShowFaqModal(false);
                }}
                className="px-4 py-2 rounded bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold"
              >
                {editingFaqId ? 'Save' : 'Add FAQ'}
              </button>
            </div>
          </div>
        </IonModal>

        {/* 13. Partner Pharmacy Decision & Templated Email Composer Modal */}
        {decisionModalPharmacy && (
          <div
            className="fixed inset-0 z-[9999] bg-slate-900/55 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-5"
            onClick={() => !isSubmittingDecision && setDecisionModalPharmacy(null)}
          >
            <div
              className="w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden text-slate-900 animate-fade-in"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Fixed Modal Header */}
              <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-start justify-between gap-4 shrink-0">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-teal-700 font-semibold">
                      <IonIcon icon={shieldCheckmarkOutline} className="text-sm" />
                      Partner Inquiry Review &amp; Email Composer
                    </span>
                    {(sentEmailsMap[decisionModalPharmacy.pharmacy_id] ||
                      decisionModalPharmacy.admin_decision_note?.includes('[EMAIL_SENT]')) && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        ✓ Email Sent
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mt-0.5 truncate">
                    {decisionModalPharmacy.name}
                  </h3>
                  <p className="text-xs font-mono text-slate-500 mt-0.5 truncate">
                    FDA License: {decisionModalPharmacy.license_number} · {decisionModalPharmacy.address}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDecisionModalPharmacy(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                  aria-label="Close modal"
                >
                  <IonIcon icon={closeOutline} className="text-lg" />
                </button>
              </div>

              {/* Scrollable Modal Body */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                {emailStatusBanner && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                      emailStatusBanner.type === 'success'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : emailStatusBanner.type === 'warning'
                        ? 'bg-amber-50 border-amber-300 text-amber-900'
                        : 'bg-rose-50 border-rose-200 text-rose-900'
                    }`}
                  >
                    <div className="font-bold">{emailStatusBanner.title}</div>
                    <p className="leading-relaxed">{emailStatusBanner.detail}</p>
                  </div>
                )}

                {/* Decision Switcher */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Select Regulatory Decision &amp; Email Template
                  </label>
                  <div className="grid grid-cols-2 gap-2.5 p-1.5 bg-slate-100 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => updateDecisionFieldsAndSyncTemplate({ decision: 'approved' })}
                      className={`py-2.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        decisionForm.decision === 'approved'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80'
                      }`}
                    >
                      <span>✓ Approve Application</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateDecisionFieldsAndSyncTemplate({ decision: 'rejected' })}
                      className={`py-2.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        decisionForm.decision === 'rejected'
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80'
                      }`}
                    >
                      <span>✕ Reject / Suspend</span>
                    </button>
                  </div>
                </div>

                {/* Applicant Details Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Applicant / Representative Name
                    </label>
                    <input
                      type="text"
                      value={decisionForm.applicantName}
                      onChange={(e) =>
                        updateDecisionFieldsAndSyncTemplate({ applicantName: e.target.value })
                      }
                      placeholder="Juan Dela Cruz, RPh"
                      className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-teal-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Recipient Email <span className="text-teal-700 font-normal">(Auto-links Staff)</span>
                    </label>
                    <input
                      type="email"
                      value={decisionForm.recipientEmail}
                      onChange={(e) =>
                        updateDecisionFieldsAndSyncTemplate({ recipientEmail: e.target.value })
                      }
                      placeholder="pharmacy.owner@gmail.com"
                      className="w-full px-3.5 py-2 text-sm font-mono bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-teal-600"
                    />
                    {isDemoPlaceholderEmail(decisionForm.recipientEmail) && (
                      <p className="text-[11px] text-amber-700 font-medium mt-1">
                        ⚠️ Demo placeholder email — replace with a real email (e.g. @gmail.com) to test live delivery.
                      </p>
                    )}
                  </div>
                </div>

                {/* Regulatory Decision Note */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Regulatory Verification / Decision Note
                    </label>
                    <button
                      type="button"
                      onClick={() => updateDecisionFieldsAndSyncTemplate({}, true)}
                      className="text-xs font-semibold text-teal-700 hover:text-teal-800 hover:underline cursor-pointer"
                    >
                      Reset Email Template
                    </button>
                  </div>
                  <input
                    type="text"
                    value={decisionForm.decisionNote}
                    onChange={(e) =>
                      updateDecisionFieldsAndSyncTemplate({ decisionNote: e.target.value })
                    }
                    placeholder="Reason or verification note..."
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-teal-600"
                  />
                </div>

                {/* Editable Email Subject & Body */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <IonIcon icon={mailOutline} className="text-teal-700 text-base" />
                      Confirmation Email Preview (Editable)
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setShowRelaySetup((v) => !v)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold cursor-pointer ${
                          gmailRelayUrl
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
                        }`}
                      >
                        <span>{gmailRelayUrl ? '⚡ Instant Relay: Connected' : '⚡ Setup Instant Send'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyDecisionEmail}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-[11px] font-semibold cursor-pointer"
                      >
                        <IonIcon icon={copyOutline} className="text-xs" />
                        Copy Text
                      </button>
                    </div>
                  </div>

                  {showRelaySetup && (
                    <div className="bg-white border border-teal-200 rounded-xl p-3.5 space-y-2.5 shadow-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-800">
                          ⚡ Connect Your Gmail for 1-Click Background Instant Send (Free, 1-Min Setup)
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowRelaySetup(false)}
                          className="text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          Hide
                        </button>
                      </div>
                      <ol className="text-[11px] text-slate-600 space-y-1.5 list-decimal pl-4 leading-relaxed">
                        <li>
                          Click{' '}
                          <button
                            type="button"
                            onClick={handleCopyGmailRelayScript}
                            className="font-semibold text-teal-700 underline cursor-pointer"
                          >
                            Copy 10-Line Gmail Script
                          </button>{' '}
                          and open{' '}
                          <a
                            href="https://script.google.com/home/start"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-teal-700 underline"
                          >
                            script.google.com ↗
                          </a>
                          .
                        </li>
                        <li>
                          Click <strong>New project</strong>, replace the code with the copied script, then click{' '}
                          <strong>Deploy → New deployment → Select type: Web app</strong>.
                        </li>
                        <li>
                          Set <strong>Who has access</strong> to <strong>Anyone</strong>, click <strong>Deploy</strong>{' '}
                          (authorize your Gmail), and paste the <strong>Web app URL</strong> below:
                        </li>
                      </ol>
                      <div className="flex flex-col sm:flex-row gap-2 pt-1">
                        <input
                          type="url"
                          value={relayUrlInput}
                          onChange={(e) => setRelayUrlInput(e.target.value)}
                          placeholder="https://script.google.com/macros/s/.../exec"
                          className="flex-1 px-3 py-1.5 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600"
                        />
                        <button
                          type="button"
                          onClick={handleSaveGmailRelayUrl}
                          className="px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold cursor-pointer shrink-0"
                        >
                          Save &amp; Connect
                        </button>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                      Subject Line
                    </label>
                    <input
                      type="text"
                      value={decisionForm.subject}
                      onChange={(e) =>
                        setDecisionForm({
                          ...decisionForm,
                          subject: e.target.value,
                          customEditedBody: true,
                        })
                      }
                      className="w-full px-3.5 py-2 text-xs font-medium bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-teal-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                      Message Body
                    </label>
                    <textarea
                      rows={8}
                      value={decisionForm.body}
                      onChange={(e) =>
                        setDecisionForm({
                          ...decisionForm,
                          body: e.target.value,
                          customEditedBody: true,
                        })
                      }
                      className="w-full px-3.5 py-2.5 text-xs font-mono leading-relaxed bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-teal-600"
                    />
                  </div>
                </div>
              </div>

              {/* Fixed Modal Footer (Always Visible) */}
              <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shrink-0">
                <div className="grid grid-cols-2 sm:flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDecisionModalPharmacy(null)}
                    disabled={isSubmittingDecision}
                    className="px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer text-center justify-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConfirmPharmacyDecision('none')}
                    disabled={isSubmittingDecision}
                    className="px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer text-center justify-center"
                  >
                    {decisionForm.decision === 'approved' ? 'Approve Only' : 'Reject Only'}
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleConfirmPharmacyDecision('gmail')}
                    disabled={isSubmittingDecision}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-teal-600 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold cursor-pointer"
                    title="Open Gmail compose tab with pre-filled message"
                  >
                    <IonIcon icon={openOutline} className="text-sm shrink-0" />
                    <span className="truncate">Open Gmail</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleConfirmPharmacyDecision('direct')}
                    disabled={isSubmittingDecision}
                    className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-white text-xs font-semibold shadow-sm cursor-pointer ${
                      decisionForm.decision === 'approved'
                        ? 'bg-emerald-600 hover:bg-emerald-700'
                        : 'bg-rose-600 hover:bg-rose-700'
                    }`}
                    title="Send silently in the background in 1 click to any email address"
                  >
                    <IonIcon icon={mailOutline} className="text-sm shrink-0" />
                    <span className="truncate">
                      {isSubmittingDecision
                        ? 'Sending...'
                        : decisionForm.decision === 'approved'
                        ? '⚡ Instant Send'
                        : '⚡ Reject & Send'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Feedback Toast */}
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

export default AdminApp;
