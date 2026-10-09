
import React, { useMemo, useState, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { MetalType, ItemStatus, SaleStatus } from '../types';
import { formatCurrency, formatPercent, formatWeight } from '../utils/formatters';
import { COLORS } from '../constants';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, LineChart, Line, 
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';

export const Dashboard: React.FC = () => {
  const { inventory, sales, skus, goldRate, silverRate, updateRates, isLoading } = useInventory();
  const [showRateEditor, setShowRateEditor] = useState(false);
  const [newGoldRate, setNewGoldRate] = useState(goldRate.toString());
  const [newSilverRate, setNewSilverRate] = useState(silverRate.toString());

  useEffect(() => {
    setNewGoldRate(goldRate.toString());
    setNewSilverRate(silverRate.toString());
  }, [goldRate, silverRate]);

  // 1. Core Data Aggregations
  const activeItems = useMemo(() => inventory.filter(i => i.status === ItemStatus.IN_INVENTORY), [inventory]);
  const activeSales = useMemo(() => sales.filter(s => s.saleStatus !== SaleStatus.VOIDED), [sales]);

  const stats = useMemo(() => {
    const invValue = activeItems.reduce((s, i) => s + Number(i.purchasePrice) + Number(i.labourCharges), 0);
    const totalProfit = activeSales.reduce((s, sale) => s + Number(sale.profit || 0), 0);
    const totalRevenue = activeSales.reduce((s, sale) => s + Number(sale.sellingPrice || 0), 0);
    const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    return {
      inventoryValue: invValue,
      totalProfit,
      totalRevenue,
      avgMargin,
      itemCount: activeItems.length,
      goldWeight: activeItems.filter(i => i.metalType === MetalType.GOLD).reduce((s, i) => s + Number(i.weight), 0),
      silverWeight: activeItems.filter(i => i.metalType === MetalType.SILVER).reduce((s, i) => s + Number(i.weight), 0)
    };
  }, [activeItems, activeSales]);

  // 2. Low Stock Logic
  const lowStockAlerts = useMemo(() => {
    return skus.map(sku => {
      const currentCount = activeItems.filter(i => i.sku === sku.skuCode).length;
      return {
        ...sku,
        currentCount,
        isLow: currentCount < sku.minStockLevel
      };
    }).filter(s => s.isLow);
  }, [skus, activeItems]);

  // 3. Chart Data Preparation
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    activeItems.forEach(i => map[i.category] = (map[i.category] || 0) + 1);
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 5);
  }, [activeItems]);

  const salesTrend = useMemo(() => {
    const daily: Record<string, any> = {};
    activeSales.slice().reverse().forEach(s => {
      const d = s.saleDate.split('T')[0];
      if (!daily[d]) daily[d] = { name: d, Gold: 0, Silver: 0, profit: 0 };
      const rev = Number(s.sellingPrice);
      if (s.item?.metalType === MetalType.GOLD) daily[d].Gold += rev;
      else if (s.item?.metalType === MetalType.SILVER) daily[d].Silver += rev;
      daily[d].profit += Number(s.profit);
    });
    return Object.values(daily).slice(-7);
  }, [activeSales]);

  const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-10 max-w-[1600px] mx-auto pb-24">
      {/* 1. Market & Liquidity Tickers */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="bg-slate-950 p-10 rounded-[3rem] border-b-8 border-yellow-500 text-white relative overflow-hidden shadow-2xl">
              <div className="relative z-10 flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full bg-yellow-500 animate-ping"></span>
                    <p className="text-[9px] font-black uppercase tracking-[0.4em] text-yellow-500/60">Live Gold Benchmark</p>
                  </div>
                  <h3 className="text-5xl font-black tracking-tighter">{formatCurrency(goldRate)} <span className="text-sm opacity-30 font-bold">/ 10g</span></h3>
                </div>
                <button onClick={() => setShowRateEditor(true)} className="w-14 h-14 bg-white/5 rounded-2xl hover:bg-white/10 transition-all border border-white/10 flex items-center justify-center text-xl">⚙️</button>
              </div>
              <div className="mt-8 pt-8 border-t border-white/5 flex gap-8">
                 <div>
                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">Vault Weight</p>
                    <p className="text-xl font-black">{formatWeight(stats.goldWeight)}</p>
                 </div>
                 <div>
                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">Concentration</p>
                    <p className="text-xl font-black text-yellow-500">{formatPercent((stats.goldWeight / (stats.goldWeight + stats.silverWeight || 1)) * 100)}</p>
                 </div>
              </div>
              <div className="absolute top-0 right-0 p-8 opacity-5 text-9xl font-black select-none pointer-events-none">AU</div>
           </div>

           <div className="bg-slate-950 p-10 rounded-[3rem] border-b-8 border-slate-400 text-white relative overflow-hidden shadow-2xl">
              <div className="relative z-10 flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full bg-slate-400 animate-ping"></span>
                    <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-400/60">Live Silver Benchmark</p>
                  </div>
                  <h3 className="text-5xl font-black tracking-tighter">{formatCurrency(silverRate)} <span className="text-sm opacity-30 font-bold">/ 1kg</span></h3>
                </div>
                <button onClick={() => setShowRateEditor(true)} className="w-14 h-14 bg-white/5 rounded-2xl hover:bg-white/10 transition-all border border-white/10 flex items-center justify-center text-xl">⚙️</button>
              </div>
              <div className="mt-8 pt-8 border-t border-white/5 flex gap-8">
                 <div>
                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">Vault Weight</p>
                    <p className="text-xl font-black">{formatWeight(stats.silverWeight / 1000)} kg</p>
                 </div>
                 <div>
                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">Concentration</p>
                    <p className="text-xl font-black text-slate-400">{formatPercent((stats.silverWeight / (stats.goldWeight + stats.silverWeight || 1)) * 100)}</p>
                 </div>
              </div>
              <div className="absolute top-0 right-0 p-8 opacity-5 text-9xl font-black select-none pointer-events-none">AG</div>
           </div>
        </div>

        <div className="xl:col-span-4 bg-white p-10 rounded-[3rem] shadow-xl border-2 border-slate-50 flex flex-col justify-center text-center">
           <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400 mb-6">Inventory Health Index</p>
           <div className="relative inline-flex items-center justify-center mb-6">
              <svg className="w-40 h-40 transform -rotate-90">
                <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="15" fill="transparent" className="text-slate-100" />
                <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="15" fill="transparent" strokeDasharray={440} strokeDashoffset={440 - (440 * Math.min(stats.avgMargin * 2, 100)) / 100} className="text-indigo-600" />
              </svg>
              <div className="absolute text-3xl font-black tracking-tighter text-slate-900">{formatPercent(stats.avgMargin)}</div>
           </div>
           <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Global Portfolio Margin</p>
        </div>
      </div>

      {/* 2. Primary KPI Matrix */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard label="Net Profit Yield" value={formatCurrency(stats.totalProfit)} icon="💰" color="emerald" trend="Life-to-date settlements" />
        <KPICard label="Gross Cashflow" value={formatCurrency(stats.totalRevenue)} icon="📈" color="indigo" trend="Transactional revenue" />
        <KPICard label="Vault Valuation" value={formatCurrency(stats.inventoryValue)} icon="🏦" color="blue" trend="Acquisition basis cost" />
        <KPICard label="Registry Count" value={stats.itemCount} icon="📦" color="amber" trend="Active physical assets" />
      </div>

      {/* 3. Performance & Diversification Visuals */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 bg-white p-10 rounded-[3.5rem] border-2 border-slate-50 shadow-sm min-h-[500px]">
           <div className="flex justify-between items-center mb-10">
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Settlement Velocity</h3>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">7-Day Transactional Flow</p>
              </div>
              <div className="flex gap-4">
                 <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-indigo-500"></span><span className="text-[8px] font-black uppercase">Revenue</span></div>
                 <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500"></span><span className="text-[8px] font-black uppercase">Yield</span></div>
              </div>
           </div>
           <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" hide />
                  <YAxis hide />
                  <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', backgroundColor: '#0f172a', color: '#fff' }} />
                  <Area type="monotone" dataKey="Gold" stackId="1" stroke="#fbbf24" fill="#fbbf24" fillOpacity={0.1} strokeWidth={4} />
                  <Area type="monotone" dataKey="Silver" stackId="1" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.1} strokeWidth={4} />
                  <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={4} dot={{ r: 6, fill: '#10b981' }} />
                </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>

        <div className="lg:col-span-4 bg-slate-950 p-10 rounded-[3.5rem] shadow-2xl text-white">
           <h3 className="text-2xl font-black uppercase tracking-tighter text-center mb-8">Category Concentration</h3>
           <div className="h-[250px] mb-8">
              <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                    <Pie data={categoryData} dataKey="value" innerRadius={60} outerRadius={90} paddingAngle={8}>
                       {categoryData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                 </PieChart>
              </ResponsiveContainer>
           </div>
           <div className="space-y-3">
              {categoryData.map((c, i) => (
                <div key={c.name} className="flex justify-between items-center p-4 bg-white/5 rounded-2xl">
                   <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}></div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{c.name}</span>
                   </div>
                   <span className="text-sm font-black">{c.value}</span>
                </div>
              ))}
           </div>
        </div>
      </div>

      {/* 4. Critical Alerts & Protocols */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-12 bg-white rounded-[3rem] border-4 border-slate-100 shadow-xl overflow-hidden">
           <div className="bg-rose-500 p-8 text-white flex justify-between items-center">
              <div>
                 <h4 className="text-2xl font-black uppercase tracking-tighter">Safety Floor Protocol</h4>
                 <p className="text-[9px] font-black uppercase tracking-widest opacity-70 mt-1">Real-time Low Stock Intelligence</p>
              </div>
              <div className="bg-white/20 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest">{lowStockAlerts.length} Critical Alerts</div>
           </div>
           
           <div className="p-8">
              {lowStockAlerts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                   {lowStockAlerts.map(alert => (
                     <div key={alert.skuCode} className="p-6 bg-rose-50 border-2 border-rose-100 rounded-3xl flex justify-between items-center">
                        <div>
                           <p className="text-[8px] font-black text-rose-400 uppercase tracking-widest mb-1">{alert.category}</p>
                           <h5 className="text-xl font-black text-rose-950 uppercase">{alert.skuCode}</h5>
                        </div>
                        <div className="text-right">
                           <p className="text-2xl font-black text-rose-600">{alert.currentCount}</p>
                           <p className="text-[8px] font-black uppercase text-rose-400">Min: {alert.minStockLevel}</p>
                        </div>
                     </div>
                   ))}
                </div>
              ) : (
                <div className="py-12 text-center">
                   <div className="text-6xl mb-6">✅</div>
                   <h5 className="text-xl font-black uppercase text-slate-300 tracking-widest">Inventory Levels Above Safety Benchmarks</h5>
                </div>
              )}
           </div>
        </div>
      </div>

      {showRateEditor && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[400] flex items-center justify-center p-6">
          <div className="bg-white rounded-[3rem] p-12 max-w-md w-full space-y-8 animate-in zoom-in duration-300 shadow-2xl">
            <h3 className="text-3xl font-black text-center uppercase tracking-tighter">Market Adjustment</h3>
            <div className="space-y-6">
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Gold (10g Basis)</label>
                 <input type="number" value={newGoldRate} onChange={e => setNewGoldRate(e.target.value)} className="w-full p-5 bg-yellow-50 border-2 border-yellow-100 rounded-2xl font-black text-yellow-600 text-3xl focus:border-yellow-400 outline-none" placeholder="Gold Rate" />
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Silver (1kg Basis)</label>
                 <input type="number" value={newSilverRate} onChange={e => setNewSilverRate(e.target.value)} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-slate-400 text-3xl focus:border-slate-400 outline-none" placeholder="Silver Rate" />
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setShowRateEditor(false)} className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase tracking-widest text-[10px]">Cancel</button>
              <button onClick={async () => { await updateRates(Number(newGoldRate), Number(newSilverRate)); setShowRateEditor(false); }} className="flex-[2] py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-indigo-700 transition-all">Authorize Benchmarks</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const KPICard = ({ label, value, icon, color, trend }: any) => {
  const themes: any = { 
    blue: 'bg-blue-50 text-blue-900 border-blue-100', 
    emerald: 'bg-emerald-50 text-emerald-900 border-emerald-100', 
    indigo: 'bg-indigo-50 text-indigo-900 border-indigo-100', 
    amber: 'bg-amber-50 text-amber-900 border-amber-100' 
  };
  return (
    <div className={`p-8 rounded-[3rem] border-2 ${themes[color]} shadow-lg transition-transform hover:scale-[1.02] duration-500`}>
      <div className="text-4xl mb-4">{icon}</div>
      <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-40 mb-2">{label}</p>
      <h4 className="text-3xl font-black tracking-tighter mb-2">{value}</h4>
      <p className="text-[9px] font-bold opacity-30 uppercase tracking-widest">{trend}</p>
    </div>
  );
};
