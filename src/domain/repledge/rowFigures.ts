/**
 * Document 11: Re-Pledge Form Row Figures & Spread Calculator
 * Pure domain functions for rate gap, rupee spread, own capital, and break-even warning.
 */

export interface RepledgeRowInputs {
  customerPrincipalPaise: bigint;
  customerRatePerMonthPct: number;
  offeredPaise: bigint;
  vendorRatePerMonthPct: number;
  metalValuePaise?: bigint;
}

export interface RepledgeRowFigures {
  customerRatePm: number;
  vendorRatePm: number;
  rateGapPpPm: number;
  customerInterestMonthlyPaise: bigint;
  vendorInterestMonthlyPaise: bigint;
  rupeeSpreadMonthlyPaise: bigint;
  ownCapitalPaise: bigint;
  ltvPct: number;
  isLosingMoney: boolean;
}

export function computeRepledgeRowFigures(inputs: RepledgeRowInputs): RepledgeRowFigures {
  const {
    customerPrincipalPaise,
    customerRatePerMonthPct,
    offeredPaise,
    vendorRatePerMonthPct,
    metalValuePaise = 0n,
  } = inputs;

  const customerRatePm = customerRatePerMonthPct;
  const vendorRatePm = vendorRatePerMonthPct;
  const rateGapPpPm = Math.round((customerRatePm - vendorRatePm) * 100) / 100;

  // Monthly Interest in Paise
  const customerInterestMonthlyPaise = BigInt(
    Math.round(Number(customerPrincipalPaise) * (customerRatePm / 100))
  );
  const vendorInterestMonthlyPaise = BigInt(
    Math.round(Number(offeredPaise) * (vendorRatePm / 100))
  );

  // Rupee spread per month = Customer monthly interest - Vendor monthly interest
  const rupeeSpreadMonthlyPaise = customerInterestMonthlyPaise - vendorInterestMonthlyPaise;

  // Own Capital = Customer principal - Vendor offered
  const ownCapitalPaise = customerPrincipalPaise - offeredPaise;

  // LTV % = (offered / metalValue) * 100
  const ltvPct =
    metalValuePaise > 0n
      ? Math.round((Number(offeredPaise) / Number(metalValuePaise)) * 10000) / 100
      : 0;

  // Break-even warning: vendor interest >= customer interest
  const isLosingMoney = vendorInterestMonthlyPaise >= customerInterestMonthlyPaise;

  return {
    customerRatePm,
    vendorRatePm,
    rateGapPpPm,
    customerInterestMonthlyPaise,
    vendorInterestMonthlyPaise,
    rupeeSpreadMonthlyPaise,
    ownCapitalPaise,
    ltvPct,
    isLosingMoney,
  };
}
