import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { getOpenForUser, raise } from '@/server/services/alertService';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const raiseAlertSchema = z.object({
  ruleCode: z.string().min(1),
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  severity: z.enum(['INFO', 'WARN', 'CRITICAL']).optional(),
  payload: z.record(z.any()).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const moduleName = searchParams.get('module') || undefined;
    const severity = searchParams.get('severity') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50;

    const alerts = await getOpenForUser(user.role, {
      status,
      module: moduleName,
      severity,
      limit,
    });

    return NextResponse.json({ ok: true, data: alerts });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || 'Failed to fetch alerts' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const parsed = raiseAlertSchema.parse(body);

    const instance = await raise({
      ...parsed,
    });

    return NextResponse.json({ ok: true, data: instance });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || 'Failed to raise alert' }, { status: 400 });
  }
}
