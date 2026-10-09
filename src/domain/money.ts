// Implements: NFR-03 | Doc: 03_TECH §6, §8.2

/**
 * Pure Domain Money Engine
 * All money rests as integer paise (1 Rupee = 100 paise).
 * Floating point arithmetic for currency is strictly prohibited.
 */

export function roundHalfUp(value: number): number {
  return value >= 0 ? Math.floor(value + 0.5) : Math.ceil(value - 0.5);
}

export function rupeesToPaise(rupees: number): bigint {
  if (isNaN(rupees) || !isFinite(rupees)) {
    throw new Error('Invalid rupee value');
  }
  return BigInt(roundHalfUp(rupees * 100));
}

export function paiseToRupees(paise: bigint | number): number {
  const p = typeof paise === 'bigint' ? Number(paise) : paise;
  return p / 100;
}

export function formatMoney(paise: bigint | number, locale: 'en-IN' | 'hi-IN' = 'en-IN'): string {
  const rupees = paiseToRupees(paise);
  const formatted = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(rupees);
  return formatted;
}

export function calculateLineMetalValue(netMg: number, ratePaisePerGram: bigint | number): bigint {
  const rate = typeof ratePaisePerGram === 'bigint' ? Number(ratePaisePerGram) : ratePaisePerGram;
  // metalValue = round(netMg * ratePaisePerGram / 1000)
  const val = roundHalfUp((netMg * rate) / 1000);
  return BigInt(val);
}

export function calculateMakingCharge(
  netMg: number,
  metalValuePaise: bigint,
  makingType: 'PER_GRAM' | 'PERCENT' | 'FLAT',
  makingValue: bigint | number
): bigint {
  const val = typeof makingValue === 'bigint' ? Number(makingValue) : makingValue;
  const metalVal = Number(metalValuePaise);

  switch (makingType) {
    case 'PER_GRAM':
      // PER_GRAM: round(netMg * makingValue / 1000)
      return BigInt(roundHalfUp((netMg * val) / 1000));
    case 'PERCENT':
      // PERCENT: round(metalValue * makingBp / 10000)
      return BigInt(roundHalfUp((metalVal * val) / 10000));
    case 'FLAT':
      return BigInt(roundHalfUp(val));
    default:
      throw new Error(`Unknown making type: ${makingType}`);
  }
}

export function calculateGST(taxablePaise: bigint, gstBp: number, gstEnabled: boolean = true): bigint {
  if (!gstEnabled || gstBp <= 0) return 0n;
  const taxable = Number(taxablePaise);
  // gst = round(taxable * gstBp / 10000)
  return BigInt(roundHalfUp((taxable * gstBp) / 10000));
}

export function roundToNearestRupee(paise: bigint): bigint {
  const val = Number(paise);
  const roundedRupees = Math.round(val / 100);
  return BigInt(roundedRupees * 100);
}
