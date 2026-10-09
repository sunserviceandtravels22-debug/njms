// Implements: FR-PLT-12 | Doc: 03_TECH §6, §7

import { NextResponse } from 'next/server';
import { db } from './db';
import { Prisma } from '@prisma/client';

export async function handleIdempotency<T>(
  key: string | null,
  userId: string,
  route: string,
  execute: () => Promise<{ status: number; body: T }>
): Promise<NextResponse> {
  if (!key) {
    // If no Idempotency-Key header is provided, execute directly
    const result = await execute();
    return NextResponse.json(result.body, { status: result.status });
  }

  const existing = await db.idempotencyKey.findUnique({
    where: { key },
  });

  if (existing) {
    if (existing.status === 'COMPLETED' && existing.responseJson) {
      return NextResponse.json(existing.responseJson, {
        status: 200,
        headers: { 'X-Cache': 'IDEMPOTENCY_REPLAY' },
      });
    }
    if (existing.status === 'PROCESSING') {
      return NextResponse.json(
        { code: 'IDEMPOTENCY_IN_PROGRESS', message: 'Request is currently being processed' },
        { status: 409 }
      );
    }
  }

  await db.idempotencyKey.create({
    data: {
      key,
      userId,
      route,
      status: 'PROCESSING',
    },
  });

  try {
    const result = await execute();
    await db.idempotencyKey.update({
      where: { key },
      data: {
        status: 'COMPLETED',
        responseJson: result.body as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    await db.idempotencyKey.delete({ where: { key } }).catch(() => {});
    throw error;
  }
}
