import { describe, it, expect } from 'vitest';
import {
  computePayable,
  computeRateVarianceBp,
  computeCustomerSale,
  touchCalcRxW1,
} from './touchCalc';

describe('Wholesaler Touch Calculations (Doc 13 §53, §54)', () => {
  it('T12-WHS-01: pinned RX-W1 calculation matches specification exactly', () => {
    const rx = touchCalcRxW1();

    // Payable = ₹3,78,397 (37,839,700 paise)
    expect(rx.payablePaise).toBe(37_839_700n);

    // Customer Metal = ₹3,49,200 (34,920,000 paise)
    expect(rx.customer.metalValuePaise).toBe(34_920_000n);

    // Customer Making = ₹41,904 (4,190,400 paise)
    expect(rx.customer.makingPaise).toBe(4_190_400n);

    // Customer Taxable = ₹3,91,104 (39,110,400 paise)
    expect(rx.customer.taxablePaise).toBe(39_110_400n);

    // Customer GST (3%) = ₹11,733.12 → 1,173,312 paise
    expect(rx.customer.gstPaise).toBe(1_173_312n);

    // Customer Total = ₹4,02,837.12 → 40,283,712 paise
    expect(rx.customer.totalPaise).toBe(40_283_712n);

    // Gross Margin before overhead = ₹3,91,104 - ₹3,78,397 = ₹12,707 (1,270,700 paise)
    expect(rx.marginPaise).toBe(1_270_700n);
  });

  it('RX-W2 silver calculation matches specification', () => {
    // 115.000g, touch 780ppt, rate ₹97/g = 9700 paise/g
    const netMg = 115_000;
    const touchPpt = 780;
    const ratePaise = 9_700n;

    const payablePaise = computePayable(netMg, touchPpt, ratePaise);
    // 115.000g * 0.780 * ₹97/g = 89.7g * 9700 paise = 870,090 paise = ₹8,700.90
    expect(payablePaise).toBe(870_090n);
  });

  it('calculates rate variance in basis points accurately', () => {
    const baseRate = 9_500n; // ₹95/g
    const newRate = 9_700n; // ₹97/g
    const varianceBp = computeRateVarianceBp(baseRate, newRate);

    // (97 - 95) / 95 = 2 / 95 = 0.02105... = 210 bp (2.1%)
    expect(varianceBp).toBe(210);
  });

  it('handles negative rate variance when price drops', () => {
    const baseRate = 10_000n;
    const newRate = 9_700n;
    const varianceBp = computeRateVarianceBp(baseRate, newRate);
    // (9700 - 10000)/10000 * 10000 = -300 bp (-3.0%)
    expect(varianceBp).toBe(-300);
  });
});
