# Hostinger Deployment & MySQL Setup Guide for NJMS

This guide explains how to connect NJMS to Hostinger's MySQL database, deploy the Next.js application, and run migrations.

---

## 1. Hostinger MySQL Database Setup

### Step 1.1: Create MySQL Database in Hostinger hPanel
1. Log in to your **Hostinger hPanel**.
2. Navigate to **Databases** → **MySQL Databases**.
3. Create a new database:
   - **Database Name**: e.g., `u123456789_njms`
   - **Username**: e.g., `u123456789_admin`
   - **Password**: Generate a strong password (copy and store securely).
4. Note down:
   - **MySQL Host**:
     - If hosting the Node.js app directly on Hostinger VPS/cPanel: typically `localhost` or `127.0.0.1`.
     - If connecting remotely: Hostinger provides a remote host address (e.g., `sql123.main-hosting.eu`).
   - **Port**: Default is `3306`.

### Step 1.2: Enable Remote MySQL (If deploying externally or running migrations locally)
If running migrations or connecting from outside Hostinger:
1. In hPanel, go to **Databases** → **Remote MySQL**.
2. Under **IP (IPv4 or IPv6)**, enter `%` (to allow all IPs during setup) or enter your specific public IP address.
3. Select your database from the dropdown and click **Create**.

---

## 2. Environment Variables Configuration

Create a `.env` file on your Hostinger server (or in the Hostinger Node.js Application Manager):

```env
# Database Connection (Replace with your actual Hostinger credentials)
DATABASE_URL="mysql://u123456789_admin:YOUR_PASSWORD@localhost:3306/u123456789_njms?connection_limit=10"

# Application Secrets
SESSION_SECRET="your-secure-random-32-character-session-secret"
PIN_PEPPER="your-secure-pin-pepper-secret-string"
APP_URL="https://yourdomain.com"
CRON_SECRET="your-secure-cron-secret-key"

# Storage & Timezone
UPLOAD_DIR="./uploads"
BACKUP_ENCRYPTION_KEY="your-secure-backup-encryption-key"
TZ="Asia/Kolkata"

# First Owner User Initialization (Used only during initial seed)
SEED_OWNER_USERNAME="owner"
SEED_OWNER_PASSWORD="YourStrongPassword123!"
SEED_OWNER_NAME="Narayan Jewellers Owner"
SEED_OWNER_PIN="1234"
```

> **Note on DATABASE_URL parameters**:
> - If connecting remotely with SSL: append `&sslaccept=strict` or `&sslmode=prefer` if required by Hostinger SSL configuration.
> - `connection_limit=10` ensures connection pools stay within Hostinger MySQL plan limits.

---

## 3. Database Migration & Initialization

On Hostinger (via SSH Terminal) or locally pointed to Hostinger MySQL:

### Apply Database Schema:
```bash
npx prisma db push
```
*or*
```bash
npx prisma migrate deploy
```

### Seed Initial Data (Owner account, master records, system sequence):
```bash
npm run prisma:seed
```

---

## 4. Hostinger Node.js Application Setup

### Option A: Hostinger Cloud / Shared cPanel Node.js Selector
1. In hPanel, go to **Advanced** → **Node.js**.
2. Click **Create Application**.
3. Set:
   - **Node.js Version**: `20.x` or `18.x` LTS.
   - **Application Mode**: `Production`.
   - **Application Root**: `njms` (or `public_html/njms`).
   - **Application URL**: `yourdomain.com`.
   - **Application Startup File**: `node_modules/next/dist/bin/next` with argument `start -p $PORT` or create a `server.js` wrapper:
     ```javascript
     const { createServer } = require('http');
     const { parse } = require('url');
     const next = require('next');
     const dev = false;
     const app = next({ dev });
     const handle = app.getRequestHandler();
     const port = process.env.PORT || 3000;
     app.prepare().then(() => {
       createServer((req, res) => {
         const parsedUrl = parse(req.url, true);
         handle(req, res, parsedUrl);
       }).listen(port, (err) => {
         if (err) throw err;
         console.log(`> Ready on port ${port}`);
       });
     });
     ```
4. Click **Create**.
5. In the npm actions panel:
   - Run `npm install` (this will automatically trigger `postinstall: prisma generate`).
   - Run `npm run build`.
   - Click **Restart Application**.

### Option B: Hostinger VPS (Ubuntu / Debian with PM2)
If using a Hostinger VPS:
1. Clone the repository:
   ```bash
   git clone https://github.com/<your-username>/<your-repo>.git njms
   cd njms
   ```
2. Create `.env`:
   ```bash
   nano .env
   ```
3. Install dependencies and generate Prisma Client:
   ```bash
   npm install
   ```
4. Push database schema to MySQL:
   ```bash
   npx prisma db push
   npm run prisma:seed
   ```
5. Build the application:
   ```bash
   npm run build
   ```
6. Start with PM2:
   ```bash
   pm2 start npm --name "njms" -- start
   pm2 save
   pm2 startup
   ```
7. Configure Nginx reverse proxy to forward port 80/443 to `http://127.0.0.1:3000`.

---

## 5. Automated Health & Cron Setup

NJMS has automated cron routes for data integrity, activity chain audits, and alerts:
- Activity Chain Audit: `/api/cron/verify-activity-chain`
- Alert Evaluation: `/api/cron/evaluate-alerts`
- Data Health Verification: `/api/cron/data-health`

In Hostinger **Cron Jobs** section, add curls matching your schedule:
```bash
curl -X POST https://yourdomain.com/api/cron/data-health -H "Authorization: Bearer YOUR_CRON_SECRET"
```
