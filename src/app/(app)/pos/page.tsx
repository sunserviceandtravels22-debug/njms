'use client';

import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Printer,
  RefreshCw,
  Barcode,
  Coins,
  Sparkles,
  ArrowDownUp,
  Percent,
  Scale
} from 'lucide-react';
import { calculateProfit, ProfitCalculation } from '@/lib/sales/calculations';
import { CustomerOmniSelector, CustomerOmniData } from '@/components/customers/CustomerOmniSelector';

interface ActiveItem {
  id: string;
  tagNo: string;
  sku: string;
  name: string;
  metal: string;
  category: string;
  purityPpt: number;
  purityLabel: string;
  grossWeightGrams: number;
  stoneWeightGrams: number;
  netWeightGrams: number;
  huid?: string | null;
  makingType: string;
  makingValueRupees: number;
  totalMakingRupees: number;
  metalRatePerGram: number;
  metalValueRupees: number;
  suggestedRetailRupees: number;
  purchasePriceRupees: number;
  status?: string;
  ownership?: string;
}

export default function PosPage() {
  const [barcodeSearch, setBarcodeSearch] = useState('');
  const [barcodeWarning, setBarcodeWarning] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<ActiveItem | null>(null);
  const [sellingPrice, setSellingPrice] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOmniData | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Old Metal Exchange State
  const [isExchangeActive, setIsExchangeActive] = useState(false);
  const [oldMetalType, setOldMetalType] = useState<'GOLD' | 'SILVER'>('GOLD');
  const [oldGrossWeight, setOldGrossWeight] = useState('');
  const [oldStoneWeight, setOldStoneWeight] = useState('0');
  const [oldPurityPercent, setOldPurityPercent] = useState('91.6'); // 22K default
  const [spotRatePerGram, setSpotRatePerGram] = useState('7200'); // Auto-loaded from rates
  const [todayRates, setTodayRates] = useState<any[]>([]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationData, setConfirmationData] = useState<any | null>(null);

  // Fetch live daily rates on mount
  useEffect(() => {
    fetch('/api/v1/rates', { credentials: 'include' })
      .then((res) => res.json())
      .then((res) => {
        if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
          setTodayRates(res.data);
          // Look for 24K or 22K gold rate
          const goldRate =
            res.data.find((r: any) => r.metal === 'GOLD' && (r.purityPpt === 1000 || r.purityPpt === 999)) ||
            res.data.find((r: any) => r.metal === 'GOLD');
          if (goldRate) {
            setSpotRatePerGram(goldRate.rateRupeesPerGram.toString());
          }
        }
      })
      .catch(() => {});
  }, []);

  // Update spot rate when switching metal type
  useEffect(() => {
    if (todayRates.length > 0) {
      const match = todayRates.find((r) => r.metal === oldMetalType);
      if (match) {
        setSpotRatePerGram(match.rateRupeesPerGram.toString());
      } else if (oldMetalType === 'SILVER') {
        setSpotRatePerGram('90');
      } else {
        setSpotRatePerGram('7200');
      }
    }
  }, [oldMetalType, todayRates]);

  // Real-time stock lookup by scanned barcode tag
  useEffect(() => {
    if (barcodeSearch.trim().length >= 3) {
      fetch(`/api/v1/inventory?search=${encodeURIComponent(barcodeSearch.trim())}`, { credentials: 'include' })
        .then((res) => res.json())
        .then((res) => {
          if (res.ok) {
            const list = Array.isArray(res.data?.items) ? res.data.items : Array.isArray(res.data) ? res.data : [];
            if (list.length > 0) {
              const exactMatch =
                list.find((it: any) => it.tagNo?.toLowerCase() === barcodeSearch.trim().toLowerCase()) || list[0];
              const found = exactMatch;

              if (found.status === 'SOLD') {
                setBarcodeWarning(`🚨 Item #${found.tagNo} (${found.name}) is ALREADY SOLD. It cannot be sold again.`);
                setSelectedItem(null);
                setSellingPrice('');
                return;
              }
              if (found.status !== 'IN_STOCK') {
                setBarcodeWarning(`⚠️ Item #${found.tagNo} status is "${found.status}". Only IN_STOCK items can be billed.`);
                setSelectedItem(null);
                setSellingPrice('');
                return;
              }

              setBarcodeWarning(null);

              // 1. Triple Weights (defensive parsing from grams or mg)
              const grossWeight =
                Number(found.grossWeightGrams) ||
                (found.grossWeightMg ? found.grossWeightMg / 1000 : 0);
              const stoneWeight =
                Number(found.stoneWeightGrams) ||
                (found.stoneWeightMg ? found.stoneWeightMg / 1000 : 0);
              const netWeight =
                Number(found.netWeightGrams) ||
                (found.netWeightMg ? found.netWeightMg / 1000 : 0) ||
                Math.max(0, grossWeight - stoneWeight);

              // 2. Hallmark & Purity
              const purityPpt = Number(found.purityPpt) || 916;
              let purityLabel = `${purityPpt} Fine`;
              if (purityPpt >= 999) purityLabel = '24K (999 Fine)';
              else if (purityPpt >= 916) purityLabel = '22K (916 Hallmark)';
              else if (purityPpt >= 750) purityLabel = '18K (750 Hallmark)';
              else if (purityPpt >= 585) purityLabel = '14K (585 Hallmark)';

              // 3. Making Charges
              const makingVal =
                Number(found.makingValueRupees) ||
                (found.makingValuePaise ? Math.round(Number(found.makingValuePaise) / 100) : 0);
              const makingType = found.makingType || 'PER_GRAM';

              // 4. Board Metal Rate Calculation
              let metalRate = 7200;
              if (found.metal === 'SILVER') {
                const silverObj = todayRates.find((r: any) => r.metal === 'SILVER');
                metalRate = silverObj ? Number(silverObj.rateRupeesPerGram) : 90;
              } else {
                // Gold
                const exactPurityObj = todayRates.find(
                  (r: any) => r.metal === 'GOLD' && r.purityPpt === purityPpt
                );
                if (exactPurityObj) {
                  metalRate = Number(exactPurityObj.rateRupeesPerGram);
                } else {
                  const gold24Obj = todayRates.find(
                    (r: any) => r.metal === 'GOLD' && (r.purityPpt >= 999 || r.purityPpt === 1000)
                  );
                  const rate24K = gold24Obj
                    ? Number(gold24Obj.rateRupeesPerGram)
                    : parseFloat(spotRatePerGram) || 7500;
                  metalRate = Math.round(rate24K * (purityPpt / 1000));
                }
              }

              const metalValueRupees = Math.round(netWeight * metalRate);

              let totalMakingRupees = 0;
              if (makingType === 'PER_GRAM') {
                totalMakingRupees = Math.round(makingVal * netWeight);
              } else if (makingType === 'PERCENTAGE') {
                totalMakingRupees = Math.round((metalValueRupees * makingVal) / 100);
              } else {
                totalMakingRupees = Math.round(makingVal);
              }

              const suggestedRetailRupees = metalValueRupees + totalMakingRupees;
              const costBasis =
                Number(found.costRupees) ||
                (found.costPaise ? Math.round(Number(found.costPaise) / 100) : 0) ||
                Math.round(totalMakingRupees + netWeight * 6800);

              setSelectedItem({
                id: found.id,
                tagNo: found.tagNo,
                sku: found.sku,
                name: found.name,
                metal: found.metal,
                category: found.category || 'Jewellery',
                purityPpt,
                purityLabel,
                grossWeightGrams: grossWeight,
                stoneWeightGrams: stoneWeight,
                netWeightGrams: netWeight,
                huid: found.huid || null,
                makingType,
                makingValueRupees: makingVal,
                totalMakingRupees,
                metalRatePerGram: metalRate,
                metalValueRupees,
                suggestedRetailRupees,
                purchasePriceRupees: costBasis,
                status: found.status,
                ownership: found.ownership,
              });

              setSellingPrice(
                suggestedRetailRupees > 0
                  ? suggestedRetailRupees.toString()
                  : Math.round(costBasis * 1.15).toString()
              );
            } else {
              setBarcodeWarning(`No inventory item found for "${barcodeSearch}"`);
              setSelectedItem(null);
            }
          }
        })
        .catch(() => {});
    } else {
      setBarcodeWarning(null);
    }
  }, [barcodeSearch, todayRates, spotRatePerGram]);

  // Old Metal Live Math:
  // Fine Grams = Net Weight * (Purity % / 100)
  // Valuation = Fine Grams * Spot Rate
  const grossNum = parseFloat(oldGrossWeight) || 0;
  const stoneNum = parseFloat(oldStoneWeight) || 0;
  const oldNetWeight = Math.max(0, grossNum - stoneNum);
  const purityPctNum = parseFloat(oldPurityPercent) || 0;
  const rateNum = parseFloat(spotRatePerGram) || 0;
  const fineGrams = oldNetWeight * (purityPctNum / 100);
  const oldMetalValuation = isExchangeActive ? Math.round(fineGrams * rateNum) : 0;

  // New Item Selling Price & Difference
  const sellingPriceNum = parseFloat(sellingPrice) || 0;
  const netDifference = sellingPriceNum - oldMetalValuation; // > 0 means customer pays difference; < 0 means store pays/refunds difference

  const stats: ProfitCalculation | null =
    selectedItem && sellingPrice
      ? calculateProfit(sellingPriceNum, selectedItem.purchasePriceRupees, selectedItem.totalMakingRupees)
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
        credentials: 'include',
        body: JSON.stringify({
          inventoryItemId: selectedItem.id,
          sellingPriceRupees: sellingPriceNum,
          paymentMethod,
          customerId: selectedCustomer?.id,
          customerName: selectedCustomer?.name || customerName || 'Walk-in Customer',
          customerPhone: selectedCustomer?.phone || customerPhone || '',
          oldGoldValuationRupees: oldMetalValuation,
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setConfirmationData(data.data);
        setShowConfirmation(true);
        setTimeout(() => {
          setShowConfirmation(false);
          setSelectedItem(null);
          setSellingPrice('');
          setBarcodeSearch('');
          setCustomerName('');
          setCustomerPhone('');
          setIsExchangeActive(false);
          setOldGrossWeight('');
        }, 2500);
      } else {
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
    <div className="space-y-6 pb-28">
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
          {barcodeWarning && (
            <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-rose-600 text-xs font-bold animate-pulse">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{barcodeWarning}</span>
            </div>
          )}
        </div>
      </div>

      {selectedItem ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Asset Summary Card */}
          <div className="lg:col-span-5 bg-surface p-6 rounded-2xl border border-border shadow-xs flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              {/* Badges strip */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 bg-primary/10 text-primary font-extrabold text-xs rounded-full uppercase">
                  {selectedItem.metal} • {selectedItem.category}
                </span>
                <span className="px-3 py-1 bg-amber-500/15 text-amber-700 border border-amber-500/30 font-black text-xs rounded-full flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>{selectedItem.purityLabel}</span>
                </span>
                {selectedItem.huid && (
                  <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-700 border border-emerald-500/25 font-bold text-[11px] rounded-full font-mono">
                    HUID: {selectedItem.huid}
                  </span>
                )}
                {selectedItem.ownership === 'MEMO_IN' && (
                  <span className="px-2.5 py-0.5 bg-blue-500/15 text-blue-600 border border-blue-500/30 font-black text-[10px] rounded-full uppercase tracking-wider">
                    Wholesaler Approval (Memo-In)
                  </span>
                )}
              </div>

              <div>
                <h2 className="text-2xl font-black text-text tracking-tight">{selectedItem.name}</h2>
                <div className="flex items-center gap-3 text-xs text-text-muted font-mono mt-1">
                  <span>Tag: <strong>#{selectedItem.tagNo}</strong></span>
                  <span>•</span>
                  <span>SKU: {selectedItem.sku}</span>
                </div>
              </div>

              {/* Triple-Weight Certified Breakdown */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-surface-2 rounded-xl border border-border text-center">
                <div className="p-1">
                  <span className="text-[10px] font-bold text-text-muted uppercase block">Gross Wt</span>
                  <span className="text-xs sm:text-sm font-extrabold text-text font-mono">
                    {selectedItem.grossWeightGrams.toFixed(3)}g
                  </span>
                </div>
                <div className="p-1 border-x border-border/80">
                  <span className="text-[10px] font-bold text-text-muted uppercase block">Stone / Deduct</span>
                  <span className="text-xs sm:text-sm font-bold text-amber-700 font-mono">
                    {selectedItem.stoneWeightGrams > 0 ? `-${selectedItem.stoneWeightGrams.toFixed(3)}g` : '0.000g'}
                  </span>
                </div>
                <div className="p-1">
                  <span className="text-[10px] font-black text-primary uppercase block">Pure Net Gold</span>
                  <span className="text-xs sm:text-sm font-black text-primary font-mono">
                    {selectedItem.netWeightGrams.toFixed(3)}g
                  </span>
                </div>
              </div>

              {/* Live Jewellery Valuation Breakdown */}
              <div className="space-y-2.5 pt-2 border-t border-border text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-text-muted font-medium">
                    Pure Gold Rate ({selectedItem.purityLabel})
                  </span>
                  <span className="font-bold text-text font-mono">
                    ₹{selectedItem.metalRatePerGram.toLocaleString('en-IN')}/g
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-muted font-medium">
                    Pure Metal Value ({selectedItem.netWeightGrams.toFixed(3)}g × ₹{selectedItem.metalRatePerGram.toLocaleString('en-IN')})
                  </span>
                  <span className="font-extrabold text-text">
                    ₹{selectedItem.metalValueRupees.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-muted font-medium">
                    Crafting / Making Charges{' '}
                    <span className="text-[10px] text-text-muted">
                      ({selectedItem.makingType === 'PER_GRAM' ? `₹${selectedItem.makingValueRupees}/g` : selectedItem.makingType === 'PERCENTAGE' ? `${selectedItem.makingValueRupees}%` : 'Flat'})
                    </span>
                  </span>
                  <span className="font-extrabold text-emerald-600">
                    +₹{selectedItem.totalMakingRupees.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between items-center opacity-60">
                  <span className="text-text-muted font-medium">Wholesale Cost Basis</span>
                  <span className="font-semibold text-text font-mono">
                    ₹{selectedItem.purchasePriceRupees.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            {/* Suggested Retail Strip */}
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-primary uppercase">Suggested Showroom Total</span>
                <button
                  type="button"
                  onClick={() => setSellingPrice(selectedItem.suggestedRetailRupees.toString())}
                  className="text-[10px] font-bold text-primary underline hover:text-primary-hover"
                >
                  Apply Suggested Price
                </button>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-primary">
                  ₹{selectedItem.suggestedRetailRupees.toLocaleString('en-IN')}
                </span>
                <span className="text-[11px] text-text-muted font-medium">
                  (Metal + Making)
                </span>
              </div>
            </div>
          </div>

          {/* Settlement Form, Exchange Card & Profit Math */}
          <div className="lg:col-span-7 bg-surface p-6 sm:p-8 rounded-2xl border border-primary/30 shadow-md space-y-6 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-border pb-4">
                <div>
                  <h3 className="text-xl font-extrabold text-text tracking-tight">Settlement Terminal</h3>
                  <p className="text-xs text-text-muted">Agreed Value & Real-time Profitability Metrics</p>
                </div>
                <span className="px-3 py-1 bg-primary text-white rounded-lg text-xs font-bold uppercase">POS Mode</span>
              </div>

              {/* Selling Price Input */}
              <div className="p-5 bg-surface-2 rounded-2xl border border-border space-y-2">
                <label className="text-xs font-bold text-text-muted uppercase block">New Jewellery Price (INR) *</label>
                <div className="flex items-center">
                  <span className="text-3xl font-extrabold text-text-muted mr-3">₹</span>
                  <input
                    type="number"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    className="w-full text-3xl sm:text-4xl font-extrabold bg-transparent outline-none text-text font-mono tracking-tight"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Old Metal Exchange Toggle & Engine */}
              <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Coins className="w-5 h-5 text-amber-500" />
                    <div>
                      <h4 className="text-sm font-bold text-text">Old Gold / Silver Trade-in Exchange</h4>
                      <p className="text-[11px] text-text-muted">
                        Weight × Purity % = Actual Fine Grams × Day Rate = Trade-in Credit
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsExchangeActive(!isExchangeActive)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      isExchangeActive
                        ? 'bg-amber-500 text-stone-950 shadow-sm'
                        : 'bg-surface-2 text-text border border-border hover:bg-surface'
                    }`}
                  >
                    {isExchangeActive ? 'Trade-in Active ✓' : '+ Add Trade-in'}
                  </button>
                </div>

                {isExchangeActive && (
                  <div className="space-y-4 pt-2 border-t border-amber-500/20">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-text-muted block mb-1">Metal</label>
                        <select
                          value={oldMetalType}
                          onChange={(e) => setOldMetalType(e.target.value as any)}
                          className="w-full p-2 bg-surface border border-border rounded-xl text-xs font-bold text-text"
                        >
                          <option value="GOLD">Gold</option>
                          <option value="SILVER">Silver</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-text-muted block mb-1">Gross Wt (g)</label>
                        <input
                          type="number"
                          step="0.001"
                          placeholder="e.g. 15.200"
                          value={oldGrossWeight}
                          onChange={(e) => setOldGrossWeight(e.target.value)}
                          className="w-full p-2 bg-surface border border-border rounded-xl text-xs font-extrabold text-text"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-text-muted block mb-1">Stone / Dust (g)</label>
                        <input
                          type="number"
                          step="0.001"
                          placeholder="0.000"
                          value={oldStoneWeight}
                          onChange={(e) => setOldStoneWeight(e.target.value)}
                          className="w-full p-2 bg-surface border border-border rounded-xl text-xs font-semibold text-text"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-text-muted block mb-1">Purity (%)</label>
                        <input
                          type="number"
                          step="0.1"
                          placeholder="e.g. 91.6"
                          value={oldPurityPercent}
                          onChange={(e) => setOldPurityPercent(e.target.value)}
                          className="w-full p-2 bg-surface border border-border rounded-xl text-xs font-extrabold text-amber-600"
                        />
                      </div>
                    </div>

                    {/* Purity Quick Chips */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className="text-text-muted font-semibold mr-1">Presets:</span>
                      {oldMetalType === 'GOLD' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setOldPurityPercent('99.9')}
                            className="px-2 py-0.5 rounded bg-surface border border-border hover:bg-amber-500/20 font-medium"
                          >
                            24K (99.9%)
                          </button>
                          <button
                            type="button"
                            onClick={() => setOldPurityPercent('91.6')}
                            className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-700 font-bold"
                          >
                            22K (91.6%)
                          </button>
                          <button
                            type="button"
                            onClick={() => setOldPurityPercent('75.0')}
                            className="px-2 py-0.5 rounded bg-surface border border-border hover:bg-amber-500/20 font-medium"
                          >
                            18K (75%)
                          </button>
                          <button
                            type="button"
                            onClick={() => setOldPurityPercent('58.5')}
                            className="px-2 py-0.5 rounded bg-surface border border-border hover:bg-amber-500/20 font-medium"
                          >
                            14K (58.5%)
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => setOldPurityPercent('92.5')}
                            className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-700 font-bold"
                          >
                            Sterling (92.5%)
                          </button>
                          <button
                            type="button"
                            onClick={() => setOldPurityPercent('99.9')}
                            className="px-2 py-0.5 rounded bg-surface border border-border hover:bg-amber-500/20 font-medium"
                          >
                            Pure (99.9%)
                          </button>
                        </>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="text-[11px] font-semibold text-text-muted block mb-1">
                          Today's Metal Rate (₹/g)
                        </label>
                        <input
                          type="number"
                          value={spotRatePerGram}
                          onChange={(e) => setSpotRatePerGram(e.target.value)}
                          className="w-full p-2 bg-surface border border-border rounded-xl text-xs font-extrabold text-amber-600"
                        />
                      </div>
                      <div className="p-3 bg-surface rounded-xl border border-border flex flex-col justify-center">
                        <span className="text-[10px] uppercase font-bold text-text-muted">Actual Fine Metal Yield</span>
                        <span className="text-sm font-extrabold text-amber-600">
                          {fineGrams.toFixed(3)} grams pure {oldMetalType.toLowerCase()}
                        </span>
                      </div>
                    </div>

                    {/* Old Metal Valuation Suggestion Box */}
                    {oldMetalValuation > 0 && (
                      <div className="p-4 rounded-xl bg-amber-500/15 border border-amber-500/30 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-amber-800">Trade-in Credit Valuation</span>
                          <span className="font-extrabold text-base text-amber-900">
                            -₹{oldMetalValuation.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="text-[11px] text-amber-800/80">
                          Formula: {oldNetWeight.toFixed(3)}g net × {purityPctNum}% purity = {fineGrams.toFixed(3)}g fine × ₹{rateNum}/g = ₹{oldMetalValuation.toLocaleString('en-IN')}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Net Settlement Difference Banner */}
              {isExchangeActive && oldMetalValuation > 0 && (
                <div
                  className={`p-4 rounded-2xl border flex items-center justify-between ${
                    netDifference > 0
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800'
                      : netDifference < 0
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-800'
                      : 'bg-stone-500/10 border-stone-500/30 text-stone-800'
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider block">
                      {netDifference > 0
                        ? 'Customer Net Payable Difference'
                        : netDifference < 0
                        ? 'Store Refunds Balance to Customer'
                        : 'Exact Trade-in (Zero Difference)'}
                    </span>
                    <div className="text-2xl font-black mt-0.5">
                      ₹{Math.abs(netDifference).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div className="text-right text-xs text-text-muted">
                    <div>New: ₹{sellingPriceNum.toLocaleString('en-IN')}</div>
                    <div>Old: -₹{oldMetalValuation.toLocaleString('en-IN')}</div>
                  </div>
                </div>
              )}

              {/* Live Profit Analysis Box */}
              {stats && (
                <div className={`p-5 rounded-2xl border ${getStatusColor(stats.status)} space-y-3`}>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {stats.status === 'loss' ? '🚨 Capital Erosion Alert' : '💎 Settlement Yield'}
                    </span>
                    <span className="text-2xl font-extrabold tracking-tight">
                      {stats.profit >= 0 ? '+' : ''}₹{stats.profit.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="p-2.5 bg-white/40 rounded-xl border border-current/10">
                      <span className="text-[10px] font-bold uppercase block opacity-70">Return Velocity (ROI)</span>
                      <span className="text-base font-extrabold">{stats.profitPercent.toFixed(1)}%</span>
                    </div>
                    <div className="p-2.5 bg-white/40 rounded-xl border border-current/10">
                      <span className="text-[10px] font-bold uppercase block opacity-70">Portfolio Margin</span>
                      <span className="text-base font-extrabold">{stats.profitMargin.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Customer Dossier & Payment Form */}
              <div className="space-y-4 pt-2 border-t border-border/60">
                <CustomerOmniSelector
                  selectedCustomer={selectedCustomer}
                  onSelectCustomer={(cust) => {
                    setSelectedCustomer(cust);
                    if (cust) {
                      setCustomerName(cust.name);
                      setCustomerPhone(cust.phone);
                    }
                  }}
                  title="Buyer Identity & CRM Profile"
                  required={false}
                />

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
                    <option value="CREDIT">Store Credit Ledger</option>
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
          <div className="text-center text-white space-y-4 animate-in zoom-in-95 max-w-md bg-stone-900/90 p-8 rounded-3xl border border-white/20">
            <CheckCircle2 className="w-20 h-20 mx-auto animate-bounce text-emerald-400" />
            <h2 className="text-3xl font-extrabold uppercase tracking-tight">TRANSACTION COMMITTED</h2>
            <div className="space-y-1 text-sm opacity-90">
              <p>Invoice: <span className="font-mono font-bold">{confirmationData?.invoiceNo}</span></p>
              <p>Final Settled: <span className="font-bold">₹{confirmationData?.paidRupees?.toLocaleString('en-IN')}</span></p>
            </div>
            <p className="text-xs opacity-70">
              Registry status synchronized with database. Stock status updated to SOLD and payment logged to cashbook.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
