import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { markLineOnHold } from '@/server/services/memoIn';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const holdSchema = z.object({
  customerId: z.string().optional(),
  expectedDecisionOn: z.string().datetime().optional().transform((v) => v ? new Date(v) : undefined),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; lineId: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const { lineId } = await params;
    const body = await req.json().catch(() => ({}));
    const parsed = holdSchema.parse(body);

    const updated = await markLineOnHold(lineId, parsed, user.id);

    return NextResponse.json({ ok: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || 'Failed to place line on hold' }, { status: 400 });
  }
}
