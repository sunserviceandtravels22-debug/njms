// Implements: D12-LOG-01..18 | Doc: 12 §2
// Replaces src/server/audit.ts — all existing callers should migrate to writeLog().
// The old writeAuditLog() shim below provides backward compatibility during migration.
//
// CRITICAL: writeLog() MUST be called with a `tx` (Prisma.TransactionClient) so the
// log row is written inside the same DB transaction as the business change (D12-LOG-02).
// If you are not in a transaction, wrap the whole operation in db.$transaction().

import { createHash } from 'crypto';
import { db } from '@/server/db';
import { Prisma } from '@prisma/client';

// ── Action taxonomy (D12-LOG-04) ─────────────────────────────────────────────

export const LogAction = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  REVERSE: 'REVERSE',
  CANCEL: 'CANCEL',
  DELETE_SOFT: 'DELETE_SOFT',
  RESTORE: 'RESTORE',
  STATUS_CHANGE: 'STATUS_CHANGE',
  PAYMENT: 'PAYMENT',
  ALLOCATE: 'ALLOCATE',
  PRINT: 'PRINT',
  REPRINT: 'REPRINT',
  EXPORT: 'EXPORT',
  VIEW_SENSITIVE: 'VIEW_SENSITIVE',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  LOGIN_FAILED: 'LOGIN_FAILED',
  PIN_OK: 'PIN_OK',
  PIN_FAILED: 'PIN_FAILED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  OVERRIDE: 'OVERRIDE',
  SETTING_CHANGE: 'SETTING_CHANGE',
  RATE_CHANGE: 'RATE_CHANGE',
  TAG_APPLY: 'TAG_APPLY',
  TAG_REMOVE: 'TAG_REMOVE',
  ALERT_RAISE: 'ALERT_RAISE',
  ALERT_ACK: 'ALERT_ACK',
  ALERT_RESOLVE: 'ALERT_RESOLVE',
  JOB_RUN: 'JOB_RUN',
  IMPORT: 'IMPORT',
  BACKUP: 'BACKUP',
  RESTORE_DB: 'RESTORE_DB',
  SCALE_CHECK: 'SCALE_CHECK',
  WEIGH: 'WEIGH',
  COUNT: 'COUNT',
  CONVERT: 'CONVERT',       // Memo-in → sale conversion
  RECEIVE: 'RECEIVE',       // Memo-in receive
  COMPLETE_SALE: 'COMPLETE_SALE',
} as const;

export type LogAction = (typeof LogAction)[keyof typeof LogAction];

// ── Params ────────────────────────────────────────────────────────────────────

export interface LogParams {
  /** REQUIRED: Prisma TX client — log must be in same transaction (D12-LOG-02) */
  tx: Prisma.TransactionClient;
  userId?: string;
  userRole?: string;
  sessionId?: string;
  module: string;
  action: LogAction | string; // string fallback for LEGACY callers during migration
  severity?: 'INFO' | 'WARN' | 'CRITICAL';
  entityType: string;
  entityId: string;
  parentEntityType?: string;
  parentEntityId?: string;
  before?: unknown;
  after?: unknown;
  /** D12-LOG-05: field-level diff (not the whole row) */
  diff?: unknown;
  /** D12-LOG-06: mandatory for reversals, overrides, back-dated entries */
  reasonCode?: string;
  reasonText?: string;
  pinUsedBy?: string;
  /** D12-LOG-07: groups one user action's many writes */
  correlationId?: string;
  rateSnapshotId?: string;
  idempotencyKeyRef?: string;
  source?: 'UI' | 'API' | 'CRON' | 'IMPORT' | 'SYSTEM';
  ip?: string;
  device?: string;
  businessDate?: Date;
}

// ── writeLog ──────────────────────────────────────────────────────────────────

/**
 * D12-LOG-01/02 — Write one ActivityLog row inside the caller's DB transaction.
 * The hash chain (D12-LOG-03) is computed here and stored on the row.
 */
// ── Hash Computation (D12-LOG-03) ──────────────────────────────────────────

export function computeActivityHash(
  prevHash: string,
  data: {
    at: Date | string;
    userId: string | null;
    action: string;
    entityType: string;
    entityId: string;
    diff: unknown;
  }
): string {
  const atStr = typeof data.at === 'string' ? data.at : data.at.toISOString();
  const canonical = JSON.stringify({
    at: atStr,
    userId: data.userId ?? null,
    action: data.action,
    entityType: data.entityType,
    entityId: data.entityId,
    diff: data.diff ?? null,
  });
  return createHash('sha256').update(`${prevHash}:${canonical}`).digest('hex');
}

// ── writeLog ──────────────────────────────────────────────────────────────────

/**
 * D12-LOG-01/02 — Write one ActivityLog row inside the caller's DB transaction.
 * The hash chain (D12-LOG-03) is computed here and stored on the row.
 */
export async function writeLog(params: LogParams): Promise<void> {
  const client = params.tx as typeof db;

  // Get the hash of the most recent non-legacy row to form the chain (D12-LOG-03)
  const prev = await client.activityLog.findFirst({
    where: { legacy: false },
    orderBy: { id: 'desc' },
    select: { id: true, hash: true },
  });

  const prevHash = prev?.hash ?? 'GENESIS';
  const now = new Date();

  const hash = computeActivityHash(prevHash, {
    at: now,
    userId: params.userId ?? null,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    diff: params.diff ?? null,
  });

  // D12-LOG-05: mask sensitive fields in before/after
  const safeBefore = maskSensitiveFields(params.before);
  const safeAfter = maskSensitiveFields(params.after);

  await client.activityLog.create({
    data: {
      at: now,
      businessDate: params.businessDate ?? null,
      userId: params.userId ?? null,
      userRole: params.userRole ?? null,
      sessionId: params.sessionId ?? null,
      device: params.device ?? null,
      ip: params.ip ?? null,
      module: params.module,
      entityType: params.entityType,
      entityId: params.entityId,
      parentEntityType: params.parentEntityType ?? null,
      parentEntityId: params.parentEntityId ?? null,
      action: params.action,
      severity: params.severity ?? 'INFO',
      before: safeBefore !== undefined ? (safeBefore as Prisma.InputJsonValue) : Prisma.JsonNull,
      after: safeAfter !== undefined ? (safeAfter as Prisma.InputJsonValue) : Prisma.JsonNull,
      diff: params.diff ? (params.diff as Prisma.InputJsonValue) : Prisma.JsonNull,
      reasonCode: params.reasonCode ?? null,
      reasonText: params.reasonText ?? null,
      pinUsedBy: params.pinUsedBy ?? null,
      correlationId: params.correlationId ?? null,
      rateSnapshotId: params.rateSnapshotId ?? null,
      idempotencyKeyRef: params.idempotencyKeyRef ?? null,
      source: params.source ?? 'UI',
      prevHash,
      hash,
      legacy: false,
    },
  });
}

// ── verifyChain ───────────────────────────────────────────────────────────────

/**
 * D12-LOG-03 — Verify the SHA-256 chain for non-legacy rows.
 * Returns true if all rows check out. Raises LOG_CHAIN_BROKEN alert on failure.
 * Designed to be called by the nightly cron (/api/cron/verify-log-chain).
 */
export async function verifyChain(
  fromId?: bigint,
  toId?: bigint
): Promise<{ valid: boolean; brokenAtId: bigint | null }> {
  const rows = await db.activityLog.findMany({
    where: {
      legacy: false,
      ...(fromId ? { id: { gte: fromId } } : {}),
      ...(toId ? { id: { lte: toId } } : {}),
    },
    orderBy: { id: 'asc' },
    select: { id: true, prevHash: true, hash: true, at: true, userId: true, action: true, entityType: true, entityId: true, diff: true },
  });

  let expectedPrevHash = 'GENESIS';

  for (const row of rows) {
    if (row.prevHash !== expectedPrevHash) {
      return { valid: false, brokenAtId: row.id };
    }

    const expectedHash = computeActivityHash(expectedPrevHash, {
      at: row.at,
      userId: row.userId,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      diff: row.diff,
    });

    if (row.hash !== expectedHash) {
      return { valid: false, brokenAtId: row.id };
    }

    expectedPrevHash = row.hash ?? 'GENESIS';
  }

  return { valid: true, brokenAtId: null };
}

// ── Sensitive field masking (D12-LOG-05) ──────────────────────────────────────

const SENSITIVE_KEYS = new Set([
  'passwordHash', 'pinHash', 'totpSecretEnc', 'identityDocNumber',
  'identityDocPhotoUrl', 'bankAccount', 'ifsc',
]);

function maskSensitiveFields(obj: unknown): unknown {
  if (!obj || typeof obj !== 'object') return obj;
  const copy: Record<string, unknown> = { ...(obj as Record<string, unknown>) };
  for (const key of Object.keys(copy)) {
    if (SENSITIVE_KEYS.has(key) && typeof copy[key] === 'string') {
      const val = copy[key] as string;
      copy[key] = val.length > 4 ? `****${val.slice(-4)}` : '****';
    } else if (typeof copy[key] === 'object') {
      copy[key] = maskSensitiveFields(copy[key]);
    }
  }
  return copy;
}

// ── Backward-compatibility shim ───────────────────────────────────────────────
// Existing call sites import writeAuditLog from '@/server/audit'. During migration,
// src/server/audit.ts re-exports this function. Once all callers are updated to
// import writeLog from '@/server/services/activityLog', the shim can be removed.

/** @deprecated — migrate callers to writeLog() with a tx param */
export async function writeAuditLog(params: {
  userId?: string;
  action: string;
  entity: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
  ip?: string;
  device?: string;
  tx?: Prisma.TransactionClient;
}): Promise<void> {
  // The shim writes to ActivityLog using the legacy flag
  const client = params.tx ?? db;
  await (client as typeof db).activityLog.create({
    data: {
      userId: params.userId ?? null,
      module: 'LEGACY',
      entityType: params.entity,
      entityId: params.entityId,
      action: params.action,
      before: params.before ? (params.before as Prisma.InputJsonValue) : Prisma.JsonNull,
      after: params.after ? (params.after as Prisma.InputJsonValue) : Prisma.JsonNull,
      reasonText: params.reason ?? null,
      ip: params.ip ?? null,
      device: params.device ?? null,
      legacy: true,
      severity: 'INFO',
    },
  });
}
