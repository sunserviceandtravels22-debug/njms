import { describe, it, expect } from 'vitest';
import { buildConversionLines, MemoInLineSnapshot } from './memoConvert';

describe('Memo Conversion Lines (Doc 13 §54.2)', () => {
  const sampleLine: MemoInLineSnapshot = {
    id: 'line_1',
    category: 'Bangle',
    metal: 'GOLD',
    netMg: 48_500, // 48.5g
    statedPurityPpt: 750,
    testedPurityPpt: 750, // 18K
    touchPpt: 830, // 83%
  };

  it('builds conversion for LOCKED_AT_SALE with immediate payable', () => {
    const result = buildConversionLines({
      line: sampleLine,
      salePricing: {
        retailRatePaisePerGram: 960_000n, // ₹9,600/g
        makingPercentBp: 1200, // 12%
        gstRateBp: 300, // 3%
      },
      rateMode: 'LOCKED_AT_SALE',
      settlementRatePaisePerGram: 940_000n, // ₹9,400/g
    });

    expect(result.customerSale.totalPaise).toBe(40_283_712n);
    expect(result.vendorPayable.payablePaise).toBe(37_839_700n);
    expect(result.estimatedMarginPaise).toBe(1_270_700n);
  });

  it('builds conversion for QUEUED_FLOATING with null payable until settled', () => {
    const result = buildConversionLines({
      line: sampleLine,
      salePricing: {
        retailRatePaisePerGram: 960_000n,
        makingPercentBp: 1200,
        gstRateBp: 300,
      },
      rateMode: 'QUEUED_FLOATING',
    });

    expect(result.customerSale.totalPaise).toBe(40_283_712n);
    expect(result.vendorPayable.payablePaise).toBeNull();
    expect(result.estimatedMarginPaise).toBeNull();
  });
});
