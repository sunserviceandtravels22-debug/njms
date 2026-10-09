# Appendix B: Reports Module Blueprint

> **Reference:** Detailed in `docs/01_PRD.md` §5.8 and `docs/03_TECH.md` §13.

## 1. Core Principles
1. **Single Source of Truth:** All report definitions are declared in a typed metric registry (`server/reports/registry.ts` with `MetricDef`).
2. **Catalog Reports (66 Total):** Release 1 implements core P0 catalog reports (Daily Sales, Sales Register, Stock, Stock Valuation, Credit Outstanding & Overdue, Girvi Register, Active & Overdue Girvi, Interest Income, Day Book, GST Summary, Customer Statement).
3. **Data Health & Reconciliation:** Runs reconciliation queries comparing ledger balances against movement/payment records (e.g. cash book vs payment rows, stock count vs movements, credit balance vs credit events, girvi principal vs girvi events).
4. **Export & Access:** Supports Excel (.xlsx), CSV, and PDF exports with audit logging on all report generations and exports.
