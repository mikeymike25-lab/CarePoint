import React, { useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonIcon,
  useIonToast,
  useIonRouter,
  IonSpinner,
} from '@ionic/react';
import {
  lockClosedOutline,
  eyeOutline,
  eyeOffOutline,
  checkmarkCircleOutline,
  shieldCheckmarkOutline,
  logoGoogle,
} from 'ionicons/icons';
import { supabase } from '../../shared/lib/supabase';
import { useAuth } from '../../shared/context/AuthContext';

const ChangePassword: React.FC = () => {
  const { user, isGoogleAuth } = useAuth();
  const router = useIonRouter();
  const [presentToast] = useIonToast();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isMinLength = newPassword.length >= 6;
  const isMatching = newPassword.length > 0 && newPassword === confirmPassword;
  const isValid = isMinLength && isMatching;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isMinLength) {
      presentToast({
        message: 'Password must be at least 6 characters long.',
        duration: 3000,
        color: 'warning',
        position: 'top',
      });
      return;
    }

    if (!isMatching) {
      presentToast({
        message: 'Passwords do not match.',
        duration: 3000,
        color: 'warning',
        position: 'top',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      presentToast({
        message: 'Password updated successfully!',
        duration: 2500,
        color: 'success',
        icon: checkmarkCircleOutline,
        position: 'top',
      });

      setNewPassword('');
      setConfirmPassword('');
      router.push('/customer/profile', 'back');
    } catch (err: any) {
      presentToast({
        message: err?.message || 'Failed to update password. Please try again.',
        duration: 4000,
        color: 'danger',
        position: 'top',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border bg-white shadow-xs border-b border-slate-100">
        <IonToolbar className="px-2 md:px-4" style={{ '--background': '#ffffff' } as React.CSSProperties}>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/customer/profile" className="text-teal-600" text="" />
          </IonButtons>
          <IonTitle className="font-bold text-slate-800 text-base">Change Password</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="bg-slate-50">
        <div className="px-4 py-6 max-w-xl mx-auto w-full flex flex-col space-y-5">
          {/* Info Card if using Google Account */}
          {isGoogleAuth && (
            <div className="bg-blue-50/80 border border-blue-200/80 rounded-2xl p-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <IonIcon icon={logoGoogle} className="text-lg" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-blue-900 text-sm">Signed In with Google</h4>
                <p className="text-xs text-blue-700/90 mt-0.5 leading-relaxed">
                  Your account is linked to <span className="font-semibold">{user?.email}</span>. Setting an account password here will allow you to also sign in directly using email and password anytime.
                </p>
              </div>
            </div>
          )}

          {/* Form Container */}
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                <IonIcon icon={lockClosedOutline} className="text-lg" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Set New Security Password</h3>
                <p className="text-[11px] text-slate-400">Ensure your password has at least 6 characters</p>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                New Password
              </label>
              <div className="relative flex items-center">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter at least 6 characters"
                  disabled={isSubmitting}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20 text-slate-800 font-semibold px-4 py-3 rounded-xl outline-none transition-all text-sm pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 text-slate-400 hover:text-slate-600 p-1"
                >
                  <IonIcon icon={showNewPassword ? eyeOffOutline : eyeOutline} className="text-lg" />
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                Confirm New Password
              </label>
              <div className="relative flex items-center">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  disabled={isSubmitting}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20 text-slate-800 font-semibold px-4 py-3 rounded-xl outline-none transition-all text-sm pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 text-slate-400 hover:text-slate-600 p-1"
                >
                  <IonIcon icon={showConfirmPassword ? eyeOffOutline : eyeOutline} className="text-lg" />
                </button>
              </div>
            </div>

            {/* Validation Checklist */}
            <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs">
              <div className={`flex items-center gap-2 ${isMinLength ? 'text-teal-600 font-semibold' : 'text-slate-400'}`}>
                <IonIcon icon={checkmarkCircleOutline} className="text-sm" />
                <span>At least 6 characters long</span>
              </div>
              <div className={`flex items-center gap-2 ${isMatching ? 'text-teal-600 font-semibold' : 'text-slate-400'}`}>
                <IonIcon icon={checkmarkCircleOutline} className="text-sm" />
                <span>Passwords match</span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!isValid || isSubmitting}
              style={{ padding: '14px 24px', borderRadius: '14px' }}
              className="w-full mt-4 bg-teal-600 hover:bg-teal-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm shadow-md shadow-teal-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <IonSpinner name="crescent" color="light" className="w-4 h-4" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <IonIcon icon={shieldCheckmarkOutline} className="text-base" />
                  <span>Save New Password</span>
                </>
              )}
            </button>
          </form>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default ChangePassword;
