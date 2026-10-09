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
  Printer
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
  huid: string | null;
  status: string;
  photoUrl: string | null;
  createdAt: string;
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [metalFilter, setMetalFilter] = useState<string>('ALL');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        search,
        metal: metalFilter === 'ALL' ? '' : metalFilter,
      });
      const res = await fetch(`/api/v1/inventory?${query.toString()}`);
      const json = await res.json();
      if (json.ok) {
        setItems(json.data);
      }
    } catch (err) {
      console.error('Fetch inventory error', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [metalFilter]);

  const totals = useMemo(() => {
    return items.reduce(
      (acc, curr) => ({
        weight: acc.weight + curr.netWeightGrams,
        labour: acc.labour + curr.makingValueRupees,
        count: acc.count + 1,
      }),
      { weight: 0, labour: 0, count: 0 }
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
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (res.ok) {
        setSelectedIds(new Set());
        fetchInventory();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-6 rounded-2xl border border-border shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-primary uppercase">Inventory Master Vault</h1>
            <p className="text-xs text-text-muted">Certified Stock Registry & Asset Tag Management</p>
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

      {/* Summary KPI Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface p-5 rounded-2xl border border-border shadow-2xs">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest block">Mass Holdings</span>
          <span className="text-2xl font-extrabold text-text mt-1 block">{totals.weight.toFixed(3)} g</span>
          <span className="text-[10px] text-primary font-semibold mt-1 block">Active Stock Weight</span>
        </div>
        <div className="bg-surface p-5 rounded-2xl border border-border shadow-2xs">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest block">Labour Investment</span>
          <span className="text-2xl font-extrabold text-emerald-600 mt-1 block">₹{totals.labour.toLocaleString('en-IN')}</span>
          <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">Wages & Crafting Paid</span>
        </div>
        <div className="bg-surface p-5 rounded-2xl border border-border shadow-2xs">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest block">Physical Assets</span>
          <span className="text-2xl font-extrabold text-primary mt-1 block">{totals.count} Items</span>
          <span className="text-[10px] text-text-muted font-semibold mt-1 block">Certified Vault Registry</span>
        </div>
      </div>

      {/* Filter & Control Bar */}
      <div className="bg-surface p-4 rounded-2xl border border-border flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-text-muted my-auto mr-1" />
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
          {selectedIds.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-500 text-white flex items-center gap-1 animate-pulse"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete Selected ({selectedIds.size})
            </button>
          )}
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Filter by Tag No, SKU or Name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-surface-2 border border-border rounded-xl text-xs font-semibold text-text outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Grid of Stock Items */}
      {loading ? (
        <div className="p-12 text-center text-xs text-text-muted">Loading inventory stock...</div>
      ) : items.length === 0 ? (
        <div className="p-16 text-center text-xs text-text-muted space-y-2 bg-surface rounded-2xl border border-border">
          <Package className="w-10 h-10 text-text-muted mx-auto opacity-40" />
          <div className="font-semibold text-sm">No stock items found</div>
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
                        {item.metal} ({item.purityPpt === 916 ? '22K' : '24K'})
                      </span>
                      <span className="text-xs font-mono font-bold text-text-muted">#{item.tagNo}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-3 border-t border-border space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-text-muted font-semibold">SKU Code</span>
                  <span className="font-extrabold text-text font-mono">{item.sku}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted font-semibold">Net Weight</span>
                  <span className="font-extrabold text-primary">{item.netWeightGrams.toFixed(3)} g</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted font-semibold">Making Charge</span>
                  <span className="font-bold text-emerald-600">₹{item.makingValueRupees.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
