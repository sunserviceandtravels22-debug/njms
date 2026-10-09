// Implements: Doc 13 §54.1, §54.2 | Pure domain conversion logic

import { computePayable, computeCustomerSale } from './touchCalc';

export interface MemoInLineSnapshot {
  id: string;
  category: string;
  metal: 'GOLD' | 'SILVER';
  netMg: number;
  statedPurityPpt: number;
  testedPurityPpt: number;
  touchPpt: number;
}

export interface BuildConversionParams {
  line: MemoInLineSnapshot;
  salePricing: {
    retailRatePaisePerGram: bigint;
    makingPercentBp: number;
    gstRateBp: number;
  };
  rateMode: 'LOCKED_AT_SALE' | 'QUEUED_FLOATING';
  settlementRatePaisePerGram?: bigint;
}

export function buildConversionLines(params: BuildConversionParams) {
  const { line, salePricing, rateMode, settlementRatePaisePerGram } = params;

  // 1. Customer Sale Calculation
  const customerSale = computeCustomerSale({
    netMg: line.netMg,
    purityPpt: line.testedPurityPpt,
    retailRatePaisePerGram: salePricing.retailRatePaisePerGram,
    makingPercentBp: salePricing.makingPercentBp,
    gstRateBp: salePricing.gstRateBp,
  });

  // 2. Vendor Payable Calculation
  let payablePaise: bigint | null = null;
  if (rateMode === 'LOCKED_AT_SALE' && settlementRatePaisePerGram) {
    payablePaise = computePayable(
      line.netMg,
      line.touchPpt,
      settlementRatePaisePerGram
    );
  }

  const vendorPayable = {
    netMg: line.netMg,
    touchPpt: line.touchPpt,
    ratePaise: settlementRatePaisePerGram ?? null,
    payablePaise,
    rateMode,
  };

  const estimatedMarginPaise =
    payablePaise !== null ? customerSale.taxablePaise - payablePaise : null;

  return {
    customerSale,
    vendorPayable,
    estimatedMarginPaise,
  };
}
