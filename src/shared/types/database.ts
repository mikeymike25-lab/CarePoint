export type UserRole = 'customer' | 'staff' | 'pharmacy_owner' | 'admin';
export type PharmacyApprovalStatus = 'pending' | 'approved' | 'rejected';
export type OrderStatus = 'pending' | 'confirmed' | 'ready' | 'completed' | 'cancelled';
export type DeliveryMethod = 'pickup' | 'delivery';
export type InquiryStatus = 'open' | 'closed';

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  phone_number: string | null;
  avatar_url?: string | null;
  notifications_enabled: boolean;
  dark_mode: boolean;
  sms_updates_enabled?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Pharmacy {
  pharmacy_id: number;
  name: string;
  license_number: string;
  address: string;
  approval_status: PharmacyApprovalStatus;
  is_open: boolean;
  operating_hours?: string;
  phone_number?: string;
  applicant_name?: string;
  applicant_email?: string;
  inquiry_notes?: string;
  admin_decision_note?: string;
  decided_at?: string;
  distance?: string;
  rating?: number;
  created_at: string;
}

export interface MasterCatalogItem {
  item_id: number;
  generic_name: string;
  brand_name: string | null;
  category: string;
  dosage_form: string;
  requires_prescription: boolean;
  indications?: string;
  dosage_instructions?: string;
  packaging?: string;
  side_effects?: string;
  image_url?: string;
  created_at: string;
}

export interface PharmacyInventoryItem {
  pharmacy_id: number;
  item_id: number;
  price: number;
  stock_quantity: number;
  is_active: boolean;
  updated_at: string;
  pharmacy?: Pharmacy;
  item?: MasterCatalogItem;
}

export interface SavedAddress {
  id: string;
  user_id: string;
  label: 'Home' | 'Work' | 'Other' | string;
  recipient_name: string;
  phone_number: string;
  address_line: string;
  barangay_or_district?: string | null;
  city: string;
  province?: string | null;
  postal_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  landmark_or_notes?: string | null;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Order {
  order_id: number;
  customer_id: string;
  pharmacy_id: number;
  status: OrderStatus;
  method: DeliveryMethod;
  total_amount: number;
  created_at: string;
  updated_at: string;
  pharmacy?: Pharmacy;
  items?: OrderItem[];
  delivery_address?: string | null;
  delivery_lat?: number | null;
  delivery_lng?: number | null;
  delivery_notes?: string | null;
  recipient_name?: string | null;
  recipient_phone?: string | null;
}

export interface OrderItem {
  order_item_id: number;
  order_id: number;
  item_id: number;
  quantity: number;
  unit_price: number;
  item?: MasterCatalogItem;
}

export interface Message {
  message_id: number;
  order_id?: number;
  inquiry_id?: number;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: Profile;
}

export interface CartItem {
  itemId: number;
  pharmacyId: number;
  pharmacyName: string;
  brandName: string | null;
  genericName: string;
  dosageForm: string;
  category: string;
  price: number;
  quantity: number;
  maxStock: number;
  imageUrl?: string;
  requiresPrescription?: boolean;
}

export interface Inquiry {
  inquiry_id: number;
  customer_id: string;
  pharmacy_id: number;
  item_id?: number;
  subject: string;
  status: InquiryStatus;
  created_at: string;
  updated_at: string;
  pharmacy?: Pharmacy;
  item?: MasterCatalogItem;
  customer?: Profile;
}

export type NotificationType = 'order' | 'order_status' | 'message' | 'inquiry' | 'promotion' | 'system';

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  link_url?: string | null;
  is_read: boolean;
  metadata?: Record<string, any> | null;
  created_at: string;
  updated_at?: string;
}

