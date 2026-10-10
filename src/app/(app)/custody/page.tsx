'use client';

import React, { useState, useEffect } from 'react';
import {
  Warehouse,
  ShieldCheck,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  Lock,
  MapPin,
  AlertTriangle,
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

  // Add / Edit Modal States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingLoc, setEditingLoc] = useState<StorageLocationItem | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState('VAULT');
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/locations', { credentials: 'include' });
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

  const openCreateModal = () => {
    setEditingLoc(null);
    setName('');
    setType('VAULT');
    setAddress('');
    setIsAddOpen(true);
  };

  const openEditModal = (loc: StorageLocationItem) => {
    setEditingLoc(loc);
    setName(loc.name);
    setType(loc.type);
    setAddress(loc.address || '');
    setIsAddOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      const url = editingLoc ? `/api/v1/locations/${editingLoc.id}` : '/api/v1/locations';
      const method = editingLoc ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          type,
          address: address.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!json.ok) {
        alert(json.error || 'Failed to save location');
        setSubmitting(false);
        return;
      }

      setIsAddOpen(false);
      setEditingLoc(null);
      setName('');
      setAddress('');
      fetchLocations();
    } catch (err: any) {
      alert(err.message || 'Save location error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (loc: StorageLocationItem) => {
    const confirmPrompt = loc.itemCount > 0
      ? `Location "${loc.name}" currently holds ${loc.itemCount} items in custody. Deleting it will safely archive/deactivate it. Proceed?`
      : `Are you sure you want to delete "${loc.name}"?`;

    if (!confirm(confirmPrompt)) return;

    try {
      const res = await fetch(`/api/v1/locations/${loc.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const json = await res.json();
      if (json.ok) {
        fetchLocations();
      } else {
        alert(json.error || 'Failed to delete location');
      }
    } catch (err: any) {
      alert(err.message || 'Delete error');
    }
  };

  return (
    <div className="space-y-4 pb-28">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-4 rounded-2xl border border-border shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <Warehouse className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-text">Custody & Storage Register</h1>
            <p className="text-xs text-text-muted">Manage Vaults, Safe Lockers & Counters with real-time audit logging</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchLocations}
            className="p-2.5 rounded-xl bg-surface-2 hover:bg-border text-text border border-border transition-all"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white font-bold text-xs sm:text-sm rounded-xl hover:bg-primary/90 transition-colors shadow-md active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New Vault / Locker</span>
          </button>
        </div>
      </div>

      {/* Storage Locations Grid */}
      {loading && locations.length === 0 ? (
        <div className="p-12 text-center text-xs text-text-muted">Loading storage locations...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {locations.map((loc) => (
            <div key={loc.id} className="p-4 bg-surface rounded-2xl border border-border space-y-3 hover:border-primary/50 transition-colors shadow-2xs">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 bg-surface-2 rounded-xl text-primary border border-border">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-text">{loc.name}</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-primary/10 text-primary uppercase">
                        {loc.type}
                      </span>
                      {loc.address && (
                        <span className="text-[11px] text-text-muted flex items-center gap-0.5 truncate max-w-[140px]">
                          <MapPin className="w-3 h-3 shrink-0" /> {loc.address}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(loc)}
                    className="p-1.5 text-text-muted hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                    title="Edit Vault"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(loc)}
                    className="p-1.5 text-text-muted hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors"
                    title="Delete Vault"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-border flex items-center justify-between">
                <span className="text-xs text-text-muted font-medium">Custody Inventory</span>
                <span className={`text-sm font-extrabold px-2.5 py-0.5 rounded-lg border ${
                  loc.itemCount > 0 ? 'bg-amber-500/10 text-amber-800 border-amber-500/20' : 'bg-surface-2 text-text-muted border-border'
                }`}>
                  {loc.itemCount} Items
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Location Modal Drawer */}
      {isAddOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsAddOpen(false)}
        >
          <div
            className="bg-surface w-full max-w-sm rounded-2xl border border-border p-5 space-y-4 shadow-2xl animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-base font-bold text-text">
                {editingLoc ? 'Edit Storage Location' : 'New Storage Location'}
              </h2>
              <button onClick={() => setIsAddOpen(false)} className="p-1 rounded-lg text-text-muted hover:text-text">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-text-muted block mb-1">Location / Vault Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Main Safe Locker 2"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-2 border border-border rounded-xl text-xs text-text font-semibold focus:outline-hidden focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-text-muted block mb-1">Storage Type *</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-2 border border-border rounded-xl text-xs text-text font-semibold focus:outline-hidden focus:border-primary"
                >
                  <option value="VAULT">Vault / Safe Locker</option>
                  <option value="SHOP_DRAWER">Shop Counter Drawer</option>
                  <option value="HOME">Home Locker</option>
                  <option value="TRANSIT">In Transit</option>
                  <option value="VENDOR">With Financier / Vendor</option>
                  <option value="STAFF">With Staff / Custodian</option>
                  <option value="OTHER">Other Custom Location</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-text-muted block mb-1">Specific Compartment / Shelf (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Shelf B, Locker Box 4"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-2 border border-border rounded-xl text-xs text-text font-semibold focus:outline-hidden focus:border-primary"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="flex-1 py-2 bg-surface-2 border border-border rounded-xl text-xs font-bold text-text hover:bg-border transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 bg-primary text-white font-bold text-xs rounded-xl hover:bg-primary/90 transition-colors"
                >
                  {submitting ? 'Saving...' : editingLoc ? 'Update Vault' : 'Create Vault'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
