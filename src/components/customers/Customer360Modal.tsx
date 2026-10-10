'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Phone,
  MapPin,
  Shield,
  CreditCard,
  ShoppingBag,
  Coins,
  Building2,
  Calendar,
  FileText,
  User,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Edit,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';

interface Customer360ModalProps {
  customerId: string;
  onClose: () => void;
  onEdit?: (customer: any) => void;
}

export const Customer360Modal: React.FC<Customer360ModalProps> = ({
  customerId,
  onClose,
  onEdit,
}) => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'SALES' | 'GIRVI' | 'REPLEDGE' | 'OLD_GOLD' | 'TIMELINE'>('OVERVIEW');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/v1/customers/${customerId}`, { credentials: 'include' })
      .then((res) => res.json())
      .then((json) => {
        if (json.ok) setData(json.data);
      })
      .catch((err) => console.error('Fetch customer 360 error:', err))
      .finally(() => setLoading(false));
  }, [customerId]);

  if (!customerId) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border rounded-3xl max-w-3xl w-full max-h-[92dvh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-surface-2/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-text tracking-tight">Customer 360° Profile</h2>
              <p className="text-xs text-text-muted">Consolidated KYC, Sales, Girvi & Financier exposure</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {data && onEdit && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(data);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-border text-xs font-bold text-text hover:bg-border transition-colors"
              >
                <Edit className="w-3.5 h-3.5" /> Edit
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-text-muted hover:text-text hover:bg-surface-2 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="p-16 text-center text-text-muted text-sm space-y-2">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <div>Loading Customer 360 Profile...</div>
          </div>
        ) : !data ? (
          <div className="p-12 text-center text-rose-600 text-sm">Failed to load customer profile.</div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar">
            {/* Profile Overview Card */}
            <div className="bg-surface p-4 sm:p-5 rounded-2xl border border-border flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 shadow-2xs">
              {/* Photo Box */}
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-amber-100 border-2 border-amber-300 shrink-0 flex items-center justify-center shadow-md">
                {data.photoUrl ? (
                  <img src={data.photoUrl} alt={data.name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-12 h-12 text-amber-500" />
                )}
              </div>

              {/* Identity & Basic Info */}
              <div className="flex-1 text-center sm:text-left space-y-2 min-w-0">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h3 className="text-xl font-black text-text">{data.name}</h3>
                  {data.nameHindi && <span className="text-xs text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">({data.nameHindi})</span>}
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${
                    data.tag === 'VIP' ? 'bg-amber-100 text-amber-900 border-amber-300' :
                    data.tag === 'RISK' ? 'bg-rose-100 text-rose-900 border-rose-300' :
                    'bg-surface-2 text-text-muted border-border'
                  }`}>
                    {data.tag}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-4 text-xs text-text-muted pt-1">
                  <div className="flex items-center gap-1.5 justify-center sm:justify-start">
                    <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="font-semibold text-text">+91 {data.phone}</span>
                    {data.altPhone && <span className="text-text-muted">/ {data.altPhone}</span>}
                  </div>

                  {data.relationName && (
                    <div className="flex items-center gap-1.5 justify-center sm:justify-start">
                      <span className="font-bold text-text-muted">{data.relationType || 'Rel'}:</span>
                      <span className="font-semibold text-text">{data.relationName}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 justify-center sm:justify-start sm:col-span-2">
                    <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="truncate">
                      {data.address ? `${data.address}, ` : ''}{data.city || 'Local'}{data.pincode ? ` - ${data.pincode}` : ''}
                    </span>
                  </div>

                  {data.identityDocNumber && (
                    <div className="flex items-center gap-1.5 justify-center sm:justify-start sm:col-span-2 text-primary font-medium">
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      <span>{data.identityDocType || 'ID'}: {data.identityDocNumber}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Lifetime KPI Summary Metric Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 bg-surface rounded-xl border border-border shadow-2xs text-center space-y-0.5">
                <span className="text-[10px] font-bold text-text-muted uppercase">Total Purchases</span>
                <p className="text-base font-black text-emerald-600">₹{data.summary.totalSalesRupees.toLocaleString('en-IN')}</p>
                <span className="text-[10px] text-text-muted">{data.summary.salesCount} Invoices</span>
              </div>

              <div className="p-3 bg-surface rounded-xl border border-border shadow-2xs text-center space-y-0.5">
                <span className="text-[10px] font-bold text-text-muted uppercase">Active Girvi Loan</span>
                <p className="text-base font-black text-amber-600">₹{data.summary.activeGirviPrincipalRupees.toLocaleString('en-IN')}</p>
                <span className="text-[10px] text-text-muted">{data.summary.activeGirviCount} Active Loans</span>
              </div>

              <div className="p-3 bg-surface rounded-xl border border-border shadow-2xs text-center space-y-0.5">
                <span className="text-[10px] font-bold text-text-muted uppercase">Pledged Gold</span>
                <p className="text-base font-black text-amber-800">{data.summary.totalPledgedNetWeightGrams} g</p>
                <span className="text-[10px] text-text-muted">Net Weight in Vault</span>
              </div>

              <div className="p-3 bg-surface rounded-xl border border-border shadow-2xs text-center space-y-0.5">
                <span className="text-[10px] font-bold text-text-muted uppercase">Repledged to Financier</span>
                <p className={`text-base font-black ${data.summary.activeRepledgedCount > 0 ? 'text-indigo-600' : 'text-text-muted'}`}>
                  {data.summary.activeRepledgedCount} Loans
                </p>
                <span className="text-[10px] text-text-muted">Third-party exposure</span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-border pb-2 overflow-x-auto custom-scrollbar">
              {([
                ['OVERVIEW', 'Overview & KYC'],
                ['TIMELINE', `Timeline`],
                ['SALES', `Sales (${data.sales.length})`],
                ['GIRVI', `Girvi (${data.girviLoans.length})`],
                ['REPLEDGE', `Repledge (${data.repledges.length})`],
                ['OLD_GOLD', `Old Gold (${(data.oldGoldVouchers || []).length})`],
              ] as [string, string][]).map(([tab, label]) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                    activeTab === tab ? 'bg-primary text-white' : 'bg-surface-2 text-text-muted hover:text-text'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Tab 1: Overview & KYC */}
            {activeTab === 'OVERVIEW' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-4 bg-surface rounded-xl border border-border space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">Contact & Family Info</h4>
                    <div className="space-y-1.5 text-xs">
                      <div><span className="text-text-muted">Primary Phone:</span> <span className="font-semibold text-text">+91 {data.phone}</span></div>
                      {data.altPhone && <div><span className="text-text-muted">Alternate Phone:</span> <span className="font-semibold text-text">+91 {data.altPhone}</span></div>}
                      <div><span className="text-text-muted">Relationship:</span> <span className="font-semibold text-text">{data.relationType}: {data.relationName || 'N/A'}</span></div>
                      <div><span className="text-text-muted">Date of Birth:</span> <span className="font-semibold text-text">{data.dob || 'Not provided'}</span></div>
                    </div>
                  </div>

                  <div className="p-4 bg-surface rounded-xl border border-border space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">Address & Documents</h4>
                    <div className="space-y-1.5 text-xs">
                      <div><span className="text-text-muted">Address:</span> <span className="font-semibold text-text">{data.address || 'Local'}</span></div>
                      <div><span className="text-text-muted">City & Pincode:</span> <span className="font-semibold text-text">{data.city || 'Local'} {data.pincode ? `(${data.pincode})` : ''}</span></div>
                      <div><span className="text-text-muted">ID Document:</span> <span className="font-semibold text-text">{data.identityDocType || 'Aadhaar'}: {data.identityDocNumber || 'Not on file'}</span></div>
                      <div><span className="text-text-muted">Credit Limit:</span> <span className="font-semibold text-text">₹{data.creditLimitRupees.toLocaleString('en-IN')}</span></div>
                    </div>
                  </div>
                </div>

                {data.notes && (
                  <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 text-xs text-amber-900">
                    <span className="font-bold block mb-0.5">Special Notes:</span>
                    {data.notes}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Sales History */}
            {activeTab === 'SALES' && (
              <div className="space-y-2">
                {data.sales.length === 0 ? (
                  <div className="p-8 text-center text-xs text-text-muted">No sales invoices recorded for this customer yet.</div>
                ) : (
                  data.sales.map((sale: any) => (
                    <div key={sale.id} className="p-3.5 bg-surface rounded-xl border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-text">{sale.invoiceNo}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                            {sale.status}
                          </span>
                        </div>
                        <p className="text-xs text-text-muted">
                          {sale.date} • {sale.itemsCount} Items ({sale.items.map((i: any) => i.name).join(', ')})
                        </p>
                      </div>

                      <div className="text-right self-end sm:self-center">
                        <span className="text-base font-black text-text">₹{sale.totalRupees.toLocaleString('en-IN')}</span>
                        {sale.oldGoldAdjRupees > 0 && (
                          <p className="text-[11px] text-amber-700">Old Gold Adj: -₹{sale.oldGoldAdjRupees.toLocaleString('en-IN')}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 3: Girvi Loans */}
            {activeTab === 'GIRVI' && (
              <div className="space-y-3">
                {data.girviLoans.length === 0 ? (
                  <div className="p-8 text-center text-xs text-text-muted">No girvi pawn loans recorded for this customer.</div>
                ) : (
                  data.girviLoans.map((loan: any) => (
                    <div key={loan.id} className="p-4 bg-surface rounded-xl border border-border space-y-3 shadow-2xs">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-text">{loan.loanNo}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                              loan.status === 'ACTIVE' ? 'bg-amber-500/10 text-amber-800 border border-amber-500/20' :
                              loan.status === 'REDEEMED' ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20' :
                              'bg-surface-2 text-text-muted border border-border'
                            }`}>
                              {loan.status}
                            </span>
                            {loan.isRepledged && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-indigo-500/10 text-indigo-700 border border-indigo-500/20">
                                Repledged
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-text-muted mt-0.5">
                            Loan Date: {loan.date} • Rate: {loan.interestRatePerMonthPct}%/mo
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="text-base font-black text-primary">₹{loan.principalRupees.toLocaleString('en-IN')}</span>
                          <p className="text-xs text-text-muted">Weight: {loan.netWeightGrams} g</p>
                        </div>
                      </div>

                      {/* Ornaments in this Loan */}
                      <div className="bg-surface-2 p-2.5 rounded-xl divide-y divide-border/60 text-xs">
                        {loan.items.map((item: any) => (
                          <div key={item.id} className="py-1.5 flex items-center justify-between gap-2 first:pt-0 last:pb-0">
                            <div>
                              <span className="font-semibold text-text">{item.ornamentType}</span>
                              <span className="text-text-muted ml-2">({item.purity} • {item.netWeightGrams}g)</span>
                            </div>
                            <span className="font-mono text-text-muted">Locker: {item.locationName}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 4: Repledged Exposure */}
            {activeTab === 'REPLEDGE' && (
              <div className="space-y-2">
                {data.repledges.length === 0 ? (
                  <div className="p-8 text-center text-xs text-text-muted">None of this customer&apos;s ornaments are currently repledged with external financiers.</div>
                ) : (
                  data.repledges.map((rep: any) => (
                    <div key={rep.linkId} className="p-3.5 bg-surface rounded-xl border border-border flex items-center justify-between gap-3 shadow-2xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-text">Contract: {rep.repledgeLoanNo}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                            rep.isReturned ? 'bg-emerald-500/10 text-emerald-700' : 'bg-indigo-500/10 text-indigo-700'
                          }`}>
                            {rep.isReturned ? 'Returned to Shop' : 'With Financier'}
                          </span>
                        </div>
                        <p className="text-xs text-text-muted mt-0.5">
                          Girvi Ref: {rep.girviLoanNo} • Net Weight: {rep.weightNetGrams} g
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-extrabold text-text">₹{rep.allocatedRupees.toLocaleString('en-IN')}</span>
                        {rep.returnedOn && <p className="text-[10px] text-emerald-600">Returned: {rep.returnedOn}</p>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 5: Old Gold Vouchers */}
            {activeTab === 'OLD_GOLD' && (
              <div className="space-y-2">
                {(data.oldGoldVouchers || []).length === 0 ? (
                  <div className="p-8 text-center text-xs text-text-muted">No old gold / silver buyback vouchers recorded for this customer.</div>
                ) : (
                  (data.oldGoldVouchers || []).map((v: any) => (
                    <div key={v.id} className="p-3.5 bg-surface rounded-xl border border-border flex items-center justify-between gap-3 shadow-2xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-text">{v.voucherNo}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-500/10 text-amber-800 border border-amber-500/20">Buyback</span>
                        </div>
                        <p className="text-xs text-text-muted mt-0.5">{v.date} • {v.grossWeightGrams}g gross</p>
                      </div>
                      <div className="text-right">
                        <span className="text-base font-black text-amber-700">₹{(v.payableRupees || 0).toLocaleString('en-IN')}</span>
                        <p className="text-[10px] text-text-muted">Paid to Seller</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 6: Unified Activity Timeline */}
            {activeTab === 'TIMELINE' && (() => {
              // Build a merged, sorted timeline from all activity types
              const events: any[] = [
                ...(data.sales || []).map((s: any) => ({ type: 'SALE', date: s.date, label: `Invoice ${s.invoiceNo}`, amount: s.totalRupees, color: 'emerald', sub: `${s.itemsCount} items` })),
                ...(data.girviLoans || []).map((g: any) => ({ type: 'GIRVI', date: g.date, label: `Girvi ${g.loanNo}`, amount: g.principalRupees, color: 'amber', sub: `${g.items.length} ornaments • ${g.status}` })),
                ...(data.repledges || []).map((r: any) => ({ type: 'REPLEDGE', date: r.sentOn || r.date, label: `Repledge ${r.repledgeLoanNo}`, amount: r.allocatedRupees, color: 'indigo', sub: `Girvi: ${r.girviLoanNo}` })),
                ...(data.oldGoldVouchers || []).map((v: any) => ({ type: 'OLD_GOLD', date: v.date, label: `Old Gold ${v.voucherNo}`, amount: v.payableRupees, color: 'orange', sub: `${v.grossWeightGrams}g gross` })),
              ].filter((e) => e.date).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

              const colorMap: Record<string, string> = {
                emerald: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
                amber: 'bg-amber-500/10 text-amber-800 border-amber-500/20',
                indigo: 'bg-indigo-500/10 text-indigo-700 border-indigo-500/20',
                orange: 'bg-orange-500/10 text-orange-700 border-orange-500/20',
              };

              return (
                <div className="space-y-2">
                  {events.length === 0 ? (
                    <div className="p-8 text-center text-xs text-text-muted">No activity recorded yet for this customer.</div>
                  ) : events.map((ev, i) => (
                    <div key={i} className="p-3.5 bg-surface rounded-xl border border-border flex items-center justify-between gap-3 shadow-2xs">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${ev.color === 'emerald' ? 'bg-emerald-500' : ev.color === 'amber' ? 'bg-amber-500' : ev.color === 'indigo' ? 'bg-indigo-500' : 'bg-orange-500'}`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-text">{ev.label}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold border ${colorMap[ev.color]}`}>{ev.type}</span>
                          </div>
                          <p className="text-[11px] text-text-muted">{ev.date} • {ev.sub}</p>
                        </div>
                      </div>
                      <span className={`text-sm font-black ${ev.color === 'emerald' ? 'text-emerald-600' : ev.color === 'amber' ? 'text-amber-700' : ev.color === 'indigo' ? 'text-indigo-600' : 'text-orange-600'}`}>
                        ₹{(ev.amount || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* Footer Quick Actions */}
        <div className="p-4 border-t border-border bg-surface-2/40 flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-text-muted">
            Customer ID: <span className="font-mono">{customerId}</span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/pos"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl bg-surface border border-border text-xs font-bold text-text hover:bg-border transition-colors flex items-center gap-1.5"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-primary" /> New Sale (POS)
            </Link>
            <Link
              href="/girvi"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-colors flex items-center gap-1.5"
            >
              <Shield className="w-3.5 h-3.5" /> New Girvi Loan
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
