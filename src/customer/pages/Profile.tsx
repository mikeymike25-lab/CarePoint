import React, { useState, useEffect, useCallback } from 'react';
import { 
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, 
  IonList, IonItem, IonLabel, IonIcon, IonButton, IonAvatar, IonToggle, useIonRouter,
  IonButtons, IonMenuButton, IonModal, IonAlert
} from '@ionic/react';
import { 
  codeSlashOutline, logOutOutline, chevronForwardOutline, 
  personOutline, notificationsOutline, moonOutline,
  cardOutline, locationOutline, chatbubbleOutline,
  helpBuoyOutline, shieldCheckmarkOutline, lockClosedOutline,
  documentTextOutline, closeOutline, timeOutline
} from 'ionicons/icons';
import { useAuth } from '../../shared/context/AuthContext';
import { supabase } from '../../shared/lib/supabase';
import { getUserInitials } from '../../shared/utils/userProfile';
import {
  fetchCustomerPlatformContent,
  subscribeToPlatformContent,
  DEFAULT_CUSTOMER_PLATFORM_CONTENT,
  type CustomerPlatformContent,
} from '../services/cmsService';

const Profile: React.FC = () => {
  const { user, profile, displayName, avatarUrl, isGoogleAuth, logout, refreshProfile } = useAuth();
  const router = useIonRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Modals for Support section
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showLogoutAlert, setShowLogoutAlert] = useState(false);
  const [smsUpdates, setSmsUpdates] = useState(true);
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

  const handleLogout = async () => {
    await logout();
    router.push('/login', 'root', 'replace');
  };

  const toggleSetting = async (field: 'notifications_enabled' | 'dark_mode', currentValue: boolean) => {
    if (!user?.id || isUpdating) return;
    
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ [field]: !currentValue })
        .eq('id', user.id);
        
      if (error) throw error;
      await refreshProfile();
    } catch (err) {
      console.error('Failed to update setting:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const displayEmail = user?.email || '';
  const displayPhone = profile?.phone_number || 'Not provided';
  const notificationsEnabled = profile?.notifications_enabled ?? true;
  const darkModeEnabled = profile?.dark_mode ?? false;
  const initials = getUserInitials(displayName);

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="bg-slate-50 px-4 md:px-8">
          <IonButtons slot="start" className="md:hidden">
            <IonMenuButton className="text-slate-900" />
          </IonButtons>
          <IonTitle className="font-bold text-slate-800 pl-2 md:pl-0">My Profile</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="bg-slate-50">
        <div className="px-4 md:px-8 py-6 max-w-5xl mx-auto w-full flex flex-col">
          
          {/* User Card */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-100 flex items-center space-x-4 mb-5">
            <IonAvatar className="w-16 h-16 bg-teal-50 border-2 border-teal-100/80 flex items-center justify-center shrink-0 overflow-hidden relative shadow-xs">
              {avatarUrl && !imgError ? (
                <img 
                  src={avatarUrl} 
                  alt={displayName} 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                />
              ) : (
                <span className="text-xl font-black text-teal-700 tracking-tight">{initials}</span>
              )}
            </IonAvatar>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-slate-900 m-0 truncate">{displayName}</h2>
                {isGoogleAuth && (
                  <span 
                    className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200/60 shrink-0"
                    title="Account connected via Google"
                  >
                    <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.665-5.17 3.665-9.12z" />
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.26 21.36 7.33 24 12 24z" />
                      <path fill="#FBBC05" d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.13z" />
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.13c.95-2.83 3.6-4.96 6.72-4.96z" />
                    </svg>
                    <span>Google</span>
                  </span>
                )}
              </div>
              <p className="text-slate-500 m-0 text-xs mt-0.5 truncate">{displayEmail}</p>
              {displayPhone && (
                <p className="text-slate-500 m-0 text-xs mt-0.5 font-mono">{displayPhone}</p>
              )}
            </div>
          </div>

          {/* Account Settings */}
          <div className="mb-2 px-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Account</h3>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-5">
            <IonList lines="full" className="m-0 p-0">
              
              {/* 1. My Orders */}
              <IonItem button detail={false} routerLink="/customer/orders">
                <div slot="start" className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center mr-3">
                  <IonIcon icon={documentTextOutline} className="text-slate-600 text-sm" />
                </div>
                <IonLabel className="text-slate-800 font-semibold text-sm">My Orders</IonLabel>
                <IonIcon icon={chevronForwardOutline} slot="end" className="text-slate-400 text-xs" />
              </IonItem>

              {/* 2. My Inquiries */}
              <IonItem button detail={false} routerLink="/customer/inquiries">
                <div slot="start" className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center mr-3">
                  <IonIcon icon={chatbubbleOutline} className="text-slate-600 text-sm" />
                </div>
                <IonLabel className="text-slate-800 font-semibold text-sm">My Inquiries</IonLabel>
                <IonIcon icon={chevronForwardOutline} slot="end" className="text-slate-400 text-xs" />
              </IonItem>

              {/* 3. Edit Profile */}
              <IonItem button detail={false} routerLink="/customer/profile/edit">
                <div slot="start" className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center mr-3">
                  <IonIcon icon={personOutline} className="text-slate-600 text-sm" />
                </div>
                <IonLabel className="text-slate-800 font-semibold text-sm">Edit Profile</IonLabel>
                <IonIcon icon={chevronForwardOutline} slot="end" className="text-slate-400 text-xs" />
              </IonItem>

              {/* 4. Change Password */}
              <IonItem button detail={false} routerLink="/customer/change-password">
                <div slot="start" className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center mr-3">
                  <IonIcon icon={lockClosedOutline} className="text-slate-600 text-sm" />
                </div>
                <IonLabel className="text-slate-800 font-semibold text-sm">Change Password</IonLabel>
                <IonIcon icon={chevronForwardOutline} slot="end" className="text-slate-400 text-xs" />
              </IonItem>

              {/* 5. Saved Addresses */}
              <IonItem button detail={false} routerLink="/customer/addresses">
                <div slot="start" className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center mr-3">
                  <IonIcon icon={locationOutline} className="text-slate-600 text-sm" />
                </div>
                <IonLabel className="text-slate-800 font-semibold text-sm">Saved Addresses</IonLabel>
                <IonIcon icon={chevronForwardOutline} slot="end" className="text-slate-400 text-xs" />
              </IonItem>

              {/* 6. Payment Methods */}
              <IonItem button detail={false} routerLink="/customer/payment-methods">
                <div slot="start" className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center mr-3">
                  <IonIcon icon={cardOutline} className="text-slate-600 text-sm" />
                </div>
                <IonLabel className="text-slate-800 font-semibold text-sm">Payment Methods</IonLabel>
                <IonIcon icon={chevronForwardOutline} slot="end" className="text-slate-400 text-xs" />
              </IonItem>

            </IonList>
          </div>

          {/* Preferences */}
          <div className="mb-2 px-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Preferences</h3>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-5">
            <IonList lines="full" className="m-0 p-0">
              
              <IonItem>
                <div slot="start" className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center mr-3">
                  <IonIcon icon={notificationsOutline} className="text-slate-600 text-sm" />
                </div>
                <IonLabel className="text-slate-800 font-semibold text-sm">Push Notifications</IonLabel>
                <IonToggle 
                  slot="end" 
                  checked={notificationsEnabled} 
                  disabled={isUpdating}
                  onIonChange={() => toggleSetting('notifications_enabled', notificationsEnabled)}
                  style={{ '--background-checked': '#0D9488' } as React.CSSProperties}
                />
              </IonItem>

              <IonItem>
                <div slot="start" className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center mr-3">
                  <IonIcon icon={chatbubbleOutline} className="text-slate-600 text-sm" />
                </div>
                <IonLabel className="text-slate-800 font-semibold text-sm">SMS Order Updates</IonLabel>
                <IonToggle 
                  slot="end" 
                  checked={smsUpdates}
                  onIonChange={() => setSmsUpdates(!smsUpdates)}
                  style={{ '--background-checked': '#0D9488' } as React.CSSProperties}
                />
              </IonItem>

              <IonItem>
                <div slot="start" className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center mr-3">
                  <IonIcon icon={moonOutline} className="text-slate-600 text-sm" />
                </div>
                <IonLabel className="text-slate-800 font-semibold text-sm">Dark Mode</IonLabel>
                <IonToggle 
                  slot="end" 
                  checked={darkModeEnabled} 
                  disabled={isUpdating}
                  onIonChange={() => toggleSetting('dark_mode', darkModeEnabled)}
                  style={{ '--background-checked': '#0D9488' } as React.CSSProperties}
                />
              </IonItem>

            </IonList>
          </div>

          {/* Support */}
          <div className="mb-2 px-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Support</h3>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-6">
            <IonList lines="full" className="m-0 p-0">
              
              <IonItem button detail={false} onClick={() => setShowHelpModal(true)}>
                <div slot="start" className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center mr-3">
                  <IonIcon icon={helpBuoyOutline} className="text-slate-600 text-sm" />
                </div>
                <IonLabel className="text-slate-800 font-semibold text-sm">Help Center</IonLabel>
                <IonIcon icon={chevronForwardOutline} slot="end" className="text-slate-400 text-xs" />
              </IonItem>

              <IonItem button detail={false} onClick={() => setShowPrivacyModal(true)}>
                <div slot="start" className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center mr-3">
                  <IonIcon icon={shieldCheckmarkOutline} className="text-slate-600 text-sm" />
                </div>
                <IonLabel className="text-slate-800 font-semibold text-sm">Privacy Policy</IonLabel>
                <IonIcon icon={chevronForwardOutline} slot="end" className="text-slate-400 text-xs" />
              </IonItem>

              <IonItem button detail={false} routerLink="/customer/company-history">
                <div slot="start" className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center mr-3">
                  <IonIcon icon={timeOutline} className="text-teal-700 text-sm" />
                </div>
                <IonLabel className="text-slate-800 font-semibold text-sm">Company History</IonLabel>
                <IonIcon icon={chevronForwardOutline} slot="end" className="text-slate-400 text-xs" />
              </IonItem>

              <IonItem button detail={false} routerLink="/customer/developers">
                <div slot="start" className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center mr-3">
                  <IonIcon icon={codeSlashOutline} className="text-teal-700 text-sm" />
                </div>
                <IonLabel className="text-slate-800 font-semibold text-sm">About the Developers</IonLabel>
                <IonIcon icon={chevronForwardOutline} slot="end" className="text-slate-400 text-xs" />
              </IonItem>
            </IonList>
          </div>

          {/* Logout Button */}
          <IonButton 
            expand="block" 
            fill="clear" 
            color="danger" 
            className="font-semibold h-12 bg-red-50 rounded-xl m-0 text-sm active:scale-[0.98] transition-transform"
            onClick={() => setShowLogoutAlert(true)}
          >
            <IonIcon icon={logOutOutline} slot="start" />
            Log Out
          </IonButton>

          {/* Logout Confirmation Alert */}
          <IonAlert
            isOpen={showLogoutAlert}
            onDidDismiss={() => setShowLogoutAlert(false)}
            header="Log Out"
            subHeader="Confirm Logout"
            message="Are you sure you want to log out of your CarePoint account?"
            buttons={[
              {
                text: 'Cancel',
                role: 'cancel',
              },
              {
                text: 'Log Out',
                role: 'destructive',
                handler: handleLogout,
              },
            ]}
          />
        </div>

        {/* Help Center Modal (Synced with Admin Publishing -> Content -> FAQs & Contact) */}
        <IonModal isOpen={showHelpModal} onDidDismiss={() => setShowHelpModal(false)}>
          <IonHeader className="ion-no-border bg-white border-b border-slate-100">
            <IonToolbar className="px-3" style={{ '--background': '#ffffff' } as React.CSSProperties}>
              <IonTitle className="font-bold text-slate-800 text-base">
                {cms.platformName || 'CarePoint'} Help Center
              </IonTitle>
              <IonButtons slot="end">
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600"
                >
                  <IonIcon icon={closeOutline} />
                </button>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="bg-slate-50">
            <div className="p-5 max-w-xl mx-auto space-y-4 pb-12">
              {cms.faqs.map((faq) => (
                <div
                  key={faq.id}
                  className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-2"
                >
                  <h4 className="font-bold text-teal-800 text-sm">{faq.q}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                    {faq.a}
                  </p>
                </div>
              ))}

              {cms.pages?.contact && (
                <div className="bg-teal-50/70 rounded-2xl p-5 border border-teal-200/80 shadow-xs space-y-2">
                  <h4 className="font-bold text-teal-900 text-sm">
                    {cms.pages.contact.title || 'Contact Support'}
                  </h4>
                  <p className="text-xs text-teal-800 leading-relaxed whitespace-pre-line">
                    {cms.pages.contact.body}
                  </p>
                </div>
              )}
            </div>
          </IonContent>
        </IonModal>

        {/* Privacy Policy Modal (Synced with Admin Publishing -> Content -> Static Pages -> Privacy Policy) */}
        <IonModal isOpen={showPrivacyModal} onDidDismiss={() => setShowPrivacyModal(false)}>
          <IonHeader className="ion-no-border bg-white border-b border-slate-100">
            <IonToolbar className="px-3" style={{ '--background': '#ffffff' } as React.CSSProperties}>
              <IonTitle className="font-bold text-slate-800 text-base">
                {cms.pages?.privacy?.title || 'Privacy Policy'}
              </IonTitle>
              <IonButtons slot="end">
                <button
                  onClick={() => setShowPrivacyModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600"
                >
                  <IonIcon icon={closeOutline} />
                </button>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="bg-slate-50">
            <div className="p-5 max-w-xl mx-auto space-y-4 pb-12">
              {cms.pages?.privacy && (
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-2">
                  <h4 className="font-bold text-teal-800 text-sm">
                    {cms.pages.privacy.title || 'Privacy Policy'}
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                    {cms.pages.privacy.body}
                  </p>
                </div>
              )}

              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-2">
                <h4 className="font-bold text-teal-800 text-sm">Patient Data Protection</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  CarePoint is committed to protecting your personal and healthcare privacy in compliance with Republic Act No. 10173 (Data Privacy Act of 2012). Your health inquiries and medicine orders are encrypted and protected by enterprise security standards.
                </p>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-2">
                <h4 className="font-bold text-teal-800 text-sm">Financial Data Security</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  CarePoint does not store real credit card or bank details. All transactions simulate sandbox environments for demonstration and academic evaluation.
                </p>
              </div>
            </div>
          </IonContent>
        </IonModal>

      </IonContent>
    </IonPage>
  );
};

export default Profile;
