'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Plus,
  Search,
  RefreshCw,
  User,
  FileText,
  X,
  CheckCircle2,
  ChevronRight,
  AlertTriangle,
  Trash2,
  PackagePlus,
  Sparkles,
} from 'lucide-react';
import { LendingAdvisorCard } from '@/components/calculators/LendingAdvisorCard';
import { PurityCombobox } from '@/components/ui/PurityCombobox';
import { Girvi360Modal } from '@/components/girvi/Girvi360Modal';
import { CustomerOmniSelector, CustomerOmniData } from '@/components/customers/CustomerOmniSelector';

/* ── Types ─────────────────────────────────────── */
interface OrnamentRow {
  id: string; // local uuid
  ornamentType: string;
  conditionStatus: 'INTACT' | 'BROKEN' | 'MISSING_STONE' | 'BENT' | 'DAMAGED';
  defectNote: string;
  purity: string;
  grossWeightGrams: string;
  stoneWeightGrams: string;
  valuationRupees: string;
  locationId: string;
}

interface GirviItemData {
  id: string;
  ornamentType: string;
  defectType?: string;
  metal: string;
  purity: string;
  grossWeightGrams: number;
  stoneWeightGrams: number;
  netWeightGrams: number;
  valuationRupees: number;
  locationName: string;
}

interface GirviLoanData {
  id: string;
  loanNo: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerRelation?: string;
  date: string;
  dueDate: string | null;
  principalRupees: number;
  interestRatePerMonthPct: number;
  status: string;
  totalGrossWeightGrams: number;
  totalNetWeightGrams: number;
  totalValuationRupees: number;
  items: GirviItemData[];
}

/* ── Defect suggestion chips ────────────────────── */
const DEFECT_CHIPS = [
  'Purity tested', 'Stone deducted', 'Hook loose', 'Heavy solder',
  'Joint broken', 'No hallmark', 'Stone missing', 'Bent / dented',
  'Old repair', 'Heavy scratches',
];

const CONDITION_OPTIONS = [
  { value: 'INTACT', label: 'Intact / Perfect', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  { value: 'BROKEN', label: 'Broken', color: 'text-rose-700 bg-rose-50 border-rose-200' },
  { value: 'MISSING_STONE', label: 'Missing Stone', color: 'text-orange-700 bg-orange-50 border-orange-200' },
  { value: 'BENT', label: 'Bent / Dented', color: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
  { value: 'DAMAGED', label: 'Damaged', color: 'text-red-700 bg-red-50 border-red-200' },
];

function newRow(locationId: string): OrnamentRow {
  return {
    id: crypto.randomUUID(),
    ornamentType: '',
    conditionStatus: 'INTACT',
    defectNote: '',
    purity: '22K',
    grossWeightGrams: '',
    stoneWeightGrams: '0',
    valuationRupees: '',
    locationId,
  };
}

/* ── Component ─────────────────────────────────── */
export default function GirviPage() {
  const [loans, setLoans] = useState<GirviLoanData[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Girvi 360 detail view
  const [selectedGirviId, setSelectedGirviId] = useState<string | null>(null);

  // Drawer
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOmniData | null>(null);

  const [principalInput, setPrincipalInput] = useState('');
  const [interestPct, setInterestPct] = useState('1.5');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [ornaments, setOrnaments] = useState<OrnamentRow[]>([]);
  const [submitting, setSubmitting] = useState(false);

  /* ── Data fetch ──────────────────────────────── */
  const fetchLocations = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/locations', { credentials: 'include' });
      const json = await res.json();
      if (json.ok && Array.isArray(json.data)) {
        setLocations(json.data);
        if (json.data.length > 0) {
          setSelectedLocationId(json.data[0].id);
          setOrnaments([newRow(json.data[0].id)]);
        }
      }
    } catch { /* ignore */ }
  }, []);

  const fetchLoans = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ search });
      if (statusFilter !== 'ALL') query.set('status', statusFilter);
      const res = await fetch(`/api/v1/girvi?${query.toString()}`, { credentials: 'include' });
      const json = await res.json();
      if (json.ok) setLoans(json.data);
    } catch (err) {
      console.error('Fetch girvi loans error', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchLoans();
    fetchLocations();
  }, [statusFilter]);

  /* ── Ornament row helpers ────────────────────── */
  const updateRow = (id: string, patch: Partial<OrnamentRow>) =>
    setOrnaments((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const addRow = () =>
    setOrnaments((rows) => [...rows, newRow(selectedLocationId || locations[0]?.id || '')]);

  const removeRow = (id: string) =>
    setOrnaments((rows) => rows.filter((r) => r.id !== id));

  const toggleChip = (rowId: string, chip: string) => {
    const row = ornaments.find((r) => r.id === rowId);
    if (!row) return;
    const existing = row.defectNote;
    const chips = existing ? existing.split('; ').map((c) => c.trim()).filter(Boolean) : [];
    const idx = chips.indexOf(chip);
    if (idx >= 0) chips.splice(idx, 1);
    else chips.push(chip);
    updateRow(rowId, { defectNote: chips.join('; ') });
  };

  /* ── Computed totals ────────────────────────── */
  const totalGross = ornaments.reduce((s, r) => s + (parseFloat(r.grossWeightGrams) || 0), 0);
  const totalNet = ornaments.reduce((s, r) => s + Math.max(0, (parseFloat(r.grossWeightGrams) || 0) - (parseFloat(r.stoneWeightGrams) || 0)), 0);
  const totalValuation = ornaments.reduce((s, r) => s + (parseFloat(r.valuationRupees) || 0), 0);

  /* ── Submit ─────────────────────────────────── */
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) { alert('Please select or register a customer first'); return; }

    const pAmt = parseFloat(principalInput);
    if (!pAmt || pAmt <= 0) { alert('Please enter valid principal amount'); return; }

    const validRows = ornaments.filter((r) => r.ornamentType.trim() && parseFloat(r.grossWeightGrams) > 0);
    if (validRows.length === 0) { alert('Add at least one ornament with type and weight'); return; }

    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/girvi', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          customer: selectedCustomer.id ? undefined : {
            name: selectedCustomer.name,
            phone: selectedCustomer.phone,
            relationType: selectedCustomer.relationType,
            relationName: selectedCustomer.relationName,
            address: selectedCustomer.address,
            identityDocType: selectedCustomer.identityDocType,
            identityDocNumber: selectedCustomer.identityDocNumber,
          },
          principalRupees: pAmt,
          interestRatePerMonthPct: parseFloat(interestPct) || 1.5,
          defaultLocationId: selectedLocationId || undefined,
          items: validRows.map((r) => ({
            ornamentType: r.ornamentType.trim(),
            conditionStatus: r.conditionStatus,
            defectType: r.conditionStatus !== 'INTACT' || r.defectNote
              ? `${r.conditionStatus}${r.defectNote ? ': ' + r.defectNote : ''}`
              : undefined,
            purity: r.purity,
            grossWeightGrams: parseFloat(r.grossWeightGrams),
            stoneWeightGrams: parseFloat(r.stoneWeightGrams) || 0,
            valuationRupees: parseFloat(r.valuationRupees) || pAmt * 1.5,
            locationId: r.locationId || selectedLocationId || undefined,
          })),
        }),
      });

      const json = await res.json();
      if (!json.ok) { alert(json.error || 'Failed to create Girvi loan'); return; }

      setIsAddOpen(false);
      setSelectedCustomer(null);
      setPrincipalInput('');
      setOrnaments([newRow(selectedLocationId)]);
      fetchLoans();
    } catch (err: any) {
      alert(err.message || 'Girvi creation error');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Render ─────────────────────────────────── */
  return (
    <div className="space-y-4 pb-28">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-4 rounded-2xl border border-border shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-text">Girvi Pawnbroking Core</h1>
            <p className="text-xs text-text-muted">Multi-ornament loans • Vault storage • Full redemption lifecycle</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchLoans}
            className="p-2.5 rounded-xl bg-surface-2 hover:bg-border text-text border border-border transition-all"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white font-bold text-xs sm:text-sm rounded-xl hover:bg-primary/90 transition-colors shadow-md active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New Girvi Loan</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-surface p-3.5 rounded-2xl border border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by loan #, customer name, mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchLoans()}
            className="w-full pl-9 pr-4 py-2 bg-surface-2 border border-border rounded-xl text-xs text-text placeholder-text-muted focus:outline-hidden focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
          {['ALL', 'ACTIVE', 'PARTIAL', 'REDEEMED', 'OVERDUE'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === s ? 'bg-primary text-white shadow-xs' : 'bg-surface-2 text-text-muted hover:text-text hover:bg-border'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Loans List */}
      <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-2xs">
        {loading && loans.length === 0 ? (
          <div className="p-12 text-center text-xs text-text-muted">Loading girvi contracts...</div>
        ) : loans.length === 0 ? (
          <div className="p-12 text-center text-xs text-text-muted space-y-2">
            <FileText className="w-8 h-8 text-text-muted mx-auto opacity-50" />
            <div>No Girvi contracts found. Click "+ New Girvi Loan" to create one.</div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {loans.map((l) => (
              <div
                key={l.id}
                onClick={() => setSelectedGirviId(l.id)}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-2/70 transition-colors cursor-pointer group"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-extrabold text-text text-sm group-hover:text-primary transition-colors">
                      {l.loanNo}
                    </span>
                    <span className="text-sm font-bold text-text truncate">• {l.customerName}</span>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${
                      l.status === 'ACTIVE' ? 'bg-amber-500/10 text-amber-800 border-amber-500/20' :
                      l.status === 'REDEEMED' ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20' :
                      l.status === 'PARTIAL' ? 'bg-blue-500/10 text-blue-700 border-blue-500/20' :
                      'bg-surface-2 text-text-muted border-border'
                    }`}>
                      {l.status}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/10 text-amber-800 border border-amber-500/20">
                      {l.interestRatePerMonthPct}% / mo
                    </span>
                  </div>

                  <div className="text-xs text-text-muted flex flex-wrap items-center gap-3">
                    <span>📞 {l.customerPhone}</span>
                    {l.customerRelation && <span>• {l.customerRelation}</span>}
                    <span>• Date: {l.date}</span>
                    <span className="font-bold text-text">• {l.totalNetWeightGrams.toFixed(3)}g net</span>
                    <span>• {l.items.length} Ornament{l.items.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-center shrink-0">
                  <div className="text-right">
                    <div className="text-lg font-black text-primary">₹{l.principalRupees.toLocaleString('en-IN')}</div>
                    <div className="text-xs text-text-muted font-medium">Val: ₹{l.totalValuationRupees.toLocaleString('en-IN')}</div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-text-muted group-hover:text-primary transition-colors" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Girvi 360 Modal */}
      {selectedGirviId && (
        <Girvi360Modal
          girviId={selectedGirviId}
          onClose={() => setSelectedGirviId(null)}
          onRefresh={fetchLoans}
        />
      )}

      {/* ─── New Girvi Wizard Drawer ─────────────────────────────── */}
      {isAddOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in"
          onClick={() => setIsAddOpen(false)}
        >
          <div
            className="bg-surface w-full max-w-2xl rounded-2xl border border-border p-5 space-y-4 shadow-2xl animate-in zoom-in-95 max-h-[94dvh] overflow-y-auto custom-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-base font-extrabold text-text">New Girvi Loan Wizard</h2>
                <p className="text-xs text-text-muted">Multi-ornament pledge with defect assessment & vault allocation</p>
              </div>
              <button onClick={() => setIsAddOpen(false)} className="p-1 rounded-lg text-text-muted hover:text-text">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">

              {/* ── Section 1: Customer Omni-Selector ── */}
              <div className="p-3 bg-surface-2/60 rounded-xl border border-border space-y-2">
                <span className="text-xs font-bold text-text uppercase tracking-wider block">Customer Identity & KYC</span>
                <CustomerOmniSelector
                  selectedCustomer={selectedCustomer}
                  onSelectCustomer={setSelectedCustomer}
                  title="Search by Name / Phone / Father's Name / ID"
                  required
                />
              </div>

              {/* ── Section 2: Multi-Ornament Builder ── */}
              <div className="p-3 bg-surface-2/60 rounded-xl border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-text uppercase tracking-wider">Pledged Ornaments ({ornaments.length})</span>
                  <button
                    type="button"
                    onClick={addRow}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-[11px] font-bold hover:bg-primary/20 transition-colors"
                  >
                    <PackagePlus className="w-3.5 h-3.5" />
                    Add Ornament
                  </button>
                </div>

                {ornaments.map((row, idx) => (
                  <div key={row.id} className="p-3 bg-surface rounded-xl border border-border space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold text-text-muted uppercase tracking-wide">
                        Ornament #{idx + 1}
                      </span>
                      {ornaments.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRow(row.id)}
                          className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Name + Condition */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-semibold text-text-muted block mb-0.5">Ornament Type / Name *</label>
                        <input
                          type="text"
                          required
                          value={row.ornamentType}
                          onChange={(e) => updateRow(row.id, { ornamentType: e.target.value })}
                          placeholder="e.g. Gold Necklace, Payal, Ring"
                          className="w-full px-3 py-2 bg-surface-2 border border-border rounded-xl text-xs text-text font-semibold focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-text-muted block mb-0.5">Condition Status</label>
                        <select
                          value={row.conditionStatus}
                          onChange={(e) => updateRow(row.id, { conditionStatus: e.target.value as OrnamentRow['conditionStatus'] })}
                          className="w-full px-3 py-2 bg-surface-2 border border-border rounded-xl text-xs text-text font-semibold focus:outline-none focus:border-primary"
                        >
                          {CONDITION_OPTIONS.map((c) => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Defect Note + Chips */}
                    <div>
                      <label className="text-[11px] font-semibold text-text-muted block mb-0.5">
                        Defect / Assessment Notes
                        <span className="text-text-muted font-normal ml-1">(click chips to add)</span>
                      </label>
                      <input
                        type="text"
                        value={row.defectNote}
                        onChange={(e) => updateRow(row.id, { defectNote: e.target.value })}
                        placeholder="e.g. Purity tested; Hook loose; No hallmark"
                        className="w-full px-3 py-2 bg-surface-2 border border-border rounded-xl text-xs text-text font-semibold focus:outline-none focus:border-amber-500 mb-1.5"
                      />
                      <div className="flex flex-wrap gap-1">
                        {DEFECT_CHIPS.map((chip) => {
                          const active = row.defectNote.includes(chip);
                          return (
                            <button
                              key={chip}
                              type="button"
                              onClick={() => toggleChip(row.id, chip)}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all ${
                                active
                                  ? 'bg-amber-500 text-white border-amber-500'
                                  : 'bg-surface border border-border text-text-muted hover:border-amber-400 hover:text-amber-700'
                              }`}
                            >
                              {chip}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Weights + Purity */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div>
                        <label className="text-[11px] font-semibold text-text-muted block mb-0.5">Purity</label>
                        <PurityCombobox
                          value={row.purity}
                          onChange={(v) => updateRow(row.id, { purity: v })}
                          placeholder="22K"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-text-muted block mb-0.5">Gross Wt (g) *</label>
                        <input
                          type="number"
                          step="0.001"
                          required
                          placeholder="0.000"
                          value={row.grossWeightGrams}
                          onChange={(e) => updateRow(row.id, { grossWeightGrams: e.target.value })}
                          className="w-full px-3 py-2 bg-surface-2 border border-border rounded-xl text-xs text-text font-bold focus:outline-none focus:border-primary font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-text-muted block mb-0.5">Stone Deduct (g)</label>
                        <input
                          type="number"
                          step="0.001"
                          placeholder="0.000"
                          value={row.stoneWeightGrams}
                          onChange={(e) => updateRow(row.id, { stoneWeightGrams: e.target.value })}
                          className="w-full px-3 py-2 bg-surface-2 border border-border rounded-xl text-xs text-text font-bold focus:outline-none focus:border-primary font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-text-muted block mb-0.5">Valuation (₹)</label>
                        <input
                          type="number"
                          step="1"
                          placeholder="Auto"
                          value={row.valuationRupees}
                          onChange={(e) => updateRow(row.id, { valuationRupees: e.target.value })}
                          className="w-full px-3 py-2 bg-surface-2 border border-border rounded-xl text-xs text-text font-bold focus:outline-none focus:border-primary font-mono"
                        />
                      </div>
                    </div>

                    {/* Net weight computed display */}
                    <div className="flex items-center gap-3 pt-0.5">
                      <span className="text-[11px] text-text-muted">
                        Net Wt:{' '}
                        <span className="font-black text-text font-mono">
                          {Math.max(0, (parseFloat(row.grossWeightGrams) || 0) - (parseFloat(row.stoneWeightGrams) || 0)).toFixed(3)} g
                        </span>
                      </span>
                      <select
                        value={row.locationId}
                        onChange={(e) => updateRow(row.id, { locationId: e.target.value })}
                        className="flex-1 px-2 py-1.5 bg-surface-2 border border-border rounded-lg text-[11px] text-text font-semibold"
                      >
                        {locations.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            📦 {loc.name} ({loc.type})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}

                {/* Grand Totals strip */}
                {ornaments.length > 1 && (
                  <div className="flex items-center gap-4 p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20 text-xs">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="text-amber-800 font-bold">
                      Total: Gross {totalGross.toFixed(3)}g | Net {totalNet.toFixed(3)}g | Val ₹{totalValuation.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
              </div>

              {/* ── Section 3: Loan Terms ── */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-text-muted block mb-1">Principal Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 50000"
                    value={principalInput}
                    onChange={(e) => setPrincipalInput(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-2 border border-border rounded-xl text-xs font-black text-primary focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-muted block mb-1">Monthly Interest (% / mo)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={interestPct}
                    onChange={(e) => setInterestPct(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-2 border border-border rounded-xl text-xs font-black text-amber-700 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Lending Advisor */}
              {totalGross > 0 && (
                <LendingAdvisorCard
                  grossWeightGrams={totalGross}
                  onApplySuggested={(amt) => setPrincipalInput(amt.toString())}
                />
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="flex-1 py-2.5 bg-surface-2 border border-border rounded-xl text-xs font-bold text-text hover:bg-border transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !selectedCustomer}
                  className="flex-1 py-2.5 bg-primary text-white font-bold text-xs rounded-xl hover:bg-primary/90 transition-colors shadow-md disabled:opacity-60"
                >
                  {submitting ? 'Creating...' : 'Disburse Loan & Store'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
