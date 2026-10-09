import { describe, it, expect } from 'vitest';
import {
  computePackVariance,
  computeMetalValue,
  computeItemCost,
} from './inventoryCalc';

describe('Inventory Calculations (D12-INX-01..28)', () => {
  it('T12-INX-1: computePackVariance within tolerance returns true', () => {
    // 10 pieces, avg 500mg, tolerance 10mg per piece = allowed variance +-100mg
    // actual packNetMg = 5050mg (variance +50mg)
    const result = computePackVariance(5050, 10, 500, 10);
    expect(result.withinTolerance).toBe(true);
    expect(result.varianceMg).toBe(50);
  });

  it('T12-INX-2: computePackVariance when missing an item returns false', () => {
    // 10 pieces expected, actual packNetMg = 4400mg (variance -600mg)
    const result = computePackVariance(4400, 10, 500, 10);
    expect(result.withinTolerance).toBe(false);
    expect(result.varianceMg).toBe(-600);
  });

  it('T12-INX-3: computeMetalValue with 22K (916ppt), 4.5g (4500mg), rate ₹7,000/g', () => {
    // 4500mg * 916 * 700000 paise / 1,000,000
    // fineMg = 4500 * 916 / 1000 = 4122 mg = 4.122 g
    // 4.122 g * 700000 paise = 2,885,400 paise = ₹28,854
    const ratePaise = 700_000n; // ₹7,000 / g
    const metalVal = computeMetalValue(4500, 916, ratePaise);
    expect(metalVal).toBe(2_885_400n);
  });

  it('T12-INX-4: computeMetalValue returns 0 for non-metal or 0 weight/purity', () => {
    expect(computeMetalValue(0, 916, 700_000n)).toBe(0n);
    expect(computeMetalValue(5000, 0, 700_000n)).toBe(0n);
  });

  it('T12-INX-5: computeItemCost adds metal value and making charges', () => {
    const ratePaise = 700_000n;
    // 4500mg, 916ppt => metalValue = 2,885,400 paise
    // Making: ₹500/g = 50,000 paise/g => 4.5g * 50,000 = 225,000 paise
    const totalCostPerGram = computeItemCost(4500, 916, ratePaise, 'PER_GRAM', 50_000n);
    expect(totalCostPerGram).toBe(2_885_400n + 225_000n);

    // Making: 10% (1000 bp)
    const totalCostPercent = computeItemCost(4500, 916, ratePaise, 'PERCENT', 1000n);
    expect(totalCostPercent).toBe(2_885_400n + 288_540n);

    // Making: Flat ₹1,500 = 150,000 paise
    const totalCostFlat = computeItemCost(4500, 916, ratePaise, 'FLAT', 150_000n);
    expect(totalCostFlat).toBe(2_885_400n + 150_000n);
  });
});
