import React, { useState } from 'react';
import {
  IonMenu,
  IonHeader,
  IonToolbar,
  IonContent,
  IonList,
  IonItem,
  IonIcon,
  IonLabel,
  IonListHeader,
  IonMenuToggle,
  IonAlert,
  useIonRouter
} from '@ionic/react';
import { useLocation } from 'react-router-dom';
import {
  homeOutline,
  homeSharp,
  searchOutline,
  searchSharp,
  documentTextOutline,
  documentTextSharp,
  personOutline,
  personSharp,
  notificationsOutline,
  notificationsSharp,
  timeOutline,
  timeSharp,
  informationCircleOutline,
  informationCircleSharp,
  codeSlashOutline,
  codeSlashSharp,
  logOutOutline
} from 'ionicons/icons';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../../shared/context/AuthContext';
import { getUserInitials } from '../../shared/utils/userProfile';

interface AppPage {
  url: string;
  iosIcon: string;
  mdIcon: string;
  title: string;
}

const appPages: AppPage[] = [
  {
    title: 'Home',
    url: '/customer/home',
    iosIcon: homeOutline,
    mdIcon: homeSharp
  },
  {
    title: 'Discover',
    url: '/customer/search',
    iosIcon: searchOutline,
    mdIcon: searchSharp
  },
  {
    title: 'Orders',
    url: '/customer/orders',
    iosIcon: documentTextOutline,
    mdIcon: documentTextSharp
  },
  {
    title: 'Notifications',
    url: '/customer/notifications',
    iosIcon: notificationsOutline,
    mdIcon: notificationsSharp
  },
  {
    title: 'Profile',
    url: '/customer/profile',
    iosIcon: personOutline,
    mdIcon: personSharp
  }
];

const defaultSections: AppPage[] = [
  {
    title: 'Company History',
    url: '/customer/company-history',
    iosIcon: timeOutline,
    mdIcon: timeSharp
  },
  {
    title: 'About the App',
    url: '/customer/about',
    iosIcon: informationCircleOutline,
    mdIcon: informationCircleSharp
  },
  {
    title: 'Developers',
    url: '/customer/developers',
    iosIcon: codeSlashOutline,
    mdIcon: codeSlashSharp
  }
];

const SideMenu: React.FC = () => {
  const location = useLocation();
  const router = useIonRouter();
  const { unreadCount } = useNotifications();
  const { displayName, avatarUrl, logout, user } = useAuth();
  const [showLogoutAlert, setShowLogoutAlert] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push('/login', 'root', 'replace');
  };

  const initials = getUserInitials(displayName);

  return (
    <IonMenu 
      contentId="main-content" 
      type="overlay"
      style={{
        '--width': '240px',
        '--max-width': '240px',
        width: '240px'
      } as React.CSSProperties}
    >
      <IonHeader className="ion-no-border">
        <IonToolbar style={{ '--background': 'var(--bg-app)' } as React.CSSProperties}>
          <div className="flex items-center justify-center gap-2 py-4">
            <img src="/final-logo.png" alt="CarePoint Logo" className="h-9 w-auto object-contain" />
            <span className="text-xl font-bold text-teal-700 tracking-tight">CarePoint</span>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent style={{ '--background': 'var(--bg-app)' } as React.CSSProperties}>
        <div className="flex flex-col justify-between min-h-full py-2">
          <div>
            <IonListHeader className="mb-2 px-5">
              <IonLabel className="text-xs font-bold text-slate-400 uppercase tracking-wider">Main Modules</IonLabel>
            </IonListHeader>
            <IonList className="bg-transparent" lines="none">
              {appPages.map((appPage, index) => {
                const isActive = location.pathname.startsWith(appPage.url);
                const isNotif = appPage.url === '/customer/notifications';
                return (
                  <IonMenuToggle key={index} autoHide={false}>
                    <IonItem
                      className={`mx-3 mb-1.5 rounded-xl cursor-pointer transition-all duration-200 ${
                        isActive ? 'bg-teal-50 shadow-xs' : 'hover:bg-slate-100/80 active:bg-slate-100'
                      }`}
                      style={{ 
                        '--background': 'transparent', 
                        '--padding-start': '16px',
                        '--inner-padding-end': '16px',
                        '--min-height': '48px',
                        borderRadius: '12px'
                      }}
                      routerLink={appPage.url}
                      routerDirection="none"
                      detail={false}
                    >
                      <IonIcon
                        slot="start"
                        icon={isActive ? appPage.mdIcon : appPage.iosIcon}
                        className={`text-xl mr-3.5 transition-colors ${isActive ? 'text-teal-600' : 'text-slate-400'}`}
                      />
                      <IonLabel className={`font-semibold text-sm transition-colors ${isActive ? 'text-teal-900 font-bold' : 'text-slate-700'}`}>
                        {appPage.title}
                      </IonLabel>
                      {isNotif && unreadCount > 0 && (
                        <span slot="end" className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                      {isActive && !isNotif && (
                        <div slot="end" className="w-1.5 h-5 rounded-full bg-teal-600" />
                      )}
                    </IonItem>
                  </IonMenuToggle>
                );
              })}
            </IonList>

            <IonListHeader className="mt-5 mb-2 px-5">
              <IonLabel className="text-xs font-bold text-slate-400 uppercase tracking-wider">Default Sections</IonLabel>
            </IonListHeader>
            <IonList className="bg-transparent" lines="none">
              {defaultSections.map((page, index) => {
                const isActive = location.pathname.startsWith(page.url);
                return (
                  <IonMenuToggle key={index} autoHide={false}>
                    <IonItem
                      className={`mx-3 mb-1.5 rounded-xl cursor-pointer transition-all duration-200 ${
                        isActive ? 'bg-teal-50 shadow-xs' : 'hover:bg-slate-100/80 active:bg-slate-100'
                      }`}
                      style={{ 
                        '--background': 'transparent', 
                        '--padding-start': '16px',
                        '--inner-padding-end': '16px',
                        '--min-height': '48px',
                        borderRadius: '12px'
                      }}
                      routerLink={page.url}
                      routerDirection="none"
                      detail={false}
                    >
                      <IonIcon
                        slot="start"
                        icon={isActive ? page.mdIcon : page.iosIcon}
                        className={`text-xl mr-3.5 transition-colors ${isActive ? 'text-teal-600' : 'text-slate-400'}`}
                      />
                      <IonLabel className={`font-semibold text-sm transition-colors ${isActive ? 'text-teal-900 font-bold' : 'text-slate-700'}`}>
                        {page.title}
                      </IonLabel>
                      {isActive && (
                        <div slot="end" className="w-1.5 h-5 rounded-full bg-teal-600" />
                      )}
                    </IonItem>
                  </IonMenuToggle>
                );
              })}
            </IonList>
          </div>

          {/* Customer User Footer (Displays user name only - NO role label) */}
          <div className="px-3 pt-3 mt-4 border-t border-slate-200/80 space-y-1.5 pb-2">
            <IonMenuToggle autoHide={false}>
              <div 
                onClick={() => router.push('/customer/profile')}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-slate-100/80 cursor-pointer transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                  {avatarUrl && !imgError ? (
                    <img 
                      src={avatarUrl} 
                      alt={displayName} 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                      onError={() => setImgError(true)}
                    />
                  ) : (
                    <span>{initials}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-900 truncate">{displayName}</div>
                  {user?.email && (
                    <div className="text-[10px] text-slate-400 truncate">{user.email}</div>
                  )}
                </div>
              </div>
            </IonMenuToggle>

            <IonMenuToggle autoHide={false}>
              <IonItem
                button
                detail={false}
                lines="none"
                onClick={() => setShowLogoutAlert(true)}
                className="rounded-xl text-rose-600 font-semibold text-xs"
                style={{
                  '--background': 'transparent',
                  '--color': '#e11d48',
                  '--border-radius': '0.75rem',
                  '--min-height': '38px',
                  '--padding-start': '10px',
                } as React.CSSProperties}
              >
                <IonIcon icon={logOutOutline} slot="start" className="text-base mr-3 text-rose-500" />
                <IonLabel>Sign Out</IonLabel>
              </IonItem>
            </IonMenuToggle>
          </div>
        </div>

        {/* Sign Out Confirmation Alert */}
        <IonAlert
          isOpen={showLogoutAlert}
          onDidDismiss={() => setShowLogoutAlert(false)}
          header="Sign Out"
          subHeader="Confirm Sign Out"
          message="Are you sure you want to log out of your CarePoint account?"
          buttons={[
            {
              text: 'Cancel',
              role: 'cancel',
            },
            {
              text: 'Sign Out',
              role: 'destructive',
              handler: handleLogout,
            },
          ]}
        />
      </IonContent>
    </IonMenu>
  );
};

export default SideMenu;
