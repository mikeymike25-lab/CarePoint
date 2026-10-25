import React, { useState, useEffect } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonIcon,
  IonModal,
  useIonToast,
  IonAlert,
} from '@ionic/react';
import {
  cardOutline,
  walletOutline,
  cashOutline,
  checkmarkCircle,
  checkmarkCircleOutline,
  addOutline,
  trashOutline,
  starOutline,
  pencilOutline,
  shieldCheckmarkOutline,
  informationCircleOutline,
  closeOutline,
} from 'ionicons/icons';
import { useAuth } from '../../shared/context/AuthContext';
import {
  getPaymentPreferences,
  setDefaultPaymentType,
  updateGcashNumber,
  addSavedCard,
  removeSavedCard,
  setDefaultCard,
  type PaymentPreferences,
  type StoredPaymentMethodType,
  type SavedCard,
} from '../services/paymentMethodService';

const PaymentMethods: React.FC = () => {
  const { displayName, profile } = useAuth();
  const [presentToast] = useIonToast();

  const [prefs, setPrefs] = useState<PaymentPreferences>(() =>
    getPaymentPreferences(displayName, profile?.phone_number || undefined)
  );

  // GCash Edit Alert
  const [showGcashAlert, setShowGcashAlert] = useState(false);

  // Add Card Modal State
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  const [cardBrand, setCardBrand] = useState<'Visa' | 'Mastercard' | 'JCB'>('Visa');
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [cardholderName, setCardholderName] = useState(displayName);
  const [expiry, setExpiry] = useState('12/28');
  const [cvc, setCvc] = useState('123');

  // Delete Card Confirmation
  const [cardToDelete, setCardToDelete] = useState<SavedCard | null>(null);

  useEffect(() => {
    const loaded = getPaymentPreferences(displayName, profile?.phone_number || undefined);
    setPrefs(loaded);
  }, [displayName, profile?.phone_number]);

  const handleSelectDefaultType = (type: StoredPaymentMethodType) => {
    const updated = setDefaultPaymentType(type);
    setPrefs({ ...updated });
    presentToast({
      message: `Default checkout method set to ${
        type === 'cash' ? 'Cash on Delivery' : type === 'mock_gcash' ? 'GCash' : 'Credit / Debit Card'
      }.`,
      duration: 2000,
      color: 'success',
      icon: checkmarkCircleOutline,
      position: 'top',
    });
  };

  const handleSaveGcash = (newNumber: string) => {
    if (!newNumber.trim()) return;
    const updated = updateGcashNumber(newNumber.trim());
    setPrefs({ ...updated });
    presentToast({
      message: 'GCash mobile number updated!',
      duration: 2000,
      color: 'success',
      icon: checkmarkCircleOutline,
      position: 'top',
    });
  };

  const handleAddCardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNumber = cardNumber.replace(/\s+/g, '');
    const last4 = cleanNumber.slice(-4) || '4242';

    const updated = addSavedCard({
      brand: cardBrand,
      last4,
      cardholderName: cardholderName.trim() || displayName || 'Account Holder',
      expiry: expiry.trim() || '12/28',
      isDefault: false,
    });

    setPrefs({ ...updated });
    setIsAddCardOpen(false);
    presentToast({
      message: `Test ${cardBrand} ending in ${last4} added successfully!`,
      duration: 2500,
      color: 'success',
      icon: checkmarkCircleOutline,
      position: 'top',
    });
  };

  const handleSetDefaultCard = (cardId: string) => {
    const updated = setDefaultCard(cardId);
    setPrefs({ ...updated });
    presentToast({
      message: 'Card set as default card for checkout.',
      duration: 2000,
      color: 'success',
      icon: checkmarkCircleOutline,
      position: 'top',
    });
  };

  const handleConfirmDeleteCard = () => {
    if (!cardToDelete) return;
    const updated = removeSavedCard(cardToDelete.id);
    setPrefs({ ...updated });
    setCardToDelete(null);
    presentToast({
      message: 'Card removed from saved payment methods.',
      duration: 2000,
      color: 'medium',
      position: 'top',
    });
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border bg-white shadow-xs border-b border-slate-100">
        <IonToolbar className="px-2 md:px-4" style={{ '--background': '#ffffff' } as React.CSSProperties}>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/customer/profile" className="text-teal-600" text="" />
          </IonButtons>
          <IonTitle className="font-bold text-slate-800 text-base">Payment Methods</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="bg-slate-50">
        <div className="px-4 py-6 max-w-2xl mx-auto w-full space-y-6 pb-20">
          {/* Sandbox Info Banner */}
          <div className="bg-teal-50/80 border border-teal-200/80 rounded-2xl p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
              <IonIcon icon={shieldCheckmarkOutline} className="text-xl" />
            </div>
            <div>
              <h3 className="font-bold text-teal-900 text-sm">CarePoint Sandbox Payment Simulation</h3>
              <p className="text-xs text-teal-700/90 mt-0.5 leading-relaxed">
                As required by architecture standards, all transactions operate in simulated test mode. No real credit cards or bank accounts are ever charged.
              </p>
            </div>
          </div>

          {/* Default Preference Selector */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
            <h3 className="font-bold text-slate-900 text-sm">Preferred Checkout Method</h3>
            <p className="text-xs text-slate-500">
              Choose your primary method used during order checkout.
            </p>

            <div className="grid grid-cols-3 gap-2.5 pt-1">
              {/* Cash Option */}
              <button
                type="button"
                onClick={() => handleSelectDefaultType('cash')}
                className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                  prefs.defaultType === 'cash'
                    ? 'border-teal-600 bg-teal-50/50 ring-2 ring-teal-600/20 text-teal-900 font-bold'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600 font-medium'
                }`}
              >
                <IonIcon icon={cashOutline} className={`text-xl ${prefs.defaultType === 'cash' ? 'text-teal-600' : 'text-slate-400'}`} />
                <span className="text-xs">Cash (COD)</span>
                {prefs.defaultType === 'cash' && (
                  <span className="text-[10px] bg-teal-600 text-white font-bold px-1.5 py-0.2 rounded-full">Default</span>
                )}
              </button>

              {/* GCash Option */}
              <button
                type="button"
                onClick={() => handleSelectDefaultType('mock_gcash')}
                className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                  prefs.defaultType === 'mock_gcash'
                    ? 'border-teal-600 bg-teal-50/50 ring-2 ring-teal-600/20 text-teal-900 font-bold'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600 font-medium'
                }`}
              >
                <IonIcon icon={walletOutline} className={`text-xl ${prefs.defaultType === 'mock_gcash' ? 'text-blue-600' : 'text-slate-400'}`} />
                <span className="text-xs">GCash E-Wallet</span>
                {prefs.defaultType === 'mock_gcash' && (
                  <span className="text-[10px] bg-teal-600 text-white font-bold px-1.5 py-0.2 rounded-full">Default</span>
                )}
              </button>

              {/* Card Option */}
              <button
                type="button"
                onClick={() => handleSelectDefaultType('mock_card')}
                className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                  prefs.defaultType === 'mock_card'
                    ? 'border-teal-600 bg-teal-50/50 ring-2 ring-teal-600/20 text-teal-900 font-bold'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600 font-medium'
                }`}
              >
                <IonIcon icon={cardOutline} className={`text-xl ${prefs.defaultType === 'mock_card' ? 'text-purple-600' : 'text-slate-400'}`} />
                <span className="text-xs">Test Card</span>
                {prefs.defaultType === 'mock_card' && (
                  <span className="text-[10px] bg-teal-600 text-white font-bold px-1.5 py-0.2 rounded-full">Default</span>
                )}
              </button>
            </div>
          </div>

          {/* GCash E-Wallet Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm">
                  G
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">GCash Sandbox Account</h4>
                  <p className="text-[11px] text-slate-500">Connected mobile wallet</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGcashAlert(true)}
                className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1 p-1 cursor-pointer"
              >
                <IonIcon icon={pencilOutline} />
                <span>Change</span>
              </button>
            </div>

            <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider block">Registered Mobile</span>
                <span className="text-sm font-extrabold text-blue-950 font-mono">{prefs.gcashNumber}</span>
              </div>
              <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full flex items-center gap-1">
                <IonIcon icon={checkmarkCircle} className="text-blue-600" />
                Sandbox Ready
              </span>
            </div>
          </div>

          {/* Saved Cards Section */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Saved Test Cards</h4>
                <p className="text-[11px] text-slate-500">Simulate Visa, Mastercard, or JCB transactions</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddCardOpen(true)}
                style={{ padding: '8px 16px', borderRadius: '12px' }}
                className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <IonIcon icon={addOutline} className="text-sm" />
                <span>Add Card</span>
              </button>
            </div>

            {/* Cards List */}
            {prefs.savedCards.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl">
                <p className="text-xs text-slate-400">No saved test cards yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {prefs.savedCards.map((card) => (
                  <div
                    key={card.id}
                    className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-sm relative overflow-hidden"
                  >
                    {/* Visual Card Elements */}
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-teal-400">
                        {card.brand} Test Card
                      </span>
                      {card.isDefault && (
                        <span className="text-[10px] font-extrabold bg-teal-500 text-white px-2 py-0.5 rounded-full">
                          Default Card
                        </span>
                      )}
                    </div>

                    <div className="font-mono text-lg tracking-widest font-semibold mb-2 text-slate-100">
                      •••• •••• •••• {card.last4}
                    </div>

                    <div className="flex justify-between items-end text-xs text-slate-300">
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 block">Cardholder</span>
                        <span className="font-medium text-white">{card.cardholderName}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 block">Expires</span>
                        <span className="font-medium text-white">{card.expiry}</span>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="mt-3 pt-2.5 border-t border-slate-700/60 flex items-center justify-between text-xs">
                      {!card.isDefault ? (
                        <button
                          type="button"
                          onClick={() => handleSetDefaultCard(card.id)}
                          className="text-teal-400 hover:text-teal-300 font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <IonIcon icon={starOutline} />
                          <span>Make Default</span>
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[11px] flex items-center gap-1">
                          <IonIcon icon={checkmarkCircle} className="text-teal-400" />
                          <span>Active for checkout</span>
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => setCardToDelete(card)}
                        className="text-rose-400 hover:text-rose-300 p-1 cursor-pointer ml-auto"
                        title="Remove Card"
                      >
                        <IonIcon icon={trashOutline} className="text-sm" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cash on Delivery Information Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <IonIcon icon={cashOutline} className="text-lg" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Cash on Delivery (COD)</h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Available across all partner pharmacies. Settle your payment in cash upon doorstep delivery or counter pharmacy pickup. No advance online authorization required.
            </p>
          </div>
        </div>

        {/* Edit GCash Mobile Number Alert */}
        <IonAlert
          isOpen={showGcashAlert}
          onDidDismiss={() => setShowGcashAlert(false)}
          header="Update GCash Number"
          subHeader="Enter sandbox test mobile number (starts with 0917 for successful authorization)"
          inputs={[
            {
              name: 'gcashNumber',
              type: 'tel',
              placeholder: '0917 123 4567',
              value: prefs.gcashNumber,
            },
          ]}
          buttons={[
            {
              text: 'Cancel',
              role: 'cancel',
            },
            {
              text: 'Save',
              handler: (data) => {
                if (data.gcashNumber) {
                  handleSaveGcash(data.gcashNumber);
                }
              },
            },
          ]}
        />

        {/* Delete Card Confirmation Alert */}
        <IonAlert
          isOpen={Boolean(cardToDelete)}
          onDidDismiss={() => setCardToDelete(null)}
          header="Remove Card"
          message={`Remove ${cardToDelete?.brand} ending in ${cardToDelete?.last4} from saved methods?`}
          buttons={[
            {
              text: 'Cancel',
              role: 'cancel',
            },
            {
              text: 'Remove',
              role: 'destructive',
              handler: handleConfirmDeleteCard,
            },
          ]}
        />

        {/* Add Card Modal */}
        <IonModal isOpen={isAddCardOpen} onDidDismiss={() => setIsAddCardOpen(false)}>
          <IonHeader className="ion-no-border bg-white border-b border-slate-100">
            <IonToolbar className="px-3" style={{ '--background': '#ffffff' } as React.CSSProperties}>
              <IonTitle className="font-bold text-slate-900 text-base">Add Sandbox Test Card</IonTitle>
              <IonButtons slot="end">
                <button
                  onClick={() => setIsAddCardOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600"
                >
                  <IonIcon icon={closeOutline} />
                </button>
              </IonButtons>
            </IonToolbar>
          </IonHeader>

          <IonContent className="bg-slate-50">
            <form onSubmit={handleAddCardSubmit} className="p-5 max-w-md mx-auto space-y-4">
              <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-xl text-xs flex items-start gap-2">
                <IonIcon icon={informationCircleOutline} className="text-base text-amber-700 shrink-0 mt-0.5" />
                <span>Use test card numbers (e.g. starting with 4242). Sandbox will simulate instant authorization.</span>
              </div>

              {/* Brand Selector */}
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                  Card Network
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Visa', 'Mastercard', 'JCB'] as const).map((brand) => (
                    <button
                      key={brand}
                      type="button"
                      onClick={() => setCardBrand(brand)}
                      className={`py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        cardBrand === brand
                          ? 'border-teal-600 bg-teal-50 text-teal-800 ring-2 ring-teal-600/20'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      {brand}
                    </button>
                  ))}
                </div>
              </div>

              {/* Card Number */}
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                  Card Number
                </label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="4242 4242 4242 4242"
                  className="w-full bg-white border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-slate-800 font-mono font-semibold px-4 py-3 rounded-xl outline-none text-sm"
                  required
                />
              </div>

              {/* Cardholder Name */}
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                  Cardholder Name
                </label>
                <input
                  type="text"
                  value={cardholderName}
                  onChange={(e) => setCardholderName(e.target.value)}
                  placeholder="Full Name"
                  className="w-full bg-white border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-slate-800 font-semibold px-4 py-3 rounded-xl outline-none text-sm"
                  required
                />
              </div>

              {/* Expiry and CVC */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                    Expiry (MM/YY)
                  </label>
                  <input
                    type="text"
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    placeholder="12/28"
                    className="w-full bg-white border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-slate-800 font-mono font-semibold px-4 py-3 rounded-xl outline-none text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                    CVC / CVV
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value)}
                    placeholder="123"
                    className="w-full bg-white border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-slate-800 font-mono font-semibold px-4 py-3 rounded-xl outline-none text-sm"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                style={{ padding: '14px 20px', borderRadius: '14px' }}
                className="w-full mt-4 bg-teal-600 hover:bg-teal-700 active:scale-[0.98] text-white font-semibold text-sm shadow-md shadow-teal-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <IonIcon icon={checkmarkCircleOutline} className="text-base" />
                <span>Save Test Card</span>
              </button>
            </form>
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default PaymentMethods;
