
import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { MetalType, SaleStatus, SaleRecord } from '../types';
import { formatCurrency, formatDate, formatWeight, formatPercent } from '../utils/formatters';
import { MetalBadge } from '../components/MetalBadge';

export const SalesHistory: React.FC = () => {
  const { sales, voidSale, deleteSale } = useInventory();
  const [filterMetal, setFilterMetal] = useState<'All' | MetalType>('All');
  const [filterPayment, setFilterPayment] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'revenue' | 'profit'>('date');

  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      const item = s.item;
      const matchesMetal = filterMetal === 'All' || (item && item.metalType === filterMetal);
      const matchesPayment = filterPayment === 'All' || s.paymentMethod === filterPayment;
      const searchStr = `${item?.sku || ''} ${item?.barcode || ''} ${s.customerName || ''}`.toLowerCase();
      const matchesSearch = !searchQuery || searchStr.includes(searchQuery.toLowerCase());
      return matchesMetal && matchesPayment && matchesSearch;
    }).sort((a, b) => {
      if (sortBy === 'revenue') return b.sellingPrice - a.sellingPrice;
      if (sortBy === 'profit') return b.profit - a.profit;
      return new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime();
    });
  }, [sales, filterMetal, filterPayment, searchQuery, sortBy]);

  const totals = useMemo(() => {
    return filteredSales.reduce((acc, curr) => {
      const isVoid = curr.saleStatus === SaleStatus.VOIDED;
      if (isVoid) return acc;
      
      const purchaseValue = (curr as any).purchase_value_at_sale || ((curr.item?.purchasePrice || 0) + (curr.item?.labourCharges || 0));
      return {
        weight: acc.weight + Number(curr.weightAtSale || 0),
        purchaseValue: acc.purchaseValue + purchaseValue,
        revenue: acc.revenue + Number(curr.sellingPrice),
        profit: acc.profit + Number(curr.profit),
        count: acc.count + 1
      };
    }, { weight: 0, purchaseValue: 0, revenue: 0, profit: 0, count: 0 });
  }, [filteredSales]);

  return (
    <div className="space-y-10 pb-20 px-4 md:px-0">
      {/* Sales Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-lg">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Revenue</p>
          <p className="text-3xl font-black text-indigo-600">{formatCurrency(totals.revenue)}</p>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-lg">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Net Profit</p>
          <p className="text-3xl font-black text-emerald-600">{formatCurrency(totals.profit)}</p>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-lg">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Purchased Value</p>
          <p className="text-3xl font-black text-slate-900">{formatCurrency(totals.purchaseValue)}</p>
        </div>
        <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl text-white border-b-8 border-indigo-600">
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Total Mass Sold</p>
          <p className="text-3xl font-black">{formatWeight(totals.weight)}</p>
        </div>
      </div>

      {/* Control Terminal */}
      <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl flex flex-col xl:flex-row gap-6 items-center border-b-8 border-indigo-600 no-print">
        <div className="flex flex-wrap gap-3 w-full xl:w-auto">
          {['All', 'Gold', 'Silver'].map(m => (
            <button key={m} onClick={() => setFilterMetal(m as any)} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${filterMetal === m ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>{m}</button>
          ))}
          <select value={filterPayment} onChange={e => setFilterPayment(e.target.value)} className="bg-slate-800 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase border-none focus:ring-2 ring-indigo-500">
            <option value="All">All Payments</option>
            {['Cash', 'Card', 'UPI', 'Bank Transfer'].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <div className="flex flex-col md:flex-row gap-4 w-full xl:flex-1">
          <input type="text" placeholder="Search Client or SKU..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="flex-1 px-6 py-3 bg-slate-800 text-white rounded-2xl text-sm border-none outline-none focus:ring-2 ring-indigo-500 font-bold" />
          <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase">
            <option value="date">Sort: Recency</option>
            <option value="revenue">Sort: Revenue</option>
            <option value="profit">Sort: Profit</option>
          </select>
        </div>
        <button onClick={() => window.print()} className="bg-white text-slate-900 px-8 py-3 rounded-2xl text-[10px] font-black uppercase shadow-xl hover:bg-slate-100 transition-all">Export PDF</button>
      </div>

      {/* Historical Table */}
      <div className="bg-white rounded-[3rem] border-4 border-slate-200 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[1700px]">
            <thead className="bg-slate-950 text-white border-b-8 border-indigo-600">
              <tr>
                <th className="px-8 py-8 text-[12px] font-black uppercase tracking-[0.2em] text-indigo-400">Sale Date</th>
                <th className="px-8 py-8 text-[12px] font-black uppercase tracking-[0.2em]">Asset & Client</th>
                <th className="px-8 py-8 text-[12px] font-black uppercase tracking-[0.2em] text-center">Net Mass</th>
                <th className="px-8 py-8 text-[12px] font-black uppercase tracking-[0.2em] text-center text-amber-400">Market Rate</th>
                <th className="px-8 py-8 text-[12px] font-black uppercase tracking-[0.2em] text-right text-slate-400">Purchased Value</th>
                <th className="px-8 py-8 text-[12px] font-black uppercase tracking-[0.2em] text-right">Selling Value</th>
                <th className="px-8 py-8 text-[12px] font-black uppercase tracking-[0.2em] text-right text-emerald-400">Net Profit</th>
                <th className="px-8 py-8 text-[12px] font-black uppercase tracking-[0.2em] text-center no-print">Control</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-100">
              {filteredSales.map((sale, idx) => {
                const isGold = sale.item?.metalType === MetalType.GOLD;
                const activeRate = isGold ? sale.goldRateAtSale : sale.silverRateAtSale;
                const purchasedValue = (sale as any).purchase_value_at_sale || ((sale.item?.purchasePrice || 0) + (sale.item?.labourCharges || 0));
                
                return (
                  <tr key={sale.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-indigo-50 transition-colors ${sale.saleStatus === SaleStatus.VOIDED ? 'opacity-30 grayscale' : ''}`}>
                    <td className="px-8 py-8 font-black text-slate-950 tracking-tighter whitespace-nowrap">{formatDate(sale.saleDate)}</td>
                    <td className="px-8 py-8">
                      <div className="flex items-center gap-5">
                        <MetalBadge type={sale.item?.metalType || MetalType.GOLD} size="sm" />
                        <div>
                          <p className="font-black text-slate-950 text-xl tracking-tighter leading-none">{sale.item?.sku || 'N/A'}</p>
                          <p className="text-[10px] text-indigo-600 font-black uppercase mt-2 tracking-widest">{sale.customerName || 'Walk-in Client'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-8 text-center font-black text-slate-700 text-xl tracking-tighter">{formatWeight(sale.weightAtSale || 0)}</td>
                    <td className="px-8 py-8 text-center font-black text-amber-600 text-lg tracking-tighter">
                      {formatCurrency(activeRate)}
                      <span className="block text-[8px] uppercase tracking-widest opacity-40 font-black mt-1">Per {isGold ? '10g' : '1kg'}</span>
                    </td>
                    <td className="px-8 py-8 text-right font-black text-slate-400 text-xl tracking-tighter">{formatCurrency(purchasedValue)}</td>
                    <td className="px-8 py-8 text-right font-black text-slate-950 text-2xl tracking-tighter">{formatCurrency(sale.sellingPrice)}</td>
                    <td className={`px-8 py-8 text-right font-black text-2xl tracking-tighter ${sale.profit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {formatCurrency(sale.profit)}
                      <span className="block text-[9px] uppercase tracking-widest opacity-60 font-black mt-1">{formatPercent(sale.profitPercent)} ROI</span>
                    </td>
                    <td className="px-8 py-8 text-center no-print">
                      <div className="flex items-center justify-center gap-3">
                        {sale.saleStatus !== SaleStatus.VOIDED && (
                          <button onClick={() => confirm("Void this record?") && voidSale(sale.id, "History Correction")} className="text-[10px] font-black uppercase text-slate-400 hover:text-rose-600">Void</button>
                        )}
                        <button onClick={() => confirm("Delete permanently?") && deleteSale(sale.id)} className="text-slate-200 hover:text-rose-600 text-xl">🗑️</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-950 text-white font-black border-t-8 border-indigo-600">
              <tr>
                <td colSpan={2} className="px-8 py-10 text-right uppercase text-[10px] tracking-widest text-indigo-400">Grand Ledger Totals</td>
                <td className="px-8 py-10 text-center text-3xl tracking-tighter">{formatWeight(totals.weight)}</td>
                <td className="no-print"></td>
                <td className="px-8 py-10 text-right text-3xl tracking-tighter text-slate-500">{formatCurrency(totals.purchaseValue)}</td>
                <td className="px-8 py-10 text-right text-4xl tracking-tighter">{formatCurrency(totals.revenue)}</td>
                <td className="px-8 py-10 text-right text-4xl text-emerald-400 tracking-tighter">{formatCurrency(totals.profit)}</td>
                <td className="px-8 py-10 text-center text-[10px] text-slate-500 uppercase no-print">{totals.count} Active Records</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
