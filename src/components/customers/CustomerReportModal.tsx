'use client';

import React, { useState, useEffect } from 'react';
import { X, Download, Printer, CheckCircle2, ShieldCheck, ShoppingBag, CreditCard, Coins, RefreshCw } from 'lucide-react';
import { exportToCSV } from '@/lib/reports/export';

interface CustomerReportModalProps {
  customerId: string;
  customerName?: string;
  onClose: () => void;
}

export const CustomerReportModal: React.FC<CustomerReportModalProps> = ({
  customerId,
  customerName,
  onClose,
}) => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/v1/customers/${customerId}/report`)
      .then((res) => res.json())
      .then((res) => {
        if (res.ok) {
          setData(res.data);
        }
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, [customerId]);

  const handleExportCSV = () => {
    if (!data || !data.timeline) return;
    const rows = data.timeline.map((t: any) => ({
      Date: new Date(t.date).toLocaleDateString(),
      Module: t.module,
      Type: t.type,
      Title: t.title,
      'Amount (INR)': t.amountRupees,
      Status: t.status,
      Details: t.details,
    }));
    exportToCSV(`Customer_Report_${data.credentials.name.replace(/\s+/g, '_')}`, rows);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-4xl max-h-[90dvh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95">
        {/* Header */}
        <div className="p-6 border-b border-border bg-surface-2 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-primary uppercase tracking-widest">Full Customer Profile Statement</span>
              {data?.isReconciled && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-600 rounded-full">
                  <CheckCircle2 className="w-3 h-3" /> Reconciled
                </span>
              )}
            </div>
            <h2 className="text-2xl font-extrabold text-text tracking-tight mt-0.5">
              {data?.credentials?.name || customerName || 'Customer Profile'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCSV}
              disabled={!data}
              className="flex items-center gap-1.5 px-3 py-2 bg-surface hover:bg-border rounded-xl border border-border text-xs font-bold text-text disabled:opacity-40 transition-all"
            >
              <Download className="w-4 h-4 text-primary" /> Export CSV
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold shadow-md transition-all"
            >
              <Printer className="w-4 h-4" /> Print PDF
            </button>
            <button onClick={onClose} className="p-2 rounded-xl text-text-muted hover:text-text hover:bg-surface border border-border">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="p-12 text-center text-xs text-text-muted">Loading lifetime customer report...</div>
        ) : !data ? (
          <div className="p-12 text-center text-xs text-text-muted">Failed to load customer profile data.</div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            {/* Section A: Credentials */}
            <div className="bg-surface-2 p-5 rounded-2xl border border-border space-y-3">
              <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider">Section A: Identity & Credentials</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-text-muted block">Primary Phone</span>
                  <span className="font-extrabold text-text">{data.credentials.phone}</span>
                </div>
                <div>
                  <span className="text-text-muted block">Relation Name</span>
                  <span className="font-bold text-text">
                    {data.credentials.relationName ? `${data.credentials.relationType} of ${data.credentials.relationName}` : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-text-muted block">City / Locality</span>
                  <span className="font-bold text-text">{data.credentials.locality || data.credentials.city || 'Local'}</span>
                </div>
                <div>
                  <span className="text-text-muted block">ID Proof</span>
                  <span className="font-bold text-text font-mono">
                    {data.credentials.identityDocType ? `${data.credentials.identityDocType} - ${data.credentials.identityDocNumber || 'Yes'}` : 'Not Provided'}
                  </span>
                </div>
              </div>
            </div>

            {/* Section B: Lifetime Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 bg-surface rounded-xl border border-border">
                <span className="text-[10px] font-bold text-text-muted uppercase block">Total Sales</span>
                <span className="text-lg font-extrabold text-primary">₹{data.metrics.totalSalesRupees.toLocaleString('en-IN')}</span>
                <span className="text-[10px] text-text-muted block mt-0.5">{data.metrics.invoiceCount} Purchases</span>
              </div>
              <div className="p-4 bg-surface rounded-xl border border-border">
                <span className="text-[10px] font-bold text-text-muted uppercase block">Active Girvi Principal</span>
                <span className="text-lg font-extrabold text-amber-600">₹{data.metrics.activeGirviPrincipalRupees.toLocaleString('en-IN')}</span>
                <span className="text-[10px] text-amber-600 block mt-0.5">{data.metrics.activeGirviCount} Pledges</span>
              </div>
              <div className="p-4 bg-surface rounded-xl border border-border">
                <span className="text-[10px] font-bold text-text-muted uppercase block">Credit Limit</span>
                <span className="text-lg font-extrabold text-text">₹{data.metrics.creditLimitRupees.toLocaleString('en-IN')}</span>
                <span className="text-[10px] text-text-muted block mt-0.5">Approved Limit</span>
              </div>
              <div className="p-4 bg-surface rounded-xl border border-border">
                <span className="text-[10px] font-bold text-text-muted uppercase block">Customer Tag</span>
                <span className="text-lg font-extrabold text-primary">{data.credentials.tag}</span>
                <span className="text-[10px] text-text-muted block mt-0.5">Status Tier</span>
              </div>
            </div>

            {/* Section C: Chronological Timeline */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-text uppercase tracking-wider">
                Section C: Full Lifetime Transaction Timeline ({data.timeline.length})
              </h3>
              <div className="bg-surface rounded-xl border border-border divide-y divide-border">
                {data.timeline.length === 0 ? (
                  <div className="p-6 text-center text-xs text-text-muted">No historical transactions recorded.</div>
                ) : (
                  data.timeline.map((event: any) => (
                    <div key={event.id} className="p-4 flex items-center justify-between gap-4 hover:bg-surface-2 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                          {event.module === 'Sales' ? <ShoppingBag className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4 text-amber-600" />}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-text">{event.title}</div>
                          <div className="text-xs text-text-muted">{event.details}</div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-extrabold text-sm text-primary">₹{event.amountRupees.toLocaleString('en-IN')}</div>
                        <div className="text-[10px] text-text-muted">{new Date(event.date).toLocaleDateString()}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
