'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Edit2, Trash2, CheckCircle2, XCircle, ArrowLeft, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

interface SKUMasterItem {
  skuCode: string;
  metalType: 'Gold' | 'Silver';
  category: string;
  description: string;
  defaultTunch: number;
  defaultPurityStandard: string;
  minStockLevel: number;
  active: boolean;
}

export default function SKUMasterPage() {
  const [skus, setSkus] = useState<SKUMasterItem[]>([]);
  const [filterMetal, setFilterMetal] = useState<'All' | 'Gold' | 'Silver'>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSku, setEditingSku] = useState<SKUMasterItem | null>(null);

  const [formData, setFormData] = useState({
    skuCode: '',
    metalType: 'Gold' as 'Gold' | 'Silver',
    category: 'Ring',
    description: '',
    defaultTunch: 91.6,
    minStockLevel: 5,
    active: true,
  });

  const categories = ['Ring', 'Chain', 'Bangle', 'Necklace', 'Earring', 'Coin', 'Payal', 'Other'];

  const loadSKUs = async () => {
    try {
      const res = await fetch('/api/v1/inventory/sku');
      if (res.ok) {
        const data = await res.json();
        if (data.ok && Array.isArray(data.data)) {
          setSkus(data.data);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadSKUs();
  }, []);

  const filteredSkus = useMemo(() => {
    return skus.filter((s) => {
      const matchesMetal = filterMetal === 'All' || s.metalType === filterMetal;
      const matchesSearch =
        s.skuCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.category.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesMetal && matchesSearch;
    });
  }, [skus, filterMetal, searchTerm]);

  const openCreateModal = () => {
    setEditingSku(null);
    setFormData({
      skuCode: '',
      metalType: 'Gold',
      category: 'Ring',
      description: '',
      defaultTunch: 91.6,
      minStockLevel: 5,
      active: true,
    });
    setShowModal(true);
  };

  const openEditModal = (sku: SKUMasterItem) => {
    setEditingSku(sku);
    setFormData({
      skuCode: sku.skuCode,
      metalType: sku.metalType,
      category: sku.category,
      description: sku.description || '',
      defaultTunch: sku.defaultTunch,
      minStockLevel: sku.minStockLevel,
      active: sku.active,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.skuCode) return;

    try {
      const res = await fetch('/api/v1/inventory/sku', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        loadSKUs();
        setShowModal(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (skuCode: string) => {
    if (!confirm(`Are you sure you want to delete protocol ${skuCode}?`)) return;

    try {
      const res = await fetch(`/api/v1/inventory/sku?skuCode=${encodeURIComponent(skuCode)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        loadSKUs();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface border border-border p-6 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3">
          <Link href="/inventory" className="p-2 bg-surface-2 rounded-xl border border-border hover:bg-border text-text transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-primary tracking-tight uppercase">Protocol SKU Catalog</h1>
            <p className="text-xs text-text-muted">Master Registry & Minimum Safety Floor Benchmarks</p>
          </div>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-xs font-bold text-white shadow-md transition-all"
        >
          <Plus className="w-4 h-4" /> Create New Protocol
        </button>
      </div>

      {/* Control Bar */}
      <div className="bg-surface p-4 rounded-2xl border border-border flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex gap-2 w-full sm:w-auto">
          {(['All', 'Gold', 'Silver'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setFilterMetal(m)}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                filterMetal === m
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-surface-2 text-text-muted hover:text-text hover:bg-border'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search SKU Code or Category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-surface-2 border border-border rounded-xl text-xs font-semibold text-text outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-2xl border border-border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead className="bg-surface-2 border-b border-border text-xs font-bold text-text-muted uppercase">
              <tr>
                <th className="px-6 py-4">Protocol SKU</th>
                <th className="px-6 py-4">Metal & Category</th>
                <th className="px-6 py-4 text-center">Default Tunch</th>
                <th className="px-6 py-4 text-center">Safety Floor</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {filteredSkus.map((item) => (
                <tr key={item.skuCode} className="hover:bg-surface-2 transition-colors">
                  <td className="px-6 py-4 font-extrabold text-primary font-mono tracking-tight">{item.skuCode}</td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 bg-surface-2 border border-border rounded-lg text-xs font-semibold text-text">
                      {item.metalType} • {item.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center font-bold text-text">{item.defaultTunch}%</td>
                  <td className="px-6 py-4 text-center font-bold text-amber-600">{item.minStockLevel} Units</td>
                  <td className="px-6 py-4 text-center">
                    {item.active ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-500/10 text-emerald-600 rounded-full text-xs font-bold">
                        <CheckCircle2 className="w-3 h-3" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-rose-500/10 text-rose-600 rounded-full text-xs font-bold">
                        <XCircle className="w-3 h-3" /> Restricted
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-1.5 text-text-muted hover:text-primary transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.skuCode)}
                        className="p-1.5 text-text-muted hover:text-rose-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl p-6 max-w-md w-full space-y-5 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-lg font-bold text-text uppercase tracking-tight">
              {editingSku ? 'Edit Protocol Catalog' : 'Initialize Protocol SKU'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-text-muted block mb-1">SKU Identification Code *</label>
                <input
                  type="text"
                  required
                  disabled={!!editingSku}
                  value={formData.skuCode}
                  onChange={(e) => setFormData({ ...formData, skuCode: e.target.value.toUpperCase() })}
                  placeholder="e.g. SKU-GLD-RING-22K"
                  className="w-full p-3 bg-surface-2 border border-border rounded-xl text-xs font-bold text-text outline-none focus:border-primary uppercase font-mono disabled:opacity-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-text-muted block mb-1">Metal Segment</label>
                  <select
                    value={formData.metalType}
                    onChange={(e) => setFormData({ ...formData, metalType: e.target.value as any })}
                    className="w-full p-3 bg-surface-2 border border-border rounded-xl text-xs font-bold text-text"
                  >
                    <option value="Gold">Gold</option>
                    <option value="Silver">Silver</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-text-muted block mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-3 bg-surface-2 border border-border rounded-xl text-xs font-bold text-text"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-text-muted block mb-1">Default Tunch (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.defaultTunch}
                    onChange={(e) => setFormData({ ...formData, defaultTunch: parseFloat(e.target.value) || 0 })}
                    className="w-full p-3 bg-surface-2 border border-border rounded-xl text-xs font-bold text-text"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-text-muted block mb-1">Safety Floor Min Level</label>
                  <input
                    type="number"
                    value={formData.minStockLevel}
                    onChange={(e) => setFormData({ ...formData, minStockLevel: parseInt(e.target.value) || 0 })}
                    className="w-full p-3 bg-surface-2 border border-border rounded-xl text-xs font-bold text-text"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 bg-surface-2 hover:bg-border text-text rounded-xl font-semibold text-xs transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-xs shadow-md transition-all"
                >
                  Save Protocol
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
