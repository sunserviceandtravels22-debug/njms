'use client';

import React, { useState, useEffect } from 'react';
import { ShoppingBag, Search, CheckCircle2, AlertTriangle, ArrowRight, Printer, RefreshCw, Barcode } from 'lucide-react';
import { calculateProfit, ProfitCalculation } from '@/lib/sales/calculations';

interface ActiveItem {
  id: string;
  tagNo: string;
  sku: string;
  name: string;
  metal: string;
  category: string;
  netWeightGrams: number;
  makingValueRupees: number;
  purchasePriceRupees: number;
}

export default function PosPage() {
  const [barcodeSearch, setBarcodeSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<ActiveItem | null>(null);
  const [sellingPrice, setSellingPrice] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Real-time stock lookup by scanned barcode tag
  useEffect(() => {
    if (barcodeSearch.length >= 3) {
      fetch(`/api/v1/inventory?search=${encodeURIComponent(barcodeSearch)}`)
        .then((res) => res.json())
        .then((res) => {
          if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
            const found = res.data[0];
            const purchasePrice = found.makingValueRupees + found.netWeightGrams * 6500;
            setSelectedItem({
              id: found.id,
              tagNo: found.tagNo,
              sku: found.sku,
              name: found.name,
              metal: found.metal,
              category: found.category,
              netWeightGrams: found.netWeightGrams,
              makingValueRupees: found.makingValueRupees,
              purchasePriceRupees: Math.round(purchasePrice),
            });
            const suggested = purchasePrice * 1.2;
            setSellingPrice(Math.round(suggested).toString());
          }
        })
        .catch(() => {});
    }
  }, [barcodeSearch]);

  const stats: ProfitCalculation | null =
    selectedItem && sellingPrice
      ? calculateProfit(parseFloat(sellingPrice) || 0, selectedItem.purchasePriceRupees, selectedItem.makingValueRupees)
      : null;

  const handleSale = async () => {
    if (!selectedItem || !sellingPrice || isProcessing) return;

    if (stats && stats.profit < 0) {
      if (!confirm('CRITICAL: Negative Margin. Proceed with sale at a loss?')) return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch('/api/v1/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inventoryItemId: selectedItem.id,
          sellingPriceRupees: parseFloat(sellingPrice),
          paymentMethod,
          customerName,
          customerPhone,
        }),
      });

      if (res.ok) {
        setShowConfirmation(true);
        setTimeout(() => {
          setShowConfirmation(false);
          setSelectedItem(null);
          setSellingPrice('');
          setBarcodeSearch('');
          setCustomerName('');
          setCustomerPhone('');
        }, 2000);
      } else {
        const data = await res.json();
        alert(data.error || 'Sale transaction failed');
      }
    } catch (err: any) {
      alert('Sale failed: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'high':
        return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'medium':
        return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'low':
        return 'text-orange-700 bg-orange-50 border-orange-200';
      case 'loss':
        return 'text-rose-700 bg-rose-50 border-rose-200';
      default:
        return 'text-text-muted bg-surface-2 border-border';
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Scanner Bar */}
      <div className="bg-surface p-6 rounded-2xl border border-border shadow-xs flex flex-col sm:flex-row items-center gap-4">
        <div className="p-4 bg-primary/10 text-primary rounded-xl shrink-0">
          <Barcode className="w-8 h-8" />
        </div>
        <div className="flex-1 w-full">
          <label className="text-[10px] font-bold text-primary uppercase tracking-widest block mb-1">
            Terminal Active • Scan Physical Tag
          </label>
          <input
            autoFocus
            type="text"
            value={barcodeSearch}
            onChange={(e) => setBarcodeSearch(e.target.value)}
            className="w-full text-2xl sm:text-4xl font-extrabold border-none outline-none placeholder-text-muted/40 text-text bg-transparent font-mono tracking-tight"
            placeholder="Scan Tag No / Barcode..."
          />
        </div>
      </div>

      {selectedItem ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Asset Summary Card */}
          <div className="lg:col-span-4 bg-surface p-6 rounded-2xl border border-border shadow-xs flex flex-col justify-between space-y-6">
            <div>
              <span className="px-3 py-1 bg-primary/10 text-primary font-bold text-xs rounded-full uppercase">
                {selectedItem.metal} ({selectedItem.category})
              </span>
              <h2 className="text-2xl font-extrabold text-text tracking-tight mt-3">{selectedItem.name}</h2>
              <p className="text-xs text-text-muted font-mono mt-1">Tag: #{selectedItem.tagNo}</p>

              <div className="mt-6 space-y-3 pt-4 border-t border-border text-xs">
                <div className="flex justify-between">
                  <span className="text-text-muted font-semibold">SKU Protocol</span>
                  <span className="font-extrabold text-text font-mono">{selectedItem.sku}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted font-semibold">Net Mass</span>
                  <span className="font-extrabold text-primary">{selectedItem.netWeightGrams.toFixed(3)} g</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted font-semibold">Crafting Fee</span>
                  <span className="font-bold text-text">₹{selectedItem.makingValueRupees.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between opacity-60">
                  <span className="text-text-muted font-semibold">Cost Basis</span>
                  <span className="font-bold text-text">₹{selectedItem.purchasePriceRupees.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-surface-2 rounded-xl border border-border text-text">
              <span className="text-[10px] font-bold text-text-muted uppercase block">Total Liability Basis</span>
              <span className="text-xl font-extrabold text-primary">
                ₹{(selectedItem.purchasePriceRupees + selectedItem.makingValueRupees).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Settlement Form & Profit Math */}
          <div className="lg:col-span-8 bg-surface p-6 sm:p-8 rounded-2xl border border-primary/30 shadow-md space-y-6 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-border pb-4">
                <div>
                  <h3 className="text-xl font-extrabold text-text tracking-tight">Settlement Terminal</h3>
                  <p className="text-xs text-text-muted">Agreed Value & Real-time Profitability Metrics</p>
                </div>
                <span className="px-3 py-1 bg-primary text-white rounded-lg text-xs font-bold uppercase">POS Mode</span>
              </div>

              {/* Selling Price Input */}
              <div className="p-6 bg-surface-2 rounded-2xl border border-border space-y-2">
                <label className="text-xs font-bold text-text-muted uppercase block">Agreed Transaction Value (INR) *</label>
                <div className="flex items-center">
                  <span className="text-3xl font-extrabold text-text-muted mr-3">₹</span>
                  <input
                    type="number"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    className="w-full text-4xl sm:text-5xl font-extrabold bg-transparent outline-none text-text font-mono tracking-tight"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Live Profit Analysis Box */}
              {stats && (
                <div className={`p-6 rounded-2xl border ${getStatusColor(stats.status)} space-y-4`}>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {stats.status === 'loss' ? '🚨 Capital Erosion Alert' : '💎 Settlement Yield'}
                    </span>
                    <span className="text-2xl font-extrabold tracking-tight">
                      {stats.profit >= 0 ? '+' : ''}₹{stats.profit.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="p-3 bg-white/40 rounded-xl border border-current/10">
                      <span className="text-[10px] font-bold uppercase block opacity-70">Return Velocity (ROI)</span>
                      <span className="text-lg font-extrabold">{stats.profitPercent.toFixed(1)}%</span>
                    </div>
                    <div className="p-3 bg-white/40 rounded-xl border border-current/10">
                      <span className="text-[10px] font-bold uppercase block opacity-70">Portfolio Margin</span>
                      <span className="text-lg font-extrabold">{stats.profitMargin.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Customer & Payment Form */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-text-muted block mb-1 uppercase">Client Identity</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Customer Name (Optional)"
                    className="w-full p-3 bg-surface-2 border border-border rounded-xl text-xs font-semibold text-text outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-text-muted block mb-1 uppercase">Payment Settlement Path</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full p-3 bg-surface-2 border border-border rounded-xl text-xs font-bold text-text cursor-pointer"
                  >
                    <option value="CASH">Cash Payment</option>
                    <option value="CARD">Card Payment</option>
                    <option value="UPI">UPI Digital</option>
                    <option value="BANK">Bank Transfer</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                onClick={() => setSelectedItem(null)}
                className="px-6 py-3.5 rounded-xl bg-surface-2 hover:bg-border text-text-muted font-bold text-xs transition-all"
              >
                Discard
              </button>
              <button
                onClick={handleSale}
                disabled={!sellingPrice || isProcessing}
                className="flex-1 py-3.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-extrabold text-xs uppercase tracking-wider shadow-md transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              >
                <span>{isProcessing ? 'Synchronizing...' : 'Authorize Transaction'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-24 text-center space-y-3 bg-surface rounded-2xl border border-border">
          <Barcode className="w-16 h-16 text-text-muted mx-auto opacity-30 animate-pulse" />
          <h2 className="text-xl font-extrabold text-text-muted uppercase tracking-wider">Ready for Asset Scan</h2>
          <p className="text-xs text-text-muted max-w-sm mx-auto">
            Please scan a physical asset tag or type tag number above to initialize the POS settlement flow.
          </p>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-primary/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="text-center text-white space-y-4 animate-in zoom-in-95">
            <CheckCircle2 className="w-20 h-20 mx-auto animate-bounce text-emerald-400" />
            <h2 className="text-4xl font-extrabold uppercase tracking-tight">TRANSACTION COMMITTED</h2>
            <p className="text-sm opacity-80 max-w-md mx-auto">
              Registry status synchronized with database. Stock status updated to SOLD successfully.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
