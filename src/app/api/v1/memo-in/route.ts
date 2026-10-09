import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { db } from '@/server/db';
import { receiveMemoIn } from '@/server/services/memoIn';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const receiveMemoInSchema = z.object({
  wholesalerVendorId: z.string().min(1),
  wholesalerMemoNo: z.string().optional(),
  returnByDate: z.string().transform((v) => new Date(v)),
  notes: z.string().optional(),
  idempotencyKey: z.string().default(() => `memo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`),
  lines: z.array(
    z.object({
      category: z.string().min(1),
      metal: z.enum(['GOLD', 'SILVER']),
      statedPurityPpt: z.number().int().positive(),
      testedPurityPpt: z.number().int().positive().optional(),
      grossMg: z.number().int().positive(),
      stoneMg: z.number().int().nonnegative().optional(),
      netMg: z.number().int().positive(),
      qty: z.number().int().positive().default(1),
      touchPpt: z.number().int().positive().optional(),
      alterPolicy: z.enum(['ALTER_NONE', 'ALTER_MINOR', 'ALTER_FREE']).optional(),
      tagNo: z.string().optional(),
    })
  ).min(1),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const vendorId = searchParams.get('vendorId');
    const status = searchParams.get('status');

    const memos = await db.memoIn.findMany({
      where: {
        ...(vendorId ? { wholesalerVendorId: vendorId } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        lines: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({ ok: true, data: memos });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || 'Failed to list memos' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const parsed = receiveMemoInSchema.parse(body);

    const result = await receiveMemoIn(parsed, user.id);

    return NextResponse.json({ ok: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || 'Failed to receive memo-in lot' }, { status: 400 });
  }
}
