'use client';

import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Plus,
  RefreshCw,
  Search,
  ArrowDownLeft,
  X,
  CheckCircle2,
} from 'lucide-react';
import { CustomerPicker } from '@/components/customers/CustomerPicker';
import { formatMoney } from '@/domain/money';

interface CreditAccountData {
  id: string;
  name: string;
  phone: string;
  tag: string;
  creditLimitRupees: number;
  outstandingRupees: number;
}

export default function CreditPage() {
  const [accounts, setAccounts] = useState<CreditAccountData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Collection Drawer State
  const [isCollectOpen, setIsCollectOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [amountInput, setAmountInput] = useState('');
  const [payMode, setPayMode] = useState<'CASH' | 'UPI' | 'BANK'>('CASH');
  const [submitting, setSubmitting] = useState(false);

  const fetchCredit = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/credit?search=${encodeURIComponent(search)}`);
      const json = await res.json();
      if (json.ok) {
        setAccounts(json.data);
      }
    } catch (err) {
      console.error('Fetch credit error', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCredit();
  }, []);

  const handleCollectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      alert('Please select a customer');
      return;
    }

    const amt = parseFloat(amountInput);
    if (!amt || amt <= 0) {
      alert('Please enter valid collection amount in Rupees (₹)');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/credit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          amountRupees: amt,
          paymentMode: payMode,
        }),
      });

      const json = await res.json();
      if (!json.ok) {
        alert(json.error || 'Failed to record collection');
        setSubmitting(false);
        return;
      }

      setIsCollectOpen(false);
      setAmountInput('');
      fetchCredit();
    } catch (err: any) {
      alert(err.message || 'Collection error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-4 rounded-2xl border border-border shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-text">Credit (Udhaar) Ledger</h1>
            <p className="text-xs text-text-muted">Track outstanding balances & record collections in Rupees (₹)</p>
          </div>
        </div>

        <button
          onClick={() => setIsCollectOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary-dark transition-colors shadow-md active:scale-95"
        >
          <ArrowDownLeft className="w-5 h-5" />
          <span>Record Collection Payment</span>
        </button>
      </div>

      {/* Credit Register List */}
      <div className="bg-surface rounded-2xl border border-border overflow-hidden">
        <div className="p-3 border-b border-border flex items-center justify-between bg-surface-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
            Credit Accounts ({accounts.length})
          </h3>
          <button onClick={fetchCredit} className="p-1.5 text-text-muted hover:text-text rounded-lg">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-text-muted">Loading credit accounts...</div>
        ) : accounts.length === 0 ? (
          <div className="p-12 text-center text-xs text-text-muted space-y-2">
            <CreditCard className="w-8 h-8 text-text-muted mx-auto opacity-50" />
            <div>No active credit accounts found</div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {accounts.map((acc) => (
              <div key={acc.id} className="p-4 flex items-center justify-between gap-3 hover:bg-surface-2 transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-text text-sm">{acc.name}</span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-primary/10 text-primary uppercase">
                      {acc.tag}
                    </span>
                  </div>
                  <div className="text-xs text-text-muted mt-0.5">📞 +91 {acc.phone}</div>
                </div>

                <div className="text-right">
                  <div className="text-base font-extrabold text-rose-600">
                    ₹{acc.outstandingRupees.toLocaleString('en-IN')}
                  </div>
                  <div className="text-xs text-text-muted font-medium">
                    Limit: ₹{acc.creditLimitRupees.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Record Collection Drawer */}
      {isCollectOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface w-full max-w-md rounded-2xl border border-border p-5 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-base font-bold text-text">Record Credit Collection</h2>
              <button onClick={() => setIsCollectOpen(false)} className="p-1 rounded-lg text-text-muted hover:text-text">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCollectionSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-text-muted block mb-1">Customer</label>
                <CustomerPicker
                  onSelect={(c: any) => setSelectedCustomerId(c?.id || null)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-text-muted block mb-1">Collection Amount in Rupees (₹)</label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. 5000"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-2 border border-border rounded-xl text-base font-bold text-emerald-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-text-muted block mb-1">Payment Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['CASH', 'UPI', 'BANK'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPayMode(m)}
                      className={`py-2 rounded-lg border text-xs font-bold ${
                        payMode === m
                          ? 'bg-primary text-white border-primary'
                          : 'bg-surface-2 text-text-muted border-border'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCollectOpen(false)}
                  className="flex-1 py-2 bg-surface-2 border border-border rounded-xl text-xs font-bold text-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700"
                >
                  {submitting ? 'Recording...' : 'Record Collection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
