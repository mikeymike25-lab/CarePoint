import React, { useState, useEffect, useCallback } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonMenuButton,
  IonIcon
} from '@ionic/react';
import { 
  searchOutline, 
  storefrontOutline, 
  timeOutline, 
  phonePortraitOutline, 
  heartOutline, 
  shieldCheckmarkOutline,
  helpCircleOutline,
  mailOutline,
  documentTextOutline
} from 'ionicons/icons';
import {
  fetchCustomerPlatformContent,
  subscribeToPlatformContent,
  DEFAULT_CUSTOMER_PLATFORM_CONTENT,
  type CustomerPlatformContent,
} from '../services/cmsService';

const AboutApp: React.FC = () => {
  const [cms, setCms] = useState<CustomerPlatformContent>(DEFAULT_CUSTOMER_PLATFORM_CONTENT);

  const loadContent = useCallback(async () => {
    const live = await fetchCustomerPlatformContent();
    setCms(live);
  }, []);

  useEffect(() => {
    loadContent();
    const unsub = subscribeToPlatformContent(() => {
      loadContent();
    });
    return () => unsub();
  }, [loadContent]);

  const aboutPage = cms.pages?.about || DEFAULT_CUSTOMER_PLATFORM_CONTENT.pages.about;
  const contactPage = cms.pages?.contact || DEFAULT_CUSTOMER_PLATFORM_CONTENT.pages.contact;
  const privacyPage = cms.pages?.privacy || DEFAULT_CUSTOMER_PLATFORM_CONTENT.pages.privacy;

  const features = [
    {
      icon: searchOutline,
      title: 'OTC Medicine Catalog',
      desc: 'Browse and search verified over-the-counter medicines quickly.',
      color: 'bg-teal-50 text-teal-600 border-teal-100'
    },
    {
      icon: storefrontOutline,
      title: 'Pharmacy Comparison',
      desc: 'Compare real-time prices across local partner pharmacies.',
      color: 'bg-sky-50 text-sky-600 border-sky-100'
    },
    {
      icon: timeOutline,
      title: 'Real-time Order Status',
      desc: 'Track order status seamlessly powered by Supabase Realtime.',
      color: 'bg-emerald-50 text-emerald-600 border-emerald-100'
    },
    {
      icon: phonePortraitOutline,
      title: 'Cross-Platform App',
      desc: 'Optimized hybrid performance on Web, iOS, and Android.',
      color: 'bg-indigo-50 text-indigo-600 border-indigo-100'
    }
  ];

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="px-4 md:px-8" style={{ '--background': 'var(--bg-app)' } as React.CSSProperties}>
          <IonButtons slot="start">
            <IonMenuButton className="text-slate-900" />
          </IonButtons>
          <IonTitle className="font-bold text-slate-900">{aboutPage.title || 'About the App'}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent style={{ '--background': 'var(--bg-app)' } as React.CSSProperties}>
        <div className="px-4 md:px-8 py-6 max-w-4xl mx-auto w-full flex flex-col gap-6">

          {/* Hero Branding Box (Synced with Admin Publishing -> Content -> Static Pages -> About Us) */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs flex flex-col items-center text-center relative overflow-hidden">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-100 p-2.5 flex items-center justify-center mb-4 shadow-xs">
              <img src="/final-logo.png" alt="CarePoint Logo" className="w-full h-full object-contain" />
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-2">
              {cms.platformName || 'CarePoint'}
            </h1>

            <div className="inline-flex items-center gap-1.5 bg-teal-50 border border-teal-200/60 text-teal-700 text-xs font-bold px-3 py-1 rounded-full mb-4">
              <IonIcon icon={shieldCheckmarkOutline} className="text-sm" /> Verified OTC Pharmacy Network
            </div>

            <p className="text-slate-600 text-sm leading-relaxed max-w-lg whitespace-pre-line">
              {aboutPage.body}
            </p>
          </div>

          {/* Key Features Section */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 px-1">
              Key Features
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {features.map((item, idx) => (
                <div 
                  key={idx}
                  className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center gap-4 hover:border-teal-500/30 transition-all"
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${item.color}`}>
                    <IonIcon icon={item.icon} className="text-xl" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-slate-900 mb-0.5 truncate">{item.title}</h3>
                    <p className="text-xs text-slate-500 leading-snug">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Frequently Asked Questions (Synced with Admin Publishing -> Content -> FAQs) */}
          {cms.faqs && cms.faqs.length > 0 && (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 px-1 flex items-center gap-1.5">
                <IonIcon icon={helpCircleOutline} className="text-sm text-teal-600" />
                Frequently Asked Questions
              </h2>
              <div className="space-y-3">
                {cms.faqs.map((faq) => (
                  <div
                    key={faq.id}
                    className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs"
                  >
                    <h3 className="text-sm font-bold text-slate-900 mb-1">{faq.q}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                      {faq.a}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contact & Privacy Policy Cards (Synced with Admin Static Pages) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                  <IonIcon icon={mailOutline} className="text-base" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">{contactPage.title || 'Contact'}</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                {contactPage.body}
              </p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                  <IonIcon icon={documentTextOutline} className="text-base" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  {privacyPage.title || 'Privacy Policy'}
                </h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                {privacyPage.body}
              </p>
            </div>
          </div>

          {/* Academic & Version Footer */}
          <div className="bg-white/60 backdrop-blur-xs rounded-2xl p-5 border border-slate-200/60 text-center flex flex-col items-center justify-center gap-1.5">
            <p className="text-xs font-semibold text-slate-600 flex items-center gap-1">
              Built with <IonIcon icon={heartOutline} className="text-rose-500 text-sm" /> for IT 005-IT31S4 - Integrative Programming and Technologies
            </p>
            <span className="text-[11px] font-mono text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">
              v1.0.0 • Academic Build
            </span>
          </div>

        </div>
      </IonContent>
    </IonPage>
  );
};

export default AboutApp;
