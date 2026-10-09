// Implements: D12-INX-01..28 | Pure inventory calculations

export function computePackVariance(
  packNetMg: number,
  piecesRemaining: number,
  avgPieceMg: number,
  toleranceMgPerPiece: number
): { withinTolerance: boolean; varianceMg: number } {
  const expectedWeightMg = piecesRemaining * avgPieceMg;
  const varianceMg = packNetMg - expectedWeightMg;
  const maxAllowedVarianceMg = piecesRemaining * toleranceMgPerPiece;

  return {
    withinTolerance: Math.abs(varianceMg) <= maxAllowedVarianceMg,
    varianceMg,
  };
}

/**
 * Computes metal value in integer paise.
 * netMg: weight in milligrams
 * purityPpt: purity in parts per thousand (e.g., 916 for 22K)
 * ratePaisePerGram: rate for 24K pure bullion per gram in paise
 */
export function computeMetalValue(
  netMg: number,
  purityPpt: number,
  ratePaisePerGram: bigint
): bigint {
  if (netMg <= 0 || purityPpt <= 0 || ratePaisePerGram <= 0n) return 0n;
  // fineMg = netMg * purityPpt / 1000
  // metalValue = fineMg * ratePaisePerGram / 1000 (since 1000 mg = 1 gram)
  const netMgBig = BigInt(netMg);
  const purityBig = BigInt(purityPpt);
  return (netMgBig * purityBig * ratePaisePerGram) / 1_000_000n;
}

export function computeItemCost(
  netMg: number,
  purityPpt: number,
  costRatePaisePerGram: bigint,
  makingType: 'PER_GRAM' | 'PERCENT' | 'FLAT',
  makingValue: bigint
): bigint {
  const metalCost = computeMetalValue(netMg, purityPpt, costRatePaisePerGram);

  let makingCost = 0n;
  if (makingType === 'PER_GRAM') {
    // makingValue is paise per gram; grams = netMg / 1000
    makingCost = (BigInt(netMg) * makingValue) / 1000n;
  } else if (makingType === 'PERCENT') {
    // makingValue is basis points (100 = 1%)
    makingCost = (metalCost * makingValue) / 10_000n;
  } else if (makingType === 'FLAT') {
    makingCost = makingValue;
  }

  return metalCost + makingCost;
}
