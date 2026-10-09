// Implements: NFR-03 | Doc: 03_TECH §6

/**
 * Pure Domain Weight Engine
 * All metal weights are stored as integer milligrams (1 Gram = 1000 mg).
 * Floating point arithmetic for weight storage is strictly prohibited.
 */

export function gramsToMg(grams: number): number {
  if (isNaN(grams) || !isFinite(grams)) {
    throw new Error('Invalid grams value');
  }
  return Math.round(grams * 1000);
}

export function mgToGrams(mg: number): number {
  return mg / 1000;
}

export function calculateNetWeight(grossMg: number, stoneMg: number = 0): number {
  const net = grossMg - stoneMg;
  if (net < 0) {
    throw new Error('Stone weight cannot exceed gross weight');
  }
  return net;
}

export function formatWeight(mg: number): string {
  const grams = mgToGrams(mg);
  return `${grams.toFixed(3)} g`;
}

export const formatWeightMg = formatWeight;

