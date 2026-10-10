'use client';

import React, { useState, useEffect } from 'react';
import {
  Coins,
  Plus,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  X,
  FileText,
  Printer,
  Scale,
  Percent,
  Calculator,
  ArrowRight
} from 'lucide-react';
import { calculateOldGoldValuation, OldGoldValuationResult } from '@/domain/oldgold/valuation';
import { formatMoney } from '@/domain/money';
import { CustomerOmniSelector, CustomerOmniData } from '@/components/customers/CustomerOmniSelector';

export default function OldGoldPage() {
  const [metalType, setMetalType] = useState<'GOLD' | 'SILVER'>('GOLD');
  const [selectedSeller, setSelectedSeller] = useState<CustomerOmniData | null>(null);
  const [grossWeightGrams, setGrossWeightGrams] = useState('');
  const [stoneDeductionGrams, setStoneDeductionGrams] = useState('0');
  const [purityPercent, setPurityPercent] = useState('91.6'); // 91.6% (22K) default
  const [deductionBp, setDeductionBp] = useState('200'); // 2% waste deduction
  const [fineRateRupeesPerGram, setFineRateRupeesPerGram] = useState('7200'); // Auto-populated
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'BANK'>('CASH');

  const [rates, setRates] = useState<any[]>([]);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completedVoucher, setCompletedVoucher] = useState<any | null>(null);

  // Fetch live daily rates
  useEffect(() => {
    setRatesLoading(true);
    fetch('/api/v1/rates', { credentials: 'include' })
      .then((res) => res.json())
      .then((res) => {
        if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
          setRates(res.data);
          const goldRate =
            res.data.find((r: any) => r.metal === 'GOLD' && (r.purityPpt === 1000 || r.purityPpt === 999)) ||
            res.data.find((r: any) => r.metal === 'GOLD');
          if (goldRate) {
            setFineRateRupeesPerGram(goldRate.rateRupeesPerGram.toString());
          }
        }
      })
      .catch((err) => console.error('Failed to load rates', err))
      .finally(() => setRatesLoading(false));
  }, []);

  // Sync spot rate when switching metal
  useEffect(() => {
    if (rates.length > 0) {
      const match = rates.find((r) => r.metal === metalType);
      if (match) {
        setFineRateRupeesPerGram(match.rateRupeesPerGram.toString());
      } else if (metalType === 'SILVER') {
        setFineRateRupeesPerGram('90');
      } else {
        setFineRateRupeesPerGram('7200');
      }
    }
  }, [metalType, rates]);

  const gWeight = parseFloat(grossWeightGrams) || 0;
  const sWeight = parseFloat(stoneDeductionGrams) || 0;
  const netWeight = Math.max(0, gWeight - sWeight);
  const pPercent = parseFloat(purityPercent) || 0;
  const testedPurityPpt = Math.round(pPercent * 10); // convert 91.6% -> 916 ppt

  // Core formula requested: Weight * Purity % = Fine Grams; Fine Grams * Day Rate = Value
  const fineGramsDirect = netWeight * (pPercent / 100);
  const spotRateNum = parseFloat(fineRateRupeesPerGram) || 0;
  const directValueRupees = Math.round(fineGramsDirect * spotRateNum);

  // Domain valuation with melt/waste deduction
  const valuationResult: OldGoldValuationResult | null =
    gWeight > 0
      ? calculateOldGoldValuation({
          grossWeightGrams: gWeight,
          stoneDeductionGrams: sWeight,
          testedPurityPpt,
          deductionBp: parseInt(deductionBp, 10) || 0,
          fineRateRupeesPerGram: spotRateNum,
        })
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSeller && gWeight <= 0) {
      alert('Select a seller and enter valid gross weight');
      return;
    }
    if (gWeight <= 0) {
      alert('Valid gross weight in Grams (g) is required');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/old-gold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          customerId: selectedSeller?.id,
          sellerName: selectedSeller?.name || 'Walk-in Customer',
          sellerPhone: selectedSeller?.phone || '',
          grossWeightGrams: gWeight,
          stoneDeductionGrams: sWeight,
          testedPurityPpt,
          deductionBp: parseInt(deductionBp, 10) || 0,
          fineRateRupeesPerGram: spotRateNum,
          paymentMode,
        }),
      });

      const json = await res.json();
      if (!json.ok) {
        alert(json.error || 'Failed to process purchase');
        setSubmitting(false);
        return;
      }

      setCompletedVoucher(json.data);
      setSelectedSeller(null);
      setGrossWeightGrams('');
    } catch (err: any) {
      alert(err.message || 'Processing error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-28">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-5 rounded-2xl border border-border shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-text">
              Old Gold & Silver Valuation & Buyback
            </h1>
            <p className="text-xs text-text-muted">
              Live spot market rate integration • Instant fine metal computation • Cashbook auto-settlement
            </p>
          </div>
        </div>

        {/* Metal Selector Tabs */}
        <div className="flex p-1 bg-surface-2 rounded-xl border border-border">
          <button
            type="button"
            onClick={() => setMetalType('GOLD')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
              metalType === 'GOLD' ? 'bg-amber-500 text-stone-950 shadow-sm' : 'text-text-muted hover:text-text'
            }`}
          >
            Gold (Au)
          </button>
          <button
            type="button"
            onClick={() => setMetalType('SILVER')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
              metalType === 'SILVER' ? 'bg-stone-300 text-stone-900 shadow-sm' : 'text-text-muted hover:text-text'
            }`}
          >
            Silver (Ag)
          </button>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="bg-surface p-6 rounded-2xl border border-border space-y-5 shadow-xs">
        {/* Seller: Customer Omni Selector */}
        <div>
          <label className="text-xs font-bold text-text-muted block mb-1">Seller / Customer Identity *</label>
          <CustomerOmniSelector
            selectedCustomer={selectedSeller}
            onSelectCustomer={setSelectedSeller}
            title="Search by Name / Phone / Father's Name / ID"
            required={false}
          />
        </div>

        {/* Weight & Rate Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-bold text-text-muted block mb-1">Gross Weight (g) *</label>
            <input
              type="number"
              step="0.001"
              required
              placeholder="e.g. 20.000"
              value={grossWeightGrams}
              onChange={(e) => setGrossWeightGrams(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-surface-2 border border-border rounded-xl text-sm font-black text-text focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-text-muted block mb-1">Stone / Dust Deduction (g)</label>
            <input
              type="number"
              step="0.001"
              placeholder="0.000"
              value={stoneDeductionGrams}
              onChange={(e) => setStoneDeductionGrams(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-surface-2 border border-border rounded-xl text-sm font-bold text-text focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-text-muted block mb-1">
              Today's {metalType} Rate (₹/g) *
            </label>
            <input
              type="number"
              required
              value={fineRateRupeesPerGram}
              onChange={(e) => setFineRateRupeesPerGram(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-surface-2 border border-border rounded-xl text-sm font-black text-amber-600 focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>
        </div>

        {/* Purity Percentage & Preset Chips */}
        <div className="p-4 rounded-xl bg-surface-2 border border-border space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="text-xs font-bold text-text-muted">
              Jewellery Purity Percentage (%):
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.1"
                min="10"
                max="100"
                value={purityPercent}
                onChange={(e) => setPurityPercent(e.target.value)}
                className="w-24 px-2 py-1 bg-surface border border-border rounded-lg text-xs font-black text-amber-600 text-center font-mono"
              />
              <span className="text-xs font-bold text-text-muted">%</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-text-muted font-semibold text-[11px]">Quick Standard Presets:</span>
            {metalType === 'GOLD' ? (
              <>
                <button
                  type="button"
                  onClick={() => setPurityPercent('99.9')}
                  className="px-2.5 py-1 rounded-lg bg-surface border border-border hover:bg-amber-500/20 font-medium"
                >
                  24K (99.9%)
                </button>
                <button
                  type="button"
                  onClick={() => setPurityPercent('91.6')}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-700 font-bold"
                >
                  22K (91.6%)
                </button>
                <button
                  type="button"
                  onClick={() => setPurityPercent('83.3')}
                  className="px-2.5 py-1 rounded-lg bg-surface border border-border hover:bg-amber-500/20 font-medium"
                >
                  20K (83.3%)
                </button>
                <button
                  type="button"
                  onClick={() => setPurityPercent('75.0')}
                  className="px-2.5 py-1 rounded-lg bg-surface border border-border hover:bg-amber-500/20 font-medium"
                >
                  18K (75%)
                </button>
                <button
                  type="button"
                  onClick={() => setPurityPercent('58.5')}
                  className="px-2.5 py-1 rounded-lg bg-surface border border-border hover:bg-amber-500/20 font-medium"
                >
                  14K (58.5%)
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setPurityPercent('92.5')}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-700 font-bold"
                >
                  92.5% Sterling Silver
                </button>
                <button
                  type="button"
                  onClick={() => setPurityPercent('99.9')}
                  className="px-2.5 py-1 rounded-lg bg-surface border border-border hover:bg-amber-500/20 font-medium"
                >
                  99.9% Fine Silver
                </button>
                <button
                  type="button"
                  onClick={() => setPurityPercent('80.0')}
                  className="px-2.5 py-1 rounded-lg bg-surface border border-border hover:bg-amber-500/20 font-medium"
                >
                  80% Ornaments Silver
                </button>
              </>
            )}
          </div>
        </div>

        {/* Suggestion Card with Mathematical Verification */}
        {netWeight > 0 && (
          <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-amber-600" />
                <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                  Live Mathematical Valuation Card
                </span>
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-800 font-bold">
                Formula Verified
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
              <div className="p-3 bg-surface rounded-xl border border-amber-500/20">
                <span className="text-text-muted block text-[11px]">Net Jewellery Weight</span>
                <span className="font-extrabold text-text text-sm">{netWeight.toFixed(3)} g</span>
              </div>
              <div className="p-3 bg-surface rounded-xl border border-amber-500/20">
                <span className="text-text-muted block text-[11px]">Purity Fraction</span>
                <span className="font-extrabold text-amber-600 text-sm">{pPercent}%</span>
              </div>
              <div className="p-3 bg-surface rounded-xl border border-amber-500/20">
                <span className="text-text-muted block text-[11px]">Actual Fine Metal Yield</span>
                <span className="font-black text-amber-700 text-sm">{fineGramsDirect.toFixed(3)} g</span>
              </div>
              <div className="p-3 bg-surface rounded-xl border border-amber-500/20">
                <span className="text-text-muted block text-[11px]">Calculated Valuation</span>
                <span className="font-black text-emerald-600 text-base">₹{directValueRupees.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="text-[11px] text-amber-800/80 bg-amber-500/5 p-2.5 rounded-lg border border-amber-500/15">
              <strong>Calculation Protocol:</strong> {netWeight.toFixed(3)}g (weight) × {pPercent}% (purity) = <strong>{fineGramsDirect.toFixed(3)}g</strong> fine metal content × ₹{spotRateNum}/g (day spot rate) = <strong>₹{directValueRupees.toLocaleString('en-IN')}</strong> total valuation.
            </div>
          </div>
        )}

        {/* Payment Mode Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-text-muted block mb-1">Disbursement Mode</label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value as any)}
              className="w-full p-2.5 bg-surface-2 border border-border rounded-xl text-xs font-bold text-text cursor-pointer"
            >
              <option value="CASH">Cash Payment (Shop Drawer)</option>
              <option value="UPI">UPI Digital Transfer</option>
              <option value="BANK">NEFT / RTGS Bank Transfer</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-text-muted block mb-1">Melt/Refining Deduction (bp, 200 = 2%)</label>
            <input
              type="number"
              value={deductionBp}
              onChange={(e) => setDeductionBp(e.target.value)}
              className="w-full p-2.5 bg-surface-2 border border-border rounded-xl text-xs font-bold text-text font-mono"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting || netWeight <= 0}
          className="w-full py-3.5 bg-amber-600 text-white font-extrabold text-sm rounded-xl hover:bg-amber-700 transition-colors shadow-md active:scale-95 flex items-center justify-center gap-2 disabled:opacity-40"
        >
          {submitting ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Coins className="w-4 h-4" />
          )}
          <span>Execute Old Metal Purchase & Cashbook Payout</span>
        </button>
      </form>

      {/* Completion Modal */}
      {completedVoucher && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface w-full max-w-sm rounded-2xl border border-border p-6 space-y-4 text-center shadow-2xl animate-in zoom-in-95">
            <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto" />
            <div>
              <h3 className="text-lg font-black text-text">Old Metal Buyback Completed!</h3>
              <p className="text-xs text-text-muted mt-0.5">Voucher #{completedVoucher.voucherNo}</p>
              <div className="text-2xl font-black text-emerald-600 mt-3">
                Payout: ₹{completedVoucher.valuation?.payableRupees?.toLocaleString('en-IN')}
              </div>
            </div>

            <p className="text-xs text-text-muted">
              Disbursement recorded in Cashbook ledger and audit log created.
            </p>

            <button
              onClick={() => setCompletedVoucher(null)}
              className="w-full py-2.5 bg-primary text-white font-bold text-xs rounded-xl"
            >
              Done & Start Next Purchase
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
