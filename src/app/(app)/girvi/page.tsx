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
  BarChart3,
} from 'lucide-react';
import { LendingAdvisorCard } from '@/components/calculators/LendingAdvisorCard';
import { TagChip } from '@/components/tags/TagChip';
import { PurityCombobox } from '@/components/ui/PurityCombobox';

interface GirviItemData {
  id: string;
  ornamentType: string;
  metal: string;
  purity: string;
  grossWeightGrams: number; // Displayed in Grams (g)
  stoneWeightGrams: number;
  netWeightGrams: number;
  valuationRupees: number; // Displayed in Rupees (₹)
  locationName: string;
}

interface GirviLoanData {
  id: string;
  loanNo: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  date: string;
  dueDate: string | null;
  principalRupees: number; // Displayed in Rupees (₹)
  interestRatePerMonthPct: number;
  status: string;
  totalGrossWeightGrams: number; // Displayed in Grams (g)
  totalNetWeightGrams: number;
  totalValuationRupees: number;
  items: GirviItemData[];
}

export default function GirviPage() {
  const [loans, setLoans] = useState<GirviLoanData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');

  // Wizard Drawer State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [principalInput, setPrincipalInput] = useState('');
  const [interestPct, setInterestPct] = useState('1.5');

  // Article item state (Grams & Rupees)
  const [ornamentType, setOrnamentType] = useState('Gold Chain');
  const [purity, setPurity] = useState('22K');
  const [grossWeightGrams, setGrossWeightGrams] = useState('');
  const [stoneWeightGrams, setStoneWeightGrams] = useState('0');
  const [valuationRupees, setValuationRupees] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchLoans = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ search, status: statusFilter });
      const res = await fetch(`/api/v1/girvi?${query.toString()}`);
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
  }, [statusFilter]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim()) {
      alert('Customer name and valid phone are required');
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
      // 1. Create or resolve customer
      const custRes = await fetch('/api/v1/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: customerName.trim(),
          phone: customerPhone.trim(),
        }),
      }).catch(() => null);

      let customerId = 'temp-id';
      if (custRes) {
        const custJson = await custRes.json();
        if (custJson.ok && custJson.data?.id) {
          customerId = custJson.data.id;
        }
      }

      // 2. Create Girvi Loan with Grams & Rupees
      const girviRes = await fetch('/api/v1/girvi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          principalRupees: pAmt,
          interestRatePerMonthPct: parseFloat(interestPct) || 1.5,
          items: [
            {
              ornamentType,
              purity,
              grossWeightGrams: gWeight,
              stoneWeightGrams: parseFloat(stoneWeightGrams) || 0,
              valuationRupees: parseFloat(valuationRupees) || pAmt * 1.5,
            },
          ],
        }),
      });

      const girviJson = await girviRes.json();
      if (!girviJson.ok) {
        alert(girviJson.error || 'Failed to create Girvi loan');
        setSubmitting(false);
        return;
      }

      setIsAddOpen(false);
      setCustomerName('');
      setCustomerPhone('');
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-4 rounded-2xl border border-border shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-text">Girvi Pawnbroking Core</h1>
            <p className="text-xs text-text-muted">Manage loan contracts, weights in Grams (g) & amounts in Rupees (₹)</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/reports"
            className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-surface-2 hover:bg-border text-text font-bold text-xs rounded-xl border border-border transition-colors"
          >
            <BarChart3 className="w-4 h-4 text-primary" />
            <span>Girvi Report</span>
          </a>
          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary-dark transition-colors shadow-md active:scale-95"
          >
            <Plus className="w-5 h-5" />
            <span>New Girvi Loan</span>
          </button>
        </div>
      </div>

      {/* Register List */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="p-3 border-b border-border flex items-center justify-between bg-surface-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
            Girvi Loans Register ({loans.length})
          </h3>
          <button onClick={fetchLoans} className="p-1.5 text-text-muted hover:text-text rounded-lg">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-text-muted">Loading girvi loans...</div>
        ) : loans.length === 0 ? (
          <div className="p-12 text-center text-xs text-text-muted space-y-2">
            <ShieldCheck className="w-8 h-8 text-text-muted mx-auto opacity-50" />
            <div>No active girvi loans found</div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {loans.map((l) => (
              <div key={l.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-surface-2 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-text text-sm">{l.loanNo}</span>
                    <span className="text-sm font-bold text-primary">• {l.customerName}</span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/10 text-amber-600 border border-amber-500/20">
                      {l.interestRatePerMonthPct}% / month
                    </span>
                  </div>
                  <div className="text-xs text-text-muted flex items-center gap-3">
                    <span>Phone: {l.customerPhone}</span>
                    <span>Date: {l.date}</span>
                    <span className="font-bold text-text">Weight: {l.totalGrossWeightGrams.toFixed(3)} g</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-black text-primary">
                    ₹{l.principalRupees.toLocaleString('en-IN')}
                  </div>
                  <div className="text-xs text-text-muted font-medium">
                    Valuation: ₹{l.totalValuationRupees.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Girvi Wizard Drawer */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface w-full max-w-lg rounded-2xl border border-border p-5 space-y-4 shadow-2xl animate-in zoom-in-95 max-h-[90dvh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-base font-bold text-text">New Girvi Contract Wizard</h2>
              <button onClick={() => setIsAddOpen(false)} className="p-1 rounded-lg text-text-muted hover:text-text">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-text-muted block mb-1">Customer Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Full Name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-2 border border-border rounded-xl text-xs text-text font-semibold focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-muted block mb-1">Mobile Phone Number</label>
                  <input
                    type="tel"
                    required
                    placeholder="10-digit Phone"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-2 border border-border rounded-xl text-xs text-text font-semibold focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Ornament Article Details */}
              <div className="p-3 bg-surface-2 rounded-xl border border-border space-y-2">
                <div className="text-xs font-bold text-text uppercase">Jewellery Article Details</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-text-muted block mb-0.5">Ornament Type</label>
                    <input
                      type="text"
                      value={ornamentType}
                      onChange={(e) => setOrnamentType(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-surface border border-border rounded-lg text-xs text-text"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-text-muted block mb-0.5">Metal Purity</label>
                    <PurityCombobox
                      value={purity}
                      onChange={setPurity}
                      placeholder="e.g. 22K (916) or custom"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-text-muted block mb-0.5">Gross Weight in Grams (g)</label>
                    <input
                      type="number"
                      step="0.001"
                      required
                      placeholder="e.g. 15.500"
                      value={grossWeightGrams}
                      onChange={(e) => setGrossWeightGrams(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-surface border border-border rounded-lg text-xs text-text font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-text-muted block mb-0.5">Stone Deduction in Grams (g)</label>
                    <input
                      type="number"
                      step="0.001"
                      placeholder="0.000"
                      value={stoneWeightGrams}
                      onChange={(e) => setStoneWeightGrams(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-surface border border-border rounded-lg text-xs text-text font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Lending Advisor Component */}
              {parseFloat(grossWeightGrams) > 0 && (
                <LendingAdvisorCard
                  grossWeightGrams={parseFloat(grossWeightGrams)}
                  fineRateRupeesPerGram={7000}
                  onApplySuggested={(amt) => setPrincipalInput(amt.toString())}
                />
              )}

              <div>
                <label className="text-xs font-semibold text-text-muted block mb-1">Principal Loan Amount in Rupees (₹)</label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. 50000"
                  value={principalInput}
                  onChange={(e) => setPrincipalInput(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-2 border border-border rounded-xl text-base font-black text-primary focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-text-muted block mb-1">Monthly Interest Rate (% per month)</label>
                <input
                  type="number"
                  step="0.01"
                  value={interestPct}
                  onChange={(e) => setInterestPct(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-2 border border-border rounded-xl text-xs text-text font-semibold focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="flex-1 py-2.5 bg-surface-2 border border-border rounded-xl text-xs font-bold text-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-primary text-white font-bold text-xs rounded-xl hover:bg-primary-dark"
                >
                  {submitting ? 'Creating...' : 'Create Contract'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
