import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { snooze } from '@/server/services/alertService';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const snoozeSchema = z.object({
  until: z.string().datetime().transform((v) => new Date(v)),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { until } = snoozeSchema.parse(body);

    const updated = await snooze(id, user.id, until);

    return NextResponse.json({ ok: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || 'Failed to snooze alert' }, { status: 400 });
  }
}
