import React, { useState, useEffect, useRef, useCallback } from 'react';
import { IonIcon, IonModal } from '@ionic/react';
import { useNavigate } from 'react-router-dom';
import {
  shieldCheckmarkOutline,
  storefrontOutline,
  ribbonOutline,
  sparklesOutline,
  arrowForwardOutline,
  closeOutline,
  informationCircleOutline,
  checkmarkCircleOutline,
  documentTextOutline,
  medicalOutline,
  heartOutline,
  checkmarkDoneOutline
} from 'ionicons/icons';

export interface AdSlide {
  id: string;
  badge: {
    icon: string;
    text: string;
  };
  title: string;
  subtitle: string;
  ctaText: string;
  ctaType: 'navigate_search' | 'scroll_pharmacies' | 'open_discount_modal' | 'open_about_modal';
  bgGradient: string;
  bgColor?: string;
  bgColorEnd?: string;
  subtextColor: string;
  textColorHex: string;
  iconBgHex: string;
  decorativeIcon: string;
  tagline?: string;
  features?: string[];
}

const SLIDES: AdSlide[] = [
  {
    id: 'otc-fast',
    badge: {
      icon: shieldCheckmarkOutline,
      text: '100% Certified OTC'
    },
    title: 'Need medicine fast?',
    subtitle: 'Compare real-time prices and order genuine OTC remedies from verified local pharmacies in your area.',
    ctaText: 'Find Medicine Fast',
    ctaType: 'navigate_search',
    bgGradient: 'from-[#0D9488] to-[#0F766E]', // Signature CarePoint soft teal
    bgColor: '#0D9488',
    bgColorEnd: '#0F766E',
    subtextColor: 'text-teal-100',
    textColorHex: '#0F766E',
    iconBgHex: 'rgba(15, 118, 110, 0.12)',
    decorativeIcon: medicalOutline,
    tagline: 'Instant Availability Check',
    features: ['15-Min Express Pickup', 'Licensed Drugstores']
  },
  {
    id: 'discounts',
    badge: {
      icon: ribbonOutline,
      text: 'Special Privileges • 20% Off'
    },
    title: 'PWD & Senior Discounts',
    subtitle: 'Avail statutory 20% savings on eligible OTC health essentials. Fast verification with your government ID.',
    ctaText: 'Discount Guidelines',
    ctaType: 'open_discount_modal',
    bgGradient: 'from-[#C86F58] to-[#B35943]', // Soft muted terracotta/rose
    bgColor: '#C86F58',
    bgColorEnd: '#B35943',
    subtextColor: 'text-rose-100',
    textColorHex: '#B35943',
    iconBgHex: 'rgba(179, 89, 67, 0.12)',
    decorativeIcon: heartOutline,
    tagline: 'RA 9994 & RA 10754 Compliant',
    features: ['20% Statutory Discount', 'Zero Markup Guarantee']
  },
  {
    id: 'new-pharmacy',
    badge: {
      icon: sparklesOutline,
      text: 'New Partner Pharmacies'
    },
    title: 'Expanded Local Network',
    subtitle: 'MetroCare, HealthFirst, and CityCare have expanded branches. Discover more community drugstores nearby.',
    ctaText: 'Explore Partner Branches',
    ctaType: 'scroll_pharmacies',
    bgGradient: 'from-[#24828E] to-[#176B76]', // Soft calm ocean teal
    bgColor: '#24828E',
    bgColorEnd: '#176B76',
    subtextColor: 'text-cyan-100',
    textColorHex: '#176B76',
    iconBgHex: 'rgba(23, 107, 118, 0.12)',
    decorativeIcon: storefrontOutline,
    tagline: 'Now in 15+ Locations',
    features: ['Live Inventory', 'Doorstep & Counter Pickup']
  },
  {
    id: 'about-carepoint',
    badge: {
      icon: shieldCheckmarkOutline,
      text: 'Safe Healthcare Guarantee'
    },
    title: 'The CarePoint Standard',
    subtitle: 'Strict OTC compliance protects you from counterfeit drugs and prescription hazards with full price transparency.',
    ctaText: 'Why Choose CarePoint',
    ctaType: 'open_about_modal',
    bgGradient: 'from-[#167D71] to-[#0E6359]', // Soft eucalyptus / jade
    bgColor: '#167D71',
    bgColorEnd: '#0E6359',
    subtextColor: 'text-emerald-100',
    textColorHex: '#0E6359',
    iconBgHex: 'rgba(14, 99, 89, 0.12)',
    decorativeIcon: shieldCheckmarkOutline,
    tagline: 'Pharmacist-Verified Catalog',
    features: ['Zero Prescription Hazard', '100% Genuine Medicine']
  }
];

import {
  fetchCustomerPlatformContent,
  subscribeToPlatformContent,
  DEFAULT_CUSTOMER_PLATFORM_CONTENT,
  type CustomerPlatformContent,
} from '../services/cmsService';

interface AdCarouselProps {
  onScrollToPharmacies?: () => void;
}

export const AdCarousel: React.FC<AdCarouselProps> = ({ onScrollToPharmacies }) => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [cms, setCms] = useState<CustomerPlatformContent>(DEFAULT_CUSTOMER_PLATFORM_CONTENT);

  const loadCms = useCallback(async () => {
    const live = await fetchCustomerPlatformContent();
    setCms(live);
  }, []);

  useEffect(() => {
    loadCms();
    const unsub = subscribeToPlatformContent(() => {
      loadCms();
    });
    return () => unsub();
  }, [loadCms]);

  const activePromotions = cms.promotions.filter((p) => p.active);

  const slides: AdSlide[] = React.useMemo(() => {
    const list: AdSlide[] = [];

    // 1. Live Admin Homepage Carousel Banners (all 4+ slides managed in Admin -> Content)
    const activeBanners = (cms.homepageBanners || []).filter((b) => b.active !== false);
    activeBanners.forEach((b, idx) => {
      const template = SLIDES.find((s) => s.id === b.id) || SLIDES[idx % SLIDES.length];
      const bgColor = b.bgColor || template.bgColor || '#0D9488';
      const bgColorEnd = b.bgColorEnd || template.bgColorEnd || '#0F766E';
      list.push({
        ...template,
        id: b.id || template.id,
        badge: {
          icon: template.badge.icon,
          text: b.badgeText || template.badge.text,
        },
        title: b.headline || template.title,
        subtitle: b.subtext || template.subtitle,
        ctaText: b.ctaLabel || template.ctaText,
        ctaType: b.ctaType || template.ctaType,
        bgGradient: b.bgGradient || template.bgGradient,
        bgColor,
        bgColorEnd,
        textColorHex: bgColorEnd,
      });
    });

    // 2. Live Admin Promotions (if any active)
    activePromotions.forEach((promo) => {
      list.push({
        id: `promo-${promo.id}`,
        badge: {
          icon: sparklesOutline,
          text: 'Limited Promotion',
        },
        title: promo.title,
        subtitle: promo.text,
        ctaText: 'Shop Eligible OTCs',
        ctaType: 'navigate_search',
        bgGradient: 'from-[#0F766E] to-[#115E59]',
        bgColor: '#0F766E',
        bgColorEnd: '#115E59',
        subtextColor: 'text-teal-100',
        textColorHex: '#0F766E',
        iconBgHex: 'rgba(15, 118, 110, 0.12)',
        decorativeIcon: sparklesOutline,
        tagline: `${cms.platformName} Promo`,
        features: ['Verified Partner Pharmacies', 'Instant Discount'],
      });
    });

    return list.length > 0 ? list : SLIDES;
  }, [cms, activePromotions]);

  // Keep currentIndex within bounds if slides change
  useEffect(() => {
    if (currentIndex >= slides.length) {
      setCurrentIndex(0);
    }
  }, [currentIndex, slides.length]);

  // Touch and mouse drag swipe handling
  const startXRef = useRef<number | null>(null);
  const isDraggingRef = useRef<boolean>(false);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  // Auto advance timer
  useEffect(() => {
    if (isPaused || slides.length <= 1) return;

    const timer = setInterval(() => {
      nextSlide();
    }, 5500);

    return () => clearInterval(timer);
  }, [isPaused, nextSlide, slides.length]);

  const handleDragStart = (clientX: number) => {
    setIsPaused(true);
    startXRef.current = clientX;
    isDraggingRef.current = true;
  };

  const handleDragEnd = (clientX: number) => {
    setIsPaused(false);
    if (!isDraggingRef.current || startXRef.current === null) return;
    const diff = startXRef.current - clientX;
    if (diff > 40) {
      nextSlide();
    } else if (diff < -40) {
      prevSlide();
    }
    startXRef.current = null;
    isDraggingRef.current = false;
  };

  const handleActionClick = (ctaType: AdSlide['ctaType']) => {
    switch (ctaType) {
      case 'navigate_search':
        navigate('/customer/search');
        break;
      case 'scroll_pharmacies':
        if (onScrollToPharmacies) {
          onScrollToPharmacies();
        } else {
          const el = document.getElementById('partner-pharmacies');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else {
            navigate('/customer/search');
          }
        }
        break;
      case 'open_discount_modal':
        setShowDiscountModal(true);
        break;
      case 'open_about_modal':
        setShowAboutModal(true);
        break;
    }
  };

  return (
    <>
      <div
        className="relative mb-5 rounded-3xl overflow-hidden shadow-md select-none group cursor-grab active:cursor-grabbing"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
        onTouchEnd={(e) => handleDragEnd(e.changedTouches[0].clientX)}
        onMouseDown={(e) => handleDragStart(e.clientX)}
        onMouseUp={(e) => handleDragEnd(e.clientX)}
      >
        {/* Slide Track */}
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {slides.map((slide) => (
            <div
              key={slide.id}
              className={`w-full shrink-0 bg-gradient-to-br ${slide.bgGradient} p-6 sm:p-7 text-white relative min-h-[210px] sm:min-h-[225px] flex flex-col justify-between overflow-hidden`}
              style={
                slide.bgColor
                  ? {
                      background: `linear-gradient(135deg, ${slide.bgColor} 0%, ${
                        slide.bgColorEnd || slide.bgColor
                      } 100%)`,
                    }
                  : undefined
              }
            >
              {/* Soft background glows and gentle lighting */}
              <div className="absolute -right-6 -bottom-6 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>

              {/* Watermark Icon */}
              <div className="absolute -right-4 -bottom-3 pointer-events-none select-none transition-transform duration-700 ease-out group-hover:scale-105">
                <IonIcon
                  icon={slide.decorativeIcon}
                  className="text-8xl sm:text-9xl text-white/10 rotate-12"
                />
              </div>

              {/* Content Header & Body */}
              <div className="relative z-10 max-w-[85%] sm:max-w-[78%]">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold backdrop-blur-sm bg-white/20 text-white border border-white/20">
                    <IonIcon icon={slide.badge.icon} className="text-xs" />
                    <span>{slide.badge.text}</span>
                  </div>
                  {slide.tagline && (
                    <span className="hidden sm:inline-block text-[11px] font-medium text-white/85 bg-white/10 px-2.5 py-0.5 rounded-full border border-white/15 backdrop-blur-sm">
                      {slide.tagline}
                    </span>
                  )}
                </div>

                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-1.5 leading-snug">
                  {slide.title}
                </h2>

                <p className={`${slide.subtextColor} text-xs sm:text-sm font-normal leading-relaxed mb-3 line-clamp-2 sm:line-clamp-none`}>
                  {slide.subtitle}
                </p>

                {/* Features Pills on larger screens */}
                {slide.features && (
                  <div className="hidden sm:flex items-center gap-2 mb-2">
                    {slide.features.map((feat, fIdx) => (
                      <span
                        key={fIdx}
                        className="inline-flex items-center gap-1 text-[11px] font-medium bg-white/15 backdrop-blur-sm text-white px-2 py-0.5 rounded-md border border-white/15"
                      >
                        <IonIcon icon={checkmarkCircleOutline} className="text-xs text-white/90" />
                        {feat}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Actions & Slide Controls */}
              <div className="relative z-10 flex items-center justify-between pt-2">
                {/* Fixed & Styled CTA Pill Button */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleActionClick(slide.ctaType);
                  }}
                  style={{
                    borderRadius: '9999px',
                    padding: '9px 18px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: '#ffffff',
                    boxShadow: '0 3px 12px rgba(0, 0, 0, 0.1)',
                    cursor: 'pointer',
                    userSelect: 'none',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                  className="active:scale-95 transition-transform duration-150 hover:bg-slate-50 shrink-0"
                >
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: slide.textColorHex,
                      letterSpacing: '-0.01em',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {slide.ctaText}
                  </span>
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '9999px',
                      backgroundColor: slide.iconBgHex,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <IonIcon icon={arrowForwardOutline} style={{ fontSize: '11px', color: slide.textColorHex }} />
                  </div>
                </div>

                {/* Slide Counter Pill */}
                <div
                  style={{
                    borderRadius: '9999px',
                    padding: '4px 12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#ffffff',
                  }}
                >
                  <span>0{currentIndex + 1}</span>
                  <span style={{ opacity: 0.6 }}>/</span>
                  <span style={{ opacity: 0.8 }}>0{slides.length}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Carousel Indicators / Mobile-Friendly Tappable Dots (No < > arrows) */}
        <div
          style={{
            position: 'absolute',
            bottom: '8px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            zIndex: 20,
          }}
        >
          {slides.map((_, idx) => (
            <div
              key={idx}
              role="button"
              tabIndex={0}
              aria-label={`Go to slide ${idx + 1}`}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(idx);
              }}
              style={{
                padding: '6px 4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  height: '5px',
                  width: currentIndex === idx ? '22px' : '6px',
                  borderRadius: '9999px',
                  backgroundColor: currentIndex === idx ? '#ffffff' : 'rgba(255, 255, 255, 0.45)',
                  boxShadow: currentIndex === idx ? '0 1px 4px rgba(0,0,0,0.2)' : 'none',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Live Active Promotions Notices (from Admin Publishing -> Content -> Promotions) */}
      {activePromotions.length > 0 && (
        <div className="mb-6 space-y-2.5">
          {activePromotions.map((promo) => (
            <div
              key={promo.id}
              onClick={() => navigate('/customer/search')}
              className="bg-teal-50 border border-teal-200/80 rounded-2xl px-4 py-3 flex items-center justify-between gap-3 cursor-pointer hover:border-teal-400 transition-all shadow-2xs"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0">
                  <IonIcon icon={sparklesOutline} className="text-lg" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-extrabold text-teal-900 truncate">{promo.title}</div>
                  <div className="text-xs text-teal-700 truncate">{promo.text}</div>
                </div>
              </div>
              <span className="text-[11px] font-bold text-teal-700 bg-white px-2.5 py-1 rounded-full border border-teal-200 shrink-0">
                Shop →
              </span>
            </div>
          ))}
        </div>
      )}

      {/* =========================================================
          MODAL 1: PWD & SENIOR CITIZEN DISCOUNT GUIDELINES
          ========================================================= */}
      <IonModal
        isOpen={showDiscountModal}
        onDidDismiss={() => setShowDiscountModal(false)}
        className="modal-bottom-sheet"
      >
        <div className="p-6 bg-white max-w-lg mx-auto w-full rounded-t-3xl sm:rounded-3xl max-h-[85vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                <IonIcon icon={ribbonOutline} className="text-2xl" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 leading-tight">
                  Discounts & Privileges
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Statutory 20% savings & community perks
                </p>
              </div>
            </div>
            <div
              role="button"
              tabIndex={0}
              onClick={() => setShowDiscountModal(false)}
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '9999px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f1f5f9',
                color: '#475569',
                cursor: 'pointer',
              }}
              className="hover:bg-slate-200 active:scale-95 transition-colors"
            >
              <IonIcon icon={closeOutline} style={{ fontSize: '20px' }} />
            </div>
          </div>

          {/* Cards & Guidelines */}
          <div className="py-4 space-y-4">
            {/* Senior Citizens Card */}
            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/70">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="bg-amber-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    RA 9994
                  </span>
                  <h4 className="text-sm font-bold text-amber-950">Senior Citizens (20% Off)</h4>
                </div>
                <span className="text-xs font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-lg">
                  20% OFF
                </span>
              </div>
              <p className="text-xs text-amber-900/80 leading-relaxed mb-2">
                Filipino citizens aged 60 years or older are entitled to a 20% discount and VAT exemption on qualified over-the-counter medicine essentials for personal use.
              </p>
              <div className="text-[11px] font-semibold text-amber-900 flex items-center gap-1.5">
                <IonIcon icon={documentTextOutline} className="text-amber-700" />
                Required: Valid OSCA ID / Senior Citizen Card & Purchase Booklet
              </div>
            </div>

            {/* PWD Card */}
            <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200/70">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    RA 10754
                  </span>
                  <h4 className="text-sm font-bold text-rose-950">Persons with Disabilities (20% Off)</h4>
                </div>
                <span className="text-xs font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded-lg">
                  20% OFF
                </span>
              </div>
              <p className="text-xs text-rose-900/80 leading-relaxed mb-2">
                Registered PWD cardholders enjoy a 20% discount and VAT exemption on doctor-prescribed and eligible OTC relief and maintenance necessities.
              </p>
              <div className="text-[11px] font-semibold text-rose-900 flex items-center gap-1.5">
                <IonIcon icon={documentTextOutline} className="text-rose-700" />
                Required: Valid LGU/NCDA-issued PWD ID Card & Purchase Booklet
              </div>
            </div>

            {/* How to Claim Steps */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                <IonIcon icon={informationCircleOutline} className="text-teal-600 text-sm" />
                How to claim your discount with CarePoint
              </h4>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-teal-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </div>
                  <p className="text-xs text-slate-700 leading-normal">
                    <strong className="text-slate-900">Add OTC Medicines to Cart:</strong> Compare prices and choose your preferred local pharmacy.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-teal-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </div>
                  <p className="text-xs text-slate-700 leading-normal">
                    <strong className="text-slate-900">Notify Pharmacy at Checkout:</strong> Add an order note or select in-store pickup to present your booklet.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-teal-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </div>
                  <p className="text-xs text-slate-700 leading-normal">
                    <strong className="text-slate-900">Counter Verification:</strong> The licensed pharmacist validates your ID & booklet and applies your 20% legal deduction.
                  </p>
                </div>
              </div>
            </div>

            {/* Partner Pharmacies Guarantee */}
            <div className="flex items-center gap-2 p-3 bg-teal-50/70 border border-teal-100 rounded-xl text-xs text-teal-800">
              <IonIcon icon={shieldCheckmarkOutline} className="text-teal-600 text-base shrink-0" />
              <span>All CarePoint partner pharmacies are legally compliant with Republic Acts 9994 and 10754.</span>
            </div>
          </div>

          {/* Action button */}
          <div className="pt-2">
            <div
              role="button"
              tabIndex={0}
              onClick={() => {
                setShowDiscountModal(false);
                navigate('/customer/search');
              }}
              style={{
                width: '100%',
                minHeight: '48px',
                padding: '12px 20px',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                backgroundColor: '#0d9488',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '14px',
                boxShadow: '0 4px 12px rgba(13, 148, 136, 0.25)',
                cursor: 'pointer',
              }}
              className="hover:bg-teal-700 active:scale-[0.98] transition-all"
            >
              <span>Browse Eligible OTC Medicines</span>
              <IonIcon icon={arrowForwardOutline} style={{ fontSize: '16px' }} />
            </div>
          </div>
        </div>
      </IonModal>

      {/* =========================================================
          MODAL 2: ABOUT CAREPOINT HEALTHCARE STANDARDS
          ========================================================= */}
      <IonModal
        isOpen={showAboutModal}
        onDidDismiss={() => setShowAboutModal(false)}
        className="modal-bottom-sheet"
      >
        <div className="p-6 bg-white max-w-lg mx-auto w-full rounded-t-3xl sm:rounded-3xl max-h-[85vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
                <IonIcon icon={shieldCheckmarkOutline} className="text-2xl" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 leading-tight">
                  About CarePoint
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Your trusted community pharmacy marketplace
                </p>
              </div>
            </div>
            <div
              role="button"
              tabIndex={0}
              onClick={() => setShowAboutModal(false)}
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '9999px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f1f5f9',
                color: '#475569',
                cursor: 'pointer',
              }}
              className="hover:bg-slate-200 active:scale-95 transition-colors"
            >
              <IonIcon icon={closeOutline} style={{ fontSize: '20px' }} />
            </div>
          </div>

          {/* Story & Core Pillars */}
          <div className="py-4 space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              CarePoint connects communities directly to verified neighborhood pharmacies. We make vital over-the-counter remedies accessible, affordable, and safe without counterfeit hazards.
            </p>

            {/* Pillar 1 */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 text-base">
                <IonIcon icon={shieldCheckmarkOutline} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 mb-0.5">Strict 100% Certified OTC</h4>
                <p className="text-[11px] text-slate-500 leading-normal">
                  To ensure patient safety, prescription-only medicines are strictly blocked from online checkout. We focus solely on approved, safe over-the-counter essentials.
                </p>
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 text-base">
                <IonIcon icon={storefrontOutline} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 mb-0.5">Transparent Price Comparison</h4>
                <p className="text-[11px] text-slate-500 leading-normal">
                  Compare rates between licensed drugstores in real time. Choose whether to pickup immediately at the counter or request local delivery.
                </p>
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 text-base">
                <IonIcon icon={checkmarkDoneOutline} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 mb-0.5">Licensed Dispensing Only</h4>
                <p className="text-[11px] text-slate-500 leading-normal">
                  All medicines are packaged, verified, and dispensed exclusively by DOH-licensed registered pharmacists from accredited physical pharmacies.
                </p>
              </div>
            </div>
          </div>

          {/* Action button */}
          <div className="pt-2">
            <div
              role="button"
              tabIndex={0}
              onClick={() => {
                setShowAboutModal(false);
                navigate('/customer/search');
              }}
              style={{
                width: '100%',
                minHeight: '48px',
                padding: '12px 20px',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                backgroundColor: '#0d9488',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '14px',
                boxShadow: '0 4px 12px rgba(13, 148, 136, 0.25)',
                cursor: 'pointer',
              }}
              className="hover:bg-teal-700 active:scale-[0.98] transition-all"
            >
              <span>Explore Over-the-Counter Catalog</span>
              <IonIcon icon={arrowForwardOutline} style={{ fontSize: '16px' }} />
            </div>
          </div>
        </div>
      </IonModal>
    </>
  );
};

export default AdCarousel;
