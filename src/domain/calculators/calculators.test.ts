import { describe, it, expect } from 'vitest';
import { calculateLendingAdvisor } from './lendingAdvisor';
import { calculateRedemptionAdvisor } from './redemptionAdvisor';

describe('Suggestion Calculators Domain Engines (06_ADDENDUM_SUGGESTION_CALCULATORS)', () => {
  it('Calculator A (Lending Advisor): Calculates safe loan correctly (L1 golden test case)', () => {
    // 10.000 g net, market rate ₹10,000/g, safety 50%, simple 2%/month
    const result = calculateLendingAdvisor({
      items: [
        {
          grossWeightGrams: 10.0,
          testedPurityPpt: 1000,
          fineRateRupeesPerGram: 10000,
        },
      ],
      safetyBp: 5000, // 50%
      monthlyInterestPct: 2.0, // 2% per month
    });

    expect(result.marketValueRupees).toBe(100000);
    expect(result.safeValueRupees).toBe(50000);

    // 12 months cushion: Method A = 50,000 - (50,000 * 0.24) = 38,000
    expect(result.cushions.cushion12Months.suggestedLoanMethodA).toBe(38000);

    // 18 months cushion: Method A = 50,000 - (50,000 * 0.36) = 32,000
    expect(result.cushions.cushion18Months.suggestedLoanMethodA).toBe(32000);

    // 24 months cushion: Method A = 50,000 - (50,000 * 0.48) = 26,000
    expect(result.cushions.cushion24Months.suggestedLoanMethodA).toBe(26000);
  });

  it('Calculator B (Redemption Advisor): Calculates timeline with INCLUSIVE_BOTH day counting', () => {
    const result = calculateRedemptionAdvisor({
      girviDateStr: '2026-01-01',
      redeemDateStr: '2026-01-31',
      principalRupees: 10000,
      monthlyInterestPct: 1.5,
      dayCountRule: 'INCLUSIVE_BOTH',
    });

    // 31 days inclusive (1 Jan to 31 Jan = 31 days)
    expect(result.totalDays).toBe(31);
    expect(result.principalRupees).toBe(10000);
    expect(result.totalPayableRupees).toBeGreaterThan(10000);
  });
});
