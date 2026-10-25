import React, { useState, useEffect } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonContent,
  IonIcon,
  IonButton,
  IonSpinner,
  IonToast,
  IonModal,
} from '@ionic/react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  checkmarkCircleOutline,
  alertCircleOutline,
  storefrontOutline,
  cartOutline,
  shieldCheckmarkOutline,
  informationCircleOutline,
  fitnessOutline,
  addOutline,
  removeOutline,
  shareSocialOutline,
  locationOutline,
  pricetagOutline,
  chatbubblesOutline,
  timeOutline,
  callOutline,
} from 'ionicons/icons';
import {
  fetchMedicineDetail,
  subscribeToCustomerCatalogRealtime,
  type MedicineDetailData,
  type PharmacyListing,
} from '../services/medicineService';
import { createPrescriptionInquiry } from '../services/chatService';
import { useCart } from '../context/CartContext';
import { useAuth } from '../../shared/context/AuthContext';
import { resolveMedicineImageUrl } from '../../shared/data/medicines';

const MedicineDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { profile } = useAuth();

  const [data, setData] = useState<MedicineDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPharmacyId, setSelectedPharmacyId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'dosage' | 'uses' | 'safety'>('dosage');

  // Toast notification state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Inquiry state
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [creatingInquiry, setCreatingInquiry] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const itemId = Number(id) || 1;

    const loadMedicine = async (isInitial = false) => {
      if (isInitial) setLoading(true);
      const result = await fetchMedicineDetail(itemId);
      if (!isMounted) return;
      setData(result);
      if (result && result.listings.length > 0) {
        setSelectedPharmacyId((prevId) => {
          if (prevId && result.listings.some((l) => l.pharmacyId === prevId)) {
            return prevId;
          }
          // Default to first open in-stock pharmacy (MetroCare #1 first), or first available
          const defaultStore =
            result.listings.find((l) => l.isOpen && l.stockQuantity > 0) ||
            result.listings.find((l) => l.stockQuantity > 0) ||
            result.listings[0];
          return defaultStore.pharmacyId;
        });
      } else {
        setSelectedPharmacyId(null);
      }
      if (isInitial) setLoading(false);
    };

    loadMedicine(true);
    const unsubscribe = subscribeToCustomerCatalogRealtime(() => {
      loadMedicine(false);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [id]);

  if (loading) {
    return (
      <IonPage>
        <IonHeader className="ion-no-border">
          <IonToolbar style={{ '--background': 'var(--bg-app)' } as React.CSSProperties}>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/customer/search" text="" />
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding flex items-center justify-center">
          <div className="flex flex-col items-center justify-center h-full pt-32">
            <IonSpinner name="crescent" color="primary" />
            <p className="text-slate-500 mt-4 font-medium text-sm">Loading medicine details...</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (!data) {
    return (
      <IonPage>
        <IonHeader className="ion-no-border">
          <IonToolbar style={{ '--background': 'var(--bg-app)' } as React.CSSProperties}>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/customer/search" text="" />
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <div className="text-center py-16">
            <IonIcon icon={alertCircleOutline} className="text-6xl text-slate-400 mb-3" />
            <h2 className="text-xl font-bold text-slate-800">Medicine Not Found</h2>
            <p className="text-slate-500 text-sm mt-1 mb-6">
              The medicine you are looking for may have been removed or is unavailable.
            </p>
            <IonButton routerLink="/customer/search" fill="outline" color="primary" className="rounded-xl">
              Browse Catalog
            </IonButton>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const { item, listings } = data;
  const isRx = item.requires_prescription;

  const selectedPharmacy: PharmacyListing | undefined = listings.find(
    (l) => l.pharmacyId === selectedPharmacyId
  );

  const currentPrice = selectedPharmacy ? selectedPharmacy.price : 0;
  const currentStock = selectedPharmacy ? selectedPharmacy.stockQuantity : 0;
  const isOutOfStock = !selectedPharmacy || currentStock <= 0;
  const isStoreClosed = selectedPharmacy ? !selectedPharmacy.isOpen : false;

  const handleDecreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity((q) => q - 1);
    }
  };

  const handleIncreaseQuantity = () => {
    if (quantity < currentStock) {
      setQuantity((q) => q + 1);
    }
  };

  const handleQuantityInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (isNaN(val) || val < 1) {
      setQuantity(1);
    } else if (val > currentStock) {
      setQuantity(currentStock);
    } else {
      setQuantity(val);
    }
  };

  const handlePharmacySelect = (pharmacy: PharmacyListing) => {
    setSelectedPharmacyId(pharmacy.pharmacyId);
    if (quantity > pharmacy.stockQuantity) {
      setQuantity(Math.max(1, pharmacy.stockQuantity));
    }
  };

  const handleAddToCart = () => {
    if (isRx) return;
    if (!selectedPharmacy || isOutOfStock || isStoreClosed) return;

    const res = addToCart(
      {
        itemId: item.item_id,
        pharmacyId: selectedPharmacy.pharmacyId,
        pharmacyName: selectedPharmacy.pharmacyName,
        brandName: item.brand_name,
        genericName: item.generic_name,
        dosageForm: item.dosage_form,
        category: item.category,
        price: selectedPharmacy.price,
        maxStock: selectedPharmacy.stockQuantity,
        imageUrl: resolveMedicineImageUrl(item.image_url),
        requiresPrescription: item.requires_prescription,
      },
      quantity
    );

    if (res.success) {
      setToastMessage(res.message);
      setShowToast(true);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${item.brand_name || item.generic_name} on CarePoint`,
          text: `Check price and stock for ${item.brand_name || item.generic_name} (${item.dosage_form}) on CarePoint.`,
          url: window.location.href,
        });
      } catch {
        // dismissed share dialog
      }
    } else {
      navigator.clipboard?.writeText(window.location.href);
      setToastMessage('Medicine link copied to clipboard!');
      setShowToast(true);
    }
  };

  const handleCreateInquiry = async () => {
    if (!selectedPharmacy || !profile) return;
    setCreatingInquiry(true);
    try {
      const inquiry = await createPrescriptionInquiry(
        selectedPharmacy.pharmacyId,
        item.item_id,
        `Hi, do you have ${item.brand_name || item.generic_name} in stock? I have a prescription and would like to buy it in-store.`,
        profile.id
      );
      setShowInquiryModal(false);
      navigate(`/customer/messages/inquiry/${inquiry.inquiry_id}`);
    } catch (error) {
      console.error(error);
      setToastMessage('Failed to create inquiry. Please try again.');
      setShowToast(true);
    } finally {
      setCreatingInquiry(false);
    }
  };

  return (
    <IonPage>
      {/* Top Header */}
      <IonHeader className="ion-no-border">
        <IonToolbar className="pt-2 px-2" style={{ '--background': 'var(--bg-app)' } as React.CSSProperties}>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/customer/search" text="" />
          </IonButtons>
          <div slot="end" className="pr-3">
            <button
              onClick={handleShare}
              aria-label="Share Medicine"
              className="w-10 h-10 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center text-slate-600 hover:text-primary transition-all active:scale-90 cursor-pointer"
              style={{ padding: 0, borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <IonIcon icon={shareSocialOutline} className="text-lg" />
            </button>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent style={{ '--background': 'var(--bg-app)' } as React.CSSProperties}>
        <div className="max-w-2xl mx-auto pb-28 px-4 md:px-8 pt-4">

          {/* PRESCRIPTION SAFEGUARD BANNER (Hard Rule Compliance) */}
          {isRx && (
            <div className="mb-5 bg-amber-50 border-l-4 border-amber-500 rounded-2xl p-4 shadow-sm">
              <div className="flex items-start">
                <IonIcon icon={alertCircleOutline} className="text-2xl text-amber-600 mr-3 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-900 text-sm">Prescription Required (In-Store Only)</h4>
                  <p className="text-amber-800 text-xs mt-1 leading-relaxed">
                    Under Philippine FDA pharmacy regulations and CarePoint safety rules, prescription medicines
                    cannot be ordered online. This listing is informational only. Please visit your local pharmacy
                    in person with a valid physical prescription from a licensed physician.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Product Hero Image Card */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-6 flex flex-col items-center">
            <div className="w-48 h-48 rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center relative mb-4">
              {item.image_url ? (
                <img
                  src={resolveMedicineImageUrl(item.image_url)}
                  alt={item.brand_name || item.generic_name}
                  className="w-full h-full object-contain p-2"
                />
              ) : (
                <IonIcon icon={fitnessOutline} className="text-6xl text-slate-300" />
              )}
              {isRx ? (
                <span className="absolute top-2 right-2 bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Rx Only
                </span>
              ) : (
                <span className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                  <IonIcon icon={shieldCheckmarkOutline} className="text-xs" /> OTC Certified
                </span>
              )}
            </div>

            {/* Medicine Title & Classification */}
            <div className="text-center w-full">
              <div className="inline-block bg-teal-50 text-teal-700 text-xs font-semibold px-3 py-1 rounded-full mb-2">
                {item.category}
              </div>
              <h1 className="text-2xl font-bold text-slate-900 leading-tight">
                {item.brand_name ? `${item.brand_name} ${item.dosage_form}` : `${item.generic_name} ${item.dosage_form}`}
              </h1>
              <p className="text-slate-500 text-sm font-medium mt-1">
                Generic: <span className="text-slate-800 font-semibold">{item.generic_name}</span> • {item.dosage_form}
              </p>
            </div>
          </div>

          {/* Pharmacy Selection & Real-Time Price Comparison Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center">
                  <IonIcon icon={storefrontOutline} className="text-teal-600 mr-2 text-lg" />
                  Available at Nearby Pharmacies
                </h3>
                <p className="text-xs text-slate-500">Compare prices and select a fulfillment store</p>
              </div>
              <span className="text-xs font-semibold text-teal-600 bg-teal-50 px-2 py-1 rounded-full">
                {listings.length} {listings.length === 1 ? 'store' : 'stores'}
              </span>
            </div>

            {listings.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 border border-slate-200 text-center">
                <p className="text-sm font-bold text-slate-700">Currently Hidden from Online Storefront</p>
                <p className="text-xs text-slate-500 mt-1">
                  Partner pharmacies have temporarily paused online listings for this item.
                </p>
              </div>
            ) : (
            <div className="space-y-3">
              {listings.map((pharmacy) => {
                const isSelected = selectedPharmacyId === pharmacy.pharmacyId;
                const outOfStock = pharmacy.stockQuantity <= 0;

                return (
                  <div
                    key={pharmacy.pharmacyId}
                    onClick={() => handlePharmacySelect(pharmacy)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer relative active:scale-[0.98] ${
                      isSelected
                        ? 'bg-teal-50/40 border-teal-600 ring-2 ring-teal-600/20 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-start space-x-3">
                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center mt-1 transition-colors ${
                            isSelected
                              ? 'border-teal-600 bg-teal-600 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900 text-sm">{pharmacy.pharmacyName}</h4>
                            {pharmacy.isBestPrice && (
                              <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                                <IonIcon icon={pricetagOutline} className="text-[11px]" /> Best Price
                              </span>
                            )}
                          </div>
                          <p className="text-slate-500 text-xs flex items-center mt-0.5">
                            <IonIcon icon={locationOutline} className="mr-1 text-slate-400" />
                            {pharmacy.distance} • {pharmacy.address}
                          </p>
                          {(pharmacy.operatingHours || pharmacy.phoneNumber) && (
                            <p className="text-slate-400 text-[11px] flex items-center gap-2 mt-0.5 flex-wrap">
                              {pharmacy.operatingHours && (
                                <span className="inline-flex items-center">
                                  <IonIcon icon={timeOutline} className="mr-1 text-slate-400" />
                                  {pharmacy.operatingHours}
                                </span>
                              )}
                              {pharmacy.phoneNumber && (
                                <span className="inline-flex items-center text-teal-700 font-medium">
                                  <IonIcon icon={callOutline} className="mr-1 text-teal-600" />
                                  {pharmacy.phoneNumber}
                                </span>
                              )}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <span
                              className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                                pharmacy.isOpen ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                              }`}
                            >
                              {pharmacy.isOpen ? 'Open Now' : 'Closed'}
                            </span>
                            <span
                              className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                                outOfStock
                                  ? 'bg-rose-50 text-rose-600 font-semibold'
                                  : pharmacy.stockQuantity <= 20
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {outOfStock
                                ? 'Out of stock'
                                : pharmacy.stockQuantity <= 20
                                ? `Low Stock (${pharmacy.stockQuantity} left)`
                                : `${pharmacy.stockQuantity} in stock`}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Price Column */}
                      <div className="text-right">
                        <div className="text-lg font-bold text-slate-900">
                          ₱{pharmacy.price.toFixed(2)}
                        </div>
                        <span className="text-[11px] text-slate-400 block">per unit</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            )}
          </div>

          {/* Medical Information Tabs */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 mb-6">
            <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center gap-1.5 mb-5">
              <button
                type="button"
                onClick={() => setActiveTab('dosage')}
                className={`flex-1 text-xs font-bold transition-all active:scale-95 cursor-pointer text-center ${
                  activeTab === 'dosage'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
                style={{ padding: '10px 12px', borderRadius: '12px', border: 'none', outline: 'none' }}
              >
                Dosage
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('uses')}
                className={`flex-1 text-xs font-bold transition-all active:scale-95 cursor-pointer text-center ${
                  activeTab === 'uses'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
                style={{ padding: '10px 12px', borderRadius: '12px', border: 'none', outline: 'none' }}
              >
                Indications
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('safety')}
                className={`flex-1 text-xs font-bold transition-all active:scale-95 cursor-pointer text-center ${
                  activeTab === 'safety'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
                style={{ padding: '10px 12px', borderRadius: '12px', border: 'none', outline: 'none' }}
              >
                Packaging & Safety
              </button>
            </div>

            {/* Tab Contents */}
            {activeTab === 'dosage' && (
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center">
                  <IonIcon icon={informationCircleOutline} className="text-teal-600 mr-2 text-base" />
                  Recommended Dosage & Directions
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  {item.dosage_instructions ||
                    'Take 1 to 2 tablets every 4 to 6 hours as needed for relief. Consult a healthcare provider if symptoms worsen.'}
                </p>
              </div>
            )}

            {activeTab === 'uses' && (
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center">
                  <IonIcon icon={checkmarkCircleOutline} className="text-teal-600 mr-2 text-base" />
                  Indications & Uses
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  {item.indications ||
                    'Indicated for the relief of mild to moderate pain and temporary fever reduction.'}
                </p>
              </div>
            )}

            {activeTab === 'safety' && (
              <div className="space-y-3">
                <div>
                  <h5 className="text-xs font-bold text-slate-700 mb-1">Packaging</h5>
                  <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {item.packaging || 'Standard pharmaceutical blister strip formulation.'}
                  </p>
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-700 mb-1">Precautions & Safety</h5>
                  <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {item.side_effects ||
                      'Do not exceed the maximum daily dose. Keep out of reach of children. Store below 30°C away from direct sunlight.'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Closed Pharmacy Notice */}
          {!isRx && isStoreClosed && (
            <div className="bg-rose-50 border border-rose-200 rounded-3xl p-4 mb-5 flex items-start gap-3 shadow-xs">
              <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
                <IonIcon icon={alertCircleOutline} className="text-xl" />
              </div>
              <div className="text-xs">
                <span className="font-bold text-rose-900 block text-sm">Pharmacy is Currently Closed</span>
                <p className="mt-0.5 text-rose-700 leading-relaxed">
                  <strong>{selectedPharmacy?.pharmacyName}</strong> is not accepting online orders at this time. You can view product details or choose an open partner pharmacy above.
                </p>
              </div>
            </div>
          )}

          {/* Quantity Stepper with Stock Ceiling Validation */}
          {!isRx && (
            <div className={`bg-white rounded-3xl p-5 shadow-sm border mb-6 transition-all ${isStoreClosed ? 'border-rose-100 opacity-75' : 'border-slate-100'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Select Quantity</h4>
                  <p className="text-xs text-slate-500">
                    {isStoreClosed
                      ? 'Ordering unavailable while pharmacy is closed'
                      : isOutOfStock
                      ? 'Item unavailable at selected store'
                      : `Max ${currentStock} units available at ${selectedPharmacy?.pharmacyName}`}
                  </p>
                </div>

                {/* Stepper Buttons */}
                <div className="flex items-center bg-slate-100 rounded-2xl p-1 border border-slate-200">
                  <button
                    type="button"
                    onClick={handleDecreaseQuantity}
                    disabled={quantity <= 1 || isOutOfStock || isStoreClosed}
                    aria-label="Decrease quantity"
                    className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-700 shadow-sm disabled:opacity-40 disabled:bg-transparent transition-all active:scale-90 cursor-pointer"
                    style={{ padding: 0, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <IonIcon icon={removeOutline} className="text-base" />
                  </button>

                  <input
                    type="number"
                    value={quantity}
                    onChange={handleQuantityInputChange}
                    disabled={isOutOfStock || isStoreClosed}
                    min={1}
                    max={currentStock}
                    className="w-12 text-center bg-transparent font-bold text-slate-900 text-base focus:outline-none disabled:text-slate-400"
                    aria-label="Item quantity"
                  />

                  <button
                    type="button"
                    onClick={handleIncreaseQuantity}
                    disabled={quantity >= currentStock || isOutOfStock || isStoreClosed}
                    aria-label="Increase quantity"
                    className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-700 shadow-sm disabled:opacity-40 disabled:bg-transparent transition-all active:scale-90 cursor-pointer"
                    style={{ padding: 0, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <IonIcon icon={addOutline} className="text-base" />
                  </button>
                </div>
              </div>

              {/* Ceiling Alert if reached */}
              {!isStoreClosed && quantity >= currentStock && currentStock > 0 && (
                <div className="mt-3 text-[11px] text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl flex items-center">
                  <IonIcon icon={alertCircleOutline} className="mr-1.5 text-sm shrink-0" />
                  You have reached the maximum available inventory ceiling for this pharmacy.
                </div>
              )}
            </div>
          )}

        </div>
      </IonContent>

      {/* Bottom Sticky Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-5 py-4 shadow-lg z-50">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
              {isRx ? 'Consultation Price' : 'Estimated Total'}
            </span>
            <div className="text-2xl font-black text-slate-900 leading-tight">
              ₱{(currentPrice * (isRx ? 1 : quantity)).toFixed(2)}
            </div>
          </div>

          {isRx ? (
            <IonButton
              expand="block"
              onClick={() => setShowInquiryModal(true)}
              className="flex-1 h-14 rounded-full font-bold text-sm shadow-md transition-transform active:scale-95"
              style={
                {
                  '--background': '#0D9488',
                  '--background-activated': '#0F766E',
                  '--border-radius': '9999px',
                } as React.CSSProperties
              }
            >
              <IonIcon icon={chatbubblesOutline} slot="start" className="text-xl mr-1" />
              Inquire In-Store Stock
            </IonButton>
          ) : (
            <IonButton
              expand="block"
              disabled={isOutOfStock || isStoreClosed}
              onClick={handleAddToCart}
              className="flex-1 h-14 rounded-full font-bold text-base shadow-md transition-transform active:scale-95"
              style={
                {
                  '--background': isStoreClosed ? '#64748B' : '#0D9488',
                  '--background-activated': isStoreClosed ? '#64748B' : '#0F766E',
                  '--border-radius': '9999px',
                } as React.CSSProperties
              }
            >
              <IonIcon icon={cartOutline} slot="start" className="text-xl mr-1" />
              {isStoreClosed
                ? 'Store Currently Closed'
                : isOutOfStock
                ? 'Out of Stock'
                : `Add to Cart • ₱${(currentPrice * quantity).toFixed(2)}`}
            </IonButton>
          )}
        </div>
      </div>

      {/* Toast Notification with View Cart Action */}
      <IonToast
        isOpen={showToast}
        onDidDismiss={() => setShowToast(false)}
        message={toastMessage}
        duration={3500}
        position="bottom"
        color="dark"
        className="mb-20 font-medium"
        buttons={[
          {
            text: 'View Cart',
            role: 'info',
            handler: () => {
              navigate('/customer/cart');
            },
          },
          {
            icon: checkmarkCircleOutline,
            role: 'cancel',
          },
        ]}
      />

      {/* Prescription Inquiry Confirmation Modal */}
      <IonModal isOpen={showInquiryModal} onDidDismiss={() => setShowInquiryModal(false)} initialBreakpoint={1} breakpoints={[0, 1]} className="modal-bottom-sheet">
        <div className="p-6 bg-white pb-12">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6" />
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <IonIcon icon={alertCircleOutline} className="text-2xl text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">Prescription Required</h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                You are about to start a chat to check stock for <span className="font-bold text-slate-800">{item.brand_name || item.generic_name}</span> at <span className="font-bold text-slate-800">{selectedPharmacy?.pharmacyName}</span>.
                You must present a valid physical prescription at the store to purchase this item.
              </p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <IonButton expand="block" fill="outline" color="medium" onClick={() => setShowInquiryModal(false)} className="flex-1 rounded-xl">
              Cancel
            </IonButton>
            <IonButton expand="block" color="primary" onClick={handleCreateInquiry} disabled={creatingInquiry} className="flex-1 rounded-xl shadow-sm">
              {creatingInquiry ? <IonSpinner name="dots" /> : 'Start Chat'}
            </IonButton>
          </div>
        </div>
      </IonModal>
    </IonPage>
  );
};

export default MedicineDetail;
