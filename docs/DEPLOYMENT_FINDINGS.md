# Hostinger Deployment Findings (V1–V15)
**System:** Narayan Jewellers Management System (NJMS)  
**Verification Date:** 10 Oct 2026  
**Document Reference:** [14_HOSTINGER_DEPLOYMENT_DB_CONNECTIVITY.md](file:///C:/Users/saubh/Downloads/files/14_HOSTINGER_DEPLOYMENT_DB_CONNECTIVITY.md) §2

---

## Findings Table

| # | Check | Verified Value / Finding | Verification Method & Notes |
|---|---|---|---|
| **V1** | **Hostinger Plan & Node.js Support** | Hostinger Managed Node.js Web App Hosting active | Verified in hPanel Application Manager |
| **V2** | **Supported Node.js Version** | Node.js **20.x** (pinned `20.18.0` in `.nvmrc`) | Next.js 14 requires `>=18.17.0`; Node 20 LTS active |
| **V3** | **Database Engine & Version** | **MariaDB 11.8.9-MariaDB-log** | `SELECT VERSION();` → verified against live server |
| **V4** | **DB Host & Port** | `srv2209.hstgr.io` (IP `82.25.121.209`), Port **3306** | Remote DB server separate from app host (`92.249.46.120`). Localhost does NOT resolve on production. |
| **V5** | **Max Connections per User** | `max_user_connections = 75`, `MAX_CONNECTIONS_PER_HOUR = 500` | `SHOW VARIABLES LIKE 'max_user_connections'`. Connection pool configured to `connection_limit=5` to prevent quota exhaustion. |
| **V6** | **DB User Privileges** | `ALL PRIVILEGES` on `u148306822_njms.*` | `SHOW GRANTS;` → grants SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP, REFERENCES, TRIGGER. |
| **V7** | **SSH Availability** | **Available** (`ssh -p 65002 u148306822@92.249.46.120`) | SSH enabled on port 65002 for running `npm run db:deploy`. |
| **V8** | **Cron Job Availability** | Available via hPanel → Advanced → Cron Jobs | Protected by `x-cron-secret: $CRON_SECRET` on `/api/cron/*`. |
| **V9** | **Build Memory & Strategy** | Build succeeds locally and standalone output configured | `output: 'standalone'` in `next.config.mjs`, `eslint.ignoreDuringBuilds: true` to prevent OOM errors. |
| **V10** | **Upload Directory Persistence** | `/home/u148306822/njms/uploads` | Abstracted in `src/lib/storage.ts` to exist outside git working directory to prevent data loss on redeploy. |
| **V11** | **Prisma Binary Targets** | `native`, `debian-openssl-3.0.x`, `debian-openssl-1.1.x`, `rhel-openssl-1.1.x`, `rhel-openssl-3.0.x`, `linux-musl-openssl-3.0.x` | Configured in `prisma/schema.prisma` to cover CloudLinux (RHEL based) and Debian/Ubuntu. |
| **V12** | **HTTPS & Reverse Proxy** | Hostinger Nginx reverse proxy | `src/server/auth.ts` cookie flags made adaptive to ensure cookies persist whether on HTTP or HTTPS. |
| **V13** | **Time Zone** | Server: `SYSTEM` (UTC), Application: `Asia/Kolkata` (IST) | `TZ=Asia/Kolkata` configured across app runtime and server. |
| **V14** | **Database Charset & Collation** | `utf8mb4` / `utf8mb4_unicode_ci` | `SHOW VARIABLES LIKE 'character_set_database'`. Hindi text Verified: `राम लाल शर्मा`, `सोने की चेन ₹1,11,240 ✓`. |
| **V15** | **Backups** | Automated daily backups in hPanel + application export | hPanel automated snapshots active. |

---

## Migration Baseline Status
- `_prisma_migrations` table created and populated.
- Baseline migration `20261010000000_init` verified and marked applied.
- `HealthProbe` probe table created with active round-trip testing.
