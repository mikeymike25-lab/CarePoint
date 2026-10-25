import { supabase } from '../../shared/lib/supabase';
import type { SavedAddress } from '../../shared/types/database';

const LOCAL_STORAGE_KEY_PREFIX = 'carepoint_addresses_';

function getLocalAddresses(userId: string): SavedAddress[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${userId}`);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to parse local addresses:', e);
    return [];
  }
}

function saveLocalAddresses(userId: string, addresses: SavedAddress[]) {
  try {
    localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(addresses));
  } catch (e) {
    console.warn('Failed to save addresses locally:', e);
  }
}

/**
 * Fetch all saved addresses for a given user.
 * Tries Supabase first; if table not ready or offline, seamlessly falls back to localStorage.
 */
export async function getSavedAddresses(userId: string): Promise<SavedAddress[]> {
  if (!userId) return [];

  try {
    const { data, error } = await supabase
      .from('saved_addresses')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (!error && data) {
      saveLocalAddresses(userId, data as SavedAddress[]);
      return data as SavedAddress[];
    }
  } catch (err) {
    console.warn('Supabase getSavedAddresses error, falling back to local storage:', err);
  }

  // Fallback to local storage
  return getLocalAddresses(userId);
}

/**
 * Add or update a saved address.
 */
export async function saveAddress(
  userId: string,
  addressInput: Omit<SavedAddress, 'id' | 'user_id' | 'created_at' | 'updated_at'>,
  addressId?: string
): Promise<{ success: boolean; data?: SavedAddress; error?: string }> {
  if (!userId) {
    return { success: false, error: 'User must be authenticated' };
  }

  const existingLocal = getLocalAddresses(userId);
  const isFirst = existingLocal.length === 0;
  const isDefault = isFirst || addressInput.is_default;

  // Prepare payload
  const payload = {
    ...addressInput,
    is_default: isDefault,
    user_id: userId,
    updated_at: new Date().toISOString(),
  };

  let savedRecord: SavedAddress | null = null;
  let supabaseFailed = false;

  try {
    // If setting as default, unset others first
    if (isDefault) {
      await supabase
        .from('saved_addresses')
        .update({ is_default: false })
        .eq('user_id', userId);
    }

    if (addressId) {
      const { data, error } = await supabase
        .from('saved_addresses')
        .update(payload)
        .eq('id', addressId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      savedRecord = data as SavedAddress;
    } else {
      const { data, error } = await supabase
        .from('saved_addresses')
        .insert({
          ...payload,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      savedRecord = data as SavedAddress;
    }
  } catch (err: any) {
    console.warn('Supabase saveAddress fallback to localStorage:', err?.message || err);
    supabaseFailed = true;
  }

  // Fallback / sync local storage
  if (supabaseFailed || !savedRecord) {
    let updatedList = [...existingLocal];

    if (isDefault) {
      updatedList = updatedList.map(a => ({ ...a, is_default: false }));
    }

    if (addressId) {
      updatedList = updatedList.map(item => {
        if (item.id === addressId) {
          const updated: SavedAddress = {
            ...item,
            ...payload,
            id: addressId,
            user_id: userId,
          };
          savedRecord = updated;
          return updated;
        }
        return item;
      });
    } else {
      const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `addr_${Date.now()}`;
      savedRecord = {
        ...payload,
        id: newId,
        user_id: userId,
        created_at: new Date().toISOString(),
      };
      updatedList.unshift(savedRecord);
    }

    saveLocalAddresses(userId, updatedList);
  } else {
    // Update local cache with latest data
    let local = existingLocal;
    if (isDefault) {
      local = local.map(a => ({ ...a, is_default: false }));
    }
    const idx = local.findIndex(a => a.id === savedRecord!.id);
    if (idx >= 0) {
      local[idx] = savedRecord;
    } else {
      local.unshift(savedRecord);
    }
    saveLocalAddresses(userId, local);
  }

  return { success: true, data: savedRecord || undefined };
}

/**
 * Delete a saved address.
 */
export async function deleteAddress(userId: string, addressId: string): Promise<{ success: boolean; error?: string }> {
  if (!userId || !addressId) {
    return { success: false, error: 'Missing parameters' };
  }

  try {
    await supabase
      .from('saved_addresses')
      .delete()
      .eq('id', addressId)
      .eq('user_id', userId);
  } catch (err) {
    console.warn('Supabase deleteAddress error, syncing local:', err);
  }

  // Always update local cache
  const local = getLocalAddresses(userId);
  const filtered = local.filter(a => a.id !== addressId);
  // If the deleted one was default and other addresses exist, make the first one default
  if (local.find(a => a.id === addressId)?.is_default && filtered.length > 0) {
    filtered[0].is_default = true;
    try {
      await supabase
        .from('saved_addresses')
        .update({ is_default: true })
        .eq('id', filtered[0].id);
    } catch (_) {}
  }
  saveLocalAddresses(userId, filtered);

  return { success: true };
}

/**
 * Set an address as default.
 */
export async function setDefaultAddress(userId: string, addressId: string): Promise<{ success: boolean; error?: string }> {
  if (!userId || !addressId) return { success: false, error: 'Missing parameters' };

  try {
    await supabase.from('saved_addresses').update({ is_default: false }).eq('user_id', userId);
    await supabase.from('saved_addresses').update({ is_default: true }).eq('id', addressId).eq('user_id', userId);
  } catch (err) {
    console.warn('Supabase setDefaultAddress error, updating local:', err);
  }

  const local = getLocalAddresses(userId);
  const updated = local.map(a => ({ ...a, is_default: a.id === addressId }));
  saveLocalAddresses(userId, updated);

  return { success: true };
}

/**
 * Get default or first address.
 */
export async function getDefaultAddress(userId: string): Promise<SavedAddress | null> {
  const addresses = await getSavedAddresses(userId);
  if (addresses.length === 0) return null;
  return addresses.find(a => a.is_default) || addresses[0];
}

/**
 * Reverse Geocode using OpenStreetMap Nominatim.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<{
  addressLine?: string;
  barangay?: string;
  city?: string;
  displayName?: string;
}> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept-Language': 'en-PH,en',
      }
    });
    clearTimeout(timeoutId);

    if (!res.ok) return {};
    const data = await res.json();
    const addr = data.address || {};

    const street = [addr.house_number, addr.road || addr.pedestrian || addr.street].filter(Boolean).join(' ');
    const barangay = addr.suburb || addr.neighbourhood || addr.quarter || addr.village || addr.district || '';
    const city = addr.city || addr.municipality || addr.town || addr.county || 'Metro Manila';

    return {
      addressLine: street || data.name || '',
      barangay,
      city,
      displayName: data.display_name || '',
    };
  } catch (err) {
    console.warn('Reverse geocode failed:', err);
    return {};
  }
}

/**
 * Search places in the Philippines using Nominatim.
 */
export async function searchPlaces(query: string): Promise<Array<{
  lat: number;
  lng: number;
  displayName: string;
}>> {
  if (!query.trim()) return [];

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=ph&limit=5`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept-Language': 'en-PH,en',
      }
    });
    clearTimeout(timeoutId);

    if (!res.ok) return [];
    const list = await res.json();
    return list.map((item: any) => ({
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      displayName: item.display_name,
    }));
  } catch (err) {
    console.warn('Search places failed:', err);
    return [];
  }
}
