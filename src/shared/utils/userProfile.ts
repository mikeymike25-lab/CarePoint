import type { Profile } from '../types/database';

/**
 * Intelligent helper to format email prefixes into human-readable names.
 * e.g., 'mikesalamat72@gmail.com' -> 'Mike Salamat'
 * e.g., 'juan.delacruz@example.com' -> 'Juan Delacruz'
 */
export function cleanEmailToName(raw?: string | null): string {
  if (!raw) return 'Customer';
  let prefix = raw.split('@')[0];
  prefix = prefix.replace(/\d+$/, ''); // Strip trailing numbers like 72
  if (!prefix) return 'Customer';

  // Separator patterns like dot, dash, underscore
  const separators = prefix.split(/[._-]/).filter(Boolean);
  if (separators.length > 1) {
    return separators
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }

  // CamelCase pattern like 'mikeSalamat'
  const camel = prefix.replace(/([a-z])([A-Z])/g, '$1 $2');
  if (camel.includes(' ')) {
    return camel
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }

  // Common first names split
  const commonFirstNames = [
    'mike', 'juan', 'maria', 'john', 'mark', 'jose', 'alex', 'chris', 
    'paul', 'dave', 'dan', 'eric', 'anna', 'mary', 'jane', 'angelo'
  ];
  const lower = prefix.toLowerCase();
  for (const fn of commonFirstNames) {
    if (lower.startsWith(fn) && lower.length > fn.length + 2) {
      const first = fn.charAt(0).toUpperCase() + fn.slice(1);
      const rest = lower.slice(fn.length);
      const second = rest.charAt(0).toUpperCase() + rest.slice(1);
      return `${first} ${second}`;
    }
  }

  return prefix.charAt(0).toUpperCase() + prefix.slice(1);
}

/**
 * Resolves the primary human name for a user.
 * Prioritizes actual names over email addresses.
 */
export function getUserDisplayName(profile?: Partial<Profile> | null, user?: any | null): string {
  // 1. If profile has a full_name that is not an email
  if (profile?.full_name && !profile.full_name.includes('@')) {
    return profile.full_name.trim();
  }

  // 2. Google OAuth metadata (full_name or name)
  const metaFullName = user?.user_metadata?.full_name;
  if (metaFullName && typeof metaFullName === 'string' && !metaFullName.includes('@')) {
    return metaFullName.trim();
  }

  const metaName = user?.user_metadata?.name;
  if (metaName && typeof metaName === 'string' && !metaName.includes('@')) {
    return metaName.trim();
  }

  // 3. Google OAuth identity data
  if (Array.isArray(user?.identities)) {
    const googleId = user.identities.find((i: any) => i.provider === 'google');
    const idName = googleId?.identity_data?.full_name || googleId?.identity_data?.name;
    if (idName && typeof idName === 'string' && !idName.includes('@')) {
      return idName.trim();
    }
  }

  // 4. Derive from profile.full_name if it was an email, or user.email
  const fallbackRaw = (profile?.full_name && profile.full_name.includes('@') ? profile.full_name : user?.email) || '';
  if (fallbackRaw) {
    return cleanEmailToName(fallbackRaw);
  }

  return 'Customer';
}

/**
 * Resolves the user avatar image URL (especially from Google account).
 */
export function getUserAvatarUrl(profile?: Partial<Profile> | null, user?: any | null): string | null {
  // 1. Google OAuth avatar in user_metadata
  if (user?.user_metadata?.avatar_url && typeof user.user_metadata.avatar_url === 'string') {
    return user.user_metadata.avatar_url;
  }
  if (user?.user_metadata?.picture && typeof user.user_metadata.picture === 'string') {
    return user.user_metadata.picture;
  }

  // 2. Google OAuth identity data
  if (Array.isArray(user?.identities)) {
    const googleId = user.identities.find((i: any) => i.provider === 'google');
    const idAvatar = googleId?.identity_data?.avatar_url || googleId?.identity_data?.picture;
    if (idAvatar && typeof idAvatar === 'string') {
      return idAvatar;
    }
  }

  // 3. Profile avatar_url from database
  if (profile?.avatar_url && typeof profile.avatar_url === 'string') {
    return profile.avatar_url;
  }

  return null;
}

/**
 * Checks if the user is authenticated via Google.
 */
export function isGoogleUser(user?: any | null): boolean {
  if (!user) return false;
  if (user.app_metadata?.provider === 'google') return true;
  if (Array.isArray(user.app_metadata?.providers) && user.app_metadata.providers.includes('google')) return true;
  if (Array.isArray(user.identities) && user.identities.some((i: any) => i.provider === 'google')) return true;
  return false;
}

/**
 * Computes 1-2 letter initials for the user avatar fallback.
 */
export function getUserInitials(displayName: string): string {
  const words = displayName.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  if (words.length === 1 && words[0].length >= 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  return 'CP';
}
