import { describe, it, expect } from 'vitest';
import {
  rupeesToPaise,
  paiseToRupees,
  formatMoney,
  calculateLineMetalValue,
  calculateMakingCharge,
  calculateGST,
  roundToNearestRupee,
} from './money';

describe('Domain Money Engine', () => {
  it('converts rupees to paise and vice versa without floating point inaccuracy', () => {
    expect(rupeesToPaise(100)).toBe(10000n);
    expect(rupeesToPaise(478.90)).toBe(47890n);
    expect(paiseToRupees(10000n)).toBe(100);
    expect(paiseToRupees(47890n)).toBe(478.90);
  });

  it('formats currency according to Indian grouping (₹1,11,240)', () => {
    const formatted = formatMoney(11124000n, 'en-IN');
    expect(formatted).toContain('1,11,240');
  });

  it('passes Golden Test P1: Pricing calculation with GST enabled', () => {
    // 10.000 g (10000 mg), rate ₹10,000/g (1000000 paise/g), making 8% (800 bp), GST 3% (300 bp)
    const netMg = 10000;
    const ratePaisePerGram = 1000000n; // ₹10,000
    const metalVal = calculateLineMetalValue(netMg, ratePaisePerGram);
    expect(metalVal).toBe(10000000n); // ₹1,00,000

    const making = calculateMakingCharge(netMg, metalVal, 'PERCENT', 800); // 8% = 800 bp
    expect(making).toBe(800000n); // ₹8,000

    const taxable = metalVal + making;
    expect(taxable).toBe(10800000n); // ₹1,08,000

    const gst = calculateGST(taxable, 300, true); // 3% = 300 bp
    expect(gst).toBe(324000n); // ₹3,240

    const total = taxable + gst;
    expect(total).toBe(11124000n); // ₹1,11,240
    expect(paiseToRupees(total)).toBe(111240);
  });

  it('passes Golden Test P2: Pricing calculation with GST disabled (gstEnabled = false)', () => {
    const netMg = 10000;
    const ratePaisePerGram = 1000000n;
    const metalVal = calculateLineMetalValue(netMg, ratePaisePerGram);
    const making = calculateMakingCharge(netMg, metalVal, 'PERCENT', 800);
    const taxable = metalVal + making;

    const gst = calculateGST(taxable, 300, false); // GST Disabled
    expect(gst).toBe(0n); // ₹0

    const total = taxable + gst;
    expect(total).toBe(10800000n); // ₹1,08,000
    expect(paiseToRupees(total)).toBe(108000);
  });

  it('rounds to nearest rupee half-up', () => {
    expect(roundToNearestRupee(10040n)).toBe(10000n); // ₹100.40 -> ₹100
    expect(roundToNearestRupee(10050n)).toBe(10100n); // ₹100.50 -> ₹101
  });
});
