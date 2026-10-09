'use client';

import React from 'react';
import { X, ExternalLink, ShieldCheck } from 'lucide-react';

interface PhotoPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  photoUrl?: string | null;
  photoDriveUrl?: string | null;
}

export function PhotoPreviewModal({
  isOpen,
  onClose,
  title = 'Customer Photo Preview',
  photoUrl,
  photoDriveUrl,
}: PhotoPreviewModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-amber-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-amber-100 flex items-center justify-between bg-amber-50/50">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-amber-950">{title}</h3>
            <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-medium">
              <ShieldCheck className="w-3 h-3" /> WebP Standard
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-amber-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col items-center justify-center space-y-4">
          {photoUrl ? (
            <div className="relative w-full max-h-[380px] rounded-xl overflow-hidden bg-stone-100 border border-stone-200 flex items-center justify-center">
              <img
                src={photoUrl}
                alt="Full Preview"
                className="max-h-[360px] w-auto object-contain"
              />
            </div>
          ) : (
            <div className="py-12 text-center text-stone-500 text-sm">
              No direct photo avatar stored.
            </div>
          )}

          {photoDriveUrl && (
            <a
              href={photoDriveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold hover:bg-blue-100 min-h-[44px]"
            >
              <ExternalLink className="w-4 h-4" /> Open Drive Backup Preview
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
