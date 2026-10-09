# 03 · Technical Document
**Product:** Narayan Jewellers Management System (NJMS) · **Version:** 1.1 · **Date:** 01 Oct 2026
**Hosting:** Hostinger (managed Node.js web app) · **Database:** MySQL
**Read with:** `01_PRD.md` (FR-* IDs) · `02_DESIGN.md` (S-* screens, C-* components)
**Rule:** TECH is the authority on data, rules and architecture. Any change to schema, API, formulas or stack must be reflected here **first**, then in code.

---

## 1. Architecture decisions (ADR summary)

| # | Decision | Reason | Revisit if |
|---|---|---|---|
| ADR-1 | **One Next.js (App Router) + TypeScript app**, server and client in one repo | One deployable unit fits Hostinger's managed Node.js hosting; shared types | Team grows / need separate API |
| ADR-2 | **MySQL 8 (utf8mb4)** through **Prisma ORM** | Requirement; Prisma gives typed queries and migrations | Complex reporting needs raw SQL (allowed via `$queryRaw`) |
| ADR-3 | **Barcode generator is ported as a client-side feature module** (`src/modules/barcode`), rendering stays in the browser | The original is fully client-side and works offline; no server load | Server-side batch rendering needed |
| ADR-4 | **Money = integer paise (DB BIGINT), weight = integer mg**, no floats | Exactness | Never |
| ADR-5 | **Append-only ledgers + reversal entries** for payments, credit, girvi, stock | Auditability | Never |
| ADR-6 | **Pure domain layer** (`src/domain`) for pricing, interest, SKU, tenure; no I/O | Testability | Never |
| ADR-7 | **Session cookies stored in MySQL** (no Redis), password hashing with pure-JS `bcryptjs` | Managed hosting may not allow native modules or extra services | Move to Redis if scaling |
| ADR-8 | **Drafts in IndexedDB (Dexie)** with optional server sync to a `drafts` table | Survives refresh/crash, works offline | n/a |
| ADR-9 | **Scheduled jobs via hPanel cron calling secured HTTPS endpoints** | No always-on worker on managed hosting | VPS worker available |
| ADR-10 | **File storage behind an adapter** (local disk outside the deploy folder, or S3-compatible) | Deploys may wipe the app folder; uploads must persist | n/a |
| ADR-11 | **Client-side PDF (jsPDF, vector bars) for labels; HTML print CSS + `@react-pdf/renderer` for invoices/slips when a file is needed** | No headless browser on managed hosting | VPS available |
| ADR-12 | **No Redis, no queue in v1.** Idempotency, rate limits and locks use MySQL | Fewer moving parts | Load grows |
| ADR-13 | **Tagging uses a polymorphic `entity_tags` join table** (`entityType + entityId + tagId`) rather than per-table tag columns | One engine, one API, one admin UI; tags apply to any entity type | Tag-specific query performance; may need denormalized columns later |
| ADR-14 | **Purchase lots decouple inventory cost from cash** — inventory booked at provisional cost; cash moves only on explicit vendor payment | Prevents phantom cash entries from stock imports | n/a |
| ADR-15 | **Multi-tranche girvi uses a `girvi_tranche` child table** rather than a single-row rate on `girvi_loans` | Supports top-ups, renewals and metal splits without re-creating the loan | Mitigated by `PaymentAllocation` audit table |
| ADR-16 | **`TxnLabel` / smart-names normalises cashbook party names** — suggestion engine with use-count, cadence, and amount stats | Deterministic cashbook labels; enables analytics by named party | Merge/alias flow needed over time |

**Hosting note (verify in hPanel before M1):** Hostinger's Next.js / Node.js web-app hosting is offered on its **Business and Cloud** tiers, which include managed Node.js apps, managed MySQL, GitHub auto-deploy, daily and on-demand backups, and cron jobs. A cheaper shared plan may not run Node.js. Confirm: Node.js LTS version available, memory/CPU limits, persistent folders, cron availability, remote-MySQL policy.

---

## 2. System architecture

```
 Browser (PWA, mobile-first)                        Hostinger managed Node.js app
┌───────────────────────────────┐   HTTPS   ┌─────────────────────────────────────────┐
│ React UI (Next.js client)      │ ────────► │ Next.js route handlers  /api/v1/*        │
│  • TanStack Query cache        │           │   auth → validate(zod) → service layer   │
│  • Zustand (cart, studio)      │           │   → domain (pure) → Prisma → MySQL       │
│  • Dexie: drafts, offline queue│ ◄──────── │ /api/cron/* (secret) · /api/health       │
│  • Barcode Studio (client-only)│           │ Storage adapter (disk | S3)              │
│  • Camera/USB scanner input    │           └───────────────┬─────────────────────────┘
└───────────────────────────────┘                             │
        Service Worker (Serwist/Workbox)              Hostinger managed MySQL
        app shell + offline sale queue                (daily backups + app-level export)
```

Layering rule: `app/api` → `server/services` → `domain` + `server/repositories(Prisma)`. UI never imports `server/*`. `domain/*` imports nothing from Prisma, React or Node APIs.

---

## 3. Stack

| Concern | Choice |
|---|---|
| Framework | Next.js (latest stable, App Router), React 18/19, TypeScript strict |
| Styling | Tailwind CSS **build-time** (v3.4 to match the ported code; v4 acceptable if all modules move together), shadcn/ui (Radix), Lucide icons |
| Forms/validation | react-hook-form + **zod** (shared schemas client and server) |
| Data fetching | TanStack Query; server state only |
| Local state | Zustand (POS cart, Barcode Studio) |
| DB/ORM | MySQL 8 + Prisma (follow the current Prisma docs for client/config layout; check whether the installed major version needs a driver adapter or `prisma.config.ts`) |
| Auth | Own session module: `bcryptjs`, session table, `otplib` (TOTP for Owner), PIN hash |
| i18n | next-intl (`en`, `hi`), messages in `src/messages` |
| Dates | date-fns + date-fns-tz, zone `Asia/Kolkata` |
| Numbers | `decimal.js` for intermediate math, integers at rest |
| Drafts/offline | Dexie (IndexedDB), Serwist (or Workbox) service worker |
| Barcodes | `jsbarcode`, `qrcode` (ported); camera reading via `BarcodeDetector` with `@zxing/browser` fallback |
| PDF/Excel | `jspdf` (labels), `@react-pdf/renderer` (documents, with Noto Sans Devanagari embedded), Excel via a maintained library (see audit A-10), `papaparse` for CSV, `jszip` |
| Testing | Vitest (unit), Playwright (e2e, mobile + desktop projects), Testing Library |
| Quality | ESLint, Prettier, `tsc --noEmit`, Husky pre-commit, GitHub Actions CI |
| Monitoring | Structured logs, `/api/health`, optional Sentry |

---

## 4. Repository layout

```
njms/
├─ docs/                     00_PROGRESS.md · 01_PRD.md · 02_DESIGN.md · 03_TECH.md
│                            04_ANTIGRAVITY_PROMPTS.md · appendix/ (A, B blueprints)
├─ .agent/                   (Antigravity rules & workflows; see 04)
├─ prisma/                   schema.prisma · migrations/ · seed.ts
├─ public/                   manifest.webmanifest · icons/ · fonts/
├─ src/
│  ├─ app/
│  │  ├─ (auth)/login
│  │  ├─ (app)/             dashboard · customers · inventory · sell · credit · girvi
│  │  │                     barcode · reports · finance · settings · drafts
│  │  └─ api/v1/…  api/cron/…  api/health
│  ├─ domain/                money · weight · dates · pricing · interest/{girvi,credit,tenure}
│  │                         sku · ltv · numberToWords   (pure + *.test.ts)
│  ├─ server/                db · auth · permissions · services/* · repositories/*
│  │                         audit · idempotency · storage/ · jobs/ · reports/
│  ├─ modules/
│  │  ├─ barcode/            types.ts · constants.ts · lib/ · components/ · store/ · BarcodeStudio.tsx
│  │  ├─ pos/ credit/ girvi/ customers/ inventory/ reports/
│  ├─ components/            ui/ (shadcn) · shell/ · shared/ (C-xx components)
│  ├─ lib/                   apiClient · i18n · drafts (dexie) · pwa · format
│  └─ messages/              en.json · hi.json
├─ e2e/                      Playwright specs
└─ .env.example              (never commit .env)
```
Every source file starts with a header comment: `// Implements: FR-XXX-nn · Screen: S-nn · Component: C-nn · Doc: 03_TECH §n`.

---

## 5. Environment variables (`.env.example`)

| Name | Purpose |
|---|---|
| `DATABASE_URL` | `mysql://USER:PASSWORD@HOST:3306/DBNAME` (copy exact host from hPanel → Databases) |
| `SESSION_SECRET` | 32+ random bytes for signing/hashing tokens |
| `PIN_PEPPER` | Server-side pepper for PIN hashes |
| `APP_URL` | Public HTTPS origin (CSRF origin check, links) |
| `CRON_SECRET` | Shared secret for `/api/cron/*` |
| `UPLOAD_DIR` | Absolute folder **outside** the deploy directory for uploads |
| `BACKUP_ENCRYPTION_KEY` | Encrypts app-level backup files |
| `TZ` | `Asia/Kolkata` |
| `NEXT_PUBLIC_*` | Only non-secret values (shop display name, app version) |

Rules: no secrets in Git, screenshots or prompts. Local dev uses a **local MySQL (Docker)**; production credentials are entered only in hPanel. Remove the unused Gemini key placeholder from the original barcode app.

---

## 6. Global conventions

| Topic | Rule |
|---|---|
| Money | BIGINT paise in DB; API and UI use integer paise (JS number, asserted ≤ 2^53); format only at display (`₹1,11,240`) |
| Weight | INT milligrams; display grams with 3 decimals |
| Rates | Stored per gram in paise (`sellPaisePerGram`); rate on the invoice is copied onto `sale_items` |
| Percentages | Basis points (1% = 100 bp) integers |
| Purity | Metal purity as parts-per-thousand (22K = 916, 18K = 750, silver 925 = 925); label text separate |
| Time | Store UTC (`DATETIME(3)`), date-only fields as `DATE` (IST business date); render in IST; FY = 1 Apr–31 Mar |
| IDs | `cuid` strings; human numbers (`INV-2026-0142`, `GV-2026-0031`, `CR-…`) from the `counters` table, per FY |
| Soft delete | `deletedAt`; nothing physically deleted; ledgers append-only with `reversedOfId` |
| Rounding | Half-up, once per line item at the final step; test-covered |
| Errors | JSON `{ code, message, fields? }`; HTTP 400 validation, 401, 403, 404, 409 (conflict/duplicate/sold), 422 (business rule), 429, 500 |
| Idempotency | Header `Idempotency-Key` (UUID created per form submission, saved inside the draft) on all POSTs that create money or stock records |
| Audit | Service layer writes `audit_log` in the same transaction as the change |

---

## 7. Database schema (Prisma, MySQL)

> **Authoritative source:** `prisma/schema.prisma` (1,123 lines). The condensed block below covers the **original M1–M9 scope**. Extended models added in M18–Doc 11 are documented in the **Extended Schema** sub-section below the MySQL notes. All money fields are `BigInt` paise; weights `Int` mg.

```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "debian-openssl-3.0.x"]   // verify against host OS
}
datasource db { provider = "mysql"  url = env("DATABASE_URL") }

// ───────── Enums ─────────
enum Role            { OWNER MANAGER STAFF ACCOUNTANT }
enum RelationType    { FATHER MOTHER HUSBAND SELF OTHER }
enum Metal           { GOLD SILVER }
enum ItemStatus      { IN_STOCK ON_HOLD SOLD WITH_KARIGAR RETURNED DAMAGED PLEDGED }
enum MakingType      { PER_GRAM PERCENT FLAT }
enum PayMode         { CASH UPI CARD BANK CREDIT }
enum PayRefType      { SALE CREDIT GIRVI OLD_GOLD EXPENSE }
enum Direction       { IN OUT }
enum InterestType    { NONE SIMPLE COMPOUND }
enum RatePeriod      { MONTH YEAR }
enum Compounding     { MONTHLY HALF_YEARLY YEARLY }
enum PartialRule     { PRORATA_DAYS FULL_MONTH HALF_AFTER_15 }
enum AllocationOrder { INTEREST_FIRST PRINCIPAL_FIRST }
enum CreditStatus    { OPEN PARTIAL OVERDUE CLOSED WRITTEN_OFF }
enum GirviStatus     { ACTIVE PARTIAL OVERDUE REDEEMED FORFEITED }
enum SaleStatus      { COMPLETED CANCELLED RETURNED PARTIAL_RETURN }
enum EventType       { OPEN TOPUP PAYMENT INTEREST_PAYMENT PRINCIPAL_PAYMENT PART_RELEASE
                       RENEWAL REDEMPTION WRITE_OFF SETTLEMENT PROMISE REMINDER NOTICE ADJUSTMENT REVERSAL }
enum MoveType        { PURCHASE SALE RETURN ADJUSTMENT HOLD RELEASE_HOLD PLEDGE UNPLEDGE AUDIT }

// ───────── Platform ─────────
model User {
  id String @id @default(cuid())
  username String @unique @db.VarChar(60)
  name String @db.VarChar(120)
  role Role
  passwordHash String @db.VarChar(100)
  pinHash String? @db.VarChar(100)
  totpSecretEnc String? @db.VarChar(255)
  lang String @default("en") @db.VarChar(5)
  active Boolean @default(true)
  failedLogins Int @default(0)
  lockedUntil DateTime?
  createdAt DateTime @default(now())
  sessions Session[]
}
model Session {
  id String @id @default(cuid())
  userId String
  tokenHash String @unique @db.VarChar(64)
  device String? @db.VarChar(255)
  ip String? @db.VarChar(45)
  expiresAt DateTime
  lastSeenAt DateTime
  user User @relation(fields: [userId], references: [id])
  @@index([userId])
}
model Setting { key String @id @db.VarChar(100) value Json updatedById String? updatedAt DateTime @updatedAt }
model Counter { key String @id @db.VarChar(100) nextValue Int }   // SKU serials, invoice/girvi/credit numbers
model File {
  id String @id @default(cuid())
  kind String @db.VarChar(30)            // CUSTOMER_PHOTO, ID_PROOF, ITEM_PHOTO, GIRVI_PHOTO, DOC
  storageKey String @db.VarChar(255)
  mime String @db.VarChar(80)
  sizeBytes Int
  sha256 String @db.Char(64)
  createdById String
  createdAt DateTime @default(now())
}
model AuditLog {
  id BigInt @id @default(autoincrement())
  userId String? action String @db.VarChar(60) entity String @db.VarChar(60) entityId String @db.VarChar(40)
  before Json? after Json? reason String? @db.VarChar(255) ip String? @db.VarChar(45) device String? @db.VarChar(255)
  at DateTime @default(now(3))
  @@index([entity, entityId]) @@index([userId, at])
}
model IdempotencyKey {
  key String @id @db.VarChar(64) userId String route String @db.VarChar(120)
  status String @db.VarChar(12) responseJson Json? createdAt DateTime @default(now())
}
model Draft {
  id String @id @default(cuid()) userId String deviceId String @db.VarChar(64)
  formType String @db.VarChar(40) formKey String @db.VarChar(80)
  payload String @db.LongText updatedAt DateTime @updatedAt expiresAt DateTime
  @@unique([userId, formType, formKey])
}

// ───────── Customers ─────────
model Customer {
  id String @id @default(cuid())
  code String @unique @db.VarChar(20)
  name String @db.VarChar(120)
  relationType RelationType relationName String @db.VarChar(120)
  phone String @unique @db.VarChar(15) altPhone String? @db.VarChar(15)
  address String @db.Text
  referenceName String? @db.VarChar(120) referencePhone String? @db.VarChar(15) referenceCustomerId String?
  idProofType String? @db.VarChar(30) idProofNo String? @db.VarChar(40)
  photoFileId String? tags Json? creditLimitPaise BigInt? notes String? @db.Text
  dob DateTime? @db.Date anniversary DateTime? @db.Date
  createdById String createdAt DateTime @default(now()) updatedAt DateTime @updatedAt deletedAt DateTime?
  @@index([name]) @@index([relationName])
}

// ───────── Inventory & barcode ─────────
model SkuMaster { id String @id @default(cuid()) prefix String @unique @db.VarChar(20)  // e.g. G-RNG-22
  metal Metal category String @db.VarChar(40) purityPpt Int active Boolean @default(true) }
model InventoryItem {
  id String @id @default(cuid())
  sku String @unique @db.VarChar(40)
  barcode String @unique @db.VarChar(60)         // default = sku
  skuMasterId String name String @db.VarChar(160) category String @db.VarChar(40)
  metal Metal purityPpt Int
  grossMg Int netMg Int stoneMg Int @default(0)
  makingType MakingType makingValue BigInt stoneChargePaise BigInt @default(0)
  costPaise BigInt listedPaise BigInt?
  huid String? @db.VarChar(20) status ItemStatus @default(IN_STOCK)
  photoFileId String? location String? @db.VarChar(60)
  labelPrintedAt DateTime? createdById String createdAt DateTime @default(now()) updatedAt DateTime @updatedAt deletedAt DateTime?
  @@index([status, metal, category]) @@index([labelPrintedAt])
}
model StockMovement { id String @id @default(cuid()) itemId String type MoveType refType String? refId String?
  fromStatus ItemStatus? toStatus ItemStatus reason String? @db.VarChar(255) byUserId String at DateTime @default(now())
  @@index([itemId, at]) }
model DailyRate { id String @id @default(cuid()) date DateTime @db.Date metal Metal purityPpt Int
  sellPaisePerGram BigInt buyPaisePerGram BigInt setById String
  @@unique([date, metal, purityPpt]) }

// ───────── Barcode Studio ─────────
model LabelTemplate {
  id String @id @default(cuid()) name String @db.VarChar(80)
  kind String @db.VarChar(10)                    // SHEET | ROLL
  config Json                                     // BarcodeConfig (format,size,unit,dpi,colours,text)
  page Json                                       // PageSetup (size,orientation,margins,gutter,grid)
  fields Json                                     // tag fields + positions (sku, shop, netWt, purity, price, huid)
  isDefault Boolean @default(false) createdById String createdAt DateTime @default(now())
}
model PrintJob { id String @id @default(cuid()) templateId String? source String @db.VarChar(12) // INVENTORY|MANUAL|FILE|RANGE
  itemCount Int itemIds Json? output String @db.VarChar(12) byUserId String at DateTime @default(now()) }

// ───────── Sales ─────────
model Sale {
  id String @id @default(cuid()) invoiceNo String @unique @db.VarChar(24)
  customerId String? date DateTime @db.Date
  gstEnabled Boolean @default(true) // Snapshot of GST setting at time of sale
  subtotalPaise BigInt discountPaise BigInt taxablePaise BigInt gstPaise BigInt roundOffPaise BigInt
  oldGoldAdjPaise BigInt @default(0) totalPaise BigInt paidPaise BigInt creditId String?
  status SaleStatus @default(COMPLETED) idempotencyKey String @unique @db.VarChar(64)
  createdById String createdAt DateTime @default(now())
  items SaleItem[]
  @@index([customerId, date])
}
model SaleItem { id String @id @default(cuid()) saleId String itemId String
  netMg Int purityPpt Int ratePaisePerGram BigInt metalValuePaise BigInt makingPaise BigInt stonePaise BigInt
  discountPaise BigInt gstPaise BigInt linePaise BigInt returnedAt DateTime?
  sale Sale @relation(fields: [saleId], references: [id]) @@index([itemId]) }
model Payment {                                    // append-only money ledger
  id String @id @default(cuid()) receiptNo String @unique @db.VarChar(24)
  refType PayRefType refId String customerId String? mode PayMode direction Direction
  amountPaise BigInt utr String? @db.VarChar(40) at DateTime @default(now()) businessDate DateTime @db.Date
  reversedOfId String? createdById String note String? @db.VarChar(255)
  @@index([refType, refId]) @@index([businessDate, mode]) @@index([customerId])
}
model OldGoldPurchase { id String @id @default(cuid()) customerId String saleId String? metal Metal
  grossMg Int netMg Int testedPurityPpt Int deductionBp Int buyRatePaisePerGram BigInt valuePaise BigInt
  kycNote String? @db.VarChar(255) meltedAt DateTime? createdById String createdAt DateTime @default(now()) }

// ───────── Credit ─────────
model Credit {
  id String @id @default(cuid()) creditNo String @unique @db.VarChar(24)
  customerId String saleId String? principalPaise BigInt startDate DateTime @db.Date
  promisedDate DateTime @db.Date graceDays Int @default(0)
  interestType InterestType @default(NONE) rateBp Int @default(0) ratePeriod RatePeriod @default(MONTH)
  compounding Compounding? penalType InterestType @default(NONE) penalRateBp Int @default(0)
  allocation AllocationOrder @default(INTEREST_FIRST) status CreditStatus @default(OPEN)
  notes String? @db.Text createdById String createdAt DateTime @default(now())
  events CreditEvent[]
  @@index([customerId, status]) @@index([promisedDate, status])
}
model CreditEvent { id String @id @default(cuid()) creditId String type EventType amountPaise BigInt @default(0)
  date DateTime @db.Date paymentId String? promisedDate DateTime? @db.Date note String? @db.VarChar(255)
  reversedOfId String? byUserId String at DateTime @default(now())
  credit Credit @relation(fields: [creditId], references: [id]) @@index([creditId, date]) }

// ───────── Girvi ─────────
model Girvi {
  id String @id @default(cuid()) girviNo String @unique @db.VarChar(24)
  customerId String date DateTime @db.Date metal Metal principalPaise BigInt
  interestType InterestType rateBp Int ratePeriod RatePeriod compounding Compounding?
  partialRule PartialRule @default(PRORATA_DAYS) minMonths Int @default(1)
  allocation AllocationOrder @default(INTEREST_FIRST) dueDate DateTime @db.Date
  ltvLimitBp Int packetNo String? @db.VarChar(30) lockerNote String? @db.VarChar(80)
  witnessName String? @db.VarChar(120) status GirviStatus @default(ACTIVE)
  renewedFromId String? notes String? @db.Text createdById String createdAt DateTime @default(now())
  items GirviItem[] events GirviEvent[]
  @@index([customerId, status]) @@index([dueDate, status])
}
model GirviItem { id String @id @default(cuid()) girviId String itemType String @db.VarChar(40) itemName String @db.VarChar(160)
  qty Int @default(1) grossMg Int netMg Int purityText String @db.VarChar(20) estValuePaise BigInt
  defectNotes String? @db.Text photoFileIds Json? released Boolean @default(false) releasedAt DateTime? releasedWeightMg Int?
  girvi Girvi @relation(fields: [girviId], references: [id]) }
model GirviEvent { id String @id @default(cuid()) girviId String type EventType amountPaise BigInt @default(0)
  date DateTime @db.Date paymentId String? itemIds Json? note String? @db.VarChar(255)
  reversedOfId String? byUserId String at DateTime @default(now())
  girvi Girvi @relation(fields: [girviId], references: [id]) @@index([girviId, date]) }
model InterestSnapshot { id String @id @default(cuid()) refType String @db.VarChar(8) refId String date DateTime @db.Date
  principalOutPaise BigInt accruedPaise BigInt penalPaise BigInt @default(0) totalPayablePaise BigInt
  @@unique([refType, refId, date]) }

// ───────── Finance ─────────
model DayClose { id String @id @default(cuid()) date DateTime @unique @db.Date systemCashPaise BigInt countedCashPaise BigInt
  diffPaise BigInt closedById String closedAt DateTime @default(now()) reopenedById String? note String? @db.VarChar(255) }
model Expense { id String @id @default(cuid()) date DateTime @db.Date category String @db.VarChar(40) amountPaise BigInt
  mode PayMode note String? @db.VarChar(255) createdById String }

// ───────── Reports ─────────
model ReportDefinition { id String @id @default(cuid()) name String @db.VarChar(120) subject String @db.VarChar(20)
  baseReportId String? @db.VarChar(40) definition Json ownerId String visibility String @db.VarChar(10) pinned Boolean @default(false) createdAt DateTime @default(now()) }
model ReportSchedule { id String @id @default(cuid()) reportId String cron String @db.VarChar(40) format String @db.VarChar(6)
  recipients Json lastRunAt DateTime? active Boolean @default(true) }
model ReportRun { id String @id @default(cuid()) reportId String? runById String filters Json rowCount Int durationMs Int exportFormat String? @db.VarChar(6) at DateTime @default(now()) }
model KpiTarget { id String @id @default(cuid()) period String @db.VarChar(10) metricId String @db.VarChar(60) targetValue BigInt }
```

**MySQL notes:** use `utf8mb4` (Hindi text); keep indexed `VARCHAR` ≤ 191 chars where required by the index limit; JSON columns are MySQL `JSON`; large draft payload is `LONGTEXT`; consider a generated column plus index if you need to search inside JSON.

**Migrations:** author migrations against the local Docker MySQL (`prisma migrate dev`), commit the SQL, deploy with `prisma migrate deploy`. Never run `migrate dev` or `db push --accept-data-loss` against production.

---

### 7a. Extended Schema (M18 – Doc 11)

> All models below were added **after** the original M1–M9 scope. The authoritative source is `prisma/schema.prisma`.

#### New / Extended Enums

| Enum | Values |
|---|---|
| `CustomerTag` | STANDARD · VIP · RISK · BLOCKED · HAS_REPLEDGED · PAID_AWAITING_RELEASE · MANUAL_INTEREST · SETTLED_BY_REPLEDGE · RATE_OPEN · RATE_PARTLY_FIXED · SETTLEMENT_DUE · COST_REVISED |
| `PayRefType` (extended) | + CASHBOOK · TRANSFER · OPENING · REPLEDGE |
| `CashGroup` | OPERATING · GIRVI · METAL · FINANCING · TRANSFER |
| `FlowKind` | SALE_RECEIPT · CREDIT_COLLECTION · GIRVI_LOAN_OUT · GIRVI_INTEREST_IN · GIRVI_PRINCIPAL_IN · OLD_GOLD_PAYOUT · ORDER_ADVANCE · REPAIR_RECEIPT · SCHEME_INSTALMENT · VENDOR_PAYMENT · KARIGAR_LABOUR · EXPENSE · OTHER_INCOME · TRANSFER · OWNER_CAPITAL · OWNER_DRAWING · LOAN_TAKEN · LOAN_REPAID · CASH_ADJUSTMENT · OPENING_BALANCE · REFUND · REPLEDGE_LOAN_IN · REPLEDGE_PRINCIPAL_OUT · REPLEDGE_INTEREST_OUT · REPLEDGE_FEE_OUT |
| `TxnSource` | MANUAL · QUICK_CHIP · TEMPLATE · IMPORT |
| `FundType` | CASH · BANK |
| `LocationType` | SHOP_DRAWER · VAULT · HOME · TRANSIT · VENDOR · STAFF · OTHER |
| `RepledgeStatus` | PLANNED · ACTIVE · PARTIAL · CLOSED · CANCELLED |
| `RepledgeEventType` | OPEN · TOPUP · INTEREST_PAYMENT · PRINCIPAL_PAYMENT · PART_RELEASE · RENEWAL · FEE · CLOSE · ADJUSTMENT · SETTLEMENT · SUBSTITUTION · REVERSAL |
| `RecallStatus` | REQUESTED · REPAYING · IN_TRANSIT · RECEIVED · CANCELLED |
| `Frequency` | WEEKLY · MONTHLY · QUARTERLY · YEARLY · CUSTOM_DAYS |
| `PurchaseBasis` | RUPEE_FIXED · RATE_OPEN · METAL_ACCOUNT |

#### New Models

| Group | Model | Key Fields | Milestone |
|---|---|---|---|
| **Customers (ext)** | `DuplicateDecision` | id, newCustomerId, candidateCustomerId, matchScoreBp, decision, byUserId | M2 |
| | `IdentityRequirementProfile` | id, moduleId, field, level, amountThresholdPaise — configurable KYC rules per module & amount | M22 |
| **Girvi (ext)** | `GirviLoan` | id, loanNo (unique), customerId, date, dueDate, principalPaise, interestRatePerMonthPct (Decimal), status (GirviStatus) — replaces old `Girvi` in production schema | M7 |
| | `GirviItem` (ext) | + **locationId** (→ StorageLocation) added to track custody | M20 |
| | `GirviTranche` | id, girviId, seqNo, kind (ORIGINAL/TOPUP/METAL_SPLIT/RENEWAL), principalOpenPaise, interestType, ratePerMonthPct, compounding, startDate, dueDate, status | Doc 11 |
| | `PartialReleaseBatch` | id, girviId, batchNo, articleIdsJson, state (PAID_AWAITING_RELEASE→DELIVERED), minPrincipalToPayPaise, collectorName/Relation/IdType, deliveredAt | Doc 11 |
| | `PaymentAllocation` | id, paymentId, girviId, trancheId, interestPaise, principalPaise — per-tranche allocation audit | Doc 11 |
| **Cash Flow** | `FundAccount` | id, shopId, name, type (CASH/BANK), bankName, accountLast4, upiId, acceptsModes (JSON), isDefaultUpi, openingPaise, openingDate, active, sortOrder | M18 |
| | `CashCategory` | id, shopId, name, nameHi, group (CashGroup), direction, parentId, isSystem, isPersonal, pnl, monthlyBudgetPaise, active; unique (shopId, name, parentId) | M18 |
| | `CashCategoryMap` | id, refType, direction, eventType, flowKind, categoryId — auto-maps financial events to cash categories | M19 |
| | `CashTxn` | id, shopId, txnNo (unique), businessDate, direction, mode, fundAccountId, amountPaise, categoryId, labelId, labelText, partyType/Id/Name, utr, notes, attachmentFileIds (JSON), transferGroupId, source (TxnSource), recurringTemplateId, status (POSTED/CANCELLED), cancelledAt/ById/ReasonCode, version, idempotencyKey | M18 |
| | `TxnLabel` | id, shopId, key (unique), displayName, displayNameHi, defaultDirection/CategoryId/Mode/AccountId/PartyType/Id, useCount, firstUsedAt, lastUsedAt, typicalAmountPaise, amountP25/P75Paise, recentAmounts/categoryDist/modeDist/weekdayDist/hourDist (JSON), cadenceDays, cadenceConfidenceBp, pinned, active, mergedIntoId | M19 |
| | `TxnLabelAlias` | id, labelId, aliasKey (unique), aliasText, source — variant spellings of the same payee | M19 |
| | `DailyCashSnapshot` | (date, fundAccountId) composite PK, openingPaise, inPaise, outPaise, closingPaise, cash/upi/bank/transfer In/Out breakdown, entries, dayCloseStatus, computedAt | M18 |
| **Payment (ext)** | `Payment` | + **fundAccountId**, **flowKind** (FlowKind), **categoryId**, **cashTxnId**, utrChecked/At/ById — cross-module money ledger linked to cash flow | M19 |
| **Repledge/Custody** | `StorageLocation` | id, shopId, name, type (LocationType), vendorId, address, requiresPinIn, requiresPinOut, isSystem, active, sortOrder | M20 |
| | `CustodyMovement` | id, shopId, girviId, itemIds (JSON), fromLocationId, toLocationId, businessDate, reasonCode, refType/Id, byUserId, approvedById, photoFileIds, note, reversedOfId | M20 |
| | `LocationAudit` | id, locationId, startedAt, closedAt, byUserId, expectedCount, foundCount, missingCount, extraCount, status | M20 |
| | `LocationAuditLine` | id, auditId, girviId, expected (bool), found (bool), note | M20 |
| | `RepledgeLoan` | id, shopId, loanNo (unique), vendorId, termsId, vendorRefNo, vendorReceiptFileId, date, principalPaise, metal, offeredTotalPaise, receivedPaise, deductionPaise, interestType, rateBp, ratePeriod, compounding, partialRule, minMonths, allocation, processingFeePaise, dueDate, packetSealNo, status (RepledgeStatus), renewedFromId, closedAt | M20 |
| | `RepledgeLink` | id, loanId, girviId; unique (loanId, girviId); itemIds (JSON), weightNetMg, weightFineMg, valuePaise, offeredPaise, allocatedPrincipalPaise, allocationBasis, vendorGirviRef, sentOn, returnedOn, status, recallStatus | M20 |
| | `RepledgeEvent` | id, loanId, type (RepledgeEventType), amountPaise, date, paymentId, linkIds (JSON), note, reversedOfId, byUserId | M20 |
| | `RepledgeSettlement` | id, voucherNo (unique), loanId, vendorId, settledOn, sequence, systemPayablePaise, vendorAskingPaise, varianceReason, paidPaise, mode, fundAccountId, paymentIds (JSON), collectedByName/Phone/At, sealNo, status (DRAFT/FINAL) | M20 |
| | `RepledgeSettlementLine` | id, settlementId, girviId, linkId, principalPaise, interestPaise, chargePaise, adjustmentPaise, totalPaise, weightCheckOk, weightNote, receivedAt | M20 |
| **Tagging** | `TagDef` | id, code (unique), nameEn, nameHi, colorHex, icon, group (SYSTEM/CUSTOMER/GIRVI/CASHBOOK/INVENTORY), isAuto, effect (NONE/BLOCK_RELEASE/WARN_DISPUTE), permission (ALL/MANAGER/OWNER), active | M22 |
| | `EntityTag` | (entityType, entityId, tagId) unique; isAuto, appliedByUserId, reason, expiresAt — polymorphic: entityType ∈ {CUSTOMER, GIRVI_LOAN, GIRVI_ITEM, CASH_TXN, SALE, VENDOR} | M22 |
| | `SmartList` | id, name, icon, entityType, tagIds (JSON), queryCriteria (JSON), pinnedToDashboard | M22 |
| **Analytics** | `SuggestionLog` | id, calculatorType (LENDING_ADVISOR/REDEMPTION_ADVISOR/REPLEDGE_ADVISOR), entityId, inputsJson, suggestedValuePaise, acceptedValuePaise, varianceReason, byUserId | M21/M23 |
| | `AnalyticsSnapshot` | (date, metricId, dimensionKey, dimensionValue) composite PK, valuePaise, valueNumber, computedAt — nightly metric snapshots for fast dashboard queries | M23 |
| **Purchase Lots** | `PurchaseLot` | id, vendorId, vendorInvoiceNo, basis (PurchaseBasis), totalFineMg, openFineMg, provisionalRatePaise, provisionalValuePaise, status (RATE_OPEN/PARTLY_FIXED/FIXED/PAID), dueDate | Doc 11 |
| | `RateFixEvent` | id, purchaseLotId, fineMgFixed, fixedRatePaise, metalValuePaise, gstPaise, costRevisionBatchId, note, byUserId | Doc 11 |
| | `ItemCostRevision` | id, itemId, batchId, sourceEventId, oldMetalRate, newMetalRate, oldMetalCost, newMetalCost, deltaPaise, reason, byUserId — append-only; never alters barcodes or listed prices | Doc 11 |

---

## 8. Domain engines (pure functions in `src/domain`)

### 8.1 SKU generation and atomic counters (FR-INV-01)
Format `{Metal}-{CAT3}-{PurityCode}-{Serial:0000}`, e.g. `G-RNG-22-0001`. Serial comes from `counters` inside a single transaction/connection:
```sql
INSERT INTO counters (`key`, next_value) VALUES (:key, LAST_INSERT_ID(1))
  ON DUPLICATE KEY UPDATE next_value = LAST_INSERT_ID(next_value + 1);
SELECT LAST_INSERT_ID();
```
Use an interactive `prisma.$transaction` so both statements share one connection. Test: 100 parallel calls return 100 distinct serials.

### 8.2 Pricing engine (FR-POS-05)
Per line, integer arithmetic, half-up rounding at each step:
```
metalValue = round(netMg × ratePaisePerGram / 1000)
making     = PER_GRAM: round(netMg × makingValue / 1000)
           | PERCENT : round(metalValue × makingBp / 10000)
           | FLAT    : makingValue
taxable    = metalValue + making + stone − lineDiscount
gst        = gstEnabled ? round(taxable × gstBp / 10000) : 0   // gstBp from settings (default 300)
invoice    = Σ(taxable) + Σ(gst) − oldGoldAdj ; roundOff to nearest ₹1 (100 paise)
```
Test P1: 10.000 g, ₹10,000/g, making 8% → metal ₹1,00,000, making ₹8,000, taxable ₹1,08,000, GST ₹3,240, **total ₹1,11,240**.

### 8.3 Tenure (FR-GIR-05)
`tenure(start, asOf)` returns `{ months, days }` using calendar months where the anniversary day is clamped to month end (31 Jan + 1 month = 28/29 Feb). Display "1 yr 3 mo 12 d".

### 8.4 Girvi interest engine (FR-GIR-03..07, 12)
Inputs: terms `{ type, rateBp, ratePeriod, compounding, partialRule, minMonths, allocation }`, `events[]` sorted by date (OPEN, TOPUP, INTEREST_PAYMENT, PRINCIPAL_PAYMENT, PART_RELEASE, REVERSAL), `asOf`.
Monthly rate `r_m` = `rateBp/10000` (per month) or `rateBp/10000/12` (per year).

State: `{ principal, unpaidInterest, periodStart }`.

**Accrue(state, to):**
1. Compute `months` and `extraDays` between `periodStart` and `to` (§8.3).
2. Fraction of a month for `extraDays`: PRORATA_DAYS = days/30 · FULL_MONTH = 1 if days > 0 · HALF_AFTER_15 = 0 if 0, 0.5 if 1–15, 1 if ≥ 16. Apply `minMonths` to the first period.
3. **SIMPLE:** `interest = principal × r_m × (months + fraction)`; unpaid interest carries without earning interest.
4. **COMPOUND:** base = principal + unpaidInterest. Compounding period length `c` months (1, 6, 12). For each full block of `c` months: `base ×= (1 + r_m × c)`. Then the remaining months and fraction accrue as simple interest on the accumulated base. `interest = base_final − (principal + unpaidInterest)`.

**Apply event at date t:** `accrued = unpaidInterest + Accrue(state, t)`; PAYMENT: interest first → reduce `accrued`, remainder reduces `principal` (or reverse order if `PRINCIPAL_FIRST`); TOPUP: `principal += amount`. Then `state = { principal', unpaidInterest' = accrued after payment, periodStart = t }`.

**Payable(asOf)** = `principal + unpaidInterest + Accrue(state, asOf)`. **Redeem calculator** = Payable for any future date with the list of steps used (for the breakdown card, C-17).

> **Convention to confirm with the owner/CA before M7:** compounding periods restart on each payment date (this document's convention). Record the decision here. Rounding: half-up to whole paise per accrual step.

### 8.5 Credit interest engine (FR-CRD-02..04)
- Interest from `startDate` only if `interestType ≠ NONE` (same engine as §8.4, `c` from `compounding`).
- **Penal interest** starts the day after `promisedDate + graceDays` on outstanding principal at `penalRateBp` (per month), simple or compound.
- Payment allocation follows the credit's `allocation` setting. Status: `CLOSED` if total due = 0; `OVERDUE` if now > due + grace and total > 0; `PARTIAL` if any payment and total > 0; else `OPEN`.

### 8.6 LTV (FR-GIR-12)
`ltvBp = round(outstandingPrincipal × 10000 / Σ estValue)`; warn if `> ltvLimitBp`; PIN needed to save above the limit.

### 8.7 Golden tests (must exist as Vitest cases; hand-verified)
| # | Scenario | Expected |
|---|---|---|
| G1 | ₹50,000, simple 2%/month, 12 months | Interest ₹12,000; total ₹62,000 |
| G2 | Same, compound monthly | ₹63,412.09 (50,000 × 1.02¹²) |
| G3 | ₹50,000 at 24%/yr, compound 6-monthly, 12 months | ₹62,720 (× 1.12²) |
| G4 | ₹50,000 at 24%/yr, compound yearly, 18 months | ₹62,000 after year 1; + 6 months simple on 62,000 = **₹69,440** |
| G5 | Credit ₹20,000 due 30 Jun, penal 2%/month simple, paid 2 months late | Penalty ₹800 |
| G6 | ₹50,000 simple 2%/month; pay ₹5,000 after 3 months (interest first) | Interest 3,000 cleared, principal 48,000; after 3 more months payable **₹50,880** |
| G7 | 31 Jan → 28 Feb (non-leap) | Exactly 1 month; simple interest on 50,000 at 2% = ₹1,000 |
| G8 | 31 Jan → 29 Feb 2028 (leap) | Exactly 1 month |
| G9 | HALF_AFTER_15: 1 month 10 days | 1.5 months; 16 days → 2 months |
| G10 | Reversal of a payment | Balance returns to pre-payment value |
| P1 | Pricing example (§8.2) | ₹1,11,240 |
| P2 | Pricing with GST Disabled (`gstEnabled = false`) | Taxable ₹1,08,000, GST ₹0, Total ₹1,08,000 |
| G11 | Lending Advisor: 100 g 22K gold at ₹7,000/g, LTV 70% | Suggested loan = 100 g × 0.916 × 7,000 × 0.70 = **₹4,47,820** |
| G12 | Re-pledge spread: Customer 2%/mo, Vendor 1.5%/mo, principal ₹5,00,000 | Rate gap 0.5 pp/mo; rupee spread **₹2,500/mo** |
| G13 | Release check: 2 of 3 articles released; remaining fine value ₹2,00,000; outstanding principal ₹1,50,000 | `minPrincipalToPay = 0` (lendable > outstanding) |
| G14 | Cash Flow rule: import 10 inventory items → assert Payment table row count unchanged | Zero cash rows created by inventory import |

---

### 8.8 Re-pledge Row Figures engine (`src/domain/repledge/rowFigures.ts`)
Inputs: `{ customerRateBp, ratePeriod, vendorRateBp, vendorRatePeriod, principalPaise, vendorOfferedPaise }`
Outputs:
- `rateGapPpPerMonth` = customerMonthlyRate − vendorMonthlyRate (percentage points)
- `rupeeSpreadPerMonth` = `principalPaise × rateGapPpPerMonth / 100` (paise/month)
- `ownCapitalPaise` = `principalPaise − vendorOfferedPaise`
- `breakEven` = true if `rupeeSpreadPerMonth ≤ 0` (losing money on the re-pledge)
- `ltvPct` = `vendorOfferedPaise × 100 / Σ(estValuePaise of linked girvi items)`

### 8.9 Purchase Lot Calculator (`src/domain/purchase/lotCalculator.ts`)
Inputs: `{ totalFineMg, rateFixEvents[], gstBp }`
- `fineMgFixed` = Σ `rateFixEvents[].fineMgFixed`
- `openFineMg` = `totalFineMg − fineMgFixed`
- `metalValue` = Σ `(fineMgFixed × fixedRatePaise / 1000)` per event
- `gst` = `metalValue × gstBp / 10000`
- `provisionalMarkToMarket(todayRate)` = `openFineMg × todayRate / 1000`
- `deltaPerHundredRupees` = `openFineMg × 100_paise_per_g / 1000` (mark-to-market sensitivity)

### 8.10 Release Check engine (`src/domain/girvi/releaseCheck.ts`)
For partial release — given articles remaining after selection:
- `lendable(article)` = `article.netWeightMg × dayRate × lendableFactor / 1000`
- `totalLendable` = Σ `lendable` over remaining articles
- `minPrincipalToPay` = `max(0, outstandingPrincipal − totalLendable)`
- Returns `{ minPrincipalToPay, ltvAfterRelease, eligible: boolean }`

### 8.11 Interest Projection engine (`src/domain/interest/projection.ts`)
- `payableOn(date, loan, events[])` → total payable (principal + interest) at any future date.
- `compareSimpleVsCompound(principal, rateBp, months)` → side-by-side what-if table.
- `generateSchedule(loan, months)` → `{ month, openingBalance, interest, closingBalance }[]` for 12/24-month schedule (PDF/CSV export).

---

## 9. API design (`/api/v1`)

Conventions: JSON; zod-validated bodies; session cookie `njms_session` (httpOnly, Secure, SameSite=Lax); state-changing calls require same-origin (`Origin` = `APP_URL`); pagination `?page&pageSize` (max 100) or cursor; money in paise; `Idempotency-Key` on ★ routes. Every route checks permission from the matrix in §10.

| Resource | Endpoints | FR | Screens |
|---|---|---|---|
| Auth | `POST /auth/login`, `/auth/verify-2fa`, `/auth/logout`, `GET /auth/me`, `POST /auth/pin/verify` | PLT-02,03 | S-01 |
| Users/Settings | `GET/POST/PATCH /users`, `GET/PUT /settings/:key`, `GET/POST /rates` | PLT-04, POS-06 | S-80, S-35 |
| Search | `GET /search?q=` | PLT-06 | S-03 |
| Customers | `GET/POST /customers` ★, `GET/PATCH /customers/:id`, `GET /customers/:id/360`, `GET /customers/:id/exposure`, `GET /customers/check-duplicate`, `GET /customers/:id/statement` | CUS-* | S-10..12 |
| SKU/Inventory | `GET/POST /sku-master`, `GET/POST /inventory` ★, `GET/PATCH /inventory/:id`, `POST /inventory/import`, `POST /inventory/:id/status`, `GET /inventory/lookup?barcode=`, `POST /inventory/audit` | INV-*, POS-01 | S-20..23 |
| Barcode Studio | `GET /barcode/unlabelled`, `GET/POST/PATCH/DELETE /label-templates`, `POST /print-jobs` (also marks `labelPrintedAt`), `GET /print-jobs` | BAR-02,04,08 | S-60..62 |
| Sales | `POST /sales` ★ (atomic), `GET /sales`, `GET /sales/:id`, `POST /sales/:id/return` ★, `GET /sales/:id/invoice.pdf` | POS-* | S-30..33 |
| Old gold | `GET/POST /old-gold` ★ | POS-11 | S-34 |
| Payments | `POST /payments` ★, `POST /payments/:id/reverse` ★ | CRD-03, GIR-07 | S-42 |
| Credit | `GET/POST /credits` ★, `GET /credits/:id` (with computed dues), `POST /credits/:id/events`, `/credits/:id/write-off`, `/credits/:id/settle`, `GET /credits/overdue`, `GET /credits/ageing` | CRD-* | S-40..42 |
| Girvi | `GET/POST /girvi` ★, `GET /girvi/:id` (with live payable), `GET /girvi/:id/redeem-calc?date=`, `POST /girvi/:id/payments` ★, `/topup` ★, `/renew` ★, `/part-release` ★, `/redeem` ★, `GET /girvi/vault`, `POST /girvi/vault/audit`, **`POST /girvi/:id/tranches`** ★, **`POST /girvi/:id/release-batch`** ★, **`GET /girvi/delivery-queue`** | GIR-*, TRN-01..09 | S-50..54, S-200..203 |
| Cash Transactions | `GET/POST /cash-txns` ★, `GET /cash-txns/:id`, `POST /cash-txns/:id/cancel` ★, `GET/POST /cash-txns/categories` | CSH-01..11, 40..52 | S-180..183 |
| Cashbook / Fund Accounts | `GET /cashbook?date=`, `GET/POST /cashbook/fund-accounts`, `GET /cashbook/summary`, `POST /cashbook/day-close` ★, `GET /cashbook/balance-history` | CSH-20..28, 60..68, 90..97 | S-184..188 |
| Custody / Locations | `GET/POST /locations`, `PATCH /locations/:id`, `GET/POST /custody`, `POST /custody/:id/move` ★, `POST /locations/:id/audit` | RPL-01..09 | S-190, S-195 |
| Re-pledge | `GET/POST /repledge` ★, `GET /repledge/:id`, `POST /repledge/:id/events` ★, `GET /repledge/form-search`, `POST /repledge/settle` ★, `POST /repledge/:id/recall` ★ | RPL-10..46, 70..78 | S-190..198 |
| Purchase Lots | `GET/POST /purchase-lots`, `GET /purchase-lots/:id`, `POST /purchase-lots/:id/rate-fix` ★, `POST /purchase-lots/bulk-cost-edit` ★ | PUR-01..07 | S-24..26 |
| Tags | `GET/POST /tags` (TagDef CRUD), `POST /tags/apply` ★, `DELETE /tags/apply/:entityTagId` | TAG-01..08 | all entity detail screens |
| Analytics | `GET /analytics/snapshot?metric=&date=` | CALC-05 | S-02 dashboard |
| Suggestion Calculators | `POST /calculators/lending`, `POST /calculators/redemption` | CALC-01..04 | S-51, S-52, S-190 |
| Finance (legacy cashbook) | `GET /cashbook?date=`, `POST /expenses`, `POST /day-close`, `POST /day-close/:date/reopen` — **superseded by Cash Flow module above; kept for backwards compat** | POS-14 | S-36 |
| Files | `POST /files` (multipart, size/type limits), `GET /files/:id` (authenticated stream) | CUS-05, INV-07, GIR-02 | C-21 |
| Drafts | `PUT /drafts/:formType/:formKey`, `GET /drafts`, `DELETE /drafts/:id` | PLT-08 | S-04 |
| Reports | `GET /reports/metrics` (registry), `POST /reports/run`, `POST /reports/export`, `GET/POST/PATCH /report-definitions`, `GET /dashboard`, `GET /data-health` | RPT-* | S-70..72, S-81 |
| Audit/Backup | `GET /audit`, `POST /backup/run`, `GET /backup/list` | PLT-05,10 | S-80 |
| Cron (secret) | `POST /api/cron/nightly`, `/api/cron/backup`, `/api/cron/purge-drafts` | — | — |
| Health | `GET /api/health` (DB ping, version, last backup, last cron) | NFR-05 | S-81 |

**Sale transaction (FR-POS-01..09), inside one DB transaction:**
1. Check idempotency key. 2. Verify rates exist for the day. 3. For each item: `UPDATE inventory_items SET status='SOLD' WHERE id=? AND status='IN_STOCK'`; if 0 rows → 409 with the item and existing invoice. 4. Compute pricing server-side (never trust client totals). 5. Insert sale + items + stock movements. 6. Insert payment rows (append-only). 7. If credit portion > 0, create `Credit` linked to the sale. 8. Write audit. 9. Commit and return invoice.

**Girvi create (FR-GIR-01):** validate LTV (PIN if above), create girvi + items + `OPEN` event, set items to no stock effect (pledged items are separate from inventory, FR-INV-09), counters for `GV-` number, audit.

---

## 10. Authentication, authorisation, security

**Sessions:** random 256-bit token; store SHA-256 hash in `sessions`; cookie httpOnly/Secure/SameSite=Lax; idle timeout (default 30 min, Owner configurable) and absolute expiry; rotate on login. Login throttling per username + IP using a DB counter; lockout after repeated failures. Owner requires TOTP.

**Passwords/PIN:** `bcryptjs` cost ≥ 12; PIN hashed with a server pepper; PIN attempts rate-limited.

**Permission matrix** (server enforced; UI only hides):
| Capability | Staff | Manager | Owner | Accountant |
|---|---|---|---|---|
| Sale, customers, payments, scan | ✔ | ✔ | ✔ | — |
| Discount over limit / LTV override | ✘ | PIN | ✔ | — |
| Create girvi | ✔ | ✔ | ✔ | — |
| Redeem / release girvi | ✘ | ✔ | ✔ | — |
| Reverse entry / write-off / delete | ✘ | ✘ | ✔ (reason) | — |
| Edit rates / settings / users | ✘ | ✘ | ✔ | — |
| Barcode Studio (print) | ✔ | ✔ | ✔ | — |
| Templates edit | ✘ | ✔ | ✔ | — |
| Reports (cost/profit metrics) | ✘ | limited | ✔ | read |
| Export / backup / import | ✘ | limited | ✔ | export only |
| Cash Flow entry (MANUAL/QUICK_CHIP) | ✔ | ✔ | ✔ | read |
| Cancel / reverse cash txn | ✘ | PIN + reason | ✔ (reason) | — |
| Re-pledge create/manage | ✘ | ✔ | ✔ | — |
| Vendor settlement (repledge) | ✘ | ✘ | ✔ (PIN) | — |
| Purchase lot create / rate-fix | ✘ | ✘ | ✔ (PIN) | — |
| Bulk cost edit | ✘ | ✘ | ✔ (PIN) | — |
| Tag apply (ALL-permission tags) | ✔ | ✔ | ✔ | — |
| Tag apply (MANAGER-only tags) | ✘ | ✔ | ✔ | — |
| Tag apply (OWNER-only tags) | ✘ | ✘ | ✔ | — |
| SmartList create/pin | ✘ | ✔ | ✔ | — |
| Calculators (run) | ✔ | ✔ | ✔ | — |
| Custody movement (to vendor) | ✘ | ✔ | ✔ (PIN) | — |
| Storage location audit | ✘ | ✔ | ✔ | — |

**Hardening checklist:** HTTPS only + HSTS; security headers (CSP without inline scripts where feasible, X-Content-Type-Options, frame-ancestors none, Referrer-Policy); zod on every input; parameterised queries only; upload limits (type, size, magic bytes) and private storage; no PII in logs; audit on exports; rate limits on login/PIN/search; backdate lock; dependency audit in CI; rotate any credential ever pasted in chat or documents.

---

## 11. Drafts, offline and PWA (FR-PLT-08, 09, 12)

- **Dexie tables:** `drafts` (`formType`, `formKey`, `payload`, `updatedAt`, `serverVersion`), `outbox` (queued POSTs with `Idempotency-Key`), `cache` (inventory snapshot for offline lookup).
- **`useDraft(formType, formKey)` hook:** debounced write (~500 ms), returns `{ restore, discard, status }`; `beforeunload` guard when dirty; clears only after a **confirmed** successful submit; expires after 7 days; optional server sync every ~10 s via `PUT /drafts/...` with last-write-wins and a version check.
- **Draft coverage:** customer form, POS cart (items, customer, payments), credit form, girvi wizard (all steps and photo blobs), item form, Barcode Studio state, report builder.
- **Outbox:** offline sales queue in order; replay with the original idempotency key; conflicts (item sold elsewhere) surface in the drafts tray for a human decision. Credit and girvi creation are online-only in Release 1.
- **Service worker:** cache app shell and static assets; never cache authenticated API responses except the inventory snapshot; update prompt on new version.

---

## 12. Barcode Studio: porting the existing generator (FR-BAR-01..12)

### 12.1 What exists (from the uploaded files)
Vite + React 18 + TypeScript app, entirely client-side. `types.ts` (Unit, BarcodeFormat, BarcodeItem, BarcodeConfig, LabelTemplate, PageSetup), `constants.tsx` (DPI options, unit factors, page sizes, Avery templates, symbology groups), `services/unitConverter.ts`, `services/barcodeGenerator.ts` (validation and canvas/QR rendering at 600 DPI), `services/exportService.ts` (grid calculator, ZIP and PDF export), and a single 700-line `App.tsx` holding all UI (`ManualInput`, `BatchInput`, `FileInput` (CSV/Excel via PapaParse and SheetJS), `RangeInput`, `UnitInput`, `SelectGroup`, `LiveProof`, `BarcodeCard`, `Overlay`, `EmptyState`).

### 12.2 Port map
| Original | New location | Change |
|---|---|---|
| `types.ts` | `modules/barcode/types.ts` | Keep; add `TagField`, `LabelTemplateDef`, `BarcodeSource` |
| `constants.tsx` | `modules/barcode/constants.ts` | Keep values; add jewellery tag presets |
| `services/unitConverter.ts` | `modules/barcode/lib/unit.ts` | Keep; fix PX handling (A-09) |
| `services/barcodeGenerator.ts` | `modules/barcode/lib/render.ts` + `validate.ts` | Fix A-05, A-06, A-07; add tag-field compositing |
| `services/exportService.ts` | `modules/barcode/lib/export/{grid,pdf,zip}.ts` | Split; dynamic-import jsPDF/JSZip; vector bars (A-04); apply templates (A-08) |
| `App.tsx` | `modules/barcode/BarcodeStudio.tsx` + `components/*` + `store/studio.ts` | Decompose; mobile step flow (DESIGN §7); Zustand + draft persistence |
| `index.html` head/scripts | Removed | Use the Next.js shell (A-01..A-03) |

New pieces: inventory source tab (`GET /barcode/unlabelled`), template CRUD, print-job logging, calibration sheet, scan-test component, camera scanner.

### 12.3 Audit findings on the existing code (fix in M0/M4)
| ID | Finding | Fix | When |
|---|---|---|---|
| A-01 | Tailwind loaded from the CDN script and libraries via an `esm.sh` import map, plus a link to `/index.css` that is not in the project | Build-time Tailwind and npm packages; remove import map | M1 |
| A-02 | Import map lists `vite` and `@vitejs/plugin-react`, which do not belong in browser code | Remove | M1 |
| A-03 | Viewport disables zoom (`user-scalable=no`) | Allow zoom; use `dvh` and safe areas | M1 |
| A-04 | PDF export renders every label as a 600-DPI PNG on the main thread, sequentially, uncompressed; heavy on phones | Draw 1D bars as **vector rectangles** in jsPDF from JsBarcode's encoding (verify the encoder output in the JsBarcode docs); cache renders; yield to the UI between chunks; progress + cancel | M4 |
| A-05 | Bar width uses a fixed guess of 100 modules, so bars can be too tight or overflow depending on the data length | Encode once at module width 1 to get the real module count, then choose an integer module width to fit | M4 |
| A-06 | Validation checks length only: no check digits, no Code 128 character-set check; a render failure returns an empty image silently | Add check-digit and charset validation; show the exact error per item | M4 |
| A-07 | `textColor` exists in config but is not passed to the renderer | Pass `fontColor`; honour it | M4 |
| A-08 | The chosen grid template (Avery) is stored but `calculateGrid` uses only label size, so it appears not to affect layout | Make templates drive grid/margins when selected | M4 |
| A-09 | `px` as a page unit is treated like inches in export maths | Remove `px` from page setup (keep for on-screen preview) | M4 |
| A-10 | `xlsx@0.18.5` from npm is old and has known security advisories; the maintained SheetJS build is distributed outside npm | Replace with a maintained Excel reader (e.g. ExcelJS) or SheetJS's officially documented distribution; parse in a worker; limit file size | M4 |
| A-11 | Random IDs via `Math.random()` | `crypto.randomUUID()` | M4 |
| A-12 | `alert()` for errors; `.env.local` holds an unused Gemini key placeholder | Toasts (C-20); delete the env file and reference | M1/M4 |
| A-13 | No persistence: a refresh empties the batch | Persist studio state as a draft | M4 |
| A-14 | `README`/title/branding refer to another product | Rename to NJMS Barcode Studio | M4 |

### 12.4 Rendering rules
- 1D codes in PDFs: **vector**; PNG export and QR: canvas at the chosen DPI, capped so a single canvas never exceeds a safe pixel count on mobile.
- Tag compositing: barcode + text fields laid out per `LabelTemplate.fields` in millimetres; same layout function feeds preview, PDF and print so they never differ.
- Thermal roll mode: one label per PDF page with `@page` size equal to the label size.
- Batch jobs run in chunks (e.g. 25) with `await` yields, an abort signal, and progress callbacks; no more than one large canvas alive at a time.
- Tests: `calculateGrid` cases (fit, margins, gutter, suggestions), unit conversion round-trips, validation table for all 17 symbologies, bar module count vs. rendered width.

---

## 13. Reports engine (FR-RPT-01..08; detail in Appendix B)
- **Metric registry** in `server/reports/registry.ts` (typed `MetricDef` per Appendix B §3), single source for API, UI picker and tests.
- **Query engine** `runReport({ subject, metrics[], filters, groupBy[], compare, sort, page })` compiles to parameterised SQL over ledgers and `interest_snapshots`; excludes reversed/cancelled by default; enforces metric permissions server-side.
- Girvi/credit figures reuse the §8 engines; nightly job writes `InterestSnapshot` so heavy reports are fast and consistent. Live "today" values are computed on demand.
- MySQL specifics: composite indexes on `(businessDate, mode)`, `(customerId, date)`, `(status, dueDate)`; summary table or views for daily aggregates; results paginated server-side.
- Exports: Excel/CSV streamed; PDF via `@react-pdf/renderer`; every export logged in `report_runs` and `audit_log`.
- Data Health runs the Appendix B §8 reconciliation queries and returns pass/fail with differences.

---

## 14. Scheduled jobs (hPanel cron → HTTPS)
| Job | Schedule (IST) | Does |
|---|---|---|
| `nightly` | 23:55 | Interest snapshots; credit/girvi status updates (overdue); daily summary rows; follow-up list |
| `backup` | 02:30 | Logical export (encrypted, gzipped) to storage; prune old copies |
| `purge-drafts` | 03:00 | Delete expired drafts and old idempotency keys |
Command form: `curl -fsS -X POST -H "x-cron-secret: $CRON_SECRET" https://YOUR-DOMAIN/api/cron/nightly`. Each job logs start/end/result to the audit log; `/api/health` shows the last success time. Jobs are idempotent (safe to run twice). Hostinger's schedule and time zone: verify in hPanel.

---

## 15. Files and storage
`StorageAdapter { put, getStream, delete }` with `LocalDiskAdapter` (path from `UPLOAD_DIR`, **outside** the deploy folder) and `S3Adapter` (S3-compatible bucket). Images compressed and converted in the browser to WebP format (`image/webp`, quality=0.92, target ≤ 300 KB), validated by type and magic bytes, served only through authenticated `GET /files/:id`. ID-proof files are visible only to permitted roles and access is logged.

### 15.1 WebP Conversion & Deterministic Naming Algorithm
1. **WebP Conversion:** All uploaded photos (JPEG, PNG, HEIC, BMP) are converted client-side (or server-side fallback) to high-quality **WebP (`image/webp`)** at quality=0.92 before saving.
2. **Deterministic File Naming Algorithm:** Files in `UPLOAD_DIR` follow the collision-proof, OS-safe pattern:
   `{KIND_PREFIX}_{YYYYMMDD}_{SHA256_PREFIX12}_{CUID}.webp`
   *Example:* `CUS_PHOTO_20260928_a1b2c3d4e5f6_cly123456789.webp`
   *Prefixes:* `CUS_PHOTO`, `ID_PROOF`, `ITEM_PHOTO`, `GIRVI_PHOTO`, `OLD_GOLD`, `DOC`.


---

## 16. Hostinger deployment and MySQL operations

### 16.1 One-time setup
1. Confirm plan supports **managed Node.js web apps** and **MySQL**; note Node version and limits.
2. hPanel → Databases: create database and user; note host, port, name, user. Use `utf8mb4`.
3. Create the app from the GitHub repository (automatic deploy on push to `main`) or upload via IDE/ZIP deploy.
4. Set environment variables in hPanel (§5). Set the domain and free SSL; force HTTPS.
5. Build/start commands (adjust to what hPanel exposes):
   - Install: `npm ci` · Build: `npm run build` · Start: `npm run start`
   - Migrations: run `npx prisma migrate deploy` as part of the build or start command, or once over SSH if the plan provides it (**verify**).
6. Create the UPLOAD_DIR outside the deploy folder; confirm it persists across deploys.
7. Add cron jobs (§14). Enable Hostinger daily backups.
8. Seed the first Owner user with a one-off script (never a default password in code).

### 16.2 Release process
`feature branch → PR (CI: lint, types, unit, e2e) → main → auto-deploy → migrate deploy → smoke test (/api/health, login, one sale in a test tenant)`. Tag releases; keep the last two builds for rollback. Database migrations must be backwards-compatible for one release (expand → migrate data → contract).

### 16.3 Backups and restore
- Layer 1: Hostinger daily/on-demand backups (verify retention).
- Layer 2: nightly app-level encrypted export to storage (§14), plus owner-triggered download.
- Layer 3: monthly **restore drill** on a scratch database; record the date in `docs/00_PROGRESS.md`.
- Targets: RPO ≤ 24 h, RTO ≤ 4 h.

### 16.4 Performance and limits
Managed plans have finite CPU/RAM: keep queries indexed, paginate everything, stream exports, avoid loading images into memory, keep the Barcode Studio work in the browser. Budgets: shell JS ≤ 180 KB gzipped; lazy-load jsPDF, ExcelJS/SheetJS, JSZip, camera scanner. Load-test 5 concurrent cashiers and a 10,000-item inventory before go-live.

---

## 17. Testing strategy
| Level | Tool | Must cover |
|---|---|---|
| Unit | Vitest | All of `src/domain` (≥ 90% coverage), golden tests G1–G10 and P1, barcode grid/validation/unit conversion |
| Integration | Vitest + local MySQL | Sale transaction (two parallel cashiers, one item), SKU counter race, idempotency replay, reversal balances, permission checks per role |
| E2E | Playwright (projects: Pixel 5 @ 360-ish, iPhone, iPad, Desktop) | Journeys J1–J6 from the PRD; refresh restores drafts; offline sale queue; Barcode Studio 1,000 labels |
| Visual/A11y | axe + screenshots at 360/768/1440 | No horizontal scroll, focus order, contrast |
| Security | Automated + checklist | Auth bypass, IDOR on customer/girvi ids, upload abuse, rate limits |
| Data | Seeded fixture (fortnight of activity, hand-computed totals) | Reports and reconciliation |
CI blocks merges on lint, `tsc`, unit and integration tests; e2e runs on PRs to `main`.

---

## 18. Observability
Structured JSON logs with request id, user id, route, duration; no personal data or secrets. `/api/health` returns DB status, app version, last nightly/backup success. Optional Sentry for client and server errors. Owner-visible "Data health" and "Backup status" cards.

---

## 19. Traceability matrix (PRD → DESIGN → TECH → tests)

| Requirement group | Screens | Components | Tables | Endpoints | Tests |
|---|---|---|---|---|---|
| PLT-01 responsive | all | C-01, C-10, C-11 | — | — | e2e viewport projects, axe |
| PLT-02,03 auth/roles | S-01, S-80 | C-18 | User, Session | `/auth/*`, `/users` | integration permissions |
| PLT-05 audit | S-80 | — | AuditLog | `/audit` | integration |
| PLT-06 search | S-03 | — | Customer, InventoryItem, Sale, Girvi | `/search` | integration |
| PLT-08,12 drafts/idempotency | S-04 | C-13, C-14 | Draft, IdempotencyKey | `/drafts/*` | e2e refresh, replay test |
| CUS-01..08 customers | S-10..12 | C-06, C-07, C-09, C-21 | Customer, File | `/customers/*` | duplicate + quick-add |
| INV-01..04,09 | S-20..23 | C-10 | SkuMaster, InventoryItem, StockMovement, Counter | `/inventory/*`, `/sku-master` | SKU race test |
| **BAR-01..12** | **S-60..62** | **C-08, C-27, C-12** | **LabelTemplate, PrintJob** | **`/barcode/unlabelled`, `/label-templates`, `/print-jobs`** | **grid, validation, 1,000-label e2e** |
| POS-01..14 | S-30..36 | C-04, C-05, C-08 | Sale, SaleItem, Payment, DailyRate, OldGoldPurchase, DayClose | `/sales`, `/payments`, `/rates`, `/day-close` | P1, parallel sale, J1 |
| CRD-01..09 | S-40..42 | C-16, C-17 | Credit, CreditEvent, Payment | `/credits/*` | G5, G6, G10 |
| GIR-01..17 | S-50..54 | C-12, C-17, C-21 | Girvi, GirviItem, GirviEvent, InterestSnapshot | `/girvi/*` | G1–G4, G6–G9, J2, J3 |
| **CSH-01..97** | **S-180..188** | **C-60..68** | **FundAccount, CashCategory, CashTxn, TxnLabel, TxnLabelAlias, DailyCashSnapshot, CashCategoryMap** | **`/cash-txns`, `/cashbook`, `/cashbook/fund-accounts`, `/day-close`** | **CF1..CF21, J14..J16** |
| **RPL-01..78** | **S-190..198** | **C-70..76** | **StorageLocation, CustodyMovement, LocationAudit, RepledgeLoan, RepledgeLink, RepledgeEvent, RepledgeSettlement, RepledgeSettlementLine** | **`/locations`, `/custody`, `/repledge/*`** | **RP1..RP20, J17..J20** |
| TAG-01..08 | all entity detail screens | TagBadge, SmartListPin, TagEditor | TagDef, EntityTag, SmartList | `/tags`, `/tags/apply` | tag-apply, tag-effect, block-release tests |
| CALC-01..05 | S-51, S-52, S-190 | LendingAdvisor, RedemptionCalc, RepledgeAdvisor | SuggestionLog, AnalyticsSnapshot | `/calculators/lending`, `/calculators/redemption`, `/analytics/snapshot` | G11, G12, G13 golden tests |
| PUR-01..07 | S-24..26 | PurchaseLotQueue, RateFixWizard, BulkCostEdit | PurchaseLot, RateFixEvent, ItemCostRevision | `/purchase-lots`, `/purchase-lots/:id/rate-fix`, `/purchase-lots/bulk-cost-edit` | rate-fix race condition, bulk-cost-edit PIN, G14 |
| TRN-01..09 | S-200..203 | TrancheTable, PartialReleaseWizard, DeliveryQueueWidget | GirviTranche, PartialReleaseBatch, PaymentAllocation | `/girvi/:id/tranches`, `/girvi/:id/release-batch`, `/girvi/delivery-queue` | tranche-alloc, release-check, G13 |
| RPT-01..08 | S-70..72, S-81, S-02 | C-22, C-23, C-24 | Report*, KpiTarget, InterestSnapshot | `/reports/*`, `/dashboard`, `/data-health` | fixture totals, reconciliation |
| NFR-04,05 | S-80 | — | — | `/backup/*`, `/api/health`, `/api/cron/*` | restore drill, security checklist |

`docs/00_PROGRESS.md` copies this table and tracks each row as ☐ / ◐ / ✔ with the commit and test references.

---

## 20. Technical risks
| Risk | Mitigation |
|---|---|
| Prisma engine/OS mismatch on the host | `binaryTargets`, test a deploy in M1 with a hello-world DB query |
| Hosting wipes the app directory on deploy | Uploads outside the deploy folder or object storage (ADR-10) |
| Migration run permissions | Decide build-time vs SSH migration in M1 and document |
| Interest convention disputes | Convention recorded in §8.4; exposure of the full breakdown to the user; owner sign-off on 20 real cases |
| Heavy PDF/Excel on low-end phones | Vector PDF, chunked jobs, lazy loading, cancel button |
| Camera scanning support varies by browser | `BarcodeDetector` with `@zxing` fallback; manual entry always available |
| Scope creep between docs | Precedence rule; progress tracker; drift-check prompt in `04` |
| Multi-tranche payment allocation order conflicts | Strict precedence rules in `PaymentAllocation`; owner-selectable order; per-tranche breakdown printed on every receipt |
| Rate-open lot cost revisions affect margin reports retroactively | `ItemCostRevision` is append-only; reports show cost-at-time-of-sale vs revised-cost separately; owner notified on each fix |
