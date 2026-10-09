// Implements: NFR-05 | Doc: 03_TECH §9

import { NextResponse } from 'next/server';
import { db } from '@/server/db';

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: 'ok',
      version: '1.0.0',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        version: '1.0.0',
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Database ping failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
