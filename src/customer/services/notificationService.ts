import { supabase } from '../../shared/lib/supabase';
import type { AppNotification, NotificationType } from '../../shared/types/database';
import { RealtimeChannel } from '@supabase/supabase-js';

const LOCAL_STORAGE_KEY_PREFIX = 'carepoint_notifications_';

function getLocalNotifications(userId: string): AppNotification[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${userId}`);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to parse local notifications:', e);
    return [];
  }
}

function saveLocalNotifications(userId: string, notifications: AppNotification[]) {
  try {
    localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(notifications));
  } catch (e) {
    console.warn('Failed to save notifications locally:', e);
  }
}

/**
 * Fetch all notifications for a user from Supabase backend.
 * Falls back to local storage cache if offline or table is pending migration.
 */
export async function getNotifications(userId: string): Promise<AppNotification[]> {
  if (!userId) return [];

  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      saveLocalNotifications(userId, data as AppNotification[]);
      return data as AppNotification[];
    }

    if (error) {
      console.warn('Supabase fetch notifications warning, using local cache:', error.message);
    }
  } catch (err) {
    console.warn('Supabase getNotifications error, using local cache:', err);
  }

  return getLocalNotifications(userId);
}

export interface CreateNotificationInput {
  title: string;
  message: string;
  type?: NotificationType;
  link_url?: string | null;
  metadata?: Record<string, any>;
}

/**
 * Create a new notification and persist it to Supabase backend.
 */
export async function createNotification(
  userId: string,
  input: CreateNotificationInput
): Promise<AppNotification> {
  if (!userId) {
    throw new Error('User ID is required to create a notification');
  }

  const newId = typeof crypto !== 'undefined' && crypto.randomUUID 
    ? crypto.randomUUID() 
    : `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const nowIso = new Date().toISOString();

  const record: AppNotification = {
    id: newId,
    user_id: userId,
    title: input.title,
    message: input.message,
    type: input.type || 'order',
    link_url: input.link_url ?? null,
    is_read: false,
    metadata: input.metadata ?? {},
    created_at: nowIso,
    updated_at: nowIso,
  };

  // Attempt to save to Supabase backend
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        id: record.id,
        user_id: userId,
        title: record.title,
        message: record.message,
        type: record.type,
        link_url: record.link_url,
        is_read: false,
        metadata: record.metadata,
        created_at: record.created_at,
        updated_at: record.updated_at,
      })
      .select()
      .single();

    if (!error && data) {
      // Sync local cache
      const local = getLocalNotifications(userId);
      saveLocalNotifications(userId, [data as AppNotification, ...local.filter(n => n.id !== data.id)]);
      return data as AppNotification;
    }

    if (error) {
      console.warn('Supabase insert notification warning (persisting locally):', error.message);
    }
  } catch (err) {
    console.warn('Supabase createNotification error (persisting locally):', err);
  }

  // Fallback to local storage
  const current = getLocalNotifications(userId);
  const updated = [record, ...current];
  saveLocalNotifications(userId, updated);
  return record;
}

/**
 * Mark a specific notification as read in Supabase backend.
 */
export async function markNotificationAsRead(userId: string, notificationId: string): Promise<boolean> {
  if (!userId || !notificationId) return false;

  // Update local storage
  const local = getLocalNotifications(userId);
  const updated = local.map(n => n.id === notificationId ? { ...n, is_read: true } : n);
  saveLocalNotifications(userId, updated);

  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, updated_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) {
      console.warn('Supabase markNotificationAsRead warning:', error.message);
    }
    return !error;
  } catch (err) {
    console.warn('Supabase markNotificationAsRead error:', err);
    return true; // Still marked locally
  }
}

/**
 * Mark all notifications as read for a user in Supabase backend.
 */
export async function markAllNotificationsAsRead(userId: string): Promise<boolean> {
  if (!userId) return false;

  // Update local storage
  const local = getLocalNotifications(userId);
  const updated = local.map(n => ({ ...n, is_read: true }));
  saveLocalNotifications(userId, updated);

  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.warn('Supabase markAllNotificationsAsRead warning:', error.message);
    }
    return !error;
  } catch (err) {
    console.warn('Supabase markAllNotificationsAsRead error:', err);
    return true;
  }
}

/**
 * Delete a specific notification from Supabase backend.
 */
export async function deleteNotification(userId: string, notificationId: string): Promise<boolean> {
  if (!userId || !notificationId) return false;

  // Update local storage
  const local = getLocalNotifications(userId);
  saveLocalNotifications(userId, local.filter(n => n.id !== notificationId));

  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) {
      console.warn('Supabase deleteNotification warning:', error.message);
    }
    return !error;
  } catch (err) {
    console.warn('Supabase deleteNotification error:', err);
    return true;
  }
}

/**
 * Clear all notifications for a user from Supabase backend.
 */
export async function clearAllNotifications(userId: string): Promise<boolean> {
  if (!userId) return false;

  saveLocalNotifications(userId, []);

  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.warn('Supabase clearAllNotifications warning:', error.message);
    }
    return !error;
  } catch (err) {
    console.warn('Supabase clearAllNotifications error:', err);
    return true;
  }
}

/**
 * Subscribe to realtime notifications for a user via Supabase Realtime channel.
 */
export function subscribeToUserNotifications(
  userId: string,
  onEvent: (payload: any) => void
): RealtimeChannel {
  return supabase
    .channel(`public:notifications:user_id=eq.${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        onEvent(payload);
      }
    )
    .subscribe();
}

/**
 * Generate starter sample notifications if user has zero notifications.
 */
export async function seedWelcomeNotificationsIfEmpty(userId: string): Promise<AppNotification[]> {
  const existing = await getNotifications(userId);
  if (existing.length > 0) return existing;

  const welcomeNotif = await createNotification(userId, {
    title: 'Welcome to CarePoint OTC! 💊',
    message: 'Browse OTC essentials, locate partner community pharmacies, and enjoy reliable doorstep delivery or instant pickup.',
    type: 'system',
    link_url: '/customer/search',
  });

  return [welcomeNotif];
}
