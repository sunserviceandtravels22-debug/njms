'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingBag, Users, ShieldCheck, CreditCard, TrendingUp, AlertTriangle, 
  Settings, Layers, Barcode as BarcodeIcon, DollarSign, Activity, ChevronRight 
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import { DeliveryQueueWidget } from '@/components/dashboard/DeliveryQueueWidget';

export default function DashboardPage() {
  const [goldRate, setGoldRate] = useState(72500); // 10g Gold
  const [silverRate, setSilverRate] = useState(88000); // 1kg Silver
  const [showRateEditor, setShowRateEditor] = useState(false);
  const [newGoldRate, setNewGoldRate] = useState('72500');
  const [newSilverRate, setNewSilverRate] = useState('88000');

  // Fetch daily rate from API
  useEffect(() => {
    fetch('/api/v1/rates')
      .then((res) => res.json())
      .then((res) => {
        if (res.ok && Array.isArray(res.data)) {
          const gold = res.data.find((r: any) => r.metal === 'GOLD');
          const silver = res.data.find((r: any) => r.metal === 'SILVER');
          if (gold) {
            const val10g = gold.rateRupeesPerGram * 10;
            setGoldRate(val10g);
            setNewGoldRate(val10g.toString());
          }
          if (silver) {
            const val1kg = silver.rateRupeesPerGram * 1000;
            setSilverRate(val1kg);
            setNewSilverRate(val1kg.toString());
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleUpdateRates = async () => {
    const gVal = parseFloat(newGoldRate) / 10; // rate in ₹/g
    const sVal = parseFloat(newSilverRate) / 1000; // rate in ₹/g

    try {
      await fetch('/api/v1/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metal: 'GOLD', purityPpt: 916, rateRupeesPerGram: gVal }),
      });
      await fetch('/api/v1/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metal: 'SILVER', purityPpt: 999, rateRupeesPerGram: sVal }),
      });
      setGoldRate(parseFloat(newGoldRate));
      setSilverRate(parseFloat(newSilverRate));
      setShowRateEditor(false);
    } catch (e) {
      console.error(e);
    }
  };

  const kpiCards = [
    { title: "Today's Sales", value: '₹1,11,240', count: '2 settlements', icon: ShoppingBag, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    { title: 'Credit Outstanding', value: '₹85,000', count: '4 customers', icon: CreditCard, color: 'text-amber-700 bg-amber-50 border-amber-200' },
    { title: 'Active Girvi Principal', value: '₹3,40,000', count: '12 pledges', icon: ShieldCheck, color: 'text-primary bg-primary/10 border-primary/20' },
    { title: 'Vault Total Valuation', value: '₹42,50,000', count: '184 active assets', icon: Layers, color: 'text-sky-700 bg-sky-50 border-sky-200' },
  ];

  const salesTrend = [
    { name: 'Mon', Gold: 45000, Silver: 12000, profit: 8500 },
    { name: 'Tue', Gold: 62000, Silver: 18000, profit: 12400 },
    { name: 'Wed', Gold: 38000, Silver: 9000, profit: 7100 },
    { name: 'Thu', Gold: 78000, Silver: 24000, profit: 16200 },
    { name: 'Fri', Gold: 54000, Silver: 15000, profit: 9800 },
    { name: 'Sat', Gold: 92000, Silver: 31000, profit: 19500 },
    { name: 'Sun', Gold: 111240, Silver: 28000, profit: 22400 },
  ];

  const categoryData = [
    { name: 'Rings', value: 45 },
    { name: 'Chains', value: 30 },
    { name: 'Bangles', value: 25 },
    { name: 'Necklaces', value: 18 },
    { name: 'Silver Coins', value: 40 },
  ];

  const lowStockAlerts = [
    { skuCode: 'SKU-GLD-RING-22K', category: 'Rings', currentCount: 2, minStockLevel: 5 },
    { skuCode: 'SKU-SLV-PAYAL-925', category: 'Payal', currentCount: 1, minStockLevel: 8 },
  ];

  const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-extrabold text-text tracking-tight">Dashboard & Intelligence</h1>
          <p className="text-xs text-text-muted">Live Market Benchmarks & Inventory Health Index</p>
        </div>
      </div>

      {/* Live Benchmark Tickers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Gold Ticker */}
        <div className="bg-surface border border-border p-6 rounded-2xl shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-center z-10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600">Live Gold Benchmark</span>
              </div>
              <h3 className="text-3xl font-extrabold text-text tracking-tight">
                ₹{goldRate.toLocaleString()} <span className="text-xs font-semibold text-text-muted">/ 10g</span>
              </h3>
            </div>
            <button
              onClick={() => setShowRateEditor(true)}
              className="p-3 bg-surface-2 hover:bg-border rounded-xl border border-border text-text transition-all"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-6 pt-4 border-t border-border flex justify-between text-xs text-text-muted font-semibold">
            <span>Vault Weight: 1.250 kg</span>
            <span className="text-amber-600">Concentration: 72%</span>
          </div>
        </div>

        {/* Silver Ticker */}
        <div className="bg-surface border border-border p-6 rounded-2xl shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-center z-10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-slate-400 animate-ping"></span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Live Silver Benchmark</span>
              </div>
              <h3 className="text-3xl font-extrabold text-text tracking-tight">
                ₹{silverRate.toLocaleString()} <span className="text-xs font-semibold text-text-muted">/ 1kg</span>
              </h3>
            </div>
            <button
              onClick={() => setShowRateEditor(true)}
              className="p-3 bg-surface-2 hover:bg-border rounded-xl border border-border text-text transition-all"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-6 pt-4 border-t border-border flex justify-between text-xs text-text-muted font-semibold">
            <span>Vault Weight: 14.500 kg</span>
            <span className="text-slate-500">Concentration: 28%</span>
          </div>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {kpiCards.map((card, idx) => {
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

      {/* Quick Action Bar */}
      <div className="bg-surface border border-border rounded-2xl p-4 sm:p-5">
        <h3 className="text-xs font-bold text-text uppercase tracking-wider mb-3">Quick Navigation</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <a href="/pos" className="p-3 bg-surface-2 hover:bg-border rounded-xl text-center text-xs font-semibold text-text flex items-center justify-center gap-2 transition-all">
            <ShoppingBag className="w-4 h-4 text-primary" /> New Sale (POS)
          </a>
          <a href="/inventory/new" className="p-3 bg-surface-2 hover:bg-border rounded-xl text-center text-xs font-semibold text-text flex items-center justify-center gap-2 transition-all">
            <Layers className="w-4 h-4 text-emerald-600" /> Ingest Asset
          </a>
          <a href="/girvi" className="p-3 bg-surface-2 hover:bg-border rounded-xl text-center text-xs font-semibold text-text flex items-center justify-center gap-2 transition-all">
            <ShieldCheck className="w-4 h-4 text-amber-600" /> New Girvi
          </a>
          <a href="/barcode" className="p-3 bg-surface-2 hover:bg-border rounded-xl text-center text-xs font-semibold text-text flex items-center justify-center gap-2 transition-all">
            <BarcodeIcon className="w-4 h-4 text-primary" /> Barcode Studio
          </a>
        </div>
      </div>

      {/* Document 11: Delivery Queue Reminders Widget */}
      <DeliveryQueueWidget />

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sales & Profit Velocity Chart */}
        <div className="lg:col-span-8 bg-surface p-6 rounded-2xl border border-border shadow-2xs space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-text">Settlement Velocity & Yield</h3>
              <p className="text-xs text-text-muted">7-day sales and realized net profit trend</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1 text-primary"><span className="w-2.5 h-2.5 rounded-full bg-primary"></span> Revenue</span>
              <span className="flex items-center gap-1 text-emerald-600"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Profit</span>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} hide />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#0f172a', color: '#fff' }} />
                <Area type="monotone" dataKey="Gold" stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} strokeWidth={3} />
                <Area type="monotone" dataKey="profit" stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Concentration */}
        <div className="lg:col-span-4 bg-surface p-6 rounded-2xl border border-border shadow-2xs space-y-4 flex flex-col justify-between">
          <h3 className="text-base font-bold text-text">Category Concentration</h3>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryData} dataKey="value" innerRadius={45} outerRadius={70} paddingAngle={6}>
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {categoryData.slice(0, 3).map((c, i) => (
              <div key={c.name} className="flex justify-between items-center p-2 rounded-lg bg-surface-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}></div>
                  <span className="font-semibold text-text">{c.name}</span>
                </div>
                <span className="font-bold text-text">{c.value} items</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Safety Floor Low Stock Protocol */}
      <div className="bg-surface border border-border rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-500" />
            <h3 className="text-base font-bold text-text">Safety Floor Low Stock Protocol</h3>
          </div>
          <span className="px-3 py-1 bg-rose-500/10 text-rose-600 rounded-full text-xs font-bold">
            {lowStockAlerts.length} Critical Alerts
          </span>
        </div>

        {lowStockAlerts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {lowStockAlerts.map((alert) => (
              <div key={alert.skuCode} className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-xl flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500">{alert.category}</span>
                  <h4 className="text-sm font-bold text-text">{alert.skuCode}</h4>
                </div>
                <div className="text-right">
                  <span className="text-lg font-extrabold text-rose-600">{alert.currentCount}</span>
                  <span className="text-[10px] text-text-muted block">Min Floor: {alert.minStockLevel}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-text-muted font-semibold">
            ✅ All stock levels are safely above threshold limits.
          </div>
        )}
      </div>

      {/* Rate Adjustment Modal */}
      {showRateEditor && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl p-6 max-w-sm w-full space-y-5 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-lg font-bold text-text">Daily Market Rates Adjustment</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-text-muted block mb-1">Gold Rate (₹ / 10g)</label>
                <input
                  type="number"
                  value={newGoldRate}
                  onChange={(e) => setNewGoldRate(e.target.value)}
                  className="w-full p-3 bg-surface-2 border border-border rounded-xl text-base font-bold text-text"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-text-muted block mb-1">Silver Rate (₹ / 1kg)</label>
                <input
                  type="number"
                  value={newSilverRate}
                  onChange={(e) => setNewSilverRate(e.target.value)}
                  className="w-full p-3 bg-surface-2 border border-border rounded-xl text-base font-bold text-text"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowRateEditor(false)}
                className="flex-1 py-3 bg-surface-2 hover:bg-border text-text rounded-xl font-semibold text-xs transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateRates}
                className="flex-1 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-xs shadow-md transition-all"
              >
                Authorize Rates
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
