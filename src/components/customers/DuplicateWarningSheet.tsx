'use client';

import React from 'react';
import { AlertTriangle, UserCheck, UserPlus, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { CustomerTag } from '@prisma/client';

export interface CandidateCustomer {
  id: string;
  name: string;
  nameHindi?: string | null;
  phone: string;
  altPhone?: string | null;
  dob?: string | null;
  relationType?: string;
  relationName?: string | null;
  address?: string | null;
  city?: string;
  photoUrl?: string | null;
  photoDriveUrl?: string | null;
  identityDocType?: string | null;
  identityDocNumber?: string | null;
  tag: CustomerTag;
}

export interface DuplicateMatchItem {
  customer: CandidateCustomer;
  matchScore: number;
  reasons: string[];
}

interface DuplicateWarningSheetProps {
  isOpen: boolean;
  onClose: () => void;
  newDraft: {
    name: string;
    phone: string;
    relationType?: string;
    relationName?: string;
    address?: string;
    photoUrl?: string;
  };
  candidates: DuplicateMatchItem[];
  onSelectExisting: (customer: CandidateCustomer) => void;
  onForceCreateNew: () => void;
}

export function DuplicateWarningSheet({
  isOpen,
  onClose,
  newDraft,
  candidates,
  onSelectExisting,
  onForceCreateNew,
}: DuplicateWarningSheetProps) {
  if (!isOpen || candidates.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-amber-300 max-h-[90vh] flex flex-col">
        {/* Banner Header */}
        <div className="bg-amber-600 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-200 shrink-0" />
            <div>
              <h3 className="font-bold text-base">Visual Identity Confirmation (Possible Duplicate Found)</h3>
              <p className="text-xs text-amber-100">
                Please inspect photos and details below to avoid creating duplicate customer accounts.
              </p>
            </div>
          </div>
        </div>

        {/* Comparison Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-stone-50">
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Matching Existing Records ({candidates.length})
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {candidates.map(({ customer, matchScore, reasons }) => (
                <div
                  key={customer.id}
                  className="bg-white rounded-xl p-4 border border-amber-200 shadow-sm flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start gap-3">
                    {/* Customer WebP Photo Avatar */}
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-amber-100 border border-amber-300 shrink-0 flex items-center justify-center">
                      {customer.photoUrl ? (
                        <img
                          src={customer.photoUrl}
                          alt={customer.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-amber-400" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-red-100 text-red-800">
                          {matchScore}% Match
                        </span>
                        <span className="text-[10px] font-semibold text-stone-500">{customer.tag}</span>
                      </div>

                      <h5 className="font-bold text-amber-950 text-base truncate mt-1">{customer.name}</h5>
                      {customer.nameHindi && (
                        <p className="text-xs text-amber-800 font-medium">{customer.nameHindi}</p>
                      )}

                      <p className="text-xs text-stone-600 font-semibold mt-1">📞 +91 {customer.phone}</p>
                      {customer.relationName && (
                        <p className="text-xs text-stone-500">
                          {customer.relationType || 'S/o, W/o'}: {customer.relationName}
                        </p>
                      )}
                      {customer.identityDocNumber && (
                        <p className="text-xs text-stone-500">
                          🪪 {customer.identityDocType || 'ID'}: {customer.identityDocNumber}
                        </p>
                      )}
                      {customer.address && (
                        <p className="text-[11px] text-stone-400 truncate mt-0.5">{customer.address}</p>
                      )}
                    </div>
                  </div>

                  <div className="text-[11px] text-amber-900 bg-amber-50 p-2 rounded border border-amber-100 space-y-0.5">
                    {reasons.map((r, idx) => (
                      <p key={idx}>• {r}</p>
                    ))}
                  </div>

                  {customer.photoDriveUrl && (
                    <a
                      href={customer.photoDriveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-blue-600 hover:underline inline-flex items-center gap-1 font-medium"
                    >
                      <ExternalLink className="w-3 h-3" /> View Backup Drive Photo
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => onSelectExisting(customer)}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-amber-800 text-white font-semibold text-xs hover:bg-amber-900 transition min-h-[44px]"
                  >
                    <UserCheck className="w-4 h-4" /> Select This Existing Customer
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* New Entry Summary */}
          <div className="bg-white p-4 rounded-xl border border-stone-300 space-y-2">
            <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              You Are Currently Entering:
            </h4>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-stone-100 border border-stone-300 flex items-center justify-center shrink-0 overflow-hidden">
                {newDraft.photoUrl ? (
                  <img src={newDraft.photoUrl} alt="New" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-stone-400" />
                )}
              </div>
              <div className="text-xs">
                <p className="font-bold text-stone-900">{newDraft.name || 'Unnamed'}</p>
                <p className="text-stone-600">Phone: +91 {newDraft.phone}</p>
                {newDraft.relationName && (
                  <p className="text-stone-500">Relation: {newDraft.relationName}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-white border-t border-stone-200 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-medium rounded-lg text-stone-600 hover:bg-stone-100 min-h-[44px]"
          >
            Go Back & Edit Form
          </button>
          <button
            type="button"
            onClick={onForceCreateNew}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-lg border border-amber-400 bg-amber-100 text-amber-950 hover:bg-amber-200 transition min-h-[44px]"
          >
            <UserPlus className="w-4 h-4 text-amber-700" /> Confirm Person is Different (Create New Profile)
          </button>
        </div>
      </div>
    </div>
  );
}
