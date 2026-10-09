import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { assertCapability } from '@/server/permissions';
import { createSnapshot, listSnapshots } from '@/server/services/rateSnapshot';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const createRateSnapshotSchema = z.object({
  gold24Paise: z.union([z.number(), z.string(), z.bigint()]).transform(v => BigInt(v)),
  gold22Paise: z.union([z.number(), z.string(), z.bigint()]).transform(v => BigInt(v)),
  silver999Paise: z.union([z.number(), z.string(), z.bigint()]).transform(v => BigInt(v)),
  gold18Paise: z.union([z.number(), z.string(), z.bigint()]).transform(v => BigInt(v)).optional(),
  gold14Paise: z.union([z.number(), z.string(), z.bigint()]).transform(v => BigInt(v)).optional(),
  silver925Paise: z.union([z.number(), z.string(), z.bigint()]).transform(v => BigInt(v)).optional(),
  buyAdjustBp: z.number().int().optional(),
  sellAdjustBp: z.number().int().optional(),
  source: z.enum(['MANUAL', 'IMPORT', 'API']).default('MANUAL'),
  note: z.string().max(255).optional(),
  effectiveAt: z.string().datetime().optional().transform(v => v ? new Date(v) : undefined),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const shopId = searchParams.get('shopId') || 'main';
    const fromStr = searchParams.get('from');
    const toStr = searchParams.get('to');

    const from = fromStr ? new Date(fromStr) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = toStr ? new Date(toStr) : new Date();

    const snapshots = await listSnapshots(shopId, from, to);

    // Convert bigints to strings for JSON
    const data = snapshots.map(s => ({
      ...s,
      gold24Paise: s.gold24Paise.toString(),
      gold22Paise: s.gold22Paise.toString(),
      silver999Paise: s.silver999Paise.toString(),
      gold18Paise: s.gold18Paise?.toString() ?? null,
      gold14Paise: s.gold14Paise?.toString() ?? null,
      silver925Paise: s.silver925Paise?.toString() ?? null,
    }));

    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || 'Failed to list rate snapshots' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    assertCapability(user.role, 'RATE_SNAPSHOT_CREATE');

    const body = await req.json();
    const parsed = createRateSnapshotSchema.parse(body);

    const snapshot = await createSnapshot(parsed, user.id);

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
    return NextResponse.json({ ok: false, error: error.message || 'Failed to create rate snapshot' }, { status: 400 });
  }
}
