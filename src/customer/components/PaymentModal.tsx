import React, { useState } from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonIcon,
  useIonToast,
  IonSpinner,
} from '@ionic/react';
import {
  closeOutline,
  shieldCheckmarkOutline,
  walletOutline,
  cardOutline,
  lockClosedOutline,
  informationCircleOutline,
} from 'ionicons/icons';
import { processPayment, type PaymentMethodType } from '../../shared/services/paymentService';
import { getPaymentPreferences } from '../services/paymentMethodService';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  method: PaymentMethodType;
  amount: number;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, onSuccess, method, amount }) => {
  const [presentToast] = useIonToast();
  const [isProcessing, setIsProcessing] = useState(false);

  // GCash state
  const [mobileNumber, setMobileNumber] = useState('0917 123 4567');

  // Card state
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [expiryDate, setExpiryDate] = useState('12/28');
  const [cvc, setCvc] = useState('123');

  React.useEffect(() => {
    if (isOpen) {
      const prefs = getPaymentPreferences();
      if (prefs.gcashNumber) {
        setMobileNumber(prefs.gcashNumber);
      }
      const defaultCard = prefs.savedCards.find((c) => c.isDefault) || prefs.savedCards[0];
      if (defaultCard) {
        setExpiryDate(defaultCard.expiry || '12/28');
        setCardNumber(`4242 4242 4242 ${defaultCard.last4}`);
      }
    }
  }, [isOpen]);

  const handlePay = async () => {
    setIsProcessing(true);

    try {
      const result = await processPayment(amount, method, {
        mobileNumber,
        cardNumber,
        expiryDate,
        cvc,
      });

      if (result.success) {
        onSuccess();
      } else {
        presentToast({
          message: result.message,
          duration: 3500,
          color: 'danger',
          position: 'top',
        });
      }
    } catch {
      presentToast({
        message: 'An unexpected error occurred during payment.',
        duration: 3500,
        color: 'danger',
        position: 'top',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setMobileNumber('09171234567');
    setCardNumber('4242 4242 4242 4242');
    setExpiryDate('12/28');
    setCvc('123');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const isGCash = method === 'mock_gcash';

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={handleClose}
      initialBreakpoint={0.8}
      breakpoints={[0, 0.8, 1]}
      className="sandbox-payment-modal"
    >
      <IonHeader className="ion-no-border bg-white border-b border-slate-100">
        <IonToolbar className="px-4 py-1" style={{ '--background': '#ffffff' } as React.CSSProperties}>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  isGCash ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                }`}
              >
                <IonIcon icon={isGCash ? walletOutline : cardOutline} className="text-lg" />
              </div>
              <IonTitle className="font-bold text-slate-800 text-base p-0">
                {isGCash ? 'GCash Sandbox Checkout' : 'Card Sandbox Checkout'}
              </IonTitle>
            </div>
            <IonButtons slot="end">
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
              >
                <IonIcon icon={closeOutline} className="text-lg" />
              </button>
            </IonButtons>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent style={{ '--background': '#F8FAFC' } as React.CSSProperties}>
        <div className="max-w-md mx-auto p-5 space-y-5 pb-8">
          {/* Amount Badge */}
          <div className="text-center bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 mb-2">
              <IonIcon icon={shieldCheckmarkOutline} className="text-2xl" />
            </div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Charge</p>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mt-1">
              ₱{amount.toFixed(2)}
            </h2>
            <div className="inline-flex items-center gap-1.5 text-xs text-teal-700 font-medium bg-teal-50 px-2.5 py-1 rounded-full mt-2">
              <IonIcon icon={lockClosedOutline} className="text-xs" />
              <span>Simulated 256-bit Sandbox Auth</span>
            </div>
          </div>

          {/* Form Fields */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
            {isGCash ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  GCash Registered Mobile Number
                </label>
                <input
                  type="tel"
                  placeholder="0917 123 4567"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  disabled={isProcessing}
                  className="w-full bg-slate-50 border border-slate-300 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20 text-slate-800 font-semibold px-4 py-3 rounded-xl outline-none transition-all text-sm tracking-wide"
                />
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Pre-filled with test account. Starts with <code className="font-mono bg-slate-100 px-1 rounded">0917</code> for success.
                </p>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Card Number
                  </label>
                  <input
                    type="text"
                    placeholder="4242 4242 4242 4242"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    disabled={isProcessing}
                    className="w-full bg-slate-50 border border-slate-300 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20 text-slate-800 font-semibold px-4 py-3 rounded-xl outline-none transition-all text-sm font-mono tracking-wider"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Expiry Date
                    </label>
                    <input
                      type="text"
                      placeholder="MM/YY"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      disabled={isProcessing}
                      className="w-full bg-slate-50 border border-slate-300 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20 text-slate-800 font-semibold px-4 py-3 rounded-xl outline-none transition-all text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      CVC / CVV
                    </label>
                    <input
                      type="password"
                      placeholder="123"
                      maxLength={4}
                      value={cvc}
                      onChange={(e) => setCvc(e.target.value)}
                      disabled={isProcessing}
                      className="w-full bg-slate-50 border border-slate-300 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20 text-slate-800 font-semibold px-4 py-3 rounded-xl outline-none transition-all text-sm font-mono"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Testing Tips Note */}
          <div className="bg-amber-50/80 border border-amber-200/80 text-amber-900 p-3.5 rounded-xl text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-800">
              <IonIcon icon={informationCircleOutline} className="text-sm" />
              <span>Sandbox Test Scenarios</span>
            </div>
            <p className="text-amber-800/90 leading-relaxed">
              {isGCash
                ? 'Use numbers starting with "0999" to simulate insufficient balance.'
                : 'Use card numbers starting with "4000" to simulate a declined transaction.'}
            </p>
          </div>

          {/* Action Button */}
          <button
            type="button"
            onClick={handlePay}
            disabled={isProcessing}
            style={{
              minHeight: '52px',
              padding: '14px 20px',
              borderRadius: '14px',
            }}
            className="w-full bg-teal-600 hover:bg-teal-700 active:scale-[0.99] text-white font-bold shadow-lg shadow-teal-700/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-base cursor-pointer"
          >
            {isProcessing ? (
              <>
                <IonSpinner name="crescent" color="light" className="w-5 h-5" />
                <span>Authorizing Sandbox Payment...</span>
              </>
            ) : (
              <>
                <IonIcon icon={shieldCheckmarkOutline} className="text-xl" />
                <span>Authorize ₱{amount.toFixed(2)}</span>
              </>
            )}
          </button>
        </div>
      </IonContent>
    </IonModal>
  );
};

export default PaymentModal;
