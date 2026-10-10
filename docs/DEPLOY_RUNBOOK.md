# NJMS Hostinger Deployment Runbook
**Document Reference:** [14_HOSTINGER_DEPLOYMENT_DB_CONNECTIVITY.md](file:///C:/Users/saubh/Downloads/files/14_HOSTINGER_DEPLOYMENT_DB_CONNECTIVITY.md) §14  
**Product:** Narayan Jewellers Management System (NJMS)  
**Database Host:** `srv2209.hstgr.io` (IP `82.25.121.209`)  
**Application Server:** `92.249.46.120`

---

## 1. Initial Setup Checklist (One-Time)

### 1.1 Remote MySQL Permissions
In **Hostinger hPanel → Databases → Remote MySQL**:
- Add `92.249.46.120` (the web application server IP) or `%` to allow the Node.js application to query the MariaDB server.

### 1.2 Node.js Application Configuration
In **Hostinger hPanel → Websites → Node.js**:
- **Node.js version**: `20.x`
- **Application root**: `public_html` or `njms`
- **Application startup file**: `server.js`
- **Application mode**: `production`

### 1.3 Environment Variables
Set the following under **Environment Variables** in hPanel:

```env
DATABASE_URL="mysql://u148306822_admin:%2FYREd%5ExERMb_%24q8@srv2209.hstgr.io:3306/u148306822_njms?connection_limit=5&pool_timeout=20&connect_timeout=15"
NODE_ENV="production"
TZ="Asia/Kolkata"
APP_URL="https://yourdomain.com"
APP_BASE_URL="https://yourdomain.com"
AUTH_SECRET="<generate-random-32-char-string>"
PIN_PEPPER="<generate-random-pepper-string>"
HEALTH_TOKEN="njms-health-probe-secret-token-2026"
CRON_SECRET="<generate-random-cron-secret>"
UPLOAD_DIR="/home/u148306822/njms/uploads"
MAX_UPLOAD_MB="8"
```

---

## 2. Standard Deployment Procedure

### Option A: Using SSH (Recommended)
```bash
# 1. Connect via SSH
ssh -p 65002 u148306822@92.249.46.120

# 2. Pull latest code from GitHub
cd ~/njms  # or your app root directory
git pull origin main

# 3. Install dependencies & generate Prisma client
npm install

# 4. Deploy database migrations
npm run db:deploy

# 5. Build production bundle
npm run build

# 6. Restart the application via hPanel or PM2
```

### Option B: Using hPanel UI
1. In hPanel → **Git**, click **Deploy** or **Pull** to fetch the latest commit.
2. In hPanel → **Node.js**, click **Run `npm install`**.
3. Click **Restart**.

---

## 3. Post-Deployment Verification

### 3.1 Public Liveness Check
```bash
curl -i https://yourdomain.com/api/health
```
**Expected response (200 OK):**
```json
{ "ok": true, "status": "ok", "version": "1.0.0", "uptimeSeconds": 12 }
```

### 3.2 Deep Database & Storage Health Probe
```bash
curl -i -H "x-health-token: njms-health-probe-secret-token-2026" https://yourdomain.com/api/health/db
```
**Expected response (200 OK):**
```json
{
  "ok": true,
  "steps": {
    "ping": { "status": "PASS" },
    "systemInfo": { "status": "PASS" },
    "hindiBigIntRoundTrip": { "status": "PASS" },
    "transactions": { "status": "PASS" },
    "migrations": { "status": "PASS" },
    "storage": { "status": "PASS" }
  }
}
```

### 3.3 Automated Smoke Test Suite
From your local machine or server terminal:
```bash
node scripts/verify-deploy.mjs https://yourdomain.com
```
All smoke tests DP1 through DP15 will execute and output a verification report.
