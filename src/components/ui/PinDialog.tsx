// Implements: FR-PLT-03 | Component: C-18 | Doc: 02_DESIGN §5

import React, { useState } from 'react';
import { Lock, X } from 'lucide-react';

interface PinDialogProps {
  isOpen: boolean;
  title?: string;
  description?: string;
  onClose: () => void;
  onVerify: (pin: string) => Promise<boolean>;
}

export const PinDialog: React.FC<PinDialogProps> = ({
  isOpen,
  title = 'PIN Verification Required',
  description = 'Enter your 4–6 digit security PIN to authorize this action.',
  onClose,
  onVerify,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin || pin.length < 4) {
      setError('PIN must be at least 4 digits');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const ok = await onVerify(pin);
      if (ok) {
        setPin('');
        onClose();
      } else {
        setError('Incorrect PIN. Please try again.');
      }
    } catch {
      setError('Verification failed. Server error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-surface rounded-xl max-w-sm w-full p-6 border border-border shadow-xl relative animate-in fade-in zoom-in-95">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-text-muted hover:text-text p-1 rounded-md"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-text text-base">{title}</h3>
            <p className="text-xs text-text-muted">{description}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              className="w-full text-center tracking-widest text-2xl py-3 border border-border rounded-lg bg-bg focus:ring-2 focus:ring-primary focus:outline-none"
              autoFocus
            />
            {error && <p className="text-xs text-danger mt-1 text-center font-medium">{error}</p>}
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm border border-border rounded-lg text-text-muted hover:bg-surface-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || pin.length < 4}
              className="px-5 py-2 text-sm bg-primary hover:bg-primary-hover text-white rounded-lg font-medium disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Authorize'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
