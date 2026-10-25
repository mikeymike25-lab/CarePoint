import React, { useState } from 'react';
import {
  IonModal,
  IonIcon,
  IonButton,
  IonInput,
  IonTextarea,
  IonLabel,
  useIonToast,
} from '@ionic/react';
import {
  storefrontOutline,
  closeOutline,
  checkmarkCircleOutline,
  documentTextOutline,
  personOutline,
  mailOutline,
  callOutline,
  locationOutline,
  timeOutline,
  shieldCheckmarkOutline,
  alertCircleOutline,
  chatbubbleEllipsesOutline,
} from 'ionicons/icons';
import { supabase } from '../lib/supabase';

const STORAGE_KEYS = {
  STORE_META: 'cp_staff_storefront_meta_v1',
  ADMIN_ACCOUNT_META: 'cp_admin_account_meta_v1',
  AUDIT: 'cp_admin_audit_v1',
};

interface SubmittedPharmacyInquiry {
  pharmacy_id: number;
  name: string;
  license_number: string;
  address: string;
  operating_hours: string;
  phone_number: string;
  applicant_name: string;
  applicant_email: string;
  inquiry_notes?: string;
  created_at: string;
}

function getLocalJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setLocalJSON<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota warnings
  }
}

export interface PharmacyInquiryFormProps {
  onClose?: () => void;
}

export const PharmacyInquiryFormContent: React.FC<PharmacyInquiryFormProps> = ({
  onClose,
}) => {
  const [presentToast] = useIonToast();

  // Application / Inquiry Form State
  const [pharmacyName, setPharmacyName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [applicantName, setApplicantName] = useState('');
  const [applicantEmail, setApplicantEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [operatingHours, setOperatingHours] = useState('8:00 AM – 9:00 PM daily');
  const [inquiryNotes, setInquiryNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRecord, setSubmittedRecord] = useState<SubmittedPharmacyInquiry | null>(null);

  const handleSubmitInquiry = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !pharmacyName.trim() ||
      !licenseNumber.trim() ||
      !applicantName.trim() ||
      !applicantEmail.trim() ||
      !phoneNumber.trim() ||
      !address.trim()
    ) {
      presentToast({
        message: 'Please fill in all required pharmacy inquiry fields.',
        duration: 3000,
        color: 'warning',
        icon: alertCircleOutline,
        position: 'top',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const cleanName = pharmacyName.trim();
      const cleanLicense = licenseNumber.trim().toUpperCase();
      const cleanApplicant = applicantName.trim();
      const cleanEmail = applicantEmail.trim().toLowerCase();
      const cleanPhone = phoneNumber.trim();
      const cleanAddress = address.trim();
      const cleanHours = operatingHours.trim() || '8:00 AM – 9:00 PM daily';
      const cleanNotes = inquiryNotes.trim();

      let createdPharmacyId = Math.floor(100 + Math.random() * 900);

      // 1. Try inserting with full columns and returning row
      const fullPayload = {
        name: cleanName,
        license_number: cleanLicense,
        address: cleanAddress,
        approval_status: 'pending',
        is_open: false,
        operating_hours: cleanHours,
        phone_number: cleanPhone,
        applicant_name: cleanApplicant,
        applicant_email: cleanEmail,
      };

      const selectInsert = await supabase
        .from('pharmacies')
        .insert(fullPayload as any)
        .select('*')
        .single();

      if (!selectInsert.error && selectInsert.data?.pharmacy_id) {
        createdPharmacyId = Number(selectInsert.data.pharmacy_id);
      } else {
        // 2. Fallback: Insert without .select() (in case anon SELECT RLS restricts pending rows)
        const plainFullInsert = await supabase.from('pharmacies').insert(fullPayload as any);
        if (plainFullInsert.error) {
          // 3. Fallback: Core schema columns only
          const coreInsert = await supabase.from('pharmacies').insert({
            name: cleanName,
            license_number: cleanLicense,
            address: cleanAddress,
            approval_status: 'pending',
            is_open: false,
          } as any);
          if (coreInsert.error) {
            console.warn('Supabase pharmacy inquiry insert warning:', coreInsert.error.message);
          }
        }
      }

      // Persist applicant & storefront metadata for Admin Registry & Staff Portal synchronization
      const storeMeta = getLocalJSON<Record<number, any>>(STORAGE_KEYS.STORE_META, {});
      storeMeta[createdPharmacyId] = {
        operating_hours: cleanHours,
        phone_number: cleanPhone,
        applicant_name: cleanApplicant,
        applicant_email: cleanEmail,
        inquiry_notes: cleanNotes,
      };
      setLocalJSON(STORAGE_KEYS.STORE_META, storeMeta);

      const adminMeta = getLocalJSON<Record<string, any>>(STORAGE_KEYS.ADMIN_ACCOUNT_META, {});
      adminMeta[`ph_${createdPharmacyId}`] = {
        email: cleanEmail,
        applicantName: cleanApplicant,
        full_name: cleanApplicant,
        phone_number: cleanPhone,
        inquiry_notes: cleanNotes,
        status: 'pending',
      };
      setLocalJSON(STORAGE_KEYS.ADMIN_ACCOUNT_META, adminMeta);

      const inquiryRecord: SubmittedPharmacyInquiry = {
        pharmacy_id: createdPharmacyId,
        name: cleanName,
        license_number: cleanLicense,
        address: cleanAddress,
        operating_hours: cleanHours,
        phone_number: cleanPhone,
        applicant_name: cleanApplicant,
        applicant_email: cleanEmail,
        inquiry_notes: cleanNotes,
        created_at: new Date().toISOString(),
      };

      // Record in Admin Audit Log
      const auditAction = `Submitted Partner Pharmacy Inquiry: ${cleanName} (${cleanLicense}) — Contact: ${cleanApplicant} <${cleanEmail}>${
        cleanNotes ? ` — Note: "${cleanNotes}"` : ''
      }`;
      const auditEntry = {
        id: 'audit_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        actor: `${cleanApplicant} (${cleanName})`,
        action: auditAction,
        at: new Date().toISOString(),
      };
      const existingAudit = getLocalJSON<any[]>(STORAGE_KEYS.AUDIT, []);
      setLocalJSON(STORAGE_KEYS.AUDIT, [auditEntry, ...existingAudit].slice(0, 250));

      try {
        await supabase.from('admin_audit_log').insert({
          actor: auditEntry.actor,
          action: auditEntry.action,
          created_at: auditEntry.at,
        });
      } catch {
        // Ignore if audit log table is unavailable
      }

      setSubmittedRecord(inquiryRecord);
      presentToast({
        message: `Inquiry submitted! Our Admin team will email you at ${cleanEmail}.`,
        duration: 3500,
        color: 'success',
        icon: checkmarkCircleOutline,
        position: 'top',
      });
    } catch (err: any) {
      presentToast({
        message: err?.message || 'Failed to submit pharmacy inquiry.',
        duration: 3000,
        color: 'danger',
        icon: alertCircleOutline,
        position: 'top',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubmittedRecord(null);
    setPharmacyName('');
    setLicenseNumber('');
    setApplicantName('');
    setApplicantEmail('');
    setPhoneNumber('');
    setAddress('');
    setOperatingHours('8:00 AM – 9:00 PM daily');
    setInquiryNotes('');
  };

  return (
    <div className="p-5 sm:p-6 bg-slate-50 min-h-full">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-5 bg-slate-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <IonIcon icon={storefrontOutline} className="text-xl" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-teal-700 font-bold block">
              Partner Network Onboarding
            </span>
            <h2 className="text-lg font-bold text-slate-900 leading-snug">
              Pharmacy Partnership Inquiry
            </h2>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer border-none"
            aria-label="Close modal"
          >
            <IonIcon icon={closeOutline} className="text-lg" />
          </button>
        )}
      </div>

      {submittedRecord ? (
        <div className="bg-white rounded-2xl p-6 shadow-xs border border-teal-200 text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
            <IonIcon icon={checkmarkCircleOutline} className="text-4xl" />
          </div>
          <div>
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-amber-100 text-amber-800 border border-amber-300 mb-2">
              Pending Admin Verification
            </span>
            <h3 className="text-xl font-bold text-slate-900">
              Inquiry Submitted for {submittedRecord.name}
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 max-w-md mx-auto leading-relaxed">
              Your pharmacy partnership inquiry has been forwarded to the CarePoint Admin Registry. Once our Administrator verifies your FDA permit, we will contact you via email at{' '}
              <strong className="text-teal-700">{submittedRecord.applicant_email}</strong> with your staff account credentials and onboarding details.
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 text-left text-xs space-y-2.5">
            <div className="flex justify-between gap-2">
              <span className="text-slate-400">Contact Email:</span>
              <span className="font-mono font-bold text-teal-700">
                {submittedRecord.applicant_email}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-400">FDA Permit #:</span>
              <span className="font-mono font-semibold text-slate-800">
                {submittedRecord.license_number}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-400">Managing Pharmacist:</span>
              <span className="font-semibold text-slate-800">
                {submittedRecord.applicant_name}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-400">Branch Address:</span>
              <span className="font-medium text-slate-700 text-right">
                {submittedRecord.address}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs cursor-pointer border-none"
              >
                Done
              </button>
            )}
            <button
              type="button"
              onClick={resetForm}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold text-xs cursor-pointer"
            >
              Submit Another Inquiry
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmitInquiry} className="space-y-4">
          {/* Info Banner */}
          <div className="bg-teal-50/90 border border-teal-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-teal-900">
            <IonIcon
              icon={shieldCheckmarkOutline}
              className="text-teal-600 text-lg shrink-0 mt-0.5"
            />
            <div className="leading-relaxed">
              <strong>Partner with CarePoint:</strong> Submit your pharmacy details and FDA License to Operate (LTO) below. Our Administrator will review your application and email you once your branch is approved.
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200/80 space-y-4">
            {/* Pharmacy Business Name */}
            <div>
              <IonLabel className="text-slate-700 font-semibold text-xs uppercase tracking-wider block mb-1.5">
                Pharmacy Business Name *
              </IonLabel>
              <div className="flex items-center bg-slate-50 rounded-xl px-3 py-1 border border-slate-200 focus-within:border-teal-600 transition-all">
                <IonIcon
                  icon={storefrontOutline}
                  className="text-slate-400 text-lg mr-2 shrink-0"
                />
                <IonInput
                  value={pharmacyName}
                  onIonInput={(e) => setPharmacyName(e.detail.value!)}
                  placeholder="e.g. St. Luke Community Pharmacy"
                  className="text-slate-900 font-medium text-sm"
                  required
                />
              </div>
            </div>

            {/* FDA License Number & Contact Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <IonLabel className="text-slate-700 font-semibold text-xs uppercase tracking-wider block mb-1.5">
                  FDA License / Permit # *
                </IonLabel>
                <div className="flex items-center bg-slate-50 rounded-xl px-3 py-1 border border-slate-200 focus-within:border-teal-600 transition-all">
                  <IonIcon
                    icon={documentTextOutline}
                    className="text-slate-400 text-lg mr-2 shrink-0"
                  />
                  <IonInput
                    value={licenseNumber}
                    onIonInput={(e) => setLicenseNumber(e.detail.value!)}
                    placeholder="FDA-PH-0042"
                    className="text-slate-900 font-mono text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <IonLabel className="text-slate-700 font-semibold text-xs uppercase tracking-wider block mb-1.5">
                  Branch Phone Number *
                </IonLabel>
                <div className="flex items-center bg-slate-50 rounded-xl px-3 py-1 border border-slate-200 focus-within:border-teal-600 transition-all">
                  <IonIcon
                    icon={callOutline}
                    className="text-slate-400 text-lg mr-2 shrink-0"
                  />
                  <IonInput
                    type="tel"
                    value={phoneNumber}
                    onIonInput={(e) => setPhoneNumber(e.detail.value!)}
                    placeholder="0917 555 0199"
                    className="text-slate-900 font-medium text-sm"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Pharmacist / Owner Name & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <IonLabel className="text-slate-700 font-semibold text-xs uppercase tracking-wider block mb-1.5">
                  Owner / Pharmacist Name *
                </IonLabel>
                <div className="flex items-center bg-slate-50 rounded-xl px-3 py-1 border border-slate-200 focus-within:border-teal-600 transition-all">
                  <IonIcon
                    icon={personOutline}
                    className="text-slate-400 text-lg mr-2 shrink-0"
                  />
                  <IonInput
                    value={applicantName}
                    onIonInput={(e) => setApplicantName(e.detail.value!)}
                    placeholder="Maria Santos, RPh"
                    className="text-slate-900 font-medium text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <IonLabel className="text-slate-700 font-semibold text-xs uppercase tracking-wider block mb-1.5">
                  Business Email Address *
                </IonLabel>
                <div className="flex items-center bg-slate-50 rounded-xl px-3 py-1 border border-slate-200 focus-within:border-teal-600 transition-all">
                  <IonIcon
                    icon={mailOutline}
                    className="text-slate-400 text-lg mr-2 shrink-0"
                  />
                  <IonInput
                    type="email"
                    value={applicantEmail}
                    onIonInput={(e) => setApplicantEmail(e.detail.value!)}
                    placeholder="owner@pharmacy.ph"
                    className="text-slate-900 font-medium text-sm"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Complete Branch Address */}
            <div>
              <IonLabel className="text-slate-700 font-semibold text-xs uppercase tracking-wider block mb-1.5">
                Complete Store Address *
              </IonLabel>
              <div className="flex items-center bg-slate-50 rounded-xl px-3 py-1 border border-slate-200 focus-within:border-teal-600 transition-all">
                <IonIcon
                  icon={locationOutline}
                  className="text-slate-400 text-lg mr-2 shrink-0"
                />
                <IonInput
                  value={address}
                  onIonInput={(e) => setAddress(e.detail.value!)}
                  placeholder="e.g. 88 Katipunan Ave., Quezon City"
                  className="text-slate-900 font-medium text-sm"
                  required
                />
              </div>
            </div>

            {/* Operating Hours */}
            <div>
              <IonLabel className="text-slate-700 font-semibold text-xs uppercase tracking-wider block mb-1.5">
                Operating Hours
              </IonLabel>
              <div className="flex items-center bg-slate-50 rounded-xl px-3 py-1 border border-slate-200 focus-within:border-teal-600 transition-all">
                <IonIcon
                  icon={timeOutline}
                  className="text-slate-400 text-lg mr-2 shrink-0"
                />
                <IonInput
                  value={operatingHours}
                  onIonInput={(e) => setOperatingHours(e.detail.value!)}
                  placeholder="8:00 AM – 9:00 PM daily"
                  className="text-slate-900 font-medium text-sm"
                />
              </div>
              <div className="flex flex-wrap gap-2 mt-2.5">
                {[
                  '8:00 AM – 9:00 PM daily',
                  '7:00 AM – 10:00 PM daily',
                  'Open 24 Hours Daily',
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setOperatingHours(preset)}
                    className={`text-[11px] px-3 py-1.5 rounded-full font-semibold cursor-pointer border transition-colors ${
                      operatingHours === preset
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Inquiry Message / Notes */}
            <div>
              <IonLabel className="text-slate-700 font-semibold text-xs uppercase tracking-wider block mb-1.5">
                Inquiry Message / Notes (Optional)
              </IonLabel>
              <div className="flex items-start bg-slate-50 rounded-xl px-3 py-1.5 border border-slate-200 focus-within:border-teal-600 transition-all">
                <IonIcon
                  icon={chatbubbleEllipsesOutline}
                  className="text-slate-400 text-lg mr-2 mt-2 shrink-0"
                />
                <IonTextarea
                  rows={2}
                  value={inquiryNotes}
                  onIonInput={(e) => setInquiryNotes(e.detail.value!)}
                  placeholder="Any questions about OTC catalog onboarding, pickup/delivery setup, or staff account assignment..."
                  className="text-slate-900 font-medium text-sm"
                />
              </div>
            </div>
          </div>

          <IonButton
            expand="block"
            type="submit"
            disabled={isSubmitting}
            className="h-12 font-semibold text-base tracking-wide shadow-md shadow-teal-600/20 m-0 active:scale-[0.98] transition-transform"
            style={
              {
                '--background': '#0D9488',
                '--background-hover': '#0c8278',
                '--border-radius': '0.75rem',
              } as any
            }
          >
            {isSubmitting ? 'Submitting Inquiry...' : 'Submit Pharmacy Inquiry'}
          </IonButton>
        </form>
      )}
    </div>
  );
};

export const PharmacyInquiryModal: React.FC<{
  isOpen: boolean;
  onDidDismiss: () => void;
}> = ({ isOpen, onDidDismiss }) => {
  return (
    <IonModal isOpen={isOpen} onDidDismiss={onDidDismiss}>
      <div className="overflow-y-auto h-full bg-slate-50">
        <div className="max-w-lg mx-auto w-full">
          <PharmacyInquiryFormContent onClose={onDidDismiss} />
        </div>
      </div>
    </IonModal>
  );
};
