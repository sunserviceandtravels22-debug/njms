'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Barcode as BarcodeIcon,
  Trash2,
  Edit2,
  BookOpen,
  Layers,
  Printer,
  CheckCircle2,
  AlertTriangle,
  X
} from 'lucide-react';
import Link from 'next/link';

interface InventoryItemData {
  id: string;
  tagNo: string;
  sku: string;
  name: string;
  metal: string;
  purityPpt: number;
  category: string;
  grossWeightGrams: number;
  stoneWeightGrams: number;
  netWeightGrams: number;
  makingType: string;
  makingValueRupees: number;
  costRupees?: number;
  huid: string | null;
  status: string;
  photoUrl: string | null;
  createdAt: string;
}

const purityLabel = (ppt: number) => {
  if (ppt >= 990) return '24K / Fine';
  if (ppt >= 910) return '22K';
  if (ppt >= 740) return '18K';
  if (ppt >= 580) return '14K';
  if (ppt >= 920) return '925 Silver';
  return `${(ppt / 10).toFixed(1)}%`;
};

const statusColors: Record<string, string> = {
  IN_STOCK: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  SOLD: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
  ON_HOLD: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  RETURNED: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  WITH_KARIGAR: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  DAMAGED: 'bg-stone-500/10 text-stone-500 border-stone-500/20',
};

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [metalFilter, setMetalFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionMsg, setActionMsg] = useState<{ text: string; error?: boolean } | null>(null);

  // Edit Modal State
  const [editingItem, setEditingItem] = useState<InventoryItemData | null>(null);
  const [editForm, setEditForm] = useState<Partial<InventoryItemData>>({});
  const [editSubmitting, setEditSubmitting] = useState(false);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        search,
        metal: metalFilter === 'ALL' ? '' : metalFilter,
        status: statusFilter === 'ALL' ? '' : statusFilter,
        limit: '100',
      });
      const res = await fetch(`/api/v1/inventory?${query.toString()}`, { credentials: 'include' });
      const json = await res.json();
      if (json.ok) {
        const list = Array.isArray(json.data?.items) ? json.data.items : Array.isArray(json.data) ? json.data : [];
        setItems(list);
      }
    } catch (err) {
      console.error('Fetch inventory error', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [metalFilter, statusFilter]);

  const totals = useMemo(() => {
    return items.reduce(
      (acc, curr) => ({
        weight: acc.weight + (curr.netWeightGrams || 0),
        labour: acc.labour + (curr.makingValueRupees || 0),
        inStock: acc.inStock + (curr.status === 'IN_STOCK' ? 1 : 0),
        count: acc.count + 1,
      }),
      { weight: 0, labour: 0, count: 0, inStock: 0 }
    );
  }, [items]);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Authorize permanent deletion of ${selectedIds.size} selected assets?`)) return;
    try {
      const res = await fetch('/api/v1/inventory/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (res.ok) {
        setSelectedIds(new Set());
        fetchInventory();
        setActionMsg({ text: 'Selected items deleted successfully.' });
      }
    } catch (e) {
      setActionMsg({ text: 'Delete failed', error: true });
    }
  };

  const openEditModal = (item: InventoryItemData) => {
    setEditingItem(item);
    setEditForm({
      name: item.name,
      sku: item.sku,
      category: item.category,
      metal: item.metal,
      purityPpt: item.purityPpt,
      grossWeightGrams: item.grossWeightGrams,
      stoneWeightGrams: item.stoneWeightGrams,
      netWeightGrams: item.netWeightGrams,
      makingValueRupees: item.makingValueRupees,
      costRupees: item.costRupees || 0,
      huid: item.huid || '',
      status: item.status,
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setEditSubmitting(true);
    try {
      const res = await fetch(`/api/v1/inventory/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (data.ok) {
        setActionMsg({ text: `Item "${editingItem.tagNo}" updated successfully` });
        setEditingItem(null);
        fetchInventory();
      } else {
        setActionMsg({ text: data.error || 'Update failed', error: true });
      }
    } catch (err: any) {
      setActionMsg({ text: err.message || 'Update error', error: true });
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteSingle = async (item: InventoryItemData) => {
    if (!confirm(`Delete item ${item.tagNo} — ${item.name}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/v1/inventory/${item.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok) {
        setActionMsg({ text: `Item ${item.tagNo} deleted.` });
        fetchInventory();
      } else {
        setActionMsg({ text: data.error || 'Delete failed', error: true });
      }
    } catch (err: any) {
      setActionMsg({ text: err.message || 'Delete error', error: true });
    }
  };

  return (
    <div className="space-y-6 pb-28">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-6 rounded-2xl border border-border shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-primary uppercase">Inventory Master Vault</h1>
            <p className="text-xs text-text-muted">Certified Stock Registry & Asset Tag Management • Edit any item inline</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/inventory/sku"
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-surface-2 hover:bg-border text-text font-bold text-xs rounded-xl transition-all"
          >
            <BookOpen className="w-4 h-4 text-primary" />
            <span>SKU Catalog</span>
          </Link>
          <Link
            href="/barcode"
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-surface-2 hover:bg-border text-text font-bold text-xs rounded-xl transition-all"
          >
            <Printer className="w-4 h-4 text-primary" />
            <span>Print Tags</span>
          </Link>
          <Link
            href="/inventory/new"
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-white font-bold text-xs rounded-xl hover:bg-primary/90 transition-all shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Ingest New Stock</span>
          </Link>
        </div>
      </div>

      {actionMsg && (
        <div className={`p-3.5 rounded-xl border flex items-center justify-between text-sm ${actionMsg.error ? 'bg-rose-950/30 border-rose-800/50 text-rose-300' : 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300'}`}>
          <div className="flex items-center gap-2">
            {actionMsg.error ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            <span className="text-xs font-medium">{actionMsg.text}</span>
          </div>
          <button onClick={() => setActionMsg(null)} className="text-xs underline opacity-70 hover:opacity-100">dismiss</button>
        </div>
      )}

      {/* Summary KPI Matrix */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-surface p-5 rounded-2xl border border-border shadow-2xs">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest block">Stock Weight</span>
          <span className="text-2xl font-extrabold text-text mt-1 block">{totals.weight.toFixed(2)} g</span>
          <span className="text-[10px] text-primary font-semibold mt-1 block">All visible items</span>
        </div>
        <div className="bg-surface p-5 rounded-2xl border border-border shadow-2xs">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest block">Labour Invested</span>
          <span className="text-2xl font-extrabold text-emerald-600 mt-1 block">₹{totals.labour.toLocaleString('en-IN')}</span>
          <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">Making charges</span>
        </div>
        <div className="bg-surface p-5 rounded-2xl border border-border shadow-2xs">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest block">IN STOCK</span>
          <span className="text-2xl font-extrabold text-primary mt-1 block">{totals.inStock} Items</span>
          <span className="text-[10px] text-text-muted font-semibold mt-1 block">Available to sell</span>
        </div>
        <div className="bg-surface p-5 rounded-2xl border border-border shadow-2xs">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest block">Total Assets</span>
          <span className="text-2xl font-extrabold text-text mt-1 block">{totals.count}</span>
          <span className="text-[10px] text-text-muted font-semibold mt-1 block">All registry records</span>
        </div>
      </div>

      {/* Filter & Control Bar */}
      <div className="bg-surface p-4 rounded-2xl border border-border flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex flex-wrap gap-2 w-full sm:w-auto items-center">
          <Filter className="w-4 h-4 text-text-muted" />
          {(['ALL', 'GOLD', 'SILVER'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMetalFilter(m)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                metalFilter === m
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-surface-2 text-text-muted hover:text-text hover:bg-border'
              }`}
            >
              {m === 'ALL' ? 'All Metal' : m}
            </button>
          ))}
          {['IN_STOCK', 'SOLD', 'ON_HOLD'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? 'ALL' : s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors border ${
                statusFilter === s
                  ? 'bg-amber-500 text-stone-950 border-amber-500'
                  : 'bg-surface-2 text-text-muted hover:text-text border-border'
              }`}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
          {selectedIds.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-500 text-white flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete ({selectedIds.size})
            </button>
          )}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); fetchInventory(); }} className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Filter by Tag No, SKU or Name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-surface-2 border border-border rounded-xl text-xs font-semibold text-text outline-none focus:border-primary"
          />
        </form>
      </div>

      {/* Grid of Stock Items */}
      {loading ? (
        <div className="p-12 text-center text-xs text-text-muted flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-primary" />
          Loading inventory stock...
        </div>
      ) : items.length === 0 ? (
        <div className="p-16 text-center text-xs text-text-muted space-y-2 bg-surface rounded-2xl border border-border">
          <Package className="w-10 h-10 text-text-muted mx-auto opacity-40" />
          <div className="font-semibold text-sm">No stock items found</div>
          <p>Try changing filters or add new stock.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className={`p-5 bg-surface rounded-2xl border transition-all ${
                selectedIds.has(item.id) ? 'border-primary bg-primary/5 shadow-xs' : 'border-border hover:border-primary/40'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.id)}
                    onChange={() => toggleSelect(item.id)}
                    className="w-4 h-4 accent-primary rounded cursor-pointer"
                  />
                  <div>
                    <span className="font-extrabold text-text text-base">{item.name}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-primary/10 text-primary uppercase">
                        {item.metal} {purityLabel(item.purityPpt)}
                      </span>
                      <span className="text-xs font-mono font-bold text-text-muted">#{item.tagNo}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => openEditModal(item)}
                    title="Edit Item"
                    className="p-1.5 text-text-muted hover:text-primary rounded-lg hover:bg-primary/10 transition"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteSingle(item)}
                    title="Delete Item"
                    className="p-1.5 text-text-muted hover:text-rose-500 rounded-lg hover:bg-rose-500/10 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="pt-4 mt-3 border-t border-border space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-text-muted font-semibold">SKU</span>
                  <span className="font-extrabold text-text font-mono">{item.sku}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted font-semibold">Net Weight</span>
                  <span className="font-extrabold text-primary">{(item.netWeightGrams || 0).toFixed(3)} g</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted font-semibold">Category</span>
                  <span className="font-semibold text-text">{item.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted font-semibold">Making Charge</span>
                  <span className="font-bold text-emerald-600">₹{(item.makingValueRupees || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span
                    className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${statusColors[item.status] || 'bg-stone-500/10 text-stone-500 border-stone-500/20'}`}
                  >
                    {item.status.replace('_', ' ')}
                  </span>
                  {item.huid && (
                    <span className="text-[10px] text-text-muted font-mono">HUID: {item.huid}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div>
                <h3 className="text-base font-bold text-text">Edit Item — {editingItem.tagNo}</h3>
                <p className="text-xs text-text-muted mt-0.5">All fields are editable. Changes are logged to audit trail.</p>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1.5 text-text-muted hover:text-text rounded-lg hover:bg-surface-2"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-text-muted block mb-1">Item Name</label>
                  <input
                    type="text"
                    value={editForm.name || ''}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full p-2.5 bg-surface-2 border border-border rounded-xl text-xs font-semibold text-text outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-text-muted block mb-1">SKU Code</label>
                  <input
                    type="text"
                    value={editForm.sku || ''}
                    onChange={(e) => setEditForm({ ...editForm, sku: e.target.value })}
                    className="w-full p-2.5 bg-surface-2 border border-border rounded-xl text-xs font-semibold text-text outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-text-muted block mb-1">Category</label>
                  <input
                    type="text"
                    value={editForm.category || ''}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    list="edit-category-list"
                    className="w-full p-2.5 bg-surface-2 border border-border rounded-xl text-xs font-semibold text-text outline-none focus:border-primary"
                  />
                  <datalist id="edit-category-list">
                    {['Ring', 'Chain', 'Bangle', 'Necklace', 'Earring', 'Coin', 'Payal', 'Mangalsutra'].map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="text-xs font-bold text-text-muted block mb-1">Status</label>
                  <select
                    value={editForm.status || ''}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full p-2.5 bg-surface-2 border border-border rounded-xl text-xs font-bold text-text cursor-pointer"
                  >
                    <option value="IN_STOCK">IN_STOCK</option>
                    <option value="ON_HOLD">ON_HOLD</option>
                    <option value="SOLD">SOLD</option>
                    <option value="RETURNED">RETURNED</option>
                    <option value="WITH_KARIGAR">WITH_KARIGAR</option>
                    <option value="DAMAGED">DAMAGED</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-text-muted block mb-1">Metal</label>
                  <select
                    value={editForm.metal || 'GOLD'}
                    onChange={(e) => setEditForm({ ...editForm, metal: e.target.value })}
                    className="w-full p-2.5 bg-surface-2 border border-border rounded-xl text-xs font-bold text-text"
                  >
                    <option value="GOLD">GOLD</option>
                    <option value="SILVER">SILVER</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-text-muted block mb-1">Purity (ppt, 916=22K)</label>
                  <input
                    type="number"
                    value={editForm.purityPpt || 916}
                    onChange={(e) => setEditForm({ ...editForm, purityPpt: parseInt(e.target.value) || 916 })}
                    className="w-full p-2.5 bg-surface-2 border border-border rounded-xl text-xs font-bold text-text font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-text-muted block mb-1">Gross Wt (g)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={editForm.grossWeightGrams || 0}
                    onChange={(e) => {
                      const g = parseFloat(e.target.value) || 0;
                      const s = parseFloat(String(editForm.stoneWeightGrams)) || 0;
                      setEditForm({ ...editForm, grossWeightGrams: g, netWeightGrams: Math.max(0, g - s) });
                    }}
                    className="w-full p-2.5 bg-surface-2 border border-border rounded-xl text-xs font-bold text-text font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-text-muted block mb-1">Stone Wt (g)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={editForm.stoneWeightGrams || 0}
                    onChange={(e) => {
                      const s = parseFloat(e.target.value) || 0;
                      const g = parseFloat(String(editForm.grossWeightGrams)) || 0;
                      setEditForm({ ...editForm, stoneWeightGrams: s, netWeightGrams: Math.max(0, g - s) });
                    }}
                    className="w-full p-2.5 bg-surface-2 border border-border rounded-xl text-xs font-bold text-text font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-text-muted block mb-1">Net Wt (g)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={editForm.netWeightGrams || 0}
                    readOnly
                    className="w-full p-2.5 bg-surface-2 border border-border rounded-xl text-xs font-extrabold text-primary font-mono opacity-80"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-text-muted block mb-1">Making Charge (₹)</label>
                  <input
                    type="number"
                    value={editForm.makingValueRupees || 0}
                    onChange={(e) => setEditForm({ ...editForm, makingValueRupees: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-surface-2 border border-border rounded-xl text-xs font-bold text-text font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-text-muted block mb-1">Cost Basis (₹)</label>
                  <input
                    type="number"
                    value={editForm.costRupees || 0}
                    onChange={(e) => setEditForm({ ...editForm, costRupees: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-surface-2 border border-border rounded-xl text-xs font-bold text-text font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-text-muted block mb-1">HUID Number</label>
                <input
                  type="text"
                  value={editForm.huid || ''}
                  onChange={(e) => setEditForm({ ...editForm, huid: e.target.value })}
                  placeholder="HUID (optional)"
                  className="w-full p-2.5 bg-surface-2 border border-border rounded-xl text-xs font-mono text-text outline-none focus:border-primary"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="flex-1 py-2.5 bg-surface-2 hover:bg-border text-text rounded-xl font-semibold text-xs transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="flex-1 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                >
                  {editSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
