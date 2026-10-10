# Production-Ready System Fixes, Business Modules & UI Architecture Plan

> **Role & Perspective:** Web App Specialist, UI/UX Specialist, and Jewellery Business System Specialist.  
> **Target Application:** Narayan Jewellers Management System (NJMS).  
> **Tech Stack:** Next.js 14 App Router, TypeScript, Prisma ORM with Hostinger MariaDB, Tailwind CSS, Lucide React, Secure Session Auth (`credentials: 'include'`).

---

## Executive Summary & System Blueprint

This master plan resolves all identified gaps across the core operational pillars of NJMS. In high-value retail jewellery and pawnbroking (*Girvi/Khandvi*), every item movement and financial transaction has direct regulatory, tax, and capital implications. 

```
                               ┌─────────────────────────────┐
                               │   RateSnapshot / DailyRate  │ (Today's Gold & Silver Rates)
                               └──────────────┬──────────────┘
                                              │
    ┌─────────────────────────────────────────┼────────────────────────────────────────┐
    ▼                                         ▼                                        ▼
┌───────────────────────┐         ┌───────────────────────┐                ┌───────────────────────┐
│   SKU Master Catalog  │         │   Inventory Item      │                │   Girvi Loan & Items  │
│ - Flexible Categories │ ──────> │ - In-Stock / Sold     │                │ - Vault Storage       │
│ - Purity Standard     │         │ - Full Editability    │                │ - Defect Tracking     │
└───────────────────────┘         │ - Live Rate Valuation │                │ - Partial Pmt/Release │
                                  └───────────┬───────────┘                └───────────┬───────────┘
                                              │                                        │
                         ┌────────────────────┴───────────────────┐                    │
                         │                                        │                    │
                         ▼                                        ▼                    ▼
             ┌───────────────────────┐                ┌─────────────────────────────────────────┐
             │   Sales & POS         │                │   Repledging to Financiers              │
             │ - Auto-deduct stock   │                │ - Partial item repledge                 │
             │ - Cashflow Payment In │                │ - Settle UI -> Return items to Vault    │
             └───────────┬───────────┘                └────────────────────┬────────────────────┘
                         │                                                 │
            ┌────────────┴────────────┐                                    ▼
            │                         │                       ┌────────────────────────┐
            ▼                         ▼                       │  StorageLocation       │
┌───────────────────────┐ ┌───────────────────────┐           │  (Vaults & Lockers)    │
│  Return & Replacement │ │  Old Metal Exchange   │           │ - Editable & Deletable │
│ - Restock / Scrap     │ │ - Live Valuation Card │           └───────────┬────────────┘
│ - Valuation diff cash │ │ - Net difference diff │                       │
└───────────┬───────────┘ └───────────┬───────────┘                       │
            │                         │                                   │
            └────────────┬────────────┘                                   │
                         │                                                │
                         └───────────────────────┬────────────────────────┘
                                                 ▼
                               ┌──────────────────────────────────┐
                               │     Customer 360 CRM Card        │
                               │  - Full KYC, Photo & Relations   │
                               │  - Unified History:              │
                               │    Sales | Girvi | Repledge | Cr │
                               └─────────────────┬────────────────┘
                                                 ▼
                               ┌──────────────────────────────────┐
                               │      Append-Only Audit & Cash    │
                               │  - writeAuditLog (ActivityLog)   │
                               │  - Payment Ledger (Cashbook)     │
                               │  - Alert System Live Sync        │
                               └─────────────────┬────────────────┘
```

---

## Detailed Implementation Modules

### Pillar 1: Custody & Storage Register (Editable & Deletable Vaults)
* **Problem**: Storage locations were rigid, lacking edit and delete capabilities, with no activity audit trail.
* **Architecture & Backend**:
  - Implement `PUT /api/v1/locations/[id]` to update name, type (`VAULT`, `SHOP_DRAWER`, `HOME`, `TRANSIT`), address, PIN requirements, and status.
  - Implement `DELETE /api/v1/locations/[id]` with safety guard: if active items or girvis are present, safely soft-delete (`active: false`) or prompt transfer, creating an explicit audit log via `writeAuditLog({ action: 'DELETE_STORAGE_LOCATION' })`.
* **UI/UX (Custody Page `/custody`)**:
  - Add **"Edit Vault"** and **"Delete / Deactivate"** action buttons on each location card.
  - Modal drawer with full validation, feedback toast, and live card refresh.

---

### Pillar 2: Customer 360 CRM Card & Unified History
* **Problem**: Clicking a customer did not show full details, photo, or complete transaction history (Sales, Girvi, Repledged, Credit).
* **Architecture & Backend**:
  - Enhance `GET /api/v1/customers/[id]` to return:
    - Complete KYC: full address, relations, secondary contacts, ID document numbers, and customer photo.
    - Full Sales history with item line details.
    - Full Girvi loan history with pledged ornaments, current status (`ACTIVE`, `PARTIAL`, `REDEEMED`), and linked repledges.
    - Repledge exposure: which ornaments belonging to this customer are currently repledged with external financiers, financier names, and return status.
    - Credit ledger balance and history.
* **UI/UX (Customers Page `/customers`)**:
  - Clicking any customer table row or mobile card opens the **Customer 360 Profile Card** (responsive sliding drawer on mobile, modal on desktop).
  - Tabs: **Overview & Photo**, **Sales History**, **Girvi & Pledged Ornaments**, **Repledge Tracking**, **Credit Ledger**.
  - Quick action buttons: *New Girvi*, *New Sale*, *Edit Profile*.

---

### Pillar 3: Real-Time Synchronized Alert System
* **Problem**: Alert system lacked user-triggered sync with database rules and cron checks.
* **Architecture & Backend**:
  - Create `POST /api/v1/alerts/sync`: Calls `evaluateThresholds()` across overdue Girvi loans, low inventory stock levels, upcoming repledge due dates, and negative cash drawers. Returns count of evaluated, raised, and auto-resolved alerts.
  - Enforce `credentials: 'include'` on all alert fetch and mutation calls (`/ack`, `/snooze`, `/resolve`).
* **UI/UX (`/alerts` & `AlertBell.tsx`)**:
  - Prominent **"Sync Alerts"** button with spinning refresh state and timestamp indicator (*"Synced just now"*).
  - Direct resolution actions with confirmation modals.

---

### Pillar 4: Girvi 360 Lifecycle: Details, Editability, Partial Payments, Partial Release & Defect Tracking
* **Problem**: Clicking a Girvi loan did not open an editable detail card; no partial payment or partial ornament release mechanism; no vault selector or defect tracking.
* **Architecture & Backend**:
  - Create `GET /api/v1/girvi/[id]` and `PUT /api/v1/girvi/[id]` to view and edit all loan parameters (principal, interest %, dates, customer KYC, ornament weights, purity, valuation, vault location, and defect types).
  - Create `POST /api/v1/girvi/[id]/part-payment`:
    - Accepts payment amount, mode (`CASH`, `UPI`, `BANK`), and breakdown (Principal vs Interest).
    - Reduces `principalPaise`, logs `Payment` entry (`FlowKind.GIRVI_PRINCIPAL_IN` or `GIRVI_INTEREST_IN`), updates status to `PARTIAL` if balance remains, and logs audit record.
  - Create `POST /api/v1/girvi/[id]/part-release`:
    - Allows releasing 1 or more specific ornaments (`GirviItem`) back to the customer upon partial repayment.
    - Marks items as released (`locationId: null`, or status flag), recalculates total loan weight, and creates a `CustodyMovement` entry.
  - Create `POST /api/v1/girvi/[id]/redeem`:
    - Full redemption: auto-calculates accrued interest, takes final settlement payment, marks loan `REDEEMED`, releases all ornaments, posts cash in.
  - Update `POST /api/v1/girvi` creation wizard:
    - Include Vault / Storage Location selector.
    - Include Defect Type selection per ornament (`None`, `Broken Clasp`, `Dent`, `Stone Missing`, `Scratches`, `Soldered Joint`, `Custom`).
* **UI/UX (Girvi Page `/girvi`)**:
  - Clicking any loan opens the **Girvi 360 Management Drawer**:
    - Complete customer & loan info with inline **"Edit Loan"** toggle.
    - Ornaments grid showing gross/net weights, purity, vault locker, and defect badges.
    - Action buttons: **"Settle & Redeem"**, **"Partial Payment"**, **"Partial Ornament Release"**.

---

### Pillar 5: Repledge Lifecycle: Settlement UI, Partial Repledge & Financier Analytics
* **Problem**: No UI to settle repledge loans; no support for partial repledging of specific girvi items; duplicate active repledges permitted.
* **Architecture & Backend**:
  - Prevent duplicate repledge: in `/api/v1/repledge/form-search`, exclude any Girvi loan that is actively repledged (`loan.status === 'ACTIVE'` and `returnedOn === null`).
  - Support Partial Repledging: allow selecting specific ornament item IDs from a Girvi loan, storing `itemIds` in `RepledgeLink`.
  - Connect Settlement API: Wire `POST /api/v1/repledge/[id]/settle` to the frontend.
* **UI/UX (Repledge Page `/repledge`)**:
  - Add **"Settle Contract"** modal: inputs for principal paid, interest paid, payment mode, and return-to-vault selector.
  - Show analytics: Gross vs Net weight, Shop Girvi Rate (%/mo) vs Financier Rate (%/mo), Rupee Spread, and Own Capital committed.
  - In Repledge Wizard, add item-level checkboxes for partial repledging.

---

### Pillar 6: Sales History Module & Return / Replacement Engine
* **Problem**: Missing dedicated Sales History page; no system for return or replacement of sold jewellery.
* **Architecture & Backend**:
  - Create `GET /api/v1/sales/history` with search, customer filter, date range, and pagination.
  - Create `POST /api/v1/sales/[id]/return`:
    - Return sold jewellery item back to inventory (marked `RETURNED` or `IN_STOCK`).
    - Issues refund (cash, UPI, or customer credit balance), recording `Payment` entry with `FlowKind.REFUND` (`Direction.OUT`).
    - Updates sale status to `RETURNED` or `PARTIAL_RETURN`.
  - Create `POST /api/v1/sales/[id]/replace`:
    - Exchange workflow: Customer returns purchased item and selects a new inventory item.
    - Calculates valuation difference:
      - If replacement item costs more: customer pays difference (`SALE_RECEIPT` in `Payment`).
      - If replacement item costs less: refund issued to customer (`REFUND` in `Payment`).
    - Marks old item as `RETURNED`, marks new item as `SOLD`, and logs audit trail.
* **UI/UX**:
  - Build `src/app/(app)/sales/page.tsx`: Full Sales History table with invoice search, date filters, payment badges, item details.
  - Action buttons: **"Return Item"** and **"Exchange / Replace Item"** modals with instant difference calculation.

---

### Pillar 7: Old Gold & Silver Purchase, Exchange & Live Suggestion Card Engine
* **Problem**: Need an integrated system for outright old gold/silver purchase and trade-in against new jewellery, calculating valuation via exact pure metal weight formula with a live suggestion card.
* **Valuation Formula**:
  $$\text{Net Weight (g)} = \text{Gross Weight (g)} - \text{Stone/Dirt Deduction (g)}$$
  $$\text{Actual Grams of Metal (Fine Weight)} = \text{Net Weight} \times \left(\frac{\text{Purity Percentage}}{100}\right)$$
  $$\text{Valuation Amount (₹)} = \text{Actual Grams of Metal} \times \text{Today's Spot Rate (₹/g)}$$
* **Workflows Supported**:
  1. **Outright Purchase**:
     - Customer sells old gold/silver to shop.
     - Creates Old Gold Voucher, records cash/bank payout (`Direction: OUT`, `FlowKind: OLD_GOLD_PAYOUT`).
     - Adds metal into shop raw/melting inventory.
  2. **Exchange / Trade-in Against New Jewellery (in POS)**:
     - New Jewellery Selling Price: $P_{\text{new}}$ (e.g. ₹85,000)
     - Old Metal Valuation Credit: $V_{\text{old}}$ (e.g. ₹52,000)
     - Net Difference: $\Delta = P_{\text{new}} - V_{\text{old}}$
       - If $\Delta > 0$ (Customer owes money): Customer pays difference via Cash/UPI/Bank (`SALE_RECEIPT` cash-in).
       - If $\Delta < 0$ (Shop owes customer): Shop pays difference to customer (`OLD_GOLD_PAYOUT` cash-out) or credits customer balance.
     - Populates `oldGoldAdjPaise` in `Sale` record.
* **UI/UX (Live Suggestion Card in POS & Old Gold Module)**:
  - Suggestion Card displays:
    - Auto-loaded Today's 24K Gold & 999 Silver Rates.
    - Quick purity presets: `24K (99.9%)`, `22K (91.6%)`, `20K (83.3%)`, `18K (75.0%)`, `14K (58.5%)`, `Silver 999`, `Silver 925`, `Silver 800`, plus custom %.
    - Live breakdown: Gross Weight -> Stone Deduction -> Net Weight -> **Actual Pure Metal (g)** -> **Calculated Value (₹)**.
    - Net Difference summary card with instant payment reconciliation.

---

### Pillar 8: Inventory Module & Dashboard: Full Editability, Live Rates & Dynamic SKU Master
* **Problem**: Inventory items were not editable; inventory dashboard did not auto-inject today's metal rates; SKU Master had rigid category dropdowns and omitted purity displays.
* **Architecture & Backend**:
  - Create `src/app/api/v1/inventory/[id]/route.ts`:
    - `GET`: Return all item properties, cost basis, live valuation, and tag history.
    - `PUT`: Update name, metal, purity, category, gross/stone/net weights, making charges, HUID, photo, and status. Writes audit log.
    - `DELETE`: Delete or archive item with audit log.
  - Update `src/app/api/v1/inventory/sku/route.ts` & UI:
    - Make category non-rigid: hybrid select + custom free text input.
    - Include purity standard (`91.6% (22K)`, `75% (18K)`, `99.9% (24K)`, `92.5% Silver`).
  - Update Inventory Dashboard (`/inventory/dashboard`) & Add Item (`/inventory/new`):
    - Automatically load and display today's metal rates (24K, 22K, Silver) from `GET /api/v1/rates`.
    - Auto-compute live metal market value based on weight × today's rate.
    - Selecting an SKU auto-populates and visually displays the purity standard badge.
* **UI/UX (`/inventory` & `/inventory/dashboard`)**:
  - Add **"Edit Item"** modal in inventory table and detail card.
  - Status toggle: In-Stock vs Sold items.
  - Modern analytics dashboard with real-time bullion spot rates.

---

### Pillar 9: Universal Audit Logging, Daily Cash Flow & Responsive UI
* **Problem**: No UI navigation for `/audit-log`; daily cash flow did not capture all transaction sources with timestamps; layout clipping on mobile/tablet.
* **Architecture & Backend**:
  - In `src/app/api/v1/sales/route.ts`: Create `Payment` record inside `db.$transaction` on every sale, and update `InventoryItem.status = 'SOLD'`.
  - In `src/app/api/v1/cashbook/route.ts`: Format timestamps (`hh:mm A`), source badges (`SALE`, `GIRVI`, `REPLEDGE`, `CREDIT`, `OLD_GOLD`), reference numbers, and customer/financier names.
  - In `src/components/shell/AppShell.tsx`: Add **Audit Log** (`/audit-log`) and **Sales History** (`/sales`) to desktop and mobile navigation.
  - Responsive styles: ensure `pb-28 lg:pb-8` bottom padding for mobile navigation, horizontal scrolling for data tables, and touch-friendly buttons (`min-h-[44px]`).

---

## Phased Execution Roadmap

```
Phase 1: Foundation & Navigation (AppShell, Navigation, Audit Log API & UI)
Phase 2: Cash Flow Universal Integration & Sales Stock Auto-Deduction
Phase 3: Custody & Vault Register (Edit/Delete API & UI with Audit Logs)
Phase 4: Customer 360 CRM Card & Unified Multi-Module History (Sales, Girvi, Repledged, Credit)
Phase 5: Girvi 360: Full Edit, Partial Payment, Part Release, Defect Tracking & Vault Selector
Phase 6: Repledge Completion: Partial Repledge, Settlement UI & Analytics
Phase 7: Sales History Module & Return / Replacement Engine
Phase 8: Old Gold/Silver Purchase & Exchange Engine + Valuation Suggestion Card
Phase 9: Inventory Module & Dashboard: Full Editability, Live Rates & Dynamic SKU Master
Phase 10: Synchronized Alert System & Threshold Engine
Phase 11: End-to-End Build, Typecheck, and Hostinger Deployment
```
