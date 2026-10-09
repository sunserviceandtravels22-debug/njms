# 01 · Product Requirements Document (PRD)
**Product:** Narayan Jewellers Management System (NJMS)
**Version:** 1.1 · **Date:** 01 Oct 2026 · **Owner:** Shop Owner
**Companion docs:** `02_DESIGN.md` (look and behaviour) · `03_TECH.md` (how it is built) · `04_ANTIGRAVITY_PROMPTS.md` (how to build it)
**Appendices (earlier blueprints, keep in `/docs/appendix/`):** A = Essential Functionality Blueprint · B = Reports Module Blueprint

> **Precedence rule (keep the three docs in sync):** PRD decides *what* and *why*. DESIGN decides *how it looks and behaves*. TECH decides *how it is built and how data is stored*. If two documents disagree, stop, ask the owner, then update **all** affected documents before changing code.
>
> **Supersedes:** the stack in Appendix A (Next.js + Supabase/PostgreSQL). The stack is now **Next.js on Hostinger Node.js hosting with MySQL** (see TECH). GST note in Appendix A stands: jewellery sales are 3% on total value including making; 5% applies to job-work labour (confirm with your CA).

---

## 1. Vision and problem

The shop currently runs on scattered, unorganised records. Sales, udhaar (credit) and girvi (mortgage) are tracked separately, so nobody can see one customer's whole relationship with the shop, and labels/barcodes are made in a separate tool.

**Vision:** one mobile-first web app where a customer is recorded once, and every sale, credit, girvi and barcode label connects back to that person, with correct interest and stock at all times.

### Goals
| # | Goal | How we will know |
|---|---|---|
| G1 | One customer record links sales, credit and girvi | Customer 360° shows all three on one screen |
| G2 | Fast, error-free billing by barcode | A scan-to-paid sale takes under 30 seconds |
| G3 | Correct interest, always | All interest results match hand-verified tests (TECH §8) |
| G4 | No lost work | A page refresh or crash never loses a half-filled form |
| G5 | Barcode generation inside the same system | Labels can be printed directly from inventory |
| G6 | The owner can see the business from a phone | Dashboard and reports work well at 360 px width |
| G7 | Trustworthy books | Reports reconcile with ledgers (Appendix B §8) |

### Non-goals (version 1)
Multi-branch, online store or customer-facing portal, automated WhatsApp Business API sending (click-to-chat links only), full accounting or statutory GST filing (we produce a GST summary for the CA), payroll, karigar/supplier ledgers and gold savings schemes (Phase 2).

---

## 2. Users and roles

| Role | Who | Main jobs |
|---|---|---|
| **Owner** | Shop owner | Everything: rates, settings, users, reports, overrides, write-offs, exports |
| **Manager** | Trusted senior staff | Sales, girvi release, discounts with PIN, most reports (no cost/profit unless allowed) |
| **Staff / Cashier** | Counter staff | Sales, scanning, take payments, create customers, create girvi (cannot release) |
| **Accountant** | CA / bookkeeper | Read-only reports, GST summary, exports as permitted |

Customers are **records**, not users, in version 1.

Devices: owner on phone; counter on a PC or tablet with a USB barcode scanner; staff sometimes on phones (camera scanning, taking photos of items and ID).

---

## 3. Product principles
1. **Mobile-first.** Every screen is designed at 360 px first, then enhanced for tablet and desktop.
2. **One customer, everywhere.** Never ask for the same person's details twice.
3. **Money and stock are ledgers.** Nothing is silently edited; mistakes are corrected by reversal entries with a reason.
4. **Never lose work.** Forms autosave; submits are safe to retry.
5. **Fast at the counter.** Keyboard/scanner first on desktop, thumb-first on phone.
6. **Rules are settings.** Interest rates, GST, LTV limits, notice periods and label sizes are configurable, never hard-coded.

---

## 4. Scope map

```
                      ┌──────────────── CUSTOMER MASTER ────────────────┐
                      │                                                  │
  Barcode Studio ──►  INVENTORY ──► SALES / POS ──► CREDIT (udhaar)   GIRVI (mortgage)
  (labels)            (SKU+barcode)  (scan, invoice)   (linked to sale)   (linked to customer)
                                          │                  │                  │
                                          └──────────► REPORTS & DASHBOARD ◄────┘
  Platform: auth · roles · settings · audit · drafts/offline · search · backup
```

**Release plan** (milestone codes are shared by all documents; see §10)
- **Release 1 (go-live):** M0–M7 plus basic dashboard and core reports. Covers customers, inventory, Barcode Studio, POS, credit, girvi.
- **Release 2:** M8–M9 complete reports set, Customer 360° enhancements, offline queue, scheduled reports.
- **Release 3 (Phase 2 ideas):** custom orders/advance booking, savings schemes, karigar ledger, WhatsApp Business API.

---

## 5. Functional requirements

Priority: **P0** = required for go-live · **P1** = soon after · **P2** = later. Every requirement has an ID used in DESIGN, TECH, code comments and tests.

### 5.1 Platform (PLT)
| ID | Requirement | Pri |
|---|---|---|
| FR-PLT-01 | **Mobile-first, responsive UI on every screen** from 360 px to wide desktop; no horizontal page scroll; touch targets ≥ 44 px | P0 |
| FR-PLT-02 | Username/password login, hashed passwords, idle session timeout, Owner 2FA (TOTP) | P0 |
| FR-PLT-03 | Role permissions (Owner/Manager/Staff/Accountant) enforced on the server; Owner PIN for sensitive actions | P0 |
| FR-PLT-04 | Settings: shop profile, GST rates & master GST ON/OFF toggle, default interest per metal, LTV limit, backdate window, discount limits, label defaults, reminder templates | P0 |
| FR-PLT-04a| **Configurable GST Toggle**: master switch to turn GST calculation ON/OFF shop-wide; when OFF, GST is 0% and invoices print as Non-GST Bill of Supply | P0 |
| FR-PLT-05 | Immutable audit log of every create/update/reverse/export with before-and-after values | P0 |
| FR-PLT-06 | Global search (phone incl. last 4 digits, name in Hindi/English, father's name, SKU, barcode, invoice/girvi/credit number) | P0 |
| FR-PLT-07 | Bilingual UI: English and Hindi, incl. printed documents and reminder templates | P1 |
| FR-PLT-08 | **Draft autosave and restore** for every multi-field form (survives refresh, crash, tab close); resume/discard banner | P0 |
| FR-PLT-09 | Installable PWA; offline app shell; offline sale queue that syncs in order | P1 |
| FR-PLT-10 | Daily automatic backup, on-demand backup, one-click Excel export (Owner), restore procedure documented | P0 |
| FR-PLT-11 | Follow-ups screen: today's overdue and due items with one-tap call/WhatsApp | P1 |
| FR-PLT-12 | Idempotent submits: double-tap or retry can never create two invoices, credits or girvis | P0 |
| FR-PLT-13 | Data import wizard for the existing system's data, with preview, validation and rollback by batch | P1 |
| FR-PLT-14 | **WebP Conversion & File Naming Algorithm:** Convert all uploaded photos to high-quality WebP format (`image/webp`); save with deterministic naming format `{KIND}_{YYYYMMDD}_{SHA256_PREFIX12}_{CUID}.webp` | P0 |

### 5.2 Customers (CUS)
| ID | Requirement | Pri |
|---|---|---|
| FR-CUS-01 | Customer master: name, relation type (father/mother/husband/self) and relation name, phone (unique), alternate phone, address, reference name/phone, ID proof type/number, photo, notes | P0 |
| FR-CUS-02 | Duplicate warning on phone, and on similar name + relation name | P0 |
| FR-CUS-02b| **Visual Identity Preview:** Render uploaded customer photos side-by-side in duplicate warning sheets to resolve identity visually | P0 |
| FR-CUS-03 | Quick-add customer from inside any flow (sale, credit, girvi) without leaving the form | P0 |
| FR-CUS-04 | Tags (Regular, VIP, Watchlist, Blocked), credit limit, internal notes | P1 |
| FR-CUS-05 | Capture ID proof and customer photo in-app (WebP format, stored in `UPLOAD_DIR`) | P0 |
| FR-CUS-06 | **Customer 360°**: profile, timeline, purchases, credit, girvi, old gold, payments, documents, notes | P0 |
| FR-CUS-07 | **Exposure banner** on every customer-related screen: credit due + girvi due, overdue flag | P0 |
| FR-CUS-08 | Combined statement PDF for a date range | P1 |
| FR-CUS-09 | Reference/guarantor can link to another customer | P2 |
| FR-CUS-10 | Secondary contact (name, phone, relation) stored on every customer record | P0 |
| FR-CUS-11 | Hindi name (`nameHindi`) stored for bilingual search and display in receipts | P0 |
| FR-CUS-12 | `searchKey` — normalised phonetic key computed at save for instant prefix search | P0 |
| FR-CUS-13 | Identity Requirement Profile: configurable KYC rules per module and amount threshold | P1 |
| FR-CUS-14 | Duplicate Decision audit: staff decision (merge / keep-both) stored per duplicate resolution event | P0 |

### 5.3 Inventory and SKU (INV)
| ID | Requirement | Pri |
|---|---|---|
| FR-INV-01 | SKU master (metal, category, purity) and **atomic, duplicate-free SKU generation**, format `G-RNG-22-0001` (Metal-Category-Purity-Serial) | P0 |
| FR-INV-02 | Item record: name, category, metal, purity, gross/net/stone weight, making type and value, cost, listed price, HUID, photo, location | P0 |
| FR-INV-03 | Status lifecycle (in_stock, on_hold, sold, with_karigar, returned, damaged); every change is a stock-movement record | P0 |
| FR-INV-04 | List with search and filters by metal, category, purity, status, weight range, unlabelled | P0 |
| FR-INV-05 | Bulk add via CSV/Excel and "clone item" | P1 |
| FR-INV-06 | Stock audit mode: scan shelf items, report missing / extra / unknown | P1 |
| FR-INV-07 | Item photos (camera capture) | P1 |
| FR-INV-08 | Alerts: low stock per category, ageing stock | P2 |
| FR-INV-09 | Items pledged in girvi never appear as sellable stock | P0 |

### 5.4 Barcode Studio (BAR) — the existing barcode generator, integrated
| ID | Requirement | Pri |
|---|---|---|
| FR-BAR-01 | **Keep every capability of the existing generator:** 17 symbologies (EAN, UPC, Code 128, Code 39, ITF, QR, etc.), manual / batch-paste / CSV-Excel file / sequential-range input, size in px/in/cm/mm, DPI, colours, readable text, page sizes A3–Tabloid and custom, margins and gutter, Avery-style grid templates, grid-fit analysis with suggestions, live placement preview, validity filter and search, PNG-ZIP and PDF export | P0 |
| FR-BAR-02 | **Generate labels straight from inventory:** select items, use a filter, or use the "unlabelled items" queue | P0 |
| FR-BAR-03 | **Jewellery tag designer:** choose which fields print with the barcode (SKU text, shop name, net weight, purity, price, HUID) and their position | P0 |
| FR-BAR-04 | Saved label templates (size, grid, fields, symbology) per printer/roll; one default | P0 |
| FR-BAR-05 | Output modes: A4/sheet PDF, single-label-per-page PDF for thermal rolls, browser print at exact size, PNG ZIP | P0 |
| FR-BAR-06 | Barcode value rule: default Code 128 of the item's SKU; validation includes check-digit and character-set checks with clear errors (no silent blanks) | P0 |
| FR-BAR-07 | Ad-hoc mode: generate barcodes not tied to inventory (as the original tool did) | P0 |
| FR-BAR-08 | Print log with reprint; item gets a "label printed" timestamp | P1 |
| FR-BAR-09 | Test-print and calibration sheet; **scan test** field to confirm a printed tag reads correctly | P1 |
| FR-BAR-10 | 1,000-label batch completes without freezing the UI (progress shown, cancel available) on a mid-range phone | P0 |
| FR-BAR-11 | Fully usable on a phone (step-by-step flow, PDF share/download) | P0 |
| FR-BAR-12 | Generator state (inputs, settings) survives a refresh | P0 |

### 5.5 Sales and POS (POS)
| ID | Requirement | Pri |
|---|---|---|
| FR-POS-01 | Scan-first cart: a USB scanner types the code and Enter adds the item; input always focused; scan-speed detection separates scans from typing | P0 |
| FR-POS-02 | **Camera barcode scanning** on phones/tablets | P0 |
| FR-POS-03 | Manual add by SKU/name search when a tag is damaged | P0 |
| FR-POS-04 | Loud errors: unknown code, already sold, on hold, duplicate in cart, item on girvi | P0 |
| FR-POS-05 | Pricing engine: net weight × day rate + making + stone − discount + (GST if enabled), with round-off (formula in TECH §8.2) | P0 |
| FR-POS-06 | Daily rates must be set before billing (Owner can override); rate used is locked on each invoice | P0 |
| FR-POS-07 | Discount limits by role; over-limit needs Owner/Manager PIN | P0 |
| FR-POS-08 | Split payments (cash + UPI + card + credit) with UPI reference | P0 |
| FR-POS-09 | Part or full credit creates a linked Credit record automatically | P0 |
| FR-POS-10 | Hold bill: park a sale and serve another customer; drafts tray | P0 |
| FR-POS-11 | Old gold/silver exchange with tested purity, deduction and value adjusted on the bill | P1 |
| FR-POS-12 | Invoice as A4 and 80 mm receipt; share as PDF / WhatsApp; amount in words; Hindi/English | P0 |
| FR-POS-13 | Return/exchange of a sold item through an authorised flow with reason | P1 |
| FR-POS-14 | Day close: system cash vs counted cash, difference recorded, day locked | P1 |

### 5.6 Credit / udhaar (CRD)
| ID | Requirement | Pri |
|---|---|---|
| FR-CRD-01 | Create credit from a sale or manually; **linked sale and item details** one tap away | P0 |
| FR-CRD-02 | Fields: customer, principal, start date, **promised date**, grace days, interest yes/no, simple/compound, rate and period, **penal rate after the due date** | P0 |
| FR-CRD-03 | Payments ledger; allocation order (interest first, then principal) is a setting | P0 |
| FR-CRD-04 | Status auto-computed: open, partial, overdue, closed | P0 |
| FR-CRD-05 | Promise-to-pay log (calls/visits with new promised date, original preserved) | P1 |
| FR-CRD-06 | Reminders by WhatsApp click-to-chat / SMS link with editable Hindi/English templates | P1 |
| FR-CRD-07 | Ageing buckets and overdue list | P1 |
| FR-CRD-08 | Write-off and settlement (Owner only, with reason) | P1 |
| FR-CRD-09 | Credit statement PDF per customer | P1 |

### 5.7 Girvi / mortgage (GIR)
| ID | Requirement | Pri |
|---|---|---|
| FR-GIR-01 | Entry wizard: customer → metal → **multiple articles** → loan → interest terms → review → save and print slip | P0 |
| FR-GIR-02 | Per article: type, name, quantity, gross/net weight, purity, estimated value, **manual defect/condition notes** (e.g. "Anklet: 2 ghungroo missing"), up to 4 photos | P0 |
| FR-GIR-03 | Default rate per metal (gold, silver) from settings, **editable per entry**; changing defaults never alters old girvis | P0 |
| FR-GIR-04 | Simple or compound; compounding monthly / every 6 months / yearly; partial-period rule (pro-rata by days, full month, or half-month after 15 days); minimum tenure | P0 |
| FR-GIR-05 | **Live tenure** ("1 yr 3 mo 12 d") from the pledge date, with principal, interest accrued and total payable today | P0 |
| FR-GIR-06 | **Redeem calculator** for any chosen date with a line-by-line breakdown | P0 |
| FR-GIR-07 | Payments: interest-only, part principal; interest-first allocation (setting) | P0 |
| FR-GIR-08 | Top-up (additional loan on same articles) | P1 |
| FR-GIR-09 | Renewal / re-pledge linked to the old girvi | P1 |
| FR-GIR-10 | Part release of selected articles, recomputing the loan | P1 |
| FR-GIR-11 | Full redemption with release receipt; weight-at-pledge vs weight-at-return check | P0 |
| FR-GIR-12 | **LTV guard:** live loan ÷ estimated value; warn above limit; Owner PIN to exceed | P0 |
| FR-GIR-13 | Printable girvi slip (terms, articles with defects, signature/thumb space, witness) | P0 |
| FR-GIR-14 | Vault register: packet/locker number per girvi; verification audit | P1 |
| FR-GIR-15 | Overdue and notice workflow (steps and periods are settings; verify legal periods for your state) | P1 |
| FR-GIR-16 | **Customer's credit history and past purchases are visible on every girvi screen** for that person | P0 |
| FR-GIR-17 | Girvi form drafts autosave step by step | P0 |

### 5.8 Reports and dashboard (RPT) — detailed in Appendix B
| ID | Requirement | Pri |
|---|---|---|
| FR-RPT-01 | One report engine with a typed **metric registry**; metrics are selectable, groupable, filterable, comparable | P0 |
| FR-RPT-02 | Report Builder UI: metric picker, filters, group by, period comparison, table/chart/pivot/KPI display, drill-down | P0 |
| FR-RPT-03 | Ready-made catalog (66 reports in Appendix B §4). Release 1 includes: daily sales, sales register, stock, stock valuation, credit outstanding and overdue, girvi register, active and overdue girvi, interest income, day book, GST summary, customer statement | P0 |
| FR-RPT-04 | Export to Excel/CSV/PDF with shop letterhead; every export audited; phone-number export restricted to Owner | P0 |
| FR-RPT-05 | Configurable dashboard of KPI cards chosen from any metric | P0 |
| FR-RPT-06 | Saved views (private/shared), pin to dashboard | P1 |
| FR-RPT-07 | Scheduled reports and threshold alerts | P2 |
| FR-RPT-08 | Data Health page running reconciliation checks (Appendix B §8) | P1 |

---

## 6. Non-functional requirements

| ID | Area | Requirement |
|---|---|---|
| NFR-01 | Responsiveness | Works at 360 × 640 up to 1920 wide; verified at 360, 390, 768, 1024, 1440 |
| NFR-02 | Performance | On a mid-range Android over 4G: first useful screen ≤ 3 s; route change ≤ 1 s; barcode scan-to-cart ≤ 300 ms after lookup; shell JS ≤ 180 KB gzipped, heavy libraries (PDF, Excel, ZIP) loaded only when used |
| NFR-03 | Data integrity | Money in integer paise, weight in integer mg; all multi-step writes in a database transaction; append-only ledgers |
| NFR-04 | Security | HTTPS only; server-side authorisation on every endpoint; validated input; rate-limited login; no secrets in code; KYC files private; audit log |
| NFR-05 | Availability and recovery | Target 99% uptime in shop hours; backup at least daily; **RPO ≤ 24 h, RTO ≤ 4 h**; restore tested monthly |
| NFR-06 | Accessibility | WCAG 2.1 AA target; zoom allowed; keyboard operable; visible focus; not colour-only status |
| NFR-07 | Browsers | Latest two versions of Chrome/Edge (desktop and Android), Safari iOS 16+ |
| NFR-08 | Localisation | English + Hindi; Indian number format (₹1,11,240); DD-MM-YYYY; IST; FY April–March |
| NFR-09 | Auditability | Every financial or stock change traceable to user, device, time, reason |
| NFR-10 | Maintainability | Interest and pricing are pure, unit-tested functions; ≥ 90% coverage on those; CI runs lint, types, tests |
| NFR-11 | Print | Invoices and slips print correctly on A4 and 80 mm; labels print at exact configured size |
| NFR-12 | Privacy | Customer KYC visible only to permitted roles; exports of personal data restricted and logged |

---

## 7. Key user journeys (acceptance scenarios)

**J1: Barcode sale, part on credit (phone or PC).** Cashier opens POS → scans two items → customer searched by phone → discount within limit → pays ₹50,000 by UPI, rest on credit with promised date → invoice shared on WhatsApp. *Result:* items sold, invoice locked at today's rate, Credit created and linked. *Done in ≤ 30 s of active work.*

**J2: New girvi with defects (phone).** Staff creates customer via quick-add → adds two articles, types "Anklets: 2 ghungroo not there", takes photos → sets 2% monthly compounding every 6 months → LTV shows 70% → slip printed. Phone screen locks halfway; on reopening, **the draft resumes at the same step**.

**J3: Redemption.** Manager opens the girvi → live counter shows "1 yr 3 mo 12 d" → picks today in the redeem calculator → receives payment → verifies articles against pledge weights → release receipt → status Redeemed.

**J4: Print tags for new stock.** Owner adds 40 new items → opens Barcode Studio → "Unlabelled items" → selects template "Jewellery tag 2-up" → prints PDF → scans one printed tag in the scan test → all 40 marked label-printed.

**J5: Overdue follow-up.** Owner opens Follow-ups on phone → taps WhatsApp on an overdue customer → logs "will pay Friday" → new promised date saved, original kept.

**J6: Owner's evening check.** Dashboard shows today's sales, cash, credit outstanding, active girvi principal, interest received, overdue count; Owner picks two more KPI cards and saves the layout.

---

## 8. Success metrics (first 90 days)
- ≥ 95% of sales billed through barcode scan
- Zero duplicate invoices or SKUs
- 100% of girvi and credit interest matches the reference calculator in spot checks
- Owner reviews dashboard on phone at least 5 days per week
- Time to create a girvi ≤ 4 minutes; to print 40 tags ≤ 2 minutes
- Zero incidents of lost form data

---

## 5.20 Daily Cash Flow (CSH)
- **FR-CSH-01..11**: Cash entry with name, category, mode (Cash/UPI/Bank transfer), party, UTR reference, transfer entry (cash ↔ bank), duplicate guard within 10 min window, cancel/reverse rules under doc 07.
- **FR-CSH-20..28**: Fund accounts master (Cash in hand, Bank accounts), Daily summary with opening/closing balances per mode with zero gaps ($Closing_D = Opening_{D+1}$), Day close with denomination counter (₹500, ₹200, coins).
- **FR-CSH-30..32**: Category tree (OPERATING, GIRVI, METAL, FINANCING, TRANSFER) with system category protection.
- **FR-CSH-40..49**: Smart name memory & suggestion engine (`domain/cash/suggest.ts`), deterministic ranking, confidence rule, unusual amount hint.
- **FR-CSH-60..68**: Daily View (`S-180`), Cash Book List (`S-183`) with multi-level sorting (`sort=date:desc,amount:desc`), search box (name, date `28/09/2026`, amount, UTR), mode chips (**All · Cash · UPI · Bank transfer**), day headers with opening/closing balances, export.
- **FR-CSH-90..97**: Balance history screen (`S-188`), permanent history, backdated entries recalculating balance chain on unlocked days.

## 5.21 Girvi Re-pledge, Custody Locations and Spread Profit (RPL)
- **FR-RPL-01..09**: Custody locations master (`SHOP_DRAWER`, `VAULT`, `HOME`, `TRANSIT`, `VENDOR`), location badges (`🗄️ Vault`, `🏦 With Vendor`) across Search, Girvi detail, and Customer 360°, PIN approval for high-security moves (`HOME`, `VENDOR`), Location audit (`S-195`).
- **FR-RPL-10..15**: Financier vendor master, custom typed Girvi number (`M-1042/26`), vendor ticket reference, re-pledge consent clause on customer slip.
- **FR-RPL-20..28**: Funding planner (`S-190`), custom typed offered amount per girvi/lump sum, hand-over and cash received recording, loan events (interest, part payment, renewal).
- **FR-RPL-30..36**: Accrued and realized spread (profit) calculation per Girvi number and Vendor loan number in Spread Register (`S-196`).
- **FR-RPL-40..46**: Blocked customer release while item is with vendor; recall workflow (`REQUESTED → REPAYING → IN_TRANSIT → RECEIVED`).
- **FR-RPL-70..78**: Vendor settlement sheet (`S-198`) with System Payable vs Vendor Asking Amount variance, cash readiness check, weight verification, and final settlement voucher (`VS-…`).

---

## 5.22 Tagging System (TAG)

| Req ID | Requirement | Priority |
|---|---|---|
| FR-TAG-01 | Tag definitions: code, label EN/HI, colour (hex), icon, group (SYSTEM/CUSTOMER/GIRVI/CASHBOOK/INVENTORY), isAuto flag, effect, permission level | P0 |
| FR-TAG-02 | Two tag kinds: **auto-tags** (applied atomically inside financial transactions) and **manual tags** (applied by staff/manager/owner per permission) | P0 |
| FR-TAG-03 | Tag effects: `NONE` (display only), `BLOCK_RELEASE` (prevents girvi release until resolved), `WARN_DISPUTE` (shows orange warning at checkout) | P0 |
| FR-TAG-04 | Permission levels per TagDef: ALL (any staff), MANAGER, OWNER — enforced server-side | P0 |
| FR-TAG-05 | Tags visible in: Customer 360° header, Girvi Detail, Search results, POS customer picker chip | P0 |
| FR-TAG-06 | SmartList: named saved filter combining tag criteria with query criteria; pinnable to dashboard sidebar | P1 |
| FR-TAG-07 | Entity types supported: CUSTOMER, GIRVI_LOAN, GIRVI_ITEM, CASH_TXN, SALE, VENDOR | P0 |
| FR-TAG-08 | Tag expiry: optional `expiresAt`; expired tags auto-cleared by nightly cron | P1 |

---

## 5.23 Suggestion Calculators & Analytics (CALC)

| Req ID | Requirement | Priority |
|---|---|---|
| FR-CALC-01 | Lending Advisor: given metal purity + weight → suggest loan amount with LTV check and rate options | P1 |
| FR-CALC-02 | Redemption Advisor: given girvi ID + chosen redemption date → breakdown of principal + interest per tranche + fees | P0 |
| FR-CALC-03 | Re-pledge Advisor: given customer girvi + vendor terms → rate gap (pp/mo), rupee spread/mo, own capital required, break-even flag | P1 |
| FR-CALC-04 | All calculator inputs/outputs logged to `SuggestionLog` with accepted vs suggested variance and reason | P1 |
| FR-CALC-05 | `AnalyticsSnapshot` table populated by nightly cron; used by dashboard for fast metric queries without recomputing raw ledgers | P1 |

---

## 5.24 Purchase Lots & Rate-Open Inventory (PUR)

| Req ID | Requirement | Priority |
|---|---|---|
| FR-PUR-01 | Purchase lot ingestion: vendor, invoice no, total fine weight, basis (`RUPEE_FIXED` / `RATE_OPEN` / `METAL_ACCOUNT`) | P0 |
| FR-PUR-02 | Rate-Open status flow: `RATE_OPEN → PARTLY_FIXED → FIXED → PAID` | P0 |
| FR-PUR-03 | Settlement Queue: list open lots with age, fine grams open, mark-to-market exposure (₹ change per ±₹100/g rate move) | P1 |
| FR-PUR-04 | Rate-Fixing Wizard: select lot → enter fine grams to fix + actual rate → preview metal value + GST → PIN confirm → append `RateFixEvent` + `ItemCostRevision` records (barcodes and listed prices unchanged) | P0 |
| FR-PUR-05 | Bulk Rate Edit tool: filter items by vendor/date → preview old vs new cost → PIN confirm → append-only batch revision | P1 |
| FR-PUR-06 | Auto-tag `RATE_OPEN` / `RATE_PARTLY_FIXED` / `COST_REVISED` on customers whose girvi items belong to open purchase lots | P1 |
| FR-PUR-07 | Cash Flow rule (invariant): inventory movements **never** auto-post cash rows; money moves only when an explicit vendor payment is recorded | P0 |

---

## 5.25 Multi-Tranche Girvi & Partial Release (TRN)

| Req ID | Requirement | Priority |
|---|---|---|
| FR-TRN-01 | Top-up tranche: add a new tranche to an existing girvi with independent rate, interest type, compounding basis, and due date | P0 |
| FR-TRN-02 | Tranche kinds: `ORIGINAL`, `TOPUP`, `METAL_SPLIT`, `RENEWAL` | P0 |
| FR-TRN-03 | Tranche Summary Table on Girvi Detail: seq no, start date, principal, rate, accrued interest, payable per tranche | P0 |
| FR-TRN-04 | Part-payment allocation order choices: All Interest First (default), Tranche by Tranche, Highest Rate First, Pick Tranche | P1 |
| FR-TRN-05 | `PaymentAllocation` records store exact interest/principal split per tranche per payment for audit; printed on every receipt | P0 |
| FR-TRN-06 | Partial Release Wizard: select articles to return → lendable-value check → compute `minPrincipalToPay` → collect collector name/relation/ID proof → `PartialReleaseBatch` record | P0 |
| FR-TRN-07 | Article qty > 1 split and packet re-sealing task tracked within the release batch | P1 |
| FR-TRN-08 | Delivery Queue widget: Lane A (ready in shop), Lane B (coming from vendor: Requested → Repaying → In Transit → Received) | P0 |
| FR-TRN-09 | Interest freezing: once `PAID_AWAITING_RELEASE` tag applied, no further interest accrual on that girvi | P0 |

---

## 9. Assumptions, risks, open questions

### Assumptions
- Hosting is a Hostinger plan with **managed Node.js web apps and managed MySQL** (Business or Cloud tier); a cheaper shared plan may not run Node.js. Confirm in hPanel (see TECH §16).
- A USB scanner acts as a keyboard; label printer prints from a browser/PDF.
- Existing system data can be exported to CSV/Excel or read from its files.

### Risks
| Risk | Mitigation |
|---|---|
| Interest logic errors cost money | Pure engine, hand-verified golden tests, reconciliation checks, Owner review of first 20 real cases |
| Legal rules for pawnbroking (licence, rate caps, notices) differ by state | All such rules are settings; confirm with CA/advocate before go-live |
| Hosting limits (memory, filesystem persistence) | Storage adapter (disk or object storage), health checks, load test before go-live |
| Barcode labels unreadable when printed | Calibration page and scan test (FR-BAR-09), vector bars in PDF |
| Staff bypass the system | Roles, audit log, discount PIN, reversal-only edits |
| Data migration errors | Import wizard with dry run and batch rollback |

### Open questions for the owner (answer before M3)
1. Exact Hostinger plan? (must offer Node.js web apps and MySQL)
2. Label printer model and label roll size(s) (e.g. tag size and columns)? Scanner model?
3. State of operation, and is a pawnbroker licence held? Any maximum interest rate or notice period to configure?
4. Is the shop GST-registered? HSN codes to print? HUID applies to your gold items?
5. Default girvi rates for gold and silver, and default compounding?
6. Categories and purities list for SKU master (Ring, Chain, Anklet, Bangle, … 22K, 18K, 925 …)?
7. How many users and devices? Do you want a second shop later?
8. Format of the existing data (Excel, files from the website, database)? Opening balances for credit and girvi?
9. Logo, shop address, GSTIN, and preferred invoice layout?

---

## 10. Milestones (shared by all documents)

| Code | Milestone | Key requirements | Exit test |
|---|---|---|---|
| **M0** | Baseline and audit of the existing barcode app | (audit only) | App runs unchanged; audit table agreed |
| **M1** | Foundation: app shell (mobile-first), auth, roles, settings, audit, i18n, money/weight libs, draft hook, idempotency | PLT-01..05, 07, 08, 12 | Login works per role; draft restore demo |
| **M2** | Customers and global search | CUS-01..03, PLT-06 | Duplicate detection and quick-add tested |
| **M3** | Inventory and SKU | INV-01..04, 09 | 100 parallel SKU requests give no duplicates |
| **M4** | **Barcode Studio** (port + inventory integration) | BAR-01..12 | Original features intact; 1,000 labels on phone; scan test |
| **M5** | Rates, POS, invoices, old gold, day close | POS-01..14 | Two cashiers cannot sell the same item; J1 passes |
| **M6** | Credit | CRD-01..09 | Golden tests 5–6 pass |
| **M7** | Girvi | GIR-01..17 | Golden tests 1–4, 7 pass; J2, J3 pass |
| **M8** | Customer 360°, Follow-ups, PWA/offline queue | CUS-04..09, PLT-09, 11 | Offline sale syncs once |
| **M9** | Reports and dashboard | RPT-01..08 | Reconciliation checks green |
| **M10** | Migration, backups, hardening, Hostinger go-live | PLT-10, 13, NFR-04, 05 | Restore drill done; security checklist signed |
| **M18** | **Cash Flow Core & Day Close** | CSH-01..05, 20..25, 60..68, 90..97 | Daily opening/closing balances, denomination count, cash book multi-sort/search, reversal edit/delete |
| **M19** | **Smart Names & Analytics Sync** | CSH-40..52, 70..73 | Deterministic label suggestions, recurring templates, report metrics |
| **M20** | **Girvi Re-pledge & Custody Locations** | RPL-01..78 | Storage locations, funding planner, spread register, recall & vendor settlement sheet |
| **M21** | **Suggestion Calculators & Analytics Snapshots** | CALC-01..05 | Lending advisor, redemption advisor, repledge advisor; calculator results logged; nightly snapshot job |
| **M22** | **Tagging System** | TAG-01..08 | Tag apply/remove; BLOCK_RELEASE effect enforced; SmartList pinned to dashboard |
| **M23** | **Purchase Lots & Rate-Open Queue** | PUR-01..07 | Rate-fix wizard; bulk cost edit; auto-tags; cash-flow invariant enforced |
| **M24** | **Multi-Tranche Girvi & Delivery Queue** | TRN-01..09 | Tranche table; partial release wizard; delivery lanes; interest freeze |

**Definition of done (any milestone):** requirements met and traced in `docs/00_PROGRESS.md`; mobile (360 px) and desktop checked; tests pass; docs updated if anything changed; no TODOs left silently.

---

## 11. Glossary
**Girvi**: loan against pledged jewellery. **Udhaar / Credit**: sale amount to be paid later. **Purity / touch**: gold fineness (22K, 18K) or silver (925). **Net weight**: weight of metal excluding stones. **Fine weight**: net weight × purity fraction (e.g. 100 g 22K = 91.6 g fine). **Making charge**: fabrication charge added to metal value. **HUID**: hallmark unique ID on BIS-hallmarked gold jewellery. **LTV**: loan-to-value ratio. **SKU**: unique stock code. **Packet / locker no.**: where a pledged item is stored. **Ledger**: append-only record of money or stock movements. **Re-pledge**: borrowing money from a financier against customer pledged collateral. **Spread**: profit difference between customer interest rate and vendor interest rate. **Tranche**: an independent sub-loan on a girvi with its own rate, interest type, and due date. **Purchase Lot**: a batch of inventory purchased from a vendor under one invoice; may be rate-open. **Rate-Open**: a purchase where the final price is fixed later at an agreed gold rate. **Mark-to-Market**: current market value of a rate-open lot at today’s metal price. **Smart List**: a named saved filter combining tags and query criteria, pinnable to the dashboard. **Delivery Queue**: tracking screen for pledged articles ready for return (Lane A = in shop; Lane B = coming from vendor). **TxnLabel / Smart Name**: a normalised cashbook party name with usage statistics and suggestion engine.

