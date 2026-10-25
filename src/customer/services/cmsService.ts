import { supabase } from '../../shared/lib/supabase';

export interface CustomerBannerSlide {
  id: string;
  badgeText: string;
  headline: string;
  subtext: string;
  ctaLabel: string;
  ctaType: 'navigate_search' | 'scroll_pharmacies' | 'open_discount_modal' | 'open_about_modal';
  bgGradient: string;
  bgColor: string;
  bgColorEnd: string;
  active: boolean;
}

export interface CustomerPromotionContent {
  id: string;
  title: string;
  text: string;
  active: boolean;
}

export interface CustomerStaticPageContent {
  title: string;
  body: string;
}

export interface CustomerFaqContent {
  id: string;
  q: string;
  a: string;
}

export interface CustomerPlatformContent {
  platformName: string;
  supportEmail: string;
  currency: string;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  deliveryFee: number;
  freeDeliveryOver: number;
  payments: {
    card: boolean;
    gcash: boolean;
    paymaya: boolean;
    paypal: boolean;
    cod: boolean;
  };
  homepageBanners: CustomerBannerSlide[];
  promotions: CustomerPromotionContent[];
  pages: Record<string, CustomerStaticPageContent>;
  faqs: CustomerFaqContent[];
}

export const DEFAULT_CUSTOMER_BANNERS: CustomerBannerSlide[] = [
  {
    id: 'otc-fast',
    badgeText: '100% Certified OTC',
    headline: 'Need medicine fast?',
    subtext:
      'Compare real-time prices and order genuine OTC remedies from verified local pharmacies in your area.',
    ctaLabel: 'Find Medicine Fast',
    ctaType: 'navigate_search',
    bgGradient: 'from-[#0D9488] to-[#0F766E]',
    bgColor: '#0D9488',
    bgColorEnd: '#0F766E',
    active: true,
  },
  {
    id: 'discounts',
    badgeText: 'Special Privileges • 20% Off',
    headline: 'PWD & Senior Discounts',
    subtext:
      'Avail statutory 20% savings on eligible OTC health essentials. Fast verification with your government ID.',
    ctaLabel: 'Discount Guidelines',
    ctaType: 'open_discount_modal',
    bgGradient: 'from-[#C86F58] to-[#B35943]',
    bgColor: '#C86F58',
    bgColorEnd: '#B35943',
    active: true,
  },
  {
    id: 'new-pharmacy',
    badgeText: 'New Partner Pharmacies',
    headline: 'Expanded Local Network',
    subtext:
      'MetroCare, HealthFirst, and CityCare have expanded branches. Discover more community drugstores nearby.',
    ctaLabel: 'Explore Partner Branches',
    ctaType: 'scroll_pharmacies',
    bgGradient: 'from-[#24828E] to-[#176B76]',
    bgColor: '#24828E',
    bgColorEnd: '#176B76',
    active: true,
  },
  {
    id: 'about-carepoint',
    badgeText: 'Safe Healthcare Guarantee',
    headline: 'The CarePoint Standard',
    subtext:
      'Strict OTC compliance protects you from counterfeit drugs and prescription hazards with full price transparency.',
    ctaLabel: 'Why Choose CarePoint',
    ctaType: 'open_about_modal',
    bgGradient: 'from-[#167D71] to-[#0E6359]',
    bgColor: '#167D71',
    bgColorEnd: '#0E6359',
    active: true,
  },
];

export const DEFAULT_CUSTOMER_PLATFORM_CONTENT: CustomerPlatformContent = {
  platformName: 'CarePoint',
  supportEmail: 'support@carepoint.ph',
  currency: 'PHP',
  pickupEnabled: true,
  deliveryEnabled: true,
  deliveryFee: 50,
  freeDeliveryOver: 1500,
  payments: {
    card: true,
    gcash: true,
    paymaya: true,
    paypal: true,
    cod: true,
  },
  homepageBanners: DEFAULT_CUSTOMER_BANNERS,
  promotions: [],
  pages: {
    about: {
      title: 'About Us',
      body: 'CarePoint connects neighborhood pharmacies with the customers who rely on them — real pharmacists, real medicine, delivered with care.',
    },
    contact: {
      title: 'Contact',
      body: "Have a question? Reach the CarePoint team at support@carepoint.ph and we'll get back to you within one business day.",
    },
    privacy: {
      title: 'Privacy Policy',
      body: 'CarePoint collects only the information needed to fulfill your orders and never sells your data to third parties.',
    },
  },
  faqs: [
    {
      id: 'faq1',
      q: 'How do I know a pharmacy on CarePoint is legitimate?',
      a: 'Every pharmacy is reviewed and approved by our team before it can list products.',
    },
    {
      id: 'faq2',
      q: 'Can I order prescription medicine online?',
      a: 'No — CarePoint strictly blocks online checkout for prescription items by law. You can use our Inquiry chat to check in-store stock and purchase in person with a valid prescription.',
    },
  ],
};

function parseColorsFromGradient(grad: string | undefined, fallbackStart: string, fallbackEnd: string) {
  if (!grad) return { bgColor: fallbackStart, bgColorEnd: fallbackEnd };
  const hexes = grad.match(/#[0-9a-fA-F]{6}/g);
  if (hexes && hexes.length >= 2) {
    return { bgColor: hexes[0], bgColorEnd: hexes[hexes.length - 1] };
  }
  if (hexes && hexes.length === 1) {
    return { bgColor: hexes[0], bgColorEnd: hexes[0] };
  }
  return { bgColor: fallbackStart, bgColorEnd: fallbackEnd };
}

export function normalizeHomepageBanners(raw: any): CustomerBannerSlide[] {
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((item, idx) => {
      const def = DEFAULT_CUSTOMER_BANNERS[idx % DEFAULT_CUSTOMER_BANNERS.length];
      const parsed = parseColorsFromGradient(item.bgGradient, def.bgColor, def.bgColorEnd);
      const bgColor = item.bgColor || parsed.bgColor;
      const bgColorEnd = item.bgColorEnd || parsed.bgColorEnd;
      return {
        id: item.id || def.id || `banner_${idx + 1}`,
        badgeText: item.badgeText || def.badgeText || 'Featured Banner',
        headline: item.headline || def.headline || 'CarePoint',
        subtext: item.subtext || def.subtext || '',
        ctaLabel: item.ctaLabel || def.ctaLabel || 'Explore',
        ctaType: item.ctaType || def.ctaType || 'navigate_search',
        bgGradient: item.bgGradient || `from-[${bgColor}] to-[${bgColorEnd}]`,
        bgColor,
        bgColorEnd,
        active: item.active !== false,
      };
    });
  }

  if (raw && Array.isArray(raw.slides) && raw.slides.length > 0) {
    return normalizeHomepageBanners(raw.slides);
  }

  if (raw && typeof raw === 'object' && raw.headline) {
    const isOldDefault = raw.headline === 'Your neighborhood apothecary, online.';
    const def = DEFAULT_CUSTOMER_BANNERS[0];
    const parsed = parseColorsFromGradient(raw.bgGradient, def.bgColor, def.bgColorEnd);
    const firstSlide: CustomerBannerSlide = {
      ...def,
      headline: isOldDefault ? def.headline : raw.headline,
      subtext: isOldDefault || !raw.subtext ? def.subtext : raw.subtext,
      ctaLabel: isOldDefault || !raw.ctaLabel ? def.ctaLabel : raw.ctaLabel,
      bgColor: raw.bgColor || parsed.bgColor,
      bgColorEnd: raw.bgColorEnd || parsed.bgColorEnd,
      active: raw.active !== false,
    };
    return [firstSlide, ...DEFAULT_CUSTOMER_BANNERS.slice(1)];
  }

  return DEFAULT_CUSTOMER_BANNERS;
}

export async function fetchCustomerPlatformContent(): Promise<CustomerPlatformContent> {
  let result: CustomerPlatformContent = {
    ...DEFAULT_CUSTOMER_PLATFORM_CONTENT,
    homepageBanners: [...DEFAULT_CUSTOMER_BANNERS],
  };

  try {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('*')
      .eq('id', 'main')
      .maybeSingle();

    if (!error && data) {
      result = {
        platformName: data.platform_name || result.platformName,
        supportEmail: data.support_email || result.supportEmail,
        currency: data.currency || result.currency,
        pickupEnabled: data.pickup_enabled ?? result.pickupEnabled,
        deliveryEnabled: data.delivery_enabled ?? result.deliveryEnabled,
        deliveryFee: Number(data.delivery_fee ?? result.deliveryFee),
        freeDeliveryOver: Number(data.free_delivery_over ?? result.freeDeliveryOver),
        payments: data.payments || result.payments,
        homepageBanners: normalizeHomepageBanners(data.homepage_banner),
        promotions: Array.isArray(data.promotions) ? data.promotions : result.promotions,
        pages: data.pages || result.pages,
        faqs: Array.isArray(data.faqs) ? data.faqs : result.faqs,
      };
      return result;
    }
  } catch (e) {
    console.warn('Failed to fetch platform_settings from Supabase:', e);
  }

  return result;
}

export function subscribeToPlatformContent(onChange: () => void): () => void {
  const channel = supabase
    .channel('customer-platform-content-sync-' + Math.random().toString(36).slice(2, 7))
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'platform_settings' },
      () => onChange()
    )
    .subscribe();

  let bc: BroadcastChannel | null = null;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      bc = new BroadcastChannel('carepoint_cms_sync');
      bc.onmessage = () => onChange();
    }
  } catch {
    // Ignore if BroadcastChannel unsupported
  }

  const handleStorage = (e: StorageEvent) => {
    if (!e.key || e.key.startsWith('cp_')) {
      onChange();
    }
  };

  const handleFocus = () => {
    onChange();
  };

  const handleVisibility = () => {
    if (document.visibilityState === 'visible') {
      onChange();
    }
  };

  window.addEventListener('storage', handleStorage);
  window.addEventListener('focus', handleFocus);
  document.addEventListener('visibilitychange', handleVisibility);

  return () => {
    supabase.removeChannel(channel);
    if (bc) bc.close();
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener('focus', handleFocus);
    document.removeEventListener('visibilitychange', handleVisibility);
  };
}
