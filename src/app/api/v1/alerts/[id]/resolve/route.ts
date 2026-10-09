import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { resolve } from '@/server/services/alertService';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const resolveSchema = z.object({
  reason: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { reason } = resolveSchema.parse(body);

    const updated = await resolve(id, reason);

    return NextResponse.json({ ok: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || 'Failed to resolve alert' }, { status: 400 });
  }
}
