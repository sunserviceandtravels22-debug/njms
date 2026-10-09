# 05 · Addendum: New Modules and Gap Closure (CHANGE REQUEST, pending Owner approval)
**Product:** NJMS · **Version:** 1.1-proposal · **Date:** 28 Sep 2026
**Extends:** `01_PRD` · `02_DESIGN` · `03_TECH` · `04_ANTIGRAVITY_PROMPTS` · `00_PROGRESS`
**Status:** PROPOSAL. Per the sync rules, nothing here is coded until you say "approved". After approval the agent merges each section into its parent document (mapping in §12) and updates `00_PROGRESS.md` first.

---

## 0. What this adds, in one page

| # | New module | Why a small jeweller needs it | Code | Release |
|---|---|---|---|---|
| A | **Old Jewellery Purchase** (standalone buying of old gold/silver, with melt/refine tracking) | Old gold is the largest source of metal for most shops; today it is a P1 side-feature inside POS | OJP | **1** |
| B | **Metal Ledger** (fine-weight stock of raw gold/silver: vault, karigar, melt) | Without it, old-gold buying, custom orders and karigar work cannot be reconciled; jewellers lose money in *metal*, not only rupees | MTL | **1** |
| C | **Custom Orders** (made-to-order: sizing, weight, delivery date, vendor, advance, stages, delivery) | The most common cause of customer disputes and missed dates | ORD | 2 |
| D | **Vendors and Job Work** (karigar/supplier master, metal issued and received, labour, wastage, purchases, payables) | Karigar/supplier ledger was Phase 2; custom orders need it now | VND | 2 |
| E | **Repairs and Services** | Daily walk-in work (resize, polish, solder, re-thread) needs a token, a date, a charge | REP | 2 |
| F | **Approval / Memo and Estimates** | Items shown to customers or given "on approval" must stay tracked | APR | 2 |
| G | **Hallmark (HUID) batches** | Legal requirement for gold jewellery; batches go out and come back | HLM | 2 |
| H | **Compliance guard rails** (PAN/Form 60, cash limits, GST reverse charge flags, KYC for purchases) | Rules are settings, never hard-coded; the app warns before a violation | CMP | 1 |
| I | **Customer engagement** (birthdays/anniversaries, festival broadcast lists, rate messages) | Repeat business; uses fields that already exist (`dob`, `anniversary`) | ENG | 3 |
| J | **Gold Savings Scheme** | Very common in small shops; already listed as Phase 2 | SCH | 3 (P2) |
| K | **Bulk / lot stock** (silver utensils, coins, loose stones sold by weight or count) | Not every item is a unique tagged piece | INV ext. | 2 |

---

## 1. Gap analysis (what was checked and what is still missing)

| Area | Checked against real shop life | Verdict | Where fixed |
|---|---|---|---|
| Old gold buying | Only an exchange line inside a bill (POS-11) | **Gap**: no walk-in purchase, no melt tracking, no ownership declaration | §3 |
| Raw metal stock | No fine-weight ledger | **Gap** | §4 |
| Made-to-order | Not in v1 (Release 3 idea only) | **Gap** | §5 |
| Karigar/supplier | Non-goal in v1 | **Gap** | §6 |
| Repairs | Absent | **Gap** | §7 |
| On-approval items | `ItemStatus` has no state for it | **Gap** | §8 |
| HUID/hallmark | Field exists; no send/receive flow | **Gap** | §9 |
| Legal guard rails | Only GST 3%/5% noted | **Gap** | §10 |
| Expenses and bank | `Expense` exists; no bank/UPI book, no supplier payables | **Partial** | §6.4, §11 |
| Bulk/lot items | Every item assumed unique | **Gap** | §11 |
| Rate management | Manual daily rates; no live feed | OK for v1; optional live-rate helper is P2 | §11 |
| Staff performance | Not present | Optional P2 (sales by staff already in reports) | §11 |
| Multi-shop | Non-goal v1 | Keep non-goal, but add `shopId` now so it is not a rewrite later (§11) | §11 |
| Backups, offline, drafts, audit, idempotency | Already strong | OK | n/a |

**Still to verify with your CA/advocate (settings only, defaults are placeholders):** GST on purchase of old jewellery from an unregistered seller (reverse charge), PAN/Form 60 thresholds, cash receipt limits, hallmarking rules, pawnbroker rules for your state.

---

## 2. Decisions to approve (log in `00_PROGRESS.md`)

| # | Decision | Recommendation |
|---|---|---|
| D1 | Track **fine weight** (net × purity) as the unit of metal accounting | Yes |
| D2 | Old purchase always creates a **purchase voucher** (own number `OP-2026-0001`); POS old-gold exchange reuses the same record | Yes |
| D3 | Custom order finished piece becomes an **InventoryItem** (`RESERVED`) on receipt from the karigar, then sells through normal POS, with advance adjusted | Yes |
| D4 | Rate policy on orders: **RATE_LOCKED** at booking, or **RATE_ON_DELIVERY**; chosen per order, default from settings | Yes |
| D5 | Karigar/supplier module moves from Phase 2 to Release 2 | Yes |
| D6 | Milestone codes **M11–M15** added; existing M0–M10 unchanged | Yes |
| D7 | Legal thresholds are Settings with CA-confirmed defaults | Yes |

---

## 3. Module A: Old Jewellery Purchase (OJP)

### 3.1 Scenarios covered
1. **Walk-in buy:** customer sells old ornaments for cash/UPI, no new purchase.
2. **Exchange on a sale:** old gold value deducted on the bill (the existing FR-POS-11 now calls this module).
3. **Buy from a trader** (unregistered or registered): same voucher, with GSTIN if present.
4. **Old item resold as-is** (second-hand piece kept in stock) versus **sent to melt/refine**.

### 3.2 Requirements
| ID | Requirement | Pri |
|---|---|---|
| FR-OJP-01 | Purchase voucher with **multiple lines**; each line: article type, metal, quantity, gross weight, stone/other deduction weight, net weight, photo, notes | P0 |
| FR-OJP-02 | **Testing record per line:** method (touch/acid, XRF, fire assay, hallmark HUID), tested purity in ppt, tester name, optional XRF reading photo. Customer-claimed purity kept separately from tested purity | P0 |
| FR-OJP-03 | **Valuation engine:** fine weight, melt/wastage deduction (bp, default from settings, editable per line with reason), buy rate (from Daily Rate "buy" side, editable with PIN if outside band), value | P0 |
| FR-OJP-04 | **Seller KYC (mandatory):** existing customer or quick-add; photo captured live; ID proof and number; address; **signed ownership declaration** ("the goods are my own and not stolen/pledged"); signature/thumb capture on a phone or print for wet signature | P0 |
| FR-OJP-05 | **Payment out:** cash/UPI/bank/split, or **adjusted against the customer's sale, credit or girvi** (choose a target); cash limit guard (§10); creates `Payment` rows with direction OUT | P0 |
| FR-OJP-06 | **Disposition per line:** `MELT` (goes to melt batch), `RESALE` (creates an InventoryItem with source = old purchase), `KARIGAR` (issued to a karigar as raw metal), `RETURN_TO_SELLER` (rejected, recorded) | P0 |
| FR-OJP-07 | **Cooling-off / hold flag:** optional configurable hold (hours) before melting, so police-flagged or disputed goods can be traced; items on hold cannot be melted | P1 |
| FR-OJP-08 | **Melt batch:** group `MELT` lines, record input gross/fine, output bar weight and purity, **melt loss vs expected**, refinery/bullion dealer sale or re-use, batch closed with reconciliation | P0 |
| FR-OJP-09 | Purchase voucher print/PDF (A4 and 80 mm): shop, seller, articles, tested purity, rate, deductions, payable, declaration, signature block; Hindi/English | P0 |
| FR-OJP-10 | **Rate check:** warn if buy rate deviates from today's buy rate by more than a setting; over-limit needs PIN | P0 |
| FR-OJP-11 | Reverse/cancel a voucher (Owner, reason) with money and metal reversal entries | P1 |
| FR-OJP-12 | **Repeat-seller alert:** same person selling frequently or unusually large weight, shown as a non-blocking flag | P1 |
| FR-OJP-13 | Draft autosave through all steps; idempotent submit | P0 |
| FR-OJP-14 | Customer 360° and Exposure banner show old-gold history; **net gold position** (bought from vs sold to) | P1 |

### 3.3 Screens
| ID | Screen | Notes |
|---|---|---|
| S-34 (updated) | Old gold in checkout | Sheet that creates/links an OJP voucher and deducts value on the bill |
| **S-90** | Old purchase list | Filters: date, seller, disposition, status; today's fine weight bought |
| **S-91** | Old purchase wizard (5 steps) | Seller and KYC → articles and weights → testing → rate and value → disposition, payment, print |
| **S-92** | Old purchase detail | Voucher, lines, tests, photos, payment, disposition, audit |
| **S-93** | Melt batches | Open/closed, expected vs actual fine, loss % |

Mobile wizard: full-screen steps with sticky "Next"; a live **value card** stays visible (gross, net, purity, fine, rate, payable). Camera used for seller photo, ID and article photos (C-21).

### 3.4 Valuation formula (pure function `domain/oldgold/valuation.ts`)
```
net       = gross − stone − otherDeduction                       (mg)
fineMg    = round(net × testedPurityPpt / 1000)
fineNet   = round(fineMg × (10000 − deductionBp) / 10000)
value     = round(fineNet × fineRatePaisePerGram / 1000)        // fine (24K) rate per gram
payable   = value − adjustments (e.g. against sale/credit/girvi) ; round to ₹1 (100 paise) half-up
```
`fineRatePaisePerGram` is derived from the day's buy rate for the metal on a fine basis (setting `rate_basis`: FINE or BY_PURITY; default FINE). Rate and deduction are copied onto the voucher and never change afterwards.

### 3.5 Golden tests
| ID | Case | Expected |
|---|---|---|
| **O1** | gross 20.000 g, stone 0.500 g, net 19.500 g, tested purity 900, deduction 200 bp, fine rate ₹7,000/g | fine 17,550 mg → after deduction 17,199 mg → value **₹1,20,393.00**, payable (round ₹1) **₹1,20,393** |
| **O2** | Melt batch: input fine 91,600 mg (100.000 g at 916); output bar 92,000 mg at 995 | output fine 91,540 mg; loss **60 mg (0.066%)** |
| **O3** | Same as O1 but exchange adjustment on a sale of ₹1,11,240 | bill payable ₹0, customer receives ₹9,153 back **or** it is left as credit balance (setting); voucher and sale link both ways |
| **O4** | Buy rate 6% away from today's buy rate, band 3% | blocked without PIN |
| **O5** | Cash payout ₹2,50,000 with cash limit ₹2,00,000 | blocked; must split (bank/UPI) |

---

## 4. Module B: Metal Ledger (MTL)

Everything measured in **fine weight (mg)** and **gross weight (mg)** per metal. Append-only, like money.

### 4.1 Accounts
`VAULT` (shop), `VENDOR:<id>` (karigar/supplier holding shop metal or owing metal), `MELT:<batchId>` (in process), `CUSTOMER:<id>` (metal advance from a customer on an order or scheme).

### 4.2 Requirements
| ID | Requirement | Pri |
|---|---|---|
| FR-MTL-01 | Append-only **metal movements** with reason and reference (old purchase, melt, karigar issue/receive, order advance, adjustment, sale of scrap) | P0 |
| FR-MTL-02 | **Balances by account and metal** in fine weight; negative balance blocked unless Owner overrides with reason | P0 |
| FR-MTL-03 | **Vault stock take:** record physical fine weight, difference posted as adjustment (Owner) | P1 |
| FR-MTL-04 | Karigar metal account shows *metal held with karigar*, wastage and **owed metal** | P0 (with VND) |
| FR-MTL-05 | Daily **metal position**: opening, in, out, closing per metal (feeds day close and reports) | P1 |
| FR-MTL-06 | **Metal advance** from a customer (fine weight) for orders and schemes | P1 |

Screen **S-94 Metal ledger** (balances and movements, filterable), added to Finance/Inventory group.

---

## 5. Module C: Custom Orders / Made-to-Order (ORD)

Goal: no missed dates, no sizing errors, no advance disputes, no lost metal.

### 5.1 Journey
`DRAFT → BOOKED → DESIGN_APPROVED → SENT_TO_KARIGAR → IN_PROGRESS → RECEIVED_QC → HALLMARKING (optional) → READY → DELIVERED`, with `CANCELLED` and `ON_HOLD` reachable from most states. Every change is an event with user, time and reason.

### 5.2 Requirements
| ID | Requirement | Pri |
|---|---|---|
| FR-ORD-01 | **Order booking** for a customer (quick-add allowed) with **multiple lines**; per line: item type/category, metal, purity, description, reference photos (up to 6, camera or gallery), reference SKU (existing item to copy), quantity | P0 |
| FR-ORD-02 | **Sizing block per category** (configurable in SizeSchema): ring size (IN/US/UK or inner diameter mm), bangle inner diameter/size, chain length and width, necklace length, anklet length, earring drop length, mangalsutra length, pendant dimensions, plus engraving text, stone/colour details, finish, packaging note. Fields are typed and validated; unit (in/cm/mm) shown | P0 |
| FR-ORD-03 | **Weight spec:** target net weight, tolerance ± % (default from settings), stone weight, expected making type/value | P0 |
| FR-ORD-04 | **Time period:** requested delivery date, system-suggested **earliest date** from category lead time (setting), customer-agreed promise date, **revised-date history** (original preserved), festival/urgent flag | P0 |
| FR-ORD-05 | **Vendor assignment per line** (karigar or supplier from VND), vendor promised date, agreed labour rate, vendor-side wastage allowance | P0 |
| FR-ORD-06 | **Price policy:** `RATE_LOCKED` at booking (rate copied) or `RATE_ON_DELIVERY`; **estimate** computed with the pricing engine (§8.2 of TECH) and shown on the order slip; final price recalculated on actual weight at delivery | P0 |
| FR-ORD-07 | **Advance payments** (cash/UPI/bank) and optional **metal advance** (customer's old gold, adjusted at value or kept as fine weight); every advance is a `Payment` (ref ORDER) or metal movement; **cancellation policy** (setting: refundable %, forfeited making cost) with Owner approval | P0 |
| FR-ORD-08 | **Proof stages** (optional): wax/CAD/photo approval recorded with photo and customer's approval note or WhatsApp confirmation reference | P1 |
| FR-ORD-09 | **Issue to karigar** creates a Job Work issue (VND) moving metal from vault to the karigar account | P0 |
| FR-ORD-10 | **Receive from karigar:** finished weight, purity check, stone check, wastage computed against allowance, labour payable posted, QC pass/fail with reason; pass creates an **InventoryItem** (`RESERVED` for this order) with a tag | P0 |
| FR-ORD-11 | **Delivery:** converts to a normal sale in POS pre-filled from the order, **advance and metal advance adjusted**, weight-difference repricing shown (P-ORD test), customer signs delivery note | P0 |
| FR-ORD-12 | **Delay alerts:** due in 3 days, due today, overdue (customer date) and vendor overdue (vendor date) appear in Follow-ups and dashboard; one-tap WhatsApp/call to vendor or customer | P0 |
| FR-ORD-13 | **Order slip** (A4/80 mm) for the customer: photos, size table, weight and tolerance, promise date, rate policy, advance, cancellation terms, signature; Hindi/English | P0 |
| FR-ORD-14 | **Job card** print for the karigar (no prices): design photos, sizes, weight, metal issued, due date | P0 |
| FR-ORD-15 | Order timeline with photos of work in progress, notes, and customer messages sent | P1 |
| FR-ORD-16 | Order list filters: status, vendor, due window, customer, overdue; ageing view | P0 |
| FR-ORD-17 | Draft autosave and idempotent submit for booking, issue, receive, deliver | P0 |
| FR-ORD-18 | Customer notifications by click-to-chat: booked, proof ready, item ready, reminder to collect; templates editable (bilingual) | P1 |
| FR-ORD-19 | Uncollected orders: after N days (setting) flagged; storage note | P2 |
| FR-ORD-20 | Reports: orders by status/vendor, on-time delivery %, advance held, pending metal at karigar, weight variance by karigar | P1 |

### 5.3 Screens
| ID | Screen |
|---|---|
| **S-100** | Order list (cards on mobile, table on desktop; overdue badge) |
| **S-101** | Order booking wizard: customer → lines (photos, sizes, weight) → time and vendor → price policy and estimate → advance → review, print slip |
| **S-102** | Order detail: stage bar, lines, timeline, payments, metal, documents, actions (issue, receive, deliver, cancel) |
| **S-103** | Receive-from-karigar sheet (weights, QC, wastage, labour) |
| **S-104** | Delivery (opens POS pre-filled, S-30/S-31 in "order delivery" mode) |

### 5.4 Pricing and weight variance (extends TECH §8.2)
```
estimate      = price(targetNetMg, lockedOrTodayRate, making, stone, gst)          // engine of §8.2
finalPrice    = price(actualNetMg, rateByPolicy, making, stone, gst)
weightVariance= actualNetMg − targetNetMg ; withinTolerance = |variance| ≤ targetNetMg × tolBp / 10000
balance       = finalPrice(rounded ₹1) − advancesInPaise − metalAdvanceValue
```
If outside tolerance: delivery needs the customer's acceptance flag and Owner/Manager PIN.

### 5.5 Golden tests
| ID | Case | Expected |
|---|---|---|
| **C1** | 22K, target 12.000 g, rate locked ₹9,500/g, making 12% (1200 bp), GST 3% | metal ₹1,14,000; making ₹13,680; taxable ₹1,27,680; GST ₹3,830.40; total ₹1,31,510.40, **estimate ₹1,31,510** |
| **C2** | Same order, actual net 12.150 g (+150 mg, tolerance 2% = 240 mg), rate locked | metal ₹1,15,425; making ₹13,851; taxable ₹1,29,276; GST ₹3,878.28; total ₹1,33,154.28 → **₹1,33,154**; within tolerance; with advance ₹50,000 **balance ₹83,154** |
| **C3** | Actual net 12.400 g (+400 mg > 240 mg) | outside tolerance, PIN plus customer acceptance required |
| **C4** | `RATE_ON_DELIVERY`, delivery-day rate ₹9,600/g, actual 12.150 g | metal ₹1,16,640; recalculated with same making % and GST; test verifies engine uses delivery rate, not booking rate |
| **C5** | Cancel after karigar issue, policy 80% of advance refundable | refund = 80% of advance; 20% retained as forfeiture entry; karigar metal return required first |
| **C6** | Two operators receive the same order line at once | exactly one succeeds (409), one InventoryItem created |

### 5.6 Behaviour rules
- An order cannot be marked READY until the linked inventory item passes QC.
- Advance cannot exceed the estimate unless Owner approves.
- Delivery requires the balance paid, or a linked Credit, exactly like a normal sale.
- Order-linked items never appear as "available stock" in POS search (status `RESERVED`), except inside the delivery flow of that order.

---

## 6. Module D: Vendors and Job Work (VND)

### 6.1 Requirements
| ID | Requirement | Pri |
|---|---|---|
| FR-VND-01 | **Vendor master:** type (KARIGAR, SUPPLIER, WHOLESALER, REFINER, HALLMARK_CENTRE), name, contact, address, GSTIN/PAN, bank/UPI, specialities (chain, casting, stone-setting…), average lead time, notes, photo/ID | P0 |
| FR-VND-02 | **Job work issue voucher:** metal issued (gross, purity, fine), purpose (order line or stock making), expected finished weight, allowed wastage %, labour rate and basis, due date; prints with signature | P0 |
| FR-VND-03 | **Job work receive voucher:** finished items with weights, purity, stone details, wastage computed, labour payable, QC result; partial receipts allowed; unreturned metal remains on the karigar account | P0 |
| FR-VND-04 | **Vendor metal account:** running fine-weight balance (with vendor / vendor owes / shop owes) per metal | P0 |
| FR-VND-05 | **Vendor money ledger:** labour, purchases, payments, advances, returns; payables ageing | P0 |
| FR-VND-06 | **Stock purchase from supplier:** purchase invoice → creates InventoryItems (with SKU and optional label queue), by piece or by weight; GST input record | P1 |
| FR-VND-07 | **Purchase return** to supplier with reason | P2 |
| FR-VND-08 | **Vendor scorecard:** on-time %, average delay days, average wastage %, rework count | P1 |
| FR-VND-09 | **Vendor delay follow-up** with call/WhatsApp (uses Follow-ups) | P1 |
| FR-VND-10 | Payments to vendors (cash/UPI/bank) as `Payment` with direction OUT, ref VENDOR; Owner and Manager only | P0 |
| FR-VND-11 | Vendor statement PDF (money and metal) | P1 |
| FR-VND-12 | **Vendor-owed metal alert** when a karigar holds metal beyond N days (setting) | P1 |

### 6.2 Screens
| ID | Screen |
|---|---|
| **S-110** | Vendor list |
| **S-111** | Vendor form |
| **S-112** | Vendor 360° (metal balance, money balance, open jobs, scorecard, orders) |
| **S-113** | Job work issue |
| **S-114** | Job work receive |
| **S-115** | Purchase invoice (stock in) |

### 6.3 Wastage rule (pure function `domain/jobwork/wastage.ts`)
```
issuedFine   = round(issuedNetMg × issuedPurityPpt / 1000)
receivedFine = round(receivedNetMg × receivedPurityPpt / 1000)      // finished weight × its purity
wastageMg    = issuedFine − receivedFine   (positive = loss)
allowedMg    = round(issuedFine × allowedBp / 10000)
excessMg     = max(0, wastageMg − allowedMg)                       // karigar owes this in metal or rupees at buy rate
```
Alloy added by the karigar is *inside* finished weight; only fine weight is compared.

| ID | Case | Expected |
|---|---|---|
| **J1** | Issue 10.000 g of 995 gold (fine 9,950 mg). Receive 10.800 g at 916 (fine 9,893 mg). Allowed 3% (298.5, rounds half-up to 299 mg). Labour ₹600/g on finished weight | wastage **57 mg** within allowance, excess **0**; labour **₹6,480** |
| **J2** | Same issue, receive 10.500 g at 916 (fine 9,618 mg) | wastage 332 mg, allowed 299 mg, **excess 33 mg** owed by karigar |
| **J3** | Partial receipt: two of three pieces returned | metal still with karigar equals issued fine minus received fine minus recorded wastage |

### 6.4 Payables and books
Vendor ledger feeds a **Payables** report and the cash/bank book. A simple **Bank book** (UPI/bank in and out, reconciled against statement upload later, P2) is added to Finance as S-37.

---

## 7. Module E: Repairs and Services (REP)

| ID | Requirement | Pri |
|---|---|---|
| FR-REP-01 | **Repair ticket** with token number: customer, item description and photos, condition notes, weight in, service (resize, polish, solder, re-thread, stone reset, other), estimate, promised date | P0 |
| FR-REP-02 | Optional issue to karigar (Job Work) or in-house completion, weight out, metal added/lost | P1 |
| FR-REP-03 | Charges, advance, payment; small invoice/receipt (job-work GST rate from settings) | P0 |
| FR-REP-04 | Status: RECEIVED → IN_PROGRESS → READY → DELIVERED, with WhatsApp ready message; uncollected alerts | P0 |
| FR-REP-05 | Ticket slip print with signature and **weight-in** so disputes are avoided | P0 |

Screens: **S-120** list, **S-121** ticket form, **S-122** detail. Test **R1**: weight-in 8.250 g, weight-out 8.230 g, metal loss 20 mg recorded and shown on the receipt.

---

## 8. Module F: Approval / Memo and Estimates (APR)

| ID | Requirement | Pri |
|---|---|---|
| FR-APR-01 | **Estimate/quotation** from the pricing engine (no stock change), valid-until date, share as PDF/WhatsApp, convert to sale | P1 |
| FR-APR-02 | **On-approval memo:** items handed to a customer or trader; status `ON_APPROVAL`, return-by date, deposit optional | P1 |
| FR-APR-03 | Return or convert to a sale; overdue memos flagged; item availability blocked meanwhile | P1 |

Screens: **S-130** estimates, **S-131** memos. New `ItemStatus`: `ON_APPROVAL`, `RESERVED`.

---

## 9. Module G: Hallmark (HUID) batches (HLM)

| ID | Requirement | Pri |
|---|---|---|
| FR-HLM-01 | Select items (new stock and order pieces), create a **hallmark batch** for a centre (VND type HALLMARK_CENTRE), print list, record send weight | P1 |
| FR-HLM-02 | On return: HUID entered/scanned per item, weight-after, **loss**, status; items become sellable only when HUID present if setting `require_huid_for_sale` is on | P1 |
| FR-HLM-03 | Batch charges and centre ledger (VND-05) | P1 |

Screen **S-140** hallmark batches.

---

## 10. Module H: Compliance guard rails (CMP)

All values are **Settings** with documented defaults to be confirmed by your CA. The engine warns or blocks; Owner PIN can override where the law permits, with the override logged.

| ID | Requirement | Pri |
|---|---|---|
| FR-CMP-01 | **PAN / Form 60 capture** when a cash sale or purchase crosses the configured threshold; stored with the customer | P0 |
| FR-CMP-02 | **Cash receipt/payment limit** guard per transaction/day/customer (setting); split payment suggestion | P0 |
| FR-CMP-03 | **GST flags** on purchase from unregistered person (reverse-charge marker), HSN per item, input/output summary for the CA | P1 |
| FR-CMP-04 | **Seller KYC completeness** check before saving an old purchase; photo, ID, declaration mandatory | P0 |
| FR-CMP-05 | **Pawnbroker rules** (licence number on slips, max rate, notice periods) already settings; add a compliance checklist page (S-82) showing what is configured and what is missing | P1 |
| FR-CMP-06 | **Suspicious pattern flags** (repeat seller, many small cash transactions just under a limit) shown to the Owner, never auto-reported | P1 |
| FR-CMP-07 | Retention rule: KYC and voucher records kept per policy (setting, default 8 years); never physically deleted | P0 |

---

## 11. Modules I, J, K and platform extras

**I. Engagement (ENG, P2)**
- FR-ENG-01 Birthday/anniversary list today and next 7 days with one-tap WhatsApp greeting (Hindi/English templates).
- FR-ENG-02 Broadcast list builder (tags, purchase recency, girvi due) that opens WhatsApp click-to-chat one by one; no bulk API in v1.
- FR-ENG-03 Daily rate message generator for WhatsApp status/share.

**J. Gold Savings Scheme (SCH, P2)** Enrol customer, monthly instalments (`Payment` ref SCHEME), bonus rules (settings), maturity redemption as a sale credit, defaulter list. Screens S-150..S-152. Tests: S1 (11 instalments plus shop bonus at maturity), S2 (missed instalment and grace).

**K. Bulk / lot stock (INV ext., P1)** Item can be `TRACKING = UNIQUE | LOT`. Lot items have quantity and total weight; POS sale of a lot line deducts quantity/weight atomically (conditional UPDATE on remaining). Barcode applies to the lot, not each piece.

**Platform extras**
- FR-PLT-14 (P0) `shopId` column on all master and transaction tables (default single shop) so a second branch later is a configuration, not a rewrite.
- FR-PLT-15 (P1) **Daily rate helper:** optional live-rate lookup (if licensed API chosen) prefilling the rates screen; manual entry always wins.
- FR-PLT-16 (P1) **WhatsApp click-to-chat template library** shared by credit, girvi, orders, repairs, engagement.
- FR-PLT-17 (P1) **Staff activity and incentives (basic):** sales by staff, discount given by staff, optional incentive percent report.
- FR-PLT-18 (P0) **Notification centre:** unified feed of due/overdue across credit, girvi, orders, repairs, memos, karigar metal (extends S-05 Follow-ups).

---

## 12. Changes to existing documents (exact merge map)

### 12.1 PRD (`01_PRD.md`)
- §1 Non-goals: **remove** "karigar/supplier ledgers" and "gold savings schemes" from non-goals only for Release 2/3 respectively; keep "multi-branch" non-goal.
- §2 Roles: add **Karigar/Vendor** as a record, not a user; Accountant gets read access to vendor ledgers.
- §4 Scope map: add Old Purchase, Metal Ledger, Orders, Vendors, Repairs to the diagram.
- §5: add sections **5.9 OJP · 5.10 MTL · 5.11 ORD · 5.12 VND · 5.13 REP · 5.14 APR · 5.15 HLM · 5.16 CMP · 5.17 ENG/SCH/INV-ext**, copied from this addendum. FR-POS-11 changes to: "Old gold exchange uses OJP voucher (FR-OJP-\*)".
- §7 add journeys **J7 to J10** (below).
- §9 add open questions **10 to 16** (below).
- §10 milestones: add **M11 to M15** (below); Release plan updated (below).

### 12.2 DESIGN (`02_DESIGN.md`)
- §3.1 mobile "More" sheet: add Orders, Repairs, Vendors, Old Purchase (Sell tab long-press gets "Old gold buy").
- §3.2 desktop sidebar:
```
Sell ▸ POS · Invoices · Old purchase · Returns · Estimates · Memos
Orders ▸ All orders · New order · Repairs
Vendors ▸ Vendors · Job work · Metal ledger · Purchases · Hallmark
Finance ▸ Rates · Cash book · Bank book · Expenses · Day close
Settings ▸ Shop · Interest · Compliance · Users · Backups · Data health
```
- §3.3 add screens S-82, S-90..94, S-100..104, S-110..115, S-120..122, S-130..131, S-140, S-150..152, S-37.
- §5 new components: **C-30 SizeSpecForm** (category-driven sizing inputs with unit toggle), **C-31 StageBar** (order stages), **C-32 PhotoStrip** (up to 6 with reorder and full-screen), **C-33 WeightVarianceMeter**, **C-34 FineWeightCard** (gross/net/purity/fine/rate/payable live card), **C-35 SignaturePad** (touch signature, fallback print), **C-36 VendorPicker**, **C-37 DueBadge** (due today, overdue, N days).
- §9 documents: purchase voucher, order slip, job card, job work issue/receive voucher, repair token, estimate, memo, hallmark list.
- §12 new empty states and errors (unknown vendor, no rate, KYC incomplete, cash limit reached).

### 12.3 TECH (`03_TECH.md`)
- §7: add the Prisma block in §13 of this addendum.
- §8: add engines `oldgold/valuation`, `metal/ledger`, `orders/pricing`, `jobwork/wastage`; golden tests **O1–O5, C1–C6, J1–J3, R1, S1–S2** to §8.7.
- §9: add endpoints (§14 below); extend the sale transaction: *step 3b* if the sale is an order delivery, set the reserved item to SOLD (`WHERE status='RESERVED' AND orderLineId=?`).
- §10 permission matrix (below).
- §14 cron: add `order-due-alerts`, `memo-overdue`, `vendor-metal-age`, `birthday-list`.
- §19 traceability: add rows for the new groups.

---

## 13. Schema additions (Prisma, MySQL)

```prisma
// New enums (extend existing PayRefType, ItemStatus, MoveType)
// PayRefType += OLD_PURCHASE ORDER VENDOR REPAIR SCHEME ESTIMATE_DEPOSIT
// ItemStatus += ON_APPROVAL RESERVED
// MoveType   += OLD_PURCHASE ORDER_RESERVE ORDER_RELEASE APPROVAL_OUT APPROVAL_IN HALLMARK_OUT HALLMARK_IN
enum VendorType   { KARIGAR SUPPLIER WHOLESALER REFINER HALLMARK_CENTRE }
enum TestMethod   { TOUCH XRF FIRE_ASSAY HUID CLAIMED }
enum Disposition  { MELT RESALE KARIGAR RETURN_TO_SELLER }
enum OrderStatus  { DRAFT BOOKED DESIGN_APPROVED SENT_TO_KARIGAR IN_PROGRESS RECEIVED_QC HALLMARKING READY DELIVERED CANCELLED ON_HOLD }
enum PricePolicy  { RATE_LOCKED RATE_ON_DELIVERY }
enum MetalAcct    { VAULT VENDOR MELT CUSTOMER }
enum RepairStatus { RECEIVED IN_PROGRESS READY DELIVERED CANCELLED }
enum Tracking     { UNIQUE LOT }

model Vendor {
  id String @id @default(cuid()) shopId String @default("main")
  code String @unique @db.VarChar(20) type VendorType name String @db.VarChar(120)
  phone String? @db.VarChar(15) altPhone String? @db.VarChar(15) address String? @db.Text
  gstin String? @db.VarChar(15) pan String? @db.VarChar(10) upi String? @db.VarChar(80) bankJson Json?
  specialities Json? avgLeadDays Int? notes String? @db.Text active Boolean @default(true)
  createdById String createdAt DateTime @default(now()) deletedAt DateTime?
  @@index([type, active]) @@index([name])
}

// Append-only fine-weight ledger
model MetalMovement {
  id String @id @default(cuid()) shopId String @default("main")
  date DateTime @db.Date at DateTime @default(now(3))
  metal Metal acctType MetalAcct acctId String? @db.VarChar(40)
  direction Direction                                  // IN to account, OUT from account
  grossMg Int netMg Int purityPpt Int fineMg Int
  refType String @db.VarChar(20) refId String @db.VarChar(40) reason String? @db.VarChar(255)
  reversedOfId String? byUserId String
  @@index([acctType, acctId, metal]) @@index([refType, refId]) @@index([date])
}

// ── Old jewellery purchase ──
model OldPurchase {
  id String @id @default(cuid()) shopId String @default("main")
  voucherNo String @unique @db.VarChar(24) date DateTime @db.Date
  customerId String saleId String? creditId String? girviId String?
  sellerPhotoFileId String? idProofFileId String? declarationText String? @db.Text signatureFileId String?
  panOrForm60 String? @db.VarChar(20) reverseCharge Boolean @default(false) gstin String? @db.VarChar(15)
  totalValuePaise BigInt adjustedPaise BigInt @default(0) payablePaise BigInt
  status String @default("COMPLETED") @db.VarChar(12)    // COMPLETED | REVERSED
  holdUntil DateTime? idempotencyKey String @unique @db.VarChar(64)
  createdById String createdAt DateTime @default(now())
  lines OldPurchaseLine[]
  @@index([customerId, date])
}
model OldPurchaseLine {
  id String @id @default(cuid()) purchaseId String articleType String @db.VarChar(40) description String? @db.VarChar(160)
  metal Metal qty Int @default(1) grossMg Int stoneMg Int @default(0) otherDeductMg Int @default(0) netMg Int
  claimedPurityPpt Int? testedPurityPpt Int testMethod TestMethod testerName String? @db.VarChar(80) testPhotoFileId String?
  deductionBp Int deductionReason String? @db.VarChar(120)
  fineMg Int fineNetMg Int fineRatePaisePerGram BigInt valuePaise BigInt
  disposition Disposition disposedRefType String? @db.VarChar(20) disposedRefId String? @db.VarChar(40)
  photoFileIds Json?
  purchase OldPurchase @relation(fields: [purchaseId], references: [id]) @@index([purchaseId]) @@index([disposition])
}
model MeltBatch {
  id String @id @default(cuid()) batchNo String @unique @db.VarChar(24) metal Metal openedAt DateTime @default(now())
  inputGrossMg Int inputFineMg Int outputMg Int? outputPurityPpt Int? outputFineMg Int? lossFineMg Int?
  outcome String? @db.VarChar(20)      // TO_VAULT | SOLD_REFINER | TO_KARIGAR
  refinerVendorId String? status String @default("OPEN") @db.VarChar(8) closedAt DateTime? byUserId String
  lines MeltBatchLine[]
}
model MeltBatchLine { id String @id @default(cuid()) batchId String purchaseLineId String @unique fineMg Int
  batch MeltBatch @relation(fields: [batchId], references: [id]) }

// ── Orders ──
model SizeSchema { id String @id @default(cuid()) category String @unique @db.VarChar(40) fields Json leadDays Int @default(15) tolBp Int @default(200) }
model CustomOrder {
  id String @id @default(cuid()) shopId String @default("main")
  orderNo String @unique @db.VarChar(24) customerId String bookedOn DateTime @db.Date
  requestedDate DateTime @db.Date promisedDate DateTime @db.Date urgent Boolean @default(false)
  pricePolicy PricePolicy lockedNote String? @db.VarChar(120) status OrderStatus @default(BOOKED)
  estimatePaise BigInt advancePaise BigInt @default(0) metalAdvanceFineMg Int @default(0) cancelPolicyBp Int?
  saleId String? notes String? @db.Text idempotencyKey String @unique @db.VarChar(64)
  createdById String createdAt DateTime @default(now()) updatedAt DateTime @updatedAt
  lines OrderLine[] events OrderEvent[]
  @@index([customerId, status]) @@index([promisedDate, status])
}
model OrderLine {
  id String @id @default(cuid()) orderId String category String @db.VarChar(40) description String @db.Text
  metal Metal purityPpt Int qty Int @default(1) sizeSpec Json                 // validated by SizeSchema
  targetNetMg Int tolBp Int stoneMg Int @default(0) makingType MakingType makingValue BigInt stoneChargePaise BigInt @default(0)
  lockedRatePaisePerGram BigInt? refPhotoFileIds Json? refItemId String?
  vendorId String? vendorPromisedDate DateTime? @db.Date labourRatePaise BigInt? allowedWastageBp Int?
  status OrderStatus @default(BOOKED) receivedItemId String? actualNetMg Int? qcPassed Boolean?
  order CustomOrder @relation(fields: [orderId], references: [id]) @@index([vendorId, status])
}
model OrderEvent { id String @id @default(cuid()) orderId String lineId String? type String @db.VarChar(30)
  fromStatus OrderStatus? toStatus OrderStatus? promisedDate DateTime? @db.Date note String? @db.VarChar(255)
  photoFileIds Json? reversedOfId String? byUserId String at DateTime @default(now())
  order CustomOrder @relation(fields: [orderId], references: [id]) @@index([orderId, at]) }

// ── Job work and vendor books ──
model JobWork {
  id String @id @default(cuid()) shopId String @default("main") jobNo String @unique @db.VarChar(24)
  vendorId String orderLineId String? purpose String @db.VarChar(20)       // ORDER | STOCK | REPAIR
  metal Metal issuedGrossMg Int issuedNetMg Int issuedPurityPpt Int issuedFineMg Int
  expectedMg Int? allowedWastageBp Int labourBasis MakingType labourValue BigInt dueDate DateTime @db.Date
  status String @default("OPEN") @db.VarChar(10)                             // OPEN | PARTIAL | CLOSED
  issuedOn DateTime @db.Date byUserId String createdAt DateTime @default(now())
  receipts JobWorkReceipt[]
  @@index([vendorId, status])
}
model JobWorkReceipt {
  id String @id @default(cuid()) jobId String date DateTime @db.Date
  receivedNetMg Int receivedPurityPpt Int receivedFineMg Int wastageFineMg Int excessFineMg Int
  labourPaise BigInt qcPassed Boolean qcNote String? @db.VarChar(255) itemIds Json? byUserId String
  job JobWork @relation(fields: [jobId], references: [id]) @@index([jobId])
}
model VendorLedger {                                   // append-only money book with a vendor
  id String @id @default(cuid()) vendorId String date DateTime @db.Date
  type String @db.VarChar(16)                          // LABOUR PURCHASE PAYMENT ADVANCE RETURN ADJUSTMENT
  amountPaise BigInt                                   // + shop owes vendor, − vendor owes shop
  refType String? @db.VarChar(20) refId String? @db.VarChar(40) paymentId String? note String? @db.VarChar(255)
  reversedOfId String? byUserId String at DateTime @default(now())
  @@index([vendorId, date])
}
model PurchaseInvoice {
  id String @id @default(cuid()) purchaseNo String @unique @db.VarChar(24) vendorId String vendorInvoiceNo String? @db.VarChar(40)
  date DateTime @db.Date subtotalPaise BigInt gstPaise BigInt totalPaise BigInt paidPaise BigInt @default(0)
  itemIds Json? byUserId String createdAt DateTime @default(now()) @@index([vendorId, date])
}

// ── Repairs ──
model RepairTicket {
  id String @id @default(cuid()) tokenNo String @unique @db.VarChar(24) customerId String receivedOn DateTime @db.Date
  promisedDate DateTime @db.Date itemDesc String @db.VarChar(200) weightInMg Int weightOutMg Int? conditionNote String? @db.Text
  service String @db.VarChar(40) estimatePaise BigInt finalPaise BigInt? advancePaise BigInt @default(0)
  jobWorkId String? status RepairStatus @default(RECEIVED) photoFileIds Json? createdById String createdAt DateTime @default(now())
  @@index([customerId, status]) @@index([promisedDate, status])
}

// ── Approval, estimate, hallmark ──
model Memo { id String @id @default(cuid()) memoNo String @unique @db.VarChar(24) customerId String? partyName String? @db.VarChar(120)
  outOn DateTime @db.Date returnBy DateTime @db.Date depositPaise BigInt @default(0) status String @default("OUT") @db.VarChar(12)
  itemIds Json byUserId String createdAt DateTime @default(now()) @@index([status, returnBy]) }
model Estimate { id String @id @default(cuid()) estimateNo String @unique @db.VarChar(24) customerId String?
  validUntil DateTime @db.Date payload Json totalPaise BigInt convertedSaleId String? byUserId String createdAt DateTime @default(now()) }
model HallmarkBatch { id String @id @default(cuid()) batchNo String @unique @db.VarChar(24) centreVendorId String
  sentOn DateTime @db.Date receivedOn DateTime? @db.Date itemIds Json sentWeightMg Int receivedWeightMg Int? lossMg Int?
  chargesPaise BigInt? status String @default("SENT") @db.VarChar(10) byUserId String }

// ── Savings scheme (P2) ──
model Scheme { id String @id @default(cuid()) name String @db.VarChar(80) months Int instalmentPaise BigInt bonusRule Json active Boolean @default(true) }
model SchemeAccount { id String @id @default(cuid()) accountNo String @unique @db.VarChar(24) schemeId String customerId String
  startDate DateTime @db.Date status String @default("ACTIVE") @db.VarChar(10) redeemedSaleId String? }

// ── Extensions to existing models ──
// InventoryItem += tracking Tracking @default(UNIQUE), qtyLot Int?, lotWeightMg Int?, source String? (PURCHASE|OLD_PURCHASE|ORDER|KARIGAR), sourceRefId String?, orderLineId String?, shopId String @default("main")
// Customer      += panOrForm60 String? @db.VarChar(20)
// SaleItem      += orderLineId String?
// Sale          += orderId String?, oldPurchaseId String?
// OldGoldPurchase (existing table): replaced by OldPurchase + OldPurchaseLine; migration copies any existing rows.
```

**Migration note:** the existing `OldGoldPurchase` model is superseded. If the old model has no rows yet (M5 not built), delete it from the schema in the same migration.

---

## 14. API additions (`/api/v1`, ★ = Idempotency-Key)

| Resource | Endpoints | FR |
|---|---|---|
| Old purchase | `GET/POST /old-purchases` ★, `GET /old-purchases/:id`, `POST /old-purchases/:id/reverse` ★, `GET /old-purchases/:id/voucher.pdf`, `POST /old-purchases/value` (dry-run valuation) | OJP |
| Melt | `GET/POST /melt-batches`, `POST /melt-batches/:id/close` ★ | OJP-08 |
| Metal | `GET /metal/balances?acct=`, `GET /metal/movements`, `POST /metal/adjust` ★ (Owner) | MTL |
| Orders | `GET/POST /orders` ★, `GET/PATCH /orders/:id`, `POST /orders/:id/advance` ★, `/issue` ★, `/receive` ★, `/status`, `/revise-date`, `/cancel` ★, `/deliver` ★ (creates sale), `GET /orders/:id/slip.pdf`, `/jobcard.pdf` | ORD |
| Size schema | `GET/PUT /size-schemas` | ORD-02 |
| Vendors | `GET/POST/PATCH /vendors`, `GET /vendors/:id/360`, `/ledger`, `/statement.pdf`, `POST /vendors/:id/payments` ★ | VND |
| Job work | `GET/POST /job-work` ★, `POST /job-work/:id/receive` ★ | VND-02,03 |
| Purchases | `GET/POST /purchase-invoices` ★ | VND-06 |
| Repairs | `GET/POST /repairs` ★, `PATCH /repairs/:id`, `POST /repairs/:id/deliver` ★ | REP |
| Memo/Estimate | `GET/POST /memos` ★, `POST /memos/:id/return`, `/convert`; `GET/POST /estimates`, `POST /estimates/:id/convert` | APR |
| Hallmark | `GET/POST /hallmark-batches`, `POST /hallmark-batches/:id/receive` ★ | HLM |
| Compliance | `GET /compliance/check?type&amount&mode&customerId`, `GET /compliance/status` | CMP |
| Engagement | `GET /engagement/birthdays`, `/rate-message` | ENG |
| Notifications | `GET /notifications` (unified due/overdue feed) | PLT-18 |

**Old purchase transaction (inside one DB transaction):** 1. idempotency; 2. compliance check (KYC complete, PAN if needed, cash limit); 3. server-side valuation per line (never trust client); 4. insert voucher + lines; 5. metal movements IN to `VAULT` or `MELT`/`VENDOR` per disposition; 6. `RESALE` lines create InventoryItem (source OLD_PURCHASE); 7. payments OUT and/or link adjustments (sale/credit/girvi events); 8. audit; 9. commit.

**Order delivery transaction:** verify QC passed and item `RESERVED` for this line (conditional UPDATE to `SOLD`), price by policy, subtract advances, run standard sale steps, close order, audit.

---

## 15. Permission matrix additions

| Action | Owner | Manager | Staff | Accountant |
|---|---|---|---|---|
| Create old purchase | ✔ | ✔ | ✔ (within value limit) | — |
| Override buy rate / deduction | ✔ | PIN | — | — |
| Reverse old purchase | ✔ | — | — | — |
| Metal adjustment, vault stock take | ✔ | — | — | — |
| Book/edit order, take advance | ✔ | ✔ | ✔ | — |
| Cancel order with refund | ✔ | ✔ (PIN) | — | — |
| Issue/receive job work | ✔ | ✔ | — | — |
| Vendor payments, vendor ledger | ✔ | ✔ | — | read |
| Vendor scorecard, cost data | ✔ | if allowed | — | read |
| Repairs, memos, estimates | ✔ | ✔ | ✔ | read |
| Hallmark batches | ✔ | ✔ | ✔ | read |
| Compliance settings | ✔ | — | — | — |

---

## 16. New user journeys (acceptance scenarios)

**J7: Buy old gold (phone).** Staff opens Old purchase → seller found by phone → live photo, ID, declaration signed on screen → 2 articles weighed, stone deducted, tested purity 900 → value card shows fine weight and payable → pays ₹60,000 UPI and rest cash within limit → chooses MELT → voucher printed. *Result:* metal IN to melt account, payments OUT, audit written. Mid-flow refresh resumes at the same step.

**J8: Custom order booking.** Cashier opens New order → customer via quick-add → line 1 "Gold ring 22K", size 16 IN, engraving "R♥S", target 6.500 g ±2% → line 2 "Chain 22K", length 20 in, width 3 mm, target 18 g → assigns karigar, vendor date and customer date → estimate shown → ₹50,000 advance → order slip printed and WhatsApp sent. *Result:* order BOOKED, advance ledger entry, reminders scheduled.

**J9: Karigar cycle.** Manager issues 26 g metal against the order → job card printed → karigar returns pieces → Manager weighs, QC pass, wastage within allowance → items tagged and reserved → status READY → WhatsApp "ready to collect" → delivery through POS with advance adjusted and weight variance shown → invoice signed.

**J10: Delay follow-up.** Owner opens Follow-ups: 2 orders due in 3 days, 1 karigar overdue by 4 days, 1 memo overdue → taps call on the karigar, logs a new vendor date (original kept) → customer informed by WhatsApp template.

---

## 17. New open questions for the Owner (answer before the milestone shown)

| # | Question | Blocks |
|---|---|---|
| 10 | How do you currently test purity (touch, XRF machine)? Which rate basis do you buy old gold on (fine 24K rate, or by purity)? Standard melt deduction %? | M12 |
| 11 | Do you keep a written ownership declaration from sellers today? Wet signature or on-screen? | M12 |
| 12 | Cash limits and PAN threshold your CA advises; GST treatment of old purchases (reverse charge)? | M12 |
| 13 | Order rate policy: lock at booking, at delivery, or your choice each time? Advance cancellation rule? | M13 |
| 14 | List of categories with sizing details you need (ring size system, bangle size numbers, chain length in inches or cm)? | M13 |
| 15 | Karigars: how many, in-house or outside? Is metal issued as fine, or as 22K? Agreed wastage % and labour basis (per gram or per piece)? | M13 |
| 16 | Do you send items for hallmarking? Which centre? Do you do repairs, and what charge structure? | M14 |
| 17 | Do you run savings schemes now? Terms? | M15 |

---

## 18. Milestones and release plan

| Code | Milestone | Key requirements | Exit test |
|---|---|---|---|
| **M11** | Metal Ledger and Vendor master (foundation) | MTL-01..06, VND-01, VND-04, VND-05, VND-10, PLT-14 | Metal balances reconcile after 100 random movements; vendor money and metal ledgers correct; negative balance blocked |
| **M12** | **Old Jewellery Purchase**, melt batches, compliance guards | OJP-01..14, CMP-01,02,04,07 | Tests O1–O5 pass; J7 passes at 360 px; POS exchange (POS-11) uses the OJP voucher; cash-limit and KYC blocks work |
| **M13** | **Custom Orders**, job work issue/receive, order delivery through POS | ORD-01..20, VND-02,03,08,09,11,12 | Tests C1–C6, J1–J3 pass; J8, J9, J10 pass; two parallel receives give one item |
| **M14** | Repairs, Approval/Estimate, Hallmark, Purchase invoices, Lot stock | REP-01..05, APR-01..03, HLM-01..03, VND-06, INV-lot | R1 passes; memo blocks sale of on-approval item; HUID gate enforced |
| **M15** | Engagement, Savings scheme, Notification centre, Staff report | ENG-01..03, SCH-*, PLT-15..18 | S1–S2 pass; notification centre lists all overdue sources |

**Recommended order:** M0–M5 as planned → **M12 (with the minimum of M11)** before go-live because old gold arrives from day one → M6, M7 → Release 1 go-live → M8, M9 → M11 (rest), M13 → M14 → M15.

**Release plan (updated)**
- **Release 1 (go-live):** M0–M7 + M11 (metal ledger, vendor master) + M12 (old jewellery purchase).
- **Release 2:** M8–M9, M13 (custom orders and job work), M14.
- **Release 3:** M15 and other Phase 2 ideas.

---

## 19. `00_PROGRESS.md` rows to paste (status ☐)

**Decisions log**
| Date | Decision | Docs updated |
|---|---|---|
| 2026-09-28 | Addendum 05 proposed: OJP, MTL, ORD, VND, REP, APR, HLM, CMP, ENG, SCH; milestones M11–M15 | pending approval |

**Milestones**
| M11 | Metal Ledger and Vendor master | ☐ |
| M12 | Old Jewellery Purchase and compliance guards | ☐ |
| M13 | Custom Orders and job work | ☐ |
| M14 | Repairs, approval/estimate, hallmark, lot stock | ☐ |
| M15 | Engagement, schemes, notification centre | ☐ |

**Requirement groups** (one row per ID as in the existing tracker)
- Old Purchase FR-OJP-01..14 → M12 (P0: 01–06, 08–10, 13; P1: 07, 11, 12, 14) · tests O1–O5
- Metal Ledger FR-MTL-01..06 → M11 · test: reconciliation
- Orders FR-ORD-01..20 → M13 (P2: 19) · tests C1–C6
- Vendors FR-VND-01..12 → M11 (01, 04, 05, 10) / M13 (02, 03, 08, 09, 11, 12) / M14 (06, 07) · tests J1–J3
- Repairs FR-REP-01..05 → M14 · test R1
- Approval FR-APR-01..03 → M14
- Hallmark FR-HLM-01..03 → M14
- Compliance FR-CMP-01..07 → M12 (01, 02, 04, 07) / M14 (03, 05, 06)
- Engagement FR-ENG-01..03, Schemes FR-SCH-* → M15
- Platform FR-PLT-14 → M11 · FR-PLT-15..18 → M15

**Audit/Sync-check history:** add a row "Addendum merged into 01/02/03" once approved.

---

## 20. Prompt pack additions (for `04_ANTIGRAVITY_PROMPTS.md`)

**Change-request prompt to start with (paste as-is):**
```
CHANGE REQUEST: Merge docs/05_ADDENDUM_MODULES.md into docs/01_PRD.md, 02_DESIGN.md, 03_TECH.md and 04_ANTIGRAVITY_PROMPTS.md using the merge map in §12. Do not write code. Show diffs for every file, list conflicts with existing text (for example FR-POS-11, the OldGoldPurchase table, PRD non-goals), list schema migrations needed and their effect on completed milestones. Wait for "approved". After approval update the four docs and docs/00_PROGRESS.md, then run the SYNC CHECK.
```

**M11**
```
MILESTONE M11: Metal Ledger and Vendor master. READ: addendum §4, §6.1 (VND-01,04,05,10), §13 (Vendor, MetalMovement, VendorLedger), §14 (metal, vendors), TECH §6, §9.
INCLUDE: Vendor CRUD with roles; append-only MetalMovement with server-side balance checks (transaction + row lock on the account/metal counter); vendor money ledger; S-94 metal ledger, S-110..112 (basic); PLT-14 shopId on new tables; audit and idempotency.
EXIT TEST: 100 randomised movements reconcile to expected balances; negative balance blocked; permissions test for Staff.
DO NOT: build old purchase or orders yet.
```

**M12**
```
MILESTONE M12: Old Jewellery Purchase. READ: addendum §3, §10, §13, §14 (old purchase transaction), TECH §8, PRD FR-POS-11, DESIGN S-34, S-90..S-93, C-21, C-34, C-35.
FIRST: ask me the open questions 10 to 12; record answers in docs/00_PROGRESS.md.
INCLUDE: valuation as a pure function with golden tests O1..O5; 5-step wizard with seller KYC, declaration and signature, per-line testing, live FineWeightCard, disposition, payment (including cash limit and PAN guard); melt batches; voucher print A4/80mm; POS old-gold exchange now creates/links an OJP voucher; reversal by Owner; drafts and idempotency.
EXIT TEST: O1..O5 pass; J7 passes at 360px including a mid-wizard refresh; RESALE line appears in inventory with source OLD_PURCHASE; MELT lines create metal movements that reconcile with S-93.
```

**M13**
```
MILESTONE M13: Custom Orders and job work. READ: addendum §5, §6, §13, §14, TECH §8.2, §9 (sale transaction), DESIGN S-100..S-104, S-113, S-114, C-30..C-33, C-36, C-37.
FIRST: ask me open questions 13 to 15.
INCLUDE: SizeSchema editor and typed sizing forms; order booking wizard with photos, estimate and advance; vendor assignment; issue/receive job work with wastage engine (tests J1..J3); QC and item creation as RESERVED; delivery through POS with advances adjusted and weight variance rule (tests C1..C6); order slip and job card prints; delay alerts in Follow-ups; WhatsApp templates; drafts and idempotency; revised-date history preserved.
EXIT TEST: C1..C6 and J1..J3 pass; J8, J9, J10 pass at 360px; two simultaneous receives create exactly one item; a RESERVED item cannot be sold in normal POS.
```

**M14 / M15** follow the same template with the requirement lists in §18.

---

## 21. Risks introduced and mitigations

| Risk | Mitigation |
|---|---|
| Metal accounting errors (fine-weight rounding) | Pure functions, golden tests O1–O2, J1–J3, monthly vault stock take |
| Fraud through old-gold buying (stolen goods) | Mandatory KYC, declaration, photo, hold period, repeat-seller flags, audit |
| Order disputes on weight/size | Size table on the slip signed by the customer, tolerance rule, photo timeline |
| Legal misconfiguration | All thresholds are settings; Compliance page shows what is unconfirmed; CA sign-off before go-live |
| Scope creep delaying go-live | Only M11 (minimum) and M12 are on the go-live path; the rest is Release 2/3 |
