'use client';

import React, { useState } from 'react';
import { X, User, Phone, MapPin, Camera, ChevronDown, ChevronUp, AlertCircle, Check } from 'lucide-react';
import { checkCustomerIdentityRequirements } from '@/lib/customer/identityRequirements';

interface InlineCustomerFormProps {
  initialName?: string;
  initialPhone?: string;
  moduleId?: string;
  onClose: () => void;
  onCreated: (customer: any) => void;
}

export const InlineCustomerForm: React.FC<InlineCustomerFormProps> = ({
  initialName = '',
  initialPhone = '',
  moduleId = 'GIRVI',
  onClose,
  onCreated,
}) => {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [altPhone, setAltPhone] = useState('');
  const [gender, setGender] = useState('UNSPECIFIED');
  const [relationType, setRelationType] = useState('FATHER');
  const [relationName, setRelationName] = useState('');
  const [occupation, setOccupation] = useState('');
  const [address, setAddress] = useState('');
  const [locality, setLocality] = useState('');
  const [city, setCity] = useState('Local');
  const [pincode, setPincode] = useState('');
  const [identityDocType, setIdentityDocType] = useState('Aadhaar');
  const [identityDocNumber, setIdentityDocNumber] = useState('');

  const [expandedSection, setExpandedSection] = useState<'identity' | 'address' | 'id' | 'other'>('identity');
  const [submitting, setSubmitting] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<any | null>(null);

  const handleSubmit = async (e: React.FormEvent, forceNew = false) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return alert('Name and 10-digit Phone are required.');

    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/customers${forceNew ? '?confirmNew=true' : ''}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          altPhone: altPhone.trim() || undefined,
          gender,
          relationType,
          relationName: relationName.trim() || undefined,
          occupation: occupation.trim() || undefined,
          address: address.trim() || undefined,
          locality: locality.trim() || undefined,
          city: city.trim() || 'Local',
          pincode: pincode.trim() || undefined,
          identityDocType,
          identityDocNumber: identityDocNumber.trim() || undefined,
        }),
      });

      if (res.status === 409) {
        const json = await res.json();
        setDuplicateWarning(json.candidates?.[0] || true);
        setSubmitting(false);
        return;
      }

      if (res.ok) {
        const json = await res.json();
        onCreated(json.data);
      } else {
        const json = await res.json();
        alert(json.error || 'Failed to create customer');
      }
    } catch (err: any) {
      alert(err.message || 'Creation error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-lg max-h-[90dvh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95">
        {/* Header */}
        <div className="p-4 border-b border-border bg-surface-2 flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-primary uppercase tracking-tight">Inline Customer Creation</h2>
            <p className="text-[10px] text-text-muted">Full Identity Record Entry for {moduleId}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface border border-border">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Duplicate Warning Dialog */}
        {duplicateWarning && (
          <div className="p-4 bg-amber-500/10 border-b border-amber-500/20 text-xs text-amber-700 space-y-2">
            <div className="flex items-center gap-2 font-bold">
              <AlertCircle className="w-4 h-4 text-amber-600" /> Possible Duplicate Customer Found!
            </div>
            <p>A customer with similar details already exists in the system.</p>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={(e) => handleSubmit(e, true)}
                className="px-3 py-1.5 bg-amber-600 text-white font-bold rounded-lg"
              >
                Save as New Anyway
              </button>
              <button
                type="button"
                onClick={() => setDuplicateWarning(null)}
                className="px-3 py-1.5 bg-surface text-text font-semibold rounded-lg border border-border"
              >
                Go Back & Review
              </button>
            </div>
          </div>
        )}

        <form onSubmit={(e) => handleSubmit(e, false)} className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar text-xs">
          {/* Section 1: Identity */}
          <div className="bg-surface-2 p-4 rounded-xl border border-border space-y-3">
            <div
              onClick={() => setExpandedSection(expandedSection === 'identity' ? ('' as any) : 'identity')}
              className="flex items-center justify-between cursor-pointer font-bold text-text uppercase text-xs"
            >
              <span>1. Basic Identity *</span>
              {expandedSection === 'identity' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>

            {expandedSection === 'identity' && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-[10px] font-bold text-text-muted block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full p-2.5 bg-surface border border-border rounded-xl font-bold text-text outline-none focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-text-muted block mb-1">Primary Phone *</label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="10-digit mobile"
                      className="w-full p-2.5 bg-surface border border-border rounded-xl font-mono font-bold text-text outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-text-muted block mb-1">Alt Phone</label>
                    <input
                      type="tel"
                      value={altPhone}
                      onChange={(e) => setAltPhone(e.target.value)}
                      placeholder="Secondary mobile"
                      className="w-full p-2.5 bg-surface border border-border rounded-xl font-mono font-semibold text-text"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-text-muted block mb-1">Relation Type</label>
                    <select
                      value={relationType}
                      onChange={(e) => setRelationType(e.target.value)}
                      className="w-full p-2.5 bg-surface border border-border rounded-xl font-bold text-text"
                    >
                      <option value="FATHER">Father</option>
                      <option value="HUSBAND">Husband</option>
                      <option value="MOTHER">Mother</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-text-muted block mb-1">Relation Name</label>
                    <input
                      type="text"
                      value={relationName}
                      onChange={(e) => setRelationName(e.target.value)}
                      placeholder="e.g. Ram Lal"
                      className="w-full p-2.5 bg-surface border border-border rounded-xl font-semibold text-text"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Address */}
          <div className="bg-surface-2 p-4 rounded-xl border border-border space-y-3">
            <div
              onClick={() => setExpandedSection(expandedSection === 'address' ? ('' as any) : 'address')}
              className="flex items-center justify-between cursor-pointer font-bold text-text uppercase text-xs"
            >
              <span>2. Residence & Address</span>
              {expandedSection === 'address' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>

            {expandedSection === 'address' && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-[10px] font-bold text-text-muted block mb-1">Current Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="House No, Street name..."
                    className="w-full p-2.5 bg-surface border border-border rounded-xl font-semibold text-text"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-text-muted block mb-1">Locality / Landmark</label>
                    <input
                      type="text"
                      value={locality}
                      onChange={(e) => setLocality(e.target.value)}
                      placeholder="Near Main Market"
                      className="w-full p-2.5 bg-surface border border-border rounded-xl font-semibold text-text"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-text-muted block mb-1">City / Village</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full p-2.5 bg-surface border border-border rounded-xl font-semibold text-text"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Identification Proof */}
          <div className="bg-surface-2 p-4 rounded-xl border border-border space-y-3">
            <div
              onClick={() => setExpandedSection(expandedSection === 'id' ? ('' as any) : 'id')}
              className="flex items-center justify-between cursor-pointer font-bold text-text uppercase text-xs"
            >
              <span>3. ID Proof & Verification</span>
              {expandedSection === 'id' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>

            {expandedSection === 'id' && (
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div>
                  <label className="text-[10px] font-bold text-text-muted block mb-1">ID Proof Type</label>
                  <select
                    value={identityDocType}
                    onChange={(e) => setIdentityDocType(e.target.value)}
                    className="w-full p-2.5 bg-surface border border-border rounded-xl font-bold text-text"
                  >
                    <option value="Aadhaar">Aadhaar Card</option>
                    <option value="PAN">PAN Card</option>
                    <option value="VoterID">Voter ID</option>
                    <option value="DrivingLicense">Driving License</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-text-muted block mb-1">ID Document Number</label>
                  <input
                    type="text"
                    value={identityDocNumber}
                    onChange={(e) => setIdentityDocNumber(e.target.value)}
                    placeholder="Enter ID number..."
                    className="w-full p-2.5 bg-surface border border-border rounded-xl font-mono font-semibold text-text"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-surface-2 hover:bg-border text-text rounded-xl font-semibold text-xs transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-xs shadow-md transition-all disabled:opacity-40"
            >
              {submitting ? 'Saving...' : 'Save & Attach Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
