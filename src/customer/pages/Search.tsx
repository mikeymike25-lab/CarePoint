import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  IonPage, IonContent, IonHeader, IonToolbar, IonTitle,
  IonIcon, IonButtons, IonMenuButton
} from '@ionic/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  timeOutline, 
  warningOutline, 
  searchOutline, 
  chevronForwardOutline,
  closeOutline,
  storefrontOutline,
  shieldCheckmarkOutline,
  filterOutline
} from 'ionicons/icons';
import {
  getAllMedicines,
  fetchLiveMedicines,
  subscribeToCustomerCatalogRealtime,
  type MedicineDetailData,
} from '../services/medicineService';
import { resolveMedicineImageUrl } from '../../shared/data/medicines';

const CATEGORIES = ['All', 'Pain Relief', 'Cold & Flu', 'Digestive', 'Vitamins', 'Allergy', 'First Aid', 'Antibiotic', 'Blood Pressure'];
const POPULAR_SEARCHES = ['Paracetamol', 'Biogesic', 'Vitamins', 'Pain Relief', 'Advil', 'Cetirizine'];

const Search: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const inputRef = useRef<HTMLInputElement>(null);

  const [allMedicines, setAllMedicines] = useState<MedicineDetailData[]>(() => getAllMedicines());

  const loadMedicines = useCallback(async () => {
    const live = await fetchLiveMedicines();
    const sorted = [...live].sort((a, b) => {
      const aNew = a.item.item_id > 40 ? 1 : 0;
      const bNew = b.item.item_id > 40 ? 1 : 0;
      if (aNew !== bNew) return bNew - aNew;
      return a.item.item_id - b.item.item_id;
    });
    setAllMedicines(sorted);
  }, []);

  useEffect(() => {
    loadMedicines();
    const unsubscribe = subscribeToCustomerCatalogRealtime(() => {
      loadMedicines();
    });
    return () => unsubscribe();
  }, [loadMedicines]);

  // Handle incoming category from navigation state (e.g. from Home page)
  useEffect(() => {
    const passedCategory = (location.state as { category?: string })?.category;
    if (passedCategory) {
      if (CATEGORIES.includes(passedCategory)) {
        setSelectedCategory(passedCategory);
      } else {
        setSearchText(passedCategory);
      }
    }
    setTimeout(() => {
      inputRef.current?.focus();
    }, 150);
  }, [location.state]);

  // Dynamic filter based on search query and category
  const filteredMedicines = useMemo(() => {
    return allMedicines.filter((med) => {
      // Hide OTC items that Staff explicitly deactivated across all pharmacies
      if (!med.item.requires_prescription && med.listings.length === 0) {
        return false;
      }

      // 1. Category Filter
      const matchesCategory =
        selectedCategory === 'All' ||
        med.item.category.toLowerCase() === selectedCategory.toLowerCase();
      if (!matchesCategory) return false;

      // 2. Text Query Filter
      if (!searchText.trim()) return true;

      const q = searchText.toLowerCase().trim();
      const brand = (med.item.brand_name || '').toLowerCase();
      const generic = med.item.generic_name.toLowerCase();
      const category = med.item.category.toLowerCase();
      const dosage = med.item.dosage_form.toLowerCase();
      const indications = (med.item.indications || '').toLowerCase();

      return (
        brand.includes(q) ||
        generic.includes(q) ||
        category.includes(q) ||
        dosage.includes(q) ||
        indications.includes(q)
      );
    });
  }, [allMedicines, searchText, selectedCategory]);

  const handleSearch = (text: string) => {
    setSearchText(text);
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
  };

  // Navigate directly to the detail page for ALL medicines (OTC and Rx alike).
  // Rx items show their own amber warning banner + "Inquire In-Store Stock"
  // button on the detail page — blocking the user here prevented that flow.
  const handleItemClick = (med: MedicineDetailData) => {
    navigate(`/customer/medicine/${med.item.item_id}`);
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="px-4 md:px-8" style={{ '--background': 'var(--bg-app)' } as React.CSSProperties}>
          <IonButtons slot="start" className="md:hidden">
            <IonMenuButton className="text-slate-900" />
          </IonButtons>
          <IonTitle className="font-bold text-slate-800 pl-2 md:pl-0">
            Discover
          </IonTitle>
        </IonToolbar>

        <div className="bg-[var(--bg-app)] pb-3 px-4 md:px-8 border-b border-slate-200/70">
          <div className="max-w-5xl mx-auto flex flex-col gap-3">
            <div className="w-full flex items-center bg-white rounded-2xl px-4 py-3 border border-slate-200 shadow-sm focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100 transition-all">
              <IonIcon icon={searchOutline} className="text-slate-400 text-lg mr-3 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={searchText}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search by brand, generic name, or symptom..."
                className="w-full bg-transparent text-slate-900 text-sm font-medium focus:outline-none placeholder:text-slate-400"
              />
              {searchText.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleSearch('')}
                  aria-label="Clear search text"
                  className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all shrink-0 cursor-pointer"
                  style={{ padding: 0, borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <IonIcon icon={closeOutline} className="text-sm" />
                </button>
              )}
            </div>

            {/* Category Filter Chips */}
            <div className="w-full flex items-center gap-2 overflow-x-auto hide-scrollbar pb-0.5">
              <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1 shrink-0">
                <IonIcon icon={filterOutline} className="text-xs" /> Filter:
              </span>
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleCategorySelect(cat)}
                    className={`text-xs px-3.5 py-1.5 rounded-full font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-teal-600 text-white shadow-sm'
                        : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                    }`}
                    style={{ borderRadius: '9999px', padding: '6px 14px' }}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </IonHeader>

      <IonContent style={{ '--background': 'var(--bg-app)' } as React.CSSProperties}>
        <div className="px-4 md:px-8 py-6 max-w-5xl mx-auto w-full flex flex-col">
          
          {/* Popular Searches when query is empty */}
          {searchText === '' && selectedCategory === 'All' && (
            <div className="mb-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Popular Searches</h3>
              <div className="flex flex-wrap gap-2">
                {POPULAR_SEARCHES.map((term) => (
                  <button 
                    key={term} 
                    type="button"
                    onClick={() => handleSearch(term)}
                    className="bg-white border border-slate-200 text-slate-700 px-3.5 py-1.5 rounded-full text-xs font-medium shadow-xs flex items-center cursor-pointer hover:border-teal-500 hover:text-teal-700 active:scale-95 transition-all"
                    style={{ padding: '6px 14px', borderRadius: '9999px' }}
                  >
                    <IonIcon icon={timeOutline} className="mr-1.5 text-slate-400 text-sm" />
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Results Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {searchText || selectedCategory !== 'All' ? 'Search Results' : 'Available Medicines'}
              </h2>
              <p className="text-xs text-slate-500">
                Found {filteredMedicines.length} {filteredMedicines.length === 1 ? 'medicine' : 'medicines'}
                {selectedCategory !== 'All' ? ` in ${selectedCategory}` : ''}
              </p>
            </div>

            {(searchText || selectedCategory !== 'All') && (
              <button
                type="button"
                onClick={() => {
                  setSearchText('');
                  setSelectedCategory('All');
                }}
                className="text-xs font-semibold text-teal-600 hover:underline cursor-pointer"
              >
                Reset filters
              </button>
            )}
          </div>

          {/* Modern Medicine Cards List */}
          {filteredMedicines.length > 0 ? (
            <div className="flex flex-col gap-3">
              {filteredMedicines.map((med) => {
                const lowestPrice = med.listings.length > 0
                  ? Math.min(...med.listings.map((l) => l.price))
                  : null;
                const highestPrice = med.listings.length > 0
                  ? Math.max(...med.listings.map((l) => l.price))
                  : lowestPrice;
                const availablePharmacies = med.listings.filter((l) => l.stockQuantity > 0).length;
                const totalStock = med.listings.reduce((acc, l) => acc + l.stockQuantity, 0);

                return (
                  <div
                    key={med.item.item_id}
                    onClick={() => handleItemClick(med)}
                    className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-teal-500/40 transition-all cursor-pointer flex flex-col gap-3 group active:scale-[0.99]"
                  >
                    <div className="flex items-start gap-3.5">
                      {/* Product Thumbnail */}
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-slate-50 border border-slate-100 shrink-0 flex items-center justify-center relative p-1">
                        <img
                          src={resolveMedicineImageUrl(med.item.image_url)}
                          alt={med.item.brand_name || med.item.generic_name}
                          className="w-full h-full object-contain rounded-lg group-hover:scale-105 transition-transform duration-300"
                        />
                        {med.item.requires_prescription && (
                          <div className="absolute top-1 left-1 bg-rose-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-xs uppercase tracking-wider">
                            Rx
                          </div>
                        )}
                      </div>

                      {/* Main Details */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="text-base font-bold text-slate-900 leading-snug truncate group-hover:text-teal-700 transition-colors">
                              {med.item.brand_name || med.item.generic_name}
                            </h3>
                            {med.item.brand_name && (
                              <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                                {med.item.generic_name}
                              </p>
                            )}
                          </div>

                          {/* Price Tag */}
                          <div className="text-right shrink-0">
                            {med.item.requires_prescription ? (
                              <div>
                                <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded uppercase tracking-wider block">
                                  In-Store Rx
                                </span>
                                {lowestPrice !== null && (
                                  <span className="text-xs font-bold text-slate-600 mt-0.5 block">
                                    {highestPrice !== null && highestPrice > lowestPrice
                                      ? `₱${lowestPrice.toFixed(2)}–₱${highestPrice.toFixed(2)}`
                                      : `₱${lowestPrice.toFixed(2)}`}
                                  </span>
                                )}
                              </div>
                            ) : lowestPrice !== null ? (
                              <div>
                                <span className="text-[10px] text-slate-400 font-medium block">
                                  {highestPrice !== null && highestPrice > lowestPrice ? 'Price Range' : 'Price'}
                                </span>
                                <span className="text-sm sm:text-base font-black text-teal-700 leading-none">
                                  {highestPrice !== null && highestPrice > lowestPrice
                                    ? `₱${lowestPrice.toFixed(2)}–₱${highestPrice.toFixed(2)}`
                                    : `₱${lowestPrice.toFixed(2)}`}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs font-medium text-slate-400">Inquire</span>
                            )}
                          </div>
                        </div>

                        {/* Badges & Form */}
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md">
                            {med.item.category}
                          </span>
                          <span className="text-[10px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                            {med.item.dosage_form}
                          </span>
                          {med.item.requires_prescription ? (
                            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                              <IonIcon icon={warningOutline} className="text-xs" /> Prescription Only
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                              <IonIcon icon={shieldCheckmarkOutline} className="text-xs" /> OTC Approved
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Info Row */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100/80 text-[11px] text-slate-400">
                      <div className="flex items-center gap-1">
                        <IonIcon icon={storefrontOutline} className="text-slate-400 text-xs shrink-0" />
                        <span>
                          {availablePharmacies > 0
                            ? `Available at ${availablePharmacies} partner ${availablePharmacies === 1 ? 'pharmacy' : 'pharmacies'} • ${totalStock} in stock`
                            : 'Out of stock — consult pharmacy'}
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5 text-teal-600 font-bold group-hover:translate-x-0.5 transition-transform">
                        <span>View</span>
                        <IonIcon icon={chevronForwardOutline} className="text-xs" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-10 text-center border border-slate-100 shadow-sm mt-2">
              <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-400">
                <IonIcon icon={searchOutline} className="text-3xl" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">No medicines found</h3>
              <p className="text-slate-500 text-xs max-w-sm mx-auto mb-4 leading-relaxed">
                We couldn't find any medicine matching "{searchText}" in {selectedCategory === 'All' ? 'the catalog' : selectedCategory}. Try searching by generic name (e.g. Paracetamol) or brand (e.g. Biogesic).
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchText('');
                  setSelectedCategory('All');
                }}
                className="bg-teal-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm hover:bg-teal-700 active:scale-95 transition-all cursor-pointer inline-flex items-center gap-1.5"
                style={{ borderRadius: '12px', padding: '10px 18px' }}
              >
                Clear Search & Filters
              </button>
            </div>
          )}

        </div>
      </IonContent>

    </IonPage>
  );
};

export default Search;
