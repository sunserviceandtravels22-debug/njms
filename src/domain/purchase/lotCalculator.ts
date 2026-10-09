/**
 * Document 11: Purchase Lot Calculator & Rate-Fixing Engine
 * Pure domain functions for fine weight computation, rate-fix revisions, and cost allocations.
 */

export interface PurchaseItemInput {
  id: string;
  netWeightMg: number;
  purityPpt: number; // e.g. 916 for 22K, 999 for 24K
  labourPaise: bigint;
}

export interface LotRateFixInput {
  lotFineMg: number;
  fixedFineMg: number;
  fixedRatePaisePerGram: bigint;
  provisionalRatePaisePerGram: bigint;
  items: PurchaseItemInput[];
}

export interface ItemCostDelta {
  itemId: string;
  oldMetalCostPaise: bigint;
  newMetalCostPaise: bigint;
  deltaPaise: bigint;
}

export interface LotRateFixResult {
  totalFixedMetalValuePaise: bigint;
  provisionalValuePaise: bigint;
  metalValueDeltaPaise: bigint;
  gstDeltaPaise: bigint;
  itemDeltas: ItemCostDelta[];
}

/**
 * Computes fine weight in milligrams for an item: netWeightMg * (purityPpt / 1000)
 */
export function computeFineWeightMg(netWeightMg: number, purityPpt: number): number {
  return Math.round((netWeightMg * purityPpt) / 1000);
}

/**
 * Computes lot rate-fixing delta and allocates cost revisions across items by fine weight.
 */
export function computeLotRateFix(input: LotRateFixInput): LotRateFixResult {
  const { fixedFineMg, fixedRatePaisePerGram, provisionalRatePaisePerGram, items } = input;

  // Metal value = fineMg * ratePaisePerGram / 1000
  const totalFixedMetalValuePaise = BigInt(
    Math.round((fixedFineMg * Number(fixedRatePaisePerGram)) / 1000)
  );
  const provisionalValuePaise = BigInt(
    Math.round((fixedFineMg * Number(provisionalRatePaisePerGram)) / 1000)
  );

  const metalValueDeltaPaise = totalFixedMetalValuePaise - provisionalValuePaise;
  // GST 3% on metal value delta
  const gstDeltaPaise = BigInt(Math.round(Number(metalValueDeltaPaise) * 0.03));

  // Allocate delta across items by fine weight
  const totalItemFineMg = items.reduce(
    (acc, it) => acc + computeFineWeightMg(it.netWeightMg, it.purityPpt),
    0
  );

  let allocatedDeltaSum = 0n;
  const itemDeltas: ItemCostDelta[] = items.map((it, idx) => {
    const itemFine = computeFineWeightMg(it.netWeightMg, it.purityPpt);
    const oldCost = BigInt(Math.round((itemFine * Number(provisionalRatePaisePerGram)) / 1000));
    const newCost = BigInt(Math.round((itemFine * Number(fixedRatePaisePerGram)) / 1000));

    let itemDelta = newCost - oldCost;
    if (idx === items.length - 1 && totalItemFineMg > 0) {
      // Largest remainder adjustment on last item to match exact delta
      itemDelta = metalValueDeltaPaise - allocatedDeltaSum;
    } else {
      allocatedDeltaSum += itemDelta;
    }

    return {
      itemId: it.id,
      oldMetalCostPaise: oldCost,
      newMetalCostPaise: oldCost + itemDelta,
      deltaPaise: itemDelta,
    };
  });

  return {
    totalFixedMetalValuePaise,
    provisionalValuePaise,
    metalValueDeltaPaise,
    gstDeltaPaise,
    itemDeltas,
  };
}
