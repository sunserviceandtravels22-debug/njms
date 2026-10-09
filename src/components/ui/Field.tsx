// Implements: Component: C-03 | Doc: 02_DESIGN §5

import React from 'react';

interface FieldProps {
  label: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  children: React.ReactNode;
  id?: string;
}

export const Field: React.FC<FieldProps> = ({
  label,
  required,
  error,
  helperText,
  children,
  id,
}) => {
  return (
    <div className="space-y-1.5 w-full">
      <label htmlFor={id} className="block text-xs font-semibold text-text uppercase tracking-wide">
        {label}
        {required ? <span className="text-danger ml-0.5">*</span> : <span className="text-text-muted font-normal lowercase ml-1">(optional)</span>}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-danger font-medium mt-1">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-text-muted mt-1">{helperText}</p>
      ) : null}
    </div>
  );
};
