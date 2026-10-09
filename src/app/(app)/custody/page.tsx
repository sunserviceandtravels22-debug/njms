'use client';

import React, { useState, useEffect } from 'react';
import {
  Warehouse,
  ShieldCheck,
  Plus,
  RefreshCw,
  ArrowRightLeft,
  X,
  CheckCircle2,
  Building2,
  Lock,
} from 'lucide-react';

interface StorageLocationItem {
  id: string;
  name: string;
  type: string;
  active: boolean;
  address: string | null;
  requiresPinIn: boolean;
  requiresPinOut: boolean;
  itemCount: number;
}

export default function CustodyPage() {
  const [locations, setLocations] = useState<StorageLocationItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Location Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('VAULT');
  const [submitting, setSubmitting] = useState(false);

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/locations');
      const json = await res.json();
      if (json.ok) {
        setLocations(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch storage locations', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), type }),
      });

      const json = await res.json();
      if (!json.ok) {
        alert(json.error || 'Failed to create location');
        setSubmitting(false);
        return;
      }

      setIsAddOpen(false);
      setName('');
      fetchLocations();
    } catch (err: any) {
      alert(err.message || 'Create location error');
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
            <Warehouse className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-text">Custody & Storage Register</h1>
            <p className="text-xs text-text-muted">Track Girvi gold locations (Shop Drawer, Vault, Home, Financier)</p>
          </div>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary-dark transition-colors shadow-md active:scale-95"
        >
          <Plus className="w-5 h-5" />
          <span>New Vault / Location</span>
        </button>
      </div>

      {/* Storage Locations Grid */}
      {loading ? (
        <div className="p-8 text-center text-xs text-text-muted">Loading locations...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {locations.map((loc) => (
            <div key={loc.id} className="p-4 bg-surface rounded-2xl border border-border space-y-3 hover:border-primary/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-surface-2 rounded-xl text-primary border border-border">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-text">{loc.name}</h3>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-primary/10 text-primary uppercase">
                      {loc.type}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-border flex items-center justify-between">
                <span className="text-xs text-text-muted font-medium">Stored Items</span>
                <span className="text-base font-black text-text">{loc.itemCount} Items</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Location Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface w-full max-w-sm rounded-2xl border border-border p-5 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-base font-bold text-text">New Storage Location</h2>
              <button onClick={() => setIsAddOpen(false)} className="p-1 rounded-lg text-text-muted hover:text-text">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-text-muted block mb-1">Location Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Main Safe Locker 2"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-2 border border-border rounded-xl text-xs text-text font-semibold focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-text-muted block mb-1">Location Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-2 border border-border rounded-xl text-xs text-text font-semibold focus:outline-none focus:border-primary"
                >
                  <option value="VAULT">Vault / Safe Locker</option>
                  <option value="SHOP_DRAWER">Shop Counter Drawer</option>
                  <option value="HOME">Home Locker</option>
                  <option value="TRANSIT">In Transit</option>
                  <option value="VENDOR">With Financier / Vendor</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="flex-1 py-2 bg-surface-2 border border-border rounded-xl text-xs font-bold text-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 bg-primary text-white font-bold text-xs rounded-xl hover:bg-primary-dark"
                >
                  {submitting ? 'Creating...' : 'Create Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
