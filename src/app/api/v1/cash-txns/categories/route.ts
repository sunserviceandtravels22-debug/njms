import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { writeAuditLog } from '@/server/audit';
import { db } from '@/server/db';
import { CashGroup } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const categories = await db.cashCategory.findMany({
      where: { active: true },
      orderBy: [{ group: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json({ ok: true, data: categories });
  } catch (error: any) {
    console.error('Fetch categories error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, nameHi, group = 'OPERATING', direction = 'OUT', parentId } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ ok: false, error: 'Category name is required' }, { status: 400 });
    }

    const existing = await db.cashCategory.findFirst({
      where: { name: name.trim() },
    });

    if (existing) {
      return NextResponse.json({ ok: true, data: existing, existing: true });
    }

    const newCategory = await db.cashCategory.create({
      data: {
        name: name.trim(),
        nameHi: nameHi?.trim() || null,
        group: (group as CashGroup) || CashGroup.OPERATING,
        direction: direction || 'OUT',
        parentId: parentId || null,
        active: true,
      },
    });

    await writeAuditLog({
      userId: user.id,
      action: 'CREATE_CASH_CATEGORY',
      entity: 'CashCategory',
      entityId: newCategory.id,
      after: newCategory,
    });

    return NextResponse.json({ ok: true, data: newCategory });
  } catch (error: any) {
    console.error('Create category error:', error);
    return NextResponse.json({ ok: false, error: error.message || 'Failed to create category' }, { status: 500 });
  }
}
