'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Warehouse,
  TrendingUp,
  ArrowRightLeft,
  CheckCircle2,
  X,
  FileText,
  AlertCircle,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { formatMoney } from '@/domain/money';

interface RepledgeSearchResult {
  id: string;
  loanNo: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerRelation: string;
  date: string;
  dueDate: string | null;
  principalRupees: number;
  customerRatePm: number;
  offeredRupees: number;
  vendorRatePm: number;
  rateGapPpPm: number;
  rupeeSpreadMonthly: number;
  ownCapitalRupees: number;
  ltvPct: number;
  isLosingMoney: boolean;
  totalGrossGrams: number;
  totalNetGrams: number;
  totalValuationRupees: number;
  status: string;
  itemCount: number;
  articlesSummary: string;
}

export default function RepledgePage() {
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');

  // Unified Re-Pledge Wizard (S-190 Extended)
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<RepledgeSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedGirviIds, setSelectedGirviIds] = useState<Set<string>>(new Set());

  const [financierName, setFinancierName] = useState('Sharma Finance');
  const [vendorRate, setVendorRate] = useState('1.25'); // 1.25% per month
  const [submitting, setSubmitting] = useState(false);

  const fetchLoans = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/repledge?status=${statusFilter}`);
      const json = await res.json();
      if (json.ok) {
        setLoans(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch repledge loans', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, [statusFilter]);

  // Live Multi-Criteria Search (S-190)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/v1/repledge/form-search?q=${encodeURIComponent(searchQuery)}&financierRate=${vendorRate}`);
        if (res.ok) {
          const json = await res.json();
          if (json.ok) {
            setSearchResults(json.data);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, vendorRate]);

  const toggleSelectGirvi = (id: string) => {
    const next = new Set(selectedGirviIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedGirviIds(next);
  };

  // Compute overall wizard totals
  const selectedRows = searchResults.filter((r) => selectedGirviIds.has(r.id));
  const totalOffered = selectedRows.reduce((acc, r) => acc + r.offeredRupees, 0);
  const totalSpreadMonthly = selectedRows.reduce((acc, r) => acc + r.rupeeSpreadMonthly, 0);
  const totalOwnCapital = selectedRows.reduce((acc, r) => acc + r.ownCapitalRupees, 0);
  const totalNetGrams = selectedRows.reduce((acc, r) => acc + r.totalNetGrams, 0);

  const handleCreateRePledge = async () => {
    if (selectedGirviIds.size === 0) {
      alert('Please select at least one Girvi contract to re-pledge');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/repledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId: 'VEND-SHARMA-FINANCE',
          principalPaise: BigInt(totalOffered * 100).toString(),
          rateBp: Math.round(parseFloat(vendorRate) * 100),
          notes: `Re-pledged ${selectedGirviIds.size} girvis to ${financierName}`,
        }),
      });

      const json = await res.json();
      if (json.ok) {
        setIsWizardOpen(false);
        setSelectedGirviIds(new Set());
        setSearchQuery('');
        fetchLoans();
      } else {
        alert(json.error || 'Failed to execute re-pledge contract');
      }
    } catch (e: any) {
      alert(e.message || 'Execution error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-6 rounded-2xl border border-border shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-primary uppercase">
              Re-Pledge Financier Portal
            </h1>
            <p className="text-xs text-text-muted">
              Sub-pledge customer collateral, monitor rate gaps, monthly rupee spread & custody
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsWizardOpen(true)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-white font-bold text-xs rounded-xl hover:bg-primary/90 transition-all shadow-md active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>New Re-Pledge Wizard (S-190)</span>
        </button>
      </div>

      {/* Re-Pledge Register List */}
      <div className="bg-surface rounded-2xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between bg-surface-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
            Active Re-Pledge Financier Contracts ({loans.length})
          </h3>
          <button onClick={fetchLoans} className="p-1.5 text-text-muted hover:text-text rounded-lg">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-text-muted">Loading re-pledge contracts...</div>
        ) : loans.length === 0 ? (
          <div className="p-16 text-center text-xs text-text-muted space-y-2">
            <Building2 className="w-10 h-10 text-text-muted mx-auto opacity-40" />
            <div className="font-semibold text-sm">No re-pledge contracts active</div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {loans.map((l) => (
              <div key={l.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-surface-2 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-primary text-sm">{l.loanNo}</span>
                    <span className="px-2 py-0.5 text-[10px] font-extrabold rounded bg-amber-500/10 text-amber-600 border border-amber-500/20">
                      {(l.rateBp / 100).toFixed(2)}% / month
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-purple-500/10 text-purple-600 border border-purple-500/20">
                      🟣 REPLEGED
                    </span>
                  </div>
                  <div className="text-xs text-text-muted flex flex-wrap gap-4">
                    <span>Financier: {l.vendorId}</span>
                    <span>Date: {l.repledgeDate}</span>
                    <span className="font-bold text-text">Mass: {(l.totalGrossWeightMg / 1000).toFixed(3)} g</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xl font-black text-text">
                    ₹{parseInt(l.principalPaise, 10) / 100}
                  </div>
                  <div className="text-xs text-emerald-600 font-bold">
                    Est. Interest: ₹{parseInt(l.financierMonthlyInterestPaise, 10) / 100}/mo
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* S-190 Extended Re-Pledge Wizard Drawer */}
      {isWizardOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface w-full max-w-3xl rounded-2xl border border-border p-6 space-y-4 shadow-2xl animate-in zoom-in-95 max-h-[90dvh] overflow-y-auto custom-scrollbar">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-base font-extrabold text-text">Single Search Re-Pledge Wizard (S-190)</h2>
                <p className="text-xs text-text-muted">Search customer girvis, calculate rate gaps, rupee spread & own capital</p>
              </div>
              <button onClick={() => setIsWizardOpen(false)} className="p-1 rounded-lg text-text-muted hover:text-text">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Financier Settings Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-surface-2 rounded-xl border border-border">
              <div>
                <label className="text-[11px] font-bold text-text-muted block mb-1">Target Financier / Vendor</label>
                <input
                  type="text"
                  value={financierName}
                  onChange={(e) => setFinancierName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-surface border border-border rounded-lg text-xs font-bold text-text"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-text-muted block mb-1">Vendor Monthly Rate (%/mo)</label>
                <input
                  type="number"
                  step="0.05"
                  value={vendorRate}
                  onChange={(e) => setVendorRate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-surface border border-border rounded-lg text-xs font-bold text-text"
                />
              </div>
            </div>

            {/* Unified Search Box */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-text-muted" />
              <input
                type="text"
                placeholder="One search: Customer Name · Phone · Girvi No · Article · Tag (#overdue60)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-surface-2 border border-border rounded-xl text-xs font-bold text-text outline-none focus:border-primary"
              />
              {searching && <RefreshCw className="w-4 h-4 absolute right-3 top-3 animate-spin text-primary" />}
            </div>

            {/* Search Results Table */}
            {searchResults.length > 0 ? (
              <div className="border border-border rounded-xl overflow-hidden space-y-2">
                <div className="divide-y divide-border">
                  {searchResults.map((res) => {
                    const isChecked = selectedGirviIds.has(res.id);
                    return (
                      <div
                        key={res.id}
                        onClick={() => toggleSelectGirvi(res.id)}
                        className={`p-4 cursor-pointer transition-colors space-y-2 ${
                          isChecked ? 'bg-primary/5 border-l-4 border-primary' : 'hover:bg-surface-2'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="w-4 h-4 accent-primary rounded cursor-pointer"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-black text-text text-sm">{res.loanNo}</span>
                                <span className="text-xs font-bold text-primary">• {res.customerName}</span>
                                {res.customerPhone && (
                                  <span className="text-[10px] text-text-muted font-mono">({res.customerPhone})</span>
                                )}
                              </div>
                              <div className="text-[11px] text-text-muted mt-0.5">{res.articlesSummary}</div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-sm font-black text-text">₹{res.principalRupees.toLocaleString('en-IN')}</div>
                            <div className="text-[10px] font-bold text-amber-600">{res.customerRatePm}% / mo (Customer)</div>
                          </div>
                        </div>

                        {/* Financial Figures Bar */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border/60 text-[11px]">
                          <div className="p-2 bg-surface rounded-lg border border-border">
                            <span className="text-[9px] text-text-muted font-bold block uppercase">Rate Gap</span>
                            <span className={`font-black ${res.rateGapPpPm > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                              {res.rateGapPpPm > 0 ? `+${res.rateGapPpPm}` : res.rateGapPpPm} pp/mo
                            </span>
                          </div>
                          <div className="p-2 bg-surface rounded-lg border border-border">
                            <span className="text-[9px] text-text-muted font-bold block uppercase">Rupee Spread</span>
                            <span className="font-black text-emerald-600">+₹{res.rupeeSpreadMonthly.toLocaleString('en-IN')}/mo</span>
                          </div>
                          <div className="p-2 bg-surface rounded-lg border border-border">
                            <span className="text-[9px] text-text-muted font-bold block uppercase">Own Capital</span>
                            <span className="font-black text-text">₹{res.ownCapitalRupees.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="p-2 bg-surface rounded-lg border border-border">
                            <span className="text-[9px] text-text-muted font-bold block uppercase">LTV Ratio</span>
                            <span className="font-black text-primary">{res.ltvPct.toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : searchQuery.trim() ? (
              <div className="p-8 text-center text-xs text-text-muted border border-border rounded-xl">
                No matching girvi contracts found.
              </div>
            ) : null}

            {/* Wizard Sticky Totals Bar */}
            {selectedGirviIds.size > 0 && (
              <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-black text-primary uppercase">
                      Selected {selectedGirviIds.size} Girvis ({totalNetGrams.toFixed(1)}g net)
                    </span>
                    <div className="text-xs font-bold text-text">
                      Offered: ₹{totalOffered.toLocaleString('en-IN')} | Spread: +₹{totalSpreadMonthly.toLocaleString('en-IN')}/mo | Own Capital: ₹{totalOwnCapital.toLocaleString('en-IN')}
                    </div>
                  </div>
                  <button
                    onClick={handleCreateRePledge}
                    disabled={submitting}
                    className="px-5 py-2.5 bg-primary text-white font-bold text-xs rounded-xl hover:bg-primary-dark shadow-md transition-all active:scale-95 disabled:opacity-50"
                  >
                    {submitting ? 'Executing...' : 'Confirm Re-Pledge Contract'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
