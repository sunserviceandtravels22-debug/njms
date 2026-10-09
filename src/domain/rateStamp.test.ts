// Implements: D12-RTS-01..11 | Doc: 12 §1 | Tests: T12-RTS-1..4
import { describe, it, expect } from 'vitest';
import {
  selectSnapshotVersion,
  isRateStale,
  computeRateChangeBp,
  selectDayOpeningSnapshot,
  hasRateFlag,
  addRateFlag,
  RateFlag,
} from './rateStamp';

const makeSnap = (id: string, effectiveAt: Date, rateFlags: string | null = null) => ({
  id,
  effectiveAt,
  rateFlags,
});

describe('rateStamp — selectSnapshotVersion (D12-RTS-03)', () => {
  it('T12-RTS-1: returns the latest snapshot at or before the target time', () => {
    const now = new Date('2026-10-09T10:00:00Z');
    const snapshots = [
      makeSnap('v1', new Date('2026-10-09T08:00:00Z')),
      makeSnap('v2', new Date('2026-10-09T09:30:00Z')),
      makeSnap('v3', new Date('2026-10-09T11:00:00Z')), // after target — should be excluded
    ];
    const result = selectSnapshotVersion(snapshots, now);
    expect(result?.id).toBe('v2');
  });

  it('T12-RTS-2: returns null when no snapshot exists before the target time', () => {
    const snapshots = [makeSnap('v1', new Date('2026-10-09T12:00:00Z'))];
    const result = selectSnapshotVersion(snapshots, new Date('2026-10-09T08:00:00Z'));
    expect(result).toBeNull();
  });

  it('returns the exact-match snapshot (effectiveAt === targetTime)', () => {
    const target = new Date('2026-10-09T09:00:00Z');
    const snapshots = [makeSnap('v1', target)];
    expect(selectSnapshotVersion(snapshots, target)?.id).toBe('v1');
  });

  it('returns null for empty array', () => {
    expect(selectSnapshotVersion([], new Date())).toBeNull();
  });
});

describe('rateStamp — isRateStale (D12-RTS-05)', () => {
  it('T12-RTS-3: returns true when snapshot is older than staleHours', () => {
    const eightHoursAgo = new Date(Date.now() - 9 * 3_600_000); // 9h ago
    expect(isRateStale(makeSnap('v1', eightHoursAgo), 8)).toBe(true);
  });

  it('returns false when snapshot is within staleHours', () => {
    const recentSnap = makeSnap('v1', new Date(Date.now() - 3_600_000)); // 1h ago
    expect(isRateStale(recentSnap, 8)).toBe(false);
  });

  it('returns true for null snapshot', () => {
    expect(isRateStale(null, 8)).toBe(true);
  });
});

describe('rateStamp — computeRateChangeBp (D12-RTS-06, D12-RTS-11)', () => {
  it('computes basis points correctly for a 3% rise', () => {
    // old = 9400 paise/g, new = 9682 paise/g  → exactly 300bp
    expect(computeRateChangeBp(9400n, 9682n)).toBe(300);
  });

  it('returns 0 when old rate is 0', () => {
    expect(computeRateChangeBp(0n, 1000n)).toBe(0);
  });

  it('returns negative bp for a rate fall', () => {
    const bp = computeRateChangeBp(10000n, 9700n);
    expect(bp).toBe(-300);
  });
});

describe('rateStamp — T12-RTS-4 correction chain flag', () => {
  it('hasRateFlag detects a single flag', () => {
    expect(hasRateFlag('BACKFILLED', RateFlag.BACKFILLED)).toBe(true);
    expect(hasRateFlag('BACKFILLED', RateFlag.OVERRIDDEN)).toBe(false);
  });

  it('hasRateFlag detects a flag in a CSV string', () => {
    expect(hasRateFlag('BACKFILLED,OVERRIDDEN', RateFlag.OVERRIDDEN)).toBe(true);
  });

  it('addRateFlag appends a new flag without duplication', () => {
    const result = addRateFlag('BACKFILLED', RateFlag.CORRECTION);
    expect(result).toBe('BACKFILLED,CORRECTION');
    // No duplication
    expect(addRateFlag('BACKFILLED', RateFlag.BACKFILLED)).toBe('BACKFILLED');
  });
});

describe('rateStamp — selectDayOpeningSnapshot (D12-RTS-09)', () => {
  it('returns the earliest snapshot on a given date', () => {
    const snapshots = [
      makeSnap('v2', new Date('2026-10-09T09:30:00Z')),
      makeSnap('v1', new Date('2026-10-09T08:00:00Z')),
      makeSnap('v3', new Date('2026-10-10T08:00:00Z')), // different date
    ];
    const result = selectDayOpeningSnapshot(snapshots, new Date('2026-10-09T00:00:00Z'));
    expect(result?.id).toBe('v1');
  });

  it('returns null when no snapshot exists on the given date', () => {
    const snapshots = [makeSnap('v1', new Date('2026-10-08T08:00:00Z'))];
    expect(selectDayOpeningSnapshot(snapshots, new Date('2026-10-09T00:00:00Z'))).toBeNull();
  });
});
