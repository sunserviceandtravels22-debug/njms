'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShoppingBag, Users, ShieldCheck, CreditCard, TrendingUp, AlertTriangle,
  Settings, Layers, Barcode as BarcodeIcon, RefreshCw, CheckCircle2,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { DeliveryQueueWidget } from '@/components/dashboard/DeliveryQueueWidget';

// ─── helpers ─────────────────────────────────────────────────────────────────
function formatINR(paise: string | number | bigint): string {
  const rupees = Number(paise) / 100;
  if (rupees >= 1_00_00_000) return `₹${(rupees / 1_00_00_000).toFixed(2)} Cr`;
  if (rupees >= 1_00_000) return `₹${(rupees / 1_00_000).toFixed(1)} L`;
  return `₹${rupees.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

// ─── component ───────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Rate editor
  const [showRateEditor, setShowRateEditor] = useState(false);
  const [newGoldRate, setNewGoldRate] = useState('');    // ₹/10g
  const [newSilverRate, setNewSilverRate] = useState(''); // ₹/kg
  const [rateSaving, setRateSaving] = useState(false);
  const [rateSaved, setRateSaved] = useState(false);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/dashboard', { credentials: 'include' });
      if (res.status === 401) { window.location.href = '/login'; return; }
      const json = await res.json();
      if (json.ok) {
        setData(json.data);
        setLastRefresh(new Date());
        // Pre-fill rate editor from DB
        const gold = json.data.rates?.find((r: any) => r.metal === 'GOLD');
        const silver = json.data.rates?.find((r: any) => r.metal === 'SILVER');
        if (gold) setNewGoldRate(String(Math.round(gold.rateRupeesPerGram * 10)));
        if (silver) setNewSilverRate(String(Math.round(silver.rateRupeesPerGram * 1000)));
      } else {
        setError(json.error || 'Failed to load dashboard data');
      }
    } catch (e: any) {
      setError('Network error — could not reach server');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const handleUpdateRates = async () => {
    const gVal = parseFloat(newGoldRate) / 10;    // ₹/g
    const sVal = parseFloat(newSilverRate) / 1000; // ₹/g
    if (!gVal || !sVal || gVal <= 0 || sVal <= 0) return;

    setRateSaving(true);
    try {
      await Promise.all([
        fetch('/api/v1/rates', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ metal: 'GOLD', purityPpt: 999, rateRupeesPerGram: gVal }),
        }),
        fetch('/api/v1/rates', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ metal: 'SILVER', purityPpt: 999, rateRupeesPerGram: sVal }),
        }),
      ]);
      setRateSaved(true);
      setShowRateEditor(false);
      fetchDashboard(); // Refresh all data
      setTimeout(() => setRateSaved(false), 3000);
    } catch (e) {
      console.error('Rate update failed', e);
    } finally {
      setRateSaving(false);
    }
  };

  // Derived display values from DB rates
  const goldRate10g = data?.rates?.find((r: any) => r.metal === 'GOLD')?.rateRupeesPerGram
    ? Math.round(data.rates.find((r: any) => r.metal === 'GOLD').rateRupeesPerGram * 10)
    : null;
  const silverRate1kg = data?.rates?.find((r: any) => r.metal === 'SILVER')?.rateRupeesPerGram
    ? Math.round(data.rates.find((r: any) => r.metal === 'SILVER').rateRupeesPerGram * 1000)
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-extrabold text-text tracking-tight">Dashboard</h1>
          <p className="text-xs text-text-muted">
            Live data from database ·{' '}
            {loading ? 'Refreshing…' : `Updated ${lastRefresh.toLocaleTimeString('en-IN')}`}
          </p>
        </div>
        <button
          onClick={fetchDashboard}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-2 text-xs font-semibold text-text transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm font-medium">
          ⚠️ {error}
        </div>
      )}

      {rateSaved && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> Rates updated and saved to database
        </div>
      )}

      {/* Live Metal Rates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Gold */}
        <div className="bg-surface border border-border p-6 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600">
                  Gold Rate (Today)
                </span>
              </div>
              <h3 className="text-3xl font-extrabold text-text tracking-tight">
                {goldRate10g != null
                  ? `₹${goldRate10g.toLocaleString('en-IN')}`
                  : <span className="text-text-muted text-lg">Not set today</span>}
                {goldRate10g != null && <span className="text-xs font-semibold text-text-muted ml-1">/ 10g</span>}
              </h3>
            </div>
            <button
              onClick={() => setShowRateEditor(true)}
              className="p-3 bg-surface-2 hover:bg-border rounded-xl border border-border text-text transition-all"
              title="Update today's gold & silver rates"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-4 pt-4 border-t border-border text-xs text-text-muted">
            {goldRate10g != null
              ? `₹${(goldRate10g / 10).toFixed(2)} per gram · click ⚙ to update`
              : 'No rate set for today — click ⚙ to add'}
          </div>
        </div>

        {/* Silver */}
        <div className="bg-surface border border-border p-6 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-slate-400 animate-ping" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Silver Rate (Today)
                </span>
              </div>
              <h3 className="text-3xl font-extrabold text-text tracking-tight">
                {silverRate1kg != null
                  ? `₹${silverRate1kg.toLocaleString('en-IN')}`
                  : <span className="text-text-muted text-lg">Not set today</span>}
                {silverRate1kg != null && <span className="text-xs font-semibold text-text-muted ml-1">/ 1kg</span>}
              </h3>
            </div>
            <button
              onClick={() => setShowRateEditor(true)}
              className="p-3 bg-surface-2 hover:bg-border rounded-xl border border-border text-text transition-all"
              title="Update today's rates"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-4 pt-4 border-t border-border text-xs text-text-muted">
            {silverRate1kg != null
              ? `₹${(silverRate1kg / 1000).toFixed(2)} per gram · click ⚙ to update`
              : 'No rate set for today — click ⚙ to add'}
          </div>
        </div>
      </div>

      {/* KPI Cards — real DB data */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          {
            title: "Today's Sales",
            value: loading ? '—' : data ? formatINR(data.todaySalesAmountPaise) : '₹0',
            count: loading ? '' : data ? `${data.todaySalesCount} transaction${data.todaySalesCount !== 1 ? 's' : ''}` : '0 transactions',
            icon: ShoppingBag,
            color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
          },
          {
            title: 'Credit Issued',
            value: loading ? '—' : data ? formatINR(data.creditOutstandingPaise) : '₹0',
            count: loading ? '' : data ? `${data.creditCustomerCount} customers` : '0 customers',
            icon: CreditCard,
            color: 'text-amber-700 bg-amber-50 border-amber-200',
          },
          {
            title: 'Active Girvi',
            value: loading ? '—' : data ? formatINR(data.girviPrincipalPaise) : '₹0',
            count: loading ? '' : data ? `${data.girviCount} pledge${data.girviCount !== 1 ? 's' : ''}` : '0 pledges',
            icon: ShieldCheck,
            color: 'text-primary bg-primary/10 border-primary/20',
          },
          {
            title: 'Vault Valuation',
            value: loading ? '—' : data ? formatINR(data.vaultValuePaise) : '₹0',
            count: loading ? '' : data ? `${data.totalStockCount} items in stock` : '0 items',
            icon: Layers,
            color: 'text-sky-700 bg-sky-50 border-sky-200',
          },
        ].map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className={`p-4 rounded-2xl border ${card.color} flex flex-col justify-between shadow-2xs`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider">{card.title}</span>
                <Icon className="w-5 h-5 shrink-0" />
              </div>
              <div className="mt-3">
                <div className="text-lg sm:text-2xl font-extrabold tracking-tight">{card.value}</div>
                <div className="text-xs opacity-80 mt-0.5">{card.count}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-surface border border-border rounded-2xl p-4 sm:p-5">
        <h3 className="text-xs font-bold text-text uppercase tracking-wider mb-3">Quick Navigation</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: '/pos', icon: ShoppingBag, label: 'New Sale (POS)', color: 'text-primary' },
            { href: '/inventory/new', icon: Layers, label: 'Add Inventory', color: 'text-emerald-600' },
            { href: '/girvi', icon: ShieldCheck, label: 'New Girvi', color: 'text-amber-600' },
            { href: '/barcode', icon: BarcodeIcon, label: 'Barcode Studio', color: 'text-primary' },
          ].map(({ href, icon: Icon, label, color }) => (
            <a key={href} href={href} className="p-3 bg-surface-2 hover:bg-border rounded-xl text-center text-xs font-semibold text-text flex items-center justify-center gap-2 transition-all">
              <Icon className={`w-4 h-4 ${color}`} />
              {label}
            </a>
          ))}
        </div>
      </div>

      {/* Delivery Queue Widget */}
      <DeliveryQueueWidget />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sales Trend */}
        <div className="lg:col-span-8 bg-surface p-6 rounded-2xl border border-border shadow-2xs space-y-4">
          <div>
            <h3 className="text-base font-bold text-text">Sales Trend — Last 7 Days</h3>
            <p className="text-xs text-text-muted">Daily settled revenue from database</p>
          </div>
          <div className="h-56 w-full">
            {!loading && data?.salesTrend?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.salesTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} hide />
                  <Tooltip
                    formatter={(v: any) => [`₹${Number(v).toLocaleString('en-IN')}`, 'Revenue']}
                    contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#0f172a', color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="Revenue" stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-text-muted">
                {loading ? 'Loading chart…' : 'No sales data yet — start recording sales in POS'}
              </div>
            )}
          </div>
        </div>

        {/* Category Pie */}
        <div className="lg:col-span-4 bg-surface p-6 rounded-2xl border border-border shadow-2xs space-y-4 flex flex-col justify-between">
          <h3 className="text-base font-bold text-text">Stock by Category</h3>
          {!loading && data?.categoryData?.length > 0 ? (
            <>
              <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.categoryData} dataKey="value" innerRadius={40} outerRadius={65} paddingAngle={5}>
                      {data.categoryData.map((_: any, i: number) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any, n: any, p: any) => [`${v} items`, p.payload.name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5">
                {data.categoryData.slice(0, 4).map((c: any, i: number) => (
                  <div key={c.name} className="flex justify-between items-center p-2 rounded-lg bg-surface-2 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="font-semibold text-text">{c.name}</span>
                    </div>
                    <span className="font-bold text-text">{c.value} items</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-text-muted text-center">
              {loading ? 'Loading…' : 'No inventory yet — add items to see breakdown'}
            </div>
          )}
        </div>
      </div>

      {/* Customers count */}
      {!loading && data && (
        <div className="bg-surface border border-border rounded-2xl p-4 shadow-2xs flex items-center gap-4">
          <Users className="w-8 h-8 text-primary shrink-0" />
          <div>
            <div className="text-2xl font-extrabold text-text">{data.totalCustomers}</div>
            <div className="text-xs text-text-muted font-semibold">Total Registered Customers</div>
          </div>
          <a href="/customers" className="ml-auto px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-colors">
            View All →
          </a>
        </div>
      )}

      {/* Rate Adjustment Modal */}
      {showRateEditor && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl p-6 max-w-sm w-full space-y-5 shadow-2xl">
            <div>
              <h3 className="text-lg font-bold text-text">Update Today's Metal Rates</h3>
              <p className="text-xs text-text-muted mt-1">Rates are stored in the database and used for all valuations</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-text-muted block mb-1.5">
                  Gold Rate (₹ per 10 grams)
                </label>
                <input
                  type="number"
                  min="1000"
                  step="100"
                  value={newGoldRate}
                  onChange={(e) => setNewGoldRate(e.target.value)}
                  placeholder="e.g. 72500"
                  className="w-full p-3 bg-surface-2 border border-border rounded-xl text-base font-bold text-text focus:ring-2 focus:ring-primary focus:outline-none"
                />
                {newGoldRate && (
                  <p className="text-[11px] text-text-muted mt-1">
                    = ₹{(parseFloat(newGoldRate) / 10).toFixed(2)} per gram
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs font-bold text-text-muted block mb-1.5">
                  Silver Rate (₹ per 1 kg)
                </label>
                <input
                  type="number"
                  min="500"
                  step="100"
                  value={newSilverRate}
                  onChange={(e) => setNewSilverRate(e.target.value)}
                  placeholder="e.g. 88000"
                  className="w-full p-3 bg-surface-2 border border-border rounded-xl text-base font-bold text-text focus:ring-2 focus:ring-primary focus:outline-none"
                />
                {newSilverRate && (
                  <p className="text-[11px] text-text-muted mt-1">
                    = ₹{(parseFloat(newSilverRate) / 1000).toFixed(2)} per gram
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowRateEditor(false)}
                disabled={rateSaving}
                className="flex-1 py-3 bg-surface-2 hover:bg-border text-text rounded-xl font-semibold text-xs transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateRates}
                disabled={rateSaving || !newGoldRate || !newSilverRate}
                className="flex-1 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-xs shadow-md transition-all disabled:opacity-50"
              >
                {rateSaving ? 'Saving…' : 'Save Rates to DB'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
