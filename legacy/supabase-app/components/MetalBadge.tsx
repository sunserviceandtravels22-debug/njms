
import React from 'react';
import { MetalType } from '../types';
import { COLORS } from '../constants';

interface MetalBadgeProps {
  type: MetalType;
  size?: 'sm' | 'md' | 'lg';
}

export const MetalBadge: React.FC<MetalBadgeProps> = ({ type, size = 'md' }) => {
  const isGold = type === MetalType.GOLD;
  const bgColor = isGold ? COLORS.gold : COLORS.silver;
  const textColor = '#000';
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  return (
    <span 
      className={`inline-flex items-center font-bold rounded-full shadow-sm ${sizeClasses[size]}`}
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      {isGold ? '🪙' : '🔗'} {type}
    </span>
  );
};
