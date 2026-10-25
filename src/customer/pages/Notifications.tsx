import React, { useState, useMemo } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonButton,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
  useIonRouter,
  IonSpinner,
} from '@ionic/react';
import {
  notificationsOutline,
  checkmarkDoneOutline,
  trashOutline,
  bagHandleOutline,
  chatbubbleEllipsesOutline,
  pricetagOutline,
  shieldCheckmarkOutline,
  arrowForwardOutline,
  bicycleOutline,
  sparklesOutline,
  timeOutline,
} from 'ionicons/icons';

import { useNotifications } from '../context/NotificationContext';
import type { AppNotification, NotificationType } from '../../shared/types/database';

function formatRelativeTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}

const getNotificationStyle = (type: NotificationType) => {
  switch (type) {
    case 'order':
      return {
        icon: bagHandleOutline,
        bg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        badge: 'Order',
        badgeColor: 'bg-emerald-100 text-emerald-800',
      };
    case 'order_status':
      return {
        icon: bicycleOutline,
        bg: 'bg-teal-50 text-teal-600 border-teal-100',
        badge: 'Status',
        badgeColor: 'bg-teal-100 text-teal-800',
      };
    case 'message':
    case 'inquiry':
      return {
        icon: chatbubbleEllipsesOutline,
        bg: 'bg-sky-50 text-sky-600 border-sky-100',
        badge: 'Message',
        badgeColor: 'bg-sky-100 text-sky-800',
      };
    case 'promotion':
      return {
        icon: pricetagOutline,
        bg: 'bg-amber-50 text-amber-600 border-amber-100',
        badge: 'Promo',
        badgeColor: 'bg-amber-100 text-amber-800',
      };
    case 'system':
    default:
      return {
        icon: shieldCheckmarkOutline,
        bg: 'bg-indigo-50 text-indigo-600 border-indigo-100',
        badge: 'System',
        badgeColor: 'bg-indigo-100 text-indigo-800',
      };
  }
};

const Notifications: React.FC = () => {
  const router = useIonRouter();
  const {
    notifications,
    unreadCount,
    loading,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    sendTestNotification,
  } = useNotifications();

  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'order' | 'message'>('all');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notif) => {
      if (activeFilter === 'unread') return !notif.is_read;
      if (activeFilter === 'order') return notif.type === 'order' || notif.type === 'order_status';
      if (activeFilter === 'message') return notif.type === 'message' || notif.type === 'inquiry';
      return true;
    });
  }, [notifications, activeFilter]);

  const handleRefresh = async (e: CustomEvent) => {
    await refreshNotifications();
    e.detail.complete();
  };

  const handleNotificationClick = async (notif: AppNotification) => {
    if (!notif.is_read) {
      await markAsRead(notif.id);
    }
    if (notif.link_url) {
      router.push(notif.link_url);
    }
  };

  const handleSimulate = async (type: 'order' | 'order_status' | 'message' | 'promo') => {
    setIsSimulating(true);
    try {
      await sendTestNotification(type);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border bg-white shadow-xs border-b border-slate-100">
        <IonToolbar className="px-2 py-1" style={{ '--background': '#ffffff' } as React.CSSProperties}>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/customer/home" text="" />
          </IonButtons>
          <IonTitle className="font-bold text-slate-900 flex items-center gap-2">
            Notifications
            {unreadCount > 0 && (
              <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-teal-600 text-white font-semibold">
                {unreadCount} new
              </span>
            )}
          </IonTitle>
          <IonButtons slot="end">
            {unreadCount > 0 && (
              <IonButton
                onClick={() => markAllAsRead()}
                className="text-teal-700 font-semibold text-xs normal-case"
                title="Mark all as read"
              >
                <IonIcon icon={checkmarkDoneOutline} slot="start" className="text-base" />
                <span className="hidden sm:inline">Mark All Read</span>
              </IonButton>
            )}
            {notifications.length > 0 && (
              <IonButton
                onClick={() => {
                  if (window.confirm('Clear all notifications?')) {
                    clearAll();
                  }
                }}
                className="text-slate-400 hover:text-rose-600 text-xs normal-case"
                title="Clear all"
              >
                <IonIcon icon={trashOutline} className="text-lg" />
              </IonButton>
            )}
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="bg-slate-50">
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="px-4 md:px-8 py-5 max-w-3xl mx-auto w-full space-y-4">
          
          {/* Quick Simulation Toolbar (for testing & verifying live Supabase storage) */}
          <div className="bg-gradient-to-r from-teal-50/80 via-emerald-50/60 to-white rounded-2xl border border-teal-100/80 p-3.5 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-teal-800 flex items-center gap-1.5">
                <IonIcon icon={sparklesOutline} className="text-teal-600 text-sm" />
                Live Notification Simulator (Saves to Supabase)
              </span>
              {isSimulating && <IonSpinner name="dots" className="w-5 h-5 text-teal-600" />}
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <button
                disabled={isSimulating}
                onClick={() => handleSimulate('order')}
                className="px-2.5 py-1.5 rounded-xl bg-white border border-teal-200 text-teal-800 font-semibold hover:bg-teal-50 active:scale-95 transition-all shadow-xs flex items-center gap-1"
              >
                <IonIcon icon={bagHandleOutline} className="text-teal-600" />
                + Order Confirmed
              </button>
              <button
                disabled={isSimulating}
                onClick={() => handleSimulate('order_status')}
                className="px-2.5 py-1.5 rounded-xl bg-white border border-teal-200 text-teal-800 font-semibold hover:bg-teal-50 active:scale-95 transition-all shadow-xs flex items-center gap-1"
              >
                <IonIcon icon={bicycleOutline} className="text-teal-600" />
                + Rider Dispatch
              </button>
              <button
                disabled={isSimulating}
                onClick={() => handleSimulate('message')}
                className="px-2.5 py-1.5 rounded-xl bg-white border border-teal-200 text-teal-800 font-semibold hover:bg-teal-50 active:scale-95 transition-all shadow-xs flex items-center gap-1"
              >
                <IonIcon icon={chatbubbleEllipsesOutline} className="text-teal-600" />
                + Pharmacy Reply
              </button>
              <button
                disabled={isSimulating}
                onClick={() => handleSimulate('promo')}
                className="px-2.5 py-1.5 rounded-xl bg-white border border-teal-200 text-teal-800 font-semibold hover:bg-teal-50 active:scale-95 transition-all shadow-xs flex items-center gap-1"
              >
                <IonIcon icon={pricetagOutline} className="text-teal-600" />
                + Promo Offer
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeFilter === 'all'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setActiveFilter('unread')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeFilter === 'unread'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => setActiveFilter('order')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeFilter === 'order'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Orders
            </button>
            <button
              onClick={() => setActiveFilter('message')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeFilter === 'message'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Messages
            </button>
          </div>

          {/* Notifications List */}
          {loading && notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-400">
              <IonSpinner name="crescent" className="mb-3 text-teal-600" />
              <p className="text-sm font-medium">Loading notifications from Supabase...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/70 p-10 text-center shadow-xs">
              <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
                <IonIcon icon={notificationsOutline} className="text-3xl" />
              </div>
              <h3 className="font-bold text-slate-800 text-base mb-1">
                {activeFilter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4 leading-relaxed">
                {activeFilter === 'unread'
                  ? "You've read all your notifications! New order updates and messages will show up here."
                  : 'Notifications regarding your OTC orders, pharmacy responses, and promos will appear here.'}
              </p>
              {activeFilter !== 'all' && (
                <button
                  onClick={() => setActiveFilter('all')}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                >
                  View All Notifications
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredNotifications.map((notif) => {
                const style = getNotificationStyle(notif.type);
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`group relative bg-white rounded-2xl border p-4 transition-all cursor-pointer shadow-xs hover:shadow-md active:scale-[0.99] flex items-start gap-3.5 ${
                      notif.is_read
                        ? 'border-slate-200/70 hover:border-slate-300'
                        : 'border-teal-200 bg-teal-50/20 hover:border-teal-400'
                    }`}
                  >
                    {/* Left Icon */}
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${style.bg}`}
                    >
                      <IonIcon icon={style.icon} className="text-xl" />
                    </div>

                    {/* Notification Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${style.badgeColor}`}
                          >
                            {style.badge}
                          </span>
                          <h4
                            className={`text-sm font-bold truncate ${
                              notif.is_read ? 'text-slate-800' : 'text-slate-900 font-extrabold'
                            }`}
                          >
                            {notif.title}
                          </h4>
                        </div>
                        
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[11px] font-medium text-slate-400 flex items-center gap-0.5">
                            <IonIcon icon={timeOutline} className="text-xs" />
                            {formatRelativeTime(notif.created_at)}
                          </span>
                          {!notif.is_read && (
                            <span
                              className="w-2.5 h-2.5 rounded-full bg-teal-500 ring-4 ring-teal-100 shrink-0"
                              title="Unread"
                            />
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed mb-2 line-clamp-2">
                        {notif.message}
                      </p>

                      {/* Bottom action row */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100/70 text-xs">
                        {notif.link_url ? (
                          <span className="text-teal-700 font-bold flex items-center gap-1 text-[11px] group-hover:underline">
                            View details
                            <IonIcon icon={arrowForwardOutline} className="text-xs" />
                          </span>
                        ) : (
                          <span />
                        )}

                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          {!notif.is_read && (
                            <button
                              onClick={() => markAsRead(notif.id)}
                              className="text-slate-400 hover:text-teal-600 text-[11px] font-semibold flex items-center gap-1 p-1"
                              title="Mark as read"
                            >
                              <IonIcon icon={checkmarkDoneOutline} className="text-sm" />
                              <span className="hidden sm:inline">Mark read</span>
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotification(notif.id)}
                            className="text-slate-400 hover:text-rose-600 text-[11px] font-semibold flex items-center gap-1 p-1"
                            title="Delete"
                          >
                            <IonIcon icon={trashOutline} className="text-sm" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </IonContent>
    </IonPage>
  );
};

export default Notifications;
