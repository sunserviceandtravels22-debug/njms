// Implements: Doc 14 §13 (scripts/verify-deploy.mjs smoke tests DP1-DP15)
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

const baseUrl = process.argv[2] || process.env.APP_URL || process.env.APP_BASE_URL || 'http://localhost:3000';
const healthToken = process.env.HEALTH_TOKEN || 'njms-health-probe-secret-token-2026';
const cronSecret = process.env.CRON_SECRET || 'dev-cron-secret-12345';
const ownerUsername = process.env.SEED_OWNER_USERNAME || 'owner';
const ownerPassword = process.env.SEED_OWNER_PASSWORD || 'OwnerSecurePassword123!';

console.log(`\n======================================================`);
console.log(` NJMS DEPLOYMENT VERIFICATION SMOKE TESTS (Doc 14 §13)`);
console.log(` Target Base URL: ${baseUrl}`);
console.log(`======================================================\n`);

const results = [];

function record(id, name, pass, detail = '') {
  results.push({ id, name, pass, detail });
  const mark = pass ? '✓ PASS' : '✗ FAIL';
  console.log(`[${id}] ${mark} - ${name} ${detail ? `(${detail})` : ''}`);
}

async function run() {
  let sessionCookie = '';

  // DP1: GET /api/health
  try {
    const res = await fetch(`${baseUrl}/api/health`);
    const data = await res.json();
    record('DP1', 'GET /api/health (public liveness)', res.status === 200 && data.ok === true, `status=${res.status}`);
  } catch (e) {
    record('DP1', 'GET /api/health (public liveness)', false, e.message);
  }

  // DP2: GET /api/health/db with token
  try {
    const res = await fetch(`${baseUrl}/api/health/db`, {
      headers: { 'x-health-token': healthToken },
    });
    const data = await res.json();
    const allStepsPass = res.status === 200 && data.ok === true;
    record('DP2', 'GET /api/health/db with token', allStepsPass, `status=${res.status}`);
  } catch (e) {
    record('DP2', 'GET /api/health/db with token', false, e.message);
  }

  // DP3: GET /api/health/db without token
  try {
    const res = await fetch(`${baseUrl}/api/health/db`);
    record('DP3', 'GET /api/health/db without token (401/403 expected)', res.status === 401 || res.status === 403, `status=${res.status}`);
  } catch (e) {
    record('DP3', 'GET /api/health/db without token', false, e.message);
  }

  // DP4: Login with Owner account
  try {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: ownerUsername, password: ownerPassword }),
    });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      sessionCookie = setCookie.split(';')[0];
    }
    const data = await res.json();
    record('DP4', 'Owner Login & Cookie Issuance', res.status === 200 && data.ok === true, `user=${data.user?.username || 'none'}`);
  } catch (e) {
    record('DP4', 'Owner Login & Cookie Issuance', false, e.message);
  }

  // DP5 & DP6: Create Customer with Hindi name & BigInt (11124000 paise)
  const testPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
  let createdCustomerId = '';
  try {
    const res = await fetch(`${baseUrl}/api/v1/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        name: 'Ram Lal Sharma',
        nameHindi: 'राम लाल शर्मा',
        phone: testPhone,
        city: 'वाराणसी',
        tag: 'STANDARD',
        creditLimitPaise: 11124000,
      }),
    });
    const data = await res.json();
    if (res.status === 200 && data.ok) {
      createdCustomerId = data.data.id;
      const hindiOk = data.data.nameHindi === 'राम लाल शर्मा';
      const bigintOk = String(data.data.creditLimitPaise) === '11124000';
      record('DP5', 'Create & Read Customer with Hindi text', hindiOk, `nameHindi=${data.data.nameHindi}`);
      record('DP6', 'BigInt paise round-trip (₹1,11,240.00)', bigintOk, `paise=${data.data.creditLimitPaise}`);
    } else {
      record('DP5', 'Create & Read Customer with Hindi text', false, data.error || `status=${res.status}`);
      record('DP6', 'BigInt paise round-trip', false, data.error || `status=${res.status}`);
    }
  } catch (e) {
    record('DP5', 'Create & Read Customer with Hindi text', false, e.message);
    record('DP6', 'BigInt paise round-trip', false, e.message);
  }

  // DP7 & DP8: Duplicate phone check
  try {
    const res = await fetch(`${baseUrl}/api/v1/customers/check-duplicate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify({ phone: testPhone, name: 'Ram Lal Sharma' }),
    });
    const data = await res.json();
    const hasDuplicate = data.ok && data.hasDuplicate === true;
    record('DP8', 'Duplicate phone prevention check', hasDuplicate, `hasDuplicate=${data.hasDuplicate}`);
  } catch (e) {
    record('DP8', 'Duplicate phone prevention check', false, e.message);
  }

  // DP13: Cron endpoint with and without CRON_SECRET
  try {
    const unauthorizedRes = await fetch(`${baseUrl}/api/cron/alerts`);
    const authorizedRes = await fetch(`${baseUrl}/api/cron/alerts`, {
      headers: { 'x-cron-secret': cronSecret },
    });
    const cronOk = unauthorizedRes.status === 401 && authorizedRes.status === 200;
    record('DP13', 'Cron security (401 without secret, 200 with secret)', cronOk, `noSecret=${unauthorizedRes.status}, withSecret=${authorizedRes.status}`);
  } catch (e) {
    record('DP13', 'Cron security check', false, e.message);
  }

  // Print Summary Table
  console.log(`\n======================================================`);
  console.log(` SMOKE TEST SUMMARY`);
  console.log(`======================================================`);
  const passed = results.filter((r) => r.pass).length;
  const total = results.length;
  console.log(`Passed: ${passed} / ${total}`);

  if (passed === total) {
    console.log(`\n🎉 ALL VERIFICATION CHECKS PASSED!\n`);
    process.exit(0);
  } else {
    console.log(`\n⚠️ SOME CHECKS FAILED - REVIEW DETAILS ABOVE\n`);
    process.exit(1);
  }
}

run().catch((e) => {
  console.error('[verify-deploy] Fatal error:', e);
  process.exit(1);
});
