'use client';

import React from 'react';
import { AlertCircle, ChevronRight, UserCheck } from 'lucide-react';
import { FieldRequirement } from '@/lib/customer/identityRequirements';

interface CompleteProfileBannerProps {
  missingFields: FieldRequirement[];
  onComplete: () => void;
}

export const CompleteProfileBanner: React.FC<CompleteProfileBannerProps> = ({
  missingFields,
  onComplete,
}) => {
  if (!missingFields || missingFields.length === 0) return null;

  return (
    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between text-xs text-amber-700">
      <div className="flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
        <div>
          <span className="font-bold block">Complete Profile Prompts</span>
          <span className="text-[10px] text-amber-600 opacity-90">
            Recommended missing: {missingFields.map((f) => f.label).join(', ')}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={onComplete}
        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] uppercase rounded-lg shadow-2xs flex items-center gap-1 shrink-0 transition-colors"
      >
        <span>Fill Now</span>
        <ChevronRight className="w-3 h-3" />
      </button>
    </div>
  );
};
