import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { assertCapability } from '@/server/permissions';
import { correctSnapshot } from '@/server/services/rateSnapshot';
import { db } from '@/server/db';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const correctRateSnapshotSchema = z.object({
  gold24Paise: z.union([z.number(), z.string(), z.bigint()]).transform(v => BigInt(v)).optional(),
  gold22Paise: z.union([z.number(), z.string(), z.bigint()]).transform(v => BigInt(v)).optional(),
  silver999Paise: z.union([z.number(), z.string(), z.bigint()]).transform(v => BigInt(v)).optional(),
  gold18Paise: z.union([z.number(), z.string(), z.bigint()]).transform(v => BigInt(v)).optional(),
  gold14Paise: z.union([z.number(), z.string(), z.bigint()]).transform(v => BigInt(v)).optional(),
  silver925Paise: z.union([z.number(), z.string(), z.bigint()]).transform(v => BigInt(v)).optional(),
  buyAdjustBp: z.number().int().optional(),
  sellAdjustBp: z.number().int().optional(),
  reason: z.string().min(3).max(255),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const snapshot = await db.rateSnapshot.findUnique({
      where: { id },
    });

    if (!snapshot) {
      return NextResponse.json({ ok: false, error: 'Rate snapshot not found' }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      data: {
        ...snapshot,
        gold24Paise: snapshot.gold24Paise.toString(),
        gold22Paise: snapshot.gold22Paise.toString(),
        silver999Paise: snapshot.silver999Paise.toString(),
        gold18Paise: snapshot.gold18Paise?.toString() ?? null,
        gold14Paise: snapshot.gold14Paise?.toString() ?? null,
        silver925Paise: snapshot.silver925Paise?.toString() ?? null,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || 'Failed to fetch rate snapshot' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    assertCapability(user.role, 'RATE_SNAPSHOT_CORRECT');

    const { id } = await params;
    const body = await req.json();
    const parsed = correctRateSnapshotSchema.parse(body);

    const { reason, ...corrections } = parsed;
    const corrected = await correctSnapshot(id, corrections, reason, user.id);

    return NextResponse.json({
      ok: true,
      data: {
        ...corrected,
        gold24Paise: corrected.gold24Paise.toString(),
        gold22Paise: corrected.gold22Paise.toString(),
        silver999Paise: corrected.silver999Paise.toString(),
        gold18Paise: corrected.gold18Paise?.toString() ?? null,
        gold14Paise: corrected.gold14Paise?.toString() ?? null,
        silver925Paise: corrected.silver925Paise?.toString() ?? null,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || 'Failed to correct rate snapshot' }, { status: 400 });
  }
}
