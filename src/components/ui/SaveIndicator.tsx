// Implements: FR-PLT-08 | Component: C-14 | Doc: 02_DESIGN §5

import React from 'react';
import { Check, Loader2 } from 'lucide-react';

interface SaveIndicatorProps {
  status: 'idle' | 'saving' | 'saved';
  isOffline?: boolean;
}

export const SaveIndicator: React.FC<SaveIndicatorProps> = ({ status, isOffline }) => {
  if (isOffline) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded">
        Offline: will sync
      </span>
    );
  }

  if (status === 'saving') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-text-muted">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
        Saving...
      </span>
    );
  }

  if (status === 'saved') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium">
        <Check className="w-3.5 h-3.5" />
        Saved ✓
      </span>
    );
  }

  return null;
};
