'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export const PURITY_SUGGESTIONS = [
  { label: '24K (999 Fine Gold)', value: '24K (999)' },
  { label: '22K (916 Hallmarked Gold)', value: '22K (916)' },
  { label: '20K (833 Gold)', value: '20K (833)' },
  { label: '18K (750 Jewel Gold)', value: '18K (750)' },
  { label: '14K (585 Gold)', value: '14K (585)' },
  { label: '10K (417 Gold)', value: '10K (417)' },
  { label: '999 Fine Silver', value: '999 Silver' },
  { label: '925 Sterling Silver', value: '925 Silver' },
  { label: '950 Platinum', value: '950 Platinum' },
];

interface PurityComboboxProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

export function PurityCombobox({
  value,
  onChange,
  placeholder = 'Select or type custom purity...',
  className = '',
  id,
}: PurityComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredSuggestions = PURITY_SUGGESTIONS.filter(
    (s) =>
      s.label.toLowerCase().includes(value.toLowerCase()) ||
      s.value.toLowerCase().includes(value.toLowerCase())
  );

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="relative flex items-center">
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full px-3 py-2 pr-8 bg-surface-2 border border-border rounded-xl text-xs text-text font-semibold focus:outline-none focus:border-primary transition-colors"
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-2 p-1 text-text-muted hover:text-text focus:outline-none"
          tabIndex={-1}
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-surface border border-border rounded-xl shadow-xl py-1 custom-scrollbar animate-in fade-in-50 duration-100">
          {filteredSuggestions.length > 0 ? (
            filteredSuggestions.map((item) => {
              const isSelected = value === item.value || value === item.label;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => {
                    onChange(item.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs font-medium flex items-center justify-between hover:bg-surface-2 transition-colors ${
                    isSelected ? 'bg-primary/10 text-primary font-bold' : 'text-text'
                  }`}
                >
                  <span>{item.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                </button>
              );
            })
          ) : (
            <div className="px-3 py-2 text-[11px] text-text-muted italic">
              Custom Purity: <span className="font-bold text-text">"{value}"</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
