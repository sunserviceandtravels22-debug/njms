import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { db } from '@/server/db';
import { createTouchSchedule, listTouchHistory } from '@/server/services/touchSchedule';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const touchScheduleSchema = z.object({
  wholesalerVendorId: z.string().min(1),
  metal: z.enum(['GOLD', 'SILVER']),
  purityBandLabel: z.string().min(1),
  purityPptMin: z.number().int().positive(),
  purityPptMax: z.number().int().positive(),
  category: z.string().optional(),
  touchPptDefault: z.number().int().positive(),
  touchPptMin: z.number().int().positive().optional(),
  touchPptMax: z.number().int().positive().optional(),
  effectiveFrom: z.string().datetime().optional().transform((v) => v ? new Date(v) : undefined),
  note: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const vendorId = searchParams.get('vendorId');

    if (vendorId) {
      const history = await listTouchHistory(vendorId);
      return NextResponse.json({ ok: true, data: history });
    }

    const all = await db.touchSchedule.findMany({
      orderBy: { effectiveFrom: 'desc' },
      take: 100,
    });

    return NextResponse.json({ ok: true, data: all });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || 'Failed to list touch schedules' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const parsed = touchScheduleSchema.parse(body);

    const schedule = await createTouchSchedule(parsed, user.id);

    return NextResponse.json({ ok: true, data: schedule });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || 'Failed to create touch schedule' }, { status: 400 });
  }
}
