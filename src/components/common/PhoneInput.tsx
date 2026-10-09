'use client';

import React from 'react';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

export function PhoneInput({
  value,
  onChange,
  label = 'Phone Number',
  placeholder = '9876543210',
  error,
  required = false,
  disabled = false,
}: PhoneInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Keep only digits and cap at 10 digits
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
    onChange(digits);
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-amber-900 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative rounded-md shadow-sm">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-500 text-sm font-semibold">
          +91
        </div>
        <input
          type="tel"
          value={value}
          onChange={handleChange}
          disabled={disabled}
          placeholder={placeholder}
          className={`w-full pl-12 pr-4 py-2.5 text-base rounded-lg border text-stone-900 bg-white placeholder-stone-400 focus:outline-none focus:ring-2 min-h-[44px] ${
            error
              ? 'border-red-400 focus:ring-red-400'
              : 'border-amber-200 focus:ring-amber-500 focus:border-amber-500'
          } ${disabled ? 'bg-stone-100 cursor-not-allowed text-stone-500' : ''}`}
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
