'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Plus,
  Calendar,
  Layers,
  CheckCircle2,
  RefreshCw,
  Coins,
} from 'lucide-react';

interface TouchScheduleRow {
  id: string;
  wholesalerVendorId: string;
  metal: 'GOLD' | 'SILVER';
  purityBandLabel: string;
  purityPptMin: number;
  purityPptMax: number;
  touchPptDefault: number;
  effectiveFrom: string;
  note?: string;
}

export default function TouchSchedulesPage() {
  const [schedules, setSchedules] = useState<TouchScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state
  const [vendorId, setVendorId] = useState('');
  const [metal, setMetal] = useState<'GOLD' | 'SILVER'>('GOLD');
  const [label, setLabel] = useState('18K / 750 ppt');
  const [purityMin, setPurityMin] = useState(700);
  const [purityMax, setPurityMax] = useState(780);
  const [touchDefault, setTouchDefault] = useState(830);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/touch-schedules');
      const json = await res.json();
      if (json.ok) setSchedules(json.data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/touch-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wholesalerVendorId: vendorId,
          metal,
          purityBandLabel: label,
          purityPptMin: purityMin,
          purityPptMax: purityMax,
          touchPptDefault: touchDefault,
          note: note || undefined,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        setShowAddModal(false);
        fetchSchedules();
      } else {
        alert(json.error || 'Failed to add schedule');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5">
            <Coins className="w-6 h-6 text-primary" />
            Wholesaler Touch Schedules (S-253)
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Configured purity touch bands and vendor agreed settlement percentages (D12-WHS-20..27)
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-3.5 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 text-sm font-bold shadow-2xs transition-colors flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Add Touch Rate
        </button>
      </div>

      {/* Schedules List */}
      {loading ? (
        <div className="text-center py-12 text-text-muted">Loading touch schedules...</div>
      ) : schedules.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-xl bg-surface/50">
          <Coins className="w-10 h-10 text-text-muted mx-auto mb-2 opacity-50" />
          <h3 className="font-semibold text-text">No touch schedules defined</h3>
          <p className="text-xs text-text-muted mt-1">
            Define wholesaler purity bands and agreed touch percentages.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {schedules.map((s) => (
            <div
              key={s.id}
              className="p-5 rounded-2xl border border-border bg-surface shadow-2xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-text">{s.wholesalerVendorId}</span>
                <span className="text-xs px-2 py-0.5 rounded font-bold bg-primary/10 text-primary">
                  {s.metal}
                </span>
              </div>

              <div>
                <div className="text-base font-extrabold text-primary">
                  {(s.touchPptDefault / 10).toFixed(1)}% Touch
                </div>
                <div className="text-xs text-text-muted font-medium mt-0.5">
                  Band: {s.purityBandLabel} ({s.purityPptMin}–{s.purityPptMax} ppt)
                </div>
              </div>

              <div className="text-xs text-text-muted pt-2 border-t border-border/50 flex items-center justify-between">
                <span>Effective: {new Date(s.effectiveFrom).toLocaleDateString()}</span>
                {s.note && <span className="italic truncate max-w-[120px]">{s.note}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold">Add Wholesaler Touch Rate</h3>
            <form onSubmit={handleAdd} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Wholesaler Vendor ID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VEND_SURAT_01"
                  value={vendorId}
                  onChange={(e) => setVendorId(e.target.value)}
                  className="w-full px-3 py-1.5 rounded border border-border bg-bg text-text"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Metal</label>
                  <select
                    value={metal}
                    onChange={(e) => setMetal(e.target.value as any)}
                    className="w-full px-3 py-1.5 rounded border border-border bg-bg text-text"
                  >
                    <option value="GOLD">GOLD</option>
                    <option value="SILVER">SILVER</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Band Label</label>
                  <input
                    type="text"
                    required
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    className="w-full px-3 py-1.5 rounded border border-border bg-bg text-text"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Min (ppt)</label>
                  <input
                    type="number"
                    value={purityMin}
                    onChange={(e) => setPurityMin(parseInt(e.target.value, 10))}
                    className="w-full px-2 py-1.5 rounded border border-border bg-bg text-text"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Max (ppt)</label>
                  <input
                    type="number"
                    value={purityMax}
                    onChange={(e) => setPurityMax(parseInt(e.target.value, 10))}
                    className="w-full px-2 py-1.5 rounded border border-border bg-bg text-text"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Touch (ppt)</label>
                  <input
                    type="number"
                    value={touchDefault}
                    onChange={(e) => setTouchDefault(parseInt(e.target.value, 10))}
                    className="w-full px-2 py-1.5 rounded border border-border bg-bg text-text font-bold text-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Agreed by phone on 2 Oct"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3 py-1.5 rounded border border-border bg-bg text-text"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-1.5 rounded-lg border border-border hover:bg-surface-2 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-1.5 rounded-lg bg-primary text-white font-bold hover:bg-primary/90 text-sm shadow-sm"
                >
                  {submitting ? 'Saving...' : 'Save Rate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
