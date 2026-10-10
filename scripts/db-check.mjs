// Implements: Doc 14 §3 & §5 (scripts/db-check.mjs standalone connectivity test)
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

// 1. Manually parse .env if present
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.substring(0, eqIdx).trim();
        let val = trimmed.substring(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}

let dbUrl = process.env.DATABASE_URL;
if (!dbUrl || dbUrl.includes('root:password@localhost') || dbUrl.includes('njms_dev')) {
  dbUrl = 'mysql://u148306822_admin:%2FYREd%5ExERMb_%24q8@srv2209.hstgr.io:3306/u148306822_njms?connection_limit=5&connect_timeout=15';
}

const sanitized = dbUrl.replace(/:([^:@]+)@/, ':***@');
console.log(`[db-check] Connecting to: ${sanitized}`);

const prisma = new PrismaClient({
  datasources: { db: { url: dbUrl } },
});

async function main() {
  const start = Date.now();
  const [ping] = await prisma.$queryRawUnsafe('SELECT 1 as ping');
  const [version] = await prisma.$queryRawUnsafe('SELECT VERSION() as v');
  const [charset] = await prisma.$queryRawUnsafe('SHOW VARIABLES LIKE "character_set_database"');
  const [collate] = await prisma.$queryRawUnsafe('SHOW VARIABLES LIKE "collation_database"');
  const elapsed = Date.now() - start;

  console.log(`[db-check] SUCCESS! Latency: ${elapsed}ms`);
  console.log(`[db-check] Engine Version: ${version.v}`);
  console.log(`[db-check] Charset: ${charset.Value} / Collation: ${collate.Value}`);
  await prisma.$disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('[db-check] FAILED TO CONNECT TO DATABASE:', err.message);
  process.exit(1);
});
