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
