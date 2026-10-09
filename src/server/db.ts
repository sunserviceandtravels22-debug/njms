import { PrismaClient } from '@prisma/client';

export const HOSTINGER_PROD_DB_URL =
  'mysql://u148306822_admin:%2FYREd%5ExERMb_%24q8@srv2209.hstgr.io:3306/u148306822_njms?connection_limit=10';

export function resolveDatabaseUrl(): string {
  let url = process.env.DATABASE_URL;

  // 1. Fallback to Hostinger production database if no environment variable provided
  // or if dummy local placeholder (root:password@localhost/njms_dev) is present
  if (!url || url.trim() === '' || url.includes('root:password@localhost') || url.includes('njms_dev')) {
    return HOSTINGER_PROD_DB_URL;
  }

  // 2. Fix unencoded special characters in the Hostinger password if passed raw in .env
  if (url.includes('/YREd^xERMb_$q8')) {
    url = url.replace('/YREd^xERMb_$q8', '%2FYREd%5ExERMb_%24q8');
  }

  // 3. Fix localhost / 127.0.0.1 redirect for Hostinger accounts where DB is remote (srv2209.hstgr.io)
  if (url.includes('u148306822_admin') && (url.includes('@localhost') || url.includes('@127.0.0.1'))) {
    url = url.replace('@localhost', '@srv2209.hstgr.io').replace('@127.0.0.1', '@srv2209.hstgr.io');
  }

  return url;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const activeUrl = resolveDatabaseUrl();
process.env.DATABASE_URL = activeUrl;

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: activeUrl,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
