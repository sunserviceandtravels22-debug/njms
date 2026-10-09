'use client';

import React, { useState } from 'react';
import { Sparkles, Check, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { formatMoney } from '@/domain/money';

interface LendingAdvisorCardProps {
  grossWeightGrams: number;
  testedPurityPpt?: number;
  fineRateRupeesPerGram?: number;
  onApplySuggested: (amountRupees: number) => void;
}

export const LendingAdvisorCard: React.FC<LendingAdvisorCardProps> = ({
  grossWeightGrams,
  testedPurityPpt = 916,
  fineRateRupeesPerGram = 7000,
  onApplySuggested,
}) => {
  const [cushionMonths, setCushionMonths] = useState<12 | 18 | 24>(12);
  const [expanded, setExpanded] = useState(false);

  const netGrams = grossWeightGrams;
  const fineGrams = (netGrams * testedPurityPpt) / 1000;
  const marketValueRupees = Math.round(fineGrams * fineRateRupeesPerGram);
  const safeValueRupees = Math.round(marketValueRupees * 0.5); // 50% safety

  const monthlyRatePct = 1.5; // 1.5%/month
  const interestTotalPct = (monthlyRatePct * cushionMonths) / 100;
  const interestCutRupees = Math.round(safeValueRupees * interestTotalPct);
  const suggestedLoanRupees = Math.floor(Math.max(0, safeValueRupees - interestCutRupees) / 100) * 100;

  if (!grossWeightGrams || grossWeightGrams <= 0) return null;

  return (
    <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl space-y-3 shadow-2xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
          <Sparkles className="w-4 h-4 text-primary" />
          <span>Lending Advisor (Safe Loan Calculation)</span>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-text-muted hover:text-text p-1"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      <div className="flex items-center justify-between bg-surface p-3 rounded-xl border border-border">
        <div>
          <div className="text-xs text-text-muted font-medium">
            Suggested Loan ({cushionMonths}m cushion)
          </div>
          <div className="text-lg font-black text-primary">
            ₹{suggestedLoanRupees.toLocaleString('en-IN')}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onApplySuggested(suggestedLoanRupees)}
          className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary-dark transition-colors shadow-2xs active:scale-95"
        >
          <Check className="w-4 h-4" />
          <span>Use ₹{suggestedLoanRupees.toLocaleString('en-IN')}</span>
        </button>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {([12, 18, 24] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setCushionMonths(m)}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
              cushionMonths === m
                ? 'bg-primary text-white'
                : 'bg-surface-2 text-text-muted border border-border'
            }`}
          >
            {m / 12} Year ({m}m)
          </button>
        ))}
      </div>

      {expanded && (
        <div className="p-3 bg-surface rounded-xl border border-border text-xs space-y-1.5 pt-2">
          <div className="flex justify-between text-text-muted">
            <span>Market Gold Value (24K ₹{fineRateRupeesPerGram.toLocaleString()}/g)</span>
            <span className="font-bold text-text">₹{marketValueRupees.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-text-muted">
            <span>Safety Division (50% of market value)</span>
            <span className="font-bold text-text">₹{safeValueRupees.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-rose-600 font-medium">
            <span>Minus {cushionMonths} months interest cut (1.5%/mo)</span>
            <span>-₹{interestCutRupees.toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
};
