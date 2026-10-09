// Implements: 06_ADDENDUM_SUGGESTION_CALCULATORS §3 (Calculator A - Lending Advisor)
// Pure domain calculator for safe loan suggestions with interest cushions

import { gramsToMg, mgToGrams } from '../weight';
import { rupeesToPaise, paiseToRupees, roundHalfUp } from '../money';

export interface LendingAdvisorItemInput {
  grossWeightGrams: number;
  stoneDeductionGrams?: number;
  testedPurityPpt: number; // 0..1000 (e.g. 916 for 22K)
  fineRateRupeesPerGram: number; // Daily buy rate for 24K fine metal
}

export interface LendingAdvisorInput {
  items: LendingAdvisorItemInput[];
  safetyBp?: number; // default 5000 (50% = divide by 2)
  monthlyInterestPct?: number; // e.g. 1.5 for 1.5%/month
  roundStepRupees?: number; // default 100
}

export interface CushionOption {
  months: number;
  interestCutRupees: number;
  suggestedLoanMethodA: number;
  suggestedLoanMethodB: number;
}

export interface LendingAdvisorResult {
  marketValueRupees: number;
  safeValueRupees: number;
  safetyPct: number;
  cushions: {
    cushion12Months: CushionOption;
    cushion18Months: CushionOption;
    cushion24Months: CushionOption;
  };
  defaultSuggestedLoanRupees: number; // 12-month cushion Method A
}

export function calculateLendingAdvisor(input: LendingAdvisorInput): LendingAdvisorResult {
  const safetyBp = input.safetyBp ?? 5000;
  const monthlyRate = (input.monthlyInterestPct ?? 1.5) / 100;
  const step = input.roundStepRupees ?? 100;

  // 1. Calculate total market value
  let totalMarketValueRupees = 0;
  for (const item of input.items) {
    const netGrams = Math.max(0, item.grossWeightGrams - (item.stoneDeductionGrams || 0));
    const fineGrams = (netGrams * item.testedPurityPpt) / 1000;
    const itemValue = fineGrams * item.fineRateRupeesPerGram;
    totalMarketValueRupees += itemValue;
  }

  // 2. Safe Value = Market Value * safetyBp / 10000
  const safeValueRupees = Math.round((totalMarketValueRupees * safetyBp) / 10000);

  const calculateCushion = (months: number): CushionOption => {
    // Method A: lend = safeValue - interest(safeValue, months)
    const interestRateTotal = monthlyRate * months;
    const interestCutRupees = Math.round(safeValueRupees * interestRateTotal);
    const lendA = Math.max(0, safeValueRupees - interestCutRupees);

    // Method B (stricter): lend + interest(lend, months) = safeValue  =>  lend = safeValue / (1 + rateTotal)
    const lendB = Math.max(0, Math.round(safeValueRupees / (1 + interestRateTotal)));

    const suggestedA = Math.floor(lendA / step) * step;
    const suggestedB = Math.floor(lendB / step) * step;

    return {
      months,
      interestCutRupees,
      suggestedLoanMethodA: suggestedA,
      suggestedLoanMethodB: suggestedB,
    };
  };

  const cushion12 = calculateCushion(12);
  const cushion18 = calculateCushion(18);
  const cushion24 = calculateCushion(24);

  return {
    marketValueRupees: Math.round(totalMarketValueRupees),
    safeValueRupees,
    safetyPct: safetyBp / 100,
    cushions: {
      cushion12Months: cushion12,
      cushion18Months: cushion18,
      cushion24Months: cushion24,
    },
    defaultSuggestedLoanRupees: cushion12.suggestedLoanMethodA,
  };
}
