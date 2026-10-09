// Implements: 06_ADDENDUM_SUGGESTION_CALCULATORS §4 (Calculator B - Redemption Advisor & Timeline)
// Calculates exact elapsed time (INCLUSIVE_BOTH day counting) and interest breakdown

import { rupeesToPaise, paiseToRupees, roundHalfUp } from '../money';

export interface RedemptionAdvisorInput {
  girviDateStr: string; // YYYY-MM-DD
  redeemDateStr: string; // YYYY-MM-DD
  principalRupees: number;
  monthlyInterestPct: number; // e.g. 1.5% per month
  interestType?: 'SIMPLE' | 'COMPOUND';
  dayCountRule?: 'INCLUSIVE_BOTH' | 'EXCLUSIVE_END';
}

export interface RedemptionAdvisorResult {
  girviDateStr: string;
  redeemDateStr: string;
  totalDays: number;
  years: number;
  months: number;
  days: number;
  elapsedLabel: string;
  principalRupees: number;
  interestRupees: number;
  totalPayableRupees: number;
  dailyInterestRupees: number;
}

export function calculateRedemptionAdvisor(input: RedemptionAdvisorInput): RedemptionAdvisorResult {
  const start = new Date(input.girviDateStr);
  const end = new Date(input.redeemDateStr);

  const diffTime = Math.abs(end.getTime() - start.getTime());
  let totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // If INCLUSIVE_BOTH, count both start and end day (+1 day)
  if ((input.dayCountRule ?? 'INCLUSIVE_BOTH') === 'INCLUSIVE_BOTH') {
    totalDays += 1;
  }

  const years = Math.floor(totalDays / 365);
  const remDaysAfterYears = totalDays % 365;
  const months = Math.floor(remDaysAfterYears / 30);
  const days = remDaysAfterYears % 30;

  // Monthly interest rate calculation (pro-rata by days: 1 month = 30 days)
  const totalMonths = totalDays / 30;
  const rateTotal = (input.monthlyInterestPct / 100) * totalMonths;

  let interestRupees = 0;
  if (input.interestType === 'COMPOUND') {
    // Compound monthly
    const compounded = input.principalRupees * Math.pow(1 + input.monthlyInterestPct / 100, totalMonths);
    interestRupees = compounded - input.principalRupees;
  } else {
    // Simple interest
    interestRupees = input.principalRupees * rateTotal;
  }

  const roundedInterestRupees = Math.round(interestRupees);
  const totalPayableRupees = Math.round(input.principalRupees + roundedInterestRupees);
  const dailyInterestRupees = Number(((input.principalRupees * (input.monthlyInterestPct / 100)) / 30).toFixed(2));

  return {
    girviDateStr: input.girviDateStr,
    redeemDateStr: input.redeemDateStr,
    totalDays,
    years,
    months,
    days,
    elapsedLabel: `${years > 0 ? `${years}y ` : ''}${months}m ${days}d (${totalDays} days)`,
    principalRupees: input.principalRupees,
    interestRupees: roundedInterestRupees,
    totalPayableRupees,
    dailyInterestRupees,
  };
}
