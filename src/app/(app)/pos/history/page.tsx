'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Printer, ArrowLeft, Trash2, RotateCcw } from 'lucide-react';
import Link from 'next/link';

interface SaleRecord {
  id: string;
  invoiceNo: string;
  saleDate: string;
  customerName: string;
  customerPhone: string | null;
  paymentMethod: string;
  sellingPrice: number;
  profit: number;
  profitPercent: number;
  saleStatus: string;
  item: {
    sku: string;
    barcode: string;
    metalType: string;
    netWeightGrams: number;
    purchasePrice: number;
  } | null;
}

export default function SalesHistoryPage() {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [filterMetal, setFilterMetal] = useState<'All' | 'Gold' | 'Silver'>('All');
  const [filterPayment, setFilterPayment] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'revenue' | 'profit'>('date');

  const loadSales = async () => {
    try {
      const res = await fetch('/api/v1/sales/history');
      if (res.ok) {
        const data = await res.json();
        if (data.ok && Array.isArray(data.data)) {
          setSales(data.data);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadSales();
  }, []);

  const filteredSales = useMemo(() => {
    return sales
      .filter((s) => {
        const matchesMetal = filterMetal === 'All' || s.item?.metalType === filterMetal;
        const matchesPayment = filterPayment === 'All' || s.paymentMethod === filterPayment;
        const searchStr = `${s.invoiceNo} ${s.item?.sku || ''} ${s.customerName || ''}`.toLowerCase();
        const matchesSearch = !searchQuery || searchStr.includes(searchQuery.toLowerCase());
        return matchesMetal && matchesPayment && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'revenue') return b.sellingPrice - a.sellingPrice;
        if (sortBy === 'profit') return b.profit - a.profit;
        return new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime();
      });
  }, [sales, filterMetal, filterPayment, searchQuery, sortBy]);

  const totals = useMemo(() => {
    return filteredSales.reduce(
      (acc, curr) => {
        if (curr.saleStatus === 'CANCELLED') return acc;
        return {
          weight: acc.weight + (curr.item?.netWeightGrams || 0),
          revenue: acc.revenue + curr.sellingPrice,
          profit: acc.profit + curr.profit,
          count: acc.count + 1,
        };
      },
      { weight: 0, revenue: 0, profit: 0, count: 0 }
    );
  }, [filteredSales]);

  const handleVoid = async (id: string) => {
    if (!confirm('Are you sure you want to void this sale transaction and return item to stock?')) return;

    try {
      const res = await fetch(`/api/v1/sales/${id}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'History Void Correction' }),
      });
      if (res.ok) {
        loadSales();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface border border-border p-6 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3">
          <Link href="/pos" className="p-2 bg-surface-2 rounded-xl border border-border hover:bg-border text-text transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-primary tracking-tight uppercase">Sales History Ledger</h1>
            <p className="text-xs text-text-muted">Settlement Records & Audit Control Ledger</p>
          </div>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-2 hover:bg-border text-xs font-bold text-text transition-all"
        >
          <Printer className="w-4 h-4 text-primary" /> Print Ledger PDF
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface p-5 rounded-2xl border border-border shadow-2xs">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest block">Total Revenue</span>
          <span className="text-2xl font-extrabold text-primary mt-1 block">₹{totals.revenue.toLocaleString('en-IN')}</span>
          <span className="text-[10px] text-text-muted font-semibold mt-1 block">{totals.count} Active Settlements</span>
        </div>
        <div className="bg-surface p-5 rounded-2xl border border-border shadow-2xs">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest block">Realized Net Profit</span>
          <span className="text-2xl font-extrabold text-emerald-600 mt-1 block">₹{totals.profit.toLocaleString('en-IN')}</span>
          <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">Net ROI Yield</span>
        </div>
        <div className="bg-surface p-5 rounded-2xl border border-border shadow-2xs">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest block">Total Mass Sold</span>
          <span className="text-2xl font-extrabold text-text mt-1 block">{totals.weight.toFixed(3)} g</span>
          <span className="text-[10px] text-primary font-semibold mt-1 block">Metal Velocity</span>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-surface p-4 rounded-2xl border border-border flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {(['All', 'Gold', 'Silver'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setFilterMetal(m)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                filterMetal === m
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-surface-2 text-text-muted hover:text-text hover:bg-border'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search Client or Invoice..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-surface-2 border border-border rounded-xl text-xs font-semibold text-text outline-none focus:border-primary"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 bg-surface-2 border border-border rounded-xl text-xs font-bold text-text"
          >
            <option value="date">Sort: Date</option>
            <option value="revenue">Sort: Revenue</option>
            <option value="profit">Sort: Profit</option>
          </select>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-surface rounded-2xl border border-border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead className="bg-surface-2 border-b border-border text-xs font-bold text-text-muted uppercase">
              <tr>
                <th className="px-6 py-4">Invoice & Date</th>
                <th className="px-6 py-4">Asset & Client</th>
                <th className="px-6 py-4 text-center">Net Mass</th>
                <th className="px-6 py-4 text-right">Selling Value</th>
                <th className="px-6 py-4 text-right text-emerald-600">Net Profit</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {filteredSales.map((sale) => (
                <tr
                  key={sale.id}
                  className={`hover:bg-surface-2 transition-colors ${
                    sale.saleStatus === 'CANCELLED' ? 'opacity-40 line-through' : ''
                  }`}
                >
                  <td className="px-6 py-4">
                    <span className="font-extrabold text-primary font-mono block">{sale.invoiceNo}</span>
                    <span className="text-xs text-text-muted">{new Date(sale.saleDate).toLocaleDateString()}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-text block">{sale.item?.sku || 'Item'}</span>
                    <span className="text-xs text-text-muted">{sale.customerName}</span>
                  </td>
                  <td className="px-6 py-4 text-center font-bold text-text">
                    {(sale.item?.netWeightGrams || 0).toFixed(3)} g
                  </td>
                  <td className="px-6 py-4 text-right font-extrabold text-text">
                    ₹{sale.sellingPrice.toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4 text-right font-extrabold text-emerald-600">
                    ₹{sale.profit.toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {sale.saleStatus !== 'CANCELLED' && (
                      <button
                        onClick={() => handleVoid(sale.id)}
                        className="px-3 py-1 bg-surface-2 hover:bg-rose-500/10 hover:text-rose-500 text-text-muted rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 mx-auto"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Void
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
