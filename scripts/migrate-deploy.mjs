// Implements: Doc 14 §3 & §5 (scripts/migrate-deploy.mjs wrapper)
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Load .env
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

console.log('[migrate-deploy] Starting Prisma migration deployment...');

try {
  const out = execSync('npx prisma migrate deploy', { stdio: 'pipe' });
  console.log(out.toString());
  console.log('[migrate-deploy] SUCCESS: All migrations applied cleanly.');
  process.exit(0);
} catch (err) {
  console.error('[migrate-deploy] ERROR: Migration failed!');
  if (err.stdout) console.error(err.stdout.toString());
  if (err.stderr) console.error(err.stderr.toString());
  process.exit(1);
}
