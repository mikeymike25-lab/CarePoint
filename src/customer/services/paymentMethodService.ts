export type StoredPaymentMethodType = 'cash' | 'mock_gcash' | 'mock_card';

export interface SavedCard {
  id: string;
  brand: 'Visa' | 'Mastercard' | 'JCB' | 'Amex';
  last4: string;
  cardholderName: string;
  expiry: string;
  isDefault: boolean;
}

export interface PaymentPreferences {
  defaultType: StoredPaymentMethodType;
  gcashNumber: string;
  savedCards: SavedCard[];
}

const STORAGE_KEY = 'carepoint_payment_preferences_v1';

const defaultPreferences: PaymentPreferences = {
  defaultType: 'cash',
  gcashNumber: '0917 123 4567',
  savedCards: [
    {
      id: 'card_default_visa',
      brand: 'Visa',
      last4: '4242',
      cardholderName: 'Account Holder',
      expiry: '12/28',
      isDefault: true,
    },
    {
      id: 'card_secondary_mc',
      brand: 'Mastercard',
      last4: '8888',
      cardholderName: 'Account Holder',
      expiry: '08/27',
      isDefault: false,
    },
  ],
};

export function getPaymentPreferences(userName?: string, userPhone?: string): PaymentPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initialized = { ...defaultPreferences };
      if (userName) {
        initialized.savedCards = initialized.savedCards.map((c) => ({
          ...c,
          cardholderName: userName,
        }));
      }
      if (userPhone) {
        initialized.gcashNumber = userPhone;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialized));
      return initialized;
    }
    const parsed = JSON.parse(raw);
    return parsed;
  } catch {
    return defaultPreferences;
  }
}

export function savePaymentPreferences(prefs: PaymentPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.error('Failed to save payment preferences:', e);
  }
}

export function setDefaultPaymentType(type: StoredPaymentMethodType): PaymentPreferences {
  const prefs = getPaymentPreferences();
  prefs.defaultType = type;
  savePaymentPreferences(prefs);
  return prefs;
}

export function updateGcashNumber(newNumber: string): PaymentPreferences {
  const prefs = getPaymentPreferences();
  prefs.gcashNumber = newNumber;
  savePaymentPreferences(prefs);
  return prefs;
}

export function addSavedCard(card: Omit<SavedCard, 'id'>): PaymentPreferences {
  const prefs = getPaymentPreferences();
  const id = `card_${Date.now()}`;
  const newCard: SavedCard = {
    ...card,
    id,
    isDefault: card.isDefault || prefs.savedCards.length === 0,
  };

  if (newCard.isDefault) {
    prefs.savedCards = prefs.savedCards.map((c) => ({ ...c, isDefault: false }));
  }

  prefs.savedCards.push(newCard);
  savePaymentPreferences(prefs);
  return prefs;
}

export function removeSavedCard(cardId: string): PaymentPreferences {
  const prefs = getPaymentPreferences();
  prefs.savedCards = prefs.savedCards.filter((c) => c.id !== cardId);
  if (prefs.savedCards.length > 0 && !prefs.savedCards.some((c) => c.isDefault)) {
    prefs.savedCards[0].isDefault = true;
  }
  savePaymentPreferences(prefs);
  return prefs;
}

export function setDefaultCard(cardId: string): PaymentPreferences {
  const prefs = getPaymentPreferences();
  prefs.savedCards = prefs.savedCards.map((c) => ({
    ...c,
    isDefault: c.id === cardId,
  }));
  savePaymentPreferences(prefs);
  return prefs;
}
