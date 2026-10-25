import React, { useState } from 'react';
import { useIonToast } from '@ionic/react';
import { alertCircleOutline } from 'ionicons/icons';
import { useAuth } from '../context/AuthContext';

interface GoogleSignInButtonProps {
  text?: string;
  disabled?: boolean;
  className?: string;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({ 
  text = 'Continue with Google',
  disabled = false,
  className = ''
}) => {
  const { loginWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [presentToast] = useIonToast();

  const handleGoogleClick = async () => {
    setLoading(true);
    try {
      const res = await loginWithGoogle();
      if (!res.success) {
        presentToast({
          message: res.message || 'Could not initiate Google sign-in.',
          duration: 4000,
          color: 'danger',
          icon: alertCircleOutline,
          position: 'top',
        });
      }
    } catch (err: any) {
      presentToast({
        message: err?.message || 'Failed to sign in with Google.',
        duration: 4000,
        color: 'danger',
        icon: alertCircleOutline,
        position: 'top',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleGoogleClick}
      disabled={disabled || loading}
      style={{
        height: '48px',
        minHeight: '48px',
        padding: '0 20px',
        borderRadius: '12px',
      }}
      className={`w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-300/90 hover:border-slate-400 shadow-xs hover:shadow-sm active:scale-[0.98] transition-all text-slate-700 font-semibold text-sm sm:text-[15px] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed select-none ${className}`}
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-slate-300 border-t-teal-600 rounded-full animate-spin shrink-0" />
      ) : (
        <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.665-5.17 3.665-9.12z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.26 21.36 7.33 24 12 24z"
          />
          <path
            fill="#FBBC05"
            d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.13z"
          />
          <path
            fill="#EA4335"
            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.13c.95-2.83 3.6-4.96 6.72-4.96z"
          />
        </svg>
      )}
      <span>{loading ? 'Connecting to Google...' : text}</span>
    </button>
  );
};
