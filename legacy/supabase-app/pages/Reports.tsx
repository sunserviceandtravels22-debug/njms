
import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { MetalType, ItemStatus, SaleStatus } from '../types';
import { formatCurrency, formatWeight, formatPercent, formatDate } from '../utils/formatters';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, AreaChart, Area,
  PieChart, Pie, Cell
} from 'recharts';
import { exportToCSV } from '../utils/export';

export const Reports: React.FC = () => {
  const { inventory, sales } = useInventory();
  
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  // Filter Data based on date range
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      const saleDate = s.saleDate.split('T')[0];
      return saleDate >= dateRange.start && saleDate <= dateRange.end && s.saleStatus !== SaleStatus.VOIDED;
    });
  }, [sales, dateRange]);

  const purchasedInPeriod = useMemo(() => {
    return inventory.filter(i => {
      const pDate = i.purchaseDate.split('T')[0];
      return pDate >= dateRange.start && pDate <= dateRange.end;
    });
  }, [inventory, dateRange]);

  const currentHoldings = useMemo(() => {
    return inventory.filter(i => i.status === ItemStatus.IN_INVENTORY);
  }, [inventory]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const grossRevenue = filteredSales.reduce((sum, s) => sum + s.sellingPrice, 0);
    const totalProfit = filteredSales.reduce((sum, s) => sum + s.profit, 0);
    const avgMargin = filteredSales.length > 0 ? (filteredSales.reduce((sum, s) => sum + s.profitPercent, 0) / filteredSales.length) : 0;
    
    const goldSold = filteredSales.filter(s => s.item?.metalType === MetalType.GOLD).reduce((s, val) => s + val.weightAtSale, 0);
    const silverSold = filteredSales.filter(s => s.item?.metalType === MetalType.SILVER).reduce((s, val) => s + val.weightAtSale, 0);
    
    const vaultValue = currentHoldings.reduce((s, i) => s + i.purchasePrice + i.labourCharges, 0);
    
    return {
      grossRevenue,
      totalProfit,
      avgMargin,
      goldSold,
      silverSold,
      vaultValue,
      transactionCount: filteredSales.length
    };
  }, [filteredSales, currentHoldings]);

  // Chart Data Preparation
  const categoryPerformance = useMemo(() => {
    const cats: Record<string, { name: string; profit: number; revenue: number }> = {};
    filteredSales.forEach(s => {
      const cat = s.item?.category || 'Uncategorized';
      if (!cats[cat]) cats[cat] = { name: cat, profit: 0, revenue: 0 };
      cats[cat].profit += s.profit;
      cats[cat].revenue += s.sellingPrice;
    });
    return Object.values(cats).sort((a, b) => b.profit - a.profit);
  }, [filteredSales]);

  const timeSeriesData = useMemo(() => {
    const days: Record<string, any> = {};
    filteredSales.forEach(s => {
      const d = formatDate(s.saleDate);
      if (!days[d]) days[d] = { date: d, revenue: 0, profit: 0 };
      days[d].revenue += s.sellingPrice;
      days[d].profit += s.profit;
    });
    return Object.values(days);
  }, [filteredSales]);

  const metalDistribution = useMemo(() => [
    { name: 'Gold', value: currentHoldings.filter(i => i.metalType === MetalType.GOLD).length },
    { name: 'Silver', value: currentHoldings.filter(i => i.metalType === MetalType.SILVER).length }
  ], [currentHoldings]);

  const COLORS = ['#FFD700', '#94a3b8'];

  const handleExportCSV = () => {
    const data = filteredSales.map(s => ({
      'Date': formatDate(s.saleDate),
      'SKU': s.item?.sku || 'N/A',
      'Barcode': s.item?.barcode || 'N/A',
      'Metal': s.item?.metalType || 'N/A',
      'Weight': s.weightAtSale,
      'Purchased Val': (s.item?.purchasePrice || 0) + (s.item?.labourCharges || 0),
      'Selling Price': s.sellingPrice,
      'Profit': s.profit,
      'Margin %': s.profitPercent.toFixed(2),
      'Payment': s.paymentMethod
    }));
    exportToCSV(`Financial_Report_${dateRange.start}_to_${dateRange.end}`, data);
  };

  return (
    <div className="space-y-12 pb-24">
      {/* Executive Header */}
      <div className="bg-slate-950 p-10 md:p-16 rounded-[4rem] text-white shadow-2xl border-b-[16px] border-indigo-600 relative overflow-hidden">
        <div className="relative z-10 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-10">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="w-12 h-1 bg-indigo-500 rounded-full"></span>
              <p className="text-[10px] font-black uppercase tracking-[0.5em] text-indigo-400">Business Intelligence Portal</p>
            </div>
            <h2 className="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-none">Fiscal <br/> Statement</h2>
            <p className="mt-6 text-slate-500 font-bold uppercase tracking-widest text-[10px]">Range: {formatDate(dateRange.start)} — {formatDate(dateRange.end)}</p>
          </div>
          
          <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[3rem] border border-white/10 flex flex-col md:flex-row gap-6 no-print w-full xl:w-auto">
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-indigo-300 ml-2 tracking-widest">Period Start</label>
              <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="bg-slate-900 border-none rounded-2xl p-4 text-sm font-bold w-full text-white" />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-indigo-300 ml-2 tracking-widest">Period End</label>
              <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className="bg-slate-900 border-none rounded-2xl p-4 text-sm font-bold w-full text-white" />
            </div>
            <div className="flex items-end gap-3">
              <button onClick={handleExportCSV} className="h-14 px-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all active:scale-95 shadow-lg">Export CSV</button>
              <button onClick={() => window.print()} className="h-14 px-8 bg-white text-slate-950 hover:bg-slate-100 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all active:scale-95 shadow-lg">Print PDF</button>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 p-10 opacity-5 text-[15rem] font-black select-none pointer-events-none tracking-tighter">BI</div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <ReportCard label="Gross Revenue" value={formatCurrency(metrics.grossRevenue)} trend={`${metrics.transactionCount} Settlements`} color="indigo" />
        <ReportCard label="Realized Profit" value={formatCurrency(metrics.totalProfit)} trend={`${formatPercent(metrics.avgMargin)} Net ROI`} color="emerald" />
        <ReportCard label="Vault Evaluation" value={formatCurrency(metrics.vaultValue)} trend="Active Acquisition Basis" color="amber" />
        <ReportCard label="Metal Velocity" value={formatWeight(metrics.goldSold)} trend="Gold Mass Liquidity" color="slate" />
      </div>

      {/* Visual Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 bg-white p-12 rounded-[4rem] border-4 border-slate-50 shadow-xl min-h-[500px]">
          <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 mb-10">Revenue Trajectory</h3>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeSeriesData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" hide />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ borderRadius: '24px', border: 'none', backgroundColor: '#0f172a', color: '#fff', padding: '16px' }}
                  itemStyle={{ fontWeight: 'bold', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={5} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-4 bg-slate-950 p-12 rounded-[4rem] shadow-2xl text-white flex flex-col justify-center">
          <h3 className="text-2xl font-black uppercase tracking-tighter text-center mb-10">Asset Diversification</h3>
          <div className="h-[250px] mb-10">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={metalDistribution} dataKey="value" innerRadius={70} outerRadius={100} paddingAngle={10}>
                  {metalDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-4">
             {metalDistribution.map((m, i) => (
               <div key={m.name} className="flex justify-between items-center p-5 bg-white/5 rounded-3xl border border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }}></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{m.name} Protocols</span>
                  </div>
                  <span className="text-lg font-black">{m.value}</span>
               </div>
             ))}
          </div>
        </div>
      </div>

      {/* Category Performance */}
      <div className="bg-white p-12 rounded-[4rem] border-4 border-slate-50 shadow-xl">
        <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 mb-10">Performance by Category</h3>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoryPerformance} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#64748b' }} />
              <Tooltip 
                 cursor={{ fill: '#f8fafc' }}
                 contentStyle={{ borderRadius: '24px', border: 'none', backgroundColor: '#0f172a', color: '#fff' }}
              />
              <Bar dataKey="profit" fill="#10b981" radius={[0, 10, 10, 0]} barSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Settlement Ledger */}
      <div className="bg-white rounded-[4rem] border-4 border-slate-200 shadow-2xl overflow-hidden">
        <div className="p-10 border-b-2 border-slate-100 flex justify-between items-center bg-slate-50/50">
           <div>
              <h4 className="text-3xl font-black uppercase tracking-tighter">Settlement Ledger</h4>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Consolidated Audit Trail for Selected Period</p>
           </div>
           <span className="px-6 py-2 bg-indigo-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">{metrics.transactionCount} Entries</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[1400px]">
            <thead className="bg-slate-950 text-white">
              <tr>
                <th className="px-10 py-8 text-[11px] font-black uppercase tracking-widest">Date</th>
                <th className="px-10 py-8 text-[11px] font-black uppercase tracking-widest">Asset Identification</th>
                <th className="px-10 py-8 text-[11px] font-black uppercase tracking-widest text-center">Mass</th>
                <th className="px-10 py-8 text-[11px] font-black uppercase tracking-widest text-right">Acquisition</th>
                <th className="px-10 py-8 text-[11px] font-black uppercase tracking-widest text-right">Settlement</th>
                <th className="px-10 py-8 text-[11px] font-black uppercase tracking-widest text-right text-emerald-400">Profit</th>
                <th className="px-10 py-8 text-[11px] font-black uppercase tracking-widest text-right">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-100">
              {filteredSales.map((sale, idx) => {
                const cost = (sale.item?.purchasePrice || 0) + (sale.item?.labourCharges || 0);
                return (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-10 py-8 font-bold text-slate-400">{formatDate(sale.saleDate)}</td>
                    <td className="px-10 py-8">
                      <div className="flex flex-col">
                        <span className="text-lg font-black text-slate-950 tracking-tighter leading-none">{sale.item?.sku || 'N/A'}</span>
                        <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mt-2">{sale.item?.barcode || 'INTERNAL'}</span>
                      </div>
                    </td>
                    <td className="px-10 py-8 text-center font-black text-slate-700 text-xl">{formatWeight(sale.weightAtSale)}</td>
                    <td className="px-10 py-8 text-right font-black text-slate-400 text-lg">{formatCurrency(cost)}</td>
                    <td className="px-10 py-8 text-right font-black text-slate-950 text-2xl">{formatCurrency(sale.sellingPrice)}</td>
                    <td className="px-10 py-8 text-right font-black text-emerald-600 text-2xl">{formatCurrency(sale.profit)}</td>
                    <td className="px-10 py-8 text-right font-black text-slate-400 text-sm">{formatPercent(sale.profitPercent)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-950 text-white font-black border-t-8 border-indigo-600">
              <tr>
                <td colSpan={4} className="px-10 py-12 text-right uppercase text-[10px] tracking-[0.5em] text-indigo-400">Total Period Aggregation</td>
                <td className="px-10 py-12 text-right text-4xl tracking-tighter">{formatCurrency(metrics.grossRevenue)}</td>
                <td className="px-10 py-12 text-right text-4xl tracking-tighter text-emerald-400">{formatCurrency(metrics.totalProfit)}</td>
                <td className="px-10 py-12 text-right text-xl text-slate-500">{formatPercent(metrics.avgMargin)} Avg</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

const ReportCard = ({ label, value, trend, color }: any) => {
  const themes: any = { 
    indigo: 'bg-indigo-50 border-indigo-100 text-indigo-950', 
    emerald: 'bg-emerald-50 border-emerald-100 text-emerald-950', 
    amber: 'bg-amber-50 border-amber-100 text-amber-950', 
    slate: 'bg-slate-50 border-slate-100 text-slate-950' 
  };
  return (
    <div className={`p-10 rounded-[3.5rem] border-2 shadow-xl ${themes[color]} transition-transform hover:scale-[1.02] duration-500`}>
       <p className="text-[9px] font-black uppercase tracking-[0.4em] opacity-40 mb-3">{label}</p>
       <h4 className="text-3xl font-black tracking-tighter break-words leading-none mb-4">{value}</h4>
       <div className="h-0.5 w-10 bg-current opacity-20 mb-4"></div>
       <p className="text-[10px] font-bold opacity-30 uppercase tracking-widest">{trend}</p>
    </div>
  );
};

const MetricItem = ({ label, value, highlight }: any) => (
  <div className="flex flex-col">
    <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-1">{label}</span>
    <span className={`text-xl font-black tracking-tighter ${highlight ? 'text-indigo-600' : 'text-slate-900'}`}>{value}</span>
  </div>
);
