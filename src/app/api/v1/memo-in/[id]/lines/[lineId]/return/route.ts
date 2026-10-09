import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { returnMemoLine } from '@/server/services/memoIn';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const returnSchema = z.object({
  reason: z.string().min(3),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; lineId: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const { lineId } = await params;
    const body = await req.json();
    const { reason } = returnSchema.parse(body);

    const updated = await returnMemoLine(lineId, reason, user.id);

    return NextResponse.json({ ok: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || 'Failed to return memo line' }, { status: 400 });
  }
}
