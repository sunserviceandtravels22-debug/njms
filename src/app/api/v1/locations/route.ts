import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { writeAuditLog } from '@/server/audit';
import { db } from '@/server/db';
import { LocationType } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const locations = await db.storageLocation.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    });

    const movements = await db.custodyMovement.findMany({
      orderBy: { movedAt: 'desc' },
    });

    // Map item locations from latest movement per girvi item
    const locationCounts = new Map<string, number>();
    for (const m of movements) {
      const current = locationCounts.get(m.toLocationId) || 0;
      locationCounts.set(m.toLocationId, current + (Array.isArray(m.itemIds) ? m.itemIds.length : 1));
    }

    const formatted = locations.map((loc) => ({
      id: loc.id,
      name: loc.name,
      type: loc.type,
      active: loc.active,
      address: loc.address || null,
      requiresPinIn: loc.requiresPinIn,
      requiresPinOut: loc.requiresPinOut,
      itemCount: locationCounts.get(loc.id) || 0,
    }));

    return NextResponse.json({ ok: true, data: formatted });
  } catch (error: any) {
    console.error('Fetch locations error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to fetch storage locations' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, type = 'VAULT', address, requiresPinIn = false, requiresPinOut = false } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ ok: false, error: 'Location name is required' }, { status: 400 });
    }

    const newLoc = await db.storageLocation.create({
      data: {
        name: name.trim(),
        type: type as LocationType,
        address: address?.trim() || null,
        requiresPinIn: !!requiresPinIn,
        requiresPinOut: !!requiresPinOut,
        active: true,
      },
    });

    await writeAuditLog({
      userId: user.id,
      action: 'CREATE_STORAGE_LOCATION',
      entity: 'StorageLocation',
      entityId: newLoc.id,
      after: newLoc,
    });

    return NextResponse.json({ ok: true, data: newLoc });
  } catch (error: any) {
    console.error('Create location error:', error);
    return NextResponse.json({ ok: false, error: error.message || 'Failed to create storage location' }, { status: 500 });
  }
}
