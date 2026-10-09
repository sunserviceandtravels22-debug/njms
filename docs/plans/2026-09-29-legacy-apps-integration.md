# Legacy Apps (Barcode Generator & Supabase App) Integration Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate 100% of the functionality, UI workflows, calculation logic, data structures, and features from the two legacy applications (`barcode-generator` and `supabase-app`) into the `njms` Next.js App Router application.

**Architecture:** 
- Convert legacy client-side state/Supabase context into server-backed Next.js 14 App Router API endpoints (`/api/v1/...`) powered by Prisma (MySQL) and Zustand/React state.
- Create modular lib utilities (`src/lib/barcode/`, `src/lib/inventory/`, `src/lib/sales/`, `src/lib/reports/`) for barcode generation, label grid layout math, financial profitability calculations, and CSV/PDF exporting.
- Add front-end module pages in `src/app/(app)/` (`/barcode`, `/inventory`, `/inventory/new`, `/inventory/sku`, `/pos`, `/pos/history`, `/reports`, `/audit-log`) styled with Tailwind CSS to match `njms` design system while maintaining all visual richness and operational tools from legacy apps.

**Tech Stack:** Next.js 14, React 18, TypeScript, Prisma, Tailwind CSS, Lucide React, Recharts, JsBarcode, QRCode, jsPDF, JSZip, FileSaver.

---

### Task 1: Install Required Dependencies

**Files:**
- Modify: `c:/Users/saubh/Downloads/files/njms/package.json`

**Step 1: Check dependencies to add**
Dependencies needed:
- `jsbarcode`: Barcode 1D rendering engine
- `qrcode`: 2D QR Code generation engine
- `jspdf`: PDF generation for barcode label sheets and report exports
- `jszip`: ZIP archive generator for barcode PNG batch exports
- `file-saver`: File download saver for zip and csv downloads
- `recharts`: Charting library for dashboard & business intelligence reports
- `@types/file-saver`, `@types/qrcode`, `@types/jsbarcode`: TypeScript type definitions

**Step 2: Run npm install**
Run: `npm install jsbarcode qrcode jspdf jszip file-saver recharts` and `npm install -D @types/file-saver @types/qrcode @types/jsbarcode`

---

### Task 2: Barcode Generator Core Utilities & Barcode Studio Page (`/barcode`)

**Files:**
- Create: `c:/Users/saubh/Downloads/files/njms/src/lib/barcode/types.ts`
- Create: `c:/Users/saubh/Downloads/files/njms/src/lib/barcode/unitConverter.ts`
- Create: `c:/Users/saubh/Downloads/files/njms/src/lib/barcode/barcodeGenerator.ts`
- Create: `c:/Users/saubh/Downloads/files/njms/src/lib/barcode/exportService.ts`
- Create: `c:/Users/saubh/Downloads/files/njms/src/app/(app)/barcode/page.tsx`

**Step 1: Port `types.ts` and `unitConverter.ts`**
- Port `Unit` enum, `BarcodeFormat` enum (18 formats: EAN13, EAN8, UPCA, UPCE, ITF, ITF14, ISBN, ISSN, JAN13, JAN8, CODE128, CODE39, CODE25, CODABAR, MSI, PHARMACODE, POSTNET, QR), `BarcodeConfig`, `PageSetup`, `LabelTemplate`.
- Implement `convertToPx` function handling `px`, `in`, `cm`, `mm` for target DPI settings.

**Step 2: Port `barcodeGenerator.ts`**
- High DPI (600 DPI standard) canvas rendering with `JsBarcode` and `QRCode`.
- Barcode format validator (`validateBarcode`).
- Data URL generation (`renderBarcodeToDataUrl`).

**Step 3: Port `exportService.ts`**
- Grid calculator function `calculateGrid` with page orientation, margins, gutters, fit capacity, and margin reduction recommendations.
- ZIP exporter `exportAsZip` using `JSZip` & `file-saver`.
- Print-ready PDF exporter `exportAsPdf` using `jsPDF` grid placement.

**Step 4: Build Barcode Studio UI (`/barcode/page.tsx`)**
- Single entry & bulk text/CSV entry input.
- Preset Avery label templates (Avery 5160, 5161, 5163, 5167) and Page formats (A4, A3, Letter, etc.).
- Custom barcode format selector, color picker, dimension controls, margin setup.
- Integration to query active `njms` inventory items and load their tag numbers (`tagNo`) directly into the generator for instant tag printing.
- PDF and ZIP download triggers.

---

### Task 3: Market Benchmark Rates API & Dashboard Live Benchmark Update

**Files:**
- Create: `c:/Users/saubh/Downloads/files/njms/src/app/api/v1/rates/route.ts`
- Modify: `c:/Users/saubh/Downloads/files/njms/src/app/(app)/dashboard/page.tsx`

**Step 1: Build API route for Daily Rates (`/api/v1/rates`)**
- `GET`: Returns latest Gold rate (10g basis) and Silver rate (1kg basis) from Prisma `DailyRate`.
- `POST`: Upserts daily rates into Prisma `DailyRate` for Gold and Silver.

**Step 2: Update Dashboard (`/dashboard/page.tsx`)**
- Add Live Gold (10g) & Silver (1kg) Benchmark cards with live ping indicators, vault weight breakdown, concentration %, and adjustment modal (matching legacy `Dashboard.tsx`).
- Incorporate Inventory Health Index gauge (avg margin), KPI matrix (Net Profit Yield, Gross Cashflow, Vault Valuation, Registry Count).
- Incorporate 7-Day Settlement Velocity chart & Category Concentration pie chart using Recharts.
- Incorporate Safety Floor Protocol low-stock alerts panel.

---

### Task 4: SKU Master Catalog (`/inventory/sku`)

**Files:**
- Create: `c:/Users/saubh/Downloads/files/njms/src/app/api/v1/inventory/sku/route.ts`
- Create: `c:/Users/saubh/Downloads/files/njms/src/app/(app)/inventory/sku/page.tsx`

**Step 1: Build API route `/api/v1/inventory/sku`**
- `GET`: Fetch SKU catalog stored in Prisma `Setting` (key: `sku_master_catalog`) or derived from inventory.
- `POST`: Add new SKU item (`skuCode`, `metalType`, `category`, `defaultTunch`, `minStockLevel`, `active`).
- `PUT`: Update existing SKU catalog item.
- `DELETE`: Remove SKU catalog item.

**Step 2: Build SKU Master UI (`/inventory/sku/page.tsx`)**
- Metal filter buttons (All, Gold, Silver), search input.
- Table listing SKU code, Category badge, default tunch %, safety floor min stock level, operational status badge.
- Modal dialog for initializing / editing protocol catalog items.

---

### Task 5: Inventory Ingestion & Enhanced Inventory Master (`/inventory` & `/inventory/new`)

**Files:**
- Create: `c:/Users/saubh/Downloads/files/njms/src/app/api/v1/inventory/route.ts`
- Create: `c:/Users/saubh/Downloads/files/njms/src/app/api/v1/inventory/[id]/route.ts`
- Create: `c:/Users/saubh/Downloads/files/njms/src/app/api/v1/inventory/bulk-delete/route.ts`
- Create: `c:/Users/saubh/Downloads/files/njms/src/app/(app)/inventory/new/page.tsx`
- Modify: `c:/Users/saubh/Downloads/files/njms/src/app/(app)/inventory/page.tsx`

**Step 1: Build API endpoints for Inventory**
- `GET /api/v1/inventory`: List items with filter parameters.
- `POST /api/v1/inventory`: Create new asset item (validating tagNo / barcode uniqueness).
- `PUT /api/v1/inventory/[id]`: Update inventory item fields.
- `DELETE /api/v1/inventory/[id]`: Delete / void single asset item.
- `POST /api/v1/inventory/bulk-delete`: Bulk delete selected items.

**Step 2: Build Inventory Ingestion Page (`/inventory/new/page.tsx`)**
- SKU search autocomplete, unique asset tag barcode scanner with availability check.
- Net mass input (g), tunch %, crafting labour fees, auto base price calculation from live gold/silver rates.
- Vendor/karigar selection, transaction date, design notes.
- Quick submission and success feedback toast.

**Step 3: Enhance Main Inventory Page (`/inventory/page.tsx`)**
- Summary KPI cards: Mass holdings, Labour investment total, Vault acquisition cost total.
- Metal filters (All, Gold, Silver), protocol search input, bulk selection checkbox.
- Asset table displaying metal badge, tagNo/barcode, inbound date, benchmark rate, supplier, net mass, labour cost, basis cost, notes, edit button, delete button.
- Inline asset edit modal dialog.
- Action button to send selected/filtered tags directly to Barcode Studio (`/barcode`).

---

### Task 6: POS & Sales Settlement Terminal (`/pos`)

**Files:**
- Create: `c:/Users/saubh/Downloads/files/njms/src/app/api/v1/sales/route.ts`
- Create: `c:/Users/saubh/Downloads/files/njms/src/lib/sales/calculations.ts`
- Modify: `c:/Users/saubh/Downloads/files/njms/src/app/(app)/pos/page.tsx`

**Step 1: Profit & Margin calculation utility (`src/lib/sales/calculations.ts`)**
- Port `calculateProfit` function: Total cost = purchase price + labour charges; Profit = selling price - total cost; ROI %; Margin %; Status ('high' | 'medium' | 'low' | 'loss').

**Step 2: Build API endpoint `/api/v1/sales`**
- `POST`: Complete a sale transaction: create `Sale` & `SaleItem` records in Prisma, update `InventoryItem` status to `SOLD`, log audit trail event.

**Step 3: Enhance POS UI (`/pos/page.tsx`)**
- Scanner terminal bar listening for asset tag scan.
- Selected item summary card (Metal type, SKU, category, barcode, mass, tunch, crafting fee, cost basis).
- Agreed transaction value input with live financial performance stats (ROI %, Portfolio Margin %, Status badge with loss warning prompt).
- Client identity inputs (Name, Phone) and settlement path selector (Cash, Card, UPI, Bank Transfer).
- Full screen transaction committed modal feedback.

---

### Task 7: Sales History Ledger & Audit Security Log (`/pos/history` & `/audit-log`)

**Files:**
- Create: `c:/Users/saubh/Downloads/files/njms/src/app/api/v1/sales/history/route.ts`
- Create: `c:/Users/saubh/Downloads/files/njms/src/app/api/v1/sales/[id]/void/route.ts`
- Create: `c:/Users/saubh/Downloads/files/njms/src/app/api/v1/audit-log/route.ts`
- Create: `c:/Users/saubh/Downloads/files/njms/src/app/(app)/pos/history/page.tsx`
- Create: `c:/Users/saubh/Downloads/files/njms/src/app/(app)/audit-log/page.tsx`

**Step 1: Build API endpoints**
- `GET /api/v1/sales/history`: Fetch sales records with filtering & sorting.
- `POST /api/v1/sales/[id]/void`: Void sale transaction and return asset to stock.
- `GET /api/v1/audit-log`: Fetch audit log events.
- `DELETE /api/v1/audit-log`: Delete / purge audit log records.

**Step 2: Build Sales History Page (`/pos/history/page.tsx`)**
- Revenue, Net Profit, Purchased Value, Mass Sold summary cards.
- Metal & payment method filters, search input, recency/revenue/profit sorter.
- Print PDF button.
- Comprehensive sales table with void and delete actions.

**Step 3: Build Audit Log Page (`/audit-log/page.tsx`)**
- Trace buffer header with active events counter.
- Module filters (All, Inventory, Sales, Purchase, SKU).
- Action badges (Created, Edited, Voided, Deleted), timestamp, operator, trace reason.
- Bulk purge functionality.

---

### Task 8: Business Intelligence Reports (`/reports`)

**Files:**
- Create: `c:/Users/saubh/Downloads/files/njms/src/app/api/v1/reports/route.ts`
- Create: `c:/Users/saubh/Downloads/files/njms/src/lib/reports/export.ts`
- Create: `c:/Users/saubh/Downloads/files/njms/src/app/(app)/reports/page.tsx`

**Step 1: CSV Exporter Utility (`src/lib/reports/export.ts`)**
- Convert JSON datasets to downloadable CSV files.

**Step 2: Build API route `/api/v1/reports`**
- Fetch aggregated fiscal report data for a given date range (start date, end date).

**Step 3: Build Business Intelligence Reports Page (`/reports/page.tsx`)**
- Executive header with date range selector, CSV export button, PDF print button.
- Primary KPI grid: Gross Revenue, Realized Profit, Vault Evaluation, Metal Velocity.
- Recharts visualizations: Revenue Trajectory AreaChart, Asset Diversification PieChart, Performance by Category BarChart.
- Consolidated Settlement Ledger table with date, SKU/barcode, mass, cost, settlement value, profit, and margin.

---

### Task 9: Verification & Typecheck

**Step 1: Run TypeScript type check**
- Run: `npx tsc --noEmit` from `njms/` root to verify zero compilation errors.

**Step 2: Verify App Router builds**
- Run: `npm run build` from `njms/` root to confirm all dynamic routes, API routes, and components compile cleanly.

---
