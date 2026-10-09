# Appendix A: Essential Functionality Blueprint (Legacy Reference)

> **Note on Stack Supersession:** As per `docs/01_PRD.md` §1 and `docs/03_TECH.md` §3, the original prototype stack (React + Supabase/PostgreSQL, referenced in `legacy/supabase-app/`) has been **superseded** by Next.js (App Router) + TypeScript Strict + Prisma + MySQL hosted on Hostinger Managed Node.js.

## 1. Key Business Rules Preserved from Appendix A
1. **GST Rules:** 
   - Jewellery Sales: **3% GST** applied to total transaction value (Metal value + Making charges).
   - Job Work / Labor: **5% GST** applied to job-work labour (to be verified with CA per settings).
2. **Pricing Engine Formula:**
   - `Gross Payable = (Net Weight × Daily Metal Rate) + Making Charge + Stone/Other Charges − Discount + GST (3%)` with exact rupee round-off handling.
3. **Core Workflow Prototypes:**
   - Preserved in `legacy/supabase-app` (Dashboard, Inventory, SKU Master, POS Sales, Sales History, Purchase, Reports, Audit Log).
