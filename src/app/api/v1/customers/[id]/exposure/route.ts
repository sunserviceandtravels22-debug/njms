import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { db } from '@/server/db';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const customer = await db.customer.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        tag: true,
        creditLimitPaise: true,
      },
    });

    if (!customer) {
      return NextResponse.json({ ok: false, error: 'Customer not found' }, { status: 404 });
    }

    const creditOutstandingPaise = BigInt(0);
    const girviActivePrincipalPaise = BigInt(0);
    const totalExposurePaise = creditOutstandingPaise + girviActivePrincipalPaise;
    const isOverLimit = customer.creditLimitPaise > BigInt(0) && totalExposurePaise > customer.creditLimitPaise;

    return NextResponse.json({
      ok: true,
      data: {
        customerId: customer.id,
        tag: customer.tag,
        creditLimitPaise: customer.creditLimitPaise.toString(),
        creditOutstandingPaise: creditOutstandingPaise.toString(),
        girviActivePrincipalPaise: girviActivePrincipalPaise.toString(),
        totalExposurePaise: totalExposurePaise.toString(),
        isOverdue: false,
        isOverLimit,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: 'Failed to calculate exposure' }, { status: 500 });
  }
}
