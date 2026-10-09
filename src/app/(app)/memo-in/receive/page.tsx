'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Trash2,
  Calendar,
  Layers,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';

interface LineItemForm {
  category: string;
  metal: 'GOLD' | 'SILVER';
  statedPurityPpt: number;
  testedPurityPpt: number;
  grossMg: number;
  stoneMg: number;
  netMg: number;
  touchPpt: number;
  alterPolicy: 'ALTER_NONE' | 'ALTER_MINOR' | 'ALTER_FREE';
}

export default function ReceiveMemoInPage() {
  const router = useRouter();
  const [vendorId, setVendorId] = useState('');
  const [vendorMemoNo, setVendorMemoNo] = useState('');
  const [returnByDays, setReturnByDays] = useState(15);
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineItemForm[]>([
    {
      category: 'Bangle',
      metal: 'GOLD',
      statedPurityPpt: 750,
      testedPurityPpt: 750,
      grossMg: 45000,
      stoneMg: 1500,
      netMg: 43500,
      touchPpt: 830,
      alterPolicy: 'ALTER_NONE',
    },
  ]);
  const [submitting, setSubmitting] = useState(false);

  const addLine = () => {
    setLines([
      ...lines,
      {
        category: 'Ring',
        metal: 'GOLD',
        statedPurityPpt: 916,
        testedPurityPpt: 916,
        grossMg: 6000,
        stoneMg: 0,
        netMg: 6000,
        touchPpt: 920,
        alterPolicy: 'ALTER_NONE',
      },
    ]);
  };

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, updates: Partial<LineItemForm>) => {
    const next = [...lines];
    next[index] = { ...next[index], ...updates };
    // Auto-update netMg if gross or stone changes
    if ('grossMg' in updates || 'stoneMg' in updates) {
      next[index].netMg = Math.max(0, next[index].grossMg - next[index].stoneMg);
    }
    setLines(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorId) {
      alert('Please enter or select a wholesaler');
      return;
    }
    if (lines.length === 0) {
      alert('Please add at least one item line');
      return;
    }

    setSubmitting(true);
    try {
      const returnByDate = new Date(Date.now() + returnByDays * 24 * 3600 * 1000).toISOString();
      const res = await fetch('/api/v1/memo-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wholesalerVendorId: vendorId,
          wholesalerMemoNo: vendorMemoNo || undefined,
          returnByDate,
          notes: notes || undefined,
          lines,
        }),
      });

      const json = await res.json();
      if (json.ok) {
        router.push('/memo-in');
      } else {
        alert(json.error || 'Failed to receive memo');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 rounded-lg border border-border bg-surface hover:bg-surface-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold">Receive Inward Wholesaler Memo</h1>
            <p className="text-xs text-text-muted">
              Add consigned pieces on approval and set wholesaler touch schedule (S-251)
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="px-5 py-2 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 shadow-sm transition-colors text-sm"
        >
          {submitting ? 'Receiving...' : 'Confirm Receipt'}
        </button>
      </div>

      {/* Wholesaler Details Card */}
      <div className="p-5 rounded-2xl border border-border bg-surface shadow-2xs space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-text-muted">
          1. Consignment Metadata
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1">Wholesaler Vendor ID / Name</label>
            <input
              type="text"
              required
              placeholder="e.g. VEND_SURAT_01"
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-lg border border-border bg-bg text-text"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Wholesaler Memo Ref No.</label>
            <input
              type="text"
              placeholder="e.g. WH-8921"
              value={vendorMemoNo}
              onChange={(e) => setVendorMemoNo(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-lg border border-border bg-bg text-text"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Return Window (Days)</label>
            <input
              type="number"
              min={1}
              max={90}
              value={returnByDays}
              onChange={(e) => setReturnByDays(parseInt(e.target.value, 10))}
              className="w-full text-sm px-3 py-2 rounded-lg border border-border bg-bg text-text"
            />
          </div>
        </div>
      </div>

      {/* Item Lines Card */}
      <div className="p-5 rounded-2xl border border-border bg-surface shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-text-muted">
            2. Received Items ({lines.length})
          </h2>
          <button
            type="button"
            onClick={addLine}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Piece
          </button>
        </div>

        <div className="space-y-4">
          {lines.map((l, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl border border-border bg-bg space-y-3 relative group"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-primary">Item #{idx + 1}</span>
                {lines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLine(idx)}
                    className="p-1 text-text-muted hover:text-error rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block font-medium mb-1">Category</label>
                  <input
                    type="text"
                    value={l.category}
                    onChange={(e) => updateLine(idx, { category: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded border border-border bg-surface text-text"
                  />
                </div>

                <div>
                  <label className="block font-medium mb-1">Metal</label>
                  <select
                    value={l.metal}
                    onChange={(e) => updateLine(idx, { metal: e.target.value as any })}
                    className="w-full px-2.5 py-1.5 rounded border border-border bg-surface text-text"
                  >
                    <option value="GOLD">Gold</option>
                    <option value="SILVER">Silver</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium mb-1">Purity (ppt)</label>
                  <input
                    type="number"
                    value={l.statedPurityPpt}
                    onChange={(e) =>
                      updateLine(idx, { statedPurityPpt: parseInt(e.target.value, 10) })
                    }
                    className="w-full px-2.5 py-1.5 rounded border border-border bg-surface text-text"
                  />
                </div>

                <div>
                  <label className="block font-medium mb-1">Touch % (e.g. 830 = 83%)</label>
                  <input
                    type="number"
                    value={l.touchPpt}
                    onChange={(e) => updateLine(idx, { touchPpt: parseInt(e.target.value, 10) })}
                    className="w-full px-2.5 py-1.5 rounded border border-border bg-surface text-text font-bold text-primary"
                  />
                </div>

                <div>
                  <label className="block font-medium mb-1">Gross Wt (mg)</label>
                  <input
                    type="number"
                    value={l.grossMg}
                    onChange={(e) => updateLine(idx, { grossMg: parseInt(e.target.value, 10) })}
                    className="w-full px-2.5 py-1.5 rounded border border-border bg-surface text-text"
                  />
                </div>

                <div>
                  <label className="block font-medium mb-1">Stone Wt (mg)</label>
                  <input
                    type="number"
                    value={l.stoneMg}
                    onChange={(e) => updateLine(idx, { stoneMg: parseInt(e.target.value, 10) })}
                    className="w-full px-2.5 py-1.5 rounded border border-border bg-surface text-text"
                  />
                </div>

                <div>
                  <label className="block font-medium mb-1">Net Wt (mg)</label>
                  <input
                    type="number"
                    readOnly
                    value={l.netMg}
                    className="w-full px-2.5 py-1.5 rounded border border-border bg-surface-2 text-text font-bold"
                  />
                </div>

                <div>
                  <label className="block font-medium mb-1">Alter Policy</label>
                  <select
                    value={l.alterPolicy}
                    onChange={(e) => updateLine(idx, { alterPolicy: e.target.value as any })}
                    className="w-full px-2.5 py-1.5 rounded border border-border bg-surface text-text"
                  >
                    <option value="ALTER_NONE">None (Strict)</option>
                    <option value="ALTER_MINOR">Minor (Size only)</option>
                    <option value="ALTER_FREE">Free</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </form>
  );
}
