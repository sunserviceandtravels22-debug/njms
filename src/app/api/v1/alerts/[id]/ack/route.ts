import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { ack } from '@/server/services/alertService';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const updated = await ack(id, user.id);

    return NextResponse.json({ ok: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || 'Failed to acknowledge alert' }, { status: 500 });
  }
}
