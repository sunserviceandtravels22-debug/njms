import { describe, it, expect } from 'vitest';
import { calculateBalanceChain } from './balanceChain';

describe('Balance Chain & Cash Flow Engine (CF1, CF18)', () => {
  it('CF1 & CF18: Calculates gap-free balance chain where Closing(Day D) === Opening(Day D+1)', () => {
    // 28 Sep 2026: Opening ₹20,000 (2000000 paise)
    const payments = [
      { id: 'p1', businessDate: '2026-09-28', direction: 'IN' as const, mode: 'CASH' as const, amountPaise: BigInt(6124000) }, // Sale 61240
      { id: 'p2', businessDate: '2026-09-28', direction: 'IN' as const, mode: 'CASH' as const, amountPaise: BigInt(500000) },  // Credit 5000
      { id: 'p3', businessDate: '2026-09-28', direction: 'IN' as const, mode: 'UPI' as const, amountPaise: BigInt(5000000) },  // UPI Sale 50000
      { id: 'p4', businessDate: '2026-09-28', direction: 'OUT' as const, mode: 'CASH' as const, amountPaise: BigInt(3000) },   // Tea 30
      { id: 'p5', businessDate: '2026-09-28', direction: 'OUT' as const, mode: 'CASH' as const, amountPaise: BigInt(1500000) },// Rent 15000
      { id: 'p6', businessDate: '2026-09-28', direction: 'OUT' as const, mode: 'CASH' as const, amountPaise: BigInt(1000000) },// Old gold 10000
      { id: 'p7', businessDate: '2026-09-28', direction: 'OUT' as const, mode: 'CASH' as const, amountPaise: BigInt(4000000) },// Transfer cash out 40000
      
      // 29 Sep 2026: Tea ₹30
      { id: 'p8', businessDate: '2026-09-29', direction: 'OUT' as const, mode: 'CASH' as const, amountPaise: BigInt(3000) },
      // 30 Sep 2026: No entries
    ];

    const chain = calculateBalanceChain({
      startDate: '2026-09-28',
      endDate: '2026-09-30',
      initialOpeningPaise: BigInt(2000000), // ₹20,000
      payments,
    });

    expect(chain.length).toBe(3);

    // Day 1 (28 Sep)
    const day28 = chain[0];
    expect(day28.date).toBe('2026-09-28');
    expect(day28.openingPaise).toBe(BigInt(2000000)); // ₹20,000 opening
    expect(day28.inPaise).toBe(BigInt(11624000));    // ₹1,16,240 (Cash + UPI)
    expect(day28.outPaise).toBe(BigInt(6503000));     // ₹65,030
    expect(day28.closingPaise).toBe(BigInt(7121000)); // ₹71,210 closing

    // Day 2 (29 Sep)
    const day29 = chain[1];
    expect(day29.date).toBe('2026-09-29');
    expect(day29.openingPaise).toBe(BigInt(7121000)); // Equal to 28 Sep closing!
    expect(day29.closingPaise).toBe(BigInt(7118000)); // ₹71,180

    // Day 3 (30 Sep - zero entries)
    const day30 = chain[2];
    expect(day30.date).toBe('2026-09-30');
    expect(day30.openingPaise).toBe(BigInt(7118000));
    expect(day30.closingPaise).toBe(BigInt(7118000)); // No gap! Opening === Closing
    expect(day30.entriesCount).toBe(0);
  });
});
