// Implements: Doc 14 §9 & §10

import { PrismaClient } from '@prisma/client';

// Global BigInt JSON serialization polyfill
if (typeof BigInt !== 'undefined' && !(BigInt.prototype as any).toJSON) {
  (BigInt.prototype as any).toJSON = function (this: bigint) {
    return this.toString();
  };
}

// Recommended Hostinger URL format with connection_limit=5 to prevent connection exhaustion
export const DEFAULT_HOSTINGER_DB_URL =
  'mysql://u148306822_admin:%2FYREd%5ExERMb_%24q8@srv2209.hstgr.io:3306/u148306822_njms?connection_limit=5&pool_timeout=20&connect_timeout=15';

export function resolveDatabaseUrl(): string {
  const url = process.env.DATABASE_URL ?? '';

  if (!url || url.includes('njms_dev') || url.includes('root:password@localhost')) {
    return DEFAULT_HOSTINGER_DB_URL;
  }

  // Ensure connection_limit is tuned if not present
  if (!url.includes('connection_limit=')) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}connection_limit=5&pool_timeout=20&connect_timeout=15`;
  }

  return url;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const dbUrl = resolveDatabaseUrl();
process.env.DATABASE_URL = dbUrl;

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: { url: dbUrl },
    },
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}
