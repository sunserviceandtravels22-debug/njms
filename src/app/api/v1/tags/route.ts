import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { writeAuditLog } from '@/server/audit';
import { db } from '@/server/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const tags = await db.tagDef.findMany({
      where: { active: true },
      include: {
        _count: { select: { entityTags: true } },
      },
      orderBy: [{ isAuto: 'desc' }, { group: 'asc' }, { nameEn: 'asc' }],
    });

    const formatted = tags.map((t) => ({
      id: t.id,
      code: t.code,
      nameEn: t.nameEn,
      nameHi: t.nameHi,
      colorHex: t.colorHex,
      icon: t.icon,
      group: t.group,
      isAuto: t.isAuto,
      effect: t.effect,
      permission: t.permission,
      usageCount: t._count.entityTags,
    }));

    return NextResponse.json({ ok: true, data: formatted });
  } catch (error: any) {
    console.error('Fetch tags error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to fetch tags' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { nameEn, nameHi, colorHex = '#6366F1', icon = 'Tag', group = 'CUSTOM', effect = 'NONE' } = body;

    if (!nameEn || !nameEn.trim()) {
      return NextResponse.json({ ok: false, error: 'Tag name (English) is required' }, { status: 400 });
    }

    const code = nameEn.trim().toUpperCase().replace(/\s+/g, '_');

    const existing = await db.tagDef.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json({ ok: true, data: existing, existing: true });
    }

    const newTag = await db.tagDef.create({
      data: {
        code,
        nameEn: nameEn.trim(),
        nameHi: nameHi?.trim() || null,
        colorHex,
        icon,
        group,
        isAuto: false,
        effect,
        permission: 'ALL',
      },
    });

    await writeAuditLog({
      userId: user.id,
      action: 'CREATE_TAG_DEF',
      entity: 'TagDef',
      entityId: newTag.id,
      after: newTag,
    });

    return NextResponse.json({ ok: true, data: newTag });
  } catch (error: any) {
    console.error('Create tag error:', error);
    return NextResponse.json({ ok: false, error: error.message || 'Failed to create tag' }, { status: 500 });
  }
}
