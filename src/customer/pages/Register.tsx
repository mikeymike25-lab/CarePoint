import React, { useState } from 'react';
import { 
  IonPage, IonContent, IonInput, IonButton, IonLabel, 
  IonIcon, IonHeader, IonToolbar, useIonToast, useIonRouter 
} from '@ionic/react';
import { personOutline, mailOutline, callOutline, lockClosedOutline, alertCircleOutline, arrowBackOutline } from 'ionicons/icons';
import { useAuth } from '../../shared/context/AuthContext';
import { GoogleSignInButton } from '../../shared/components/GoogleSignInButton';

const Register: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register } = useAuth();
  const router = useIonRouter();
  const [presentToast] = useIonToast();

  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: 'bg-slate-200', textColor: '' };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;
    
    if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-red-500', textColor: 'text-red-500' };
    if (score === 2) return { score: 2, label: 'Fair', color: 'bg-yellow-500', textColor: 'text-yellow-500' };
    if (score === 3) return { score: 3, label: 'Good', color: 'bg-teal-500', textColor: 'text-teal-500' };
    return { score: 4, label: 'Strong', color: 'bg-green-500', textColor: 'text-green-500' };
  };

  const strength = getPasswordStrength(password);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password || !confirmPassword) {
      presentToast({
        message: 'Please fill in all required fields.',
        duration: 3000,
        color: 'warning',
        icon: alertCircleOutline,
        position: 'top',
      });
      return;
    }

    if (password !== confirmPassword) {
      presentToast({
        message: 'Passwords do not match.',
        duration: 3000,
        color: 'warning',
        icon: alertCircleOutline,
        position: 'top',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await register(fullName, phone, email, password);
      if (res.success) {
        presentToast({
          message: res.message || 'Account created successfully!',
          duration: 3000,
          color: 'success',
          position: 'top',
        });
        router.push('/customer/home', 'forward', 'replace');
      } else {
        presentToast({
          message: res.message || 'Registration failed.',
          duration: 3500,
          color: 'danger',
          icon: alertCircleOutline,
          position: 'top',
        });
      }
    } catch (err: any) {
      console.error('Registration exception:', err);
      presentToast({
        message: 'An error occurred during registration.',
        duration: 3000,
        color: 'danger',
        position: 'top',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const goToLogin = (e: React.MouseEvent) => {
    e.preventDefault();
    router.push('/login', 'back', 'push');
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="bg-slate-50 px-2">
          <button
            type="button"
            onClick={goToLogin}
            className="flex items-center gap-1.5 text-slate-600 font-semibold text-sm hover:text-primary transition-all active:scale-95 py-2 px-3 rounded-lg border-none bg-transparent cursor-pointer"
          >
            <IonIcon icon={arrowBackOutline} className="text-lg" /> Back to Login
          </button>
        </IonToolbar>
      </IonHeader>

      <IonContent className="bg-slate-50">
        <div className="flex flex-col justify-center min-h-full max-w-md mx-auto pb-12 pt-6 px-4 md:px-8">
          
          {/* Header Icon & Title */}
          <div className="text-center mb-6">
            <img src="/carepoint-logo-transparent.png" alt="CarePoint Logo" className="h-32 w-auto mx-auto mb-2 object-contain" />
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Create Account</h1>
            <p className="text-slate-500 text-sm mt-1">Join CarePoint to order medicines fast & securely.</p>
          </div>

          {/* Form */}
          <form onSubmit={handleRegister} className="w-full space-y-4">
            
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 space-y-4">
              
              {/* Full Name */}
              <div>
                <IonLabel className="text-slate-700 font-semibold text-xs uppercase tracking-wider block mb-2">
                  Full Name *
                </IonLabel>
                <div className="flex items-center bg-slate-50 rounded-xl px-3 py-1 border border-slate-200 focus-within:border-primary transition-all">
                  <IonIcon icon={personOutline} className="text-slate-400 text-lg mr-2 shrink-0" />
                  <IonInput 
                    value={fullName}
                    onIonInput={e => setFullName(e.detail.value!)}
                    placeholder="Juan Dela Cruz"
                    className="text-slate-900 font-medium text-sm"
                    required
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <IonLabel className="text-slate-700 font-semibold text-xs uppercase tracking-wider block mb-2">
                  Email Address *
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

              {/* Phone Number */}
              <div>
                <IonLabel className="text-slate-700 font-semibold text-xs uppercase tracking-wider block mb-2">
                  Phone Number
                </IonLabel>
                <div className="flex items-center bg-slate-50 rounded-xl px-3 py-1 border border-slate-200 focus-within:border-primary transition-all">
                  <IonIcon icon={callOutline} className="text-slate-400 text-lg mr-2 shrink-0" />
                  <IonInput 
                    type="tel" 
                    value={phone}
                    onIonInput={e => setPhone(e.detail.value!)}
                    placeholder="0917 123 4567"
                    className="text-slate-900 font-medium text-sm"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <IonLabel className="text-slate-700 font-semibold text-xs uppercase tracking-wider block mb-2">
                  Password *
                </IonLabel>
                <div className="flex items-center bg-slate-50 rounded-xl px-3 py-1 border border-slate-200 focus-within:border-primary transition-all">
                  <IonIcon icon={lockClosedOutline} className="text-slate-400 text-lg mr-2 shrink-0" />
                  <IonInput 
                    type="password" 
                    value={password}
                    onIonInput={e => setPassword(e.detail.value!)}
                    placeholder="Create a strong password"
                    className="text-slate-900 font-medium text-sm"
                    required
                  />
                </div>

                {/* Password Strength Meter */}
                {password && (
                  <div className="mt-3">
                    <div className="flex justify-between items-center mb-1.5 px-1">
                      <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Password Strength</span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${strength.textColor}`}>
                        {strength.label}
                      </span>
                    </div>
                    <div className="flex gap-1 h-1.5 w-full">
                      {[1, 2, 3, 4].map((level) => (
                        <div 
                          key={level} 
                          className={`flex-1 rounded-full transition-colors duration-300 ${
                            strength.score >= level ? strength.color : 'bg-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <IonLabel className="text-slate-700 font-semibold text-xs uppercase tracking-wider block mb-2">
                  Confirm Password *
                </IonLabel>
                <div className="flex items-center bg-slate-50 rounded-xl px-3 py-1 border border-slate-200 focus-within:border-primary transition-all">
                  <IonIcon icon={lockClosedOutline} className="text-slate-400 text-lg mr-2 shrink-0" />
                  <IonInput 
                    type="password" 
                    value={confirmPassword}
                    onIonInput={e => setConfirmPassword(e.detail.value!)}
                    placeholder="Confirm your password"
                    className="text-slate-900 font-medium text-sm"
                    required
                  />
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-red-500 text-xs mt-2 px-1 flex items-center gap-1">
                    <IonIcon icon={alertCircleOutline} className="text-sm" />
                    Passwords do not match
                  </p>
                )}
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
              {isSubmitting ? 'Creating Account...' : 'Sign Up'}
            </IonButton>

            {/* Divider */}
            <div className="relative my-4 flex items-center justify-center">
              <div className="border-t border-slate-200/80 w-full" />
              <span className="bg-slate-50 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider absolute">
                or
              </span>
            </div>

            {/* Google Sign Up */}
            <GoogleSignInButton text="Sign up with Google" disabled={isSubmitting} />
          </form>

          {/* Existing Account Footer */}
          <div className="mt-6 text-center w-full">
            <p className="text-slate-600 text-sm">
              Already have an account?{' '}
              <button 
                type="button"
                onClick={goToLogin}
                className="text-primary font-bold hover:underline inline-flex items-center gap-1 cursor-pointer bg-transparent border-none p-0 active:scale-95 transition-transform"
              >
                Log in
              </button>
            </p>
          </div>

        </div>
      </IonContent>
    </IonPage>
  );
};

export default Register;
