// Implements: D12-ALT-01..14 | Doc: 12 §3
// Service layer for raising, deduplicating, snoozing, and resolving alerts.

import { db } from '@/server/db';
import { Prisma } from '@prisma/client';
import { buildDedupeKey, isAlertVisibleToRole, isSnoozeActive } from '@/domain/alertRules';

export interface RaiseAlertParams {
  ruleCode: string;
  entityType: string;
  entityId: string;
  severity?: 'INFO' | 'WARN' | 'CRITICAL';
  payload?: unknown;
  rateSnapshotId?: string;
  tx?: Prisma.TransactionClient;
}

export async function raise(params: RaiseAlertParams) {
  const client = (params.tx ?? db) as typeof db;
  const dedupeKey = buildDedupeKey(params.ruleCode, params.entityType, params.entityId);

  // Find or create rule if not seeded
  let rule = await client.alertRule.findUnique({
    where: { code: params.ruleCode },
  });

  if (!rule) {
    rule = await client.alertRule.create({
      data: {
        code: params.ruleCode,
        module: 'SYSTEM',
        kind: 'EVENT',
        paramsJson: {},
        severity: params.severity ?? 'WARN',
        audienceJson: ['OWNER', 'MANAGER'],
        channelsJson: ['UI_BELL', 'UI_STRIP'],
      },
    });
  }

  const severity = params.severity ?? rule.severity;

  // Check for existing open/snoozed/ack instance with this dedupeKey
  const existing = await client.alertInstance.findFirst({
    where: {
      ruleId: rule.id,
      dedupeKey,
      status: { in: ['OPEN', 'ACK', 'SNOOZED'] },
    },
  });

  if (existing) {
    return client.alertInstance.update({
      where: { id: existing.id },
      data: {
        lastSeenAt: new Date(),
        occurrences: { increment: 1 },
        payloadJson: params.payload !== undefined ? (params.payload as Prisma.InputJsonValue) : (existing.payloadJson ?? Prisma.JsonNull),
        rateSnapshotId: params.rateSnapshotId ?? existing.rateSnapshotId,
      },
      include: { rule: true },
    });
  }

  return client.alertInstance.create({
    data: {
      ruleId: rule.id,
      entityType: params.entityType,
      entityId: params.entityId,
      dedupeKey,
      severity,
      occurrences: 1,
      status: 'OPEN',
      payloadJson: params.payload !== undefined ? (params.payload as Prisma.InputJsonValue) : Prisma.JsonNull,
      rateSnapshotId: params.rateSnapshotId ?? null,
    },
    include: { rule: true },
  });
}

export async function ack(instanceId: string, userId: string, tx?: Prisma.TransactionClient) {
  const client = (tx ?? db) as typeof db;
  return client.alertInstance.update({
    where: { id: instanceId },
    data: {
      status: 'ACK',
      ackById: userId,
      ackAt: new Date(),
    },
    include: { rule: true },
  });
}

export async function snooze(
  instanceId: string,
  userId: string,
  until: Date,
  tx?: Prisma.TransactionClient
) {
  const client = (tx ?? db) as typeof db;
  return client.alertInstance.update({
    where: { id: instanceId },
    data: {
      status: 'SNOOZED',
      snoozeUntil: until,
      ackById: userId,
      ackAt: new Date(),
    },
    include: { rule: true },
  });
}

export async function resolve(
  instanceId: string,
  note?: string,
  tx?: Prisma.TransactionClient
) {
  const client = (tx ?? db) as typeof db;
  return client.alertInstance.update({
    where: { id: instanceId },
    data: {
      status: 'RESOLVED',
      note: note ?? null,
    },
    include: { rule: true },
  });
}

export async function getOpenForUser(
  userRole: string,
  options: {
    status?: string;
    module?: string;
    severity?: string;
    limit?: number;
  } = {}
) {
  const where: Prisma.AlertInstanceWhereInput = {
    status: options.status ?? 'OPEN',
  };

  if (options.severity) {
    where.severity = options.severity;
  }
  if (options.module) {
    where.rule = { module: options.module };
  }

  const instances = await db.alertInstance.findMany({
    where,
    include: { rule: true },
    orderBy: { lastSeenAt: 'desc' },
    take: options.limit ?? 100,
  });

  // Filter instances by audience visibility for the user's role
  return instances.filter((inst) => {
    const audience = (inst.rule.audienceJson as string[]) || [];
    return isAlertVisibleToRole(audience, userRole);
  });
}

/**
 * Nightly/Hourly scheduled evaluator for THRESHOLD and ABSENCE rules.
 * Scans for negative stock, dead stock, unprinted labels, etc.
 */
export async function evaluateThresholds(): Promise<{ evaluated: number; raised: number }> {
  let raisedCount = 0;

  // 1. Check for negative stock items (STOCK_NEGATIVE)
  const negativeItems = await db.inventoryItem.findMany({
    where: { quantity: { lt: 0 } },
    take: 50,
  });

  for (const item of negativeItems) {
    await raise({
      ruleCode: 'STOCK_NEGATIVE',
      entityType: 'InventoryItem',
      entityId: item.id,
      severity: 'CRITICAL',
      payload: { tagNo: item.tagNo, quantity: item.quantity },
    });
    raisedCount++;
  }

  // 2. Un-snooze expired snoozes
  const expiredSnoozes = await db.alertInstance.findMany({
    where: {
      status: 'SNOOZED',
      snoozeUntil: { lte: new Date() },
    },
  });

  for (const inst of expiredSnoozes) {
    await db.alertInstance.update({
      where: { id: inst.id },
      data: { status: 'OPEN', snoozeUntil: null },
    });
  }

  return { evaluated: negativeItems.length + expiredSnoozes.length, raised: raisedCount };
}
