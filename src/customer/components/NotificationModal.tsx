import React from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonIcon,
  IonSpinner,
} from '@ionic/react';
import {
  closeOutline,
  checkmarkDoneOutline,
  notificationsOutline,
  bagHandleOutline,
  chatbubbleEllipsesOutline,
  pricetagOutline,
  shieldCheckmarkOutline,
  bicycleOutline,
  openOutline,
  trashOutline,
} from 'ionicons/icons';
import { useNotifications } from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';
import type { AppNotification, NotificationType } from '../../shared/types/database';

interface NotificationModalProps {
  isOpen: boolean;
  onDismiss: () => void;
}

function formatRelativeTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}

const getNotificationStyle = (type: NotificationType) => {
  switch (type) {
    case 'order':
      return { icon: bagHandleOutline, bg: 'bg-emerald-50 text-emerald-600 border-emerald-100' };
    case 'order_status':
      return { icon: bicycleOutline, bg: 'bg-teal-50 text-teal-600 border-teal-100' };
    case 'message':
    case 'inquiry':
      return { icon: chatbubbleEllipsesOutline, bg: 'bg-sky-50 text-sky-600 border-sky-100' };
    case 'promotion':
      return { icon: pricetagOutline, bg: 'bg-amber-50 text-amber-600 border-amber-100' };
    case 'system':
    default:
      return { icon: shieldCheckmarkOutline, bg: 'bg-indigo-50 text-indigo-600 border-indigo-100' };
  }
};

export const NotificationModal: React.FC<NotificationModalProps> = ({ isOpen, onDismiss }) => {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    sendTestNotification,
  } = useNotifications();

  const handleNotificationClick = async (notif: AppNotification) => {
    if (!notif.is_read) {
      await markAsRead(notif.id);
    }
    onDismiss();
    if (notif.link_url) {
      navigate(notif.link_url);
    }
  };

  const handleViewAllPage = () => {
    onDismiss();
    navigate('/customer/notifications');
  };

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={onDismiss}
      initialBreakpoint={0.75}
      breakpoints={[0, 0.5, 0.75, 1]}
      className="carepoint-bottom-sheet"
    >
      <IonHeader className="ion-no-border border-b border-slate-100">
        <IonToolbar className="px-3" style={{ '--background': '#ffffff' } as React.CSSProperties}>
          <div className="flex items-center justify-between w-full py-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center">
                <IonIcon icon={notificationsOutline} className="text-lg" />
              </div>
              <IonTitle className="font-bold text-slate-900 text-base p-0">
                Notifications
                {unreadCount > 0 && (
                  <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-teal-600 text-white font-semibold">
                    {unreadCount} new
                  </span>
                )}
              </IonTitle>
            </div>
            <IonButtons slot="end">
              {unreadCount > 0 && (
                <IonButton
                  onClick={() => markAllAsRead()}
                  className="text-teal-700 font-semibold text-xs normal-case"
                >
                  <IonIcon icon={checkmarkDoneOutline} slot="start" />
                  Read all
                </IonButton>
              )}
              <IonButton onClick={onDismiss} className="text-slate-400">
                <IonIcon icon={closeOutline} className="text-2xl" />
              </IonButton>
            </IonButtons>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent className="bg-slate-50">
        <div className="p-4 space-y-3">
          
          {/* Fast actions bar */}
          <div className="flex items-center justify-between text-xs bg-white rounded-xl p-2.5 border border-slate-100 shadow-xs">
            <button
              onClick={() => sendTestNotification('order')}
              className="text-teal-700 font-semibold hover:underline"
            >
              + Test Order Notif
            </button>
            <button
              onClick={handleViewAllPage}
              className="text-slate-500 font-semibold flex items-center gap-1 hover:text-slate-800"
            >
              Full Page View
              <IonIcon icon={openOutline} className="text-xs" />
            </button>
          </div>

          {/* Notifications List */}
          {loading && notifications.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <IonSpinner name="crescent" className="text-teal-600 mb-2" />
              <p className="text-xs">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <IonIcon icon={notificationsOutline} className="text-3xl text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-700">No notifications yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Your order alerts and messages will show up here.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.slice(0, 10).map((notif) => {
                const style = getNotificationStyle(notif.type);
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                      notif.is_read
                        ? 'bg-white border-slate-100'
                        : 'bg-teal-50/30 border-teal-200'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${style.bg}`}
                    >
                      <IonIcon icon={style.icon} className="text-lg" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <h4
                          className={`text-xs truncate ${
                            notif.is_read ? 'font-semibold text-slate-800' : 'font-extrabold text-slate-900'
                          }`}
                        >
                          {notif.title}
                        </h4>
                        <span className="text-[10px] text-slate-400 shrink-0 ml-1">
                          {formatRelativeTime(notif.created_at)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                        {notif.message}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notif.id);
                      }}
                      className="text-slate-300 hover:text-rose-500 p-1"
                      title="Delete"
                    >
                      <IonIcon icon={trashOutline} className="text-sm" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {notifications.length > 10 && (
            <button
              onClick={handleViewAllPage}
              className="w-full py-2.5 text-center text-xs font-bold text-teal-700 bg-teal-50 rounded-xl hover:bg-teal-100 transition-colors"
            >
              View all {notifications.length} notifications →
            </button>
          )}

        </div>
      </IonContent>
    </IonModal>
  );
};

export default NotificationModal;
