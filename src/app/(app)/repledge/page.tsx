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
  Lock,
  Check,
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
  items?: any[];
}

export default function RepledgePage() {
  const [loans, setLoans] = useState<any[]>([]);
  const [vaultLocations, setVaultLocations] = useState<any[]>([]);
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

  // Settle Contract Modal
  const [settleTarget, setSettleTarget] = useState<any | null>(null);
  const [settlePrincipal, setSettlePrincipal] = useState('');
  const [settleInterest, setSettleInterest] = useState('');
  const [settleMode, setSettleMode] = useState('BANK');
  const [returnVaultId, setReturnVaultId] = useState('');
  const [settling, setSettling] = useState(false);

  const fetchVaults = async () => {
    try {
      const res = await fetch('/api/v1/locations', { credentials: 'include' });
      const json = await res.json();
      if (json.ok && Array.isArray(json.data)) {
        setVaultLocations(json.data);
        if (json.data.length > 0 && !returnVaultId) {
          setReturnVaultId(json.data[0].id);
        }
      }
    } catch {
      // ignore
    }
  };

  const fetchLoans = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/repledge?status=${statusFilter}`, { credentials: 'include' });
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
    fetchVaults();
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
        const res = await fetch(
          `/api/v1/repledge/form-search?q=${encodeURIComponent(searchQuery)}&financierRate=${vendorRate}`,
          { credentials: 'include' }
        );
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
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId: financierName || 'Sharma Finance',
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

  const openSettleModal = (l: any) => {
    setSettleTarget(l);
    const pAmt = parseInt(l.principalPaise, 10) / 100;
    const iAmt = parseInt(l.financierMonthlyInterestPaise || '0', 10) / 100;
    setSettlePrincipal(pAmt.toString());
    setSettleInterest(iAmt.toString());
  };

  const handleSettleSubmit = async () => {
    if (!settleTarget) return;

    setSettling(true);
    try {
      const pPaise = BigInt((parseFloat(settlePrincipal) || 0) * 100);
      const iPaise = BigInt((parseFloat(settleInterest) || 0) * 100);

      const res = await fetch(`/api/v1/repledge/${settleTarget.id}/settle`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          principalPaidPaise: pPaise.toString(),
          interestPaidPaise: iPaise.toString(),
          paymentMode: settleMode,
          returnToLocationId: returnVaultId || undefined,
          notes: `Settled with ${settleTarget.vendorId}. Ornaments returned to shop vault.`,
        }),
      });

      const json = await res.json();
      if (json.ok) {
        alert(json.message || 'Re-pledge contract settled and ornaments returned to safe vault!');
        setSettleTarget(null);
        fetchLoans();
      } else {
        alert(json.error || 'Failed to settle contract');
      }
    } catch (err: any) {
      alert(err.message || 'Settlement error');
    } finally {
      setSettling(false);
    }
  };

  return (
    <div className="space-y-6 pb-28">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-6 rounded-2xl border border-border shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-primary uppercase">
              Re-Pledge Financier Portal
            </h1>
            <p className="text-xs text-text-muted">
              Sub-pledge customer collateral, monitor rupee spread & return ornaments to safe vault
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
      <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-2xs">
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
            {loans.map((l) => {
              const pAmt = parseInt(l.principalPaise, 10) / 100;
              const isClosed = l.status === 'CLOSED';

              return (
                <div key={l.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-surface-2 transition-colors">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-primary text-sm">{l.loanNo}</span>
                      <span className="px-2 py-0.5 text-[10px] font-extrabold rounded bg-amber-500/10 text-amber-600 border border-amber-500/20">
                        {(l.rateBp / 100).toFixed(2)}% / mo
                      </span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${
                        isClosed ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20' : 'bg-purple-500/10 text-purple-600 border-purple-500/20'
                      }`}>
                        {isClosed ? 'SETTLED & RETURNED' : '🟣 ACTIVE REPLEDGE'}
                      </span>
                    </div>
                    <div className="text-xs text-text-muted flex flex-wrap gap-4">
                      <span>Financier: <strong className="text-text">{l.vendorId}</strong></span>
                      <span>Contract Date: {l.repledgeDate}</span>
                      <span className="font-bold text-text">Pledged Mass: {(l.totalGrossWeightMg / 1000).toFixed(3)}g</span>
                    </div>

                    {l.linkedGirvis && l.linkedGirvis.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border/60 space-y-2">
                        <div className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
                          Pledged Collateral & Customer Details:
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          {l.linkedGirvis.map((lg: any, idx: number) => (
                            <div
                              key={idx}
                              className="p-2.5 rounded-xl bg-surface border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                            >
                              <div className="space-y-0.5">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-bold text-xs text-primary">{lg.loanNo || 'Girvi'}</span>
                                  <span className="font-semibold text-xs text-text">{lg.customerName}</span>
                                  {lg.customerPhone && (
                                    <span className="text-[10px] text-text-muted font-mono">📞 {lg.customerPhone}</span>
                                  )}
                                  {lg.customerRelation && (
                                    <span className="text-[10px] text-text-muted">({lg.customerRelation})</span>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                  {lg.items?.map((it: any, iIdx: number) => (
                                    <span
                                      key={iIdx}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-2 border border-border text-[10px] font-medium text-text"
                                    >
                                      <span>💎 {it.ornamentType}</span>
                                      <span className="text-text-muted">({it.grossWeightGrams}g gr / {it.netWeightGrams}g net)</span>
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <div className="text-right text-[11px] shrink-0 font-bold text-text-muted">
                                Net: {lg.weightNetGrams}g
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4 self-end md:self-center shrink-0">
                    <div className="text-right">
                      <div className="text-xl font-black text-text">
                        ₹{pAmt.toLocaleString('en-IN')}
                      </div>
                      <div className="text-xs text-emerald-600 font-bold">
                        Financier Int: ₹{parseInt(l.financierMonthlyInterestPaise, 10) / 100}/mo
                      </div>
                    </div>

                    {!isClosed && (
                      <button
                        onClick={() => openSettleModal(l)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                      >
                        Settle Contract
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Settle Contract Modal Drawer */}
      {settleTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setSettleTarget(null)}
        >
          <div
            className="bg-surface border border-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-text">Settle Contract #{settleTarget.loanNo}</h3>
                <p className="text-xs text-text-muted">Pay financier & return pledged ornaments back to safe vault</p>
              </div>
              <button onClick={() => setSettleTarget(null)} className="p-1 rounded-lg text-text-muted hover:text-text">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-surface-2 rounded-xl space-y-1">
                <div className="flex justify-between"><span className="text-text-muted">Financier Vendor:</span><span className="font-bold">{settleTarget.vendorId}</span></div>
                <div className="flex justify-between"><span className="text-text-muted">Contract Principal:</span><span className="font-bold">₹{(parseInt(settleTarget.principalPaise, 10) / 100).toLocaleString('en-IN')}</span></div>
              </div>

              <div>
                <label className="font-semibold text-text-muted block mb-1">Principal Repayment (₹) *</label>
                <input
                  type="number"
                  value={settlePrincipal}
                  onChange={(e) => setSettlePrincipal(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-2 border border-border rounded-xl text-xs font-bold text-text"
                />
              </div>

              <div>
                <label className="font-semibold text-text-muted block mb-1">Interest Paid to Financier (₹)</label>
                <input
                  type="number"
                  value={settleInterest}
                  onChange={(e) => setSettleInterest(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-2 border border-border rounded-xl text-xs font-bold text-text"
                />
              </div>

              <div>
                <label className="font-semibold text-text-muted block mb-1">Return Ornaments To Safe Locker / Vault *</label>
                <select
                  value={returnVaultId}
                  onChange={(e) => setReturnVaultId(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-2 border border-border rounded-xl text-xs font-bold text-text"
                >
                  {vaultLocations.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-text-muted block mb-1">Settlement Payment Mode</label>
                <select
                  value={settleMode}
                  onChange={(e) => setSettleMode(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-2 border border-border rounded-xl text-xs font-bold text-text"
                >
                  <option value="BANK">Bank Transfer / RTGS</option>
                  <option value="CASH">Cash Drawer</option>
                  <option value="UPI">UPI Payment</option>
                </select>
              </div>

              <div className="p-3 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl text-center">
                <span className="text-[11px] block text-emerald-700">Total Money Disbursed to Financier:</span>
                <span className="text-base font-black">
                  ₹{((parseFloat(settlePrincipal) || 0) + (parseFloat(settleInterest) || 0)).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setSettleTarget(null)}
                className="flex-1 py-2.5 bg-surface-2 border border-border text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleSettleSubmit}
                disabled={settling}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md"
              >
                {settling ? 'Settling...' : 'Confirm Settlement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* S-190 Extended Re-Pledge Wizard Drawer */}
      {isWizardOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
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
                placeholder="Search: Customer Name · Phone · Girvi No · Article..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-surface-2 border border-border rounded-xl text-xs font-bold text-text outline-hidden focus:border-primary"
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
                        className={`p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 cursor-pointer transition-colors ${
                          isChecked ? 'bg-primary/10 border-l-4 border-l-primary' : 'hover:bg-surface-2'
                        }`}
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectGirvi(res.id)}
                            className="w-4 h-4 mt-1 rounded text-primary shrink-0"
                          />
                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-xs text-text">{res.loanNo}</span>
                              <span className="text-xs text-primary font-bold">{res.customerName}</span>
                              {res.customerPhone && (
                                <span className="text-[10px] text-text-muted font-mono">📞 {res.customerPhone}</span>
                              )}
                              {res.customerRelation && (
                                <span className="text-[10px] text-text-muted">({res.customerRelation})</span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                              {res.items && res.items.length > 0 ? (
                                res.items.map((it: any, idx: number) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 rounded bg-surface border border-border text-[10px] text-text font-medium"
                                  >
                                    💎 {it.ornamentType} • {it.grossWeightGrams}g gr / {it.netWeightGrams}g net
                                  </span>
                                ))
                              ) : (
                                <span className="text-[11px] text-text-muted">
                                  {res.articlesSummary} • {res.totalNetGrams.toFixed(2)}g net
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right text-xs">
                          <span className="font-extrabold text-text">₹{res.offeredRupees.toLocaleString('en-IN')}</span>
                          <p className="text-[10px] text-emerald-600 font-bold">
                            Spread: +₹{res.rupeeSpreadMonthly}/mo
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : searchQuery && !searching ? (
              <div className="p-8 text-center text-xs text-text-muted">
                No available Girvi contracts found. Any already active repledge contracts are excluded automatically.
              </div>
            ) : null}

            {/* Overall Wizard Totals Strip */}
            {selectedRows.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-surface-2 rounded-xl border border-border text-center text-xs">
                <div>
                  <span className="text-[10px] text-text-muted font-bold block">TOTAL OFFERED</span>
                  <strong className="text-sm font-black text-primary">₹{totalOffered.toLocaleString('en-IN')}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-text-muted font-bold block">NET WEIGHT</span>
                  <strong className="text-sm font-black text-text">{totalNetGrams.toFixed(2)} g</strong>
                </div>
                <div>
                  <span className="text-[10px] text-text-muted font-bold block">OWN CAPITAL</span>
                  <strong className="text-sm font-black text-amber-700">₹{totalOwnCapital.toLocaleString('en-IN')}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-text-muted font-bold block">MONTHLY SPREAD</span>
                  <strong className="text-sm font-black text-emerald-600">+₹{totalSpreadMonthly.toLocaleString('en-IN')}</strong>
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button
                onClick={() => setIsWizardOpen(false)}
                className="px-4 py-2 bg-surface-2 border border-border rounded-xl text-xs font-bold text-text hover:bg-border"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRePledge}
                disabled={submitting || selectedGirviIds.size === 0}
                className="px-5 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 disabled:opacity-50"
              >
                {submitting ? 'Executing Contract...' : `Execute (${selectedGirviIds.size}) Re-Pledges`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
