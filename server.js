// Production Server Entrypoint for Hostinger Node.js Application Manager
// Startup file: server.js
// Node.js version: 18.x or 20.x

'use strict';

const path = require('path');
const fs = require('fs');

// ─── Step 1: Load .env file manually (Hostinger may not auto-load it) ─────────
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 1) continue;
    const key = trimmed.substring(0, eqIdx).trim();
    let val = trimmed.substring(eqIdx + 1).trim();
    // Strip surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
  console.log('[server.js] Loaded .env from:', envPath);
} else {
  console.log('[server.js] No .env file found at:', envPath, '— relying on system environment variables');
}

// ─── Step 2: Ensure DATABASE_URL is always set to Hostinger ───────────────────
const HOSTINGER_DB_URL =
  'mysql://u148306822_admin:%2FYREd%5ExERMb_%24q8@srv2209.hstgr.io:3306/u148306822_njms?connection_limit=10&connect_timeout=30';

const currentDbUrl = process.env.DATABASE_URL || '';
if (!currentDbUrl || currentDbUrl.includes('localhost') || currentDbUrl.includes('njms_dev') || currentDbUrl.includes('root:password')) {
  console.log('[server.js] DATABASE_URL not set or is placeholder — using Hostinger production database');
  process.env.DATABASE_URL = HOSTINGER_DB_URL;
} else {
  console.log('[server.js] DATABASE_URL loaded from environment');
}

// ─── Step 3: Set required defaults if missing ──────────────────────────────────
if (!process.env.NODE_ENV) process.env.NODE_ENV = 'production';
if (!process.env.TZ) process.env.TZ = 'Asia/Kolkata';

const port = parseInt(process.env.PORT || '3000', 10);
const hostname = process.env.HOSTNAME || '0.0.0.0';

console.log(`[server.js] Starting NJMS in ${process.env.NODE_ENV} mode on port ${port}`);

// ─── Step 4: Start Next.js server ─────────────────────────────────────────────
// Try standalone build first (.next/standalone/server.js), fall back to regular next
const standalonePath = path.join(__dirname, '.next', 'standalone', 'server.js');

if (fs.existsSync(standalonePath)) {
  // ── Standalone mode (output: 'standalone') ──────────────────────────────────
  console.log('[server.js] Using standalone build at .next/standalone/server.js');

  // Copy static assets to standalone if not already there
  const standalonePublic = path.join(__dirname, '.next', 'standalone', 'public');
  const standaloneStatic = path.join(__dirname, '.next', 'standalone', '.next', 'static');
  const srcStatic = path.join(__dirname, '.next', 'static');
  const srcPublic = path.join(__dirname, 'public');

  if (!fs.existsSync(standaloneStatic) && fs.existsSync(srcStatic)) {
    fs.cpSync(srcStatic, standaloneStatic, { recursive: true });
    console.log('[server.js] Copied .next/static to standalone');
  }
  if (!fs.existsSync(standalonePublic) && fs.existsSync(srcPublic)) {
    fs.cpSync(srcPublic, standalonePublic, { recursive: true });
    console.log('[server.js] Copied public to standalone');
  }

  // Set port for standalone server
  process.env.PORT = String(port);
  process.env.HOSTNAME = hostname;

  // Run standalone server.js directly
  require(standalonePath);
} else {
  // ── Regular mode (next start) ────────────────────────────────────────────────
  console.log('[server.js] Standalone build not found, starting in regular mode');

  const { createServer } = require('http');
  const { parse } = require('url');
  const next = require('next');

  const app = next({ dev: false, hostname, port });
  const handle = app.getRequestHandler();

  app.prepare().then(() => {
    createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error('[server.js] Request error:', req.url, err);
        res.statusCode = 500;
        res.end('Internal Server Error');
      }
    })
      .once('error', (err) => {
        console.error('[server.js] Server error:', err);
        process.exit(1);
      })
      .listen(port, hostname, () => {
        console.log(`[server.js] NJMS ready → http://${hostname}:${port}`);
      });
  });
}
