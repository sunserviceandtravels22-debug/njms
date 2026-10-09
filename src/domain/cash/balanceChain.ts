import { formatMoney } from '@/domain/money';

export interface LedgerPaymentItem {
  id: string;
  businessDate: Date | string;
  direction: 'IN' | 'OUT';
  mode: 'CASH' | 'UPI' | 'BANK' | 'CARD' | 'CREDIT';
  amountPaise: bigint | string;
  fundAccountId?: string | null;
  reversedOfId?: string | null;
}

export interface DayAccountBalance {
  date: string; // YYYY-MM-DD
  openingPaise: bigint;
  inPaise: bigint;
  outPaise: bigint;
  closingPaise: bigint;
  cashInPaise: bigint;
  cashOutPaise: bigint;
  upiBankInPaise: bigint;
  upiBankOutPaise: bigint;
  entriesCount: number;
}

export interface BalanceChainOptions {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  initialOpeningPaise?: bigint;
  payments: LedgerPaymentItem[];
}

/**
 * Calculates a gap-free daily balance chain for any date range.
 * Guarantees Closing(Day D) === Opening(Day D+1) across all days.
 */
export function calculateBalanceChain({
  startDate,
  endDate,
  initialOpeningPaise = BigInt(0),
  payments,
}: BalanceChainOptions): DayAccountBalance[] {
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Group payments by date string (YYYY-MM-DD)
  const paymentsByDate = new Map<string, LedgerPaymentItem[]>();
  for (const p of payments) {
    if (p.reversedOfId) continue; // Skip reversed rows
    const dateStr = typeof p.businessDate === 'string'
      ? p.businessDate.split('T')[0]
      : p.businessDate.toISOString().split('T')[0];

    const list = paymentsByDate.get(dateStr) || [];
    list.push(p);
    paymentsByDate.set(dateStr, list);
  }

  const result: DayAccountBalance[] = [];
  let currentOpening = initialOpeningPaise;

  const curDate = new Date(start);
  while (curDate <= end) {
    const dateStr = curDate.toISOString().split('T')[0];
    const dayPayments = paymentsByDate.get(dateStr) || [];

    let dayIn = BigInt(0);
    let dayOut = BigInt(0);
    let cashIn = BigInt(0);
    let cashOut = BigInt(0);
    let upiBankIn = BigInt(0);
    let upiBankOut = BigInt(0);

    for (const p of dayPayments) {
      const amt = typeof p.amountPaise === 'bigint' ? p.amountPaise : BigInt(p.amountPaise);
      if (p.direction === 'IN') {
        dayIn += amt;
        if (p.mode === 'CASH') cashIn += amt;
        else upiBankIn += amt;
      } else {
        dayOut += amt;
        if (p.mode === 'CASH') cashOut += amt;
        else upiBankOut += amt;
      }
    }

    const dayClosing = currentOpening + dayIn - dayOut;

    result.push({
      date: dateStr,
      openingPaise: currentOpening,
      inPaise: dayIn,
      outPaise: dayOut,
      closingPaise: dayClosing,
      cashInPaise: cashIn,
      cashOutPaise: cashOut,
      upiBankInPaise: upiBankIn,
      upiBankOutPaise: upiBankOut,
      entriesCount: dayPayments.length,
    });

    // Carry forward closing balance to next day's opening balance
    currentOpening = dayClosing;

    // Advance date by 1 day
    curDate.setDate(curDate.getDate() + 1);
  }

  return result;
}
