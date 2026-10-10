'use client';

import React, { useState, useEffect } from 'react';
import {
  Clock,
  Layers,
  Coins,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { formatMoney } from '@/domain/money';
import { formatWeightMg } from '@/domain/weight';

interface QueuedLot {
  id: string;
  vendorId: string;
  totalFineMg: number;
  openFineMg: number;
  rateMode: string;
  status: string;
  queuedAt?: string;
  provisionalRatePaise: string;
  provisionalValuePaise: string;
}

export default function SettlementQueuePage() {
  const [lots, setLots] = useState<QueuedLot[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [settlementRatePaise, setSettlementRatePaise] = useState<number>(750000); // Default ₹7,500/g in paise
  const [loading, setLoading] = useState(true);
  const [settling, setSettling] = useState(false);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/settlement-queue', { credentials: 'include' });
      const json = await res.json();
      if (json.ok) setLots(json.data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === lots.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(lots.map((l) => l.id)));
    }
  };

  const selectedLots = lots.filter((l) => selectedIds.has(l.id));
  const selectedFineMg = selectedLots.reduce((acc, l) => acc + l.totalFineMg, 0);

  // Live recalculated payable
  const calculatedPayablePaise =
    (BigInt(selectedFineMg) * BigInt(settlementRatePaise)) / 1000n;

  const handleSettle = async () => {
    if (selectedIds.size === 0) return;
    setSettling(true);
    try {
      const res = await fetch('/api/v1/settlement-queue/settle', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lotIds: Array.from(selectedIds),
          settlementRatePaisePerGram: settlementRatePaise,
          reason: 'Bulk settled via S-254 Settlement Queue',
          overrideVarianceWarning: true,
        }),
      });

      const json = await res.json();
      if (json.ok) {
        setSelectedIds(new Set());
        fetchQueue();
      } else {
        alert(json.error || 'Failed to settle queue');
      }
    } finally {
      setSettling(false);
    }
  };

  return (
    <div className="space-y-6 pb-28 lg:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5">
            <Clock className="w-6 h-6 text-primary" />
            Wholesaler Settlement Queue (S-254)
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Bulk-settle floating rate purchases (QUEUED_FLOATING) and post to vendor ledger
          </p>
        </div>

        <button
          onClick={fetchQueue}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-2 text-sm font-medium transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Settlement Action Bar */}
      {selectedIds.size > 0 && (
        <div className="p-4 rounded-2xl bg-surface border border-primary/40 shadow-lg flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-sm font-bold text-primary flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              {selectedIds.size} lots selected ({formatWeightMg(selectedFineMg)} fine metal)
            </div>
            <div className="text-xs text-text-muted">
              Live Total Payable:{' '}
              <span className="font-extrabold text-text text-sm">
                {formatMoney(calculatedPayablePaise)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-text-muted mb-0.5">
                Settlement Bullion Rate (₹/g)
              </label>
              <input
                type="number"
                value={settlementRatePaise / 100}
                onChange={(e) => setSettlementRatePaise(Math.round(parseFloat(e.target.value || '0') * 100))}
                className="w-32 px-2.5 py-1.5 rounded-lg border border-border bg-bg text-sm font-bold text-text"
              />
            </div>

            <button
              onClick={handleSettle}
              disabled={settling}
              className="px-5 py-2 mt-3.5 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 shadow-sm transition-colors text-sm"
            >
              {settling ? 'Settling...' : 'Confirm & Settle'}
            </button>
          </div>
        </div>
      )}

      {/* Queue Table */}
      {loading ? (
        <div className="text-center py-12 text-text-muted">Loading queued lots...</div>
      ) : lots.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-xl bg-surface/50">
          <CheckCircle2 className="w-10 h-10 text-success mx-auto mb-2 opacity-80" />
          <h3 className="font-semibold text-text">Settlement queue is clear</h3>
          <p className="text-xs text-text-muted mt-1">
            All floating-rate purchases have been settled at locked rates.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-2 text-xs text-text-muted font-semibold">
            <button
              onClick={handleSelectAll}
              className="hover:text-primary transition-colors underline"
            >
              {selectedIds.size === lots.length ? 'Deselect All' : 'Select All'}
            </button>
            <span>{lots.length} lots awaiting rate fix</span>
          </div>

          {lots.map((lot) => {
            const isSelected = selectedIds.has(lot.id);
            return (
              <div
                key={lot.id}
                onClick={() => toggleSelect(lot.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                  isSelected
                    ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                    : 'border-border bg-surface hover:border-border-hover'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="w-5 h-5 rounded border-border text-primary"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-text">Lot #{lot.id.slice(-6)}</span>
                      <span className="text-xs text-text-muted">Vendor: {lot.vendorId}</span>
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">
                      Queued:{' '}
                      {lot.queuedAt ? new Date(lot.queuedAt).toLocaleDateString() : 'N/A'} · Pure
                      Fine Weight: <strong>{formatWeightMg(lot.totalFineMg)}</strong>
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-warning/15 text-warning-foreground border border-warning/30">
                    FLOATING RATE
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
