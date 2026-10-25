import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { AppNotification, NotificationType } from '../../shared/types/database';
import { useAuth } from '../../shared/context/AuthContext';
import {
  getNotifications,
  createNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification as removeNotification,
  clearAllNotifications,
  subscribeToUserNotifications,
  seedWelcomeNotificationsIfEmpty,
  type CreateNotificationInput,
} from '../services/notificationService';
import { IonToast } from '@ionic/react';
import { notificationsOutline } from 'ionicons/icons';

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  refreshNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  sendNotification: (input: CreateNotificationInput) => Promise<AppNotification | null>;
  sendTestNotification: (testType?: 'order' | 'order_status' | 'message' | 'promo') => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  loading: false,
  refreshNotifications: async () => {},
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  deleteNotification: async () => {},
  clearAll: async () => {},
  sendNotification: async () => null,
  sendTestNotification: async () => {},
});

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const notificationsEnabled = profile?.notifications_enabled ?? true;

  const fetchAndSet = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const data = await getNotifications(userId);
      if (data.length === 0) {
        const seeded = await seedWelcomeNotificationsIfEmpty(userId);
        setNotifications(seeded);
      } else {
        setNotifications(data);
      }
    } catch (e) {
      console.error('Error fetching notifications:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const userId = user?.id;

  const refreshNotifications = useCallback(async () => {
    if (userId) {
      await fetchAndSet(userId);
    }
  }, [userId, fetchAndSet]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    fetchAndSet(userId);

    // Subscribe to Realtime notifications from Supabase
    const channel = subscribeToUserNotifications(userId, (payload) => {
      console.log('Realtime notification event received:', payload);
      // Reload on any insert/update/delete
      fetchAndSet(userId);

      if (payload.eventType === 'INSERT' && payload.new) {
        const newNotif = payload.new as AppNotification;
        if (notificationsEnabled) {
          setToastMessage(`🔔 ${newNotif.title}: ${newNotif.message}`);
        }
      }
    });

    return () => {
      channel.unsubscribe();
    };
  }, [userId, notificationsEnabled, fetchAndSet]);


  const markAsRead = async (id: string) => {
    if (!user?.id) return;
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    await markNotificationAsRead(user.id, id);
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await markAllNotificationsAsRead(user.id);
  };

  const deleteNotification = async (id: string) => {
    if (!user?.id) return;
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await removeNotification(user.id, id);
  };

  const clearAll = async () => {
    if (!user?.id) return;
    setNotifications([]);
    await clearAllNotifications(user.id);
  };

  const sendNotification = async (input: CreateNotificationInput): Promise<AppNotification | null> => {
    if (!user?.id) return null;
    const created = await createNotification(user.id, input);
    setNotifications((prev) => [created, ...prev.filter((n) => n.id !== created.id)]);
    
    if (notificationsEnabled) {
      setToastMessage(`🔔 ${created.title}`);
    }
    return created;
  };

  const sendTestNotification = async (testType: 'order' | 'order_status' | 'message' | 'promo' = 'order') => {
    if (!user?.id) return;

    let title = 'Order Update';
    let message = 'Your pharmacy order has been verified and is being prepared!';
    let type: NotificationType = 'order';
    let linkUrl: string | undefined = '/customer/orders';

    if (testType === 'order') {
      const orderNum = Math.floor(1000 + Math.random() * 9000);
      title = `Order #${orderNum} Confirmed`;
      message = 'Mercury Drug confirmed your order. Rider dispatch in progress.';
      type = 'order';
      linkUrl = '/customer/orders';
    } else if (testType === 'order_status') {
      title = 'Order Out for Delivery 🛵';
      message = 'Your CarePoint rider is nearby and arriving in approximately 10 minutes.';
      type = 'order_status';
      linkUrl = '/customer/orders';
    } else if (testType === 'message') {
      title = 'Pharmacist Message 💬';
      message = 'Southstar Drug: "Hello! We have verified your stock inquiry."';
      type = 'message';
      linkUrl = '/customer/inquiries';
    } else if (testType === 'promo') {
      title = 'Special Wellness Promo 🏷️';
      message = 'Save 10% on essential vitamins and pain relief items this weekend!';
      type = 'promotion';
      linkUrl = '/customer/search';
    }

    await sendNotification({
      title,
      message,
      type,
      link_url: linkUrl,
      metadata: { is_test: true, timestamp: Date.now() },
    });
  };

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.is_read).length;
  }, [notifications]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        refreshNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAll,
        sendNotification,
        sendTestNotification,
      }}
    >
      {children}
      <IonToast
        isOpen={Boolean(toastMessage)}
        message={toastMessage || ''}
        duration={3500}
        onDidDismiss={() => setToastMessage(null)}
        icon={notificationsOutline}
        position="top"
        color="dark"
        buttons={[
          {
            text: 'Dismiss',
            role: 'cancel',
          },
        ]}
      />
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
