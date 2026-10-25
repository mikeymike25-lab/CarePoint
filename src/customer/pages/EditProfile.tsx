import React, { useState, useEffect } from 'react';
import { 
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, 
  IonButtons, IonBackButton, useIonToast, useIonRouter, IonAvatar, IonIcon, IonSpinner
} from '@ionic/react';
import { 
  checkmarkCircle, 
  shieldCheckmarkOutline
} from 'ionicons/icons';
import { supabase } from '../../shared/lib/supabase';
import { useAuth } from '../../shared/context/AuthContext';
import { getUserInitials } from '../../shared/utils/userProfile';

const EditProfile: React.FC = () => {
  const { user, profile, displayName, avatarUrl, isGoogleAuth, refreshProfile } = useAuth();
  const router = useIonRouter();
  const [presentToast] = useIonToast();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Default to clean resolved display name so user never sees raw email in the field
    setFullName(displayName || '');
    setPhone(profile?.phone_number || '');
  }, [profile, displayName]);

  const initials = getUserInitials(fullName || displayName);

  const handleSave = async () => {
    if (!user?.id) return;
    
    if (!fullName.trim()) {
      presentToast({
        message: 'Full Name is required',
        duration: 2000,
        color: 'danger',
        position: 'top',
      });
      return;
    }

    setIsSaving(true);
    try {
      // 1. Update public profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          phone_number: phone.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // 2. Also update Supabase auth metadata so session reflects new name immediately
      try {
        await supabase.auth.updateUser({
          data: {
            full_name: fullName.trim(),
            phone_number: phone.trim() || null,
          },
        });
      } catch (authErr) {
        console.warn('Could not update auth user metadata:', authErr);
      }

      await refreshProfile();
      
      presentToast({
        message: 'Profile updated successfully!',
        duration: 2000,
        color: 'success',
        icon: checkmarkCircle,
        position: 'top',
      });
      
      router.push('/customer/profile', 'back');
    } catch (err: any) {
      presentToast({
        message: err.message || 'Failed to update profile',
        duration: 3000,
        color: 'danger',
        position: 'top',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border bg-white shadow-xs border-b border-slate-100">
        <IonToolbar className="px-2 md:px-6" style={{ '--background': '#ffffff' } as React.CSSProperties}>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/customer/profile" className="text-teal-600" text="" />
          </IonButtons>
          <IonTitle className="font-bold text-slate-800 text-base">Edit Profile</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="bg-slate-50">
        <div className="px-4 md:px-8 py-6 max-w-xl mx-auto w-full flex flex-col space-y-6">
          
          {/* Avatar & Account Header */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col items-center text-center">
            <div className="relative mb-3">
              <IonAvatar className="w-20 h-20 bg-teal-50 border-2 border-teal-200/80 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                {avatarUrl ? (
                  <img 
                    src={avatarUrl} 
                    alt={displayName} 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <span className="text-2xl font-black text-teal-700">{initials}</span>
                )}
              </IonAvatar>

              {isGoogleAuth && (
                <div 
                  className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-white border border-slate-200 shadow-xs flex items-center justify-center"
                  title="Google Profile Photo"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.665-5.17 3.665-9.12z" />
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.26 21.36 7.33 24 12 24z" />
                    <path fill="#FBBC05" d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.13z" />
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.13c.95-2.83 3.6-4.96 6.72-4.96z" />
                  </svg>
                </div>
              )}
            </div>

            <h3 className="font-bold text-slate-900 text-base">{displayName}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{user?.email}</p>

            {isGoogleAuth && (
              <span className="mt-2 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200/60 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5">
                <IonIcon icon={shieldCheckmarkOutline} className="text-xs" />
                Profile picture synced from Google Account
              </span>
            )}
          </div>

          {/* Form Fields */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
            
            {/* Full Name */}
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                Full Name
              </label>
              <div className="relative flex items-center">
                <input 
                  type="text" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Juan Dela Cruz"
                  disabled={isSaving}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20 text-slate-800 font-semibold px-4 py-3 rounded-xl outline-none transition-all text-sm"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">This name appears on your medicine orders and prescriptions.</p>
            </div>
            
            {/* Phone Number */}
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                Phone Number
              </label>
              <input 
                type="tel" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0917 123 4567"
                disabled={isSaving}
                className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20 text-slate-800 font-semibold px-4 py-3 rounded-xl outline-none transition-all text-sm font-mono"
              />
              <p className="text-[11px] text-slate-400 mt-1">Used by partner pharmacy couriers for delivery updates.</p>
            </div>

            {/* Email (Read-Only) */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Email Address
              </label>
              <div className="w-full bg-slate-100 border border-slate-200/80 text-slate-500 font-medium px-4 py-3 rounded-xl text-sm flex items-center justify-between">
                <span>{user?.email || 'No email associated'}</span>
                <span className="text-[10px] font-bold bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full">
                  Verified
                </span>
              </div>
            </div>

          </div>

          {/* Action Button */}
          <button 
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            style={{ padding: '14px 24px', borderRadius: '14px' }}
            className="w-full bg-teal-600 hover:bg-teal-700 active:scale-[0.98] disabled:opacity-50 text-white font-semibold shadow-md shadow-teal-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
          >
            {isSaving ? (
              <>
                <IonSpinner name="crescent" color="light" className="w-4 h-4" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <span>Save Changes</span>
            )}
          </button>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default EditProfile;
