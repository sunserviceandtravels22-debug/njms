import { PrismaClient } from '@prisma/client';

// The DATABASE_URL is read from the environment.
// On Hostinger: set it in Node.js Application Manager -> Environment Variables
// or place it in the .env file in your project root.
//
// Correct format for Hostinger MySQL with special characters in password:
//   mysql://u148306822_admin:%2FYREd%5ExERMb_%24q8@srv2209.hstgr.io:3306/u148306822_njms?connection_limit=10&connect_timeout=30
//
// Note: Special characters in the password must be URL-encoded:
//   /  →  %2F     ^  →  %5E     $  →  %24

export function resolveDatabaseUrl(): string {
  const url = process.env.DATABASE_URL ?? '';

  if (!url || url.includes('njms_dev') || url.includes('root:password@localhost')) {
    // Hardcoded Hostinger fallback — keeps the app alive even if .env is missing on server
    return 'mysql://u148306822_admin:%2FYREd%5ExERMb_%24q8@srv2209.hstgr.io:3306/u148306822_njms?connection_limit=10&connect_timeout=30';
  }

  return url;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const dbUrl = resolveDatabaseUrl();

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: { url: dbUrl },
    },
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
