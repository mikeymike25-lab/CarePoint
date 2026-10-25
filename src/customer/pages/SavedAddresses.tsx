import React, { useState, useEffect, useCallback } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonIcon,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonAlert,
  useIonToast,
  IonModal,
  IonButton,
} from '@ionic/react';
import {
  addOutline,
  homeOutline,
  briefcaseOutline,
  locationOutline,
  pinOutline,
  starOutline,
  pencilOutline,
  trashOutline,
  navigateOutline,
  closeOutline,
} from 'ionicons/icons';
import { useAuth } from '../../shared/context/AuthContext';
import type { SavedAddress } from '../../shared/types/database';
import {
  getSavedAddresses,
  deleteAddress,
  setDefaultAddress,
} from '../services/addressService';
import AddressFormModal from '../components/AddressFormModal';
import AddressMapPicker from '../components/AddressMapPicker';

const SavedAddresses: React.FC = () => {
  const { user } = useAuth();
  const [presentToast] = useIonToast();

  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);

  // Delete Alert State
  const [addressToDelete, setAddressToDelete] = useState<SavedAddress | null>(null);
  const [showDeleteAlert, setShowDeleteAlert] = useState<boolean>(false);

  // View Map Pin Modal State
  const [viewingMapAddress, setViewingMapAddress] = useState<SavedAddress | null>(null);

  const loadAddresses = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      const data = await getSavedAddresses(user.id);
      setAddresses(data);
    } catch (err) {
      console.error('Failed to load saved addresses:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  const handleRefresh = async (e: CustomEvent) => {
    await loadAddresses();
    e.detail.complete();
  };

  const handleOpenAdd = () => {
    setEditingAddress(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (addr: SavedAddress) => {
    setEditingAddress(addr);
    setIsFormModalOpen(true);
  };

  const handleSetDefault = async (addr: SavedAddress) => {
    if (!user?.id || addr.is_default) return;

    try {
      await setDefaultAddress(user.id, addr.id);
      setAddresses((prev) =>
        prev.map((a) => ({ ...a, is_default: a.id === addr.id }))
      );
      presentToast({
        message: `Set "${addr.label}" as default address.`,
        duration: 2000,
        color: 'success',
      });
    } catch (err) {
      presentToast({
        message: 'Failed to update default address.',
        duration: 2500,
        color: 'danger',
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!user?.id || !addressToDelete) return;

    try {
      const res = await deleteAddress(user.id, addressToDelete.id);
      if (res.success) {
        setAddresses((prev) => prev.filter((a) => a.id !== addressToDelete.id));
        presentToast({
          message: 'Address deleted.',
          duration: 2000,
          color: 'medium',
        });
      }
    } catch (err) {
      presentToast({
        message: 'Failed to delete address.',
        duration: 2500,
        color: 'danger',
      });
    } finally {
      setAddressToDelete(null);
      setShowDeleteAlert(false);
    }
  };

  const getLabelIcon = (label: string) => {
    const lower = label.toLowerCase();
    if (lower.includes('home')) return homeOutline;
    if (lower.includes('work') || lower.includes('office')) return briefcaseOutline;
    return locationOutline;
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border bg-white shadow-xs border-b border-slate-100">
        <IonToolbar className="px-3" style={{ '--background': '#ffffff' } as React.CSSProperties}>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/customer/profile" className="text-teal-600" text="" />
          </IonButtons>
          <IonTitle className="font-bold text-slate-900 text-base">Saved Addresses</IonTitle>
          <IonButtons slot="end">
            <button
              onClick={handleOpenAdd}
              style={{ padding: '8px 16px', borderRadius: '12px' }}
              className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <IonIcon icon={addOutline} className="text-base" />
              <span>Add New</span>
            </button>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="bg-slate-50">
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="p-4 max-w-3xl mx-auto space-y-4 pb-20">
          {/* Header Info Banner */}
          <div className="bg-teal-50/70 border border-teal-100 rounded-2xl p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
              <IonIcon icon={navigateOutline} className="text-lg" />
            </div>
            <div>
              <h3 className="font-bold text-teal-900 text-sm">Accurate Doorstep Delivery</h3>
              <p className="text-xs text-teal-700/90 mt-0.5 leading-relaxed">
                Save your frequently used addresses with exact map pinpoints so our courier and partner pharmacies can reach you smoothly.
              </p>
            </div>
          </div>

          {/* Loading State */}
          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <IonSpinner name="crescent" color="primary" className="w-8 h-8" />
              <p className="text-xs text-slate-400 font-medium">Loading saved addresses...</p>
            </div>
          ) : addresses.length === 0 ? (
            /* Empty State */
            <div className="bg-white rounded-3xl border border-slate-200/80 p-8 text-center space-y-5 shadow-xs mt-4">
              <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
                <IonIcon icon={locationOutline} className="text-3xl" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-slate-800 text-base">No Saved Addresses Yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  Pin your home, workplace, or preferred drop-off points for 1-tap checkout on medicine orders.
                </p>
              </div>
              <div>
                <button
                  type="button"
                  onClick={handleOpenAdd}
                  style={{
                    padding: '12px 28px',
                    borderRadius: '14px',
                  }}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm shadow-md shadow-teal-600/20 inline-flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
                >
                  <IonIcon icon={addOutline} className="text-lg" />
                  <span>Add Your First Address</span>
                </button>
              </div>
            </div>
          ) : (
            /* List of Saved Addresses */
            <div className="space-y-3">
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  className={`bg-white rounded-2xl border p-4.5 shadow-xs transition-all ${
                    addr.is_default
                      ? 'border-teal-600/60 ring-2 ring-teal-600/10'
                      : 'border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  {/* Card Header: Label & Default Badge */}
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center text-base ${
                          addr.is_default
                            ? 'bg-teal-600 text-white'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        <IonIcon icon={getLabelIcon(addr.label)} />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                          <span>{addr.label}</span>
                          {addr.is_default && (
                            <span className="text-[10px] font-bold bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full">
                              Default Delivery
                            </span>
                          )}
                        </h4>
                      </div>
                    </div>

                    {/* Action buttons (Edit & Delete) */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(addr)}
                        title="Edit Address"
                        className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <IonIcon icon={pencilOutline} className="text-sm" />
                      </button>
                      <button
                        onClick={() => {
                          setAddressToDelete(addr);
                          setShowDeleteAlert(true);
                        }}
                        title="Delete Address"
                        className="w-8 h-8 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <IonIcon icon={trashOutline} className="text-sm" />
                      </button>
                    </div>
                  </div>

                  {/* Recipient info */}
                  <div className="text-xs text-slate-700 font-semibold mb-1 flex items-center gap-2">
                    <span>{addr.recipient_name}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500 font-normal">{addr.phone_number}</span>
                  </div>

                  {/* Full Address */}
                  <p className="text-xs text-slate-600 leading-relaxed mb-2">
                    {addr.address_line}
                    {addr.barangay_or_district ? `, ${addr.barangay_or_district}` : ''}
                    {addr.city ? `, ${addr.city}` : ''}
                  </p>

                  {/* Landmark or Notes */}
                  {addr.landmark_or_notes && (
                    <div className="bg-slate-50 rounded-xl p-2.5 text-[11px] text-slate-600 border border-slate-100 mb-3 flex items-start gap-1.5">
                      <span className="font-bold text-slate-500 shrink-0">Note:</span>
                      <span className="italic">{addr.landmark_or_notes}</span>
                    </div>
                  )}

                  {/* Bottom Footer: Map Status & Set Default */}
                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2 text-xs">
                    {/* Map Coordinate Indicator */}
                    {addr.latitude && addr.longitude ? (
                      <button
                        type="button"
                        onClick={() => setViewingMapAddress(addr)}
                        className="inline-flex items-center gap-1.5 text-[11px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100/70 border border-teal-200/60 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                      >
                        <IonIcon icon={pinOutline} className="text-teal-600 text-xs" />
                        <span>Map Pin Marked</span>
                        <span className="text-teal-400 font-normal">({addr.latitude.toFixed(3)}, {addr.longitude.toFixed(3)})</span>
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                        <IonIcon icon={pinOutline} className="text-xs" />
                        <span>No map pin attached</span>
                      </span>
                    )}

                    {/* Set Default Button */}
                    {!addr.is_default && (
                      <button
                        type="button"
                        onClick={() => handleSetDefault(addr)}
                        className="text-xs font-bold text-slate-600 hover:text-teal-700 flex items-center gap-1 transition-colors ml-auto cursor-pointer"
                      >
                        <IonIcon icon={starOutline} className="text-sm" />
                        <span>Set as default</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Delete Confirmation Alert */}
        <IonAlert
          isOpen={showDeleteAlert}
          onDidDismiss={() => setShowDeleteAlert(false)}
          header="Delete Address"
          message={`Are you sure you want to remove "${addressToDelete?.label || 'this address'}" from your saved addresses?`}
          buttons={[
            {
              text: 'Cancel',
              role: 'cancel',
              handler: () => setAddressToDelete(null),
            },
            {
              text: 'Delete',
              role: 'destructive',
              handler: handleConfirmDelete,
            },
          ]}
        />

        {/* Add/Edit Modal */}
        <AddressFormModal
          isOpen={isFormModalOpen}
          onClose={() => setIsFormModalOpen(false)}
          initialData={editingAddress}
          onSuccess={() => {
            loadAddresses();
          }}
        />

        {/* View Map Pin Modal */}
        {viewingMapAddress && (
          <IonModal
            isOpen={Boolean(viewingMapAddress)}
            onDidDismiss={() => setViewingMapAddress(null)}
          >
            <IonHeader className="ion-no-border bg-white border-b border-slate-100">
              <IonToolbar className="px-3">
                <IonTitle className="font-bold text-slate-900 text-base">
                  {viewingMapAddress.label} — Pinned Location
                </IonTitle>
                <IonButtons slot="end">
                  <IonButton onClick={() => setViewingMapAddress(null)}>
                    <IonIcon icon={closeOutline} />
                  </IonButton>
                </IonButtons>
              </IonToolbar>
            </IonHeader>
            <IonContent className="bg-slate-50 p-4">
              <div className="p-4 space-y-3 max-w-xl mx-auto">
                <div className="bg-white p-3 rounded-2xl border border-slate-200">
                  <p className="text-xs font-bold text-slate-800">{viewingMapAddress.address_line}</p>
                  <p className="text-[11px] text-slate-500">
                    {viewingMapAddress.barangay_or_district ? `${viewingMapAddress.barangay_or_district}, ` : ''}
                    {viewingMapAddress.city}
                  </p>
                </div>
                <AddressMapPicker
                  latitude={viewingMapAddress.latitude}
                  longitude={viewingMapAddress.longitude}
                  height="340px"
                  readOnly={true}
                />
                <button
                  type="button"
                  onClick={() => {
                    const toEdit = viewingMapAddress;
                    setViewingMapAddress(null);
                    handleOpenEdit(toEdit);
                  }}
                  style={{ padding: '14px 20px', borderRadius: '14px' }}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm shadow-md shadow-teal-600/20 transition-all cursor-pointer active:scale-[0.98]"
                >
                  Adjust Pin Location
                </button>
              </div>
            </IonContent>
          </IonModal>
        )}
      </IonContent>
    </IonPage>
  );
};

export default SavedAddresses;
