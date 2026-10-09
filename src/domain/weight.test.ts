import { describe, it, expect } from 'vitest';
import { gramsToMg, mgToGrams, calculateNetWeight, formatWeight } from './weight';

describe('Domain Weight Engine', () => {
  it('converts grams to mg and vice versa without rounding error', () => {
    expect(gramsToMg(4.25)).toBe(4250);
    expect(gramsToMg(10)).toBe(10000);
    expect(mgToGrams(4250)).toBe(4.25);
  });

  it('calculates net weight accurately', () => {
    expect(calculateNetWeight(5000, 750)).toBe(4250);
    expect(() => calculateNetWeight(1000, 1500)).toThrow('Stone weight cannot exceed gross weight');
  });

  it('formats weight with 3 decimal places', () => {
    expect(formatWeight(4250)).toBe('4.250 g');
    expect(formatWeight(10000)).toBe('10.000 g');
  });
});
