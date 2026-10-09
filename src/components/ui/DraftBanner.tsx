// Implements: FR-PLT-08 | Component: C-13 | Doc: 02_DESIGN §5

import React from 'react';
import { AlertCircle } from 'lucide-react';

interface DraftBannerProps {
  timestamp?: number;
  onResume: () => void;
  onDiscard: () => void;
}

export const DraftBanner: React.FC<DraftBannerProps> = ({
  timestamp,
  onResume,
  onDiscard,
}) => {
  const timeStr = timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-sm shadow-sm">
      <div className="flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
        <span>
          <strong>Unsaved draft found</strong> {timeStr ? `(${timeStr})` : ''}. Would you like to resume?
        </span>
      </div>
      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
        <button
          onClick={onDiscard}
          className="px-3 py-1.5 border border-amber-300 text-amber-800 hover:bg-amber-100 rounded-md font-medium text-xs transition-colors"
        >
          Discard
        </button>
        <button
          onClick={onResume}
          className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-md font-medium text-xs transition-colors"
        >
          Resume
        </button>
      </div>
    </div>
  );
};
