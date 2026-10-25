import React, { useState, useEffect } from 'react';
import { 
  IonPage, IonContent, IonInput, IonButton, IonLabel, 
  IonIcon, useIonToast, useIonRouter 
} from '@ionic/react';
import { storefrontOutline, mailOutline, lockClosedOutline, alertCircleOutline, arrowForwardOutline } from 'ionicons/icons';
import { useAuth } from '../../shared/context/AuthContext';
import { GoogleSignInButton } from '../../shared/components/GoogleSignInButton';
import { PharmacyInquiryModal } from '../../shared/components/PharmacyInquiryModal';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPharmacyInquiry, setShowPharmacyInquiry] = useState(false);
  
  const { login, isAuthenticated, isLoading, role } = useAuth();
  const router = useIonRouter();
  const [presentToast] = useIonToast();

  useEffect(() => {
    if (!isLoading && isAuthenticated && role) {
      const target = (role === 'staff' || role === 'pharmacy_owner') ? '/staff' : role === 'admin' ? '/admin' : '/customer';
      router.push(target, 'forward', 'replace');
    }
  }, [isLoading, isAuthenticated, role, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      presentToast({
        message: 'Please enter both email and password.',
        duration: 3000,
        color: 'warning',
        icon: alertCircleOutline,
        position: 'top',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await login(email, password);
      if (res.success) {
        presentToast({
          message: res.message,
          duration: 2500,
          color: 'success',
          position: 'top',
        });

        // Navigate to the user's role route
        const targetRole = (res.role === 'staff' || res.role === 'pharmacy_owner') ? 'staff' : (res.role || 'customer');
        router.push(`/${targetRole}`, 'forward', 'replace');
      } else {
        presentToast({
          message: res.message || 'Invalid email or password.',
          duration: 3500,
          color: 'danger',
          icon: alertCircleOutline,
          position: 'top',
        });
      }
    } catch (err: any) {
      presentToast({
        message: 'An error occurred during login.',
        duration: 3000,
        color: 'danger',
        position: 'top',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const goToRegister = (e: React.MouseEvent) => {
    e.preventDefault();
    router.push('/register', 'forward', 'push');
  };

  return (
    <IonPage>
      <IonContent className="bg-slate-50">
        <div className="flex flex-col justify-center items-center min-h-full max-w-md mx-auto py-8 px-4 md:px-8">
          
          {/* Header & Logo */}
          <div className="text-center mb-8">
            <img src="/carepoint-logo-transparent.png" alt="CarePoint Logo" className="h-32 w-auto mx-auto mb-4 object-contain" />
            <p className="text-slate-500 text-sm mt-1">Sign in to order medicines or manage pharmacy</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="w-full space-y-4">
            
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 space-y-4">
              <div>
                <IonLabel className="text-slate-700 font-semibold text-xs uppercase tracking-wider block mb-2">
                  Email Address
                </IonLabel>
                <div className="flex items-center bg-slate-50 rounded-xl px-3 py-1 border border-slate-200 focus-within:border-primary transition-all">
                  <IonIcon icon={mailOutline} className="text-slate-400 text-lg mr-2 shrink-0" />
                  <IonInput 
                    type="email" 
                    value={email}
                    onIonInput={e => setEmail(e.detail.value!)}
                    placeholder="name@example.com"
                    className="text-slate-900 font-medium text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <IonLabel className="text-slate-700 font-semibold text-xs uppercase tracking-wider block mb-2">
                  Password
                </IonLabel>
                <div className="flex items-center bg-slate-50 rounded-xl px-3 py-1 border border-slate-200 focus-within:border-primary transition-all">
                  <IonIcon icon={lockClosedOutline} className="text-slate-400 text-lg mr-2 shrink-0" />
                  <IonInput 
                    type="password" 
                    value={password}
                    onIonInput={e => setPassword(e.detail.value!)}
                    placeholder="••••••••"
                    className="text-slate-900 font-medium text-sm"
                    required
                  />
                </div>
              </div>
            </div>

            <IonButton 
              expand="block" 
              type="submit" 
              disabled={isSubmitting}
              className="h-12 font-semibold text-base tracking-wide shadow-md shadow-teal-600/20 m-0 active:scale-[0.98] transition-transform"
              style={{ 
                '--background': '#0D9488',
                '--background-hover': '#0c8278',
                '--border-radius': '0.75rem' 
              } as any}
            >
              {isSubmitting ? 'Signing In...' : 'Log In'}
            </IonButton>

            {/* Divider */}
            <div className="relative my-4 flex items-center justify-center">
              <div className="border-t border-slate-200/80 w-full" />
              <span className="bg-slate-50 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider absolute">
                or
              </span>
            </div>

            {/* Google Sign In */}
            <GoogleSignInButton text="Continue with Google" disabled={isSubmitting} />
          </form>

          {/* Registration Link */}
          <div className="mt-6 text-center w-full">
            <p className="text-slate-600 text-sm">
              Don't have an account?{' '}
              <button 
                type="button"
                onClick={goToRegister}
                className="text-primary font-bold hover:underline inline-flex items-center gap-1 cursor-pointer bg-transparent border-none p-0 active:scale-95 transition-transform"
              >
                Register here <IonIcon icon={arrowForwardOutline} className="text-xs" />
              </button>
            </p>
          </div>

          {/* PARTNER PHARMACY INQUIRY PANEL */}
          <div className="w-full mt-8 bg-white rounded-2xl p-5 shadow-sm border border-teal-200/90 space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center shrink-0">
                <IonIcon icon={storefrontOutline} className="text-xl" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-slate-900 font-bold text-sm leading-snug">
                  Own or manage a pharmacy?
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Submit a partnership inquiry to list your OTC medicines and fulfill community orders on CarePoint. Our Admin team will contact you via email.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowPharmacyInquiry(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold text-xs cursor-pointer border-none shadow-2xs active:scale-[0.98] transition-all"
            >
              <IonIcon icon={storefrontOutline} className="text-base shrink-0" />
              <span>Submit Pharmacy Inquiry</span>
            </button>
          </div>

          <PharmacyInquiryModal
            isOpen={showPharmacyInquiry}
            onDidDismiss={() => setShowPharmacyInquiry(false)}
          />

        </div>
      </IonContent>
    </IonPage>
  );
};

export default Login;
