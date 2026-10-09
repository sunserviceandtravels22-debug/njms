'use client';

import React, { useState, useEffect } from 'react';
import { X, UserPlus, Save, AlertCircle } from 'lucide-react';
import { PhoneInput } from '@/components/common/PhoneInput';
import { PhotoUploader } from '@/components/common/PhotoUploader';
import { DuplicateWarningSheet, DuplicateMatchItem, CandidateCustomer } from './DuplicateWarningSheet';
import { CustomerTag, RelationType } from '@prisma/client';

interface CustomerFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: CandidateCustomer | null;
  onSuccess: (customer: CandidateCustomer) => void;
  title?: string;
}

export function CustomerFormDrawer({
  isOpen,
  onClose,
  initialData,
  onSuccess,
  title = 'Add New Customer',
}: CustomerFormDrawerProps) {
  const [name, setName] = useState('');
  const [nameHindi, setNameHindi] = useState('');
  const [phone, setPhone] = useState('');
  const [altPhone, setAltPhone] = useState('');
  const [dob, setDob] = useState('');
  const [relationType, setRelationType] = useState<RelationType>('FATHER');
  const [relationName, setRelationName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Local');
  const [pincode, setPincode] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoDriveUrl, setPhotoDriveUrl] = useState('');
  const [identityDocType, setIdentityDocType] = useState('AADHAR');
  const [identityDocNumber, setIdentityDocNumber] = useState('');
  const [tag, setTag] = useState<CustomerTag>('STANDARD');
  const [creditLimitRupees, setCreditLimitRupees] = useState('0');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [duplicateCandidates, setDuplicateCandidates] = useState<DuplicateMatchItem[]>([]);
  const [showDuplicateSheet, setShowDuplicateSheet] = useState(false);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setNameHindi(initialData.nameHindi || '');
      setPhone(initialData.phone || '');
      setAltPhone(initialData.altPhone || '');
      setDob(initialData.dob || '');
      setRelationType((initialData.relationType as RelationType) || 'FATHER');
      setRelationName(initialData.relationName || '');
      setAddress(initialData.address || '');
      setCity(initialData.city || 'Local');
      setPhotoUrl(initialData.photoUrl || '');
      setPhotoDriveUrl(initialData.photoDriveUrl || '');
      setIdentityDocType(initialData.identityDocType || 'AADHAR');
      setIdentityDocNumber(initialData.identityDocNumber || '');
      setTag(initialData.tag || 'STANDARD');
    } else {
      resetForm();
    }
  }, [initialData, isOpen]);

  const resetForm = () => {
    setName('');
    setNameHindi('');
    setPhone('');
    setAltPhone('');
    setDob('');
    setRelationType('FATHER');
    setRelationName('');
    setAddress('');
    setCity('Local');
    setPincode('');
    setPhotoUrl('');
    setPhotoDriveUrl('');
    setIdentityDocType('AADHAR');
    setIdentityDocNumber('');
    setTag('STANDARD');
    setCreditLimitRupees('0');
    setNotes('');
    setError(null);
  };

  const handleFormSubmit = async (force: boolean = false) => {
    if (!name.trim()) {
      setError('Customer name is required.');
      return;
    }
    if (!phone || phone.length < 10) {
      setError('Valid 10-digit mobile number is required.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (!force && !initialData) {
        const checkRes = await fetch('/api/v1/customers/check-duplicate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, name, relationName }),
        });
        const checkJson = await checkRes.json();

        if (checkJson.ok && checkJson.hasDuplicate && checkJson.candidates.length > 0) {
          setDuplicateCandidates(checkJson.candidates);
          setShowDuplicateSheet(true);
          setSubmitting(false);
          return;
        }
      }

      const creditLimitPaise = Math.round(parseFloat(creditLimitRupees || '0') * 100);
      const endpoint = initialData ? `/api/v1/customers/${initialData.id}` : '/api/v1/customers';
      const method = initialData ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          nameHindi: nameHindi.trim() || null,
          phone,
          altPhone: altPhone || null,
          dob: dob || null,
          relationType,
          relationName: relationName.trim() || null,
          address: address.trim() || null,
          city: city.trim() || 'Local',
          pincode: pincode.trim() || null,
          photoUrl: photoUrl || null,
          photoDriveUrl: photoDriveUrl.trim() || null,
          identityDocType: identityDocType?.trim() || null,
          identityDocNumber: identityDocNumber.trim() || null,
          tag,
          creditLimitPaise,
          notes: notes.trim() || null,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'Failed to save customer');
      }

      onSuccess(json.data);
      onClose();
      resetForm();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-stone-900/60 backdrop-blur-sm animate-fadeIn flex justify-end">
        <div className="bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl flex flex-col justify-between border-l border-amber-200">
          {/* Drawer Header */}
          <div className="px-6 py-4 border-b border-amber-100 flex items-center justify-between bg-amber-50/70 sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-amber-800" />
              <h3 className="font-bold text-amber-950 text-base">{title}</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-amber-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Body Form */}
          <div className="p-6 space-y-5 flex-1">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Customer Photo Upload Engine */}
            <PhotoUploader
              photoUrl={photoUrl}
              photoDriveUrl={photoDriveUrl}
              onChange={({ photoUrl: pUrl, photoDriveUrl: pDriveUrl }) => {
                if (pUrl !== undefined) setPhotoUrl(pUrl);
                if (pDriveUrl !== undefined) setPhotoDriveUrl(pDriveUrl);
              }}
            />

            {/* Name Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-amber-900 mb-1">
                  Customer Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-amber-200 focus:ring-2 focus:ring-amber-500 min-h-[44px]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-amber-900 mb-1">Hindi Name (हिंदी)</label>
                <input
                  type="text"
                  value={nameHindi}
                  onChange={(e) => setNameHindi(e.target.value)}
                  placeholder="e.g. रमेश कुमार"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-amber-200 focus:ring-2 focus:ring-amber-500 min-h-[44px]"
                />
              </div>
            </div>

            {/* Phone & Alt Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <PhoneInput
                value={phone}
                onChange={setPhone}
                label="Mobile Phone"
                required
              />
              <PhoneInput
                value={altPhone}
                onChange={setAltPhone}
                label="Alternate Phone (Optional)"
              />
            </div>

            {/* Date of Birth & Relation */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-amber-900 mb-1">
                  Date of Birth <span className="text-xs text-stone-500">(Optional)</span>
                </label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-amber-200 bg-white focus:ring-2 focus:ring-amber-500 min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-amber-900 mb-1">Relation</label>
                <select
                  value={relationType}
                  onChange={(e) => setRelationType(e.target.value as RelationType)}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-amber-200 bg-white focus:ring-2 focus:ring-amber-500 min-h-[44px]"
                >
                  <option value="FATHER">S/o (Father)</option>
                  <option value="HUSBAND">W/o (Husband)</option>
                  <option value="MOTHER">D/o (Mother)</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-amber-900 mb-1">Father / Husband Name</label>
                <input
                  type="text"
                  value={relationName}
                  onChange={(e) => setRelationName(e.target.value)}
                  placeholder="e.g. Suresh Kumar"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-amber-200 focus:ring-2 focus:ring-amber-500 min-h-[44px]"
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-amber-900 mb-1">Address & Village</label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
                placeholder="House No., Village / Colony, Landmark..."
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-amber-200 focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-amber-900 mb-1">City / Town</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-amber-200 focus:ring-2 focus:ring-amber-500 min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-amber-900 mb-1">Pincode</label>
                <input
                  type="text"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="302001"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-amber-200 focus:ring-2 focus:ring-amber-500 min-h-[44px]"
                />
              </div>
            </div>

            {/* Aadhar / Identity Document Section (Not Mandatory) */}
            <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-blue-950">
                  🪪 Identity Card / Aadhar Details <span className="text-stone-500 font-normal">(Optional)</span>
                </label>
                <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-semibold">
                  Not Mandatory
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-blue-900 mb-1">ID Card Type</label>
                  <select
                    value={identityDocType}
                    onChange={(e) => setIdentityDocType(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-blue-300 bg-white min-h-[40px]"
                  >
                    <option value="AADHAR">Aadhar Card</option>
                    <option value="PAN">PAN Card</option>
                    <option value="VOTER">Voter ID</option>
                    <option value="DRIVING_LICENCE">Driving Licence</option>
                    <option value="OTHER">Other ID</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-blue-900 mb-1">Aadhar / ID Number</label>
                  <input
                    type="text"
                    value={identityDocNumber}
                    onChange={(e) => setIdentityDocNumber(e.target.value)}
                    placeholder="e.g. XXXX-XXXX-XXXX"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-blue-300 bg-white focus:ring-2 focus:ring-blue-500 min-h-[40px]"
                  />
                </div>
              </div>
            </div>

            {/* Tags & Credit Limit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 rounded-xl bg-amber-50/50 border border-amber-100">
              <div>
                <label className="block text-sm font-medium text-amber-900 mb-1">Customer Category Tag</label>
                <select
                  value={tag}
                  onChange={(e) => setTag(e.target.value as CustomerTag)}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-amber-200 bg-white font-semibold min-h-[44px]"
                >
                  <option value="STANDARD">STANDARD (Normal)</option>
                  <option value="VIP">VIP (High Value)</option>
                  <option value="RISK">RISK (Watchlist)</option>
                  <option value="BLOCKED">BLOCKED (No Credit)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-amber-900 mb-1">Credit Limit (₹)</label>
                <input
                  type="number"
                  value={creditLimitRupees}
                  onChange={(e) => setCreditLimitRupees(e.target.value)}
                  placeholder="50000"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-amber-200 focus:ring-2 focus:ring-amber-500 min-h-[44px]"
                />
              </div>
            </div>
          </div>

          {/* Drawer Footer Actions */}
          <div className="px-6 py-4 border-t border-amber-100 bg-white flex items-center justify-end gap-3 sticky bottom-0 z-10">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 text-xs font-medium rounded-lg text-stone-600 hover:bg-stone-100 min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleFormSubmit(false)}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold rounded-lg bg-amber-800 text-white hover:bg-amber-900 shadow-md transition active:scale-95 min-h-[44px]"
            >
              <Save className="w-4 h-4" /> {submitting ? 'Saving...' : 'Save Customer Profile'}
            </button>
          </div>
        </div>
      </div>

      {/* Side-by-Side Visual Identity Warning Sheet */}
      <DuplicateWarningSheet
        isOpen={showDuplicateSheet}
        onClose={() => setShowDuplicateSheet(false)}
        newDraft={{ name, phone, relationType, relationName, address, photoUrl }}
        candidates={duplicateCandidates}
        onSelectExisting={(existingCustomer) => {
          setShowDuplicateSheet(false);
          onSuccess(existingCustomer);
          onClose();
        }}
        onForceCreateNew={() => {
          setShowDuplicateSheet(false);
          handleFormSubmit(true);
        }}
      />
    </>
  );
}
