// Implements: FR-PLT-04, FR-PLT-04a | Screen: S-80 | Doc: 03_TECH §9, §10

import { NextResponse } from 'next/server';
import { db } from '@/server/db';
import { getSessionUser } from '@/server/auth';
import { assertCapability } from '@/server/permissions';
import { writeAuditLog } from '@/server/audit';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Not authenticated' }, { status: 401 });
  }

  const settingsList = await db.setting.findMany();
  const settingsMap: Record<string, unknown> = {};
  for (const s of settingsList) {
    settingsMap[s.key] = s.value;
  }

  return NextResponse.json({ settings: settingsMap });
}

export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Not authenticated' }, { status: 401 });
  }

  try {
    assertCapability(user.role, 'EDIT_RATES_SETTINGS');
  } catch {
    return NextResponse.json({ code: 'FORBIDDEN', message: 'Only Owner can edit settings' }, { status: 403 });
  }

  try {
    const { key, value } = await request.json();
    if (!key || value === undefined) {
      return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Key and value required' }, { status: 400 });
    }

    const before = await db.setting.findUnique({ where: { key } });

    const updated = await db.setting.upsert({
      where: { key },
      update: { value, updatedById: user.id },
      create: { key, value, updatedById: user.id },
    });

    await writeAuditLog({
      userId: user.id,
      action: 'UPDATE_SETTING',
      entity: 'Setting',
      entityId: key,
      before: before?.value,
      after: value,
    });

    return NextResponse.json({ key: updated.key, value: updated.value });
  } catch (error) {
    return NextResponse.json({ code: 'SERVER_ERROR', message: 'Failed to update setting' }, { status: 500 });
  }
}
