import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { db } from '@/server/db';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const memo = await db.memoIn.findUnique({
      where: { id },
      include: {
        lines: true,
      },
    });

    if (!memo) {
      return NextResponse.json({ ok: false, error: 'Memo not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data: memo });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || 'Failed to fetch memo' }, { status: 500 });
  }
}
