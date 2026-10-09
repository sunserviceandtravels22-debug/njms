// Implements: D12-RTS-01..11 | Doc: 12 §1 | Screen: none (service layer)
// All writes use the same Prisma transaction client as the caller (tx param).

import { db } from '@/server/db';
import { Prisma } from '@prisma/client';
import {
  selectSnapshotVersion,
  isRateStale,
  computeRateChangeBp,
  addRateFlag,
  RateFlag,
} from '@/domain/rateStamp';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RateSnapshotRow {
  id: string;
  shopId: string;
  versionNo: number;
  effectiveAt: Date;
  enteredByUserId: string;
  gold24Paise: bigint;
  gold22Paise: bigint;
  gold18Paise: bigint | null;
  gold14Paise: bigint | null;
  silver999Paise: bigint;
  silver925Paise: bigint | null;
  buyAdjustBp: number | null;
  sellAdjustBp: number | null;
  source: string;
  correctionOfId: string | null;
  note: string | null;
  rateFlags: string | null;
}

export interface CreateSnapshotInput {
  gold24Paise: bigint;
  gold22Paise: bigint;
  gold18Paise?: bigint;
  gold14Paise?: bigint;
  silver999Paise: bigint;
  silver925Paise?: bigint;
  buyAdjustBp?: number;
  sellAdjustBp?: number;
  source?: 'MANUAL' | 'IMPORT' | 'API';
  note?: string;
  /** Override effectiveAt for back-dated entries (Owner-only, triggers OVERRIDDEN flag) */
  effectiveAt?: Date;
}

// ── Core: getRateStamp ─────────────────────────────────────────────────────────

/**
 * D12-RTS-02 / D12-RTS-03 — Returns the RateSnapshot effective at the given time.
 * MUST be called inside the same DB transaction as the business write.
 *
 * Throws RATE_MISSING if no snapshot exists and the entry is money-affecting.
 * Caller passes `allowMissing: true` for non-money entries (custody moves etc.).
 */
export async function getRateStamp(
  effectiveAt: Date,
  options: { tx?: Prisma.TransactionClient; shopId?: string; allowMissing?: boolean } = {}
): Promise<{ id: string; rateFlags: string | null }> {
  const client = options.tx ?? db;
  const shopId = options.shopId ?? 'main';

  // Load all snapshots for this shop (small dataset, max a few hundred rows lifetime)
  const rows = await (client as typeof db).rateSnapshot.findMany({
    where: { shopId },
    select: { id: true, effectiveAt: true, rateFlags: true },
    orderBy: { effectiveAt: 'desc' },
  });

  const selected = selectSnapshotVersion(rows, effectiveAt);

  if (!selected) {
    if (options.allowMissing) {
      // D12-RTS-04: non-money entries use the latest version flagged CARRIED_FORWARD
      const latest = rows[0] ?? null;
      if (!latest) throw new Error('RATE_MISSING: No rate snapshots exist for this shop');
      return {
        id: latest.id,
        rateFlags: addRateFlag(latest.rateFlags, RateFlag.CARRIED_FORWARD),
      };
    }
    throw new Error('RATE_MISSING: No rate entered for today. Enter today\'s rate before proceeding.');
  }

  return { id: selected.id, rateFlags: selected.rateFlags };
}

// ── createSnapshot ─────────────────────────────────────────────────────────────

/**
 * D12-RTS-01 — Creates a new versioned rate snapshot.
 * Uses DB Counter('rate_version') for sequential versionNo.
 * Raises RATE_JUMP alert when the change exceeds rate_jump_bp (checked post-commit).
 */
export async function createSnapshot(
  input: CreateSnapshotInput,
  userId: string,
  options: { tx?: Prisma.TransactionClient; shopId?: string; isOverride?: boolean } = {}
): Promise<RateSnapshotRow> {
  const client = (options.tx ?? db) as typeof db;
  const shopId = options.shopId ?? 'main';

  // Increment the per-shop version counter atomically
  const counter = await client.counter.upsert({
    where: { key: `rate_version_${shopId}` },
    update: { nextValue: { increment: 1 } },
    create: { key: `rate_version_${shopId}`, nextValue: 2 },
  });
  const versionNo = counter.nextValue - 1;

  const effectiveAt = input.effectiveAt ?? new Date();
  const rateFlags = options.isOverride ? RateFlag.OVERRIDDEN : null;

  const row = await client.rateSnapshot.create({
    data: {
      shopId,
      versionNo,
      effectiveAt,
      enteredByUserId: userId,
      gold24Paise: input.gold24Paise,
      gold22Paise: input.gold22Paise,
      gold18Paise: input.gold18Paise ?? null,
      gold14Paise: input.gold14Paise ?? null,
      silver999Paise: input.silver999Paise,
      silver925Paise: input.silver925Paise ?? null,
      buyAdjustBp: input.buyAdjustBp ?? null,
      sellAdjustBp: input.sellAdjustBp ?? null,
      source: input.source ?? 'MANUAL',
      note: input.note ?? null,
      rateFlags,
    },
  });

  return row as RateSnapshotRow;
}

// ── correctSnapshot ────────────────────────────────────────────────────────────

/**
 * D12-RTS-10 — Corrects a typo by creating a new snapshot flagged CORRECTION_OF the original.
 * The original snapshot is never edited. Returns the new correction snapshot.
 */
export async function correctSnapshot(
  originalId: string,
  corrections: Partial<CreateSnapshotInput>,
  reason: string,
  userId: string
): Promise<RateSnapshotRow> {
  return db.$transaction(async (tx) => {
    const original = await tx.rateSnapshot.findUniqueOrThrow({ where: { id: originalId } });

    const counter = await tx.counter.upsert({
      where: { key: `rate_version_${original.shopId}` },
      update: { nextValue: { increment: 1 } },
      create: { key: `rate_version_${original.shopId}`, nextValue: 2 },
    });
    const versionNo = counter.nextValue - 1;

    const row = await tx.rateSnapshot.create({
      data: {
        shopId: original.shopId,
        versionNo,
        effectiveAt: original.effectiveAt, // same effective time as the original
        enteredByUserId: userId,
        gold24Paise: corrections.gold24Paise ?? original.gold24Paise,
        gold22Paise: corrections.gold22Paise ?? original.gold22Paise,
        gold18Paise: corrections.gold18Paise ?? original.gold18Paise,
        gold14Paise: corrections.gold14Paise ?? original.gold14Paise,
        silver999Paise: corrections.silver999Paise ?? original.silver999Paise,
        silver925Paise: corrections.silver925Paise ?? original.silver925Paise,
        buyAdjustBp: corrections.buyAdjustBp ?? original.buyAdjustBp,
        sellAdjustBp: corrections.sellAdjustBp ?? original.sellAdjustBp,
        source: 'MANUAL',
        correctionOfId: originalId,
        note: reason,
        rateFlags: RateFlag.CORRECTION,
      },
    });

    return row as RateSnapshotRow;
  });
}

// ── listSnapshots ──────────────────────────────────────────────────────────────

export async function listSnapshots(
  shopId: string,
  from: Date,
  to: Date
): Promise<RateSnapshotRow[]> {
  const rows = await db.rateSnapshot.findMany({
    where: { shopId, effectiveAt: { gte: from, lte: to } },
    orderBy: { effectiveAt: 'desc' },
  });
  return rows as RateSnapshotRow[];
}

// ── getTodaySnapshot ───────────────────────────────────────────────────────────

export async function getTodaySnapshot(shopId: string = 'main'): Promise<RateSnapshotRow | null> {
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const rows = await db.rateSnapshot.findMany({
    where: { shopId, effectiveAt: { gte: todayStart } },
    orderBy: { effectiveAt: 'desc' },
    take: 1,
  });

  return (rows[0] as RateSnapshotRow) ?? null;
}

// ── checkRateJump ──────────────────────────────────────────────────────────────

/**
 * D12-RTS-11 — Check if the new snapshot's gold22 rate differs from the previous
 * by more than rate_jump_bp (default 300 = 3%). Used post-create to decide whether
 * to raise a RATE_JUMP alert. Returns the basis-point change or null if no prior snapshot.
 */
export async function checkRateJump(
  newSnapshot: RateSnapshotRow,
  shopId: string = 'main'
): Promise<number | null> {
  const rows = await db.rateSnapshot.findMany({
    where: {
      shopId,
      effectiveAt: { lt: newSnapshot.effectiveAt },
      correctionOfId: null, // compare against non-corrections only
    },
    orderBy: { effectiveAt: 'desc' },
    take: 1,
    select: { gold22Paise: true },
  });

  if (!rows[0]) return null;
  return computeRateChangeBp(rows[0].gold22Paise, newSnapshot.gold22Paise);
}
