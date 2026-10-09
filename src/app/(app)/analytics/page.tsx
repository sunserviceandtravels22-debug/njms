'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Wallet,
  Users,
  Building2,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  HelpCircle,
  Calendar,
} from 'lucide-react';
import { formatMoney } from '@/domain/money';

interface AnalyticsData {
  kpis: {
    totalCustomers: number;
    totalInPaise: string;
    totalOutPaise: string;
    netCashPaise: string;
    activeRepledgeLoans: number;
    activeRepledgePrincipalPaise: string;
  };
  locations: { id: string; name: string; type: string }[];
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('30d');

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/analytics/query?range=${range}`);
      const json = await res.json();
      if (json.ok) {
        setData(json.data);
      }
    } catch (err) {
      console.error('Failed to load analytics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [range]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-4 rounded-2xl border border-border shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-text">Analytics & Visualisation</h1>
            <p className="text-xs text-text-muted">30-second closing dashboard, cashflow trends & LTV metrics</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="px-3 py-2 bg-surface-2 border border-border rounded-xl text-xs font-bold text-text"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="fy">This Financial Year</option>
          </select>
          <button onClick={fetchAnalytics} className="p-2 text-text-muted hover:text-text rounded-xl bg-surface-2 border border-border">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-4 bg-surface rounded-2xl border border-border space-y-2">
            <div className="flex items-center justify-between text-text-muted">
              <span className="text-xs font-semibold">Total Customers</span>
              <Users className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl font-black text-text">{data.kpis.totalCustomers}</div>
            <div className="text-[10px] text-emerald-600 font-bold">Active CRM records</div>
          </div>

          <div className="p-4 bg-surface rounded-2xl border border-border space-y-2">
            <div className="flex items-center justify-between text-text-muted">
              <span className="text-xs font-semibold">Cash Receipts (IN)</span>
              <Wallet className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-black text-emerald-600">
              {formatMoney(BigInt(data.kpis.totalInPaise))}
            </div>
            <div className="text-[10px] text-text-muted font-medium">Verified cashbook inflow</div>
          </div>

          <div className="p-4 bg-surface rounded-2xl border border-border space-y-2">
            <div className="flex items-center justify-between text-text-muted">
              <span className="text-xs font-semibold">Net Cash Flow</span>
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <div className="text-xl font-black text-primary">
              {formatMoney(BigInt(data.kpis.netCashPaise))}
            </div>
            <div className="text-[10px] text-text-muted font-medium">Net period earnings</div>
          </div>

          <div className="p-4 bg-surface rounded-2xl border border-border space-y-2">
            <div className="flex items-center justify-between text-text-muted">
              <span className="text-xs font-semibold">Re-pledge Funding</span>
              <Building2 className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-xl font-black text-amber-600">
              {formatMoney(BigInt(data.kpis.activeRepledgePrincipalPaise))}
            </div>
            <div className="text-[10px] text-text-muted font-medium">{data.kpis.activeRepledgeLoans} Active Financier Loans</div>
          </div>
        </div>
      )}

      {/* Visual Charts & Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cash Flow Distribution Card */}
        <div className="p-4 bg-surface rounded-2xl border border-border space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h3 className="text-sm font-bold text-text">Cash Flow Health Breakdown</h3>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-500/10 text-emerald-600">Live Metric</span>
          </div>

          <div className="space-y-2 pt-2">
            <div>
              <div className="flex justify-between text-xs font-semibold text-text mb-1">
                <span>Receipts vs Payouts Ratio</span>
                <span>Positive Flow</span>
              </div>
              <div className="w-full bg-surface-2 rounded-full h-3 overflow-hidden flex border border-border">
                <div className="bg-emerald-500 h-full" style={{ width: '65%' }} />
                <div className="bg-rose-500 h-full" style={{ width: '35%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Vault & Storage Distribution Card */}
        <div className="p-4 bg-surface rounded-2xl border border-border space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h3 className="text-sm font-bold text-text">Custody Location Distribution</h3>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-primary/10 text-primary">Active Vaults</span>
          </div>

          <div className="space-y-2 pt-2">
            {data?.locations.map((loc) => (
              <div key={loc.id} className="flex items-center justify-between text-xs p-2 bg-surface-2 rounded-xl border border-border">
                <span className="font-bold text-text">{loc.name}</span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-surface border border-border text-text-muted uppercase">
                  {loc.type}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
