'use client';

import React from 'react';
import { Tag, ShieldAlert, Sparkles, CheckCircle, AlertTriangle } from 'lucide-react';

interface TagChipProps {
  nameEn: string;
  nameHi?: string | null;
  colorHex?: string;
  icon?: string | null;
  isAuto?: boolean;
  effect?: string;
  onRemove?: () => void;
  size?: 'sm' | 'md';
}

export const TagChip: React.FC<TagChipProps> = ({
  nameEn,
  nameHi,
  colorHex = '#6366F1',
  icon,
  isAuto = false,
  effect = 'NONE',
  onRemove,
  size = 'md',
}) => {
  const isBlock = effect === 'BLOCK_RELEASE';

  return (
    <span
      style={{
        backgroundColor: `${colorHex}15`,
        borderColor: `${colorHex}40`,
        color: colorHex,
      }}
      className={`inline-flex items-center gap-1.5 font-bold rounded-lg border transition-all ${
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
      }`}
    >
      {isBlock ? (
        <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
      ) : isAuto ? (
        <Sparkles className="w-3.5 h-3.5 shrink-0" />
      ) : (
        <Tag className="w-3.5 h-3.5 shrink-0" />
      )}
      <span>{nameEn}</span>
      {nameHi && <span className="opacity-75 font-normal">({nameHi})</span>}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 hover:opacity-75 font-black text-xs"
        >
          ×
        </button>
      )}
    </span>
  );
};
