# Master System Plan: POS, Delivery Queue, Girvi, Repledge, Customer 360, Wholesaler Approval (Doc 13) & Vendor Credit Purchases (Bhaav Settlement)

## 1. Problem Statement & Architecture Goals
The system requires deep integration across 9 major operational domains:
1. **POS Sold Item Filtering**: Sold items must immediately disappear from inventory and cannot be scanned/selected in POS.
2. **Dashboard Delivery Queue & Reminders**: Live queue for jewellery transit (vault to shop counter), customer handover tracking, and overdue girvi/repledge alerts.
3. **Girvi & Repledge Handover Lifecycle**: Track whether redeemed/settled items are in transit from vault (with ETA) or handed over to the customer with confirmation.
4. **Girvi Multi-Ornaments & Defect Assessment**: Support multiple ornaments per loan with defect/condition states (`BROKEN`, `MISSING_STONE`, etc.) and pre-filled suggestion chips.
5. **Smart Customer Omnisearch & Auto-Enrollment**: Identify customers by Name, Phone, Father's Name, or ID across Girvi, POS, and Old Gold modules; auto-fill existing records or seamlessly register new customers into CRM.
6. **Unified Customer 360 History**: Full chronological ledger of Sales, Girvi, Repledges, Old Gold trade-ins, Exchanges, and Cashbook payments.
7. **Repledge Guardrails & Customer Visibility**: Prevent re-pledging currently pledged items, allow re-pledging once settled and received back in shop custody, and display customer + ornament data in the Repledge module.
8. **Wholesaler Approval Stock (Doc 13 — Memo-In & Touch Settlement)**:
   - Receiving goods on approval without putting them in shop books (`ownership: MEMO_IN`).
   - POS seamless selling of approval stock: normal customer retail price (tested purity) while auto-converting wholesaler payable at touch rate (`touchPpt`).
   - Versioned Touch Rate schedules per wholesaler (Gold & Silver bands).
   - Settlement Queue for bulk-editing purchase metal rates for queued memo sales.
   - Return-due alerts and handover tracking.
9. **Vendor Inventory Credit Purchase & Bulk Floating Rate Settlement (Bhaav Kaatna & Metal Settlement)**:
   - Buying jewellery on promise of after-payment, cash, or pure metal return.
   - Today's metal rate and future settlement rate differ (creating positive/negative cost variance).
   - Labour charges (karigari) can also be adjusted/re-negotiated upon final settlement.
   - Items enter inventory immediately (`IN_STOCK`) for sale, but sit in the **Settlement Queue** as `UNSETTLED_RATE (Bhaav Pending)`.
   - Dedicated Bulk Correction & Settlement Tool in `/settlement-queue` allowing one-click update of settlement metal rate, labour charges, and payment mode (Cash/Bank, Metal, or Split).

---

## 2. Phased Implementation Plan

### Phase 1: POS Sold-Item Elimination & Strict Stock Validation
- **Goal**: Prevent sold items from ever appearing or being re-sold in POS.
- **Changes**:
  - `src/app/(app)/pos/page.tsx`:
    - Update query to `/api/v1/inventory?search=${encodeURIComponent(barcodeSearch)}&status=IN_STOCK`.
    - Add strict client-side check `res.data.filter(it => it.status === 'IN_STOCK')`.
    - If the searched barcode exists in DB but is `SOLD`, display a warning toast: *"Item #TAG is already SOLD on [Date] and is no longer available in inventory."*
  - `src/app/api/v1/inventory/route.ts`: Ensure `status=IN_STOCK` filter strictly excludes `SOLD`, `DAMAGED`, `MELTED`, `RETURNED_TO_VENDOR`.

### Phase 2: Customer Omni-Selector Component & Instant Registration
- **Goal**: Universal customer search by Name, Phone, Father's Name, or ID with auto-fill and inline creation.
- **Changes**:
  - Create `src/components/customers/CustomerOmniSelector.tsx`:
    - Live debounced search querying `/api/v1/customers?search=...`.
    - Dropdown showing matching customer cards: Name, Relation (S/O, W/O), Phone, City, ID, and active loans tag.
    - Click to select & auto-fill customer details with a green *"Verified Customer"* badge.
    - "+ New Customer" inline form: captures Name, Phone, Relation Name & Type, Address, City, ID number, and creates the record in DB.
  - Integrate `CustomerOmniSelector` into:
    - `src/app/(app)/girvi/page.tsx` (New Girvi loan)
    - `src/app/(app)/pos/page.tsx` (POS Billing)
    - `src/app/(app)/old-gold/page.tsx` (Old Gold purchase voucher)
  - Update `src/app/api/v1/old-gold/route.ts`: Associate customer ID with old gold purchase vouchers and write to `Customer` table if new.

### Phase 3: Girvi Multi-Ornaments & Defect Assessment Engine
- **Goal**: Multi-item row builder with condition assessment and clickable defect suggestions.
- **Changes**:
  - `src/app/(app)/girvi/page.tsx`:
    - Multi-ornament table: add/remove rows dynamically.
    - Columns: Item Type, Metal, Purity, Gross Wt (g), Stone Wt (g), Net Wt (g), Valuation (₹), Condition (`INTACT`, `BROKEN`, `MISSING_STONE`, `BENT`, `DAMAGED`), Defect Assessment notes.
    - Clickable suggestion chips:
      - `[Purity tested on touchstone]`
      - `[Hook / lock loose]`
      - `[Stone weight deducted]`
      - `[Heavy solder / tanka]`
      - `[Joint broken]`
      - `[No Hallmark]`
  - `src/components/girvi/Girvi360Modal.tsx`:
    - Display individual condition badges and defect assessment notes for each ornament.

### Phase 4: Delivery Queue, Vault Retrieval ETA & Handover Tracking
- **Goal**: Real-time tracking of ornaments moving from vault/financier to shop counter, ETA, and customer handover.
- **Changes**:
  - `src/app/api/v1/girvi/delivery-queue/route.ts`:
    - Support queueing items on redemption or settlement.
    - Provide estimated retrieval time based on vault location (`SHOP_DRAWER` = Immediate, `VAULT` = ~30 mins, `REPLEDGED` = 24-48 hrs).
    - Add handover endpoint: records `deliveredAt`, `deliveredById`, `collectorName`, and marks ornaments as delivered.
  - `src/components/dashboard/DeliveryQueueWidget.tsx`:
    - Render prominently in `src/app/(app)/dashboard/page.tsx`.
    - Two active tabs:
      1. **Ready for Customer Handover** (Shop counter): One-click *"Confirm Handover to Customer"*.
      2. **Vault / Financier Transit**: Shows location, ETA, and *"Confirm Received at Shop"*.
  - `src/app/(app)/girvi/page.tsx` & `Girvi360Modal.tsx`:
    - If loan is redeemed but ornaments are in vault transit: display amber badge: `REDEEMED - IN TRANSIT (ETA ~30 mins)`.
    - Once received at shop: emerald badge: `READY FOR HANDOVER`.
    - Once delivered: dark badge: `HANDED OVER on [Date/Time]`.

### Phase 5: Repledge Lifecycle Guardrails & Customer/Jewellery Visibility
- **Goal**: Guard against duplicate re-pledging while allowing re-pledging after settlement; show full customer & ornament details in Repledge UI.
- **Changes**:
  - `src/app/api/v1/repledge/form-search/route.ts`:
    - Exclude loans in `ACTIVE` or `PLANNED` repledge contracts.
    - If previously repledged but contract is `CLOSED` and ornaments returned to shop, mark as `Eligible for Re-pledge`.
  - `src/app/api/v1/repledge/route.ts` & `src/app/(app)/repledge/page.tsx`:
    - Display Customer Name, Phone, Father's Name, and full list of ornaments with gross/net weights and valuation in the Repledge table and contract view.
    - Include settlement workflow with transit status back to shop vault.

### Phase 6: Unified Customer 360 History Timeline
- **Goal**: Complete master ledger of all customer touchpoints.
- **Changes**:
  - `src/app/api/v1/customers/[id]/route.ts`:
    - Aggregate: Sales, Girvi Loans, Repledges of their items, Old Gold vouchers, Exchange transactions, and Cashbook payments.
  - `src/components/customers/Customer360Modal.tsx`:
    - Unified Chronological Activity Timeline tab.
    - Dedicated tabs for Sales, Girvi, Old Gold Trade-ins, and Payments.

### Phase 7: Wholesaler Approval Stock (Doc 13 — Memo-In & Touch Settlement)
- **Goal**: Full integration of wholesaler approval stock lifecycle from receiving to POS auto-conversion and floating settlement.
- **Changes**:
  - **AppShell Navigation**: Add `/memo-in` ("Approval Stock / Memo In"), `/touch-schedules` ("Touch Schedules"), and `/settlement-queue` ("Settlement Queue") under Inventory/Vendors navigation menu.
  - **POS Auto-Conversion (§54)**:
    - In `src/app/(app)/pos/page.tsx` and `src/app/api/v1/sales/route.ts`:
    - When scanning an item with `ownership === 'MEMO_IN'`:
      - Shows visual indicator: *"Wholesaler Memo Stock (Approval Piece)"*.
      - Upon sale completion, atomically execute conversion transaction:
        - `InventoryItem.ownership` flips to `OWNED` and status to `SOLD`.
        - `MemoInLine` marked `COMMITTED` / `SOLD`.
        - If `RateMode === LOCKED_AT_SALE`: calculate wholesaler payable at stored `touchPpt` × today's spot rate and post to vendor ledger.
        - If `RateMode === QUEUED_FLOATING`: route to `SettlementQueue` so rate can be applied when settled.
  - **Touch Schedules UI & API (§53)**:
    - In `/touch-schedules`: list and edit versioned schedules per wholesaler (e.g. 18K gold at 83% touch, silver 75-80% band) with effective-from dates.
  - **Approval Reminders (§55.1)**:
    - Add alerts for `MEMO_RETURN_DUE` (due within 3 days) and `MEMO_OVERDUE` to Dashboard and Alerts page.

### Phase 8: Vendor Credit Purchases & Bulk Floating Rate Settlement (Bhaav Kaatna)
- **Goal**: Handle stock bought on credit promise, pure metal payment, or deferred metal rate with bulk correction.
- **Changes**:
  - **In `/inventory/new` (Item Inward Entry)**:
    - Add "Vendor Purchase Terms":
      1. `PAID_IMMEDIATE` (Cash/Bank on Purchase Date — today's rate locked).
      2. `PAY_IN_METAL` (Metal ledger debit — fine grams credited to vendor account).
      3. `ON_CREDIT_FLOATING_RATE` (Promise of After-Payment / Bhaav Pending).
    - Store in `InventoryItem.attributesJson`:
      ```json
      {
        "purchaseTerms": "ON_CREDIT_FLOATING_RATE",
        "vendorName": "Suresh Karigar",
        "provisionalRatePerGram": 7200,
        "initialLabourPaise": 50000,
        "settlementStatus": "UNSETTLED"
      }
      ```
    - Items immediately available as `IN_STOCK` in inventory with badge: `BHAAV PENDING`.
  - **In `/settlement-queue` (Bulk Settlement Screen)**:
    - New Tab: **"Vendor Credit Purchases (Bhaav Kaatna)"**.
    - Lists all unsettled inventory pieces with Vendor, Tag No, Item Name, Net Wt (g), Purity, Initial Labour, and Provisional Rate.
    - **Bulk Settlement Modal**:
      - Select multiple items from vendor.
      - Input **Today's Confirmed Settlement Rate (₹/g)**.
      - Input **Final Labour Adjustment (₹ or ₹/g)** (optional, if modified).
      - Select **Settlement Mode**:
        - `CASH / BANK`: Posts single `VENDOR_PAYMENT` to Cashbook ledger.
        - `METAL_PAYMENT`: Debits vendor's pure metal balance.
        - `PARTIAL_CASH_PARTIAL_METAL`.
      - Click **[Bulk Correct & Settle]**:
        - Atomically recalculates `costPaise` on all selected items in `InventoryItem`.
        - Updates `attributesJson.settlementStatus = 'SETTLED'`.
        - Posts payment/metal ledger entries.
        - Writes comprehensive audit log.

### Phase 9: Verification, TypeScript Check & Production Build
- Run `npx tsc --noEmit` to verify 0 errors.
- Run `npm run build` to verify Next.js production compilation.
- Push to GitHub `main` with the user's PAT for Hostinger auto-deploy.
