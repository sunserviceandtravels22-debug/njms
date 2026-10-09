// Implements: Component: C-02 | Doc: 02_DESIGN §5

import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  ...props
}) => {
  const baseStyle =
    'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantStyles = {
    primary: 'bg-primary hover:bg-primary-hover text-white shadow-xs',
    secondary: 'bg-surface-2 border border-border hover:bg-border text-text',
    ghost: 'hover:bg-surface-2 text-text-muted hover:text-text',
    danger: 'bg-danger hover:bg-rose-700 text-white shadow-xs',
  }[variant];

  const sizeStyles = {
    sm: 'h-9 px-3 text-xs gap-1.5',
    md: 'h-11 px-4 text-sm gap-2 min-h-[44px]', // 44px min touch target on mobile
    lg: 'h-12 px-6 text-base gap-2.5 min-h-[48px]',
  }[size];

  return (
    <button
      disabled={disabled || loading}
      className={`${baseStyle} ${variantStyles} ${sizeStyles} ${className}`}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
      {children}
    </button>
  );
};
