import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { writeAuditLog } from '@/server/audit';
import { db } from '@/server/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { entityType, entityId, tagId, action = 'APPLY', reason } = body;

    if (!entityType || !entityId || !tagId) {
      return NextResponse.json({ ok: false, error: 'entityType, entityId, and tagId are required' }, { status: 400 });
    }

    const tagDef = await db.tagDef.findUnique({ where: { id: tagId } });
    if (!tagDef) {
      return NextResponse.json({ ok: false, error: 'Tag definition not found' }, { status: 404 });
    }

    if (tagDef.isAuto) {
      return NextResponse.json({ ok: false, error: 'System auto-tags cannot be manually applied or removed' }, { status: 400 });
    }

    if (action === 'REMOVE') {
      await db.entityTag.deleteMany({
        where: { entityType, entityId, tagId },
      });

      await writeAuditLog({
        userId: user.id,
        action: 'REMOVE_ENTITY_TAG',
        entity: entityType,
        entityId: entityId,
        after: { tagCode: tagDef.code, action: 'REMOVE' },
      });

      return NextResponse.json({ ok: true, message: 'Tag removed successfully' });
    }

    const appliedTag = await db.entityTag.upsert({
      where: {
        entityType_entityId_tagId: { entityType, entityId, tagId },
      },
      create: {
        entityType,
        entityId,
        tagId,
        isAuto: false,
        appliedByUserId: user.id,
        reason: reason?.trim() || null,
      },
      update: {
        reason: reason?.trim() || null,
      },
    });

    await writeAuditLog({
      userId: user.id,
      action: 'APPLY_ENTITY_TAG',
      entity: entityType,
      entityId: entityId,
      after: { tagCode: tagDef.code, action: 'APPLY', reason: reason || null },
    });

    return NextResponse.json({ ok: true, data: appliedTag });
  } catch (error: any) {
    console.error('Apply tag error:', error);
    return NextResponse.json({ ok: false, error: error.message || 'Failed to apply tag' }, { status: 500 });
  }
}
