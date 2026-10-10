'use client';

import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Search,
  RefreshCw,
  RotateCcw,
  ArrowLeftRight,
  Eye,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  User,
  Phone,
  Tag,
  Sparkles,
  CreditCard,
  ChevronDown,
  Layers,
  ArrowRight,
  Filter
} from 'lucide-react';

interface SaleItem {
  id: string;
  inventoryItemId: string | null;
  tagNo: string | null;
  name: string;
  metal: string;
  purityPpt: number;
  grossWeightGrams: string;
  netWeightGrams: string;
  totalRupees: number;
}

interface SaleRecord {
  id: string;
  invoiceNo: string;
  date: string;
  createdAt: string;
  status: 'COMPLETED' | 'CANCELLED' | 'RETURNED' | 'PARTIAL_RETURN';
  customer: {
    id: string;
    name: string;
    phone: string | null;
    city: string;
  } | null;
  totalRupees: number;
  paidRupees: number;
  oldGoldAdjRupees: number;
  items: SaleItem[];
}

export default function SalesHistoryPage() {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal States
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [isReturnOpen, setIsReturnOpen] = useState<boolean>(false);
  const [isReplaceOpen, setIsReplaceOpen] = useState<boolean>(false);

  // Return Form State
  const [selectedReturnItemIds, setSelectedReturnItemIds] = useState<string[]>([]);
  const [refundAmount, setRefundAmount] = useState<string>('0');
  const [refundMode, setRefundMode] = useState<string>('CASH');
  const [returnReason, setReturnReason] = useState<string>('Customer Request');
  const [returnSubmitting, setReturnSubmitting] = useState<boolean>(false);

  // Replace Form State
  const [replaceOldItemId, setReplaceOldItemId] = useState<string>('');
  const [replaceCreditValue, setReplaceCreditValue] = useState<string>('');
  const [availableStock, setAvailableStock] = useState<any[]>([]);
  const [stockLoading, setStockLoading] = useState<boolean>(false);
  const [selectedNewItemId, setSelectedNewItemId] = useState<string>('');
  const [newPriceValue, setNewPriceValue] = useState<string>('');
  const [replaceMode, setReplaceMode] = useState<string>('CASH');
  const [replaceNotes, setReplaceNotes] = useState<string>('Counter Exchange');
  const [replaceSubmitting, setReplaceSubmitting] = useState<boolean>(false);

  const [actionMessage, setActionMessage] = useState<{ text: string; error?: boolean } | null>(null);

  const fetchSales = async () => {
    setLoading(true);
    try {
      const url = `/api/v1/sales?search=${encodeURIComponent(search)}&status=${encodeURIComponent(statusFilter)}`;
      const res = await fetch(url, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) {
        setSales(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch sales history', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSales();
  };

  // Fetch in-stock inventory for exchange selection
  const fetchAvailableStock = async () => {
    setStockLoading(true);
    try {
      const res = await fetch('/api/v1/inventory?status=IN_STOCK&limit=50', { credentials: 'include' });
      const data = await res.json();
      if (data.ok) {
        setAvailableStock(data.data?.items || data.data || []);
      }
    } catch (err) {
      console.error('Failed to load stock for exchange', err);
    } finally {
      setStockLoading(false);
    }
  };

  // Open Return Modal
  const openReturnModal = (sale: SaleRecord) => {
    setSelectedSale(sale);
    setSelectedReturnItemIds(sale.items.map((i) => i.id));
    setRefundAmount(sale.totalRupees.toString());
    setRefundMode('CASH');
    setReturnReason('Defect or Customer Dissatisfaction');
    setIsReturnOpen(true);
  };

  // Open Replace Modal
  const openReplaceModal = (sale: SaleRecord) => {
    setSelectedSale(sale);
    if (sale.items.length > 0) {
      setReplaceOldItemId(sale.items[0].id);
      setReplaceCreditValue(sale.items[0].totalRupees.toString());
    } else {
      setReplaceOldItemId('');
      setReplaceCreditValue('0');
    }
    setSelectedNewItemId('');
    setNewPriceValue('');
    setIsReplaceOpen(true);
    fetchAvailableStock();
  };

  // Submit Return
  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSale) return;
    setReturnSubmitting(true);
    try {
      const res = await fetch(`/api/v1/sales/${selectedSale.id}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          saleItemIds: selectedReturnItemIds,
          refundRupees: parseFloat(refundAmount) || 0,
          paymentMethod: refundMode,
          reason: returnReason,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setActionMessage({ text: `Return successful! ${data.message || ''}` });
        setIsReturnOpen(false);
        fetchSales();
      } else {
        setActionMessage({ text: data.error || 'Failed to process return', error: true });
      }
    } catch (err: any) {
      setActionMessage({ text: err.message || 'Error executing return', error: true });
    } finally {
      setReturnSubmitting(false);
    }
  };

  // Submit Replace
  const handleReplaceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSale || !replaceOldItemId || !selectedNewItemId) {
      setActionMessage({ text: 'Please select both old and replacement items', error: true });
      return;
    }
    setReplaceSubmitting(true);
    try {
      const res = await fetch(`/api/v1/sales/${selectedSale.id}/replace`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          saleItemId: replaceOldItemId,
          newInventoryItemId: selectedNewItemId,
          creditValuationRupees: parseFloat(replaceCreditValue) || 0,
          newPriceRupees: parseFloat(newPriceValue) || 0,
          paymentMethod: replaceMode,
          notes: replaceNotes,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setActionMessage({ text: `Exchange complete! ${data.message || ''}` });
        setIsReplaceOpen(false);
        fetchSales();
      } else {
        setActionMessage({ text: data.error || 'Failed to process replacement', error: true });
      }
    } catch (err: any) {
      setActionMessage({ text: err.message || 'Error executing replacement', error: true });
    } finally {
      setReplaceSubmitting(false);
    }
  };

  // Void Sale
  const handleVoidSale = async (sale: SaleRecord) => {
    if (!confirm(`Are you sure you want to void Invoice ${sale.invoiceNo}? Items will be returned to stock.`)) return;
    try {
      const res = await fetch(`/api/v1/sales/${sale.id}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: 'Voided by Manager' }),
      });
      const data = await res.json();
      if (data.ok) {
        setActionMessage({ text: `Invoice ${sale.invoiceNo} voided successfully.` });
        fetchSales();
      } else {
        setActionMessage({ text: data.error || 'Failed to void invoice', error: true });
      }
    } catch (err: any) {
      setActionMessage({ text: err.message || 'Error voiding invoice', error: true });
    }
  };

  // Metrics
  const totalInvoiced = sales.filter((s) => s.status !== 'CANCELLED').reduce((acc, s) => acc + s.totalRupees, 0);
  const totalSalesCount = sales.filter((s) => s.status === 'COMPLETED').length;
  const totalReturnsCount = sales.filter((s) => s.status === 'RETURNED' || s.status === 'PARTIAL_RETURN').length;
  const totalOldGoldCredits = sales.reduce((acc, s) => acc + s.oldGoldAdjRupees, 0);

  // Replacement Live Math
  const creditNum = parseFloat(replaceCreditValue) || 0;
  const newPriceNum = parseFloat(newPriceValue) || 0;
  const diffVal = newPriceNum - creditNum;

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 p-4 lg:p-8 pb-32">
      {/* Top Banner / Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Sales Ledger & History
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-medium">
                  Returns & Exchange Enabled
                </span>
              </h1>
              <p className="text-sm text-stone-400">
                Audit every retail sale, manage customer jewellery returns, exchanges, and automatic cash ledger reconciliation.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchSales}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 rounded-xl transition text-sm font-medium shadow-sm self-start md:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Records
        </button>
      </div>

      {actionMessage && (
        <div
          className={`mb-6 p-4 rounded-xl border flex items-center justify-between ${
            actionMessage.error
              ? 'bg-rose-950/40 border-rose-800/60 text-rose-300'
              : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.error ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            <span className="text-sm font-medium">{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-stone-400 hover:text-white text-xs underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="p-4 rounded-2xl bg-stone-900/60 border border-stone-800 backdrop-blur-sm">
          <span className="text-xs font-medium text-stone-400">Gross Sales Value</span>
          <div className="text-2xl font-extrabold text-white mt-1">₹{totalInvoiced.toLocaleString('en-IN')}</div>
          <span className="text-xs text-amber-400/80 mt-1 block">Active sales revenue</span>
        </div>
        <div className="p-4 rounded-2xl bg-stone-900/60 border border-stone-800 backdrop-blur-sm">
          <span className="text-xs font-medium text-stone-400">Completed Orders</span>
          <div className="text-2xl font-extrabold text-emerald-400 mt-1">{totalSalesCount}</div>
          <span className="text-xs text-stone-400 mt-1 block">Successfully fulfilled</span>
        </div>
        <div className="p-4 rounded-2xl bg-stone-900/60 border border-stone-800 backdrop-blur-sm">
          <span className="text-xs font-medium text-stone-400">Returns & Exchanges</span>
          <div className="text-2xl font-extrabold text-rose-400 mt-1">{totalReturnsCount}</div>
          <span className="text-xs text-stone-400 mt-1 block">Restocked / Exchanged</span>
        </div>
        <div className="p-4 rounded-2xl bg-stone-900/60 border border-stone-800 backdrop-blur-sm">
          <span className="text-xs font-medium text-stone-400">Old Metal Deductions</span>
          <div className="text-2xl font-extrabold text-amber-300 mt-1">₹{totalOldGoldCredits.toLocaleString('en-IN')}</div>
          <span className="text-xs text-stone-400 mt-1 block">Trade-in adjustments</span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-4 rounded-2xl bg-stone-900/40 border border-stone-800 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Invoice #, Customer, Phone, Tag..."
            className="w-full pl-9 pr-4 py-2 bg-stone-800/80 border border-stone-700/80 rounded-xl text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500/60"
          />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <Filter className="w-4 h-4 text-stone-400 shrink-0 ml-1" />
          {['ALL', 'COMPLETED', 'RETURNED', 'PARTIAL_RETURN', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                statusFilter === st
                  ? 'bg-amber-500 text-stone-950 shadow-md'
                  : 'bg-stone-800/80 text-stone-400 hover:text-stone-200 hover:bg-stone-800 border border-stone-700/50'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Sales Table / List */}
      <div className="bg-stone-900/50 border border-stone-800/80 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-stone-400 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
            <p className="text-sm">Retrieving sales transactions...</p>
          </div>
        ) : sales.length === 0 ? (
          <div className="p-12 text-center text-stone-400">
            <Receipt className="w-12 h-12 mx-auto text-stone-600 mb-3" />
            <p className="text-base font-semibold text-stone-300">No sales transactions found</p>
            <p className="text-xs text-stone-500 mt-1">Try modifying your search or filter options.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-800 text-xs font-semibold text-stone-400 bg-stone-900/80">
                  <th className="py-3.5 px-4">Invoice / Date</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Ornaments & Items</th>
                  <th className="py-3.5 px-4">Net Total</th>
                  <th className="py-3.5 px-4">Old Metal Credit</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60 text-sm">
                {sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-stone-800/30 transition group">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-stone-100 flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-amber-500" />
                        {sale.invoiceNo}
                      </div>
                      <div className="text-xs text-stone-400 mt-0.5 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-stone-500" />
                        {new Date(sale.date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-stone-200 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-stone-400" />
                        {sale.customer?.name || 'Walk-in Client'}
                      </div>
                      {sale.customer?.phone && (
                        <div className="text-xs text-stone-400 mt-0.5 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-stone-500" />
                          {sale.customer.phone}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      {sale.items.length > 0 ? (
                        <div>
                          <div className="text-xs text-stone-200 font-medium truncate">
                            {sale.items[0].name}
                          </div>
                          <div className="text-xs text-stone-400 mt-0.5">
                            {sale.items[0].tagNo && <span className="text-amber-400/90 mr-2">[{sale.items[0].tagNo}]</span>}
                            {sale.items[0].metal} • {sale.items[0].netWeightGrams}g
                            {sale.items.length > 1 && (
                              <span className="ml-1 text-stone-500 font-semibold">
                                +{sale.items.length - 1} more
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-stone-500 italic">No item record</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-amber-400">
                        ₹{sale.totalRupees.toLocaleString('en-IN')}
                      </div>
                      <div className="text-xs text-stone-400">
                        Paid: ₹{sale.paidRupees.toLocaleString('en-IN')}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {sale.oldGoldAdjRupees > 0 ? (
                        <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 font-medium">
                          -₹{sale.oldGoldAdjRupees.toLocaleString('en-IN')}
                        </span>
                      ) : (
                        <span className="text-xs text-stone-500">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
                          sale.status === 'COMPLETED'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : sale.status === 'RETURNED'
                            ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                            : sale.status === 'PARTIAL_RETURN'
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                            : 'bg-stone-500/10 border-stone-500/30 text-stone-400'
                        }`}
                      >
                        {sale.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedSale(sale);
                            setIsDetailOpen(true);
                          }}
                          title="View Invoice"
                          className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {sale.status === 'COMPLETED' && (
                          <>
                            <button
                              onClick={() => openReturnModal(sale)}
                              title="Process Return"
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 transition"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openReplaceModal(sale)}
                              title="Exchange / Replace Item"
                              className="p-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 transition"
                            >
                              <ArrowLeftRight className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleVoidSale(sale)}
                              title="Void Sale"
                              className="p-1.5 rounded-lg bg-stone-800 hover:bg-rose-900/40 text-stone-400 hover:text-rose-400 transition"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {isDetailOpen && selectedSale && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-stone-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
                  <Receipt className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Invoice #{selectedSale.invoiceNo}</h3>
                  <span className="text-xs text-stone-400">
                    Dated {new Date(selectedSale.date).toLocaleDateString('en-IN')}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsDetailOpen(false)}
                className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800"
              >
                ✕
              </button>
            </div>

            <div className="my-6 space-y-4">
              <div className="p-4 rounded-xl bg-stone-800/40 border border-stone-800 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-stone-400">Customer</span>
                  <div className="text-sm font-semibold text-stone-200 mt-0.5">
                    {selectedSale.customer?.name || 'Walk-in Client'}
                  </div>
                  {selectedSale.customer?.phone && (
                    <div className="text-xs text-stone-400 mt-0.5">{selectedSale.customer.phone}</div>
                  )}
                </div>
                <div>
                  <span className="text-xs text-stone-400">Invoice Status</span>
                  <div className="text-sm font-semibold text-emerald-400 mt-0.5">
                    {selectedSale.status}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-stone-300 uppercase tracking-wider mb-2">
                  Purchased Items ({selectedSale.items.length})
                </h4>
                <div className="border border-stone-800 rounded-xl overflow-hidden divide-y divide-stone-800/80">
                  {selectedSale.items.map((item) => (
                    <div key={item.id} className="p-3.5 flex items-center justify-between bg-stone-950/40">
                      <div>
                        <div className="font-semibold text-sm text-stone-200">{item.name}</div>
                        <div className="text-xs text-stone-400 mt-0.5">
                          Tag: {item.tagNo || 'N/A'} • {item.metal} ({item.purityPpt}/1000) • Net: {item.netWeightGrams}g
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-amber-400">
                          ₹{item.totalRupees.toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-stone-950/70 border border-stone-800/80 space-y-2 text-sm">
                <div className="flex justify-between text-stone-400">
                  <span>Gross Items Value</span>
                  <span>₹{selectedSale.totalRupees.toLocaleString('en-IN')}</span>
                </div>
                {selectedSale.oldGoldAdjRupees > 0 && (
                  <div className="flex justify-between text-amber-400">
                    <span>Old Metal Valuation Adjustment</span>
                    <span>-₹{selectedSale.oldGoldAdjRupees.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-white pt-2 border-t border-stone-800">
                  <span>Net Paid Amount</span>
                  <span className="text-emerald-400">₹{selectedSale.paidRupees.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-800">
              <button
                onClick={() => setIsDetailOpen(false)}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Modal */}
      {isReturnOpen && selectedSale && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-stone-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-500/10 text-rose-400 rounded-xl">
                  <RotateCcw className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Process Customer Return</h3>
                  <p className="text-xs text-stone-400">Invoice #{selectedSale.invoiceNo}</p>
                </div>
              </div>
              <button
                onClick={() => setIsReturnOpen(false)}
                className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleReturnSubmit} className="my-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-stone-300 block mb-1">
                  Select Items to Return & Restock:
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto p-2 bg-stone-950/60 rounded-xl border border-stone-800">
                  {selectedSale.items.map((item) => {
                    const isChecked = selectedReturnItemIds.includes(item.id);
                    return (
                      <label
                        key={item.id}
                        className="flex items-center gap-3 p-2 rounded-lg bg-stone-900/60 border border-stone-800/80 cursor-pointer hover:bg-stone-800/40 text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedReturnItemIds([...selectedReturnItemIds, item.id]);
                            } else {
                              setSelectedReturnItemIds(selectedReturnItemIds.filter((id) => id !== item.id));
                            }
                          }}
                          className="rounded text-amber-500 focus:ring-amber-500"
                        />
                        <div className="flex-1">
                          <span className="font-semibold text-stone-200">{item.name}</span>
                          <span className="text-stone-400 ml-2">[{item.tagNo || 'TAG'}]</span>
                        </div>
                        <span className="font-bold text-amber-400">₹{item.totalRupees.toLocaleString('en-IN')}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-stone-300 block mb-1">Refund Amount (₹):</label>
                  <input
                    type="number"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-stone-800/80 border border-stone-700 rounded-xl text-sm text-stone-100 focus:border-rose-500 focus:outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-300 block mb-1">Refund Mode:</label>
                  <select
                    value={refundMode}
                    onChange={(e) => setRefundMode(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-800/80 border border-stone-700 rounded-xl text-sm text-stone-100 focus:border-rose-500 focus:outline-none"
                  >
                    <option value="CASH">CASH (Physical Drawer Out)</option>
                    <option value="UPI">UPI Transfer Out</option>
                    <option value="BANK">Bank Transfer Out</option>
                    <option value="CREDIT">Store Credit Voucher</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-300 block mb-1">Return Reason / Notes:</label>
                <input
                  type="text"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="e.g. Size mismatch, design exchange, or minor defect"
                  className="w-full px-3 py-2 bg-stone-800/80 border border-stone-700 rounded-xl text-sm text-stone-100 focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300">
                ⚠️ Notice: Restocking will set returned jewellery status to <strong>IN_STOCK</strong>. A cashbook payout voucher will be posted under Ref: <strong>{selectedSale.invoiceNo}</strong>.
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsReturnOpen(false)}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={returnSubmitting || selectedReturnItemIds.length === 0}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl text-sm transition flex items-center gap-2"
                >
                  {returnSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                  Confirm Return & Restock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Replace / Exchange Modal */}
      {isReplaceOpen && selectedSale && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-stone-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-xl">
                  <ArrowLeftRight className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Item Replacement / Exchange</h3>
                  <p className="text-xs text-stone-400">Invoice #{selectedSale.invoiceNo}</p>
                </div>
              </div>
              <button
                onClick={() => setIsReplaceOpen(false)}
                className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleReplaceSubmit} className="my-5 space-y-4">
              {/* Step 1: Old Item */}
              <div>
                <label className="text-xs font-semibold text-stone-300 block mb-1">
                  1. Returned Item from Invoice:
                </label>
                <select
                  value={replaceOldItemId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setReplaceOldItemId(id);
                    const itm = selectedSale.items.find((i) => i.id === id);
                    if (itm) setReplaceCreditValue(itm.totalRupees.toString());
                  }}
                  className="w-full px-3 py-2 bg-stone-800/80 border border-stone-700 rounded-xl text-sm text-stone-100 focus:border-cyan-500 focus:outline-none"
                >
                  {selectedSale.items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} [{item.tagNo || 'TAG'}] — Original ₹{item.totalRupees.toLocaleString('en-IN')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-300 block mb-1">
                  Old Item Credit Valuation (₹):
                </label>
                <input
                  type="number"
                  value={replaceCreditValue}
                  onChange={(e) => setReplaceCreditValue(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-stone-800/80 border border-stone-700 rounded-xl text-sm text-stone-100 focus:border-cyan-500 focus:outline-none font-bold"
                />
              </div>

              {/* Step 2: New Item from Stock */}
              <div>
                <label className="text-xs font-semibold text-stone-300 block mb-1">
                  2. Select Replacement Item from Stock:
                </label>
                {stockLoading ? (
                  <div className="p-3 text-center text-xs text-stone-400 flex items-center justify-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                    Loading current inventory items...
                  </div>
                ) : availableStock.length === 0 ? (
                  <div className="p-3 text-xs text-rose-400 bg-rose-950/20 rounded-xl border border-rose-900/40">
                    No IN_STOCK inventory items available. Add inventory first.
                  </div>
                ) : (
                  <select
                    value={selectedNewItemId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedNewItemId(id);
                      const itm = availableStock.find((s) => s.id === id);
                      if (itm) {
                        const price = itm.costPaise ? Math.round(Number(itm.costPaise) / 100) : 0;
                        setNewPriceValue(price.toString());
                      }
                    }}
                    className="w-full px-3 py-2 bg-stone-800/80 border border-stone-700 rounded-xl text-sm text-stone-100 focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="">-- Choose In-Stock Item --</option>
                    {availableStock.map((stk) => (
                      <option key={stk.id} value={stk.id}>
                        [{stk.tagNo}] {stk.name} ({stk.metal} {stk.purityPpt}) - {((stk.netWeightMg || 0) / 1000).toFixed(2)}g
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-300 block mb-1">
                  New Item Selling Price (₹):
                </label>
                <input
                  type="number"
                  value={newPriceValue}
                  onChange={(e) => setNewPriceValue(e.target.value)}
                  placeholder="Enter selling price for new jewellery"
                  required
                  className="w-full px-3 py-2 bg-stone-800/80 border border-stone-700 rounded-xl text-sm text-stone-100 focus:border-cyan-500 focus:outline-none font-bold"
                />
              </div>

              {/* Step 3: Difference Calculation Card */}
              <div
                className={`p-4 rounded-xl border flex items-center justify-between ${
                  diffVal > 0
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    : diffVal < 0
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    : 'bg-stone-800 border-stone-700 text-stone-300'
                }`}
              >
                <div>
                  <span className="text-xs block font-medium">Difference Settlement</span>
                  <div className="text-base font-extrabold mt-0.5">
                    {diffVal > 0 && `Customer Pays Difference: +₹${diffVal.toLocaleString('en-IN')}`}
                    {diffVal < 0 && `Store Refunds Difference: -₹${Math.abs(diffVal).toLocaleString('en-IN')}`}
                    {diffVal === 0 && 'Even Exchange (₹0 Difference)'}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-stone-400 block">Settlement Mode</span>
                  <select
                    value={replaceMode}
                    onChange={(e) => setReplaceMode(e.target.value)}
                    className="mt-1 px-2 py-1 bg-stone-900 border border-stone-700 rounded text-xs text-stone-100 focus:outline-none"
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="CARD">Card</option>
                    <option value="BANK">Bank</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-300 block mb-1">Notes / Exchange Details:</label>
                <input
                  type="text"
                  value={replaceNotes}
                  onChange={(e) => setReplaceNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-800/80 border border-stone-700 rounded-xl text-sm text-stone-100 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsReplaceOpen(false)}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={replaceSubmitting || !selectedNewItemId}
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-xl text-sm transition flex items-center gap-2"
                >
                  {replaceSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowLeftRight className="w-4 h-4" />
                  )}
                  Execute Item Exchange
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
