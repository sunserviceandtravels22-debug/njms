import { describe, it, expect } from 'vitest';
import { calculateOldGoldValuation } from './valuation';

describe('Old Gold Valuation Domain Engine (O1 - 05_ADDENDUM_MODULES §3.5)', () => {
  it('O1: Correctly calculates old gold valuation with Rupees & Grams inputs and outputs', () => {
    const result = calculateOldGoldValuation({
      grossWeightGrams: 20.0,
      stoneDeductionGrams: 0.5,
      testedPurityPpt: 900, // 90.0% purity
      deductionBp: 200,      // 2% waste deduction (200 bp)
      fineRateRupeesPerGram: 7000, // ₹7,000/g fine buy rate
    });

    // Net weight: 20.000g - 0.500g = 19.500g (19,500 mg)
    expect(result.netWeightGrams).toBe(19.5);
    expect(result.netWeightMg).toBe(19500);

    // Fine weight: 19,500 * 900 / 1000 = 17,550 mg (17.550g)
    expect(result.fineWeightGrams).toBe(17.55);
    expect(result.fineMg).toBe(17550);

    // Fine net weight after 2% (200 bp) deduction: 17,550 * (10000 - 200)/10000 = 17,199 mg (17.199g)
    expect(result.fineNetGrams).toBe(17.199);
    expect(result.fineNetMg).toBe(17199);

    // Value: 17,199 mg * ₹7,000/g / 1000 = ₹1,20,393.00 (12,039,300 paise)
    expect(result.valuationRupees).toBe(120393);
    expect(result.valuationPaise).toBe(BigInt(12039300));
    expect(result.payableRupees).toBe(120393);
  });
});
