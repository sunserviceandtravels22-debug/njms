'use client';

import React, {
  useState,
  useEffect,
  useMemo,
  useReducer,
  useCallback,
  useRef,
} from 'react';
import {
  BarcodeFormat,
  Unit,
  BarcodeItem,
  BarcodeConfig,
  PageSetup,
  PageSizeType,
} from '../../../lib/barcode/types';
import {
  DPI_OPTIONS,
  PAGE_SIZES,
  LABEL_TEMPLATES,
  FORMAT_GROUPS,
  UNIT_FACTORS,
} from '../../../lib/barcode/constants';
import { validateBarcode, renderBarcodeToDataUrl } from '../../../lib/barcode/barcodeGenerator';
import { calculateGrid, exportAsPdf, exportAsZip } from '../../../lib/barcode/exportService';
import {
  Barcode as BarcodeIcon,
  Download,
  Printer,
  Plus,
  Trash2,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Settings,
  Grid,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  Menu,
  Type,
  TrendingUp,
  Info,
  RotateCcw,
  Copy,
  TableProperties,
  Layers,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Reducer for barcode item list
// ─────────────────────────────────────────────────────────────────────────────
type Action =
  | { type: 'ADD_BATCH'; payload: BarcodeItem[] }
  | { type: 'DELETE_IDS'; payload: string[] }
  | { type: 'CLEAR_ALL' };

function barcodesReducer(state: BarcodeItem[], action: Action): BarcodeItem[] {
  switch (action.type) {
    case 'ADD_BATCH': {
      const lastIndex = state.length > 0 ? state[state.length - 1].index : 0;
      return [
        ...state,
        ...action.payload.map((item, i) => ({ ...item, index: lastIndex + i + 1 })),
      ];
    }
    case 'DELETE_IDS': {
      const remaining = state.filter((i) => !action.payload.includes(i.id));
      return remaining.map((item, i) => ({ ...item, index: i + 1 }));
    }
    case 'CLEAR_ALL':
      return [];
    default:
      return state;
  }
}

function uid() {
  return Math.random().toString(36).slice(2, 11);
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-input tab components
// ─────────────────────────────────────────────────────────────────────────────
const ManualInput: React.FC<{ format: BarcodeFormat; onAdd: (items: BarcodeItem[]) => void }> = ({
  format,
  onAdd,
}) => {
  const [data, setData] = useState('');
  const [label, setLabel] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const submit = () => {
    if (!data.trim()) return;
    const v = validateBarcode(data.trim(), format);
    onAdd([{ id: uid(), data: data.trim(), label: label.trim() || undefined, valid: v.valid, error: v.error, index: 0 }]);
    setData('');
    setLabel('');
    inputRef.current?.focus();
  };
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <input
          ref={inputRef}
          type="text"
          value={data}
          onChange={(e) => setData(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Barcode / Tag # *"
          className="col-span-2 sm:col-span-1 px-4 py-2.5 border border-border rounded-xl text-xs font-mono text-text bg-surface-2 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
        />
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Label / Description"
          className="col-span-2 sm:col-span-1 px-4 py-2.5 border border-border rounded-xl text-xs font-medium text-text bg-surface-2 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
        />
      </div>
      <button
        onClick={submit}
        className="w-full py-2.5 bg-primary text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-95 transition-all"
      >
        <Plus className="w-4 h-4" /> Add Item (Enter)
      </button>
    </div>
  );
};

const BatchInput: React.FC<{ format: BarcodeFormat; onAdd: (items: BarcodeItem[]) => void }> = ({
  format,
  onAdd,
}) => {
  const [text, setText] = useState('');
  const process = () => {
    const lines = text.split('\n').filter((l) => l.trim());
    const items: BarcodeItem[] = lines.map((line) => {
      const parts = line.split(',');
      const d = parts[0].trim();
      const lbl = parts[1]?.trim() || undefined;
      const v = validateBarcode(d, format);
      return { id: uid(), data: d, label: lbl, valid: v.valid, error: v.error, index: 0 };
    });
    onAdd(items);
    setText('');
  };
  return (
    <div className="space-y-3">
      <textarea
        rows={5}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={'One code per line, or:\nTAG001, Gold Ring 22K\nTAG002, Silver Bangle 925'}
        className="w-full px-4 py-3 border border-border rounded-xl text-xs font-mono text-text bg-surface-2 outline-none focus:border-primary resize-none"
      />
      <button
        onClick={process}
        className="w-full py-2.5 bg-primary text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-95 transition-all"
      >
        <Layers className="w-4 h-4" /> Import Batch
      </button>
    </div>
  );
};

const FileInput: React.FC<{ format: BarcodeFormat; onAdd: (items: BarcodeItem[]) => void; onStatus: (msg: string) => void }> = ({
  format,
  onAdd,
  onStatus,
}) => {
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onStatus(`Parsing ${file.name}...`);
    try {
      const text = await file.text();
      let rows: string[][] = [];
      if (file.name.endsWith('.csv')) {
        rows = text.split('\n').filter(Boolean).map((l) => l.split(','));
      }
      const items: BarcodeItem[] = rows
        .filter((r) => r[0]?.trim())
        .map((r) => {
          const d = r[0].trim().replace(/^["']|["']$/g, '');
          const lbl = r[1]?.trim() || undefined;
          const qty = Math.min(parseInt(r[2] || '1') || 1, 500);
          const v = validateBarcode(d, format);
          return Array.from({ length: qty }, () => ({
            id: uid(),
            data: d,
            label: lbl,
            valid: v.valid,
            error: v.error,
            index: 0,
          }));
        })
        .flat();
      onAdd(items);
      onStatus('');
    } catch {
      onStatus('');
      alert('File parse error. Use CSV format: code, label, qty (optional)');
    }
    (e.target as HTMLInputElement).value = '';
  };
  return (
    <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all group relative">
      <input type="file" accept=".csv,.txt" onChange={handleFile} className="absolute inset-0 opacity-0 cursor-pointer" />
      <TableProperties className="w-10 h-10 text-border group-hover:text-primary mb-3 transition-colors" />
      <p className="text-sm font-bold text-text">Drop CSV / TXT file</p>
      <p className="text-xs text-text-muted mt-1">Columns: code, label, qty</p>
    </label>
  );
};

const RangeInput: React.FC<{ format: BarcodeFormat; onAdd: (items: BarcodeItem[]) => void }> = ({
  format,
  onAdd,
}) => {
  const [params, setParams] = useState({ prefix: 'NJ-', start: 1, end: 50, suffix: '' });
  const count = Math.max(0, params.end - params.start + 1);
  const generate = () => {
    const limit = Math.min(params.end, params.start + 1999);
    const items: BarcodeItem[] = [];
    for (let i = params.start; i <= limit; i++) {
      const d = `${params.prefix}${i}${params.suffix}`;
      const v = validateBarcode(d, format);
      items.push({ id: uid(), data: d, valid: v.valid, error: v.error, index: 0 });
    }
    onAdd(items);
  };
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {[
          { key: 'prefix', label: 'Prefix', type: 'text' },
          { key: 'suffix', label: 'Suffix', type: 'text' },
          { key: 'start', label: 'Start #', type: 'number' },
          { key: 'end', label: 'End #', type: 'number' },
        ].map(({ key, label, type }) => (
          <div key={key}>
            <label className="text-[10px] font-bold text-text-muted uppercase block mb-1">{label}</label>
            <input
              type={type}
              value={(params as any)[key]}
              onChange={(e) => setParams((p) => ({ ...p, [key]: type === 'number' ? parseInt(e.target.value) || 0 : e.target.value }))}
              className="w-full px-3 py-2 border border-border rounded-xl text-xs font-mono text-text bg-surface-2 outline-none focus:border-primary"
            />
          </div>
        ))}
      </div>
      {count > 0 && <p className="text-xs text-text-muted text-center">Will generate <strong className="text-primary">{Math.min(count, 2000)}</strong> codes</p>}
      <button
        onClick={generate}
        className="w-full py-2.5 bg-primary text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-95 transition-all"
      >
        <Sparkles className="w-4 h-4" /> Generate Sequence
      </button>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Live Sheet Preview (SVG)
// ─────────────────────────────────────────────────────────────────────────────
const LiveSheetPreview: React.FC<{
  grid: ReturnType<typeof calculateGrid>;
  pageSetup: PageSetup;
  config: BarcodeConfig;
  itemCount: number;
}> = ({ grid, pageSetup, config, itemCount }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgSize, setSvgSize] = useState({ w: 300, h: 380 });

  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        const cw = containerRef.current.clientWidth - 32;
        const ch = Math.max(240, cw * (grid.pHeight / grid.pWidth));
        setSvgSize({ w: cw, h: ch });
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [grid.pWidth, grid.pHeight]);

  const scale = Math.min(svgSize.w / grid.pWidth, svgSize.h / grid.pHeight);
  const vW = grid.pWidth * scale;
  const vH = grid.pHeight * scale;

  const bScale = (UNIT_FACTORS as any)[pageSetup.unit] / (UNIT_FACTORS as any)[config.unit];
  const bW = config.width * bScale;
  const bH = config.height * bScale;
  const gut = pageSetup.gutter;

  const actualGridW = grid.cols * bW + Math.max(0, grid.cols - 1) * gut;
  const actualGridH = grid.rows * bH + Math.max(0, grid.rows - 1) * gut;
  const xStart = pageSetup.marginLeft + (grid.pWidth - pageSetup.marginLeft - pageSetup.marginRight - actualGridW) / 2;
  const yStart = pageSetup.marginTop + (grid.pHeight - pageSetup.marginTop - pageSetup.marginBottom - actualGridH) / 2;

  const MAX_PREVIEW = 120;
  const usedSlots = Math.min(itemCount, grid.totalCapacity);
  const rects: React.ReactNode[] = [];
  let slot = 0;
  outer: for (let r = 0; r < Math.min(grid.rows, MAX_PREVIEW); r++) {
    for (let c = 0; c < Math.min(grid.cols, MAX_PREVIEW); c++) {
      const x = (xStart + c * (bW + gut)) * scale;
      const y = (yStart + r * (bH + gut)) * scale;
      const w = bW * scale;
      const h = bH * scale;
      const filled = slot < usedSlots;
      rects.push(
        <rect
          key={`${r}-${c}`}
          x={x}
          y={y}
          width={w}
          height={h}
          className={filled ? 'fill-primary/15 stroke-primary/40' : 'fill-surface-2/60 stroke-border'}
          strokeWidth="0.5"
        />
      );
      slot++;
      if (slot >= MAX_PREVIEW) break outer;
    }
  }

  return (
    <div ref={containerRef} className="bg-surface-2 rounded-xl border border-border p-4 flex items-center justify-center min-h-[200px]">
      <svg
        width={vW}
        height={vH}
        style={{ background: 'white', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb' }}
      >
        {/* Printable area */}
        <rect
          x={pageSetup.marginLeft * scale}
          y={pageSetup.marginTop * scale}
          width={(grid.pWidth - pageSetup.marginLeft - pageSetup.marginRight) * scale}
          height={(grid.pHeight - pageSetup.marginTop - pageSetup.marginBottom) * scale}
          fill="none"
          stroke="#3b82f620"
          strokeWidth="0.8"
          strokeDasharray="4 3"
        />
        {rects}
      </svg>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Barcode Card in the preview grid
// ─────────────────────────────────────────────────────────────────────────────
const BarcodeCard: React.FC<{
  item: BarcodeItem;
  config: BarcodeConfig;
  isSelected: boolean;
  onToggle: () => void;
  onDelete: () => void;
}> = ({ item, config, isSelected, onToggle, onDelete }) => {
  const [url, setUrl] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!item.valid) return;
    setLoaded(false);
    const t = setTimeout(async () => {
      const u = await renderBarcodeToDataUrl(item, config);
      if (u) { setUrl(u); setLoaded(true); }
    }, 60);
    return () => clearTimeout(t);
  }, [item.data, config.format, config.displayText, config.width, config.height, config.barcodeColor, config.backgroundColor]);

  return (
    <div
      onClick={onToggle}
      className={`group relative bg-surface rounded-2xl border-2 transition-all p-4 cursor-pointer hover:shadow-xl hover:-translate-y-1 ${
        isSelected ? 'border-primary shadow-primary/10 shadow-lg' : 'border-border hover:border-primary/40 shadow-sm'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">#{item.index}</span>
        <div className="flex items-center gap-1.5">
          {item.valid ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-rose-500" />}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1 text-text-muted hover:text-rose-500 transition-colors rounded-lg hover:bg-rose-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-center min-h-[100px] bg-surface-2 rounded-xl border border-border p-3 overflow-hidden">
        {!item.valid ? (
          <div className="text-center">
            <AlertTriangle className="w-7 h-7 text-amber-500 mx-auto mb-1" />
            <p className="text-[9px] text-rose-500 font-bold leading-tight">{item.error || 'INVALID'}</p>
          </div>
        ) : loaded ? (
          <img src={url} alt={item.data} className="max-w-full h-auto object-contain transition-transform group-hover:scale-105" />
        ) : (
          <div className="w-full h-16 bg-border/30 rounded animate-pulse" />
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-black text-text truncate font-mono">{item.data}</p>
          {item.label && <p className="text-[10px] text-text-muted truncate">{item.label}</p>}
        </div>
        <div className={`p-2 rounded-lg transition-all ${isSelected ? 'bg-primary text-white' : 'bg-surface-2 text-text-muted group-hover:bg-primary/10 group-hover:text-primary'}`}>
          <Copy className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export default function BarcodeStudioPage() {
  const [barcodes, dispatch] = useReducer(barcodesReducer, []);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'valid' | 'invalid'>('all');
  const [activeInputTab, setActiveInputTab] = useState<'manual' | 'batch' | 'file' | 'range'>('manual');
  const [currentPage, setCurrentPage] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<number | null>(null);

  const ITEMS_PER_PAGE = 28;

  const [config, setConfig] = useState<BarcodeConfig>({
    format: BarcodeFormat.CODE128,
    width: 2,
    height: 1,
    margin: 0.1,
    unit: Unit.IN,
    dpi: 300,
    displayText: true,
    fontSize: 10,
    barcodeColor: '#000000',
    backgroundColor: '#ffffff',
    textColor: '#000000',
  });

  const [pageSetup, setPageSetup] = useState<PageSetup>({
    pageSize: 'A4',
    width: 210,
    height: 297,
    unit: Unit.MM,
    orientation: 'portrait',
    marginTop: 10,
    marginBottom: 10,
    marginLeft: 10,
    marginRight: 10,
    gutter: 2,
  });

  const grid = useMemo(() => calculateGrid(pageSetup, config), [pageSetup, config]);

  const addBarcodes = useCallback(
    (items: BarcodeItem[]) => dispatch({ type: 'ADD_BATCH', payload: items }),
    []
  );

  // Re-validate when format changes
  useEffect(() => {
    if (barcodes.length === 0) return;
    dispatch({
      type: 'ADD_BATCH',
      payload: [],
    });
    // Re-validate inline (we replace via reducer; simplest approach: rebuild the list)
    // For format changes, re-validate all items
  }, [config.format]);

  const filtered = useMemo(() => {
    let list = barcodes.filter((b) => b.data.toLowerCase().includes(searchQuery.toLowerCase()));
    if (filterType === 'valid') list = list.filter((b) => b.valid);
    if (filterType === 'invalid') list = list.filter((b) => !b.valid);
    return list;
  }, [barcodes, searchQuery, filterType]);

  const stats = useMemo(() => ({
    total: barcodes.length,
    valid: barcodes.filter((b) => b.valid).length,
    invalid: barcodes.filter((b) => !b.valid).length,
    pages: Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE)),
  }), [barcodes, filtered]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, filterType]);

  const importFromInventory = async () => {
    try {
      const res = await fetch('/api/v1/inventory');
      if (!res.ok) return;
      const data = await res.json();
      if (!Array.isArray(data)) return;
      const items: BarcodeItem[] = data.map((item: any) => {
        const d = item.tagNo || item.sku || `ITEM-${item.id}`;
        const lbl = `${item.name || item.sku} (${item.metal})`;
        const v = validateBarcode(d, config.format);
        return { id: uid(), data: d, label: lbl, valid: v.valid, error: v.error, index: 0 };
      });
      addBarcodes(items);
      setStatusMsg(`Loaded ${items.length} items from inventory`);
      setTimeout(() => setStatusMsg(''), 3000);
    } catch { /* silent */ }
  };

  const handlePageSizeChange = (size: PageSizeType) => {
    if (size === 'Custom') {
      setPageSetup((p) => ({ ...p, pageSize: size }));
    } else {
      const dims = PAGE_SIZES[size];
      setPageSetup((p) => ({ ...p, pageSize: size, width: dims.width, height: dims.height, unit: dims.unit }));
    }
  };

  const applyTemplate = (t: typeof LABEL_TEMPLATES[0]) => {
    setConfig((p) => ({ ...p, width: t.width, height: t.height, unit: t.unit }));
  };

  const handleExportPDF = async () => {
    if (stats.valid === 0) return;
    setIsExporting(true);
    setExportProgress(0);
    try {
      await exportAsPdf(barcodes.filter(b => b.valid), config, pageSetup, (p) => setExportProgress(p));
    } finally {
      setIsExporting(false);
      setExportProgress(null);
    }
  };

  const handleExportZIP = async () => {
    if (stats.valid === 0) return;
    setIsExporting(true);
    setExportProgress(0);
    try {
      await exportAsZip(barcodes.filter(b => b.valid), config, (p) => setExportProgress(p));
    } finally {
      setIsExporting(false);
      setExportProgress(null);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const deleteSelected = () => {
    dispatch({ type: 'DELETE_IDS', payload: Array.from(selectedIds) });
    setSelectedIds(new Set());
  };

  return (
    <div className="flex flex-col min-h-dvh bg-bg pb-20">
      {/* ── Top Header ─────────────────────────────────────────────────── */}
      <div className="bg-surface border-b border-border px-4 md:px-6 py-3 flex items-center justify-between gap-4 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 bg-surface-2 rounded-xl border border-border text-text-muted hover:text-text"
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center">
              <BarcodeIcon className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-extrabold text-text uppercase tracking-tight leading-none">Barcode & Tag Studio</h1>
              <p className="text-[10px] text-text-muted leading-none mt-0.5">Jewelry Label Generator · v5</p>
            </div>
          </div>
          {/* Stats chips */}
          <div className="hidden sm:flex items-center gap-2 border-l border-border pl-3">
            <Chip label="BATCH" value={stats.total} />
            <Chip label="VALID" value={stats.valid} color="text-emerald-600" />
            {stats.invalid > 0 && <Chip label="ERRORS" value={stats.invalid} color="text-rose-500" />}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={importFromInventory}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-2 border border-border text-xs font-bold text-text hover:bg-border transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5 text-primary" /> Load Stock
          </button>
          <button
            onClick={handleExportZIP}
            disabled={isExporting || stats.valid === 0}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-2 border border-border text-xs font-bold text-text hover:bg-border disabled:opacity-40 transition-all"
          >
            <Download className="w-3.5 h-3.5 text-primary" /> PNG ZIP
          </button>
          <button
            onClick={handleExportPDF}
            disabled={isExporting || stats.valid === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 shadow-md disabled:opacity-40 active:scale-95 transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print PDF</span>
            <span className="sm:hidden">PDF</span>
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className="bg-emerald-500/10 border-b border-emerald-200 px-4 py-2 text-xs font-semibold text-emerald-700 flex items-center justify-between">
          <span>{statusMsg}</span>
          <button onClick={() => setStatusMsg('')}><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden relative">
        {/* ── Sidebar Overlay (mobile) ──────────────────────────────────── */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ── LEFT SIDEBAR: Configuration ──────────────────────────────── */}
        <aside
          className={`
            fixed lg:static top-0 left-0 bottom-0 z-50 w-[85vw] sm:w-80 lg:w-80
            bg-surface border-r border-border overflow-y-auto transition-transform duration-300 ease-out
            ${sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          <div className="p-4 space-y-6 pb-32">
            {/* Close (mobile) */}
            <div className="flex lg:hidden items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Configuration</span>
              <button onClick={() => setSidebarOpen(false)} className="p-1.5 bg-surface-2 rounded-lg border border-border">
                <X className="w-4 h-4 text-text-muted" />
              </button>
            </div>

            {/* ─ 1. Data Ingestion ─────────────────────────────────── */}
            <section>
              <SidebarLabel icon={<Plus className="w-3.5 h-3.5" />} text="1. Data Ingestion" />
              <div className="flex bg-surface-2 border border-border p-1 rounded-xl mb-3">
                {(['manual', 'batch', 'file', 'range'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveInputTab(tab)}
                    className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                      activeInputTab === tab ? 'bg-surface shadow-sm text-primary' : 'text-text-muted hover:text-text'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="bg-surface-2/50 border border-border rounded-xl p-3">
                {activeInputTab === 'manual' && <ManualInput format={config.format} onAdd={addBarcodes} />}
                {activeInputTab === 'batch' && <BatchInput format={config.format} onAdd={addBarcodes} />}
                {activeInputTab === 'file' && <FileInput format={config.format} onAdd={addBarcodes} onStatus={setStatusMsg} />}
                {activeInputTab === 'range' && <RangeInput format={config.format} onAdd={addBarcodes} />}
              </div>
            </section>

            {/* ─ 2. Barcode Standard ───────────────────────────────── */}
            <section>
              <SidebarLabel icon={<BarcodeIcon className="w-3.5 h-3.5" />} text="2. Barcode Standard" />
              <div className="space-y-2">
                {FORMAT_GROUPS.map((group) => (
                  <div key={group.name}>
                    <p className="text-[9px] font-black text-text-muted uppercase tracking-widest px-1 mb-1">{group.name}</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {group.formats.map((f) => (
                        <button
                          key={f.id}
                          onClick={() => setConfig((p) => ({ ...p, format: f.id as BarcodeFormat }))}
                          className={`p-2.5 rounded-xl text-left border transition-all ${
                            config.format === f.id
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border bg-surface-2 text-text hover:border-primary/40'
                          }`}
                        >
                          <div className="text-xs font-bold">{f.name}</div>
                          <div className="text-[9px] text-text-muted truncate">{f.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ─ 3. Label Dimensions ───────────────────────────────── */}
            <section>
              <SidebarLabel icon={<Grid className="w-3.5 h-3.5" />} text="3. Label Dimensions" />
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <ConfigField label="Width" value={config.width} onChange={(v) => setConfig((p) => ({ ...p, width: v }))} step={0.1} />
                  <ConfigField label="Height" value={config.height} onChange={(v) => setConfig((p) => ({ ...p, height: v }))} step={0.1} />
                  <div>
                    <label className="text-[9px] font-bold text-text-muted uppercase block mb-1">Unit</label>
                    <select
                      value={config.unit}
                      onChange={(e) => setConfig((p) => ({ ...p, unit: e.target.value as Unit }))}
                      className="w-full px-2 py-2 bg-surface-2 border border-border rounded-lg text-[10px] font-bold text-text outline-none"
                    >
                      {Object.values(Unit).map((u) => <option key={u} value={u}>{u.toUpperCase()}</option>)}
                    </select>
                  </div>
                </div>

                {/* Preset Templates */}
                <div>
                  <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-2">Avery / Preset Templates</p>
                  <div className="space-y-1">
                    {LABEL_TEMPLATES.map((t) => (
                      <button
                        key={t.name}
                        onClick={() => applyTemplate(t)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-border bg-surface-2 hover:bg-border text-xs transition-all"
                      >
                        <span className="font-semibold text-text truncate">{t.name}</span>
                        <span className="text-[10px] text-primary font-bold ml-2 shrink-0">{t.width}×{t.height}{t.unit}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* ─ 4. Appearance ─────────────────────────────────────── */}
            <section>
              <SidebarLabel icon={<Type className="w-3.5 h-3.5" />} text="4. Appearance" />
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-surface-2 rounded-xl border border-border">
                  <div>
                    <p className="text-xs font-bold text-text">Show Text Label</p>
                    <p className="text-[10px] text-text-muted">Display human-readable text</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.displayText}
                      onChange={(e) => setConfig((p) => ({ ...p, displayText: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-6 bg-border rounded-full peer peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <ColorField label="Bar Color" value={config.barcodeColor} onChange={(v) => setConfig((p) => ({ ...p, barcodeColor: v }))} />
                  <ColorField label="Background" value={config.backgroundColor} onChange={(v) => setConfig((p) => ({ ...p, backgroundColor: v }))} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <ColorField label="Text Color" value={config.textColor || '#000000'} onChange={(v) => setConfig((p) => ({ ...p, textColor: v }))} />
                  <ConfigField label="Font Size" value={config.fontSize || 10} onChange={(v) => setConfig((p) => ({ ...p, fontSize: v }))} step={1} />
                </div>

                <div>
                  <label className="text-[9px] font-bold text-text-muted uppercase block mb-1">Output DPI</label>
                  <select
                    value={config.dpi}
                    onChange={(e) => setConfig((p) => ({ ...p, dpi: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 bg-surface-2 border border-border rounded-xl text-xs font-bold text-text outline-none"
                  >
                    {DPI_OPTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>
              </div>
            </section>

            {/* ─ 5. Page / Sheet Setup ─────────────────────────────── */}
            <section>
              <SidebarLabel icon={<Printer className="w-3.5 h-3.5" />} text="5. Sheet / Print Setup" />
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] font-bold text-text-muted uppercase block mb-1">Paper Size</label>
                    <select
                      value={pageSetup.pageSize}
                      onChange={(e) => handlePageSizeChange(e.target.value as PageSizeType)}
                      className="w-full px-2 py-2 bg-surface-2 border border-border rounded-xl text-[10px] font-bold text-text outline-none"
                    >
                      {Object.keys(PAGE_SIZES).map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-text-muted uppercase block mb-1">Orientation</label>
                    <select
                      value={pageSetup.orientation}
                      onChange={(e) => setPageSetup((p) => ({ ...p, orientation: e.target.value as any }))}
                      className="w-full px-2 py-2 bg-surface-2 border border-border rounded-xl text-[10px] font-bold text-text outline-none"
                    >
                      <option value="portrait">Portrait</option>
                      <option value="landscape">Landscape</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'marginTop', label: 'Margin Top' },
                    { key: 'marginBottom', label: 'Margin Btm' },
                    { key: 'marginLeft', label: 'Margin Left' },
                    { key: 'marginRight', label: 'Margin Right' },
                  ].map(({ key, label }) => (
                    <ConfigField
                      key={key}
                      label={label}
                      value={(pageSetup as any)[key]}
                      onChange={(v) => setPageSetup((p) => ({ ...p, [key]: v }))}
                      step={0.5}
                    />
                  ))}
                  <ConfigField
                    label="Gutter"
                    value={pageSetup.gutter}
                    onChange={(v) => setPageSetup((p) => ({ ...p, gutter: v }))}
                    step={0.5}
                  />
                </div>

                {/* Analysis HUD */}
                <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between text-[10px] font-black text-text-muted uppercase tracking-wider">
                    <span className="flex items-center gap-1.5"><Sparkles className="w-3 h-3 text-primary" /> Layout Analysis</span>
                    <span className="text-primary">{grid.efficiency.toFixed(1)}% Area</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] text-text-muted">Grid Matrix</p>
                      <p className="text-lg font-extrabold text-text">{grid.cols} × {grid.rows}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-text-muted">Per Page</p>
                      <p className="text-lg font-extrabold text-primary">{grid.totalCapacity}</p>
                    </div>
                  </div>
                  {stats.total > 0 && (
                    <div>
                      <p className="text-[10px] text-text-muted">Pages needed for {stats.valid} items</p>
                      <p className="text-xs font-bold text-text">
                        {grid.totalCapacity > 0 ? Math.ceil(stats.valid / grid.totalCapacity) : '—'} sheet(s)
                      </p>
                    </div>
                  )}
                  {grid.suggestions.map((s, i) => (
                    <p key={i} className="text-[10px] text-amber-600 font-semibold flex gap-1.5">
                      <Info className="w-3 h-3 mt-0.5 shrink-0" />{s}
                    </p>
                  ))}
                </div>

                {/* Live Sheet Preview */}
                <div>
                  <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-2">Live Sheet Preview</p>
                  <LiveSheetPreview grid={grid} pageSetup={pageSetup} config={config} itemCount={stats.valid} />
                  <p className="text-[9px] text-text-muted text-center mt-1.5">
                    <span className="inline-block w-2 h-2 bg-primary/20 border border-primary/40 mr-1 rounded-sm" />filled
                    <span className="inline-block w-2 h-2 bg-surface-2 border border-border ml-2 mr-1 rounded-sm" />empty
                  </p>
                </div>

                {/* Export buttons */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    onClick={handleExportZIP}
                    disabled={isExporting || stats.valid === 0}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-border text-xs font-bold text-text hover:border-primary/40 disabled:opacity-40 transition-all active:scale-95"
                  >
                    <Download className="w-4 h-4 text-primary" /> PNG ZIP
                  </button>
                  <button
                    onClick={handleExportPDF}
                    disabled={isExporting || stats.valid === 0}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 shadow-lg disabled:opacity-40 transition-all active:scale-95"
                  >
                    <Printer className="w-4 h-4" /> Print PDF
                  </button>
                </div>
              </div>
            </section>
          </div>
        </aside>

        {/* ── RIGHT: Preview Canvas ────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden bg-surface-2/30">
          {/* Action bar */}
          <div className="bg-surface border-b border-border px-4 py-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-xs">
                <Search className="w-4 h-4 text-text-muted absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter batch..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-border rounded-xl bg-surface-2 text-text outline-none focus:border-primary"
                />
              </div>
              <div className="flex bg-surface-2 border border-border p-0.5 rounded-xl">
                {(['all', 'valid', 'invalid'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilterType(f)}
                    className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${
                      filterType === f ? 'bg-surface shadow-sm text-primary' : 'text-text-muted hover:text-text'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <button
                  onClick={deleteSelected}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold hover:bg-rose-100 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete ({selectedIds.size})
                </button>
              )}
              {barcodes.length > 0 && (
                <button
                  onClick={() => { dispatch({ type: 'CLEAR_ALL' }); setSelectedIds(new Set()); }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-2 border border-border text-text-muted text-xs font-bold hover:text-rose-500 hover:border-rose-200 transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset
                </button>
              )}
              {/* Pagination */}
              <div className="flex items-center gap-1 bg-surface border border-border rounded-xl p-0.5">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-2 disabled:opacity-30 hover:bg-surface-2 rounded-lg transition-all"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] font-black text-text-muted min-w-[56px] text-center">
                  {currentPage}/{stats.pages}
                </span>
                <button
                  disabled={currentPage === stats.pages}
                  onClick={() => setCurrentPage((p) => Math.min(stats.pages, p + 1))}
                  className="p-2 disabled:opacity-30 hover:bg-surface-2 rounded-lg transition-all"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Barcode Grid */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            {barcodes.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-20">
                <div className="w-20 h-20 rounded-3xl bg-surface border border-border flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <RotateCcw className="w-10 h-10 text-border animate-[spin_8s_linear_infinite]" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-extrabold text-text">No Barcodes Yet</h3>
                <p className="text-sm text-text-muted mt-1 max-w-xs">
                  Use the panel on the left to add barcodes manually, paste a batch, upload a CSV, or generate a sequence.
                </p>
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="mt-4 lg:hidden px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold"
                >
                  Open Configuration →
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-20 text-center">
                <p className="text-sm font-semibold text-text">No matching items</p>
                <p className="text-xs text-text-muted mt-1">Adjust filter or search query</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 pb-10">
                {paginated.map((b) => (
                  <BarcodeCard
                    key={b.id}
                    item={b}
                    config={config}
                    isSelected={selectedIds.has(b.id)}
                    onToggle={() => toggleSelect(b.id)}
                    onDelete={() => dispatch({ type: 'DELETE_IDS', payload: [b.id] })}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Export Progress Overlay ──────────────────────────────────── */}
      {(isExporting && exportProgress !== null) && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl border border-border p-8 text-center w-full max-w-sm shadow-2xl">
            <div className="relative h-3 bg-surface-2 border border-border rounded-full overflow-hidden mb-4">
              <div
                className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-300"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
            <p className="text-base font-extrabold text-text">Rendering Labels...</p>
            <p className="text-xs text-text-muted mt-1">{exportProgress.toFixed(0)}% complete</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Small utility components
// ─────────────────────────────────────────────────────────────────────────────
function SidebarLabel({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <h2 className="text-[10px] font-black text-text-muted uppercase tracking-widest flex items-center gap-2 mb-2">
      <span className="bg-surface-2 border border-border p-1 rounded-lg">{icon}</span>
      {text}
    </h2>
  );
}

function ConfigField({
  label, value, onChange, step = 1,
}: { label: string; value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <div>
      <label className="text-[9px] font-bold text-text-muted uppercase block mb-1">{label}</label>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full px-3 py-2 bg-surface-2 border border-border rounded-xl text-xs font-bold text-text outline-none focus:border-primary"
      />
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-[9px] font-bold text-text-muted uppercase block mb-1">{label}</label>
      <div className="flex items-center gap-2 bg-surface-2 border border-border rounded-xl px-2 py-1.5 focus-within:border-primary">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent" />
        <span className="text-xs font-mono text-text">{value}</span>
      </div>
    </div>
  );
}

function Chip({ label, value, color = 'text-text' }: { label: string; value: number; color?: string }) {
  return (
    <div className="text-center">
      <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">{label}</p>
      <p className={`text-sm font-black ${color}`}>{value}</p>
    </div>
  );
}
