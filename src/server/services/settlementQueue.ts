// Implements: Doc 13 §54.4, §54.6 | Service layer for the Settlement Queue
// Handles floating-rate wholesaler and supplier purchases pending rate fixation.

import { db } from '@/server/db';
import { Prisma } from '@prisma/client';
import { writeLog, LogAction } from './activityLog';
import { computeRateVarianceBp } from '@/domain/touchCalc';

export async function listQueuedSettlements(filter?: {
  vendorId?: string;
}) {
  const where: Prisma.PurchaseLotWhereInput = {
    rateMode: 'QUEUED_FLOATING',
    status: 'RATE_OPEN',
  };

  if (filter?.vendorId) {
    where.vendorId = filter.vendorId;
  }

  return db.purchaseLot.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
}

export async function bulkSettleQueue(
  params: {
    lotIds: string[];
    settlementRatePaisePerGram: bigint;
    reason?: string;
    overrideVarianceWarning?: boolean;
  },
  userId: string
) {
  return db.$transaction(async (tx) => {
    const lots = await tx.purchaseLot.findMany({
      where: { id: { in: params.lotIds } },
    });

    if (lots.length === 0) {
      throw new Error('No purchase lots found for settlement');
    }

    const settledResults = [];

    for (const lot of lots) {
      // 1. Check rate variance guard (3% = 300 bp default)
      if (lot.provisionalRatePaise > 0n) {
        const varianceBp = Math.abs(
          computeRateVarianceBp(lot.provisionalRatePaise, params.settlementRatePaisePerGram)
        );
        if (varianceBp > 300 && !params.overrideVarianceWarning) {
          throw new Error(
            `Rate variance is ${varianceBp} bp (> 3.0%). Requires confirmation / override.`
          );
        }
      }

      // 2. Final payable = fineMg * ratePaise / 1000
      const finalPayablePaise =
        (BigInt(lot.totalFineMg) * params.settlementRatePaisePerGram) / 1000n;

      // 3. Update PurchaseLot
      const updatedLot = await tx.purchaseLot.update({
        where: { id: lot.id },
        data: {
          status: 'FIXED',
          settledAt: new Date(),
          settledRatePaisePerGram: params.settlementRatePaisePerGram,
          settledById: userId,
          provisionalValuePaise: finalPayablePaise,
          openFineMg: 0,
        },
      });

      // 4. Record RateFixEvent
      await tx.rateFixEvent.create({
        data: {
          purchaseLotId: lot.id,
          fineMgFixed: lot.totalFineMg,
          fixedRatePaise: params.settlementRatePaisePerGram,
          metalValuePaise: finalPayablePaise,
          note: params.reason ?? 'Settled via settlement queue',
          byUserId: userId,
        },
      });

      // 5. ActivityLog
      await writeLog({
        tx,
        userId,
        module: 'PURCHASE',
        action: LogAction.RATE_CHANGE,
        entityType: 'PurchaseLot',
        entityId: lot.id,
        before: { status: lot.status, ratePaise: lot.provisionalRatePaise.toString() },
        after: {
          status: 'FIXED',
          settledRatePaise: params.settlementRatePaisePerGram.toString(),
          finalPayablePaise: finalPayablePaise.toString(),
        },
        reasonText: params.reason,
      });

      settledResults.push(updatedLot);
    }

    return settledResults;
  });
}
