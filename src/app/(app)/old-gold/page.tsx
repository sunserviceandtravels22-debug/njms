'use client';

import React, { useState } from 'react';
import {
  Coins,
  Plus,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  X,
  FileText,
  Printer,
} from 'lucide-react';
import { calculateOldGoldValuation, OldGoldValuationResult } from '@/domain/oldgold/valuation';
import { formatMoney } from '@/domain/money';

export default function OldGoldPage() {
  const [sellerName, setSellerName] = useState('');
  const [sellerPhone, setSellerPhone] = useState('');
  const [grossWeightGrams, setGrossWeightGrams] = useState('');
  const [stoneDeductionGrams, setStoneDeductionGrams] = useState('0');
  const [testedPurityPpt, setTestedPurityPpt] = useState('900'); // 90% purity
  const [deductionBp, setDeductionBp] = useState('200'); // 2% waste deduction
  const [fineRateRupeesPerGram, setFineRateRupeesPerGram] = useState('7000'); // ₹7,000/g
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'BANK'>('CASH');

  const [submitting, setSubmitting] = useState(false);
  const [completedVoucher, setCompletedVoucher] = useState<any | null>(null);

  const gWeight = parseFloat(grossWeightGrams) || 0;
  const valuationResult: OldGoldValuationResult | null = gWeight > 0 ? calculateOldGoldValuation({
    grossWeightGrams: gWeight,
    stoneDeductionGrams: parseFloat(stoneDeductionGrams) || 0,
    testedPurityPpt: parseInt(testedPurityPpt, 10) || 900,
    deductionBp: parseInt(deductionBp, 10) || 200,
    fineRateRupeesPerGram: parseFloat(fineRateRupeesPerGram) || 7000,
  }) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellerName.trim() || gWeight <= 0) {
      alert('Seller name and valid gross weight in Grams (g) are required');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/old-gold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sellerName: sellerName.trim(),
          sellerPhone: sellerPhone.trim(),
          grossWeightGrams: gWeight,
          stoneDeductionGrams: parseFloat(stoneDeductionGrams) || 0,
          testedPurityPpt: parseInt(testedPurityPpt, 10) || 900,
          deductionBp: parseInt(deductionBp, 10) || 200,
          fineRateRupeesPerGram: parseFloat(fineRateRupeesPerGram) || 7000,
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
      setSellerName('');
      setSellerPhone('');
      setGrossWeightGrams('');
    } catch (err: any) {
      alert(err.message || 'Processing error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 bg-surface p-4 rounded-2xl border border-border shadow-2xs">
        <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl">
          <Coins className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-text">Old Gold Purchase & Valuation</h1>
          <p className="text-xs text-text-muted">Pure domain valuation engine with weights in Grams (g) & payouts in Rupees (₹)</p>
        </div>
      </div>

      {/* Main Wizard Form */}
      <form onSubmit={handleSubmit} className="bg-surface p-5 rounded-2xl border border-border space-y-4 shadow-2xs">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-text-muted block mb-1">Seller Full Name</label>
            <input
              type="text"
              required
              placeholder="Seller Name"
              value={sellerName}
              onChange={(e) => setSellerName(e.target.value)}
              className="w-full px-3 py-2 bg-surface-2 border border-border rounded-xl text-xs font-semibold text-text focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-text-muted block mb-1">Seller Mobile Number</label>
            <input
              type="tel"
              placeholder="10-digit Phone"
              value={sellerPhone}
              onChange={(e) => setSellerPhone(e.target.value)}
              className="w-full px-3 py-2 bg-surface-2 border border-border rounded-xl text-xs font-semibold text-text focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-semibold text-text-muted block mb-1">Gross Weight in Grams (g)</label>
            <input
              type="number"
              step="0.001"
              required
              placeholder="e.g. 20.000"
              value={grossWeightGrams}
              onChange={(e) => setGrossWeightGrams(e.target.value)}
              className="w-full px-3 py-2 bg-surface-2 border border-border rounded-xl text-sm font-extrabold text-text focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-text-muted block mb-1">Stone Deduction in Grams (g)</label>
            <input
              type="number"
              step="0.001"
              placeholder="0.000"
              value={stoneDeductionGrams}
              onChange={(e) => setStoneDeductionGrams(e.target.value)}
              className="w-full px-3 py-2 bg-surface-2 border border-border rounded-xl text-sm font-extrabold text-text focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-text-muted block mb-1">24K Fine Buy Rate in Rupees (₹/g)</label>
            <input
              type="number"
              required
              value={fineRateRupeesPerGram}
              onChange={(e) => setFineRateRupeesPerGram(e.target.value)}
              className="w-full px-3 py-2 bg-surface-2 border border-border rounded-xl text-sm font-extrabold text-amber-600 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-text-muted block mb-1">Tested Purity (ppt, 900 = 90%)</label>
            <input
              type="number"
              value={testedPurityPpt}
              onChange={(e) => setTestedPurityPpt(e.target.value)}
              className="w-full px-3 py-2 bg-surface-2 border border-border rounded-xl text-xs font-bold text-text"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-text-muted block mb-1">Melt/Waste Deduction (bp, 200 = 2%)</label>
            <input
              type="number"
              value={deductionBp}
              onChange={(e) => setDeductionBp(e.target.value)}
              className="w-full px-3 py-2 bg-surface-2 border border-border rounded-xl text-xs font-bold text-text"
            />
          </div>
        </div>

        {/* Valuation Result Breakdown Card */}
        {valuationResult && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Live Valuation Breakdown</span>
              <Sparkles className="w-4 h-4 text-amber-600" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
              <div>
                <span className="text-text-muted block">Net Weight</span>
                <span className="font-extrabold text-text">{valuationResult.netWeightGrams.toFixed(3)} g</span>
              </div>
              <div>
                <span className="text-text-muted block">Fine Gold Net</span>
                <span className="font-extrabold text-amber-600">{valuationResult.fineNetGrams.toFixed(3)} g</span>
              </div>
              <div>
                <span className="text-text-muted block">Valuation Total</span>
                <span className="font-extrabold text-text">₹{valuationResult.valuationRupees.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-text-muted block">Payable Cash</span>
                <span className="font-black text-emerald-600 text-sm">₹{valuationResult.payableRupees.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !valuationResult}
          className="w-full py-3 bg-amber-600 text-white font-extrabold text-sm rounded-xl hover:bg-amber-700 transition-colors shadow-md active:scale-95 flex items-center justify-center gap-2"
        >
          {submitting ? 'Processing Payout...' : 'Complete Old Gold Purchase & Cash Payout'}
        </button>
      </form>

      {/* Completion Modal */}
      {completedVoucher && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface w-full max-w-sm rounded-2xl border border-border p-5 space-y-4 text-center shadow-2xl animate-in zoom-in-95">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <div>
              <h3 className="text-lg font-black text-text">Old Gold Voucher Created!</h3>
              <p className="text-xs text-text-muted">Voucher #{completedVoucher.voucherNo}</p>
              <div className="text-xl font-black text-emerald-600 mt-2">
                Payout: ₹{completedVoucher.valuation?.payableRupees?.toLocaleString('en-IN')}
              </div>
            </div>

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
