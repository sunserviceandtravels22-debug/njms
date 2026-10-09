// Implements: D12-RTS-01, D12-RTS-03, D12-RTS-05 | Doc: 12 §1 | Screen: none (domain only)
// Pure functions — no I/O, no Prisma, no side effects.

export interface SnapshotRef {
  id: string;
  effectiveAt: Date;
  rateFlags: string | null; // CSV of: CARRIED_FORWARD, OVERRIDDEN, BACKFILLED, CORRECTION
}

/**
 * D12-RTS-03 — Select the rate version effective at a given moment.
 * Returns the latest snapshot whose effectiveAt <= targetTime.
 * Returns null if no snapshot exists before or at the target time.
 */
export function selectSnapshotVersion(
  snapshots: SnapshotRef[],
  targetTime: Date
): SnapshotRef | null {
  if (snapshots.length === 0) return null;

  // Sort descending so we find the latest-before-or-equal quickly
  const sorted = [...snapshots].sort(
    (a, b) => b.effectiveAt.getTime() - a.effectiveAt.getTime()
  );

  return sorted.find((s) => s.effectiveAt.getTime() <= targetTime.getTime()) ?? null;
}

/**
 * D12-RTS-05 — Determine whether a snapshot is considered stale.
 * staleHours comes from Setting['rate_stale_hours'], default 8.
 */
export function isRateStale(snapshot: SnapshotRef | null, staleHours: number): boolean {
  if (!snapshot) return true;
  const ageMs = Date.now() - snapshot.effectiveAt.getTime();
  return ageMs > staleHours * 3_600_000;
}

/**
 * D12-RTS-06 — Compute the rate change in basis points between two rate values.
 * Used to detect jumps that exceed rate_keep_tolerance_bp or rate_jump_bp.
 */
export function computeRateChangeBp(oldRatePaise: bigint, newRatePaise: bigint): number {
  if (oldRatePaise === 0n) return 0;
  // (new - old) / old * 10000 — using integer arithmetic
  const diffPaise = newRatePaise - oldRatePaise;
  // Multiply by 10000 first to keep precision before dividing
  return Number((diffPaise * 10_000n) / oldRatePaise);
}

/**
 * D12-RTS-09 — Determine the "day opening" snapshot for a business date.
 * Returns the earliest snapshot on that calendar date (IST).
 */
export function selectDayOpeningSnapshot(
  snapshots: SnapshotRef[],
  businessDate: Date // compare only the date portion
): SnapshotRef | null {
  const dateStr = businessDate.toISOString().slice(0, 10);
  const daySnapshots = snapshots.filter(
    (s) => s.effectiveAt.toISOString().slice(0, 10) === dateStr
  );
  if (daySnapshots.length === 0) return null;
  return daySnapshots.sort(
    (a, b) => a.effectiveAt.getTime() - b.effectiveAt.getTime()
  )[0];
}

/**
 * Flag helpers — read and write the rateFlags CSV string.
 */
export const RateFlag = {
  CARRIED_FORWARD: 'CARRIED_FORWARD',
  OVERRIDDEN: 'OVERRIDDEN',
  BACKFILLED: 'BACKFILLED',
  CORRECTION: 'CORRECTION',
} as const;

export type RateFlagValue = (typeof RateFlag)[keyof typeof RateFlag];

export function hasRateFlag(flags: string | null, flag: RateFlagValue): boolean {
  if (!flags) return false;
  return flags.split(',').map((f) => f.trim()).includes(flag);
}

export function addRateFlag(flags: string | null, flag: RateFlagValue): string {
  if (hasRateFlag(flags, flag)) return flags ?? flag;
  return flags ? `${flags},${flag}` : flag;
}
