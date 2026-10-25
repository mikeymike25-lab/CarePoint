import React, { useState, useEffect, useCallback } from 'react';
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonTitle,
  IonIcon, IonCard, IonCardContent, IonCardHeader, IonCardTitle,
  IonButtons, IonMenuButton
} from '@ionic/react';
import { useNavigate } from 'react-router-dom';
import {
  medicalOutline, fitnessOutline, waterOutline,
  bandageOutline, notificationsOutline, searchOutline,
  storefrontOutline
} from 'ionicons/icons';
import {
  getFeaturedOTCMedicines,
  fetchLiveMedicines,
  fetchPartnerPharmacies,
  subscribeToCustomerCatalogRealtime,
  type MedicineDetailData,
  type PartnerPharmacyCard,
} from '../services/medicineService';
import { resolveMedicineImageUrl } from '../../shared/data/medicines';
import AdCarousel from '../components/AdCarousel';
import { useNotifications } from '../context/NotificationContext';
import NotificationModal from '../components/NotificationModal';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [featuredMedicines, setFeaturedMedicines] = useState<MedicineDetailData[]>(() =>
    getFeaturedOTCMedicines()
  );
  const [partnerPharmacies, setPartnerPharmacies] = useState<PartnerPharmacyCard[]>([]);

  const loadLiveHomeData = useCallback(async () => {
    const [meds, pharmacies] = await Promise.all([
      fetchLiveMedicines(),
      fetchPartnerPharmacies(),
    ]);
    // Show active OTC medicines, placing newly added catalog items (> 40) first so Admin/Staff additions are immediately visible
    const otc = meds
      .filter((m) => !m.item.requires_prescription && m.listings.length > 0)
      .sort((a, b) => {
        const aNew = a.item.item_id > 40 ? 1 : 0;
        const bNew = b.item.item_id > 40 ? 1 : 0;
        if (aNew !== bNew) return bNew - aNew;
        return a.item.item_id - b.item.item_id;
      });
    setFeaturedMedicines(otc);
    setPartnerPharmacies(pharmacies);
  }, []);

  useEffect(() => {
    loadLiveHomeData();
    const unsubscribe = subscribeToCustomerCatalogRealtime(() => {
      loadLiveHomeData();
    });
    return () => unsubscribe();
  }, [loadLiveHomeData]);

  const categories = [
    { name: 'Pain Relief', icon: medicalOutline, color: 'text-rose-500', bg: 'bg-rose-100' },
    { name: 'Cold & Flu', icon: waterOutline, color: 'text-sky-500', bg: 'bg-sky-100' },
    { name: 'Vitamins', icon: fitnessOutline, color: 'text-emerald-500', bg: 'bg-emerald-100' },
    { name: 'First Aid', icon: bandageOutline, color: 'text-amber-500', bg: 'bg-amber-100' },
  ];

  const handleSearchFocus = () => {
    navigate('/customer/search');
  };

  const handleCategoryClick = (categoryName: string) => {
    navigate('/customer/search', { state: { category: categoryName } });
  };

  const handleMedicineClick = (itemId: number) => {
    navigate(`/customer/medicine/${itemId}`);
  };

  const handleScrollToPharmacies = () => {
    const el = document.getElementById('partner-pharmacies');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="px-4 md:px-8" style={{ '--background': 'var(--bg-app)' } as React.CSSProperties}>
          <IonButtons slot="start" className="md:hidden">
            <IonMenuButton className="text-slate-900" />
          </IonButtons>
          <IonTitle className="pl-2 md:pl-0 flex items-center">
            <img src="/final-logo.png" alt="CarePoint" className="h-10 w-auto inline-block object-contain" />
          </IonTitle>
          <div slot="end" className="flex items-center">
            <button
              onClick={() => setShowNotificationsModal(true)}
              aria-label="Open notifications"
              className="relative w-10 h-10 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center cursor-pointer active:scale-95 hover:border-teal-500 hover:shadow-md transition-all"
            >
              <IonIcon icon={notificationsOutline} className="text-xl text-slate-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-xs animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>

        </IonToolbar>
      </IonHeader>

      <IonContent style={{ '--background': 'var(--bg-app)' } as React.CSSProperties}>
        <div className="px-4 md:px-8 py-6 max-w-5xl mx-auto w-full">
          {/* Advertisement Carousel */}
          <AdCarousel onScrollToPharmacies={handleScrollToPharmacies} />

        {/* Search Bar Shortcut */}
        <div 
          className="mb-8 flex items-center bg-white rounded-2xl px-5 py-4 shadow-[0_4px_12px_rgb(0,0,0,0.05)] border border-slate-100 cursor-pointer hover:border-teal-500 active:scale-[0.98] transition-all"
          onClick={handleSearchFocus}
        >
          <IonIcon icon={searchOutline} className="text-xl text-slate-400 mr-3" />
          <span className="text-slate-400 font-medium text-sm">Search for Paracetamol, Biogesic, Advil...</span>
        </div>

        {/* Categories */}
        <div className="mb-8">
          <div className="flex justify-between items-end mb-4">
            <h3 className="text-lg font-bold text-slate-900">Shop by Category</h3>
            <span 
              onClick={handleSearchFocus}
              className="text-xs font-semibold text-primary cursor-pointer hover:underline"
            >
              See All
            </span>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {categories.map((cat, idx) => (
              <div 
                key={idx} 
                onClick={() => handleCategoryClick(cat.name)}
                className="flex flex-col items-center cursor-pointer group active:scale-95 transition-transform"
              >
                <div className={`w-16 h-16 rounded-2xl ${cat.bg} flex items-center justify-center mb-2 shadow-sm group-hover:scale-105 transition-transform`}>
                  <IonIcon icon={cat.icon} className={`text-2xl ${cat.color}`} />
                </div>
                <span className="text-xs font-semibold text-slate-700 text-center leading-tight">{cat.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Popular OTC Medicines (Phase 4.3 Direct Access) */}
        <div className="mb-8">
          <div className="flex justify-between items-end mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Popular OTC Medicines</h3>
              <p className="text-xs text-slate-500">Verified over-the-counter essentials ({featuredMedicines.length} items)</p>
            </div>
            <span 
              onClick={handleSearchFocus}
              className="text-xs font-semibold text-primary cursor-pointer hover:underline"
            >
              View All
            </span>
          </div>

          <div className="flex overflow-x-auto gap-3.5 pb-2 snap-x hide-scrollbar">
            {featuredMedicines.map((m) => {
              const lowestPrice =
                m.listings.length > 0 ? Math.min(...m.listings.map((l) => l.price)) : 15;
              const highestPrice =
                m.listings.length > 0 ? Math.max(...m.listings.map((l) => l.price)) : lowestPrice;
              const totalStock = m.listings.reduce((acc, l) => acc + l.stockQuantity, 0);
              return (
                <div
                  key={m.item.item_id}
                  onClick={() => handleMedicineClick(m.item.item_id)}
                  className="min-w-[180px] max-w-[180px] bg-white rounded-2xl p-3.5 shadow-sm border border-slate-100 snap-start shrink-0 cursor-pointer hover:shadow-md hover:border-teal-500/30 active:scale-95 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="w-full h-24 rounded-xl overflow-hidden bg-slate-50 mb-3 border border-slate-100 flex items-center justify-center">
                      <img
                        src={resolveMedicineImageUrl(m.item.image_url)}
                        alt={m.item.brand_name || m.item.generic_name}
                        className="w-full h-full object-contain p-1.5"
                      />
                    </div>
                    <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full inline-block mb-1">
                      {m.item.category}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 truncate">
                      {m.item.brand_name || m.item.generic_name}
                    </h4>
                    <p className="text-xs text-slate-500 truncate">
                      {m.item.dosage_form}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-50 flex items-center justify-between gap-1">
                    <div className="min-w-0">
                      <span className="text-[10px] text-slate-400 block">
                        {highestPrice > lowestPrice ? 'Price Range' : 'Price'}
                      </span>
                      <span className="text-xs font-extrabold text-slate-900 truncate block">
                        {highestPrice > lowestPrice
                          ? `₱${lowestPrice.toFixed(2)}–₱${highestPrice.toFixed(2)}`
                          : `₱${lowestPrice.toFixed(2)}`}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${
                        totalStock > 0
                          ? 'text-emerald-600 bg-emerald-50'
                          : 'text-rose-600 bg-rose-50'
                      }`}
                    >
                      {totalStock > 0 ? 'In Stock' : 'Out of Stock'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Nearby Pharmacies (Live from Supabase approved pharmacies) */}
        <div className="mb-6 scroll-mt-6" id="partner-pharmacies">
          <div className="flex justify-between items-end mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Partner Pharmacies</h3>
              <p className="text-xs text-slate-500">
                Licensed community dispensing points ({partnerPharmacies.length} approved)
              </p>
            </div>
          </div>
          <div className="flex overflow-x-auto gap-4 pb-4 snap-x hide-scrollbar">
            {partnerPharmacies.map((item) => (
              <IonCard
                key={item.id}
                onClick={handleSearchFocus}
                className="min-w-[250px] shadow-sm border border-slate-100 rounded-2xl snap-start shrink-0 overflow-hidden cursor-pointer hover:shadow-md active:scale-95 transition-all"
                style={{ margin: 0 }}
              >
                <div className="h-28 bg-slate-200 relative">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  <span
                    className={`absolute top-2 right-2 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm ${
                      item.isOpen ? 'bg-emerald-500' : 'bg-slate-600'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
                <IonCardHeader className="p-4 pb-1">
                  <IonCardTitle className="text-sm font-bold text-slate-900 flex items-center">
                    <IonIcon icon={storefrontOutline} className="text-teal-600 mr-1.5 text-base" />
                    {item.name}
                  </IonCardTitle>
                </IonCardHeader>
                <IonCardContent className="p-4 pt-0">
                  <p className="text-xs text-slate-600 truncate">{item.address}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{item.dist} • {item.hours}</p>
                  {item.phone && (
                    <p className="text-[11px] text-teal-700 font-semibold mt-0.5">{item.phone}</p>
                  )}
                </IonCardContent>
              </IonCard>
            ))}
          </div>
        </div>
        </div>
      </IonContent>
      <NotificationModal
        isOpen={showNotificationsModal}
        onDismiss={() => setShowNotificationsModal(false)}
      />
    </IonPage>
  );
};

export default Home;
