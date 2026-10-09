// Implements: 05_ADDENDUM_MODULES §3.4 Valuation Formula
// Storage in integer paise & milligrams; UI input in Rupees (₹) and Grams (g)

import { gramsToMg, mgToGrams } from '../weight';
import { rupeesToPaise, paiseToRupees, roundHalfUp } from '../money';

export interface OldGoldValuationInput {
  grossWeightGrams: number;
  stoneDeductionGrams?: number;
  otherDeductionGrams?: number;
  testedPurityPpt: number; // 0..1000 (e.g., 900 for 90% purity)
  deductionBp: number;     // basis points (e.g., 200 for 2%)
  fineRateRupeesPerGram: number; // Fine rate in ₹/g (e.g., 7000)
  adjustmentRupees?: number;     // Adjustment against POS sale/credit/girvi in ₹
}

export interface OldGoldValuationResult {
  grossWeightMg: number;
  stoneDeductionMg: number;
  otherDeductionMg: number;
  netWeightMg: number;
  fineMg: number;
  fineNetMg: number;
  valuationPaise: bigint;
  adjustmentPaise: bigint;
  payablePaise: bigint;

  // Formatted helpers for display in Rupees & Grams
  grossWeightGrams: number;
  netWeightGrams: number;
  fineWeightGrams: number;
  fineNetGrams: number;
  valuationRupees: number;
  payableRupees: number;
}

export function calculateOldGoldValuation(input: OldGoldValuationInput): OldGoldValuationResult {
  const grossMg = gramsToMg(input.grossWeightGrams);
  const stoneMg = input.stoneDeductionGrams ? gramsToMg(input.stoneDeductionGrams) : 0;
  const otherMg = input.otherDeductionGrams ? gramsToMg(input.otherDeductionGrams) : 0;

  const netMg = Math.max(0, grossMg - stoneMg - otherMg);

  // fineMg = round(net * testedPurityPpt / 1000)
  const fineMg = roundHalfUp((netMg * input.testedPurityPpt) / 1000);

  // fineNet = round(fineMg * (10000 - deductionBp) / 10000)
  const fineNetMg = roundHalfUp((fineMg * (10000 - input.deductionBp)) / 10000);

  // fineRate in paise per gram (e.g. ₹7,000/g = 700,000 paise/g)
  const ratePaisePerGram = rupeesToPaise(input.fineRateRupeesPerGram);

  // value = round(fineNet * fineRatePaisePerGram / 1000)
  const valuePaiseNum = roundHalfUp((fineNetMg * Number(ratePaisePerGram)) / 1000);
  const valuationPaise = BigInt(valuePaiseNum);

  const adjustmentPaise = input.adjustmentRupees ? rupeesToPaise(input.adjustmentRupees) : BigInt(0);

  // Round payable to nearest ₹1 (100 paise)
  const rawPayable = valuationPaise - adjustmentPaise;
  const payableRupeesRounded = Math.round(paiseToRupees(rawPayable));
  const payablePaise = rupeesToPaise(payableRupeesRounded);

  return {
    grossWeightMg: grossMg,
    stoneDeductionMg: stoneMg,
    otherDeductionMg: otherMg,
    netWeightMg: netMg,
    fineMg,
    fineNetMg,
    valuationPaise,
    adjustmentPaise,
    payablePaise,

    grossWeightGrams: mgToGrams(grossMg),
    netWeightGrams: mgToGrams(netMg),
    fineWeightGrams: mgToGrams(fineMg),
    fineNetGrams: mgToGrams(fineNetMg),
    valuationRupees: paiseToRupees(valuationPaise),
    payableRupees: payableRupeesRounded,
  };
}
