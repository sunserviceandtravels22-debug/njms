
import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { ItemStatus, MetalType, InventoryItem } from '../types';
import { formatCurrency, formatWeight, formatDate } from '../utils/formatters';
import { MetalBadge } from '../components/MetalBadge';

export const Inventory: React.FC = () => {
  const { inventory, deleteItem, updateItem, bulkDeleteItems } = useInventory();
  const [filterMetal, setFilterMetal] = useState<MetalType | 'All'>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const filteredItems = useMemo(() => {
    return inventory.filter(item => {
      const matchesMetal = filterMetal === 'All' || item.metalType === filterMetal;
      const searchStr = `${item.sku} ${item.barcode} ${item.supplierName || ''}`.toLowerCase();
      const matchesSearch = !searchTerm || searchStr.includes(searchTerm.toLowerCase());
      return matchesMetal && matchesSearch && item.status === ItemStatus.IN_INVENTORY;
    });
  }, [inventory, filterMetal, searchTerm]);

  const totals = useMemo(() => {
    return filteredItems.reduce((acc, curr) => ({
      weight: acc.weight + Number(curr.weight),
      labour: acc.labour + Number(curr.labourCharges || 0),
      cost: acc.cost + (Number(curr.purchasePrice) + Number(curr.labourCharges)),
      count: acc.count + 1
    }), { weight: 0, labour: 0, cost: 0, count: 0 });
  }, [filteredItems]);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkDelete = async () => {
    if (confirm(`Authorize permanent deletion of ${selectedIds.size} selected assets?`)) {
      try {
        await bulkDeleteItems(Array.from(selectedIds));
        setSelectedIds(new Set());
      } catch (e: any) { alert(e.message); }
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      await updateItem(editingItem.id, editingItem, "User Registry Update");
      setEditingItem(null);
    } catch (e: any) { alert("Update failed: " + e.message); }
  };

  const handleDelete = async (item: InventoryItem) => {
    if (confirm(`Void asset record [${item.barcode}] from registry?`)) {
      try {
        await deleteItem(item.id);
      } catch (e: any) { alert(e.message); }
    }
  };

  return (
    <div className="space-y-8 pb-20 px-4 md:px-0">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2rem] border-2 border-slate-100 shadow-xl flex flex-col justify-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Mass Holdings</p>
          <p className="text-3xl font-black text-slate-950">{formatWeight(totals.weight)}</p>
          <div className="mt-2 text-[9px] font-bold text-indigo-500 uppercase tracking-widest">Active Stock Only</div>
        </div>
        <div className="bg-white p-8 rounded-[2rem] border-2 border-slate-100 shadow-xl flex flex-col justify-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Labour Investment</p>
          <p className="text-3xl font-black text-emerald-600">{formatCurrency(totals.labour)}</p>
          <div className="mt-2 text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Wages Paid</div>
        </div>
        <div className="bg-slate-950 p-8 rounded-[2rem] shadow-2xl flex flex-col justify-center text-white border-b-8 border-indigo-600">
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Vault Value (Basis Cost)</p>
          <p className="text-3xl font-black">{formatCurrency(totals.cost)}</p>
          <div className="mt-2 text-[9px] font-bold text-slate-500 uppercase tracking-widest">{totals.count} Physical Assets</div>
        </div>
      </div>

      <div className="bg-slate-950 p-6 rounded-[2rem] shadow-2xl flex flex-col md:flex-row gap-4 items-center justify-between no-print">
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto no-scrollbar pb-2 md:pb-0">
          {['All', 'Gold', 'Silver'].map(m => (
            <button key={m} onClick={() => setFilterMetal(m as any)} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${filterMetal === m ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>{m}</button>
          ))}
          {selectedIds.size > 0 && (
            <button onClick={handleBulkDelete} className="bg-rose-600 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase shadow-lg animate-pulse whitespace-nowrap">Delete Selected ({selectedIds.size})</button>
          )}
        </div>
        <input 
          type="text" 
          placeholder="Filter by Protocol Code or Source..." 
          value={searchTerm} 
          onChange={e => setSearchTerm(e.target.value)} 
          className="w-full md:w-96 px-6 py-4 bg-slate-800 text-white rounded-2xl text-sm border-none outline-none focus:ring-4 ring-indigo-500 font-bold placeholder:text-slate-600" 
        />
      </div>

      <div className="bg-white rounded-[3rem] border-4 border-slate-200 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[1600px]">
            <thead className="bg-indigo-950 text-white border-b-8 border-indigo-600">
              <tr>
                <th className="px-6 py-8 w-12 text-center no-print">
                  <input type="checkbox" className="w-5 h-5 accent-indigo-500 rounded" onChange={() => setSelectedIds(selectedIds.size === filteredItems.length ? new Set() : new Set(filteredItems.map(i => i.id)))} checked={selectedIds.size === filteredItems.length && filteredItems.length > 0} />
                </th>
                <th className="px-8 py-8 text-[12px] font-black uppercase tracking-[0.2em] text-indigo-300"># Asset Segment</th>
                <th className="px-8 py-8 text-[12px] font-black uppercase tracking-[0.2em]">Inbound Date</th>
                <th className="px-8 py-8 text-[12px] font-black uppercase tracking-[0.2em] text-indigo-300">Acq. Benchmark</th>
                <th className="px-8 py-8 text-[12px] font-black uppercase tracking-[0.2em]">Vendor / Source</th>
                <th className="px-8 py-8 text-[12px] font-black uppercase tracking-[0.2em] text-center">Net Mass</th>
                <th className="px-8 py-8 text-[12px] font-black uppercase tracking-[0.2em] text-right text-emerald-400">Labour Cost</th>
                <th className="px-8 py-8 text-[12px] font-black uppercase tracking-[0.2em] text-right">Basis Cost</th>
                <th className="px-8 py-8 text-[12px] font-black uppercase tracking-[0.2em]">Memo / Notes</th>
                <th className="px-8 py-8 text-center text-indigo-300 no-print">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-100">
              {filteredItems.map((item, idx) => (
                <tr key={item.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-indigo-50 transition-colors`}>
                  <td className="px-6 py-8 text-center no-print">
                    <input type="checkbox" className="w-5 h-5 accent-indigo-500 rounded" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)} />
                  </td>
                  <td className="px-8 py-8">
                    <div className="flex items-center gap-5">
                      <MetalBadge type={item.metalType} size="md" />
                      <div>
                        <p className="font-black text-slate-950 text-xl tracking-tighter leading-none">{item.sku}</p>
                        <p className="text-[10px] text-indigo-600 font-black uppercase mt-2 tracking-widest">{item.barcode}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-8 font-black text-slate-950">{formatDate(item.purchaseDate)}</td>
                  <td className="px-8 py-8">
                    <div className="flex flex-col">
                      <span className="text-base font-black text-slate-950">₹{(item.metalType === MetalType.GOLD ? item.goldRateAtPurchase : item.silverRateAtPurchase).toLocaleString()}</span>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Market @ Inbound</span>
                    </div>
                  </td>
                  <td className="px-8 py-8 text-slate-800 font-black uppercase text-xs tracking-tight">{item.supplierName || 'Internal Ingest'}</td>
                  <td className="px-8 py-8 text-center text-slate-950 font-black text-2xl tracking-tighter">{formatWeight(item.weight)}</td>
                  <td className="px-8 py-8 text-right font-black text-emerald-600 text-lg tracking-tighter">{formatCurrency(item.labourCharges || 0)}</td>
                  <td className="px-8 py-8 text-right font-black text-slate-950 text-2xl tracking-tighter">{formatCurrency(item.purchasePrice + item.labourCharges)}</td>
                  <td className="px-8 py-8 max-w-xs">
                     <p className="text-[10px] font-black text-slate-600 uppercase leading-relaxed line-clamp-2 italic">{item.notes || '---'}</p>
                  </td>
                  <td className="px-8 py-8 text-center no-print">
                    <div className="flex items-center justify-center gap-3">
                      <button onClick={() => setEditingItem(item)} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all text-sm">✏️</button>
                      <button onClick={() => handleDelete(item)} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all text-sm">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-indigo-950 text-white border-t-8 border-indigo-600 font-black">
              <tr>
                <td colSpan={5} className="px-8 py-12 text-right text-xs uppercase tracking-[0.6em] text-indigo-400">Consolidated Vault Footer</td>
                <td className="px-8 py-12 text-center text-3xl tracking-tighter font-black">{formatWeight(totals.weight)}</td>
                <td className="px-8 py-12 text-right text-3xl tracking-tighter font-black text-emerald-400">{formatCurrency(totals.labour)}</td>
                <td className="px-8 py-12 text-right text-4xl tracking-tighter font-black">{formatCurrency(totals.cost)}</td>
                <td colSpan={2} className="px-8 py-12 text-center text-[10px] uppercase text-indigo-500 tracking-[0.3em] no-print">{totals.count} Active Assets</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {editingItem && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[500] flex items-center justify-center p-6 no-print">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="bg-indigo-950 p-10 text-white flex justify-between items-center border-b-8 border-indigo-600">
               <div>
                  <h3 className="text-3xl font-black uppercase tracking-tighter">Edit Asset Registry</h3>
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-1">Protocol Modification Flow</p>
               </div>
               <button onClick={() => setEditingItem(null)} className="text-4xl font-light hover:rotate-90 transition-transform">×</button>
            </div>
            <form onSubmit={handleUpdate} className="p-10 space-y-8">
               <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Protocol Code</label>
                    <input type="text" value={editingItem.sku} onChange={e => setEditingItem({...editingItem, sku: e.target.value.toUpperCase()})} className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-black text-slate-900 focus:border-indigo-600 outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Net Mass (g)</label>
                    <input type="number" step="0.001" value={editingItem.weight} onChange={e => setEditingItem({...editingItem, weight: Number(e.target.value)})} className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-black text-slate-900 focus:border-indigo-600 outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Labour Charges</label>
                    <input type="number" value={editingItem.labourCharges} onChange={e => setEditingItem({...editingItem, labourCharges: Number(e.target.value)})} className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-black text-slate-900 focus:border-indigo-600 outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Acquisition Price</label>
                    <input type="number" value={editingItem.purchasePrice} onChange={e => setEditingItem({...editingItem, purchasePrice: Number(e.target.value)})} className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-black text-slate-900 focus:border-indigo-600 outline-none" />
                  </div>
               </div>
               <button type="submit" className="w-full py-6 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-700 transition-all">Authorize Update</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
