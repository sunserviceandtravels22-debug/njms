import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { writeAuditLog } from '@/server/audit';
import { db } from '@/server/db';
import { LocationType } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const location = await db.storageLocation.findUnique({
      where: { id: params.id },
      include: {
        girviItems: {
          select: {
            id: true,
            ornamentType: true,
            grossWeightMg: true,
            netWeightMg: true,
            valuationPaise: true,
          },
        },
      },
    });

    if (!location) {
      return NextResponse.json({ ok: false, error: 'Storage location not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data: location });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || 'Failed to fetch location' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const existing = await db.storageLocation.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ ok: false, error: 'Storage location not found' }, { status: 404 });
    }

    const body = await req.json();
    const { name, type, address, requiresPinIn, requiresPinOut, active } = body;

    if (name !== undefined && !name.trim()) {
      return NextResponse.json({ ok: false, error: 'Location name cannot be empty' }, { status: 400 });
    }

    const updated = await db.storageLocation.update({
      where: { id: params.id },
      data: {
        name: name ? name.trim() : existing.name,
        type: type ? (type as LocationType) : existing.type,
        address: address !== undefined ? (address?.trim() || null) : existing.address,
        requiresPinIn: requiresPinIn !== undefined ? !!requiresPinIn : existing.requiresPinIn,
        requiresPinOut: requiresPinOut !== undefined ? !!requiresPinOut : existing.requiresPinOut,
        active: active !== undefined ? !!active : existing.active,
      },
    });

    await writeAuditLog({
      userId: user.id,
      action: 'UPDATE_STORAGE_LOCATION',
      entity: 'StorageLocation',
      entityId: updated.id,
      before: existing,
      after: updated,
    });

    return NextResponse.json({ ok: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || 'Failed to update location' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const existing = await db.storageLocation.findUnique({
      where: { id: params.id },
      include: { _count: { select: { girviItems: true } } },
    });

    if (!existing) {
      return NextResponse.json({ ok: false, error: 'Storage location not found' }, { status: 404 });
    }

    // If items are currently stored, soft delete by setting active = false
    if (existing._count.girviItems > 0) {
      await db.storageLocation.update({
        where: { id: params.id },
        data: { active: false },
      });

      await writeAuditLog({
        userId: user.id,
        action: 'DEACTIVATE_STORAGE_LOCATION',
        entity: 'StorageLocation',
        entityId: params.id,
        reason: `Deactivated with ${existing._count.girviItems} items in custody`,
      });

      return NextResponse.json({
        ok: true,
        message: 'Location deactivated and archived safely since active items remain in custody',
      });
    }

    // Otherwise permanently delete
    await db.storageLocation.delete({ where: { id: params.id } });

    await writeAuditLog({
      userId: user.id,
      action: 'DELETE_STORAGE_LOCATION',
      entity: 'StorageLocation',
      entityId: params.id,
      before: existing,
    });

    return NextResponse.json({ ok: true, message: 'Storage location deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || 'Failed to delete location' }, { status: 500 });
  }
}
