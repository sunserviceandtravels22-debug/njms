
import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { MetalType, SKUMaster } from '../types';
import { CATEGORIES } from '../constants';
import { MetalBadge } from '../components/MetalBadge';

export const SKUMasterPage: React.FC = () => {
  const { skus, addSKU, updateSKU, deleteSKU } = useInventory();
  const [filterMetal, setFilterMetal] = useState<MetalType | 'All'>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSku, setEditingSku] = useState<SKUMaster | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    skuCode: '',
    metalType: MetalType.GOLD,
    category: CATEGORIES[0],
    description: '',
    defaultTunch: 91.6,
    defaultPurityStandard: '22K',
    minStockLevel: 5,
    active: true
  });

  const filteredSkus = useMemo(() => {
    return skus.filter(s => {
      const matchesMetal = filterMetal === 'All' || s.metalType === filterMetal;
      const matchesSearch = s.skuCode.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesMetal && matchesSearch;
    });
  }, [skus, filterMetal, searchTerm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.skuCode) return;
    try {
      if (editingSku) {
        await updateSKU(editingSku.skuCode, formData);
      } else {
        await addSKU(formData);
      }
      closeModal();
    } catch (e: any) { alert(e.message); }
  };

  const openEdit = (sku: SKUMaster) => {
    setEditingSku(sku);
    setFormData({
      skuCode: sku.skuCode,
      metalType: sku.metalType,
      category: sku.category,
      description: sku.description || '',
      defaultTunch: sku.defaultTunch,
      defaultPurityStandard: sku.defaultPurityStandard,
      minStockLevel: sku.minStockLevel,
      active: sku.active
    });
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingSku(null);
    setFormData({
      skuCode: '', metalType: MetalType.GOLD, category: CATEGORIES[0], 
      description: '', defaultTunch: 91.6, defaultPurityStandard: '22K', 
      minStockLevel: 5, active: true 
    });
  };

  return (
    <div className="space-y-8 pb-20 px-4 md:px-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-950 tracking-tighter uppercase">Protocol Catalog</h2>
          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mt-2">Certified SKU Registry Flow</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-5 rounded-[2rem] font-black uppercase tracking-widest shadow-2xl transition-all active:scale-95 flex items-center gap-4"
        >
          <span className="text-2xl">⊕</span> Create New Protocol
        </button>
      </div>

      <div className="bg-slate-950 p-6 rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row gap-4 items-center justify-between border-b-8 border-indigo-600">
        <div className="flex gap-2">
          {['All', 'Gold', 'Silver'].map(m => (
            <button key={m} onClick={() => setFilterMetal(m as any)} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${filterMetal === m ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>{m}</button>
          ))}
        </div>
        <input 
          type="text" 
          placeholder="Filter SKU Protocols..." 
          value={searchTerm} 
          onChange={e => setSearchTerm(e.target.value)} 
          className="w-full md:w-96 px-6 py-4 bg-slate-800 text-white rounded-2xl text-sm border-none outline-none focus:ring-4 ring-indigo-500 font-bold placeholder:text-slate-600" 
        />
      </div>

      <div className="bg-white rounded-[3rem] border-4 border-slate-200 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[1000px]">
            <thead className="bg-indigo-950 text-white border-b-8 border-indigo-600">
              <tr>
                <th className="px-10 py-8 text-[12px] uppercase font-black tracking-[0.2em] text-indigo-300">Identity Code</th>
                <th className="px-10 py-8 text-[12px] uppercase font-black tracking-[0.2em]">Asset Group</th>
                <th className="px-10 py-8 text-[12px] uppercase font-black tracking-[0.2em] text-center">Def. Tunch</th>
                <th className="px-10 py-8 text-[12px] uppercase font-black tracking-[0.2em] text-center">Safety Floor</th>
                <th className="px-10 py-8 text-[12px] uppercase font-black tracking-[0.2em] text-center text-indigo-300">Status</th>
                <th className="px-10 py-8 text-center text-indigo-300">Management</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-100">
              {filteredSkus.map((s, idx) => (
                <tr key={s.skuCode} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-indigo-50 transition-colors`}>
                  <td className="px-10 py-8">
                    <div className="flex items-center gap-5">
                      <MetalBadge type={s.metalType} size="sm" />
                      <p className="font-black text-slate-950 text-2xl tracking-tighter uppercase">{s.skuCode}</p>
                    </div>
                  </td>
                  <td className="px-10 py-8">
                     <span className="text-[10px] font-black uppercase text-indigo-800 bg-indigo-50 px-5 py-2 rounded-xl border-2 border-indigo-100">{s.category}</span>
                  </td>
                  <td className="px-10 py-8 text-center font-black text-slate-950 text-2xl tracking-tighter">{s.defaultTunch}%</td>
                  <td className="px-10 py-8 text-center font-black text-slate-950 text-2xl tracking-tighter">{s.minStockLevel} <span className="text-[10px] opacity-30">UNIT</span></td>
                  <td className="px-10 py-8 text-center">
                    <span className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${s.active ? 'bg-emerald-100 text-emerald-800 border-2 border-emerald-200' : 'bg-rose-100 text-rose-800 border-2 border-rose-200'}`}>
                      {s.active ? 'Operational' : 'Restricted'}
                    </span>
                  </td>
                  <td className="px-10 py-8 text-center">
                    <div className="flex items-center justify-center gap-4">
                      <button onClick={() => openEdit(s)} className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all text-xl">✏️</button>
                      <button onClick={() => confirm("Void this protocol permanently?") && deleteSKU(s.skuCode)} className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all text-xl">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-[500] flex items-center justify-center p-6">
          <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="bg-indigo-950 p-12 text-white flex justify-between items-center border-b-[12px] border-indigo-600">
              <div>
                <h3 className="text-4xl font-black uppercase tracking-tighter">{editingSku ? 'Edit Protocol' : 'Initialize Protocol'}</h3>
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-2">Registry Lifecycle Management</p>
              </div>
              <button onClick={closeModal} className="text-5xl font-light hover:rotate-90 transition-transform">×</button>
            </div>
            <form onSubmit={handleSubmit} className="p-12 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Unique Code</label>
                  <input required disabled={!!editingSku} type="text" value={formData.skuCode} onChange={e => setFormData({...formData, skuCode: e.target.value.toUpperCase()})} className="w-full p-5 bg-slate-100 border-2 border-slate-200 rounded-2xl font-black text-slate-900 focus:border-indigo-600 disabled:opacity-50" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Metal Segment</label>
                  <select value={formData.metalType} onChange={e => setFormData({...formData, metalType: e.target.value as MetalType})} className="w-full p-5 bg-slate-100 border-2 border-slate-200 rounded-2xl font-black text-slate-900">
                    <option value={MetalType.GOLD}>GOLD</option>
                    <option value={MetalType.SILVER}>SILVER</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Category Group</label>
                  <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full p-5 bg-slate-100 border-2 border-slate-200 rounded-2xl font-black text-slate-900">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Default Tunch (%)</label>
                  <input type="number" step="0.1" value={formData.defaultTunch} onChange={e => setFormData({...formData, defaultTunch: Number(e.target.value)})} className="w-full p-5 bg-slate-100 border-2 border-slate-200 rounded-2xl font-black text-slate-900" />
                </div>
              </div>
              <button type="submit" className="w-full py-7 bg-indigo-600 text-white rounded-[2rem] font-black uppercase tracking-[0.3em] shadow-2xl hover:bg-indigo-700 transition-all text-xs">Authorize Registry Update</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
