// Implements: FR-PLT-02 | Screen: S-01 | Doc: 02_DESIGN §3, 03_TECH §9

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User, Key, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password, totpCode }),
      });

      const data = await res.json();

      if (res.status === 402) {
        // 2FA required — show the TOTP input
        setRequires2FA(true);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setError(data.message || 'Login failed. Check your username and password.');
        setLoading(false);
        return;
      }

      // Login successful — session cookie is set by the server
      router.push('/dashboard');
    } catch (err) {
      setError('Cannot connect to server. Please check your internet connection and try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center p-4 bg-bg">
      <div className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-xl p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-1">
          <div className="inline-flex p-3 rounded-full bg-primary/10 text-primary mb-2">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-primary tracking-tight">NARAYAN JEWELLERS</h1>
          <p className="text-xs text-text-muted">Sign in to access shop management</p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!requires2FA ? (
            <>
              <Field label="Username" required>
                <div className="relative">
                  <User className="w-5 h-5 absolute left-3 top-3 text-text-muted" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 border border-border rounded-lg bg-bg text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    placeholder="Enter username"
                    autoComplete="username"
                  />
                </div>
              </Field>

              <Field label="Password" required>
                <div className="relative">
                  <Lock className="w-5 h-5 absolute left-3 top-3 text-text-muted" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 border border-border rounded-lg bg-bg text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    placeholder="Enter password"
                    autoComplete="current-password"
                  />
                </div>
              </Field>
            </>
          ) : (
            <Field label="Owner 2FA Code" required helperText="Enter 6-digit TOTP code from your authenticator app">
              <div className="relative">
                <Key className="w-5 h-5 absolute left-3 top-3 text-text-muted" />
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 border border-border rounded-lg bg-bg text-sm font-mono tracking-widest text-center focus:ring-2 focus:ring-primary focus:outline-none"
                  placeholder="123456"
                  autoFocus
                />
              </div>
            </Field>
          )}

          <Button type="submit" loading={loading} className="w-full mt-2">
            {requires2FA ? 'Verify 2FA & Sign In' : 'Sign In'}
          </Button>

          {requires2FA && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => { setRequires2FA(false); setTotpCode(''); }}
              className="w-full"
            >
              ← Back
            </Button>
          )}
        </form>

        <div className="pt-4 border-t border-border text-center text-xs text-text-muted">
          NJMS v1.0.0 · Mobile-first Jewellery Management
        </div>
      </div>
    </div>
  );
}
