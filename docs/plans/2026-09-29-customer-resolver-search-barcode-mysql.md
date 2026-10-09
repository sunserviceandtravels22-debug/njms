# Customer Resolver, Universal Search, Barcode Studio & MySQL Integration Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the Unified Customer Resolver system (per `10_CUSTOMER_RESOLVER.md`), fix and upgrade Universal Search (`/search`), upgrade Barcode Studio (`/barcode`) to match all features from `legacy/barcode-generator` with live sheet canvas preview and rich exports, and provide step-by-step instructions for connecting local MySQL via XAMPP & MySQL Workbench 8.0 CE.

**Architecture:**
- **Customer Resolver & Identity Engine**: Build `PartyResolver.tsx` (`C-07v2`), `InlineCustomerForm.tsx` (`C-90`), `DuplicateChoiceSheet.tsx` (`C-93`), `CompleteProfileBanner.tsx` (`C-92`), `CustomerReportAction.tsx` (`C-95`), and `CustomerReportModal.tsx` (`S-209`). Extend Prisma schema with new Customer identity fields & `IdentityRequirementProfile` + `DuplicateDecision` models.
- **Universal Search**: Implement `/api/v1/search` multi-entity search endpoint and interactive `/search` page overlay with Cmd+K / Ctrl+K keyboard shortcut listener.
- **Barcode Studio Upgrade**: Add interactive live sheet SVG/canvas preview grid, zoom controls, full Avery & custom templates, custom DPI/color/font pickers, and multi-format exports (PDF, ZIP, SVG, Browser Print).
- **Local MySQL Connection**: Update `schema.prisma`, `.env`, and provide XAMPP/MySQL Workbench step-by-step setup guide.

**Tech Stack:** Next.js 14, React 18, TypeScript, Prisma (MySQL), Tailwind CSS, Lucide React, JsBarcode, QRCode, jsPDF, JSZip, FileSaver.

---

### Task 1: Prisma Schema Extensions for Customer Resolver

**Files:**
- Modify: `c:/Users/saubh/Downloads/files/njms/prisma/schema.prisma`

**Step 1: Add new fields & models to Prisma schema**
Add to `Gender` enum: `MALE`, `FEMALE`, `OTHER`, `UNSPECIFIED`
Add fields to `Customer` model:
- `gender`: `Gender @default(UNSPECIFIED)`
- `occupation`: `String? @db.VarChar(80)`
- `permanentAddress`: `String? @db.Text`
- `locality`: `String? @db.VarChar(80)`
- `secondaryContactName`: `String? @db.VarChar(120)`
- `secondaryContactPhone`: `String? @db.VarChar(15)`
- `secondaryContactRelation`: `String? @db.VarChar(40)`
- `idProofPhotoUrl`: `String? @db.VarChar(255)`
- `searchKey`: `String? @db.VarChar(200)`

Add models:
- `IdentityRequirementProfile`: `id`, `moduleId`, `field`, `level` (`OPTIONAL`, `PROMPTED`, `MANDATORY`), `amountThresholdPaise`, `updatedById`, `updatedAt`
- `DuplicateDecision`: `id`, `newCustomerId`, `candidateCustomerId`, `matchScoreBp`, `decision`, `byUserId`, `at`

**Step 2: Generate Prisma Client**
Run: `npx prisma generate`

---

### Task 2: Pure Domain Utilities for Customer Resolver & Report Query

**Files:**
- Create: `c:/Users/saubh/Downloads/files/njms/src/lib/customer/resolve.ts`
- Create: `c:/Users/saubh/Downloads/files/njms/src/lib/customer/identityRequirements.ts`
- Create: `c:/Users/saubh/Downloads/files/njms/src/app/api/v1/customers/resolve/route.ts`
- Create: `c:/Users/saubh/Downloads/files/njms/src/app/api/v1/customers/[id]/report/route.ts`

**Step 1: Build `resolve.ts`**
- Candidate scoring algorithm based on phone exact match (1.0), last 4/6 digits (0.85), alt phone (0.9), name prefix (0.75), fuzzy trigram/Dice (0.55), relation name match (0.65).
- Ranking formula incorporating recency & active exposure (open credit/girvi).

**Step 2: Build `identityRequirements.ts`**
- `checkRequirements(moduleId, customer, settings)` returning `{ missing: FieldRef[], blocking: FieldRef[] }`.

**Step 3: Build API `/api/v1/customers/resolve`**
- GET endpoint querying ranked candidate suggestions for type-ahead resolver.

**Step 4: Build API `/api/v1/customers/[id]/report`**
- Single source of truth endpoint returning Section A (Identity), Section B (Lifetime summary numbers), Section C (Chronological timeline across POS, Credit, Girvi, Cashbook, Old Gold), Section D (Documents), Section E (Reconciliation check).

---

### Task 3: Customer Resolver Components & Report Modal

**Files:**
- Create: `c:/Users/saubh/Downloads/files/njms/src/components/customers/PartyResolver.tsx`
- Create: `c:/Users/saubh/Downloads/files/njms/src/components/customers/InlineCustomerForm.tsx`
- Create: `c:/Users/saubh/Downloads/files/njms/src/components/customers/DuplicateChoiceSheet.tsx`
- Create: `c:/Users/saubh/Downloads/files/njms/src/components/customers/CompleteProfileBanner.tsx`
- Create: `c:/Users/saubh/Downloads/files/njms/src/components/customers/CustomerReportAction.tsx`
- Create: `c:/Users/saubh/Downloads/files/njms/src/components/customers/CustomerReportModal.tsx`

**Step 1: Build `PartyResolver.tsx` (`C-07v2`)**
- Single box input with debounced type-ahead suggestions.
- Mode support: `full` (Girvi, POS, Credit, Old Purchase) and `light` (Witness, Cashbook Party).
- Displays avatar, name, relation, masked phone, locality, exposure chip (`Girvi ₹40,000 · Credit ₹0`), and "📄 Full Report" action icon.
- Always shows "＋ Add new customer" at bottom of dropdown list.

**Step 2: Build `InlineCustomerForm.tsx` (`C-90`)**
- Bottom-sheet / side drawer with collapsible sections: Identity, Address, Identification, Contacts, Other.
- Integrates live duplicate checking and module-specific requirement prompts.

**Step 3: Build `DuplicateChoiceSheet.tsx` (`C-93`)**
- Modal handling `409 POSSIBLE_DUPLICATE` with choices: "Use existing customer" or "Save as new anyway".

**Step 4: Build `CompleteProfileBanner.tsx` (`C-92`)**
- Reusable banner prompting for required or recommended missing fields before transaction finalization.

**Step 5: Build `CustomerReportAction.tsx` (`C-95`) & `CustomerReportModal.tsx` (`S-209`)**
- Single button triggering live on-screen full lifetime customer profile report with timeline tabs, live drill-down, and CSV/PDF export.

---

### Task 4: Fix Universal Search Module (`/search` & Header)

**Files:**
- Create: `c:/Users/saubh/Downloads/files/njms/src/app/api/v1/search/route.ts`
- Create: `c:/Users/saubh/Downloads/files/njms/src/app/(app)/search/page.tsx`
- Modify: `c:/Users/saubh/Downloads/files/njms/src/components/shell/AppShell.tsx`

**Step 1: Build API route `/api/v1/search`**
- Searches across Customers, Inventory Items (`tagNo`, `sku`, `name`), Invoices/Sales, Girvi Loans (`loanNo`), Cash Transactions, and SKU catalog.
- Returns categorized results with badges and direct link targets.

**Step 2: Build Universal Search Page & Modal (`/search/page.tsx`)**
- Keyboard listener for `Cmd+K` / `Ctrl+K`.
- Tabbed filters (All, Customers, Inventory, Sales, Girvi, Cashbook).
- Instant search results with high-contrast highlight matching, action shortcuts, and embedded `CustomerReportAction`.

**Step 3: Connect Header Search in `AppShell.tsx`**
- Clicking header search icon or pressing `Cmd+K` opens the Universal Search overlay.

---

### Task 5: Upgrade Barcode Generator Studio (`/barcode`)

**Files:**
- Modify: `c:/Users/saubh/Downloads/files/njms/src/app/(app)/barcode/page.tsx`
- Modify: `c:/Users/saubh/Downloads/files/njms/src/lib/barcode/exportService.ts`

**Step 1: Enhance Barcode Engine & Export Service**
- Add SVG export renderer, direct browser window print layout, and fine-tuned millimeter/inch conversions.

**Step 2: Build Interactive Live Sheet Canvas Preview Grid**
- Interactive SVG/HTML canvas preview rendering the actual page sheet (A4, A3, Letter, etc.) with real-time tag position grid, margins, gutters, scale zoom slider, and printable area outline.

**Step 3: Complete Customization Controls**
- Color pickers (Barcode color, Background color, Text color), Font size slider (6pt to 24pt), Display text toggle, Barcode module width slider.
- Single item input, CSV/Text bulk import with format guidance, and **One-click "Load from Active Inventory" button**.
- Responsive side-by-side design on desktop and tabbed controls on mobile screens.

---

### Task 6: MySQL Local Connection Setup & Testing Guide

**Files:**
- Create: `c:/Users/saubh/Downloads/files/njms/docs/MYSQL_LOCAL_SETUP_GUIDE.md`
- Modify: `c:/Users/saubh/Downloads/files/njms/.env`

**Step 1: Write Step-by-Step MySQL Setup Guide**
Include detailed instructions for XAMPP & MySQL Workbench 8.0 CE:
1. Start XAMPP Control Panel and start **MySQL** module (Port 3306).
2. Open **MySQL Workbench 8.0 CE** and connect to Local Instance (Hostname: `127.0.0.1`, Port: `3306`, Username: `root`).
3. Create database schema: `CREATE DATABASE njms_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
4. Update `.env` in `njms/`: `DATABASE_URL="mysql://root:@localhost:3306/njms_db"`
5. Run Prisma migrations and seed: `npx prisma db push` and `npx prisma db seed`
6. Verify app database connection by running `npm run dev`.

---

### Task 7: End-to-End Verification & Build Check

**Step 1: Run TypeScript typecheck**
- Command: `npx tsc --noEmit`

**Step 2: Run Next.js production build**
- Command: `npm run build`

---
