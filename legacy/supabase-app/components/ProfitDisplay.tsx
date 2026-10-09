
import React from 'react';
import { calculateProfit } from '../utils/calculations';
import { formatCurrency, formatPercent } from '../utils/formatters';

interface ProfitDisplayProps {
  sellingPrice: number;
  purchasePrice: number;
  labourCharges?: number;
}

export const ProfitDisplay: React.FC<ProfitDisplayProps> = ({ 
  sellingPrice, 
  purchasePrice, 
  labourCharges = 0 
}) => {
  const stats = calculateProfit(sellingPrice, purchasePrice, labourCharges);

  const getStatusConfig = () => {
    switch (stats.status) {
      case 'high': return { bg: 'bg-green-600', text: 'text-white', label: 'EXCELLENT MARGIN' };
      case 'medium': return { bg: 'bg-yellow-400', text: 'text-slate-900', label: 'TARGET REACHED' };
      case 'low': return { bg: 'bg-orange-500', text: 'text-white', label: 'LOW MARGIN' };
      case 'loss': return { bg: 'bg-red-600', text: 'text-white', label: 'OPERATING LOSS' };
    }
  };

  const config = getStatusConfig();

  return (
    <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl border-2 border-slate-100 overflow-hidden relative">
      <div className={`absolute top-0 right-0 px-8 py-3 rounded-bl-[2rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-sm ${config.bg} ${config.text}`}>
        {config.label}
      </div>

      <div className="space-y-8">
        <div className="flex justify-between items-end border-b-2 border-slate-50 pb-8">
           <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Selling Value</p>
              <p className="text-4xl font-black text-slate-900 tracking-tighter">{formatCurrency(sellingPrice)}</p>
           </div>
           <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cost Basis</p>
              <p className="text-lg font-black text-slate-400">{formatCurrency(stats.totalCost)}</p>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
           <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Profit Performance</p>
              <div className="flex items-center gap-4">
                 <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl shadow-lg ${config.bg} ${config.text}`}>
                    {stats.profit >= 0 ? '💰' : '⚠️'}
                 </div>
                 <div>
                    <p className={`text-4xl font-black tracking-tighter ${stats.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                       {stats.profit >= 0 ? '+' : ''}{formatCurrency(stats.profit)}
                    </p>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">Realized Gain</p>
                 </div>
              </div>
           </div>

           <div className="flex flex-col justify-center space-y-4">
              <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ROI %</span>
                 <span className={`text-lg font-black ${stats.profitPercent > 15 ? 'text-green-600' : 'text-slate-900'}`}>{formatPercent(stats.profitPercent)}</span>
              </div>
              <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Margin %</span>
                 <span className={`text-lg font-black ${stats.profitMargin > 15 ? 'text-green-600' : 'text-slate-900'}`}>{formatPercent(stats.profitMargin)}</span>
              </div>
           </div>
        </div>

        {stats.profit < 0 && (
           <div className="bg-red-50 p-6 rounded-[2rem] border-2 border-red-100 flex items-center gap-4">
              <div className="text-2xl">🚨</div>
              <div>
                 <p className="text-red-900 font-black uppercase text-[10px] tracking-widest">Financial Risk Alert</p>
                 <p className="text-red-600 font-bold text-xs">Selling price is below acquisition cost. This will result in a net capital loss.</p>
              </div>
           </div>
        )}
      </div>
    </div>
  );
};
