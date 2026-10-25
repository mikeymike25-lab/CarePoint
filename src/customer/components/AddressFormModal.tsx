import React, { useState, useEffect } from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonIcon,
  IonSpinner,
  useIonToast,
} from '@ionic/react';
import {
  closeOutline,
  homeOutline,
  briefcaseOutline,
  locationOutline,
  pinOutline,
  checkmarkOutline,
  mapOutline,
  chevronDownOutline,
  chevronUpOutline,
} from 'ionicons/icons';
import { useAuth } from '../../shared/context/AuthContext';
import type { SavedAddress } from '../../shared/types/database';
import { saveAddress } from '../services/addressService';
import AddressMapPicker from './AddressMapPicker';

interface AddressFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (address: SavedAddress) => void;
  initialData?: SavedAddress | null;
  title?: string;
}

export const AddressFormModal: React.FC<AddressFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
  title,
}) => {
  const { user, profile, displayName } = useAuth();
  const [presentToast] = useIonToast();

  const [label, setLabel] = useState<string>('Home');
  const [customLabel, setCustomLabel] = useState<string>('');
  const [recipientName, setRecipientName] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [addressLine, setAddressLine] = useState<string>('');
  const [barangay, setBarangay] = useState<string>('');
  const [city, setCity] = useState<string>('Metro Manila');
  const [landmarkNotes, setLandmarkNotes] = useState<string>('');
  const [isDefault, setIsDefault] = useState<boolean>(false);

  // Map Coordinates
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [showMap, setShowMap] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    if (initialData) {
      const isPreset = ['Home', 'Work'].includes(initialData.label);
      setLabel(isPreset ? initialData.label : 'Other');
      setCustomLabel(isPreset ? '' : initialData.label);
      setRecipientName(initialData.recipient_name || '');
      setPhoneNumber(initialData.phone_number || '');
      setAddressLine(initialData.address_line || '');
      setBarangay(initialData.barangay_or_district || '');
      setCity(initialData.city || 'Metro Manila');
      setLandmarkNotes(initialData.landmark_or_notes || '');
      setLatitude(initialData.latitude ?? null);
      setLongitude(initialData.longitude ?? null);
      setIsDefault(initialData.is_default);
      setShowMap(true);
    } else {
      // Default new address
      setLabel('Home');
      setCustomLabel('');
      setRecipientName(displayName || '');
      setPhoneNumber(profile?.phone_number || '');
      setAddressLine('');
      setBarangay('');
      setCity('Metro Manila');
      setLandmarkNotes('');
      setLatitude(null);
      setLongitude(null);
      setIsDefault(false);
      setShowMap(true);
    }
  }, [initialData, isOpen, profile, user, displayName]);

  const handleLocationSelect = (coords: {
    lat: number;
    lng: number;
    addressSuggestion?: { addressLine?: string; barangay?: string; city?: string; displayName?: string };
  }) => {
    setLatitude(coords.lat);
    setLongitude(coords.lng);

    if (coords.addressSuggestion) {
      if (!addressLine.trim() && coords.addressSuggestion.addressLine) {
        setAddressLine(coords.addressSuggestion.addressLine);
      }
      if (!barangay.trim() && coords.addressSuggestion.barangay) {
        setBarangay(coords.addressSuggestion.barangay);
      }
      if (coords.addressSuggestion.city) {
        setCity(coords.addressSuggestion.city);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) {
      presentToast({
        message: 'Please sign in to save addresses.',
        duration: 2500,
        color: 'warning',
      });
      return;
    }

    if (!recipientName.trim()) {
      presentToast({ message: 'Recipient name is required.', duration: 2000, color: 'danger' });
      return;
    }

    if (!phoneNumber.trim()) {
      presentToast({ message: 'Contact phone number is required.', duration: 2000, color: 'danger' });
      return;
    }

    if (!addressLine.trim()) {
      presentToast({ message: 'Street address line is required.', duration: 2000, color: 'danger' });
      return;
    }

    setIsSaving(true);
    const finalLabel = label === 'Other' && customLabel.trim() ? customLabel.trim() : label;

    try {
      const res = await saveAddress(
        user.id,
        {
          label: finalLabel,
          recipient_name: recipientName.trim(),
          phone_number: phoneNumber.trim(),
          address_line: addressLine.trim(),
          barangay_or_district: barangay.trim() || null,
          city: city.trim() || 'Metro Manila',
          province: 'Metro Manila',
          postal_code: null,
          latitude: latitude,
          longitude: longitude,
          landmark_or_notes: landmarkNotes.trim() || null,
          is_default: isDefault,
        },
        initialData?.id
      );

      if (res.success && res.data) {
        presentToast({
          message: initialData ? 'Address updated!' : 'Address saved successfully!',
          duration: 2000,
          color: 'success',
        });
        onSuccess(res.data);
        onClose();
      } else {
        presentToast({
          message: res.error || 'Failed to save address.',
          duration: 3000,
          color: 'danger',
        });
      }
    } catch (err: any) {
      console.error('Error saving address:', err);
      presentToast({
        message: err.message || 'An unexpected error occurred.',
        duration: 3000,
        color: 'danger',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose} className="carepoint-address-modal">
      <IonHeader className="ion-no-border bg-white border-b border-slate-100">
        <IonToolbar className="px-3" style={{ '--background': '#ffffff' } as React.CSSProperties}>
          <IonTitle className="font-bold text-slate-900 text-base">
            {title || (initialData ? 'Edit Address' : 'Add New Address')}
          </IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose} className="text-slate-500">
              <IonIcon icon={closeOutline} className="text-xl" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="bg-slate-50">
        <form onSubmit={handleSave} className="p-4 max-w-2xl mx-auto space-y-4 pb-12">
          {/* Label Selector */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Address Label
            </label>
            <div className="flex items-center gap-2">
              {[
                { id: 'Home', icon: homeOutline, label: 'Home' },
                { id: 'Work', icon: briefcaseOutline, label: 'Work' },
                { id: 'Other', icon: locationOutline, label: 'Other' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setLabel(item.id)}
                  className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    label === item.id
                      ? 'border-teal-600 bg-teal-50 text-teal-700 ring-2 ring-teal-600/10'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <IonIcon icon={item.icon} className="text-sm" />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

            {label === 'Other' && (
              <input
                type="text"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder="Custom Label (e.g. Mom's House, Clinic, Dorm)"
                className="w-full mt-2 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            )}
          </div>

          {/* Contact Details */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Recipient Contact
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Recipient Name *</label>
                <input
                  type="text"
                  required
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="e.g. Maria Santos"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 font-medium text-slate-900"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. 0917 123 4567"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 font-medium text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Interactive Map Pinning Section */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setShowMap(!showMap)}
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                  <IonIcon icon={mapOutline} className="text-base" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Pin Exact Map Location</h4>
                  <p className="text-[11px] text-slate-500">Helps delivery riders reach your exact doorstep</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400">
                {latitude && longitude ? (
                  <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <IonIcon icon={pinOutline} className="text-xs" />
                    Pinned
                  </span>
                ) : null}
                <IonIcon icon={showMap ? chevronUpOutline : chevronDownOutline} className="text-sm" />
              </div>
            </div>

            {showMap && (
              <div className="pt-2">
                <AddressMapPicker
                  latitude={latitude}
                  longitude={longitude}
                  onLocationSelect={handleLocationSelect}
                  height="260px"
                />
              </div>
            )}
          </div>

          {/* Address Line Fields */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Delivery Address Details
            </label>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">
                House / Unit / Street Address *
              </label>
              <input
                type="text"
                required
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
                placeholder="Unit 4B, 123 Rizal Street"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 font-medium text-slate-900"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Barangay / District</label>
                <input
                  type="text"
                  value={barangay}
                  onChange={(e) => setBarangay(e.target.value)}
                  placeholder="Brgy. San Antonio"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 text-slate-800"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">City / Municipality *</label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Metro Manila"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">
                Landmark / Delivery Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={landmarkNotes}
                onChange={(e) => setLandmarkNotes(e.target.value)}
                placeholder="e.g. Near 7-Eleven, brown gate with doorbell, leave at guard house"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 text-slate-800"
              />
            </div>

            {/* Set as Default Switch */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <div>
                <span className="text-xs font-bold text-slate-800">Set as default delivery address</span>
                <p className="text-[11px] text-slate-500">Automatically selected during checkout</p>
              </div>
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="w-5 h-5 accent-teal-600 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '12px 20px', borderRadius: '14px' }}
              className="flex-1 border border-slate-200 font-semibold text-sm text-slate-700 bg-white hover:bg-slate-50 transition-all active:scale-95 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              style={{ padding: '12px 20px', borderRadius: '14px' }}
              className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm shadow-md shadow-teal-600/20 flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? (
                <IonSpinner name="crescent" color="light" className="w-4 h-4" />
              ) : (
                <>
                  <IonIcon icon={checkmarkOutline} className="text-base" />
                  <span>{initialData ? 'Update Address' : 'Save Address'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </IonContent>
    </IonModal>
  );
};

export default AddressFormModal;
