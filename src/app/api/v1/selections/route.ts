import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// In-memory snapshot cache with 30-minute TTL (FR-PLT-08, D12-SEL-03, D12-SEL-07)
interface SelectionSnapshot {
  id: string;
  filterKey: string;
  idList: string[];
  expiresAt: number;
}

const snapshots = new Map<string, SelectionSnapshot>();

// Periodic cleanup of expired snapshots
function pruneSnapshots() {
  const now = Date.now();
  for (const [id, s] of snapshots.entries()) {
    if (s.expiresAt <= now) {
      snapshots.delete(id);
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    pruneSnapshots();

    const body = await req.json();
    const { filterKey = 'all', idList = [] } = body;

    if (!Array.isArray(idList)) {
      return NextResponse.json({ ok: false, error: 'idList must be an array' }, { status: 400 });
    }

    const snapshotId = `sel_${crypto.randomBytes(8).toString('hex')}`;
    const expiresAt = Date.now() + 30 * 60 * 1000; // 30 minutes TTL

    snapshots.set(snapshotId, {
      id: snapshotId,
      filterKey,
      idList,
      expiresAt,
    });

    return NextResponse.json({
      ok: true,
      data: {
        snapshotId,
        count: idList.length,
        expiresAt: new Date(expiresAt).toISOString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || 'Failed to save selection snapshot' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    pruneSnapshots();

    const { searchParams } = new URL(req.url);
    const snapshotId = searchParams.get('snapshotId');

    if (!snapshotId) {
      return NextResponse.json({ ok: false, error: 'Missing snapshotId parameter' }, { status: 400 });
    }

    const snapshot = snapshots.get(snapshotId);
    if (!snapshot || snapshot.expiresAt <= Date.now()) {
      return NextResponse.json({ ok: false, error: 'Snapshot expired or not found' }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      data: {
        snapshotId: snapshot.id,
        filterKey: snapshot.filterKey,
        idList: snapshot.idList,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || 'Failed to fetch selection snapshot' }, { status: 500 });
  }
}
