# Master Implementation Plan: NJMS Modules Polish, Reports & Interfunctionality

**Date:** 2026-09-29  
**Status:** In Progress  
**Target:** Narayan Jewellers Management System (NJMS) Next.js Application  

---

## Executive Summary
This plan details the step-by-step execution to upgrade the Girvi metal purity field, build a full-featured Business Reports module integrated across all app sections, fix Barcode Studio responsiveness, polish overall app responsiveness across all screens, and audit cross-module sync & interfunctionality.

---

## Planned Execution Steps

### Step 1: Girvi Metal Purity Combobox Component
- **Goal:** Replace fixed purity dropdown with a selectable suggestion combobox that supports custom text entry.
- **Component:** `src/components/ui/PurityCombobox.tsx`
- **Suggestions:** `24K (999)`, `22K (916)`, `20K (833)`, `18K (750)`, `14K (585)`, `10K`, `925 Silver`, `999 Silver`, `950 Platinum`.
- **Integrations:**
  - `src/app/(app)/girvi/page.tsx`
  - `src/app/(app)/inventory/new/page.tsx`
  - `src/app/(app)/old-gold/page.tsx`

### Step 2: Comprehensive Business Intelligence Reports Module
- **Goal:** Transform `src/app/(app)/reports/page.tsx` into a multi-tab reporting portal matching the blueprint.
- **Report Tabs:**
  1. **Daily Sales & Register Report:** Sales list, revenue, profit margins, payment breakdowns.
  2. **Girvi Pawnbroking Register:** Active loans, principal totals, interest accrued, overdue contracts.
  3. **Stock & Inventory Valuation:** Mass weight totals by metal (Gold/Silver), tag count, category breakdown.
  4. **Day Book & Cash Flow:** Inflows vs Outflows, cash on hand, bank transfers.
  5. **Customer Accounts & Credit:** Udhar balances, aging analysis, overdue accounts.
  6. **GST & Tax Compliance:** CGST / SGST / IGST breakdown.
- **Interfunctionality Integration:**
  - Add "View Module Report" shortcuts in POS, Girvi, Customers, Inventory, Cashbook.

### Step 3: Barcode Studio Responsiveness Polish
- **Goal:** Perfect mobile & tablet UX for Barcode Studio.
- **Fixes:**
  - Replace non-standard utility classes (e.g. `w-4.5` → `w-[18px]`).
  - Mobile drawer toggle with backdrop overlay for sidebar on small screens.
  - Label grid auto-fitting (`grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4`).
  - Scale live SVG preview dynamically on small screen containers.

### Step 4: Full App Responsiveness Audit & Fixes
- **Goal:** Ensure all 12+ app modules render cleanly on mobile (375px+), tablet, and desktop.
- **Modules to Audit & Update:**
  - Dashboard
  - POS
  - Customers
  - Girvi
  - Inventory & Inventory Add
  - Cashbook
  - Old Gold
  - Credit & Udhar
  - Custody
  - Repledge
  - Search
  - Settings
- **Standards:**
  - All data tables wrapped in `overflow-x-auto`.
  - Form grids set to `grid-cols-1 md:grid-cols-2`.
  - Minimum touch target 44px for buttons on mobile.
  - Modals max height set with internal scrolling.

### Step 5: Interfunctionality & Sync Audit
- **Goal:** Verify end-to-end data flow between modules.
- **Sync Points:**
  - Customer profile modal accessible from POS, Girvi, Sales history, and Credit accounts.
  - Inventory items jump directly to Barcode Studio ingestion.
  - Global Search (Cmd+K) navigates correctly to customer profile, girvi contract, inventory item, sales receipt.

### Step 6: TypeScript Verification
- Run `npx tsc --noEmit` and confirm 0 errors.

---

## Progress Tracker
- [ ] Step 1: Metal Purity Combobox (Girvi, Inventory, Old Gold)
- [ ] Step 2: Full Reports Module & Cross-App Integrations
- [ ] Step 3: Barcode Studio Responsiveness Polish
- [ ] Step 4: Comprehensive Responsiveness Audit across all 12 Modules
- [ ] Step 5: Interfunctionality & Sync Verification
- [ ] Step 6: Full Build & Type Check
