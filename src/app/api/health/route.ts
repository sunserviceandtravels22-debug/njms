// Implements: NFR-05 | Doc: 03_TECH §9

import { NextResponse } from 'next/server';
import { db, resolveDatabaseUrl } from '@/server/db';

export async function GET() {
  const activeUrl = resolveDatabaseUrl();
  const sanitizedUrl = activeUrl.replace(/:([^:@]+)@/, ':***@');

  try {
    const start = Date.now();
    const [versionResult]: any = await db.$queryRaw`SELECT VERSION() as version`;
    const userCount = await db.user.count();
    const latencyMs = Date.now() - start;

    return NextResponse.json({
      status: 'ok',
      version: '1.0.0',
      database: 'connected',
      dbVersion: versionResult?.version || 'Unknown',
      activeUsers: userCount,
      latencyMs,
      targetDb: sanitizedUrl,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        version: '1.0.0',
        database: 'disconnected',
        targetDb: sanitizedUrl,
        error: error instanceof Error ? error.message : 'Database ping failed',
        hint: 'Check Hostinger hPanel -> Remote MySQL to ensure incoming connections are allowed, and verify DATABASE_URL is set in environment.',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
