# 04 · Antigravity Prompt Pack (synchronized build)
**Purpose:** make the agent build NJMS from the three documents, in small verified steps, keeping docs and code in step.
**Read with:** `01_PRD.md` · `02_DESIGN.md` · `03_TECH.md` · `00_PROGRESS.md`

---

## 0. Workspace setup (do once)

1. Create a folder `njms/` and open it in Antigravity as the workspace.
2. Put these files in place:
```
njms/
├─ docs/
│  ├─ 00_PROGRESS.md            ← living tracker (agent updates it)
│  ├─ 01_PRD.md  02_DESIGN.md  03_TECH.md  04_ANTIGRAVITY_PROMPTS.md
│  └─ appendix/                 ← Essential Functionality Blueprint (A), Reports Module Blueprint (B)
├─ legacy/
│  └─ barcode-generator/        ← unzip Barcode_generator_WEB_APP.zip here (read-only reference; do not edit)
└─ (source code will be created by the agent)
```
3. Delete `legacy/barcode-generator/.env.local` (it holds an unused key placeholder) and never commit any `.env`.
4. Save **§1 Rules** as a workspace rule so it applies to every conversation. Antigravity supports workspace rules and workflows (commonly under `.agent/rules/` and `.agent/workflows/`; the menu names can differ by version). If you can't find the rules panel, save the text as `AGENTS.md` in the project root **and** paste it as the first message of each new conversation.
5. Keep the three docs and `00_PROGRESS.md` open in editor tabs. Reference them in prompts by path, e.g. `docs/03_TECH.md §8`.
6. Work **one milestone per conversation**. Ask the agent to produce a plan first, review it, then say "approved, proceed". Commit after each milestone.
7. Never paste real passwords, database credentials or customer data into prompts. Use a local MySQL (Docker) for development. Production credentials go only into Hostinger's hPanel.

---

## 1. Rules (save as a workspace rule / AGENTS.md)

```
PROJECT: Narayan Jewellers Management System (NJMS)
SOURCES OF TRUTH (read before any work, re-read the relevant section before each task):
  docs/01_PRD.md      = WHAT and WHY (requirements FR-*, NFR-*, journeys J*)
  docs/02_DESIGN.md   = HOW IT LOOKS/BEHAVES (screens S-*, components C-*, mobile-first rules)
  docs/03_TECH.md     = HOW IT IS BUILT (stack, schema, formulas, APIs, hosting)
  docs/00_PROGRESS.md = STATUS tracker (you keep it updated)

SYNC RULES
1. Do not invent requirements, fields, screens, formulas, endpoints or libraries. If something is missing or ambiguous, STOP and ask.
2. If the three docs conflict, STOP and report the conflict; do not choose silently.
3. If you believe a doc should change, propose the exact edit, wait for approval, update ALL affected docs, then change code. Docs first, code second.
4. Every source file begins with: // Implements: FR-XXX-nn | Screen: S-nn | Component: C-nn | Doc: 03_TECH §n
5. After each task update docs/00_PROGRESS.md (status, files, tests, commit) in the same change.
6. Work only on the current milestone (M0..M10). Do not start later milestones.

ENGINEERING RULES
- Stack per docs/03_TECH.md §3 (Next.js App Router + TypeScript strict, Prisma + MySQL, Tailwind build-time, zod, TanStack Query, Zustand, Dexie).
- Layering: app/api -> server/services -> domain (pure) + repositories. UI never imports server/*. domain/* has no I/O.
- Money = integer paise (BIGINT), weight = integer mg, percentages = basis points. NEVER floats for money or weight.
- Ledgers (payments, credit/girvi events, stock movements) are append-only; fix mistakes with reversal entries and a reason.
- Every multi-step write runs in one DB transaction and writes an audit_log row. Every money/stock POST honours Idempotency-Key.
- Enforce permissions on the server; the UI only hides.
- All rules (rates, GST, LTV, notice periods, label sizes) come from settings, not constants.
- No secrets in code, logs or prompts. No .env committed. No real customer data in tests.

MOBILE-FIRST RULES (docs/02_DESIGN.md §2)
- Build the 360px layout first, then sm/md/lg/xl. Bottom tab bar on mobile, sidebar on lg+.
- Lists become cards on mobile, tables on lg+. No horizontal page scroll. Touch targets >= 44px. Inputs font-size >= 16px.
- Use dvh and safe-area insets. Never disable zoom. Sticky action bars must respect the on-screen keyboard.
- Lazy-load heavy libraries (PDF, Excel, ZIP, camera scanner).

QUALITY GATES (a task is NOT done until all pass)
- Requirements implemented and mapped in docs/00_PROGRESS.md
- npm run lint, tsc --noEmit, unit tests pass; domain code has tests (golden tests in docs/03_TECH §8.7)
- Checked at 360, 390, 768, 1024, 1440 px (Playwright screenshots or manual notes)
- Draft/autosave present on every multi-field form; empty/loading/error/offline states done
- Docs updated if anything changed

OUTPUT STYLE
- Start each task with a short PLAN (files to create/change, requirements covered, tests). Wait for "approved" before coding.
- End each task with: what was done, requirement IDs covered, tests run and results, open questions, next step.
```

---

## 2. Master kickoff prompt (paste once as the first message)

```
You are the lead engineer building NJMS. Before writing any code:

1. Read in full: docs/01_PRD.md, docs/02_DESIGN.md, docs/03_TECH.md, docs/00_PROGRESS.md, and skim docs/appendix/ (A: essential functionality, B: reports blueprint). Note that docs/03_TECH.md replaces the stack in appendix A.
2. Confirm the workspace rules are active (AGENTS.md / workspace rules).
3. Reply with:
   a) a 10-line summary of the product in your own words,
   b) the list of milestones M0..M10 with the requirement IDs each covers,
   c) any contradictions, gaps or risky assumptions you found between the three docs (cite section numbers),
   d) the open questions in PRD section 9 that block M1..M3,
   e) confirmation that you will work one milestone at a time, plan first, and wait for "approved".
Do NOT create or modify any files in this step except docs/00_PROGRESS.md if a correction is needed (and tell me first).
```

---

## 3. Milestone prompt template

```
MILESTONE: {M#} {name}
READ FIRST: PRD {sections/FR ids}; DESIGN {S-/C- ids and sections}; TECH {sections}; docs/00_PROGRESS.md.
GOAL: {one sentence}.
STEP 1: Write a PLAN only: files to create/change, data changes (Prisma migration), endpoints, screens, components, tests, and how each FR is satisfied. List assumptions and questions. Wait for "approved".
STEP 2 (after approval): Implement in small commits. Follow the workspace rules. Mobile-first at 360px.
STEP 3: Run lint, typecheck, unit + integration tests, and the exit test below. Show results.
STEP 4: Update docs/00_PROGRESS.md and any doc that changed (proposing edits first if a doc must change). Summarise and stop.
EXIT TEST: {milestone exit test}.
DO NOT: start the next milestone, add features not in the docs, or change the schema without updating docs/03_TECH.md.
```

---

## 4. Milestone prompts (copy one per conversation)

### M0 · Baseline and audit of the existing barcode app
```
MILESTONE M0: Baseline and audit. READ: docs/03_TECH.md §12 (all), docs/01_PRD.md §5.4.
1. Run the app in legacy/barcode-generator (npm install, npm run dev) WITHOUT modifying it. Report whether it starts and note any errors.
2. Verify each audit finding A-01..A-14 in docs/03_TECH.md §12.3 against the actual code: confirm, refute or refine each, with file and line references.
3. Produce docs/appendix/C_barcode_audit.md: a table (finding, evidence, severity, planned fix, milestone) plus any NEW issues you find.
4. Write a behaviour checklist of every feature in the original app (inputs, formats, units, page setup, grid analysis, exports) that FR-BAR-01 requires us to preserve, so M4 can be tested against it.
Do not change legacy code. Stop after the report.
```

### M1 · Foundation
```
MILESTONE M1: Foundation. READ: PRD FR-PLT-01..05, 07, 08, 12 and NFR; DESIGN §1-§5, C-01..C-03, C-13, C-14, C-18, C-20; TECH §3-§7 (settings, users, sessions, audit, idempotency, drafts tables), §10, §11, §16.1.
GOAL: A deployable, mobile-first shell with login, roles, settings, audit, i18n, money/weight utilities and the draft hook.
INCLUDE: Next.js + TS strict + Tailwind (build-time) + shadcn/ui; Prisma with MySQL (local Docker) and first migration for platform tables; env handling with .env.example; AppShell (bottom tabs on mobile, sidebar on lg+, top bar with search icon, sync/draft indicators); login with sessions in MySQL, bcryptjs, Owner TOTP, PIN dialog; permission matrix middleware; settings screens (S-80 basics: shop, GST, interest defaults, LTV, discount limits); audit log writer; Idempotency-Key middleware; next-intl en/hi with a language toggle; src/domain money.ts and weight.ts with tests; useDraft hook (Dexie) with DraftBanner and SaveIndicator; /api/health; seed script that creates the first Owner from env variables (no default password in code).
EXIT TEST: log in as each role and see the correct menus; refreshing a demo form restores the draft; double-submitting a POST with the same Idempotency-Key creates one record; layout checked at 360/768/1440 with no horizontal scroll; a hello-world deploy plan for Hostinger documented (TECH §16.1) with the migration approach decided.
```

### M2 · Customers and global search
```
MILESTONE M2: Customers and search. READ: PRD FR-CUS-01..03, FR-PLT-06; DESIGN S-03, S-10, S-11, C-06, C-07, C-09, C-10, C-11; TECH Customer table, /customers and /search endpoints.
INCLUDE: customer list (cards on mobile, table on lg+), customer form (name, relation type and name, phone unique, alt phone, address, reference, ID proof, notes), duplicate detection (phone; similar name + relation name) with a helpful message, quick-add customer bottom sheet reusable from any form via CustomerPicker, global search (phone incl. last 4 digits, Hindi/English names, relation name), drafts on the customer form, audit on all writes. ExposureBanner component with placeholder data until credit/girvi exist.
EXIT TEST: duplicate phone rejected with link to the existing profile; search finds by last 4 digits and by Hindi name; quick-add returns to the originating form with the new customer selected and the draft intact.
```

### M3 · Inventory and SKU
```
MILESTONE M3: Inventory and SKU. READ: PRD FR-INV-01..04, 09; DESIGN S-20..S-23; TECH §8.1, SkuMaster/InventoryItem/StockMovement/Counter tables, /inventory endpoints.
INCLUDE: SKU master screen; atomic SKU generation using the counters SQL in TECH §8.1 inside an interactive transaction; item form (all fields incl. HUID, making type/value, photos placeholder); list with filters (metal, category, purity, status, weight range, unlabelled); status changes only via stock-movement records; barcode lookup endpoint /inventory/lookup?barcode=; PLEDGED status excluded from sellable stock.
EXIT TEST: 100 parallel SKU creations give 100 distinct serials (integration test); every status change has a movement row; list works as cards at 360px and table at 1024px.
```

### M4 · Barcode Studio (port the existing generator and integrate)
```
MILESTONE M4: Barcode Studio. READ: PRD FR-BAR-01..12; DESIGN §7 and S-60..S-62, C-08, C-12, C-27; TECH §12 (all); docs/appendix/C_barcode_audit.md; the legacy code in legacy/barcode-generator (read-only).
GOAL: Port the generator into src/modules/barcode with ALL original capabilities preserved, fix the audit findings, and integrate with inventory and label templates. Mobile-first four-step flow (Source, Design, Layout, Preview/Print) on phones; three-panel workspace on lg+.
STEP A (port, no new features): move types/constants/services per the port map in TECH §12.2; decompose App.tsx into components (ManualInput, BatchInput, FileInput, RangeInput, SymbologyPanel, PagePanel, GridHud, LivePlacement, BarcodeCard, PreviewGrid); replace CDN Tailwind/importmap with the app's build; make exports dynamic imports. Prove parity with the M0 behaviour checklist before continuing.
STEP B (fixes): implement A-04..A-13 (vector 1D bars in PDF; real module-width fitting; check-digit and charset validation with visible errors; honour textColor; templates drive the grid; drop px page unit; secure Excel reader; crypto ids; toasts; persisted state as a draft).
STEP C (new): Inventory source tab and "Unlabelled items" queue; jewellery tag designer (fields: SKU text, shop name, net weight, purity, price, HUID) with LabelPreview; label_templates CRUD and default template; output modes (sheet PDF, thermal 1-per-page PDF, browser print at exact size, PNG ZIP); print_jobs log + labelPrintedAt; calibration sheet; scan-test input; camera scan support for the scan test where available; ad-hoc mode (not tied to inventory).
EXIT TEST: every item in the M0 checklist still works; 1,000 labels generate on a mobile viewport without freezing, with progress and cancel; barcode value equals the SKU and the scan test reads it; refresh restores the Studio state; unit tests for grid calculation, unit conversion and validation of all 17 symbologies; Playwright test at 360px completes the four steps.
```

### M5 · Rates, POS, invoices, old gold, day close
```
MILESTONE M5: POS. READ: PRD FR-POS-01..14, J1; DESIGN S-30..S-36, C-04, C-05, C-08, C-13; TECH §8.2, §9 (sale transaction), Sale/SaleItem/Payment/DailyRate/OldGoldPurchase/DayClose tables.
INCLUDE: daily rates screen and the rates-required gate; pricing engine as pure functions with test P1 (TECH §8.7); scan-first cart (USB scanner with speed detection, always-focused input, camera scanning with BarcodeDetector + @zxing fallback, manual search); loud error states; discount limits with PIN; split payments; part/full credit creating a Credit row via a stub interface until M6 (define the service interface now); hold bill and drafts tray; invoice A4 and 80mm print layouts and PDF share; old gold exchange; returns; cash book and day close.
The sale endpoint MUST follow the transaction steps in TECH §9 (conditional UPDATE for sold status, server-side pricing, idempotency).
EXIT TEST: two parallel requests for the same item -> exactly one succeeds and the other gets 409; totals match the server calculation not the client; J1 passes on a 360px viewport; parked bills survive a refresh.
```

### M6 · Credit
```
MILESTONE M6: Credit. READ: PRD FR-CRD-01..09; DESIGN S-40..S-42, C-16, C-17; TECH §8.5, Credit/CreditEvent tables, /credits endpoints.
INCLUDE: credit engine as pure functions (domain/interest/credit.ts) with golden tests G5, G6, G10; create from sale (replace the M5 stub) and manually; promised date, grace, interest and penal settings; payments with allocation setting; auto status; promise-to-pay log; ageing and overdue lists; WhatsApp click-to-chat reminders from templates; write-off and settlement (Owner + reason); linked sale/items card; statement PDF.
EXIT TEST: golden tests pass; overdue status flips correctly at the grace boundary; ExposureBanner now shows real credit dues.
```

### M7 · Girvi
```
MILESTONE M7: Girvi. READ: PRD FR-GIR-01..17, J2, J3; DESIGN S-50..S-54, C-12, C-17, C-21; TECH §8.3, §8.4, §8.6, §8.7, Girvi/GirviItem/GirviEvent/InterestSnapshot tables, /girvi endpoints.
FIRST: confirm with me the convention in TECH §8.4 (compounding periods restart on each payment date) and record the decision in TECH before coding.
INCLUDE: tenure and interest engines as pure functions with golden tests G1-G4, G6-G10; 5-step wizard with multi-article entry, manual defect notes, photos, per-metal default rates editable per entry, LTV meter and PIN override; live tenure and payable counter; redeem calculator for any date with a breakdown; interest-only and part payments; top-up, renewal, part release; full redemption with release receipt and weight check; slip printing; vault register with packet/locker numbers; overdue/notice workflow driven by settings; customer credit history and past purchases shown on girvi screens; draft autosave at every step; nightly snapshot job.
EXIT TEST: all golden tests pass; J2 (including a mid-wizard refresh that resumes at the same step) and J3 pass at 360px; changing default rates does not change existing girvis.
```

### M8 · Customer 360°, follow-ups, PWA and offline
```
MILESTONE M8: Customer 360 and offline. READ: PRD FR-CUS-04..09, FR-PLT-09, FR-PLT-11; DESIGN S-05, S-12; TECH §11.
INCLUDE: Customer 360 with timeline and all tabs, tags, credit limits, watchlist/blocked handling, combined statement PDF; Follow-ups screen (overdue and due soon with call/WhatsApp); PWA manifest and service worker; offline inventory snapshot for scanning; offline sale outbox with idempotent replay and conflict handling in the drafts tray.
EXIT TEST: a sale made offline syncs exactly once when back online; a conflict (item sold elsewhere) is surfaced, not lost; timeline shows purchases, payments, credit, girvi in date order.
```

### M9 · Reports and dashboard
```
MILESTONE M9: Reports. READ: PRD FR-RPT-01..08; DESIGN S-02, S-70..S-72, S-81, C-22..C-24; TECH §13; docs/appendix/ (B) sections 1-9.
INCLUDE: typed metric registry (bilingual labels, formulas, permissions); server query engine with filters, group by, comparison, sort, pagination; Report Builder with selectable metrics; catalog reports for Release 1 (see PRD FR-RPT-03); Excel/CSV/PDF export with audit; configurable KPI dashboard; saved views; data health reconciliation checks; seeded fixture dataset with hand-computed totals.
EXIT TEST: every catalog report matches fixture totals; export equals on-screen totals; Staff cannot fetch cost/profit metrics via the API; dashboard is usable at 360px.
```

### M10 · Migration, backups, hardening, go-live on Hostinger
```
MILESTONE M10: Go-live. READ: PRD FR-PLT-10, FR-PLT-13, NFR-04, NFR-05; TECH §10, §14, §16, §17, §18.
INCLUDE: import wizard (upload, map columns, validate, dry run, commit, rollback by batch); cron endpoints and hPanel cron instructions; encrypted nightly backup and download; restore procedure and a documented restore drill; security checklist run (headers, rate limits, IDOR tests, upload abuse); performance and load test (5 cashiers, 10,000 items); production env checklist; deployment guide for Hostinger (build/start commands, env vars, migrations, uploads folder, SSL, backups); user training notes for staff.
EXIT TEST: restore drill succeeds on a scratch DB; security checklist signed; smoke test passes on the live domain; Owner PIN/2FA enabled; all P0 requirements marked done in docs/00_PROGRESS.md.
```

---

## 5. Sync-check prompt (run at the end of every milestone, and whenever you feel things drifted)

```
SYNC CHECK. Do not change any files until I approve.
1. Compare the CODE against docs/01_PRD.md, docs/02_DESIGN.md, docs/03_TECH.md for milestone {M#} and all earlier milestones.
2. Report in three tables:
   a) DOC -> CODE gaps: requirements/screens/tables/endpoints in the docs that are missing or incomplete in code.
   b) CODE -> DOC drift: things in code (fields, endpoints, screens, libraries, formulas) that the docs do not mention or that differ from them.
   c) DOC <-> DOC conflicts: places where PRD, DESIGN and TECH disagree.
3. For every item, give the file/section reference, severity (blocker/major/minor) and a proposed resolution: change code, change docs, or ask me.
4. Verify docs/00_PROGRESS.md status matches reality (statuses, tests, commit hashes).
5. Run lint, typecheck and tests and include the results.
6. Check mobile-first compliance for screens built so far (360/768/1440 screenshots or notes) and list violations of docs/02_DESIGN.md §2 and §13.
End with a prioritised fix list and wait for my decision.
```

---

## 6. Change-request prompt (when you want something new or different)

```
CHANGE REQUEST: {describe the change in plain words}.
1. Do not write code. Identify every place in docs/01_PRD.md, docs/02_DESIGN.md and docs/03_TECH.md affected (requirement IDs, screens, components, tables, endpoints, tests, milestones).
2. Show the exact proposed edits to each document as a diff, and any effect on completed milestones and on the schema (migration needed?), plus risks.
3. Wait for my "approved".
4. After approval: update the three docs and docs/00_PROGRESS.md first, then implement code and tests, then run the SYNC CHECK for the affected milestone.
```

---

## 7. Other useful prompts

**Bug fix**
```
BUG: {what happened, steps, device/viewport, expected result}.
1. Find the root cause and cite the file/lines and the requirement it violates (FR/NFR id).
2. Write a failing test that reproduces it first.
3. Fix it with the smallest change; run all tests.
4. If the docs were wrong or silent on this behaviour, propose a doc edit. Update docs/00_PROGRESS.md.
```

**Mobile QA sweep**
```
MOBILE QA for screens {S-ids}. Using Playwright at 360x640, 390x844, 768x1024, 1024x768, 1440x900: check docs/02_DESIGN.md §13 (no horizontal scroll, targets >= 44px, safe areas, keyboard overlap, cards-not-tables on mobile, Hindi text wrapping, states). Produce screenshots and a pass/fail table; fix failures and re-run.
```

**Golden-test audit (money safety)**
```
Audit src/domain against docs/03_TECH.md §8. For each formula, show the code, the matching doc section and the tests. Recompute G1-G10 and P1 independently by hand in the report. List any rounding, date-boundary (month end, leap year) or integer-overflow risk. Do not modify code; report only.
```

**Deployment rehearsal**
```
Prepare a Hostinger deployment rehearsal from docs/03_TECH.md §16: list exact hPanel steps, environment variables (names only, no values), build/start/migration commands, the uploads folder plan, cron entries, and a smoke-test checklist. Identify anything in the current code that would fail on a managed Node.js host (native modules, filesystem writes inside the app folder, long-running processes). Do not deploy.
```

**Security review**
```
Run a security review against docs/03_TECH.md §10: authorisation on every route (including IDOR checks on customer/girvi/credit ids), input validation, rate limits, upload restrictions, secret handling, headers, audit coverage of sensitive actions and exports. Report findings with severity and fixes; wait for approval before changing code.
```

---

## 8. Working rhythm (checklist)

1. Paste the **master kickoff** (§2). Resolve contradictions and open questions.
2. For each milestone: new conversation → paste the **milestone prompt** (§4) → review the PLAN → say **"approved"** → wait for the build → check the exit test yourself on your phone → run the **SYNC CHECK** (§5) → commit → tick the milestone in `00_PROGRESS.md`.
3. Any new idea → **change request** (§6) *before* code.
4. Before go-live → security review, golden-test audit, deployment rehearsal, restore drill.
5. If the agent seems confused or drifts, start a fresh conversation, paste the **rules** and **kickoff**, then say "continue milestone {M#} from docs/00_PROGRESS.md".
