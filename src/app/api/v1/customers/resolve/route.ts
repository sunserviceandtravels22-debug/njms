import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { db } from '@/server/db';
import { rankCandidateCustomers } from '@/lib/customer/resolve';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim() || '';
    const limit = Math.min(20, Math.max(1, parseInt(searchParams.get('limit') || '5', 10)));

    if (!q) {
      return NextResponse.json({ ok: true, data: [] });
    }

    // Query candidates from db
    const rawCandidates = await db.customer.findMany({
      where: {
        OR: [
          { phone: { contains: q } },
          { altPhone: { contains: q } },
          { name: { contains: q } },
          { nameHindi: { contains: q } },
          { relationName: { contains: q } },
        ],
      },
      include: {
        girviLoans: { where: { status: 'ACTIVE' }, select: { id: true, principalPaise: true } },
      },
      take: 20,
    });

    const candidates = rawCandidates.map((c) => {
      const openGirviCount = c.girviLoans.length;
      const openCreditPaise = c.creditLimitPaise;
      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        altPhone: c.altPhone,
        relationType: c.relationType,
        relationName: c.relationName,
        locality: c.locality,
        city: c.city,
        openGirviCount,
        openCreditPaise,
        lastTxnDate: c.createdAt,
      };
    });

    const ranked = rankCandidateCustomers(q, candidates).slice(0, limit);

    return NextResponse.json({ ok: true, data: ranked });
  } catch (error: any) {
    console.error('Resolve customer error:', error);
    return NextResponse.json({ ok: false, error: error.message || 'Failed to resolve customers' }, { status: 500 });
  }
}
