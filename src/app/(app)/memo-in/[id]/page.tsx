'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Layers,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  RotateCcw,
  ShoppingBag,
  AlertOctagon,
  Pause,
} from 'lucide-react';
import { formatWeightMg } from '@/domain/weight';

interface MemoLine {
  id: string;
  category: string;
  metal: 'GOLD' | 'SILVER';
  statedPurityPpt: number;
  testedPurityPpt: number;
  grossMg: number;
  stoneMg: number;
  netMg: number;
  touchPpt: number;
  alterPolicy: string;
  status: string;
  heldForCustomerId?: string;
}

interface MemoInDetail {
  id: string;
  shopMemoNo: string;
  wholesalerVendorId: string;
  wholesalerMemoNo?: string;
  receivedOn: string;
  returnByDate: string;
  status: string;
  lines: MemoLine[];
}

export default function MemoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const memoId = params?.id as string;

  const [memo, setMemo] = useState<MemoInDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<{
    type: 'CONVERT' | 'HOLD' | 'RETURN' | 'LOSS';
    line: MemoLine;
  } | null>(null);

  // Form states for modals
  const [retailRate, setRetailRate] = useState('9600');
  const [makingBp, setMakingBp] = useState('1200');
  const [rateMode, setRateMode] = useState<'LOCKED_AT_SALE' | 'QUEUED_FLOATING'>('LOCKED_AT_SALE');
  const [settlementRate, setSettlementRate] = useState('9400');
  const [customerId, setCustomerId] = useState('');
  const [returnReason, setReturnReason] = useState('Customer rejected or return window reached');
  const [lossRate, setLossRate] = useState('9400');
  const [lossReason, setLossReason] = useState('THEFT');
  const [actionBusy, setActionBusy] = useState(false);

  const fetchMemo = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/memo-in/${memoId}`);
      const json = await res.json();
      if (json.ok) setMemo(json.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (memoId) fetchMemo();
  }, [memoId]);

  const handleConvert = async (lineId: string) => {
    setActionBusy(true);
    try {
      const res = await fetch(`/api/v1/memo-in/${memoId}/lines/${lineId}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          retailRatePaisePerGram: Math.round(parseFloat(retailRate) * 100),
          makingPercentBp: parseInt(makingBp, 10),
          gstRateBp: 300,
          rateMode,
          settlementRatePaisePerGram:
            rateMode === 'LOCKED_AT_SALE' ? Math.round(parseFloat(settlementRate) * 100) : undefined,
          customerId: customerId || undefined,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        setActiveModal(null);
        fetchMemo();
      } else {
        alert(json.error || 'Conversion failed');
      }
    } finally {
      setActionBusy(false);
    }
  };

  const handleHold = async (lineId: string) => {
    setActionBusy(true);
    try {
      const res = await fetch(`/api/v1/memo-in/${memoId}/lines/${lineId}/hold`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customerId || undefined,
          expectedDecisionOn: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(),
        }),
      });
      const json = await res.json();
      if (json.ok) {
        setActiveModal(null);
        fetchMemo();
      } else {
        alert(json.error || 'Hold failed');
      }
    } finally {
      setActionBusy(false);
    }
  };

  const handleReturn = async (lineId: string) => {
    setActionBusy(true);
    try {
      const res = await fetch(`/api/v1/memo-in/${memoId}/lines/${lineId}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: returnReason }),
      });
      const json = await res.json();
      if (json.ok) {
        setActiveModal(null);
        fetchMemo();
      } else {
        alert(json.error || 'Return failed');
      }
    } finally {
      setActionBusy(false);
    }
  };

  const handleLoss = async (lineId: string) => {
    setActionBusy(true);
    try {
      const res = await fetch(`/api/v1/memo-in/${memoId}/lines/${lineId}/loss`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settlementRatePaisePerGram: Math.round(parseFloat(lossRate) * 100),
          reasonCode: lossReason,
          note: 'Lost memo line settled via dashboard',
        }),
      });
      const json = await res.json();
      if (json.ok) {
        setActiveModal(null);
        fetchMemo();
      } else {
        alert(json.error || 'Loss settlement failed');
      }
    } finally {
      setActionBusy(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-text-muted">Loading memo details...</div>;
  }

  if (!memo) {
    return <div className="text-center py-12 text-error">Memo not found.</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg border border-border bg-surface hover:bg-surface-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold">{memo.shopMemoNo}</h1>
              <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-primary/10 text-primary border border-primary/20">
                {memo.status}
              </span>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Wholesaler: <strong className="text-text">{memo.wholesalerVendorId}</strong> · Return
              by: {new Date(memo.returnByDate).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Lines Table */}
      <div className="p-5 rounded-2xl border border-border bg-surface shadow-2xs space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-text-muted">
          Consignment Lines ({memo.lines.length})
        </h2>

        <div className="space-y-3">
          {memo.lines.map((line) => {
            const isSettled = line.status === 'SOLD' || line.status === 'RETURNED' || line.status === 'LOST';

            return (
              <div
                key={line.id}
                className="p-4 rounded-xl border border-border bg-bg space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-text">{line.category}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-surface border border-border">
                        {line.metal} · {line.statedPurityPpt} ppt
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          line.status === 'SOLD'
                            ? 'bg-success/15 text-success'
                            : line.status === 'ON_HOLD'
                            ? 'bg-warning/15 text-warning-foreground'
                            : line.status === 'RETURNED'
                            ? 'bg-surface-2 text-text-muted'
                            : line.status === 'LOST'
                            ? 'bg-error/15 text-error'
                            : 'bg-primary/15 text-primary'
                        }`}
                      >
                        {line.status}
                      </span>
                    </div>

                    <p className="text-xs text-text-muted mt-1">
                      Gross: {formatWeightMg(line.grossMg)} · Net:{' '}
                      <strong className="text-text">{formatWeightMg(line.netMg)}</strong> · Touch:{' '}
                      <strong className="text-primary">{(line.touchPpt / 10).toFixed(1)}%</strong>
                    </p>
                  </div>

                  {!isSettled && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        onClick={() => setActiveModal({ type: 'HOLD', line })}
                        className="px-2.5 py-1 text-xs font-semibold rounded bg-surface border border-border hover:bg-surface-2 flex items-center gap-1"
                      >
                        <Pause className="w-3.5 h-3.5" /> Hold
                      </button>
                      <button
                        onClick={() => setActiveModal({ type: 'RETURN', line })}
                        className="px-2.5 py-1 text-xs font-semibold rounded bg-surface border border-border hover:bg-surface-2 flex items-center gap-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Return
                      </button>
                      <button
                        onClick={() => setActiveModal({ type: 'LOSS', line })}
                        className="px-2.5 py-1 text-xs font-semibold rounded bg-surface border border-error/30 text-error hover:bg-error/10 flex items-center gap-1"
                      >
                        <AlertOctagon className="w-3.5 h-3.5" /> Loss
                      </button>
                      <button
                        onClick={() => setActiveModal({ type: 'CONVERT', line })}
                        className="px-3 py-1 text-xs font-bold rounded bg-primary text-white hover:bg-primary/90 shadow-2xs flex items-center gap-1"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" /> Convert to Sale
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Modals */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            {activeModal.type === 'CONVERT' && (
              <>
                <h3 className="text-lg font-bold">Convert Piece to Sale (§54.2)</h3>
                <p className="text-xs text-text-muted">
                  Atomically sells the memo piece, creates Customer Invoice, and establishes
                  Wholesaler Liability.
                </p>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold mb-1">Rate Mode for Wholesaler</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="mode"
                          checked={rateMode === 'LOCKED_AT_SALE'}
                          onChange={() => setRateMode('LOCKED_AT_SALE')}
                        />
                        <span>LOCKED_AT_SALE (Fixed now)</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="mode"
                          checked={rateMode === 'QUEUED_FLOATING'}
                          onChange={() => setRateMode('QUEUED_FLOATING')}
                        />
                        <span>QUEUED_FLOATING (Settle later)</span>
                      </label>
                    </div>
                  </div>

                  {rateMode === 'LOCKED_AT_SALE' && (
                    <div>
                      <label className="block font-semibold mb-1">
                        Wholesaler Bullion Rate (₹/g)
                      </label>
                      <input
                        type="number"
                        value={settlementRate}
                        onChange={(e) => setSettlementRate(e.target.value)}
                        className="w-full px-3 py-1.5 rounded border border-border bg-bg text-text"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold mb-1">Customer Retail Rate (₹/g)</label>
                      <input
                        type="number"
                        value={retailRate}
                        onChange={(e) => setRetailRate(e.target.value)}
                        className="w-full px-3 py-1.5 rounded border border-border bg-bg text-text"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Making Charges (% bp, 1200=12%)</label>
                      <input
                        type="number"
                        value={makingBp}
                        onChange={(e) => setMakingBp(e.target.value)}
                        className="w-full px-3 py-1.5 rounded border border-border bg-bg text-text"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  <button
                    type="button"
                    disabled={actionBusy}
                    onClick={() => setActiveModal(null)}
                    className="px-4 py-1.5 rounded-lg border border-border hover:bg-surface-2 text-sm font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={actionBusy}
                    onClick={() => handleConvert(activeModal.line.id)}
                    className="px-5 py-1.5 rounded-lg bg-primary text-white font-bold hover:bg-primary/90 text-sm shadow-sm"
                  >
                    {actionBusy ? 'Processing...' : 'Complete Conversion'}
                  </button>
                </div>
              </>
            )}

            {activeModal.type === 'HOLD' && (
              <>
                <h3 className="text-lg font-bold">Place on Customer Hold</h3>
                <p className="text-xs text-text-muted">
                  Reserve this piece for customer trial or pending decision.
                </p>
                <div className="text-xs">
                  <label className="block font-semibold mb-1">Customer Name / ID (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. CUST_001 or Priya Patel"
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="w-full px-3 py-1.5 rounded border border-border bg-bg text-text"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="px-4 py-1.5 rounded-lg border border-border hover:bg-surface-2 text-sm font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={actionBusy}
                    onClick={() => handleHold(activeModal.line.id)}
                    className="px-5 py-1.5 rounded-lg bg-primary text-white font-bold hover:bg-primary/90 text-sm"
                  >
                    {actionBusy ? 'Saving...' : 'Set Hold'}
                  </button>
                </div>
              </>
            )}

            {activeModal.type === 'RETURN' && (
              <>
                <h3 className="text-lg font-bold">Return Piece to Wholesaler</h3>
                <p className="text-xs text-text-muted">
                  Mark piece as returned with return reason voucher.
                </p>
                <div className="text-xs">
                  <label className="block font-semibold mb-1">Return Reason</label>
                  <input
                    type="text"
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    className="w-full px-3 py-1.5 rounded border border-border bg-bg text-text"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="px-4 py-1.5 rounded-lg border border-border hover:bg-surface-2 text-sm font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={actionBusy}
                    onClick={() => handleReturn(activeModal.line.id)}
                    className="px-5 py-1.5 rounded-lg bg-primary text-white font-bold hover:bg-primary/90 text-sm"
                  >
                    {actionBusy ? 'Returning...' : 'Confirm Return'}
                  </button>
                </div>
              </>
            )}

            {activeModal.type === 'LOSS' && (
              <>
                <h3 className="text-lg font-bold text-error">Settle Lost Piece (§56)</h3>
                <p className="text-xs text-text-muted">
                  Create LossSettlement and vendor liability without customer sale.
                </p>
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold mb-1">Settlement Rate (₹/g)</label>
                    <input
                      type="number"
                      value={lossRate}
                      onChange={(e) => setLossRate(e.target.value)}
                      className="w-full px-3 py-1.5 rounded border border-border bg-bg text-text"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Reason Code</label>
                    <select
                      value={lossReason}
                      onChange={(e) => setLossReason(e.target.value)}
                      className="w-full px-3 py-1.5 rounded border border-border bg-bg text-text"
                    >
                      <option value="THEFT">Theft / Burglary</option>
                      <option value="MISPLACED">Misplaced in Vault</option>
                      <option value="DAMAGED">Irreparably Damaged</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="px-4 py-1.5 rounded-lg border border-border hover:bg-surface-2 text-sm font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={actionBusy}
                    onClick={() => handleLoss(activeModal.line.id)}
                    className="px-5 py-1.5 rounded-lg bg-error text-white font-bold hover:bg-error/90 text-sm"
                  >
                    {actionBusy ? 'Settling...' : 'Confirm Loss Settlement'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
