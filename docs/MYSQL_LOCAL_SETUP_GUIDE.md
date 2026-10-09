# 🗄️ MySQL Local Setup Guide
### NJMS · XAMPP + MySQL Workbench 8.0 CE

> **Goal**: Connect NJMS Next.js app to a local MySQL database running via XAMPP, managed through MySQL Workbench 8.0 CE.

---

## Prerequisites

| Tool | Version | Download |
|---|---|---|
| XAMPP | Latest (8.x) | apachefriends.org |
| MySQL Workbench | 8.0 CE | mysql.com/products/workbench |
| Node.js | 18+ | Already installed |

---

## Step 1 — Start MySQL in XAMPP Control Panel

1. Open **XAMPP Control Panel** (run as Administrator on Windows).
2. Click **Start** next to **Apache** (needed for phpMyAdmin only, optional).
3. Click **Start** next to **MySQL**.
4. Verify the status turns **green** and port `3306` is shown.

> **Tip**: If port 3306 is blocked by another MySQL service, open XAMPP's `my.ini`
> (`C:\xampp\mysql\bin\my.ini`) and change `port=3306` to `3307`.

---

## Step 2 — Create the NJMS Database in MySQL Workbench

1. Open **MySQL Workbench 8.0 CE**.
2. Click **+** to add a new connection:
   - **Connection Name**: `XAMPP Local`
   - **Hostname**: `127.0.0.1`
   - **Port**: `3306`
   - **Username**: `root`
   - **Password**: *(leave blank — XAMPP default)*
3. Click **Test Connection** → should show "Successfully made the MySQL connection".
4. Click **OK** and open the connection.

5. In the **Query** tab, run:

```sql
CREATE DATABASE IF NOT EXISTS njms_dev
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Verify
SHOW DATABASES;
```

6. Click the lightning bolt button or press `Ctrl+Enter` to execute.

---

## Step 3 — Set the NJMS `.env` File

Open `C:\Users\saubh\Downloads\files\njms\.env` and set:

```env
# Local MySQL via XAMPP (default — no password)
DATABASE_URL="mysql://root:@127.0.0.1:3306/njms_dev"
```

> If you added a MySQL root password in XAMPP:
> ```env
> DATABASE_URL="mysql://root:YOUR_PASSWORD@127.0.0.1:3306/njms_dev"
> ```

> If you changed XAMPP port to 3307:
> ```env
> DATABASE_URL="mysql://root:@127.0.0.1:3307/njms_dev"
> ```

---

## Step 4 — Push the Prisma Schema to MySQL

Open a terminal in the project root and run:

```powershell
cd C:\Users\saubh\Downloads\files\njms

# Push schema (creates all tables — no migration files needed for dev)
npx prisma db push

# Optional: open Prisma Studio GUI
npx prisma studio
```

Expected output:
```
✓  Generated Prisma Client
✓  Your database is now in sync with your Prisma schema
```

> **IMPORTANT (Windows)**: Stop `npm run dev` before running any Prisma commands.
> Node keeps the Prisma DLL locked on Windows — you will get EPERM errors otherwise.

---

## Step 5 — Verify Tables in Workbench

Back in MySQL Workbench:

1. In the **Navigator** panel (left), expand **njms_dev** → **Tables**.
2. You should see tables: `Customer`, `InventoryItem`, `Sale`, `GirviLoan`, `CashTxn`, `Location`, `User`, etc.
3. Right-click any table → **Select Rows – Limit 1000** to inspect data.

---

## Step 6 — Run the App

```powershell
cd C:\Users\saubh\Downloads\files\njms
npm run dev
```

Open http://localhost:3000 — the app will now use your local MySQL database.

---

## Step 7 — Optional: Insert Sample Data

You can insert test data directly in Workbench:

```sql
USE njms_dev;

INSERT INTO Customer (id, name, phone, city, createdAt, updatedAt)
VALUES (
  UUID(),
  'Ramesh Sharma',
  '9876543210',
  'Jaipur',
  NOW(),
  NOW()
);
```

Or use **Prisma Studio** at http://localhost:5555 (run `npx prisma studio`).

---

## Common Issues & Fixes

| Problem | Cause | Fix |
|---|---|---|
| `ECONNREFUSED 127.0.0.1:3306` | MySQL not started | Start MySQL in XAMPP Control Panel |
| `Access denied for user 'root'` | Wrong password | Use empty password for XAMPP default |
| `Unknown database 'njms_dev'` | DB not created | Run Step 2 again |
| `EPERM: operation not permitted` | Dev server running | Stop `npm run dev`, then run Prisma |
| `Error: P1001` (Prisma timeout) | MySQL stopped | Restart MySQL in XAMPP |
| Port conflict on 3306 | Another MySQL instance | Change XAMPP port to 3307 in `my.ini` |
| `Table 'njms_dev.X' doesn't exist` | Schema not pushed | Run `npx prisma db push` again |

---

## Quick Reference Commands

| Task | Command |
|---|---|
| Push schema to DB | `npx prisma db push` |
| Generate Prisma Client | `npx prisma generate` |
| Open Prisma Studio GUI | `npx prisma studio` |
| Reset DB (destroy all data) | `npx prisma db push --force-reset` |
| Check DB connection | `npx prisma db pull` |
| Export backup | Workbench → Server → Data Export |

---

## Security Note

XAMPP MySQL is for **local development only**. Never expose it to the internet.
For production use a managed MySQL service: PlanetScale, Railway, or a VPS with MySQL 8.0.

---

*Generated: 2026-09-29 | NJMS Barcode & Customer Resolver Sprint*
