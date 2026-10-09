// Implements: D12-WHS-20..27 | Doc: 13 §53
// Service layer for wholesaler touch schedule versioning and resolution.

import { db } from '@/server/db';
import { Metal } from '@prisma/client';

export interface CreateTouchScheduleInput {
  wholesalerVendorId: string;
  metal: Metal;
  purityBandLabel: string;
  purityPptMin: number;
  purityPptMax: number;
  category?: string;
  touchPptDefault: number;
  touchPptMin?: number;
  touchPptMax?: number;
  effectiveFrom?: Date;
  note?: string;
}

export async function getEffectiveTouch(
  vendorId: string,
  metal: Metal,
  purityPpt: number,
  category?: string,
  asOf: Date = new Date()
) {
  // Look for exact category match first, then fallback to general schedule
  const schedules = await db.touchSchedule.findMany({
    where: {
      wholesalerVendorId: vendorId,
      metal,
      purityPptMin: { lte: purityPpt },
      purityPptMax: { gte: purityPpt },
      effectiveFrom: { lte: asOf },
      ...(category ? { OR: [{ category }, { category: null }] } : { category: null }),
    },
    orderBy: [{ effectiveFrom: 'desc' }, { createdAt: 'desc' }],
  });

  if (schedules.length === 0) return null;

  // Prefer category-specific match if available
  const categoryMatch = schedules.find((s) => s.category === category);
  return categoryMatch ?? schedules[0];
}

export function isTouchScheduleStale(
  schedule: { effectiveFrom: Date } | null,
  staleDays: number = 30
): boolean {
  if (!schedule) return true;
  const ageMs = Date.now() - schedule.effectiveFrom.getTime();
  return ageMs > staleDays * 24 * 3600 * 1000;
}

export async function createTouchSchedule(
  input: CreateTouchScheduleInput,
  userId: string
) {
  return db.touchSchedule.create({
    data: {
      wholesalerVendorId: input.wholesalerVendorId,
      metal: input.metal,
      purityBandLabel: input.purityBandLabel,
      purityPptMin: input.purityPptMin,
      purityPptMax: input.purityPptMax,
      category: input.category ?? null,
      touchPptDefault: input.touchPptDefault,
      touchPptMin: input.touchPptMin ?? null,
      touchPptMax: input.touchPptMax ?? null,
      effectiveFrom: input.effectiveFrom ?? new Date(),
      note: input.note ?? null,
      setById: userId,
    },
  });
}

export async function listTouchHistory(vendorId: string) {
  return db.touchSchedule.findMany({
    where: { wholesalerVendorId: vendorId },
    orderBy: { effectiveFrom: 'desc' },
  });
}
