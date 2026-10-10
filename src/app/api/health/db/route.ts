// Implements: Doc 14 §11 (/api/health/db deep DB probe, token protected)

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/db';
import { getSessionUser } from '@/server/auth';
import { checkStorageHealth } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Authorization: header x-health-token, query param token, or Owner session
  const configuredToken = process.env.HEALTH_TOKEN || 'njms-health-probe-secret-token-2026';
  const headerToken = req.headers.get('x-health-token');
  const queryToken = new URL(req.url).searchParams.get('token');

  let authorized = false;
  if ((headerToken && headerToken === configuredToken) || (queryToken && queryToken === configuredToken)) {
    authorized = true;
  } else {
    try {
      const user = await getSessionUser();
      if (user && user.role === 'OWNER') {
        authorized = true;
      }
    } catch {
      // ignore
    }
  }

  if (!authorized) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized: valid x-health-token header or Owner session required' },
      { status: 401 }
    );
  }

  const steps: Record<string, { status: 'PASS' | 'FAIL'; latencyMs?: number; details?: any }> = {};
  let overallOk = true;

  // ── Step 1: SELECT 1 (Basic Connectivity) ──────────────────────────────────
  try {
    const t0 = Date.now();
    await db.$queryRaw`SELECT 1 as ping`;
    steps.ping = { status: 'PASS', latencyMs: Date.now() - t0 };
  } catch (err: any) {
    overallOk = false;
    steps.ping = { status: 'FAIL', details: err.message };
  }

  // ── Step 2: System Variables & Charset ─────────────────────────────────────
  try {
    const t0 = Date.now();
    const [versionRes]: any = await db.$queryRaw`SELECT VERSION() as v`;
    const [charsetRes]: any = await db.$queryRaw`SHOW VARIABLES LIKE 'character_set_database'`;
    const [collateRes]: any = await db.$queryRaw`SHOW VARIABLES LIKE 'collation_database'`;
    const [mucRes]: any = await db.$queryRaw`SHOW VARIABLES LIKE 'max_user_connections'`;
    const [timeRes]: any = await db.$queryRaw`SELECT @@global.time_zone as gtz, @@session.time_zone as stz, NOW() as n, UTC_TIMESTAMP() as u`;

    steps.systemInfo = {
      status: 'PASS',
      latencyMs: Date.now() - t0,
      details: {
        version: versionRes?.v,
        charset: charsetRes?.Value,
        collation: collateRes?.Value,
        maxUserConnections: mucRes?.Value,
        timeZone: timeRes,
      },
    };
  } catch (err: any) {
    overallOk = false;
    steps.systemInfo = { status: 'FAIL', details: err.message };
  }

  // ── Step 3: Round-trip write -> read -> delete (Hindi & BigInt) ───────────
  try {
    const t0 = Date.now();
    const testNote = 'सोने की चेन ₹1,11,240 ✓';
    const testPaise = 11124000n;

    const created = await db.healthProbe.create({
      data: {
        note: testNote,
        amountPaise: testPaise,
      },
    });

    const read = await db.healthProbe.findUnique({ where: { id: created.id } });
    if (!read) throw new Error('Probe record not found after creation');
    if (read.note !== testNote) throw new Error(`Note mismatch: expected "${testNote}", got "${read.note}"`);
    if (read.amountPaise !== testPaise) throw new Error(`Paise mismatch: expected ${testPaise}, got ${read.amountPaise}`);

    await db.healthProbe.delete({ where: { id: created.id } });
    steps.hindiBigIntRoundTrip = {
      status: 'PASS',
      latencyMs: Date.now() - t0,
      details: {
        verifiedNote: testNote,
        verifiedPaise: '11124000',
      },
    };
  } catch (err: any) {
    overallOk = false;
    steps.hindiBigIntRoundTrip = { status: 'FAIL', details: err.message };
  }

  // ── Step 4: Transaction Commit & Rollback Test ─────────────────────────────
  try {
    const t0 = Date.now();
    let rollbackProbeId: string | null = null;

    // Test rollback: inside transaction insert then throw
    try {
      await db.$transaction(async (tx) => {
        const p = await tx.healthProbe.create({
          data: { note: 'rollback-test-probe', amountPaise: 50000n },
        });
        rollbackProbeId = p.id;
        throw new Error('FORCE_ROLLBACK');
      });
    } catch (e: any) {
      if (e.message !== 'FORCE_ROLLBACK') throw e;
    }

    if (rollbackProbeId) {
      const ghost = await db.healthProbe.findUnique({ where: { id: rollbackProbeId } });
      if (ghost) throw new Error('Transaction rollback failed: probe still exists in database!');
    }

    // Test commit: insert and commit
    const committed = await db.$transaction(async (tx) => {
      return tx.healthProbe.create({
        data: { note: 'commit-test-probe', amountPaise: 60000n },
      });
    });

    const verifyCommit = await db.healthProbe.findUnique({ where: { id: committed.id } });
    if (!verifyCommit) throw new Error('Transaction commit failed: probe not found');
    await db.healthProbe.delete({ where: { id: committed.id } });

    steps.transactions = {
      status: 'PASS',
      latencyMs: Date.now() - t0,
      details: { rollbackVerified: true, commitVerified: true },
    };
  } catch (err: any) {
    overallOk = false;
    steps.transactions = { status: 'FAIL', details: err.message };
  }

  // ── Step 5: Migrations Status ──────────────────────────────────────────────
  try {
    const t0 = Date.now();
    const applied: any = await db.$queryRaw`SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`;

    steps.migrations = {
      status: 'PASS',
      latencyMs: Date.now() - t0,
      details: {
        appliedCount: applied.length,
        migrations: applied.map((m: any) => m.migration_name),
      },
    };
  } catch (err: any) {
    overallOk = false;
    steps.migrations = { status: 'FAIL', details: err.message };
  }

  // ── Step 6: File Storage Health ───────────────────────────────────────────
  try {
    const t0 = Date.now();
    const storageRes = await checkStorageHealth();
    if (!storageRes.ok) throw new Error(storageRes.error || 'Storage write probe failed');
    steps.storage = {
      status: 'PASS',
      latencyMs: Date.now() - t0,
      details: { path: storageRes.path, writable: storageRes.writable },
    };
  } catch (err: any) {
    overallOk = false;
    steps.storage = { status: 'FAIL', details: err.message };
  }

  return NextResponse.json(
    {
      ok: overallOk,
      timestamp: new Date().toISOString(),
      steps,
    },
    { status: overallOk ? 200 : 503 }
  );
}
