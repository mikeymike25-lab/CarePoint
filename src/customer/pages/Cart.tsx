import React, { useState, useMemo } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  useIonToast,
  useIonRouter,
  IonSpinner,
  IonButtons,
  IonBackButton,
  IonModal,
  IonButton,
} from '@ionic/react';
import {
  addOutline,
  removeOutline,
  trashOutline,
  bagHandleOutline,
  checkmarkCircleOutline,
  checkmarkOutline,
  storefrontOutline,
  bicycleOutline,
  cardOutline,
  walletOutline,
  cashOutline,
  medkitOutline,
  shieldCheckmarkOutline,
  locationOutline,
  receiptOutline,
  arrowForwardOutline,
  informationCircleOutline,
  sparklesOutline,
  homeOutline,
  briefcaseOutline,
  pinOutline,
  closeOutline,
  alertCircleOutline,
} from 'ionicons/icons';
import { IonIcon } from '@ionic/react';
import { useCart } from '../context/CartContext';
import { placeOrder } from '../services/orderService';
import { getSavedAddresses } from '../services/addressService';
import { supabase } from '../../shared/lib/supabase';
import { resolveMedicineImageUrl } from '../../shared/data/medicines';
import type { DeliveryMethod, SavedAddress } from '../../shared/types/database';
import PaymentModal from '../components/PaymentModal';
import AddressFormModal from '../components/AddressFormModal';
import type { PaymentMethodType } from '../../shared/services/paymentService';
import { useAuth } from '../../shared/context/AuthContext';
import { getPaymentPreferences } from '../services/paymentMethodService';
import {
  fetchCustomerPlatformContent,
  subscribeToPlatformContent,
  DEFAULT_CUSTOMER_PLATFORM_CONTENT,
  type CustomerPlatformContent,
} from '../services/cmsService';

const Cart: React.FC = () => {
  const { user } = useAuth();
  const { items, totalItemCount, subtotal, updateQuantity, removeFromCart, clearCart } = useCart();
  const [presentToast] = useIonToast();
  const router = useIonRouter();

  const [platformSettings, setPlatformSettings] = useState<CustomerPlatformContent>(
    DEFAULT_CUSTOMER_PLATFORM_CONTENT
  );
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('pickup');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>(() => {
    return getPaymentPreferences().defaultType;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [imageErrorMap, setImageErrorMap] = useState<Record<number, boolean>>({});

  // Saved Addresses State
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<SavedAddress | null>(null);
  const [isAddressFormModalOpen, setIsAddressFormModalOpen] = useState<boolean>(false);
  const [isAddressSelectModalOpen, setIsAddressSelectModalOpen] = useState<boolean>(false);

  React.useEffect(() => {
    const loadSettings = async () => {
      const live = await fetchCustomerPlatformContent();
      setPlatformSettings(live);
      if (!live.pickupEnabled && live.deliveryEnabled) {
        setDeliveryMethod('delivery');
      } else if (!live.deliveryEnabled && live.pickupEnabled) {
        setDeliveryMethod('pickup');
      }
    };
    loadSettings();
    const unsub = subscribeToPlatformContent(() => {
      loadSettings();
    });
    return () => unsub();
  }, []);

  // Load saved addresses for user
  const loadAddresses = async () => {
    if (!user?.id) return;
    try {
      const list = await getSavedAddresses(user.id);
      setSavedAddresses(list);
      if (list.length > 0) {
        setSelectedAddress((prev) => {
          if (prev && list.some((a) => a.id === prev.id)) {
            return list.find((a) => a.id === prev.id)!;
          }
          return list.find((a) => a.is_default) || list[0];
        });
      }
    } catch (e) {
      console.error('Failed to load addresses in cart:', e);
    }
  };

  React.useEffect(() => {
    if (user?.id) {
      loadAddresses();
    }
  }, [user?.id]);

  // Live Pharmacy Status (Open / Closed) check
  const [pharmaciesStatus, setPharmaciesStatus] = useState<Record<number, { isOpen: boolean; name: string }>>({});

  const checkPharmaciesOpenStatus = React.useCallback(async () => {
    if (items.length === 0) {
      setPharmaciesStatus({});
      return;
    }
    const pharmacyIds = Array.from(new Set(items.map((i) => i.pharmacyId)));
    const storeMeta = (() => {
      try {
        const raw = localStorage.getItem('cp_staff_storefront_meta_v1');
        return raw ? JSON.parse(raw) : {};
      } catch {
        return {};
      }
    })();

    const map: Record<number, { isOpen: boolean; name: string }> = {};

    try {
      const { data } = await supabase
        .from('pharmacies')
        .select('pharmacy_id, name, is_open')
        .in('pharmacy_id', pharmacyIds);

      if (data) {
        data.forEach((p: any) => {
          const local = storeMeta[p.pharmacy_id];
          const isOpen =
            local?.is_open !== undefined ? Boolean(local.is_open) : Boolean(p.is_open ?? true);
          map[p.pharmacy_id] = { isOpen, name: p.name };
        });
      }
    } catch (e) {
      console.warn('Failed to fetch pharmacy status in cart:', e);
    }

    pharmacyIds.forEach((pid) => {
      if (!map[pid]) {
        const local = storeMeta[pid];
        const isOpen = local?.is_open !== undefined ? Boolean(local.is_open) : true;
        const itemWithPid = items.find((i) => i.pharmacyId === pid);
        map[pid] = { isOpen, name: itemWithPid?.pharmacyName || 'Partner Pharmacy' };
      }
    });

    setPharmaciesStatus(map);
  }, [items]);

  React.useEffect(() => {
    checkPharmaciesOpenStatus();
    const handleSync = () => checkPharmaciesOpenStatus();
    window.addEventListener('carepoint:pharmacy_updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('carepoint:pharmacy_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [checkPharmaciesOpenStatus]);

  const closedPharmaciesList = useMemo(() => {
    const list: { id: number; name: string }[] = [];
    Object.entries(pharmaciesStatus).forEach(([idStr, info]) => {
      if (!info.isOpen) {
        list.push({ id: Number(idStr), name: info.name });
      }
    });
    return list;
  }, [pharmaciesStatus]);

  const hasClosedPharmacies = closedPharmaciesList.length > 0;

  // Group items by pharmacy
  const groupedItems = useMemo(() => {
    return items.reduce((groups, item) => {
      if (!groups[item.pharmacyId]) {
        groups[item.pharmacyId] = {
          pharmacyName: item.pharmacyName,
          items: [],
        };
      }
      groups[item.pharmacyId].items.push(item);
      return groups;
    }, {} as Record<number, { pharmacyName: string; items: typeof items }>);
  }, [items]);

  const baseDeliveryFee = platformSettings.deliveryFee ?? 50;
  const freeOver = platformSettings.freeDeliveryOver ?? 1500;
  const deliveryFee =
    deliveryMethod === 'delivery'
      ? freeOver > 0 && subtotal >= freeOver
        ? 0
        : baseDeliveryFee
      : 0;
  const grandTotal = subtotal + deliveryFee;

  const handleImageError = (itemId: number) => {
    setImageErrorMap(prev => ({ ...prev, [itemId]: true }));
  };

  const handleCheckout = async () => {
    if (items.length === 0) return;

    if (hasClosedPharmacies) {
      presentToast({
        message: `Cannot checkout: ${closedPharmaciesList.map((c) => c.name).join(', ')} is currently closed.`,
        duration: 3500,
        color: 'danger',
        icon: alertCircleOutline,
        position: 'top',
      });
      return;
    }

    if (deliveryMethod === 'delivery' && !selectedAddress) {
      presentToast({
        message: 'Please add or select a delivery address with map location.',
        duration: 3000,
        color: 'warning',
        icon: locationOutline,
        position: 'top',
      });
      setIsAddressFormModalOpen(true);
      return;
    }

    if (paymentMethod === 'cash') {
      await processFinalCheckout();
    } else {
      setIsPaymentModalOpen(true);
    }
  };

  const processFinalCheckout = async () => {
    setIsSubmitting(true);
    try {
      const deliveryAddressStr = selectedAddress
        ? `${selectedAddress.address_line}${selectedAddress.barangay_or_district ? ', ' + selectedAddress.barangay_or_district : ''}, ${selectedAddress.city}`
        : undefined;

      const response = await placeOrder(
        items,
        {
          method: deliveryMethod,
          paymentMethod,
          deliveryAddress: deliveryAddressStr,
          deliveryLat: selectedAddress?.latitude ?? null,
          deliveryLng: selectedAddress?.longitude ?? null,
          deliveryNotes: selectedAddress?.landmark_or_notes ?? null,
          recipientName: selectedAddress?.recipient_name ?? null,
          recipientPhone: selectedAddress?.phone_number ?? null,
        },
        user?.id
      );

      if (response.success) {
        clearCart();
        presentToast({
          message: 'Order placed successfully!',
          duration: 3000,
          color: 'success',
          icon: checkmarkCircleOutline,
          position: 'top',
        });
        router.push('/customer/home', 'forward', 'replace');
      } else {
        presentToast({
          message: response.message || 'Checkout failed. Please try again.',
          duration: 3000,
          color: 'danger',
          position: 'top',
        });
      }
    } catch (error) {
      console.error(error);
      presentToast({
        message: 'An unexpected error occurred.',
        duration: 3000,
        color: 'danger',
        position: 'top',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentSuccess = () => {
    setIsPaymentModalOpen(false);
    processFinalCheckout();
  };

  return (
    <IonPage>
      {/* Top Header */}
      <IonHeader className="ion-no-border bg-white shadow-xs border-b border-slate-100">
        <IonToolbar className="px-2 py-1" style={{ '--background': '#ffffff' } as React.CSSProperties}>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/customer/orders" text="" />
          </IonButtons>
          <div className="flex items-center justify-between w-full pr-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <IonIcon icon={bagHandleOutline} className="text-xl" />
              </div>
              <div>
                <IonTitle className="font-bold text-slate-900 text-lg tracking-tight p-0">
                  Cart
                </IonTitle>
                <p className="text-xs text-slate-500 font-medium">
                  {totalItemCount === 0
                    ? 'No items'
                    : `${totalItemCount} ${totalItemCount === 1 ? 'item' : 'items'} in your cart`}
                </p>
              </div>
            </div>

            {items.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs font-semibold text-rose-500 hover:text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                title="Empty Cart"
              >
                <IonIcon icon={trashOutline} className="text-sm" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent style={{ '--background': '#F8FAFC' } as React.CSSProperties}>
        <div className="max-w-2xl mx-auto w-full px-4 py-6 space-y-6 pb-28">
          {items.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
              <div className="w-24 h-24 bg-teal-50 border border-teal-100/70 rounded-3xl flex items-center justify-center mb-5 shadow-xs">
                <IonIcon icon={bagHandleOutline} className="text-5xl text-teal-600/80" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Your cart is empty</h2>
              <p className="text-slate-500 text-sm max-w-sm mb-8 leading-relaxed">
                Browse our OTC master catalog and choose from verified local partner pharmacies.
              </p>
              <button
                type="button"
                onClick={() => router.push('/customer/home', 'back')}
                style={{
                  padding: '12px 24px',
                  borderRadius: '14px',
                }}
                className="inline-flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-md shadow-teal-600/20 active:scale-95 transition-all text-sm cursor-pointer"
              >
                <span>Browse Medicines</span>
                <IonIcon icon={arrowForwardOutline} className="text-base" />
              </button>
            </div>
          ) : (
            <>
              {/* Order Items Grouped by Pharmacy */}
              <section className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <span>Order Items</span>
                    <span className="text-xs font-semibold bg-teal-100/70 text-teal-800 px-2 py-0.5 rounded-full">
                      {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
                    </span>
                  </h3>
                  <span className="text-xs text-slate-400 font-medium">OTC Certified</span>
                </div>

                {Object.entries(groupedItems).map(([pharmacyId, group]) => {
                  const pid = Number(pharmacyId);
                  const isClosedStore = pharmaciesStatus[pid]?.isOpen === false;

                  return (
                    <div
                      key={pharmacyId}
                      className={`bg-white rounded-2xl border shadow-xs overflow-hidden transition-all ${
                        isClosedStore ? 'border-rose-300 ring-1 ring-rose-200' : 'border-slate-200/80'
                      }`}
                    >
                      {/* Pharmacy Header */}
                      <div className="bg-gradient-to-r from-teal-50/70 via-slate-50 to-white px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              isClosedStore ? 'bg-rose-100 text-rose-700' : 'bg-teal-100 text-teal-700'
                            }`}
                          >
                            <IonIcon icon={storefrontOutline} className="text-base" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs text-teal-700 font-semibold uppercase tracking-wider leading-none">
                              Partner Pharmacy
                            </p>
                            <h4 className="font-bold text-slate-800 text-sm truncate mt-0.5">
                              {group.pharmacyName}
                            </h4>
                          </div>
                        </div>
                        {isClosedStore ? (
                          <span className="text-[11px] font-bold bg-rose-100 text-rose-700 border border-rose-200 px-2.5 py-0.5 rounded-full shrink-0 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse"></span>
                            Closed
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full shrink-0">
                            {group.items.length} {group.items.length === 1 ? 'product' : 'products'}
                          </span>
                        )}
                      </div>

                      {/* Store Closed Warning Bar */}
                      {isClosedStore && (
                        <div className="bg-rose-50 border-b border-rose-200 px-4 py-2 flex items-center justify-between text-xs text-rose-800">
                          <span className="font-semibold flex items-center gap-1.5">
                            <IonIcon icon={alertCircleOutline} className="text-base text-rose-600 shrink-0" />
                            This branch is currently closed.
                          </span>
                          <span className="text-[11px] text-rose-600 font-medium">Remove to checkout</span>
                        </div>
                      )}

                      {/* Items List */}
                      <div className="divide-y divide-slate-100">
                      {group.items.map((item) => {
                        const hasImageError = imageErrorMap[item.itemId] || !item.imageUrl;

                        return (
                          <div
                            key={item.itemId}
                            className="p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-slate-50/40 transition-colors"
                          >
                            <div className="flex items-start gap-3.5 flex-1 min-w-0">
                              {/* Thumbnail with graceful fallback */}
                              <div className="w-16 h-16 rounded-xl bg-teal-50/60 border border-slate-200/80 shrink-0 overflow-hidden flex items-center justify-center relative shadow-2xs">
                                {!hasImageError ? (
                                  <img
                                    src={resolveMedicineImageUrl(item.imageUrl)}
                                    alt={item.genericName}
                                    className="w-full h-full object-cover"
                                    onError={() => handleImageError(item.itemId)}
                                  />
                                ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center text-teal-600 bg-gradient-to-br from-teal-50 to-emerald-50">
                                    <IonIcon icon={medkitOutline} className="text-2xl" />
                                    <span className="text-[8px] font-bold tracking-tighter uppercase text-teal-700 mt-0.5">
                                      OTC
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Details */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <h4 className="font-bold text-slate-900 text-sm sm:text-base leading-snug truncate">
                                      {item.brandName ? `${item.brandName}` : item.genericName}
                                    </h4>
                                    <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                                      {item.brandName ? `${item.genericName} • ` : ''}
                                      {item.dosageForm}
                                    </p>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <p className="font-bold text-teal-700 text-base leading-none">
                                      ₱{(item.price * item.quantity).toFixed(2)}
                                    </p>
                                    {item.quantity > 1 && (
                                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                                        ₱{item.price.toFixed(2)} ea
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center justify-between mt-3 pt-1">
                                  {/* Stepper */}
                                  <div className="inline-flex items-center bg-slate-100 border border-slate-200/80 rounded-full p-0.5 shadow-2xs">
                                    <button
                                      type="button"
                                      onClick={() => updateQuantity(item.itemId, item.pharmacyId, item.quantity - 1)}
                                      style={{ width: '28px', height: '28px', borderRadius: '9999px', padding: 0 }}
                                      className="bg-white hover:bg-slate-50 active:scale-90 text-slate-700 font-bold flex items-center justify-center shadow-2xs transition-all disabled:opacity-40 cursor-pointer"
                                      disabled={item.quantity <= 1}
                                      title="Decrease quantity"
                                    >
                                      <IonIcon icon={removeOutline} className="text-sm" />
                                    </button>
                                    <span className="w-8 text-center text-xs font-bold text-slate-800 select-none">
                                      {item.quantity}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => updateQuantity(item.itemId, item.pharmacyId, item.quantity + 1)}
                                      disabled={item.quantity >= item.maxStock}
                                      style={{ width: '28px', height: '28px', borderRadius: '9999px', padding: 0 }}
                                      className="bg-white hover:bg-slate-50 active:scale-90 text-slate-700 font-bold flex items-center justify-center shadow-2xs transition-all disabled:opacity-40 cursor-pointer"
                                      title="Increase quantity"
                                    >
                                      <IonIcon icon={addOutline} className="text-sm" />
                                    </button>
                                  </div>

                                  {/* Remove Button */}
                                  <button
                                    type="button"
                                    onClick={() => removeFromCart(item.itemId, item.pharmacyId)}
                                    style={{ padding: '6px 10px', borderRadius: '8px' }}
                                    className="text-xs font-semibold text-rose-500 hover:text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-1 cursor-pointer"
                                  >
                                    <IonIcon icon={trashOutline} className="text-sm" />
                                    <span>Remove</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  );
                })}
              </section>

              {/* Fulfillment Method Card */}
              <section className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <IonIcon icon={locationOutline} className="text-teal-600" />
                    <span>Fulfillment Method</span>
                  </h3>
                  <span className="text-xs font-medium text-slate-500">Choose pickup or delivery</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Store Pickup Option */}
                  <div
                    onClick={() => setDeliveryMethod('pickup')}
                    className={`cursor-pointer rounded-2xl p-4 border transition-all relative flex flex-col justify-between ${
                      deliveryMethod === 'pickup'
                        ? 'border-teal-600 bg-teal-50/40 ring-2 ring-teal-600/15 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-100/70 text-teal-700 flex items-center justify-center">
                        <IonIcon icon={storefrontOutline} className="text-xl" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full">
                          FREE
                        </span>
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            deliveryMethod === 'pickup'
                              ? 'border-teal-600 bg-teal-600 text-white shadow-xs'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {deliveryMethod === 'pickup' && (
                            <IonIcon icon={checkmarkOutline} className="text-xs font-bold" />
                          )}
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Store Pickup</h4>
                      <p className="text-xs text-slate-500 mt-1 leading-snug">
                        Ready in ~30 mins. Collect directly at the pharmacy counter.
                      </p>
                    </div>
                  </div>

                  {/* Home Delivery Option */}
                  <div
                    onClick={() => setDeliveryMethod('delivery')}
                    className={`cursor-pointer rounded-2xl p-4 border transition-all relative flex flex-col justify-between ${
                      deliveryMethod === 'delivery'
                        ? 'border-teal-600 bg-teal-50/40 ring-2 ring-teal-600/15 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-sky-100/70 text-sky-700 flex items-center justify-center">
                        <IonIcon icon={bicycleOutline} className="text-xl" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold bg-sky-100 text-sky-800 px-2.5 py-1 rounded-full">
                          +₱50.00
                        </span>
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            deliveryMethod === 'delivery'
                              ? 'border-teal-600 bg-teal-600 text-white shadow-xs'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {deliveryMethod === 'delivery' && (
                            <IonIcon icon={checkmarkOutline} className="text-xs font-bold" />
                          )}
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Home Delivery</h4>
                      <p className="text-xs text-slate-500 mt-1 leading-snug">
                        Direct doorstep delivery within 2-4 hours from dispatch.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Delivery Address Card (Shown when Home Delivery is selected) */}
                {deliveryMethod === 'delivery' && (
                  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                          <IonIcon icon={locationOutline} className="text-lg" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">Delivery Address</h4>
                          <p className="text-[11px] text-slate-500">Destination for doorstep delivery</p>
                        </div>
                      </div>
                      {selectedAddress ? (
                        <button
                          type="button"
                          onClick={() => setIsAddressSelectModalOpen(true)}
                          className="text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100/80 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                        >
                          Change
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsAddressFormModalOpen(true)}
                          className="text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 px-3 py-1 rounded-lg transition-colors cursor-pointer shadow-xs"
                        >
                          + Add
                        </button>
                      )}
                    </div>

                    {selectedAddress ? (
                      <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider bg-teal-100 text-teal-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <IonIcon
                              icon={selectedAddress.label.toLowerCase().includes('work') ? briefcaseOutline : homeOutline}
                              className="text-xs"
                            />
                            {selectedAddress.label}
                          </span>
                          <span className="text-xs font-bold text-slate-800">{selectedAddress.recipient_name}</span>
                          <span className="text-xs text-slate-400">•</span>
                          <span className="text-xs text-slate-500">{selectedAddress.phone_number}</span>
                        </div>

                        <p className="text-xs text-slate-700 font-medium leading-relaxed">
                          {selectedAddress.address_line}
                          {selectedAddress.barangay_or_district ? `, ${selectedAddress.barangay_or_district}` : ''}
                          {selectedAddress.city ? `, ${selectedAddress.city}` : ''}
                        </p>

                        {selectedAddress.landmark_or_notes && (
                          <p className="text-[11px] text-slate-500 bg-white/70 rounded-lg p-1.5 border border-slate-200/50">
                            <strong className="text-slate-600">Note:</strong> {selectedAddress.landmark_or_notes}
                          </p>
                        )}

                        <div className="pt-1 flex items-center gap-2 flex-wrap">
                          {selectedAddress.latitude && selectedAddress.longitude ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md">
                              <IonIcon icon={checkmarkCircleOutline} className="text-xs text-emerald-600" />
                              <span>Exact Map Pin Marked</span>
                              <span className="text-emerald-500 font-normal">
                                ({selectedAddress.latitude.toFixed(3)}, {selectedAddress.longitude.toFixed(3)})
                              </span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-md">
                              <IonIcon icon={pinOutline} className="text-xs text-amber-600" />
                              <span>No map pin attached</span>
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 text-center space-y-2.5">
                        <p className="text-xs font-bold text-amber-900">
                          No delivery address selected
                        </p>
                        <p className="text-[11px] text-amber-700 leading-relaxed max-w-sm mx-auto">
                          Please provide your delivery address and mark your exact location on our map so our courier can find you quickly.
                        </p>
                        <button
                          type="button"
                          onClick={() => setIsAddressFormModalOpen(true)}
                          className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <IonIcon icon={addOutline} className="text-base" />
                          <span>Add Delivery Address (with Map Pin)</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Fulfillment Detail Note */}
                <div className="bg-slate-100/70 border border-slate-200/80 rounded-xl p-3 flex items-start gap-2.5 text-xs text-slate-600">
                  <IonIcon icon={informationCircleOutline} className="text-base text-slate-500 shrink-0 mt-0.5" />
                  {deliveryMethod === 'pickup' ? (
                    <p>
                      Present your digital order number at the counter. The pharmacy will verify your items upon in-person pickup.
                    </p>
                  ) : (
                    <p>
                      Direct doorstep delivery to your selected address. Standard delivery fee of ₱50.00 is applied.
                    </p>
                  )}
                </div>
              </section>

              {/* Payment Method Selection Card */}
              <section className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <IonIcon icon={walletOutline} className="text-teal-600" />
                    <span>Payment Method</span>
                  </h3>
                  <span className="text-xs font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <IonIcon icon={sparklesOutline} className="text-xs" />
                    <span>Sandbox Test Mode</span>
                  </span>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden divide-y divide-slate-100">
                  {/* Cash */}
                  <div
                    onClick={() => setPaymentMethod('cash')}
                    className={`p-4 cursor-pointer flex items-center justify-between transition-colors ${
                      paymentMethod === 'cash' ? 'bg-teal-50/40' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <IonIcon icon={cashOutline} className="text-xl" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">
                          Cash (On Delivery / In-Store Pickup)
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Pay directly upon order turnover
                        </p>
                      </div>
                    </div>
                    <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ml-3 border-slate-300">
                      {paymentMethod === 'cash' && (
                        <div className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                      )}
                    </div>
                  </div>

                  {/* Mock GCash */}
                  <div
                    onClick={() => setPaymentMethod('mock_gcash')}
                    className={`p-4 cursor-pointer flex items-center justify-between transition-colors ${
                      paymentMethod === 'mock_gcash' ? 'bg-teal-50/40' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                        <IonIcon icon={walletOutline} className="text-xl" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-800 text-sm">Mock GCash</h4>
                          <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded">
                            E-WALLET
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Simulate instant mobile wallet authorization
                        </p>
                      </div>
                    </div>
                    <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ml-3 border-slate-300">
                      {paymentMethod === 'mock_gcash' && (
                        <div className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                      )}
                    </div>
                  </div>

                  {/* Mock Credit Card */}
                  <div
                    onClick={() => setPaymentMethod('mock_card')}
                    className={`p-4 cursor-pointer flex items-center justify-between transition-colors ${
                      paymentMethod === 'mock_card' ? 'bg-teal-50/40' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                        <IonIcon icon={cardOutline} className="text-xl" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-800 text-sm">Mock Credit / Debit Card</h4>
                          <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded">
                            CARD
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Simulate Visa / Mastercard payment gateway
                        </p>
                      </div>
                    </div>
                    <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ml-3 border-slate-300">
                      {paymentMethod === 'mock_card' && (
                        <div className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* Order Summary Card */}
              <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                  <IonIcon icon={receiptOutline} className="text-teal-600 text-lg" />
                  <h3 className="font-bold text-slate-900 text-base">Payment Summary</h3>
                </div>

                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Subtotal ({totalItemCount} {totalItemCount === 1 ? 'item' : 'items'})</span>
                    <span className="font-semibold text-slate-800">₱{subtotal.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-600">
                    <span>Fulfillment Fee</span>
                    <span className={`font-semibold ${deliveryFee > 0 ? 'text-slate-800' : 'text-emerald-600'}`}>
                      {deliveryFee > 0 ? `₱${deliveryFee.toFixed(2)}` : 'FREE'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-slate-600">
                    <span>Pharmacy Packaging</span>
                    <span className="font-semibold text-emerald-600">FREE</span>
                  </div>

                  <div className="border-t border-dashed border-slate-200 my-3" />

                  <div className="flex justify-between items-baseline pt-1">
                    <div>
                      <span className="font-bold text-slate-900 text-base">Total Amount</span>
                      <p className="text-[11px] text-slate-400 font-medium">Includes all taxes & fees</p>
                    </div>
                    <span className="font-black text-2xl text-teal-700 tracking-tight">
                      ₱{grandTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Closed Store Blocking Notice */}
                {hasClosedPharmacies && (
                  <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3 text-rose-900 shadow-xs">
                    <IonIcon icon={alertCircleOutline} className="text-xl text-rose-600 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <span className="font-bold text-sm block">Checkout Blocked: Store Currently Closed</span>
                      <p className="mt-1 text-rose-700 leading-relaxed">
                        Your cart contains items from{' '}
                        <strong>{closedPharmaciesList.map((c) => c.name).join(', ')}</strong>, which is currently closed. Please remove these items or wait until the pharmacy reopens to place your order.
                      </p>
                    </div>
                  </div>
                )}

                {/* Safe Checkout Disclaimer */}
                <div className="bg-teal-50/60 border border-teal-100 rounded-xl p-3 flex items-start gap-2 text-xs text-teal-800">
                  <IonIcon icon={shieldCheckmarkOutline} className="text-base text-teal-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong className="font-semibold">IT 005-IT31S4 Course Sandbox:</strong> No live payment gateway or real credit cards are charged.
                  </p>
                </div>

                {/* Confirm Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleCheckout}
                    disabled={isSubmitting || hasClosedPharmacies}
                    style={{
                      minHeight: '56px',
                      padding: '14px 22px',
                      borderRadius: '16px',
                    }}
                    className={`w-full ${
                      hasClosedPharmacies
                        ? 'bg-slate-400 cursor-not-allowed opacity-80'
                        : 'bg-teal-600 hover:bg-teal-700 active:scale-[0.99] cursor-pointer'
                    } text-white font-bold shadow-lg shadow-teal-700/20 flex items-center justify-between transition-all disabled:opacity-50`}
                  >
                    <div className="flex items-center gap-2.5">
                      {isSubmitting ? (
                        <IonSpinner name="crescent" color="light" className="w-5 h-5" />
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                          <IonIcon
                            icon={hasClosedPharmacies ? alertCircleOutline : shieldCheckmarkOutline}
                            className="text-lg text-white"
                          />
                        </div>
                      )}
                      <span className="text-base font-bold tracking-tight">
                        {isSubmitting
                          ? 'Placing Order...'
                          : hasClosedPharmacies
                          ? 'Store Closed • Cannot Checkout'
                          : paymentMethod === 'cash'
                          ? 'Confirm Order'
                          : 'Proceed to Payment'}
                      </span>
                    </div>
                    <div
                      style={{ padding: '6px 14px', borderRadius: '10px' }}
                      className={`${
                        hasClosedPharmacies ? 'bg-slate-500/80' : 'bg-teal-700/80 hover:bg-teal-800/80'
                      } text-white font-black text-sm shadow-2xs flex items-center gap-1.5 shrink-0`}
                    >
                      <span>₱{grandTotal.toFixed(2)}</span>
                      <IonIcon icon={arrowForwardOutline} className="text-xs" />
                    </div>
                  </button>
                </div>
              </section>
            </>
          )}
        </div>

        {/* Sandbox Payment Modal */}
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          onSuccess={handlePaymentSuccess}
          method={paymentMethod}
          amount={grandTotal}
        />

        {/* Address Selection Modal */}
        <IonModal
          isOpen={isAddressSelectModalOpen}
          onDidDismiss={() => setIsAddressSelectModalOpen(false)}
        >
          <IonHeader className="ion-no-border bg-white border-b border-slate-100">
            <IonToolbar className="px-3" style={{ '--background': '#ffffff' } as React.CSSProperties}>
              <IonTitle className="font-bold text-slate-900 text-base">Select Delivery Address</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setIsAddressSelectModalOpen(false)} className="text-slate-500">
                  <IonIcon icon={closeOutline} className="text-xl" />
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="bg-slate-50">
            <div className="p-4 max-w-xl mx-auto space-y-3 pb-12">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Your Addresses ({savedAddresses.length})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddressSelectModalOpen(false);
                    setIsAddressFormModalOpen(true);
                  }}
                  className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1 cursor-pointer"
                >
                  <IonIcon icon={addOutline} className="text-sm" />
                  <span>Add New</span>
                </button>
              </div>

              {savedAddresses.map((addr) => {
                const isSelected = selectedAddress?.id === addr.id;
                return (
                  <div
                    key={addr.id}
                    onClick={() => {
                      setSelectedAddress(addr);
                      setIsAddressSelectModalOpen(false);
                    }}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                      isSelected
                        ? 'border-teal-600 bg-teal-50/40 ring-2 ring-teal-600/10 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider bg-teal-100 text-teal-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <IonIcon
                            icon={addr.label.toLowerCase().includes('work') ? briefcaseOutline : homeOutline}
                            className="text-xs"
                          />
                          {addr.label}
                        </span>
                        {addr.is_default && (
                          <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                            Default
                          </span>
                        )}
                        <span className="text-xs font-bold text-slate-800 truncate">{addr.recipient_name}</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-snug line-clamp-2">
                        {addr.address_line}
                        {addr.barangay_or_district ? `, ${addr.barangay_or_district}` : ''}
                        {addr.city ? `, ${addr.city}` : ''}
                      </p>
                      {addr.latitude && addr.longitude && (
                        <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-semibold">
                          <IonIcon icon={pinOutline} className="text-emerald-600 text-xs" />
                          <span>Exact Map Pin Set</span>
                        </div>
                      )}
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 transition-all ${
                        isSelected ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <IonIcon icon={checkmarkOutline} className="text-xs font-bold" />}
                    </div>
                  </div>
                );
              })}

              {savedAddresses.length === 0 && (
                <div className="text-center py-8 bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
                  <IonIcon icon={locationOutline} className="text-3xl text-teal-600" />
                  <p className="text-xs text-slate-600">You don't have any saved addresses yet.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddressSelectModalOpen(false);
                      setIsAddressFormModalOpen(true);
                    }}
                    style={{ padding: '10px 22px', borderRadius: '12px' }}
                    className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-md shadow-teal-600/20 active:scale-95 transition-all inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Add Address Now</span>
                  </button>
                </div>
              )}
            </div>
          </IonContent>
        </IonModal>

        {/* Add / Edit Address Form Modal */}
        <AddressFormModal
          isOpen={isAddressFormModalOpen}
          onClose={() => setIsAddressFormModalOpen(false)}
          title="Add Delivery Address"
          onSuccess={(newAddr) => {
            loadAddresses();
            setSelectedAddress(newAddr);
          }}
        />
      </IonContent>
    </IonPage>
  );
};

export default Cart;
