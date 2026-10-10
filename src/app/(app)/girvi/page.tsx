'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Sparkles,
  User,
  Phone,
  FileText,
  X,
  CheckCircle2,
  Lock,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { LendingAdvisorCard } from '@/components/calculators/LendingAdvisorCard';
import { TagChip } from '@/components/tags/TagChip';
import { PurityCombobox } from '@/components/ui/PurityCombobox';
import { Girvi360Modal } from '@/components/girvi/Girvi360Modal';

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

export default function GirviPage() {
  const [loans, setLoans] = useState<GirviLoanData[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Selected Loan for Girvi 360 Detail View & Actions
  const [selectedGirviId, setSelectedGirviId] = useState<string | null>(null);

  // Wizard Drawer State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [relationType, setRelationType] = useState('FATHER');
  const [relationName, setRelationName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [idDocType, setIdDocType] = useState('Aadhaar Card');
  const [idDocNumber, setIdDocNumber] = useState('');

  const [principalInput, setPrincipalInput] = useState('');
  const [interestPct, setInterestPct] = useState('1.5');
  const [selectedLocationId, setSelectedLocationId] = useState('');

  // Article item state (Grams & Rupees)
  const [ornamentType, setOrnamentType] = useState('Gold Chain');
  const [defectType, setDefectType] = useState('None');
  const [purity, setPurity] = useState('22K');
  const [grossWeightGrams, setGrossWeightGrams] = useState('');
  const [stoneWeightGrams, setStoneWeightGrams] = useState('0');
  const [valuationRupees, setValuationRupees] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchLocations = async () => {
    try {
      const res = await fetch('/api/v1/locations', { credentials: 'include' });
      const json = await res.json();
      if (json.ok && Array.isArray(json.data)) {
        setLocations(json.data);
        if (json.data.length > 0 && !selectedLocationId) {
          setSelectedLocationId(json.data[0].id);
        }
      }
    } catch {
      // ignore
    }
  };

  const fetchLoans = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ search });
      if (statusFilter !== 'ALL') query.set('status', statusFilter);
      const res = await fetch(`/api/v1/girvi?${query.toString()}`, { credentials: 'include' });
      const json = await res.json();
      if (json.ok) {
        setLoans(json.data);
      }
    } catch (err) {
      console.error('Fetch girvi loans error', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoans();
    fetchLocations();
  }, [statusFilter]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim()) {
      alert('Customer name and valid mobile phone are required');
      return;
    }

    const pAmt = parseFloat(principalInput);
    if (!pAmt || pAmt <= 0) {
      alert('Please enter valid principal amount in Rupees (₹)');
      return;
    }

    const gWeight = parseFloat(grossWeightGrams);
    if (!gWeight || gWeight <= 0) {
      alert('Please enter valid gross weight in Grams (g)');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/girvi', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: {
            name: customerName.trim(),
            phone: customerPhone.trim(),
            relationType,
            relationName: relationName.trim() || undefined,
            address: customerAddress.trim() || undefined,
            identityDocType: idDocType,
            identityDocNumber: idDocNumber.trim() || undefined,
          },
          principalRupees: pAmt,
          interestRatePerMonthPct: parseFloat(interestPct) || 1.5,
          defaultLocationId: selectedLocationId || undefined,
          items: [
            {
              ornamentType,
              defectType: defectType !== 'None' ? defectType : undefined,
              purity,
              grossWeightGrams: gWeight,
              stoneWeightGrams: parseFloat(stoneWeightGrams) || 0,
              valuationRupees: parseFloat(valuationRupees) || pAmt * 1.5,
              locationId: selectedLocationId || undefined,
            },
          ],
        }),
      });

      const json = await res.json();
      if (!json.ok) {
        alert(json.error || 'Failed to create Girvi loan');
        setSubmitting(false);
        return;
      }

      setIsAddOpen(false);
      setCustomerName('');
      setCustomerPhone('');
      setRelationName('');
      setCustomerAddress('');
      setIdDocNumber('');
      setPrincipalInput('');
      setGrossWeightGrams('');
      fetchLoans();
    } catch (err: any) {
      alert(err.message || 'Girvi creation error');
    } finally {
      setSubmitting(false);
    }
  };

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
            <p className="text-xs text-text-muted">Pawn loan management, multi-vault storage & full loan redemption lifecycle</p>
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

      {/* Filter and Search Bar */}
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
                statusFilter === s
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-surface-2 text-text-muted hover:text-text hover:bg-border'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Loans Grid / List */}
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
                    <span className="text-sm font-bold text-text truncate">
                      • {l.customerName}
                    </span>
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
                    <span className="font-bold text-text">• Weight: {l.totalNetWeightGrams.toFixed(3)}g net</span>
                    <span>• {l.items.length} Ornaments</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-center shrink-0">
                  <div className="text-right">
                    <div className="text-lg font-black text-primary">
                      ₹{l.principalRupees.toLocaleString('en-IN')}
                    </div>
                    <div className="text-xs text-text-muted font-medium">
                      Val: ₹{l.totalValuationRupees.toLocaleString('en-IN')}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-text-muted group-hover:text-primary transition-colors" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Girvi 360 Consolidated Card Modal */}
      {selectedGirviId && (
        <Girvi360Modal
          girviId={selectedGirviId}
          onClose={() => setSelectedGirviId(null)}
          onRefresh={fetchLoans}
        />
      )}

      {/* New Girvi Wizard Drawer */}
      {isAddOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in"
          onClick={() => setIsAddOpen(false)}
        >
          <div
            className="bg-surface w-full max-w-xl rounded-2xl border border-border p-5 space-y-4 shadow-2xl animate-in zoom-in-95 max-h-[92dvh] overflow-y-auto custom-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-base font-extrabold text-text">New Girvi Loan Wizard</h2>
                <p className="text-xs text-text-muted">Enter KYC, ornament weights, defect assessment & safe vault</p>
              </div>
              <button onClick={() => setIsAddOpen(false)} className="p-1 rounded-lg text-text-muted hover:text-text">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {/* Customer KYC Details */}
              <div className="p-3 bg-surface-2/60 rounded-xl border border-border space-y-2.5">
                <span className="text-xs font-bold text-text uppercase tracking-wider block">Customer Identity & KYC</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-text-muted block mb-0.5">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Chandra Verma"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-xs text-text font-semibold focus:outline-hidden focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-text-muted block mb-0.5">Mobile Phone *</label>
                    <input
                      type="tel"
                      required
                      placeholder="10-digit Mobile"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-xs text-text font-semibold focus:outline-hidden focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex gap-2">
                    <div className="w-1/3">
                      <label className="text-[11px] font-semibold text-text-muted block mb-0.5">Rel</label>
                      <select
                        value={relationType}
                        onChange={(e) => setRelationType(e.target.value)}
                        className="w-full px-2 py-2 bg-surface border border-border rounded-xl text-xs text-text font-semibold"
                      >
                        <option value="FATHER">S/o, D/o</option>
                        <option value="HUSBAND">W/o</option>
                        <option value="MOTHER">M/o</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="text-[11px] font-semibold text-text-muted block mb-0.5">Relative Name</label>
                      <input
                        type="text"
                        placeholder="Father/Husband Name"
                        value={relationName}
                        onChange={(e) => setRelationName(e.target.value)}
                        className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-xs text-text font-semibold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-text-muted block mb-0.5">Address / Locality</label>
                    <input
                      type="text"
                      placeholder="e.g. Main Bazaar, Sadar"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-xs text-text font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-text-muted block mb-0.5">ID Proof Type</label>
                    <select
                      value={idDocType}
                      onChange={(e) => setIdDocType(e.target.value)}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-xs text-text font-semibold"
                    >
                      <option value="Aadhaar Card">Aadhaar Card</option>
                      <option value="PAN Card">PAN Card</option>
                      <option value="Voter ID">Voter ID</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-text-muted block mb-0.5">Document Number</label>
                    <input
                      type="text"
                      placeholder="XXXX-XXXX-XXXX"
                      value={idDocNumber}
                      onChange={(e) => setIdDocNumber(e.target.value)}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-xs text-text font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Ornament Article Details */}
              <div className="p-3 bg-surface-2/60 rounded-xl border border-border space-y-2.5">
                <span className="text-xs font-bold text-text uppercase tracking-wider block">Pledged Ornament Assessment</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-text-muted block mb-0.5">Ornament Category / Type *</label>
                    <input
                      type="text"
                      required
                      value={ornamentType}
                      onChange={(e) => setOrnamentType(e.target.value)}
                      placeholder="e.g. Gold Necklace, Payal"
                      className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-xs text-text font-semibold"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-text-muted block mb-0.5">Defect / Condition Assessment</label>
                    <select
                      value={defectType}
                      onChange={(e) => setDefectType(e.target.value)}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-xs text-text font-semibold"
                    >
                      <option value="None">None (Perfect Condition)</option>
                      <option value="Broken Clasp">Broken Clasp / Kunda Toota</option>
                      <option value="Dent / Bent">Dent / Bent / Daba Hua</option>
                      <option value="Stone Missing">Stone Missing / Nagina Gayab</option>
                      <option value="Scratches">Heavy Scratches / Ghisa Hua</option>
                      <option value="Soldered Joint">Old Soldered Joint / Tanka Laga</option>
                      <option value="Other Defect">Other Minor Defect</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-text-muted block mb-0.5">Metal Purity</label>
                    <PurityCombobox
                      value={purity}
                      onChange={setPurity}
                      placeholder="e.g. 22K (916)"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-text-muted block mb-0.5">Gross Wt (Grams) *</label>
                    <input
                      type="number"
                      step="0.001"
                      required
                      placeholder="0.000"
                      value={grossWeightGrams}
                      onChange={(e) => setGrossWeightGrams(e.target.value)}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-xs text-text font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-text-muted block mb-0.5">Stone/Dirt Deduction (g)</label>
                    <input
                      type="number"
                      step="0.001"
                      placeholder="0.000"
                      value={stoneWeightGrams}
                      onChange={(e) => setStoneWeightGrams(e.target.value)}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-xs text-text font-bold"
                    />
                  </div>
                </div>

                {/* Storage Locker Selection */}
                <div>
                  <label className="text-[11px] font-semibold text-text-muted block mb-0.5">Deposit in Storage Vault / Locker *</label>
                  <select
                    value={selectedLocationId}
                    onChange={(e) => setSelectedLocationId(e.target.value)}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-xs text-text font-semibold"
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} ({loc.type}) {loc.address ? `- ${loc.address}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Loan Terms */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-text-muted block mb-1">Principal Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 50000"
                    value={principalInput}
                    onChange={(e) => setPrincipalInput(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-2 border border-border rounded-xl text-xs font-black text-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-muted block mb-1">Monthly Interest (% / mo)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={interestPct}
                    onChange={(e) => setInterestPct(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-2 border border-border rounded-xl text-xs font-black text-amber-700"
                  />
                </div>
              </div>

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
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-primary text-white font-bold text-xs rounded-xl hover:bg-primary/90 transition-colors shadow-md"
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
