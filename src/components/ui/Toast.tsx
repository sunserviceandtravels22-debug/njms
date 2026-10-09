// Implements: Component: C-20 | Doc: 02_DESIGN §5

import React from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  type: ToastType;
  message: string;
  onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({ type, message, onClose }) => {
  const styles = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-900 icon-emerald-600',
    error: 'bg-rose-50 border-rose-200 text-rose-900 icon-rose-600',
    warning: 'bg-amber-50 border-amber-200 text-amber-900 icon-amber-600',
    info: 'bg-sky-50 border-sky-200 text-sky-900 icon-sky-600',
  }[type];

  const Icon = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  }[type];

  return (
    <div
      className={`flex items-start gap-3 p-3.5 border rounded-lg shadow-md max-w-md w-full animate-in slide-in-from-top-2 ${styles}`}
    >
      <Icon className="w-5 h-5 shrink-0 mt-0.5" />
      <div className="flex-1 text-sm font-medium">{message}</div>
      {onClose && (
        <button onClick={onClose} className="p-0.5 hover:opacity-75 rounded shrink-0">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
