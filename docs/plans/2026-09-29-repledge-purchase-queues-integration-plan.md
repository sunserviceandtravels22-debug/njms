# Implementation Plan: Document 11 · Re-Pledge Integration, Purchase Rate Queues, Multi-Tranche & Delivery Queues

**Document Source:** `11_REPLEDGE_INTEGRATION_PURCHASE_RATE_QUEUES (1).md`  
**Date:** 2026-09-29  
**Status:** Implementation Blueprint  
**Target:** Narayan Jewellers Management System (NJMS) Next.js Application  

---

## 1. Executive Architecture Summary

This plan outlines the end-to-end integration of Document 11 requirements into the NJMS codebase, extending Prisma schemas, domain calculation engines, Cash Flow rules, Girvi pawnbroking, Re-pledge management, Purchase lot settlement queues, Delivery queues, and Interest policies.

---

## 2. Phased Implementation Roadmap

### Phase 1: Database Schema & Domain Engine Extensions
- **Prisma Schema Updates (`prisma/schema.prisma`):**
  - Add `CustomerTag` values (`HAS_REPLEDGED`, `PAID_AWAITING_RELEASE`, `MANUAL_INTEREST`, `SETTLED_BY_REPLEDGE`, `RATE_OPEN`, `RATE_PARTLY_FIXED`, `SETTLEMENT_DUE`, `COST_REVISED`).
  - Add `PurchaseBasis` enum (`RUPEE_FIXED`, `RATE_OPEN`, `METAL_ACCOUNT`).
  - Add `PurchaseLot` model (vendor, lotNo, fineMg, basis, provisionalRatePaise, rateFixEvents).
  - Add `RateFixEvent` model (lotId, fineMgFixed, fixedRatePaise, metalValuePaise, gstPaise, costRevisionBatchId).
  - Add `ItemCostRevision` model (itemId, oldRate, newRate, deltaPaise, reason, byUserId).
  - Add `GirviTranche` model (`girviId`, `seqNo`, `kind` [ORIGINAL|TOPUP|METAL_SPLIT|RENEWAL], `principalOpenPaise`, `interestType`, `rate`, `compounding`, `status`).
  - Add `PartialReleaseBatch` model (`girviId`, `articleIds`, `state`, `minPrincipalToPayPaise`, `collectorName`, `collectorRelation`, `collectorIdType`).
  - Add `PaymentAllocation` model (`paymentId`, `girviId`, `trancheId`, `interestPaise`, `principalPaise`).
  - Add `settlementGroupId` & `fundedSettlementOfLoanId` to `RepledgeLoan`.
- **Domain Engines (`src/domain/`):**
  - Create `src/domain/repledge/rowFigures.ts` (computes rate gap in pp/mo, rupee spread/mo, own capital, break-even check).
  - Create `src/domain/purchase/lotCalculator.ts` (computes fine weight, metal value, GST, provisional cost, rate-fix delta allocations).
  - Create `src/domain/girvi/releaseCheck.ts` (value-based release check per metal: `lendable(article) = fine_mg × rate × lendableFactor`, computes `minPrincipalToPay`).
  - Create `src/domain/interest/projection.ts` (`payableOn(date)` per tranche, Simple vs Compound what-if comparison, 12/24 mo schedule generator).

---

### Phase 2: Enhanced Re-Pledge Form (S-190 Extended) & Tags Sync
- **Unified Multi-Criteria Search Component (`GirviSearchBox`):**
  - Searches Customer name, phone, relation, Girvi No, article text, packet number, tags (`repledged`, `overdue60`).
  - Filters eligible vs ineligible girvis with explicit greyed-out reason chips.
- **Row Expansion & Spread Calculator:**
  - Displays Customer principal, Customer rate, Vendor offered amount, Vendor rate.
  - Live calculations: Rate Gap (%/mo), Rupee Spread (₹/mo), Own Capital (₹), LTV %, Break-even warning (red indicator when losing money).
- **Atomic Execution & Tagging Sync:**
  - Saves Re-pledge link, updates custody location to vendor, creates `Payment` IN/OUT rows with `refType: REPLEDGE`.
  - Applies `REPLEDGED` & `WITH_VENDOR` tags (visible to all staff) and `HAS_REPLEDGED` on Customer 360°.

---

### Phase 3: Purchase Lot Settlement Queue & Rate-Fixing (S-25 / S-26)
- **Rate-Open Purchases Ingestion (S-24):**
  - Ingest lots under basis `RUPEE_FIXED`, `RATE_OPEN`, or `METAL_ACCOUNT`.
  - Assigns `costBasis = PROVISIONAL` and calculates provisional item cost based on day's metal benchmark.
- **Settlement Queue (S-25):**
  - Lists open/unpaid purchase lots with age analysis, provisional lot value, fine grams open, and mark-to-market exposure (rupee change per ±₹100/g rate fluctuation).
- **Rate-Fixing Wizard:**
  - Select lot → type fine weight to fix & rate → recomputes lot metal value, GST, and appends `ItemCostRevision` records without altering printed barcodes or selling prices.
- **Bulk Rate Edit Tool (S-26):**
  - Filter items by vendor/date range → preview old vs new cost → PIN confirmation → append-only batch revisions.

---

### Phase 4: Cash Flow Integration & Audit Enforcement
- **Cash Flow Coverage Matrix:**
  - Enforce rule: **Inventory movements/imports NEVER post cash rows.**
  - Money moves ONLY when explicit vendor payments are recorded (`refType: PURCHASE_LOT`, category *Metal/stock purchase*).
  - Include auto-posting for sales receipts, credit collections, girvi payouts/receipts, re-pledge loans, expenses.
- **Data Health Reconciliation Checks:**
  - Scan for orphan payments, verify payment allocations match total payments, ensure zero inventory-driven cash rows.

---

### Phase 5: Multi-Tranche Girvi & Partial Release Batches
- **Multi-Tranche Management on Girvi Detail (S-52 / S-200):**
  - Support top-up tranches on existing mortgages with independent rates, policies (Simple/Compound), and due dates.
  - Render Tranche Summary Table with sequence, start date, principal, rate, accrued interest, and payable.
- **Part-Payment Allocation Engine (S-202):**
  - Allocation order choices: All Interest First (default), Tranche by Tranche, Highest Rate First, or Pick Tranche.
  - Generates receipt with sequential receipt number and per-tranche breakdown.
- **Partial Release Wizard (S-203):**
  - Select articles to return → value-based check computes remaining lendable value and `minPrincipalToPay`.
  - Collects collector details (name, relation, ID type, last 4 digits).
  - Handles article splits (quantity > 1) and packet re-sealing task.

---

### Phase 6: Delivery Queue & Vendor Settlement by Re-Pledge
- **Dashboard Delivery Queue Widget:**
  - Two lanes:
    - **Lane A: Ready to hand over** (in shop)
    - **Lane B: Coming from vendor** (Requested → Repaying → In Transit → Received)
  - Color-coded waiting time indicators (Green <24h, Amber 1-3d, Red >3d).
  - Freeze interest on payment date (`PAID_AWAITING_RELEASE` state) to protect customers from shop delays.
- **Vendor Settlement by Re-Pledge (S-198):**
  - Variant X (Different vendor B) & Variant Y (Same vendor swap A).
  - Links loans with `settlementGroupId` and set-off non-cash legs.

---

### Phase 7: Interest Policy Guidelines & Projections
- **Policy Library (`Settings -> Interest Policies`):**
  - Create & manage policies (Simple vs Compound, compounding basis `RESTART_ON_PAYMENT` vs `CALENDAR_BLOCKS`, partial-period rules).
  - Snapshot policy into tranche at creation.
- **Projection Service (`src/domain/interest/projection.ts`):**
  - Compute `payableOn(date)` for future dates.
  - Side-by-side Simple vs Compound what-if calculator.
  - 12/24-month schedule table exporter (PDF/CSV).

---

## 3. Action Plan & Task Breakdown

| Task ID | Component / Area | Description | Priority |
|---|---|---|---|
| **T1** | Schema & Database | Extend Prisma schema with Tranche, PurchaseLot, RateFixEvent, CostRevision, ReleaseBatch models | P0 |
| **T2** | Domain Logic | Build `rowFigures.ts` (Rate gap, spread, own capital) & `lotCalculator.ts` (Fine weight & rate fixing) | P0 |
| **T3** | Domain Logic | Build `releaseCheck.ts` (Value-based release check) & `projection.ts` (Interest projection engine) | P0 |
| **T4** | Re-Pledge UI | Extend S-190 Re-pledge form with multi-criteria search, row expansion, rate gap & spread badges | P0 |
| **T5** | Tagging & Search | Implement `REPLEDGED`, `WITH_VENDOR`, `HAS_REPLEDGED` tags visible to staff across search & Customer 360° | P0 |
| **T6** | Purchase Queue | Build Settlement Queue (S-25) & Rate-Fixing wizard with provisional cost calculations | P0 |
| **T7** | Bulk Rate Edit | Build Bulk Rate Correction tool (S-26) with preview & PIN authorization | P0 |
| **T8** | Cash Flow | Wire Cash Flow matrix; lock inventory from posting cash rows; tag vendor payments | P0 |
| **T9** | Multi-Tranche UI | Build Top-up tranche sheet (S-200) and Tranche Table (S-201) on Girvi Detail | P0 |
| **T10** | Part Payment UI | Build Tranche Payment Allocation sheet (S-202) with order options and single receipt generation | P0 |
| **T11** | Partial Release | Build Partial Release wizard (S-203) with value-based check, collector log, packet re-sealing | P0 |
| **T12** | Delivery Queue | Build Dashboard Delivery Queue widget with Lane A & Lane B cards and interest freezing | P0 |
| **T13** | Vendor Settlement | Build Settling Vendor by Re-Pledge wizard (S-198) supporting Variant X & Y with `settlementGroupId` | P0 |
| **T14** | Interest Policy | Build Policy library in Settings & Projection calculator (`payableOn`) | P0 |
| **T15** | Verification | Write golden tests for interest calculations, multi-tranche allocations, and run `npx tsc --noEmit` | P0 |
