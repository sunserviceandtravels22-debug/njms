// Implements: D12-WHS-20..34 | Doc: 13 §53, §54
// Pure domain calculations for Wholesaler Touch, Payable, Customer Pricing, and Margin

/**
 * Computes payable to wholesaler in paise using integer BigInt math.
 * netMg: Net weight in milligrams (e.g. 48500 = 48.5g)
 * touchPpt: Touch in parts per thousand (e.g. 830 = 83.0%)
 * ratePaisePerGram: Bullion basis rate per gram in paise (e.g. 940000n = ₹9,400/g)
 */
export function computePayable(
  netMg: number,
  touchPpt: number,
  ratePaisePerGram: bigint
): bigint {
  if (netMg <= 0 || touchPpt <= 0 || ratePaisePerGram <= 0n) return 0n;

  // netMg is mg (1,000 mg = 1 g)
  // touchPpt is ppt (1,000 ppt = 1.0)
  // payable = (netMg * touchPpt * ratePaisePerGram) / (1000 * 1000)
  const numerator = BigInt(netMg) * BigInt(touchPpt) * ratePaisePerGram;
  const denominator = 1_000_000n;

  // Round half-up to nearest paise: (numerator + denominator / 2) / denominator
  return (numerator + denominator / 2n) / denominator;
}

/**
 * Computes rate change variance in basis points (100 bp = 1.0%).
 * Positive indicates rate moved higher.
 */
export function computeRateVarianceBp(baseRatePaise: bigint, newRatePaise: bigint): number {
  if (baseRatePaise <= 0n) return 0;
  const diff = newRatePaise - baseRatePaise;
  return Number((diff * 10_000n) / baseRatePaise);
}

/**
 * Full Customer Sale Calculation
 * makingPercentBp: basis points (1200 = 12%)
 * gstRateBp: basis points (300 = 3%)
 */
export function computeCustomerSale(params: {
  netMg: number;
  purityPpt: number;
  retailRatePaisePerGram: bigint;
  makingPercentBp: number;
  gstRateBp: number;
}) {
  const { netMg, purityPpt, retailRatePaisePerGram, makingPercentBp, gstRateBp } = params;

  // 1. Metal Value
  const metalNumerator = BigInt(netMg) * BigInt(purityPpt) * retailRatePaisePerGram;
  const metalValuePaise = (metalNumerator + 500_000n) / 1_000_000n;

  // 2. Making Charges
  const makingNumerator = metalValuePaise * BigInt(makingPercentBp);
  const makingPaise = (makingNumerator + 5_000n) / 10_000n;

  // 3. Taxable Total
  const taxablePaise = metalValuePaise + makingPaise;

  // 4. GST
  const gstNumerator = taxablePaise * BigInt(gstRateBp);
  const gstPaise = (gstNumerator + 5_000n) / 10_000n;

  // 5. Customer Total
  const totalPaise = taxablePaise + gstPaise;

  return {
    metalValuePaise,
    makingPaise,
    taxablePaise,
    gstPaise,
    totalPaise,
  };
}

/**
 * Pinned reference calculation for RX-W1 from §54.3
 */
export function touchCalcRxW1() {
  const netMg = 48_500; // 48.500 g
  const touchPpt = 830; // 83.0%
  const wholesaleBullionRate = 940_000n; // ₹9,400/g

  const payablePaise = computePayable(netMg, touchPpt, wholesaleBullionRate);

  const customer = computeCustomerSale({
    netMg: 48_500,
    purityPpt: 750, // 18K
    retailRatePaisePerGram: 960_000n, // ₹9,600/g
    makingPercentBp: 1200, // 12%
    gstRateBp: 300, // 3%
  });

  const marginPaise = customer.taxablePaise - payablePaise;

  return {
    payablePaise,
    customer,
    marginPaise,
  };
}
