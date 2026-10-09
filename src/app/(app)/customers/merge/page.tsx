'use client';

import React, { useState } from 'react';
import { CustomerPicker } from '@/components/customers/CustomerPicker';
import { CandidateCustomer } from '@/components/customers/DuplicateWarningSheet';
import { GitMerge, ArrowRight, CheckCircle2, ShieldAlert, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';

export default function CustomerMergePage() {
  const [primaryCustomer, setPrimaryCustomer] = useState<CandidateCustomer | null>(null);
  const [duplicateCustomer, setDuplicateCustomer] = useState<CandidateCustomer | null>(null);
  const [reason, setReason] = useState('Duplicate profile merged by manager');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleMerge = async () => {
    if (!primaryCustomer || !duplicateCustomer) {
      setError('Please select both a Primary Customer and a Duplicate Customer.');
      return;
    }

    if (primaryCustomer.id === duplicateCustomer.id) {
      setError('Primary and Duplicate customer cannot be the same record.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/v1/customers/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryCustomerId: primaryCustomer.id,
          duplicateCustomerId: duplicateCustomer.id,
          reason,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'Failed to merge customers');
      }

      setSuccessMsg(json.message || 'Customer profiles successfully merged!');
      setPrimaryCustomer(null);
      setDuplicateCustomer(null);
    } catch (err: any) {
      setError(err.message || 'An error occurred during merger');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-amber-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 shrink-0">
            <GitMerge className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-amber-950">Safe Customer Profile Merge (FR-CBM-51)</h1>
            <p className="text-xs text-stone-500">
              Combine duplicate profiles safely. All sales and transaction history will be transferred to Primary.
            </p>
          </div>
        </div>

        <Link
          href="/customers"
          className="px-4 py-2 text-xs font-semibold rounded-lg bg-stone-100 text-stone-700 hover:bg-stone-200 min-h-[44px] flex items-center"
        >
          ← Back to Customers
        </Link>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Merge Selection Workbench */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Primary Customer Card */}
        <div className="bg-white p-5 rounded-2xl border-2 border-emerald-300 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold px-2.5 py-1 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
              PRIMARY CUSTOMER (KEPT)
            </span>
            <span className="text-xs text-stone-400">Target Profile</span>
          </div>

          <CustomerPicker
            selectedCustomer={primaryCustomer}
            onSelect={setPrimaryCustomer}
            label="Search & Select Primary Customer"
            placeholder="Type name or phone of primary profile..."
          />

          {primaryCustomer && (
            <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-2 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-white border border-emerald-300 shrink-0 flex items-center justify-center">
                  {primaryCustomer.photoUrl ? (
                    <img src={primaryCustomer.photoUrl} alt={primaryCustomer.name} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-emerald-400" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-amber-950 text-sm">{primaryCustomer.name}</h4>
                  <p className="text-stone-600 font-medium">📞 +91 {primaryCustomer.phone}</p>
                  {primaryCustomer.relationName && (
                    <p className="text-stone-500">
                      {primaryCustomer.relationType || 'Rel'}: {primaryCustomer.relationName}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Duplicate Customer Card */}
        <div className="bg-white p-5 rounded-2xl border-2 border-red-300 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold px-2.5 py-1 rounded bg-red-100 text-red-900 border border-red-300">
              DUPLICATE CUSTOMER (REMOVED)
            </span>
            <span className="text-xs text-stone-400">Source Profile</span>
          </div>

          <CustomerPicker
            selectedCustomer={duplicateCustomer}
            onSelect={setDuplicateCustomer}
            label="Search & Select Duplicate Customer"
            placeholder="Type name or phone of duplicate profile..."
          />

          {duplicateCustomer && (
            <div className="p-4 rounded-xl bg-red-50/50 border border-red-200 space-y-2 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-white border border-red-300 shrink-0 flex items-center justify-center">
                  {duplicateCustomer.photoUrl ? (
                    <img src={duplicateCustomer.photoUrl} alt={duplicateCustomer.name} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-red-400" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-amber-950 text-sm">{duplicateCustomer.name}</h4>
                  <p className="text-stone-600 font-medium">📞 +91 {duplicateCustomer.phone}</p>
                  {duplicateCustomer.relationName && (
                    <p className="text-stone-500">
                      {duplicateCustomer.relationType || 'Rel'}: {duplicateCustomer.relationName}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reason & Final Action */}
      <div className="bg-white p-6 rounded-2xl border border-amber-200 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium text-amber-900 mb-1">
            Reason for Merger (Audit Trail Logged)
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-amber-200 focus:ring-2 focus:ring-amber-500 min-h-[44px]"
          />
        </div>

        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={handleMerge}
            disabled={submitting || !primaryCustomer || !duplicateCustomer}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-800 text-white font-bold text-sm hover:bg-amber-900 disabled:bg-stone-300 disabled:cursor-not-allowed shadow-md transition active:scale-95 min-h-[44px]"
          >
            <GitMerge className="w-4 h-4" /> {submitting ? 'Merging Profiles...' : 'Confirm & Merge Customer Profiles'}
          </button>
        </div>
      </div>
    </div>
  );
}
