/**
 * Document 11: Interest Projection & What-If Calculator Engine
 * Calculates payable amounts for future dates, generates month-by-month projection schedules,
 * and compares Simple vs Compound interest side-by-side.
 */

export interface TrancheProjectionInput {
  principalPaise: bigint;
  ratePerMonthPct: number;
  interestType: 'SIMPLE' | 'COMPOUND';
  startDate: Date;
  projectionDate: Date;
  compoundingBasis?: 'RESTART_ON_PAYMENT' | 'CALENDAR_BLOCKS';
}

export interface TrancheProjectionResult {
  daysElapsed: number;
  monthsElapsed: number;
  accruedInterestPaise: bigint;
  totalPayablePaise: bigint;
}

export interface MonthlyScheduleRow {
  month: number;
  dateStr: string;
  principalPaise: bigint;
  interestAccruedThisMonthPaise: bigint;
  totalAccruedInterestPaise: bigint;
  totalPayablePaise: bigint;
}

export function projectTranchePayable(input: TrancheProjectionInput): TrancheProjectionResult {
  const { principalPaise, ratePerMonthPct, interestType, startDate, projectionDate } = input;

  const msDiff = projectionDate.getTime() - startDate.getTime();
  const daysElapsed = Math.max(0, Math.floor(msDiff / (1000 * 60 * 60 * 24)));
  const monthsElapsed = daysElapsed / 30; // 30-day month convention

  let accruedInterestPaise = 0n;

  if (interestType === 'SIMPLE') {
    // Simple Interest = Principal * rate * months
    const interestRatio = (ratePerMonthPct / 100) * monthsElapsed;
    accruedInterestPaise = BigInt(Math.round(Number(principalPaise) * interestRatio));
  } else {
    // Compound Monthly Interest = Principal * ((1 + r)^n - 1)
    const rateRatio = ratePerMonthPct / 100;
    const compoundMultiplier = Math.pow(1 + rateRatio, monthsElapsed) - 1;
    accruedInterestPaise = BigInt(Math.round(Number(principalPaise) * compoundMultiplier));
  }

  return {
    daysElapsed,
    monthsElapsed: Math.round(monthsElapsed * 10) / 10,
    accruedInterestPaise,
    totalPayablePaise: principalPaise + accruedInterestPaise,
  };
}

export function generate12MonthSchedule(input: Omit<TrancheProjectionInput, 'projectionDate'>): MonthlyScheduleRow[] {
  const schedule: MonthlyScheduleRow[] = [];
  const { principalPaise, ratePerMonthPct, interestType, startDate } = input;

  let prevPayable = principalPaise;

  for (let m = 1; m <= 12; m++) {
    const projDate = new Date(startDate);
    projDate.setMonth(projDate.getMonth() + m);

    const res = projectTranchePayable({ ...input, projectionDate: projDate });
    const interestThisMonth = res.totalPayablePaise - prevPayable;
    prevPayable = res.totalPayablePaise;

    schedule.push({
      month: m,
      dateStr: projDate.toISOString().split('T')[0],
      principalPaise,
      interestAccruedThisMonthPaise: interestThisMonth,
      totalAccruedInterestPaise: res.accruedInterestPaise,
      totalPayablePaise: res.totalPayablePaise,
    });
  }

  return schedule;
}
