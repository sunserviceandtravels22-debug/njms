# 02 · Design Document (UX/UI)
**Product:** Narayan Jewellers Management System (NJMS) · **Version:** 1.0 · **Date:** 28 Sep 2026
**Read with:** `01_PRD.md` (requirement IDs `FR-*`) · `03_TECH.md` (components, data, APIs)
**Rule:** if a screen or behaviour here conflicts with the PRD, stop and ask; update all docs together.

Screen IDs `S-xx` and component IDs `C-xx` are used in the PRD traceability table, the TECH doc, code file headers and tests.

---

## 1. Design principles
1. **Mobile-first.** Design at 360 px. Desktop adds space and shortcuts; it never adds new functions that phones lack.
2. **Thumb-first.** Primary actions sit in the lower half of the screen (bottom bar, sticky action bar, bottom sheets).
3. **One customer, one banner.** Any screen touching a customer shows the exposure banner (C-09).
4. **Speed at the counter.** Scan field always focused on POS; big totals; few taps.
5. **Never lose work.** Autosave status is always visible ("Saved ✓ 10:42"); drafts resume.
6. **Numbers you can trust.** Show formulas and breakdowns for interest and price; never hide how a total was reached.
7. **Calm and clear.** Plain words (English + Hindi), consistent colours, no decoration that slows reading.
8. **Errors are loud, fixable and specific** ("Item G-RNG-22-0007 is already sold on INV-2026-0142").

---

## 2. Mobile-first strategy

### 2.1 Breakpoints (Tailwind)
| Name | Min width | Layout |
|---|---|---|
| base | 0 (design at **360 px**) | single column, bottom tab bar, cards, bottom sheets, full-screen steppers |
| `sm` | 640 | wider cards, two-column form fields where short |
| `md` | 768 (tablet) | two-pane lists (list + detail), side sheet instead of bottom sheet, tables begin |
| `lg` | 1024 | persistent left sidebar, multi-column dashboards, real tables |
| `xl` | 1280 | wide reports, side-by-side POS (cart + payment) |
| `2xl` | 1536 | max content width 1440 px, centred |

### 2.2 Adaptation rules
| Element | Mobile (base) | Tablet/Desktop |
|---|---|---|
| Navigation | Bottom tab bar (5 items) + "More" sheet | Left sidebar (collapsible), top bar with search |
| Lists/tables | **Card list** with key fields and status chip | Real table with sortable columns and column picker |
| Forms | One column, sticky "Save" bar, wizard for long forms | Two-column, inline actions |
| Detail views | Full-screen page with tab strip (scrollable) | Two-pane (list left, detail right) at `md`+ |
| Pickers/filters | Bottom sheet | Popover / side panel |
| Confirm dialogs | Bottom sheet, full-width buttons | Centred modal |
| Date/number entry | Native date input, numeric keypad (`inputmode`) | Same, with keyboard shortcuts |
| Print/PDF | Download/share sheet | Print dialog |

### 2.3 Technical design rules for mobile
- Viewport: `width=device-width, initial-scale=1, viewport-fit=cover`. **Do not disable zoom** (the original barcode app used `user-scalable=no`; remove it).
- Respect safe areas: `env(safe-area-inset-*)` on bottom bar and sticky bars.
- Use `100dvh` (dynamic viewport height), not `100vh`, and never trap content behind the on-screen keyboard: scroll the focused field into view; sticky bars hide while the keyboard is open.
- Inputs use font-size ≥ 16 px (prevents iOS zoom-on-focus).
- Touch targets ≥ 44 × 44 px with ≥ 8 px gap. Swipe gestures are optional shortcuts, never the only way.
- Tables never scroll the page sideways; on mobile they become cards.
- Load heavy features lazily (PDF, Excel, ZIP, camera scanner) with a skeleton and a clear progress indicator.
- Test on: 360×640 (small Android), 390×844 (iPhone), 768×1024 (tablet), 1024×768, 1440×900.

---

## 3. Information architecture and navigation

### 3.1 Mobile bottom tabs (5)
| Tab | Opens | Notes |
|---|---|---|
| **Home** | S-02 Dashboard | KPI cards, follow-ups |
| **Sell** | S-30 POS | Highlighted centre tab; long-press for "Hold bills" |
| **Customers** | S-10 Customers | Search first |
| **Girvi** | S-50 Girvi list | Credit lives under Customers and More |
| **More** | Sheet | Credit, Inventory, Barcode Studio, Reports, Cash/Day close, Settings, Drafts, Language |

A **floating "＋" button** on list screens opens the create action for that list (new customer, new item, new girvi…). A **global search icon** in the top bar opens S-03 on every screen.

### 3.2 Desktop sidebar (grouped)
```
Dashboard
Sell ▸ POS · Invoices · Old gold · Returns
Customers ▸ All · Follow-ups
Credit (Udhaar)
Girvi ▸ All · Vault register
Inventory ▸ Items · Stock audit · SKU master
Barcode Studio ▸ Studio · Templates · Print history
Reports ▸ Catalog · Builder · Saved
Finance ▸ Rates · Cash book · Expenses · Day close
Settings ▸ Shop · Interest · Users · Backups · Data health
```
Items are hidden if the role lacks permission (never shown then errored).

### 3.3 Screen inventory
| ID | Screen | Requirements |
|---|---|---|
| S-01 | Login (+2FA) | PLT-02 |
| S-02 | Dashboard | RPT-05 |
| S-03 | Global search | PLT-06 |
| S-04 | Drafts tray | PLT-08, POS-10 |
| S-05 | Follow-ups | PLT-11, CRD-05 |
| S-10 | Customer list | CUS-01 |
| S-11 | Customer form (+ quick-add sheet) | CUS-01..05 |
| S-12 | **Customer 360°** | CUS-06, 07 |
| S-20 | Inventory list | INV-04 |
| S-21 | Item form | INV-02, 07 |
| S-22 | Stock audit | INV-06 |
| S-23 | SKU master | INV-01 |
| S-30 | **POS / cart** | POS-01..04, 10 |
| S-31 | Checkout and payment | POS-05..09, 11 |
| S-32 | Invoice view/print | POS-12 |
| S-33 | Sales list and returns | POS-13 |
| S-34 | Old gold purchase | POS-11 |
| S-35 | Daily rates | POS-06 |
| S-36 | Day close and cash book | POS-14 |
| S-40 | Credit list (overdue, ageing) | CRD-04, 07 |
| S-41 | Credit detail (ledger, promises, linked sale) | CRD-01..08 |
| S-42 | Take payment (sheet) | CRD-03 |
| S-50 | Girvi list | GIR-05 |
| S-51 | **Girvi wizard (5 steps)** | GIR-01..04, 12, 17 |
| S-52 | Girvi detail (live counter, ledger, articles) | GIR-05..16 |
| S-53 | Redeem calculator | GIR-06 |
| S-54 | Vault register | GIR-14 |
| S-60 | **Barcode Studio** | BAR-01..12 |
| S-61 | Label templates | BAR-04 |
| S-62 | Print history | BAR-08 |
| S-70 | Report catalog | RPT-03 |
| S-71 | Report builder (metric picker) | RPT-01, 02 |
| S-72 | Saved reports and schedules | RPT-06, 07 |
| S-80 | Settings (shop, interest, GST toggle/rates, users, roles, backups) | PLT-03, 04, 04a, 10 |
| S-81 | Data health | RPT-08 |

---

## 4. Visual language (design tokens)

Direction: warm, trustworthy, jewellery-shop feel (deep maroon and antique gold on warm neutrals), with very high legibility for numbers. Verify all text/background pairs with a contrast checker (target WCAG AA 4.5:1 for text, 3:1 for large text and UI).

### 4.1 Colour tokens (CSS variables; light theme first, dark theme defined)
| Token | Light | Use |
|---|---|---|
| `--bg` | `#FBF8F4` | App background |
| `--surface` | `#FFFFFF` | Cards, sheets |
| `--surface-2` | `#F3EDE6` | Subtle panels, table stripes |
| `--border` | `#E3D9CE` | Dividers |
| `--text` | `#1F1A17` | Primary text |
| `--text-muted` | `#5E554E` | Secondary text |
| `--primary` | `#7B1E3A` | Primary buttons, active tab (white text on it) |
| `--primary-hover` | `#621630` | Hover/pressed |
| `--accent` | `#B8860B` | Highlights, icons, badges (avoid for small text; use `--accent-strong` `#8A6508` for text) |
| `--success` | `#1E7A4C` | Paid, in stock, redeemed |
| `--warning` | `#B26A00` | Due soon, near-limit |
| `--danger` | `#B3261E` | Overdue, errors, destructive |
| `--info` | `#1F5FA8` | Notices |
Dark theme: invert surfaces (`--bg #15110F`, `--surface #1E1916`), keep hues, raise lightness of status colours; implemented as `:root[data-theme="dark"]` and `prefers-color-scheme`.

### 4.2 Status chips (icon + text, never colour alone)
| Status | Chip |
|---|---|
| Paid / In stock / Redeemed | ✓ green |
| Due in ≤ 7 days | ⏱ amber |
| Overdue | ⚠ red |
| On hold / Pending | ⏸ blue-grey |
| Sold / Closed | ● grey |
| On girvi | 🔒 gold |

### 4.3 Typography
- Fonts: **Inter** (Latin) + **Noto Sans Devanagari** (Hindi); fallback system-ui. Monospace **JetBrains Mono** for SKUs, barcodes, amounts in tables (tabular numbers).
- Scale (mobile → desktop): Display 28→32 · H1 22→26 · H2 18→20 · Body 16 · Small 14 · Caption 12 (never below 12). Line-height 1.4–1.6.
- Money uses tabular figures, right-aligned in tables; Indian grouping `₹1,11,240`.
- Long Hindi names wrap; never truncate a customer name on detail screens.

### 4.4 Spacing, shape, elevation, motion
- 4-px base grid: 4, 8, 12, 16, 24, 32, 48. Page padding 16 (mobile), 24 (tablet), 32 (desktop).
- Radius: 8 (inputs), 12 (cards), 16 (sheets), full (chips).
- Elevation: card `0 1px 2px rgba(0,0,0,.06)`, sheet `0 -8px 24px rgba(0,0,0,.12)`.
- Motion: 150–250 ms ease-out; sheets slide up; skeletons instead of spinners for lists. Respect `prefers-reduced-motion`.
- Icons: Lucide, 20–24 px, always paired with a label on primary actions.

---

## 5. Component library

| ID | Component | Behaviour |
|---|---|---|
| C-01 | **AppShell** | Bottom tabs (mobile) / sidebar (desktop); top bar with title, search icon, sync + draft indicators |
| C-02 | **Button** | Sizes: default 48 px high on mobile; variants primary/secondary/ghost/danger; loading state prevents double-tap (idempotency key attached) |
| C-03 | **Field** | Label above input, helper text, inline error, required marker; `inputmode` set per type |
| C-04 | **MoneyInput** | Numeric keypad, ₹ prefix, Indian grouping as you type, stores paise, no floats |
| C-05 | **WeightInput** | Grams with 3 decimals, stores mg; quick "+/-" adjust; shows net/gross helper |
| C-06 | **PhoneInput** | 10-digit India, +91 prefix, duplicate check on blur |
| C-07 | **CustomerPicker** | Search by phone/name, recent list, "＋ New customer" quick-add sheet; selected customer shows chip + exposure banner + 44px WebP photo thumbnail |
| C-07b | **PhotoPreviewModal** | Full-resolution photo modal with zoom capability for instant customer visual identity verification |
| C-08 | **ScanInput** | Auto-focused text input for USB scanner; scan-speed detection; camera button opens scanner sheet; beep + green/red flash; keeps focus after every action |
| C-09 | **ExposureBanner** | Sticky strip: "Credit ₹X · Girvi ₹Y · Total ₹Z" (green when zero, amber when due soon, red when overdue); tap opens S-12 |
| C-10 | **ResponsiveList** | Cards on base; table at `lg`; sorting, filter chips, infinite scroll; empty and loading states |
| C-11 | **BottomSheet / SideSheet** | Bottom sheet on mobile, side sheet on `md`+; drag handle; trap focus; Esc/back closes |
| C-12 | **Stepper** | Numbered progress, back/next in sticky bar, per-step validation, autosave on step change |
| C-13 | **DraftBanner** | "Unsaved draft found: Ravi Kumar · Girvi · 10:42 [Resume] [Discard]" |
| C-14 | **SaveIndicator** | "Saving…" / "Saved ✓" / "Offline: will sync" near the title |
| C-15 | **StatusChip** | Per §4.2 |
| C-16 | **LedgerTimeline** | Chronological entries, reversals shown struck-through with reason, running balance |
| C-17 | **BreakdownCard** | Interest/price breakdown lines; "Show formula" toggle |
| C-18 | **PinDialog** | 4–6 digit PIN, for discount overrides, LTV overrides, reversals |
| C-19 | **ConfirmSheet** | Destructive actions: states consequence in plain words |
| C-20 | **Toast** | Non-blocking messages; errors persist until dismissed; replaces `alert()` |
| C-21 | **PhotoCapture** | Camera or gallery, convert client-side to high-quality WebP (quality 0.92, ≤300 KB), upload to POST /api/v1/files |
| C-22 | **MetricPicker** | Grouped checkboxes with search, presets (Essentials/Detailed/All), formula tooltip |
| C-23 | **FilterBar** | Chips + "Filters" sheet; saved filter sets |
| C-24 | **KpiCard** | Value, delta vs previous period (▲/▼ with arrow), sparkline |
| C-25 | **EmptyState** | Icon, one sentence, one primary action |
| C-26 | **PrintSheet** | Renders A4 / 80 mm previews with print CSS |
| C-27 | **LabelPreview** | Shows a scaled tag/label with actual fields, barcode and dimensions |

---

## 6. Screen specifications (key screens)

Each spec: **Mobile layout → Desktop changes → States → Key interactions.**

### S-12 Customer 360° (FR-CUS-06, 07, GIR-16)
```
┌───────────────────────────┐
│ ← Ramesh Kumar        ⋮   │
│ S/o Mohan Lal · 98xxxxxx  │  [📞][💬]
│ ┌ Exposure ─────────────┐ │
│ │ Credit ₹18,000        │ │  amber/red by status
│ │ Girvi  ₹1,42,300      │ │
│ │ Total  ₹1,60,300  ⚠   │ │
│ └───────────────────────┘ │
│ [New sale][New girvi][Take pay]
│ Timeline│Buy│Credit│Girvi│…   ← scrollable tabs
│ ─ 12 Sep  Girvi GV-0031 ₹80k
│ ─ 03 Sep  Payment ₹5,000 UPI
│ ─ 28 Aug  Invoice INV-0142 …
└───────────────────────────┘
```
Desktop: two columns; left profile and exposure, right tabs. Tabs: Timeline · Purchases · Credit · Girvi · Old gold · Payments · Documents · Notes.
States: empty tab shows an EmptyState with a create action; blocked/watchlist tag shows a red banner at top.

### S-30 POS (FR-POS-01..04, 10)
```
┌───────────────────────────┐
│ New sale   ●Saved ✓  [Hold]│
│ [ 🔍 Scan or type code  📷 ]│  ← ScanInput, always focused
│ Rate: 22K ₹10,000/g  ✓today │
│ ┌ G-RNG-22-0012  Ring    ┐ │
│ │ 4.250 g · 22K   ₹47,890│ │  swipe ← remove (also ✕ button)
│ └────────────────────────┘ │
│ ┌ G-CHN-22-0031  Chain   ┐ │
│ └────────────────────────┘ │
│ Customer: [Pick / ＋New]    │
│────────────────────────────│
│ Items 2 · Total ₹1,11,240  │
│ [        Checkout →       ] │  ← sticky bottom bar
└───────────────────────────┘
```
Desktop (`xl`): cart on left (2/3), summary + payment panel on right (1/3), keyboard shortcuts F2 new sale, F4 pay, Ctrl+K search.
States: rates not set → blocking banner with "Set rates" (Owner override); scan errors show a full-width red toast + long buzz; success = green flash + short beep.

### S-31 Checkout (FR-POS-05..09)
Order: customer → line breakdown (metal, making, stone, discount, GST, round-off) → old gold adjustment → payment rows (add Cash / UPI / Card / Credit; UPI ref field) → remaining balance chip (must be ₹0 or moved to credit) → credit terms sheet (promised date, interest) if any credit → "Complete sale" (disabled until balanced; idempotent).

### S-51 Girvi wizard (FR-GIR-01..04, 12, 17)
Steps (each is one full-screen view on mobile with sticky Back/Next):
1. **Customer:** picker + exposure banner + past purchases/credit summary (FR-GIR-16).
2. **Articles:** repeatable cards: type, name, qty, gross/net weight, purity, est. value, **defect notes (multi-line, free text, placeholder "e.g. Anklet: 2 ghungroo missing")**, photos (C-21). "＋ Add another article".
3. **Loan:** amount (MoneyInput), **LTV meter** (green ≤ limit, amber near, red over → PIN to proceed).
4. **Interest:** metal default rate prefilled and editable; simple/compound; compounding monthly / 6-monthly / yearly; partial-period rule; due date; preview "Payable after 6 / 12 months".
5. **Review:** all details, customer signature note, packet/locker number → **Save and print slip**.
Header shows C-14 SaveIndicator; leaving the wizard keeps the draft.

### S-52 Girvi detail (FR-GIR-05..16)
Top: customer + exposure banner. **Live counter card:** "Tenure 1 yr 3 mo 12 d · Principal ₹80,000 · Interest ₹19,240 · **Payable today ₹99,240**" with "Show formula". Actions bar: Interest payment · Part payment · Top-up · Renew · Part release · **Redeem**. Tabs: Ledger (C-16) · Articles (with defect notes and photos) · Customer history · Documents.

### S-53 Redeem calculator (FR-GIR-06)
Date picker (default today) → breakdown card (principal, each compounding period with interest, partial period, payments already made, total) → "Proceed to redemption".

### S-41 Credit detail (FR-CRD-01..08)
Header amounts (principal, interest, penal, **total due**), due date chip, ledger timeline, "Linked sale" card showing invoice and items (tap to open), promise-to-pay list, actions: Take payment · Log promise · Send reminder · Settle/Write-off (Owner).

### S-02 Dashboard (FR-RPT-05)
Mobile: KPI card carousel (2 per row grid) → Follow-ups today → Overdue list → Alerts (rates not set, cash difference, low stock). "Edit cards" opens MetricPicker. Desktop: 4-column grid with charts.

### S-70/71 Reports (FR-RPT-01..06)
Mobile: catalog as cards → report opens as summary KPIs + list; "Customise" opens a full-screen **MetricPicker** sheet (search, groups, presets) and FilterBar; charts below; export button in the top bar. Desktop: left panel (metrics + filters), right panel (table/chart) side by side.

---

## 7. Barcode Studio design (S-60, S-61, S-62)

The original generator was a desktop-style sidebar with a drawer on mobile. NJMS turns it into a **guided, four-step flow on mobile** and a **three-panel workspace on desktop**, keeping every original capability (FR-BAR-01).

### 7.1 Mobile flow (full-screen steps with a progress bar and sticky Next)
| Step | Content |
|---|---|
| **1 Source** | Tabs: **Inventory** (new) · Manual · Batch paste · File (CSV/Excel) · Range. Inventory tab: "Unlabelled items (12)" chip, search, filters, multi-select list with checkboxes and "Select all" |
| **2 Design** | Template picker (saved templates) → symbology (grouped list, Code 128 recommended), label size and unit, DPI, colours, show text; **Tag fields** toggles (SKU, shop name, net wt, purity, price, HUID) with a live **LabelPreview** (C-27) pinned at top |
| **3 Layout** | Output mode: **Sheet PDF** · **Thermal roll (1 per page)** · **Browser print** · **PNG ZIP**; page size, orientation, margins, gutter, grid profile; **grid analysis card** (matrix, capacity, efficiency, suggestions) and Live Placement preview |
| **4 Preview and print** | Paged preview of the batch (32 per page as original), valid/invalid filter, search, invalid items highlighted with the exact error; buttons: Test print · Scan test · **Generate PDF** / Print / ZIP; progress bar with Cancel; "Mark as label-printed" toggle after success |

### 7.2 Desktop workspace (`lg`+)
Left column (Source + Design), centre (batch preview grid with LabelPreview), right column (Layout + grid analysis + output actions). Header stats (Batch / Verified / Alerts) as in the original app.

### 7.3 Behaviour details
- **Validation is visible:** every invalid entry shows the reason (length, check digit, character set); no item silently renders blank (original code returned an empty image on failure).
- **Ad-hoc mode:** a switch "Not from inventory" hides inventory linking (FR-BAR-07).
- **Templates:** "Save as template" stores size, symbology, grid, fields, colours; one default per printer type (S-61).
- **Scan test (FR-BAR-09):** a focused input; scanning a printed tag shows "Read OK: G-RNG-22-0012 ✓" or a red mismatch.
- **Long batches:** progress "Rendering 340 / 1000", non-blocking UI, Cancel; results are chunked and vector-drawn where possible so phones don't freeze.
- **State persistence:** the Studio state saves as a draft (FR-BAR-12); reopening shows the resume banner.
- **Sizes are real:** LabelPreview draws at true aspect ratio and prints the size in mm/in; a "ruler" line on the calibration sheet lets the owner check the printed size.

### 7.4 Jewellery tag layout (default preset; adjustable in S-61)
```
┌──────────── tag (example 50 × 12 mm per side, dumbbell/fold-over) ────────────┐
│ [ Code128 of SKU ]  G-RNG-22-0012 │ 22K · 4.250 g │ ₹47,890 │ NARAYAN JEWELLERS │
└──────────────────────────────────────────────────────────────────────────────┘
```
Preset dimensions are examples; the owner sets real values from the printer/roll in Settings or S-61 and uses the calibration sheet to confirm.

---

## 8. Forms and validation patterns
- Validate on blur and on submit; show the error under the field in plain words; scroll to the first error.
- Required fields marked; optional shown as "(optional)". No placeholder-as-label.
- Autosave every change (debounced ~500 ms) with C-14; on submit success clear the draft.
- Numeric fields: prevent letters, use the right keypad, format Indian grouping.
- Destructive or financial actions: ConfirmSheet with the exact amount and consequence; Owner PIN where required.
- Reversal flow: reason required (min. 5 characters), shows the original entry struck-through.

---

## 9. Documents and print design
| Document | Sizes | Must contain |
|---|---|---|
| **Invoice** | A4, 80 mm | Shop name/address/GSTIN, invoice no., date, customer, item lines (SKU, HUID, net wt, purity, rate, making, amount), GST split, discount, old gold adjustment, round-off, **total in words**, payments, credit due date, signature |
| **Girvi slip** | A4 | Girvi no., customer (name, relation, phone, address), articles table with **defect notes**, weights, purity, loan, interest terms, compounding, due date, terms and conditions, signature and thumb-impression boxes, witness |
| **Release receipt** | A4, 80 mm | Girvi no., items returned with weights, amount paid, date, customer acknowledgement |
| **Payment receipt** | 80 mm | Receipt no., customer, against (credit/girvi no.), mode, amount, balance |
| **Statement** | A4 | Customer details, date range, ledger lines, closing balance |
| **Barcode tag/label** | Per template | Barcode, SKU text and selected fields at exact size |
Print CSS: exact `@page` size, no browser headers/footers, black-on-white, minimum 9 pt text, Hindi/English selectable.

---

## 10. Accessibility (NFR-06)
- Every control reachable and operable by keyboard; visible 2 px focus ring; logical tab order (POS: scan → cart → customer → checkout).
- Labels programmatically tied to inputs; errors announced (`aria-live`).
- Status never by colour alone (icon + text).
- Zoom to 200% without loss; text resizing supported; reduced-motion respected.
- Screen-reader names for icon buttons; sheets trap and restore focus.
- Camera scanner has a manual-entry fallback.

---

## 11. Content and microcopy
- Voice: short, respectful, plain. Hindi and English strings kept in translation files (never hard-coded).
- Examples (EN / HI): "Save" / "सहेजें" · "Customer" / "ग्राहक" · "Father's name" / "पिता का नाम" · "Girvi" / "गिरवी" · "Credit (udhaar)" / "उधार" · "Interest" / "ब्याज" · "Payable today" / "आज देय राशि" · "Unsaved draft found" / "बिना सहेजा ड्राफ्ट मिला".
- Error pattern: **What happened + what to do.** "Phone already exists for Ramesh Kumar. Open his profile?" 
- Never show raw codes ("500", "Error: undefined").

---

## 12. Empty, loading, error and offline states
| State | Pattern |
|---|---|
| Loading | Skeleton rows/cards; never a blank screen |
| Empty | Icon + one line + primary action ("Add your first item") |
| Error | Inline explanation + Retry; form data always preserved |
| Offline | Top strip "Offline: sales will sync when connected"; actions that need the server are disabled with the reason (girvi and credit creation online-only in Release 1) |
| Permission denied | "Ask the Owner for access" (no dead-end) |
| Stale rate | Amber "Rates are from yesterday" with Set rates |

---

## 14. Cash Flow & Girvi Re-pledge Design Specifications

### 14.1 Daily Cash Flow Screens & Components (S-180..S-188)
- **S-180 Daily Cash Flow View (`/cashbook/daily`):** Opening/Closing balance cards (Cash, UPI/Bank, Total), Timeline list, Mode split bar, Date picker, FAB "+".
- **S-181 Add Entry Sheet:** Direction (In/Out), Amount keypad (`C-60`), Smart name input (`C-61`) with suggestion reasons, Quick chips (`C-63`), Mode toggle (`C-62`) with optional UTR field.
- **S-182 Day Close & Cash Count (`/day-close`):** Expected vs Counted cash, Denomination counter (`C-64`), Difference explanation, Close & Lock day.
- **S-183 Cash Book List (`/cashbook`):** Search box (name, date `28/09/2026`, amount, UTR), Mode filter chips (**All · Cash · UPI · Bank transfer**), Multi-level sorting (`sort=date:desc,amount:desc`), Range summary bar (`C-65`), Day headers with opening/closing balances.
- **S-188 Balance History (`/cashbook/history`):** Day-by-day opening and closing balance table for all funds.

### 14.2 Girvi Re-pledge & Custody Screens (S-190..S-198)
- **S-190 Funding Planner (`/repledge/plan`):** Pick financier, select eligible girvis, enter custom **offered amount** per girvi, view live total & spread profit, print vendor packet list, record cash received.
- **S-191 Vendor Loan Detail (`/repledge/loans/[id]`):** Counter showing accrued vendor interest, allocation table, actions: *Pay Interest*, *Part Payment*, *Renew*, *Settle & Recall Girvis*.
- **S-193 Location Register (`/custody`):** Overview cards per storage location (`Vault`, `Drawer`, `Home`, `With Vendor`), packet count, gross/net weight.
- **S-194 Custody Move Sheet:** Move single/bulk girvi packets between locations with PIN approval.
- **S-195 Location Audit (`/custody/audit`):** Physical inventory stock-take scanning expected vs found items.
- **S-196 Spread Register (`/repledge/spread`):** Accrued and realized profit/commission per Girvi number and Vendor loan number.
- **S-198 Vendor Settlement Sheet (`/repledge/settle/[id]`):** Guided recall and settlement workflow with cash readiness check, vendor asking amount variance, and weight check verification.

---

## 13. Design QA checklist (per milestone)
- [ ] Designed and checked at 360, 390, 768, 1024, 1440 px
- [ ] Every action reachable with one hand on a phone; targets ≥ 44 px
- [ ] Bottom bars respect safe areas and the on-screen keyboard
- [ ] Tables become cards on mobile; no horizontal page scroll
- [ ] Draft/autosave indicator present on every multi-field form
- [ ] Money and weight inputs use correct keypads and formats
- [ ] Contrast, focus and status-icon checks pass
- [ ] Hindi text renders and wraps correctly
- [ ] Empty, loading, error and offline states implemented
- [ ] Print outputs match section 9 on A4 and 80 mm

