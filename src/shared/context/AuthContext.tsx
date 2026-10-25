import React, { createContext, useContext, useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { supabase } from '../lib/supabase';
import type { UserRole as DbUserRole, Profile } from '../types/database';
import { getUserDisplayName, getUserAvatarUrl, isGoogleUser } from '../utils/userProfile';

export type UserRole = DbUserRole | null;

interface AuthContextType {
  isAuthenticated: boolean;
  role: UserRole;
  user: any | null;
  profile: Profile | null;
  displayName: string;
  avatarUrl: string | null;
  isGoogleAuth: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string; role?: UserRole }>;
  loginWithGoogle: () => Promise<{ success: boolean; message: string }>;
  register: (fullName: string, phone: string, email: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  role: null,
  user: null,
  profile: null,
  displayName: 'Customer',
  avatarUrl: null,
  isGoogleAuth: false,
  isLoading: true,
  login: async () => ({ success: false, message: '' }),
  loginWithGoogle: async () => ({ success: false, message: '' }),
  register: async () => ({ success: false, message: '' }),
  logout: async () => {},
  refreshProfile: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [role, setRole] = useState<UserRole>(null);
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Helper to fetch user profile from Supabase
  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!error && data) {
        setProfile(data as Profile);
        setRole(data.role as UserRole);
        return data as Profile;
      }
    } catch (e) {
      console.warn('Could not fetch user profile from Supabase:', e);
    }
    return null;
  };

  // Helper to sync user profile with Google OAuth metadata and clean display names
  const syncUserProfile = async (sessionUser: any): Promise<Profile | null> => {
    let userProfile = await fetchProfile(sessionUser.id);
    const resolvedName = getUserDisplayName(userProfile, sessionUser);

    if (!userProfile) {
      const newProfile: Partial<Profile> = {
        id: sessionUser.id,
        role: 'customer',
        full_name: resolvedName,
        phone_number: sessionUser.user_metadata?.phone_number || null,
        notifications_enabled: true,
        dark_mode: false,
      };
      try {
        await supabase.from('profiles').upsert(newProfile as any);
        userProfile = await fetchProfile(sessionUser.id);
      } catch (e) {
        console.warn('OAuth profile fallback warning:', e);
      }
    } else if (userProfile.full_name && userProfile.full_name.includes('@')) {
      // If full_name in database currently contains an email, auto-clean it in the DB
      try {
        await supabase
          .from('profiles')
          .update({ full_name: resolvedName })
          .eq('id', sessionUser.id);
        userProfile = { ...userProfile, full_name: resolvedName };
        setProfile(userProfile);
      } catch (e) {
        console.warn('Could not auto-clean profile name in DB:', e);
      }
    }

    return userProfile;
  };

  useEffect(() => {
    let isMounted = true;

    async function checkExistingSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && isMounted) {
          setUser(session.user);
          setIsAuthenticated(true);
          const userProfile = await syncUserProfile(session.user);
          if (isMounted) {
            setRole(userProfile?.role || 'customer');
          }
        } else if (isMounted) {
          setUser(null);
          setProfile(null);
          setIsAuthenticated(false);
          setRole(null);
        }
      } catch (err) {
        console.warn('Session init error:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    checkExistingSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        setIsAuthenticated(true);
        const userProfile = await syncUserProfile(session.user);
        setRole(userProfile?.role || 'customer');
      } else {
        setUser(null);
        setProfile(null);
        setIsAuthenticated(false);
        setRole(null);
      }
    });

    // Deep link callback handler for OAuth (Capacitor native)
    const handleAuthUrl = async (urlStr: string) => {
      try {
        await Browser.close().catch(() => {});

        let hashPart = '';
        let queryPart = '';
        if (urlStr.includes('#')) {
          const parts = urlStr.split('#');
          hashPart = parts[1] || '';
          if (parts[0].includes('?')) {
            queryPart = parts[0].split('?')[1] || '';
          }
        } else if (urlStr.includes('?')) {
          queryPart = urlStr.split('?')[1] || '';
        }

        const hashParams = new URLSearchParams(hashPart);
        const queryParams = new URLSearchParams(queryPart);

        const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');
        const code = queryParams.get('code') || hashParams.get('code');

        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) {
            console.error('Supabase setSession error from OAuth deep link:', error);
          } else if (data?.user && isMounted) {
            setUser(data.user);
            setIsAuthenticated(true);
            const userProfile = await syncUserProfile(data.user);
            setRole(userProfile?.role || 'customer');
          }
        } else if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error('Supabase exchangeCodeForSession error:', error);
          } else if (data?.user && isMounted) {
            setUser(data.user);
            setIsAuthenticated(true);
            const userProfile = await syncUserProfile(data.user);
            setRole(userProfile?.role || 'customer');
          }
        }
      } catch (deepLinkErr) {
        console.warn('OAuth deep link handling error:', deepLinkErr);
      }
    };

    let appUrlListener: any = null;
    if (Capacitor.isNativePlatform()) {
      // Check launch URL if cold-started via deep link
      App.getLaunchUrl().then((launch) => {
        if (launch?.url && launch.url.includes('ph.carepoint.app')) {
          handleAuthUrl(launch.url);
        }
      }).catch((e) => console.warn('getLaunchUrl error:', e));

      // Listen for deep link events while running
      App.addListener('appUrlOpen', ({ url }) => {
        if (url && url.includes('ph.carepoint.app')) {
          handleAuthUrl(url);
        }
      }).then((listener) => {
        appUrlListener = listener;
      }).catch((e) => console.warn('appUrlOpen listener error:', e));
    }

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      if (appUrlListener?.remove) {
        appUrlListener.remove();
      }
    };
  }, []);

  // Keep user role in sync in real time if updated in Supabase or on tab focus
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`auth-profile-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        (payload) => {
          if (payload.new) {
            setProfile(payload.new as Profile);
            if (payload.new.role) {
              setRole(payload.new.role as UserRole);
            }
          }
        }
      )
      .subscribe();

    const handleFocus = () => {
      fetchProfile(user.id);
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const login = async (email: string, password: string): Promise<{ success: boolean; message: string; role?: UserRole }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        return { success: false, message: error.message };
      }
      if (data.user) {
        setUser(data.user);
        setIsAuthenticated(true);
        const userProfile = await syncUserProfile(data.user);
        const userRole = userProfile?.role || 'customer';
        setRole(userRole);
        return { success: true, message: 'Signed in successfully!', role: userRole };
      }
      return { success: false, message: 'User account not found.' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Login failed.' };
    }
  };

  const loginWithGoogle = async (): Promise<{ success: boolean; message: string }> => {
    try {
      const isNative = Capacitor.isNativePlatform();
      const redirectUri = isNative ? 'ph.carepoint.app://login' : `${window.location.origin}/login`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: isNative,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });

      if (error) {
        return { success: false, message: error.message };
      }

      if (isNative && data?.url) {
        await Browser.open({
          url: data.url,
          windowName: '_self',
        });
        return { success: true, message: 'Opening Google Sign-In...' };
      }

      return { success: true, message: 'Redirecting to Google...' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Google sign-in failed.' };
    }
  };

  const register = async (fullName: string, phone: string, email: string, password: string): Promise<{ success: boolean; message: string }> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone_number: phone,
            role: 'customer',
          }
        }
      });

      if (error) {
        return { success: false, message: error.message };
      }

      if (data.user) {
        setUser(data.user);
        
        // Save profile to Supabase profiles table
        const newProfile: Partial<Profile> = {
          id: data.user.id,
          role: 'customer',
          full_name: fullName,
          phone_number: phone,
        };

        const { error: profileErr } = await supabase
          .from('profiles')
          .upsert(newProfile as any);

        if (profileErr) {
          console.warn('Profile creation warning:', profileErr);
        }

        setProfile({
          id: data.user.id,
          role: 'customer',
          full_name: fullName,
          phone_number: phone,
          notifications_enabled: true,
          dark_mode: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        setRole('customer');
        setIsAuthenticated(true);
        return { success: true, message: 'Account registered successfully!' };
      }

      return { success: false, message: 'Registration failed.' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Registration failed.' };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Sign out error:', e);
    }
    setUser(null);
    setProfile(null);
    setIsAuthenticated(false);
    setRole(null);
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  };

  const displayName = getUserDisplayName(profile, user);
  const avatarUrl = getUserAvatarUrl(profile, user);
  const isGoogleAuth = isGoogleUser(user);

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      role, 
      user, 
      profile, 
      displayName,
      avatarUrl,
      isGoogleAuth,
      isLoading, 
      login, 
      loginWithGoogle, 
      register, 
      logout, 
      refreshProfile 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
