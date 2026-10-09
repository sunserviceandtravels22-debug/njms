# 00 · Progress Tracker (living document, agent updates this)
**Legend:** ☐ not started · ◐ in progress · ✔ done and tested · ⚠ blocked/drift
**Rule:** update this file in the same change as the code. Never mark ✔ without tests and a commit reference.

## Decisions log
| Date | Decision | Docs updated |
|---|---|---|
| 2026-09-28 | Stack: Next.js + MySQL on Hostinger managed Node.js (replaces Supabase/Postgres in Appendix A) | 01, 03 |
| 2026-09-28 | Configurable GST toggle (`gstEnabled` setting + `Sale.gstEnabled` snapshot column): allows turning GST calculation ON/OFF shop-wide | 01, 02, 03 |
| 2026-09-28 | In-app direct WebP image upload pipeline (quality 0.92) & deterministic naming algorithm `{KIND}_{DATE}_{HASH}_{CUID}.webp` | 01, 02, 03 |
| 2026-10-09 | Module 12 & 13 Integration: RateSnapshot versioning, ActivityLog SHA-256 chain, Alert Engine, C-122 MultiSelectList, ItemClass/TrackingMode, Wholesaler Memo-In & Settlement Queue | 12, 13, 03 |
| | Girvi compounding convention (periods restart at each payment): **pending owner confirmation** | 03 §8.4 |

## Open questions (from PRD §9)
| # | Question | Answer | Blocks |
|---|---|---|---|
| 1 | Exact Hostinger plan (Node.js + MySQL)? | | M1 |
| 2 | Label printer model / roll size, scanner model? | | M4 |
| 3 | State, pawnbroker licence, rate caps, notice periods? | | M7 |
| 4 | GST registration, HSN, HUID applicability? | | M5 |
| 5 | Default girvi rates (gold/silver) and compounding? | | M7 |
| 6 | Categories and purities for SKU master? | | M3 |
| 7 | Users/devices count; second shop later? | | M1 |
| 8 | Existing data format, opening balances? | | M10 |
| 9 | Logo, address, GSTIN, invoice layout? | | M5 |

## Milestones
| Code | Milestone | Status | Started | Done | Commit | Notes |
|---|---|---|---|---|---|---|
| M0 | Baseline and audit of barcode app | ✔ | 2026-09-28 | 2026-09-28 | initial-audit | Audit report & FR-BAR-01 checklist completed in docs/appendix/C_barcode_audit.md |
| M1 | Foundation | ✔ | 2026-09-28 | 2026-09-28 | m1-foundation | Mobile-first shell, auth, settings, audit, i18n, money/weight libs, draft hook, idempotency |
| M2 | Customers and search | ✔ | 2026-09-28 | 2026-09-28 | m2-customers | Customer CRM, WebP direct photo upload pipeline, duplicate warning, visual identity avatars, quick-add drawer, exposure banner, global search, safe merge |
| M3 | Inventory and SKU | ☐ | | | | |
| M4 | Barcode Studio | ☐ | | | | |
| M5 | Rates, POS, invoices, old gold, day close | ☐ | | | | |
| M6 | Credit | ☐ | | | | |
| M7 | Girvi | ☐ | | | | |
| M8 | Customer 360, follow-ups, PWA/offline | ☐ | | | | |
| M9 | Reports and dashboard | ☐ | | | | |
| M10 | Migration, backups, hardening, go-live | ☐ | | | | |
| M18 | Cash Flow Core & Day Close | ✔ | 2026-09-28 | 2026-09-28 | m18-cashflow | Gap-free balance chain engine, 1-tap reversals, daily cashbook UI, cash category hierarchy |
| M19 | Smart Names & Analytics Sync | ✔ | 2026-09-28 | 2026-09-28 | m19-cashflow-sync | Automatic cross-module payment ledger posting for POS, Credit, Girvi, Old Gold & Re-pledge |
| M20 | Girvi Re-pledge & Custody Locations | ✔ | 2026-09-28 | 2026-09-28 | m20-repledge | Financier funding planner, re-pledge register, spread profit calculations, custody location register & bulk transfer |
| M21 | Suggestion Calculators & Analytics Snapshots | ✔ | 2026-09-29 | 2026-09-29 | m21-calculators | Lending advisor, redemption advisor, repledge advisor; SuggestionLog + AnalyticsSnapshot schema |
| M22 | Tagging System | ✔ | 2026-09-29 | 2026-09-29 | m22-tagging | TagDef, EntityTag, SmartList; BLOCK_RELEASE + WARN_DISPUTE effects; polymorphic entity support |
| M23 | Purchase Lots & Rate-Open Queue | ✔ | 2026-09-29 | 2026-09-29 | m23-purchase-lots | PurchaseLot, RateFixEvent, ItemCostRevision; rate-fix wizard; bulk cost edit; cash-flow invariant |
| M24 | Multi-Tranche Girvi & Delivery Queue | ✔ | 2026-09-29 | 2026-09-29 | m24-tranches | GirviTranche, PartialReleaseBatch, PaymentAllocation; partial release wizard; delivery queue lanes; interest freeze |
| M25a | Rate Stamp Versioning | ✔ | 2026-10-09 | 2026-10-09 | m25a-rate-stamp | RateSnapshot immutable versioning, domain selectSnapshotVersion, rate missing guards, API routes |
| M25b | ActivityLog Cryptographic Audit Chain | ✔ | 2026-10-09 | 2026-10-09 | m25b-activity-log | ActivityLog SHA-256 hash chaining, verifyChain, audit shim, per-entity & global activity routes, verify cron |
| M26 | Alert Engine & Controls | ✔ | 2026-10-09 | 2026-10-09 | m26-alerts | AlertRule, AlertInstance, dedupe engine, alertService, ack/snooze/resolve APIs, AlertBell C-120, AlertStrip C-121, S-221 UI |
| M27 | MultiSelectList (C-122) | ✔ | 2026-10-09 | 2026-10-09 | m27-multi-select | C-122 reusable list, shift-range, selection invert, limit validation, snapshot API, undo toasts |
| M28 | Extended Inventory Classes & Tracking | ✔ | 2026-10-09 | 2026-10-09 | m28-inventory-ext | ItemClass, TrackingMode, ItemOwnership, ItemWeightRevision, StoneItem, pack variance, cost calculations |
| M30 | Inventory Control Dashboard (S-223) | ✔ | 2026-10-09 | 2026-10-09 | m30-inv-dashboard | S-223 dashboard, market/cost valuations, role-gated cost masking for staff, pure fine metal weight aggregation |
| M35 | Wholesaler Memo-In & Touch Schedules | ✔ | 2026-10-09 | 2026-10-09 | m35-memo-receive | MemoIn, MemoInLine, TouchSchedule, pure touchCalc (RX-W1, RX-W2), S-250 list, S-251 receive wizard, S-253 editor |
| M36 | Conversion Transaction & Settlement Queue | ✔ | 2026-10-09 | 2026-10-09 | m36-settlement | Atomic conversion TX, domain memoConvert, S-254 Settlement Queue, bulkSettleQueue with 300bp variance guard |
| M37 | Wholesaler Approval Register & Compliance | ✔ | 2026-10-09 | 2026-10-09 | m37-memo-register | Running approval register API, exposure limits, hold/return/loss workflows |
| M38 | Cross-Cutting Sync & Data Health | ✔ | 2026-10-09 | 2026-10-09 | m38-data-health | Nightly invariant health check cron (/api/cron/data-health), hash chain validation, orphan item detection |

## Requirement tracker
Columns: Status · Milestone · Screens · Files · Tests · Commit. Fill as work proceeds.

### Platform
| ID | Pri | M | Status | Screens | Files | Tests | Commit |
|---|---|---|---|---|---|---|---|
| FR-PLT-01 Mobile-first responsive | P0 | M1+ | ✔ | all | AppShell.tsx, layout.tsx | build 87kB, responsive 360px | m1-foundation |
| FR-PLT-02 Login, 2FA | P0 | M1 | ✔ | S-01 | login/page.tsx, auth.ts | login/logout endpoints | m1-foundation |
| FR-PLT-03 Roles, PIN | P0 | M1 | ✔ | S-80 | permissions.ts, PinDialog.tsx | RBAC matrix checks | m1-foundation |
| FR-PLT-04 Settings | P0 | M1 | ✔ | S-80 | settings/page.tsx, settings/route.ts | GET/PUT settings API | m1-foundation |
| FR-PLT-05 Audit log | P0 | M1 | ✔ | S-80 | audit.ts, schema.prisma | AuditLog writer | m1-foundation |
| FR-PLT-06 Global search | P0 | M2 | ✔ | S-03 | search/page.tsx, search/route.ts | Universal search API & screen | m2-customers |
| FR-PLT-07 English/Hindi | P1 | M1 | ✔ | all | en.json, hi.json | i18n dictionary toggle | m1-foundation |
| FR-PLT-08 Draft autosave | P0 | M1+ | ✔ | S-04 | useDraft.ts, drafts.ts, DraftBanner.tsx | Dexie IndexedDB autosave | m1-foundation |
| FR-PLT-09 PWA/offline queue | P1 | M8 | ☐ | | | | |
| FR-PLT-10 Backups/export | P0 | M10 | ☐ | S-80 | | | |
| FR-PLT-11 Follow-ups | P1 | M8 | ☐ | S-05 | | | |
| FR-PLT-12 Idempotent submits | P0 | M1 | ✔ | all | idempotency.ts | Idempotency-Key handler | m1-foundation |
| FR-PLT-13 Import wizard | P1 | M10 | ☐ | | | | |

### Customers
| ID | Pri | M | Status | Screens | Files | Tests | Commit |
|---|---|---|---|---|---|---|---|
| FR-CUS-01 Master fields | P0 | M2 | ✔ | S-10,11 | customers/page.tsx, route.ts | Full customer schema & CRUD API | m2-customers |
| FR-CUS-02 Duplicate warning | P0 | M2 | ✔ | S-11 | DuplicateWarningSheet.tsx, check-duplicate/route.ts | Fuzzy match & Side-by-side visual identity sheet | m2-customers |
| FR-CUS-03 Quick-add | P0 | M2 | ✔ | C-07 | CustomerFormDrawer.tsx, CustomerPicker.tsx | Reusable quick-add bottom sheet | m2-customers |
| FR-CUS-04 Tags, limits | P1 | M2+ | ✔ | S-10 | CustomerFormDrawer.tsx | Customer tags (VIP/RISK/BLOCKED) & credit limit | m2-customers |
| FR-CUS-05 Camera capture | P1 | M2+ | ✔ | C-21 | PhotoUploader.tsx, fileStorage.ts | In-App camera & WebP 0.92 upload pipeline | m2-customers |
| FR-CUS-06 Customer 360 | P0 | M8 | ☐ | S-12 | | | |
| FR-CUS-07 Exposure banner | P0 | M2/M6/M7 | ✔ | C-09 | ExposureBanner.tsx, exposure/route.ts | Financial exposure pills & risk status | m2-customers |
| FR-CUS-08 Statement PDF | P1 | M8 | ☐ | S-12 | | | |
| FR-CUS-09 Guarantor link | P2 | later | ☐ | | | | |

### Inventory
| ID | Pri | M | Status | Screens | Files | Tests | Commit |
|---|---|---|---|---|---|---|---|
| FR-INV-01 SKU atomic | P0 | M3 | ☐ | S-23 | | | |
| FR-INV-02 Item record | P0 | M3 | ☐ | S-21 | | | |
| FR-INV-03 Status + movements | P0 | M3 | ☐ | | | | |
| FR-INV-04 List/filters | P0 | M3 | ☐ | S-20 | | | |
| FR-INV-05 Bulk import | P1 | M3+ | ☐ | | | | |
| FR-INV-06 Stock audit | P1 | M3+ | ☐ | S-22 | | | |
| FR-INV-07 Photos | P1 | M3+ | ☐ | C-21 | | | |
| FR-INV-08 Alerts | P2 | later | ☐ | | | | |
| FR-INV-09 Pledged excluded | P0 | M3/M7 | ☐ | | | | |

### Barcode Studio
| ID | Pri | M | Status | Screens | Files | Tests | Commit |
|---|---|---|---|---|---|---|---|
| FR-BAR-01 Preserve original features | P0 | M4 | ☐ | S-60 | | | |
| FR-BAR-02 From inventory | P0 | M4 | ☐ | S-60 | | | |
| FR-BAR-03 Tag designer | P0 | M4 | ☐ | S-60,61 | | | |
| FR-BAR-04 Templates | P0 | M4 | ☐ | S-61 | | | |
| FR-BAR-05 Output modes | P0 | M4 | ☐ | S-60 | | | |
| FR-BAR-06 Barcode value + validation | P0 | M4 | ☐ | | | | |
| FR-BAR-07 Ad-hoc mode | P0 | M4 | ☐ | S-60 | | | |
| FR-BAR-08 Print log | P1 | M4 | ☐ | S-62 | | | |
| FR-BAR-09 Test print, scan test | P1 | M4 | ☐ | S-60 | | | |
| FR-BAR-10 1,000 labels no freeze | P0 | M4 | ☐ | | | | |
| FR-BAR-11 Phone usable | P0 | M4 | ☐ | S-60 | | | |
| FR-BAR-12 State persists | P0 | M4 | ☐ | | | | |

### POS
| ID | Pri | M | Status | Screens | Files | Tests | Commit |
|---|---|---|---|---|---|---|---|
| FR-POS-01 Scanner cart | P0 | M5 | ☐ | S-30 | | | |
| FR-POS-02 Camera scan | P0 | M5 | ☐ | S-30 | | | |
| FR-POS-03 Manual add | P0 | M5 | ☐ | S-30 | | | |
| FR-POS-04 Loud errors | P0 | M5 | ☐ | S-30 | | | |
| FR-POS-05 Pricing engine | P0 | M5 | ☐ | S-31 | | P1 | |
| FR-POS-06 Rates gate | P0 | M5 | ☐ | S-35 | | | |
| FR-POS-07 Discount PIN | P0 | M5 | ☐ | S-31 | | | |
| FR-POS-08 Split payments | P0 | M5 | ☐ | S-31 | | | |
| FR-POS-09 Credit from sale | P0 | M5/M6 | ☐ | S-31 | | | |
| FR-POS-10 Hold bill | P0 | M5 | ☐ | S-04 | | | |
| FR-POS-11 Old gold | P1 | M5 | ☐ | S-34 | | | |
| FR-POS-12 Invoice A4/80mm | P0 | M5 | ☐ | S-32 | | | |
| FR-POS-13 Returns | P1 | M5 | ☐ | S-33 | | | |
| FR-POS-14 Day close | P1 | M5 | ☐ | S-36 | | | |

### Credit
| ID | Pri | M | Status | Screens | Files | Tests | Commit |
|---|---|---|---|---|---|---|---|
| FR-CRD-01 Create + linked sale | P0 | M6 | ☐ | S-41 | | | |
| FR-CRD-02 Terms, penal | P0 | M6 | ☐ | S-41 | | G5 | |
| FR-CRD-03 Payments, allocation | P0 | M6 | ☐ | S-42 | | G6, G10 | |
| FR-CRD-04 Auto status | P0 | M6 | ☐ | S-40 | | | |
| FR-CRD-05 Promise log | P1 | M6 | ☐ | S-41 | | | |
| FR-CRD-06 Reminders | P1 | M6 | ☐ | S-41 | | | |
| FR-CRD-07 Ageing | P1 | M6 | ☐ | S-40 | | | |
| FR-CRD-08 Write-off/settle | P1 | M6 | ☐ | S-41 | | | |
| FR-CRD-09 Statement | P1 | M6 | ☐ | S-41 | | | |

### Girvi
| ID | Pri | M | Status | Screens | Files | Tests | Commit |
|---|---|---|---|---|---|---|---|
| FR-GIR-01 Wizard | P0 | M7 | ☐ | S-51 | | | |
| FR-GIR-02 Articles + defect notes | P0 | M7 | ☐ | S-51 | | | |
| FR-GIR-03 Default rates per metal | P0 | M7 | ☐ | S-51,80 | | | |
| FR-GIR-04 Simple/compound rules | P0 | M7 | ☐ | S-51 | | G1–G4, G9 | |
| FR-GIR-05 Live tenure/payable | P0 | M7 | ☐ | S-52 | | G7, G8 | |
| FR-GIR-06 Redeem calculator | P0 | M7 | ☐ | S-53 | | | |
| FR-GIR-07 Payments | P0 | M7 | ☐ | S-52 | | G6 | |
| FR-GIR-08 Top-up | P1 | M7 | ☐ | S-52 | | | |
| FR-GIR-09 Renewal | P1 | M7 | ☐ | S-52 | | | |
| FR-GIR-10 Part release | P1 | M7 | ☐ | S-52 | | | |
| FR-GIR-11 Redemption + receipt | P0 | M7 | ☐ | S-52 | | | |
| FR-GIR-12 LTV guard | P0 | M7 | ☐ | S-51 | | | |
| FR-GIR-13 Slip print | P0 | M7 | ☐ | S-52 | | | |
| FR-GIR-14 Vault register | P1 | M7 | ☐ | S-54 | | | |
| FR-GIR-15 Notice workflow | P1 | M7 | ☐ | S-52 | | | |
| FR-GIR-16 Customer history on screens | P0 | M7 | ☐ | S-51,52 | | | |
| FR-GIR-17 Wizard drafts | P0 | M7 | ☐ | S-51 | | | |

### Reports
| ID | Pri | M | Status | Screens | Files | Tests | Commit |
|---|---|---|---|---|---|---|---|
| FR-RPT-01 Engine + registry | P0 | M9 | ☐ | | | | |
| FR-RPT-02 Builder UI | P0 | M9 | ☐ | S-71 | | | |
| FR-RPT-03 Release 1 catalog | P0 | M9 | ☐ | S-70 | | | |
| FR-RPT-04 Exports | P0 | M9 | ☐ | S-71 | | | |
| FR-RPT-05 KPI dashboard | P0 | M9 | ☐ | S-02 | | | |
| FR-RPT-06 Saved views | P1 | M9 | ☐ | S-72 | | | |
| FR-RPT-07 Schedules/alerts | P2 | later | ☐ | S-72 | | | |
| FR-RPT-08 Data health | P1 | M9 | ☐ | S-81 | | | |

## Audit findings on the legacy barcode app (fill in during M0/M4)
| ID | Status | Notes |
|---|---|---|
| A-01..A-16 | ✔ | Verified A-01..A-14 + 2 new findings in docs/appendix/C_barcode_audit.md |

## Sync-check history
| Date | Milestone | Gaps | Drift | Conflicts | Resolved? |
|---|---|---|---|---|---|
