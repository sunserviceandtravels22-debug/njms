'use client';

import React, { useState, useEffect } from 'react';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Search,
  Calendar,
  Filter,
  RefreshCw,
  Edit2,
  Trash2,
  AlertTriangle,
  X,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { formatMoney } from '@/domain/money';

interface CashbookSummary {
  startDate: string;
  endDate: string;
  openingPaise: string;
  closingPaise: string;
  rangeInPaise: string;
  rangeOutPaise: string;
  netFlowPaise: string;
  cashInPaise: string;
  cashOutPaise: string;
  upiInPaise: string;
  upiOutPaise: string;
}

interface PaymentItem {
  id: string;
  businessDate: string;
  direction: 'IN' | 'OUT';
  mode: 'CASH' | 'UPI' | 'BANK' | 'CARD' | 'CREDIT';
  flowKind: string | null;
  amountPaise: string;
  categoryId: string | null;
  categoryName: string;
  utr: string | null;
  reversedOfId: string | null;
  createdAt: string;
}

export default function CashbookPage() {
  const todayStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [modeFilter, setModeFilter] = useState<'ALL' | 'CASH' | 'UPI' | 'BANK'>('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [summary, setSummary] = useState<CashbookSummary | null>(null);
  const [payments, setPayments] = useState<PaymentItem[]>([]);

  // Add Drawer State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [direction, setDirection] = useState<'IN' | 'OUT'>('IN');
  const [mode, setMode] = useState<'CASH' | 'UPI' | 'BANK'>('CASH');
  const [amountInput, setAmountInput] = useState('');
  const [notes, setNotes] = useState('');
  const [utr, setUtr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reversal Modal State
  const [reversalTarget, setReversalTarget] = useState<PaymentItem | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [reversing, setReversing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchCashbook = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        startDate,
        endDate,
        mode: modeFilter,
        search,
      });
      const res = await fetch(`/api/v1/cashbook?${query.toString()}`);
      const json = await res.json();

      if (json.ok) {
        setSummary(json.data.summary);
        setPayments(json.data.payments);
      }
    } catch (err) {
      console.error('Failed to load cashbook', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCashbook();
  }, [startDate, endDate, modeFilter]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const amtNumber = parseFloat(amountInput);
    if (!amtNumber || amtNumber <= 0) {
      setErrorMsg('Please enter a valid amount');
      return;
    }

    setSubmitting(true);
    try {
      const amountPaise = BigInt(Math.round(amtNumber * 100)).toString();
      const res = await fetch('/api/v1/cash-txns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          direction,
          mode,
          amountPaise,
          businessDate: startDate,
          notes,
          utr,
        }),
      });

      const json = await res.json();
      if (!json.ok) {
        setErrorMsg(json.error || 'Failed to add entry');
        setSubmitting(false);
        return;
      }

      setIsAddOpen(false);
      setAmountInput('');
      setNotes('');
      setUtr('');
      fetchCashbook();
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReversalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversalTarget || !reversalReason.trim()) return;

    setReversing(true);
    try {
      const res = await fetch(`/api/v1/cash-txns/${reversalTarget.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reversalReason.trim() }),
      });

      const json = await res.json();
      if (!json.ok) {
        alert(json.error || 'Reversal failed');
        setReversing(false);
        return;
      }

      setReversalTarget(null);
      setReversalReason('');
      fetchCashbook();
    } catch (err: any) {
      alert(err.message || 'Reversal error');
    } finally {
      setReversing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-4 rounded-2xl border border-border shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-text">Daily Cash Flow</h1>
            <p className="text-xs text-text-muted">Gap-free balance chain & 1-tap ledger entries</p>
          </div>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary-dark transition-colors shadow-md active:scale-95"
        >
          <Plus className="w-5 h-5" />
          <span>Add Cash Entry</span>
        </button>
      </div>

      {/* Date Range & Mode Chips */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-surface p-3 rounded-xl border border-border">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-text-muted" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-2.5 py-1.5 bg-surface-2 border border-border rounded-lg text-xs font-semibold text-text"
          />
          <span className="text-xs text-text-muted">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-2.5 py-1.5 bg-surface-2 border border-border rounded-lg text-xs font-semibold text-text"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 md:pb-0">
          {(['ALL', 'CASH', 'UPI', 'BANK'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setModeFilter(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                modeFilter === m
                  ? 'bg-primary text-white shadow-2xs'
                  : 'bg-surface-2 text-text-muted hover:text-text hover:bg-border'
              }`}
            >
              {m === 'ALL' ? 'All Modes' : m}
            </button>
          ))}
        </div>
      </div>

      {/* Range Summary Bar Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3.5 bg-surface rounded-xl border border-border space-y-1">
            <div className="text-xs text-text-muted font-medium">Opening Balance</div>
            <div className="text-lg font-black text-text">
              {formatMoney(BigInt(summary.openingPaise))}
            </div>
          </div>

          <div className="p-3.5 bg-surface rounded-xl border border-border space-y-1">
            <div className="flex items-center gap-1 text-xs text-emerald-600 font-semibold">
              <ArrowDownLeft className="w-4 h-4" />
              <span>Total Cash In</span>
            </div>
            <div className="text-lg font-black text-emerald-600">
              +{formatMoney(BigInt(summary.rangeInPaise))}
            </div>
          </div>

          <div className="p-3.5 bg-surface rounded-xl border border-border space-y-1">
            <div className="flex items-center gap-1 text-xs text-rose-600 font-semibold">
              <ArrowUpRight className="w-4 h-4" />
              <span>Total Cash Out</span>
            </div>
            <div className="text-lg font-black text-rose-600">
              -{formatMoney(BigInt(summary.rangeOutPaise))}
            </div>
          </div>

          <div className="p-3.5 bg-surface rounded-xl border border-primary/30 bg-primary/5 space-y-1">
            <div className="text-xs text-primary font-bold">Closing Balance</div>
            <div className="text-lg font-black text-primary">
              {formatMoney(BigInt(summary.closingPaise))}
            </div>
          </div>
        </div>
      )}

      {/* Transactions List */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="p-3 border-b border-border flex items-center justify-between bg-surface-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
            Ledger Transactions ({payments.length})
          </h3>
          <button
            onClick={fetchCashbook}
            className="p-1.5 text-text-muted hover:text-text rounded-lg hover:bg-surface"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-text-muted">Loading cashbook...</div>
        ) : payments.length === 0 ? (
          <div className="p-12 text-center text-xs text-text-muted space-y-2">
            <FileText className="w-8 h-8 text-text-muted mx-auto opacity-50" />
            <div>No transactions recorded for this period</div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {payments.map((p) => {
              const isIn = p.direction === 'IN';
              const isReversed = !!p.reversedOfId;

              return (
                <div
                  key={p.id}
                  className={`p-3.5 flex items-center justify-between gap-3 transition-colors ${
                    isReversed ? 'opacity-40 bg-surface-2 line-through' : 'hover:bg-surface-2'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2.5 rounded-xl shrink-0 ${
                        isIn ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                      }`}
                    >
                      {isIn ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-text truncate">
                          {p.categoryName}
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-surface-2 border border-border text-text-muted uppercase">
                          {p.mode}
                        </span>
                        {isReversed && (
                          <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-rose-500/10 text-rose-600 border border-rose-500/20 uppercase">
                            Reversed
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-text-muted truncate">
                        {p.businessDate} {p.utr ? `• UTR: ${p.utr}` : ''}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className={`text-base font-extrabold ${isIn ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {isIn ? '+' : '-'}{formatMoney(BigInt(p.amountPaise))}
                    </div>

                    {!isReversed && (
                      <button
                        onClick={() => setReversalTarget(p)}
                        title="1-Tap Reversal"
                        className="p-2 text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Entry Modal Drawer */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface w-full max-w-md rounded-2xl border border-border p-5 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-base font-bold text-text">New Cash Flow Entry</h2>
              <button onClick={() => setIsAddOpen(false)} className="p-1 rounded-lg text-text-muted hover:text-text">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-600 font-medium">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDirection('IN')}
                  className={`p-3 rounded-xl border text-sm font-bold transition-all ${
                    direction === 'IN'
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 shadow-2xs'
                      : 'bg-surface-2 border-border text-text-muted'
                  }`}
                >
                  Cash IN (+ Receipt)
                </button>
                <button
                  type="button"
                  onClick={() => setDirection('OUT')}
                  className={`p-3 rounded-xl border text-sm font-bold transition-all ${
                    direction === 'OUT'
                      ? 'bg-rose-500/10 border-rose-500 text-rose-600 shadow-2xs'
                      : 'bg-surface-2 border-border text-text-muted'
                  }`}
                >
                  Cash OUT (- Expense)
                </button>
              </div>

              <div>
                <label className="text-xs font-semibold text-text-muted block mb-1">Amount (₹)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  required
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-2 border border-border rounded-xl text-base font-bold text-text focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-text-muted block mb-1">Payment Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['CASH', 'UPI', 'BANK'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      className={`py-2 rounded-lg border text-xs font-bold ${
                        mode === m
                          ? 'bg-primary text-white border-primary'
                          : 'bg-surface-2 text-text-muted border-border'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-text-muted block mb-1">UTR / Ref Number (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 40928120391"
                  value={utr}
                  onChange={(e) => setUtr(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-2 border border-border rounded-xl text-xs text-text focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-text-muted block mb-1">Notes / Reason</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Office tea expense, Customer advance"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-2 border border-border rounded-xl text-xs text-text focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="flex-1 py-2.5 bg-surface-2 border border-border rounded-xl text-xs font-bold text-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-primary text-white font-bold text-xs rounded-xl hover:bg-primary-dark"
                >
                  {submitting ? 'Saving...' : 'Post Ledger Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reversal Confirmation Modal */}
      {reversalTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface w-full max-w-sm rounded-2xl border border-border p-5 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-text">1-Tap Reversal</h3>
            </div>

            <p className="text-xs text-text-muted">
              Per <strong className="text-text">07_EDIT_DELETE_RULES</strong>, core entries cannot be hard deleted. An offsetting reversal row will be added.
            </p>

            <form onSubmit={handleReversalSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-text-muted block mb-1">
                  Mandatory Reversal Reason
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Incorrect amount entered, Duplicate entry"
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-2 border border-border rounded-xl text-xs text-text focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReversalTarget(null)}
                  className="flex-1 py-2 bg-surface-2 border border-border rounded-xl text-xs font-bold text-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reversing}
                  className="flex-1 py-2 bg-rose-600 text-white font-bold text-xs rounded-xl hover:bg-rose-700"
                >
                  {reversing ? 'Reversing...' : 'Confirm Reversal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
