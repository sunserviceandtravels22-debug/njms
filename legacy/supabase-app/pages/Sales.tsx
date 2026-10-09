import React, { useState, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { InventoryItem, ItemStatus, MetalType, SaleStatus } from '../types';
import { formatCurrency, formatWeight, formatPercent } from '../utils/formatters';
import { MetalBadge } from '../components/MetalBadge';
import { PAYMENT_METHODS } from '../constants';
import { calculateProfit } from '../utils/calculations';

export const Sales: React.FC = () => {
  const { inventory, addSale, goldRate, silverRate } = useInventory();
  const [barcodeSearch, setBarcodeSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [sellingPrice, setSellingPrice] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [showSaleConfirmation, setShowSaleConfirmation] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (barcodeSearch.length >= 4) {
      const found = inventory.find(i => i.barcode === barcodeSearch && i.status === ItemStatus.IN_INVENTORY);
      if (found) {
        setSelectedItem(found);
        setBarcodeSearch('');
        const suggested = (Number(found.purchasePrice) + Number(found.labourCharges)) * 1.2;
        setSellingPrice(Math.round(suggested).toString());
      }
    }
  }, [barcodeSearch, inventory]);

  const stats = selectedItem && sellingPrice ? calculateProfit(Number(sellingPrice), Number(selectedItem.purchasePrice), Number(selectedItem.labourCharges)) : null;

  const handleSale = async () => {
    if (!selectedItem || !sellingPrice || isProcessing) return;
    
    if (stats && stats.profit < 0) {
      if (!window.confirm("CRITICAL: Negative Margin. Proceed with sale at a loss?")) return;
    }

    setIsProcessing(true);
    try {
      await addSale(selectedItem.id, {
        saleDate: new Date().toISOString(),
        sellingPrice: Number(sellingPrice),
        profit: Number(stats?.profit || 0),
        profitPercent: Number(stats?.profitPercent || 0),
        profitMargin: Number(stats?.profitMargin || 0),
        goldRateAtSale: goldRate,
        silverRateAtSale: silverRate,
        weightAtSale: Number(selectedItem.weight),
        paymentMethod,
        customerName,
        customerPhone,
        saleStatus: SaleStatus.COMPLETED
      });

      setShowSaleConfirmation(true);
      setTimeout(() => {
        setShowSaleConfirmation(false);
        setSelectedItem(null);
        setSellingPrice('');
        setCustomerName('');
        setCustomerPhone('');
      }, 2000);
    } catch (err: any) {
      alert("Sale failed: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'high': return 'text-green-600 bg-green-50/50 border-green-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50/50 border-yellow-200';
      case 'low': return 'text-orange-600 bg-orange-50/50 border-orange-200';
      case 'loss': return 'text-red-600 bg-red-50/50 border-red-200';
      default: return 'text-slate-400 bg-slate-50 border-slate-200';
    }
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6 md:gap-10 pb-20">
      <div className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-2xl border-4 border-slate-50 flex flex-col sm:flex-row items-center gap-6 md:gap-10 group">
        <div className="w-20 h-20 md:w-24 md:h-24 bg-blue-600 text-white rounded-[2rem] flex items-center justify-center text-4xl shadow-2xl shadow-blue-500/20 shrink-0 animate-pulse transition-all">
          📡
        </div>
        <div className="flex-1 w-full">
          <label className="text-[11px] font-black text-blue-600 uppercase tracking-[0.4em] mb-3 block text-center sm:text-left">Terminal Active • Listening</label>
          <input
            autoFocus
            type="text"
            value={barcodeSearch}
            onChange={(e) => setBarcodeSearch(e.target.value)}
            className="w-full text-3xl md:text-5xl font-black border-none outline-none placeholder-slate-200 text-slate-900 caret-blue-600 bg-transparent text-center sm:text-left tracking-tighter"
            placeholder="Scan Asset Tag..."
          />
        </div>
      </div>

      {selectedItem ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-10 duration-700">
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-[3rem] p-8 md:p-10 shadow-xl border border-slate-100 relative overflow-hidden h-full">
              <div className={`absolute top-0 right-0 w-40 h-40 -mr-20 -mt-20 rounded-full blur-[60px] opacity-10 ${selectedItem.metalType === MetalType.GOLD ? 'bg-yellow-400' : 'bg-slate-400'}`}></div>
              <div className="relative z-10 flex flex-col h-full">
                <MetalBadge type={selectedItem.metalType} size="lg" />
                <h2 className="text-3xl md:text-5xl font-black mt-8 text-slate-900 tracking-tighter leading-none">{selectedItem.sku}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-4">
                   <span className="px-4 py-1.5 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest border border-slate-200">{selectedItem.category}</span>
                   <span className="text-slate-400 font-bold text-xs font-mono">#{selectedItem.barcode}</span>
                </div>
                <div className="mt-12 space-y-5 pt-8 border-t-2 border-slate-50 flex-1">
                   <div className="flex justify-between items-center">
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Net Mass</span>
                     <span className="text-xl font-black text-slate-900">{formatWeight(selectedItem.weight)}</span>
                   </div>
                   <div className="flex justify-between items-center">
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Master Purity</span>
                     <span className="text-xl font-black text-slate-900">{selectedItem.tunch}%</span>
                   </div>
                   <div className="flex justify-between items-center">
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Crafting Fee</span>
                     <span className="text-xl font-black text-slate-900">{formatCurrency(selectedItem.labourCharges)}</span>
                   </div>
                   <div className="flex justify-between items-center opacity-40">
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cost Basis</span>
                     <span className="text-lg font-black text-slate-900">{formatCurrency(selectedItem.purchasePrice)}</span>
                   </div>
                </div>
                <div className="mt-12 p-8 bg-slate-900 rounded-[2.5rem] text-white shadow-xl shadow-slate-200">
                  <span className="text-[9px] font-black opacity-40 uppercase tracking-[0.3em] block mb-2">Total Liability Basis</span>
                  <div className="text-3xl font-black tracking-tighter">{formatCurrency(Number(selectedItem.purchasePrice) + Number(selectedItem.labourCharges))}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 flex flex-col gap-8">
            <div className="bg-white rounded-[3.5rem] p-8 md:p-14 shadow-2xl border-4 border-blue-600 h-full flex flex-col">
              <div className="flex items-center gap-5 mb-10">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center font-black shadow-inner border border-blue-100 text-2xl">POS</div>
                <div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tighter">Settlement Module</h3>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Real-time Performance Metrics</p>
                </div>
              </div>
              <div className="space-y-10 flex-1">
                <div className="bg-slate-50/50 p-8 md:p-12 rounded-[3rem] border-2 border-slate-100 group-within:border-blue-300 group-within:bg-white transition-all shadow-inner">
                  <label className="text-[11px] font-black text-slate-500 block mb-6 uppercase tracking-[0.4em] text-center sm:text-left">Agreed Transaction Value (INR) *</label>
                  <div className="relative flex items-center justify-center sm:justify-start">
                    <span className="text-4xl md:text-6xl font-black text-slate-300 mr-6">₹</span>
                    <input
                      type="number"
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(e.target.value)}
                      className="w-full text-5xl md:text-8xl font-black bg-transparent outline-none text-slate-900 placeholder-slate-200 tracking-tighter text-center sm:text-left"
                      placeholder="0"
                    />
                  </div>
                </div>
                {stats && (
                  <div className={`p-10 rounded-[3rem] border-4 transition-all duration-700 ${getStatusColor(stats.status)} shadow-lg`}>
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-6 mb-10">
                      <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-80">{stats.status === 'loss' ? '🚨 CAPITAL EROSION ALERT' : '💎 SETTLEMENT ANALYSIS'}</span>
                      <span className="text-5xl md:text-6xl font-black tracking-tighter break-all">
                        {stats.profit >= 0 ? '+' : ''}{formatCurrency(stats.profit)}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                       <div className="bg-white/40 p-6 rounded-[2rem] flex flex-col items-center sm:items-start border border-current border-opacity-10">
                         <span className="text-[9px] font-black uppercase opacity-60 tracking-widest mb-1">Return Velocity</span>
                         <span className="text-3xl font-black">{formatPercent(stats.profitPercent)}</span>
                       </div>
                       <div className="bg-white/40 p-6 rounded-[2rem] flex flex-col items-center sm:items-start border border-current border-opacity-10">
                         <span className="text-[9px] font-black uppercase opacity-60 tracking-widest mb-1">Portfolio Margin</span>
                         <span className="text-3xl font-black">{formatPercent(stats.profitMargin)}</span>
                       </div>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-3">Client Identity</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-bold text-slate-900 focus:border-blue-600 focus:bg-white transition-all shadow-sm"
                      placeholder="Name (Optional)"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-3">Settle Path</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-black text-slate-900 focus:border-blue-600 focus:bg-white transition-all shadow-sm cursor-pointer"
                    >
                      {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="mt-14 flex flex-col sm:flex-row gap-5">
                <button
                  onClick={() => setSelectedItem(null)}
                  className="w-full sm:w-auto px-12 py-6 rounded-[2rem] bg-slate-100 text-slate-400 font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all active:scale-95"
                >
                  Discard
                </button>
                <button
                  onClick={handleSale}
                  disabled={!sellingPrice || isProcessing}
                  className="flex-1 py-7 rounded-[2rem] bg-blue-600 text-white font-black uppercase tracking-[0.3em] text-xs shadow-2xl shadow-blue-500/20 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-20"
                >
                  {isProcessing ? 'SYNCHRONIZING...' : 'AUTHORIZE TRANSACTION'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center py-40 animate-in fade-in zoom-in-95 duration-1000 px-6 text-center">
           <div className="text-[8rem] md:text-[12rem] mb-12 filter grayscale opacity-10 select-none animate-pulse">💎</div>
           <h2 className="text-3xl md:text-5xl font-black text-slate-200 uppercase tracking-[0.5em]">Ready For Asset</h2>
           <p className="text-slate-400 font-bold mt-6 tracking-widest text-[10px] md:text-xs uppercase opacity-80 max-w-md mx-auto leading-relaxed">Please scan a physical asset tag to initialize the settlement flow.</p>
        </div>
      )}

      {showSaleConfirmation && (
        <div className="fixed inset-0 bg-blue-600/98 backdrop-blur-2xl z-[200] flex items-center justify-center animate-in fade-in duration-700">
          <div className="text-center text-white p-10 space-y-10 animate-in zoom-in-90 duration-500 max-w-2xl">
             <div className="text-[10rem] md:text-[14rem] animate-bounce">📦</div>
             <h2 className="text-6xl md:text-8xl font-black uppercase tracking-tighter leading-none">COMMITTED</h2>
             <p className="text-xl md:text-2xl font-bold opacity-60 tracking-wide">Registry status synchronized with Supabase. Ledger updated successfully.</p>
          </div>
        </div>
      )}
    </div>
  );
};