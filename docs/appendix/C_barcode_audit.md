# Appendix C: Barcode Generator Audit & Baseline Behavior Checklist (M0)

> **Reference:** PRD `FR-BAR-01`..`12` · TECH `§12` · Legacy codebase in `legacy/barcode-generator/`

---

## 1. Application Execution Verification
- **Installation:** Executed `npm install` inside `legacy/barcode-generator/`. Installed 213 packages successfully without errors.
- **Build & Verification:** Executed `npm run build` (`tsc && vite build`). Built successfully in 4.88s.
- **Runtime Observations:** 
  - Tailwind loaded via CDN (`https://cdn.tailwindcss.com`) rather than build-time CSS.
  - Browser console/build emits warning: `/index.css doesn't exist at build time`.
  - Browser runtime `importmap` in `index.html` references dev dependencies (`vite`, `@vitejs/plugin-react`).
  - Viewport prevents mobile zooming (`user-scalable=no`).

---

## 2. Audit Findings Verification Table (A-01 .. A-16)

| Finding ID | Finding Description | Evidence in Legacy Code | Severity | Planned Fix in NJMS | Target Milestone |
|---|---|---|---|---|---|
| **A-01** | Tailwind loaded from CDN script; external importmap for packages; `/index.css` reference missing from filesystem. | `index.html`: lines 15 (`https://cdn.tailwindcss.com`), 57–76 (`importmap`), 77 (`<link rel="stylesheet" href="/index.css">`). Build output warning: `/index.css doesn't exist at build time`. | Major | Integrate build-time Tailwind CSS v3.4/v4 and bundler-resolved npm modules inside Next.js; remove CDN scripts and missing css link. | M1 / M4 |
| **A-02** | Import map lists development dependencies (`vite`, `@vitejs/plugin-react`) in browser runtime import map. | `index.html`: lines 72 (`"vite": "https://esm.sh/vite@^7.3.1"`), 73 (`"@vitejs/plugin-react": ...`). | Minor | Remove browser import map completely; rely on standard Next.js build pipeline. | M1 / M4 |
| **A-03** | Viewport metadata disables user zoom (`user-scalable=no`). | `index.html`: line 6 (`<meta name="viewport" content="... user-scalable=no">`). | Major | Allow user zooming per WCAG 2.1 AA (NFR-06 & DESIGN §2.3); set responsive viewport `width=device-width, initial-scale=1, viewport-fit=cover`. | M1 / M4 |
| **A-04** | PDF export renders every label as a 600-DPI PNG image on main thread sequentially uncompressed (`compress: false`), freezing mobile UI on large batches. | `services/exportService.ts`: lines 130 (`compress: false`), 163–165 (`renderBarcodeToDataUrl` -> `doc.addImage(dataUrl, 'PNG', ...)`). | Blocker | Draw 1D barcodes as vector rectangles directly in `jsPDF` using JsBarcode encoding; process batch rendering in chunks with yield to UI thread; show progress bar and cancel button. | M4 |
| **A-05** | Module width uses hardcoded guess of 100 modules (`estimatedModules = 100`). | `services/barcodeGenerator.ts`: lines 65–66 (`const estimatedModules = 100; const moduleWidth = Math.max(1, Math.floor((widthPx - (marginPx * 2)) / estimatedModules));`). | Major | Encode barcode once at module width 1 to calculate exact module count for data payload, then compute exact integer module width to fit printable area. | M4 |
| **A-06** | Validation checks string length/regex only without check-digit or Code 128 character set validation; render failure returns empty image silently. | `services/barcodeGenerator.ts`: lines 14–38 (`validateBarcode` regex only), 41 (`if (!item.valid) return ''`). | Blocker | Add full check-digit (e.g. Modulo 10 for EAN/UPC) and character-set validation; display explicit validation errors per item on preview grid without silent blank outputs. | M4 |
| **A-07** | `textColor` option exists in `BarcodeConfig` state but is not passed to JsBarcode renderer. | `services/barcodeGenerator.ts`: lines 68–81 (JsBarcode config passes `lineColor` and `background`, but omits `textColor`/`fontColor`). | Minor | Pass `fontColor: config.textColor` to JsBarcode options and respect custom text colors. | M4 |
| **A-08** | Avery grid templates stored in state, but `calculateGrid()` ignores selected template profile during layout. | `services/exportService.ts`: lines 28–89 (`calculateGrid` calculates rows/cols based solely on label dimensions without checking `pageSetup.gridProfile`). | Major | Ensure grid templates and margin profiles drive column/row grid calculations and sheet layouts. | M4 |
| **A-09** | `Unit.PX` as a page unit treats screen pixels directly as print pixels (`if (unit === Unit.PX) return value`). | `services/unitConverter.ts`: line 6 (`if (unit === Unit.PX) return value;`). | Major | Remove `PX` as a physical page unit for sheet setup (keep only for on-screen preview), operating purely in physical units (`mm`, `cm`, `in`). | M4 |
| **A-10** | Legacy `xlsx@0.18.5` package has known security advisories and outdated distribution. | `package.json`: line 22 (`"xlsx": "^0.18.5"`). | Major | Replace with modern SheetJS official bundle or ExcelJS parsed asynchronously in a Web Worker with file size limits. | M4 |
| **A-11** | Non-cryptographic pseudo-random string generator used for barcode item IDs. | `App.tsx`: line 103 (`id: Math.random().toString(36).substr(2, 9)`). | Minor | Replace `Math.random()` with `crypto.randomUUID()` or standard `cuid`. | M4 |
| **A-12** | Uses browser `alert()` popups for user feedback; `.env.local` holds an unused Gemini API key placeholder. | `App.tsx`: lines 132, 138, 621; `exportService.ts`: line 137; `.env.local` contains `VITE_GEMINI_API_KEY`. | Minor | Delete `.env.local` key placeholder; replace browser `alert()` with non-blocking Toast components (C-20). | M1 / M4 |
| **A-13** | Lack of state persistence; refreshing page clears batch list and configuration. | `App.tsx`: lines 58–94 (all state stored in transient React `useState`/`useReducer`). | Major | Persist Barcode Studio batch state, config, and page setup in IndexedDB (Dexie) via `useDraft` hook. | M4 |
| **A-14** | Title, metadata, and branding refer to "Industrial Bulk Barcode Pro" instead of NJMS. | `index.html`: lines 7, 12; `package.json`: line 3. | Minor | Rebrand UI headers, documents, and exported file names to "NJMS Barcode Studio". | M4 |
| **A-15** | *(NEW)* Memory Leak Risk: `exportAsZip` converts all canvas images to base64 Data URLs concurrently into memory. | `services/exportService.ts`: lines 102–108. | Major | Chunk ZIP rendering and dispose canvas data URLs iteratively. | M4 |
| **A-16** | *(NEW)* Unhandled Render Errors: Synchronous JsBarcode exceptions on invalid data swallow error and return `''` without UI feedback. | `services/barcodeGenerator.ts`: lines 89–92. | Minor | Surface exact render exception messages to item error status. | M4 |

---

## 3. FR-BAR-01 Baseline Behavior Checklist

To guarantee 100% feature preservation when porting the generator to `src/modules/barcode` in Milestone M4, the following capabilities must be tested and verified against this checklist:

### 3.1 Input Modes
- [ ] **Manual Input:** Single barcode string with optional label text.
- [ ] **Batch Paste:** Multi-line text entry with newline or comma separation.
- [ ] **File Import:** CSV and Excel file parsing (PapaParse / ExcelJS) with column selection.
- [ ] **Sequential Range:** Range generator with Prefix, Start Number, End Number, Step, Zero Padding, and Suffix.
- [ ] **Inventory Queue (NJMS Extension):** "Unlabelled items" queue integrated directly with stock.

### 3.2 Symbologies (17 Formats)
- [ ] **Code 128** (Default for NJMS SKUs)
- [ ] **Code 39**
- [ ] **EAN-13** & **EAN-8**
- [ ] **UPC-A** & **UPC-E**
- [ ] **ITF-14** & **ITF**
- [ ] **MSI**
- [ ] **Pharmacode**
- [ ] **Codabar**
- [ ] **QR Code**
- [ ] **PDF417** / **DataMatrix** (where configured)

### 3.3 Dimension & Unit Controls
- [ ] Units: `in`, `mm`, `cm`, `px` (px for preview)
- [ ] Configurable Barcode Width, Height, Margin
- [ ] DPI Selection: 72, 150, 300, 600 DPI
- [ ] Human-readable text display toggle, font size, custom text color, barcode line color, and background color.

### 3.4 Page Setup & Grid Analysis
- [ ] Page Sizes: A4, A3, Letter, Legal, Tabloid, Custom
- [ ] Orientation: Portrait, Landscape
- [ ] Margins (Top, Bottom, Left, Right) and Gutter Spacing
- [ ] Grid Analysis HUD: Real-time calculation of Columns, Rows, Total Capacity per page, Page Space Efficiency %, and margin reduction suggestions.
- [ ] Avery Templates & Jewellery Tag Presets.

### 3.5 Output Modes & Export
- [ ] **Sheet PDF:** Multi-item grid layout per page.
- [ ] **Thermal Roll PDF:** Single label per page (`@page` sized to label).
- [ ] **PNG ZIP:** Archive of individual label images.
- [ ] **Direct Browser Print:** Print media CSS matching physical tag dimensions.
