
import React, { useState, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { MetalType, ItemStatus } from '../types';

export const Purchase: React.FC = () => {
  const { addPurchase, skus, goldRate, silverRate, isBarcodeAvailable } = useInventory();
  const getToday = () => new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    sku: '',
    barcode: '',
    metalType: MetalType.GOLD,
    category: 'Ring', 
    weight: '',
    tunch: '',
    labourCharges: '',
    purchasePrice: '',
    supplierName: '',
    notes: '',
    purchaseDate: getToday()
  });

  const [skuSuggestions, setSkuSuggestions] = useState<any[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [barcodeError, setBarcodeError] = useState('');

  useEffect(() => {
    const weight = parseFloat(formData.weight || '0');
    if (weight > 0) {
      const basePrice = formData.metalType === MetalType.GOLD 
        ? (weight / 10) * goldRate 
        : (weight / 1000) * silverRate;
      setFormData(prev => ({ ...prev, purchasePrice: Math.round(basePrice).toString() }));
    }
  }, [formData.weight, formData.metalType, goldRate, silverRate]);

  useEffect(() => {
    if (formData.sku.length > 1) {
      setSkuSuggestions(skus.filter(s => s.skuCode.toLowerCase().includes(formData.sku.toLowerCase())));
    } else {
      setSkuSuggestions([]);
    }
  }, [formData.sku, skus]);

  // Validate barcode whenever it changes
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (formData.barcode.length >= 3) {
        const available = await isBarcodeAvailable(formData.barcode);
        if (!available) {
          setBarcodeError('Barcode already in use');
        } else {
          setBarcodeError('');
        }
      } else {
        setBarcodeError('');
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.barcode, isBarcodeAvailable]);

  const selectSKU = (s: any) => {
    setFormData(prev => ({ 
      ...prev, sku: s.skuCode, category: s.category, metalType: s.metalType, tunch: String(s.defaultTunch) 
    }));
    setSkuSuggestions([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.sku || !formData.barcode || !formData.weight) return alert("Fill mandatory fields (SKU, Barcode, Weight)");
    if (barcodeError) return alert("Please use a unique barcode.");
    
    setIsSubmitting(true);
    try {
      await addPurchase({
        ...formData,
        weight: Number(formData.weight),
        tunch: Number(formData.tunch),
        purityStandard: formData.tunch, 
        labourCharges: Number(formData.labourCharges || 0),
        purchasePrice: Number(formData.purchasePrice),
        goldRateAtPurchase: goldRate,
        silverRateAtPurchase: silverRate,
        status: ItemStatus.IN_INVENTORY
      });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      setFormData({ 
        sku: '', barcode: '', metalType: MetalType.GOLD, category: 'Ring', 
        weight: '', tunch: '', labourCharges: '', purchasePrice: '', 
        supplierName: '', notes: '', purchaseDate: getToday() 
      });
    } catch (err: any) {
      alert(err.message || "Registry entry failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const labelClasses = "text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 ml-1";
  const inputClasses = (isError?: boolean) => `w-full p-4 rounded-xl border-2 ${isError ? 'border-rose-500 bg-rose-50 shadow-[0_0_10px_rgba(244,63,94,0.3)]' : 'border-slate-100 bg-slate-50'} outline-none focus:border-indigo-600 focus:bg-white font-bold text-slate-900 transition-all placeholder:text-slate-300`;

  return (
    <div className="max-w-5xl mx-auto pb-20 px-4 md:px-0">
      <div className={`mb-8 p-10 rounded-[2.5rem] flex items-center justify-between shadow-lg border-2 transition-colors ${formData.metalType === MetalType.GOLD ? 'bg-yellow-50 border-yellow-200' : 'bg-slate-50 border-slate-200'}`}>
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Inventory Ingestion</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Certified Asset Registry • Secure Terminal</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setFormData({...formData, metalType: MetalType.GOLD})} className={`w-12 h-12 rounded-xl flex items-center justify-center font-black transition-all ${formData.metalType === MetalType.GOLD ? 'bg-yellow-400 shadow-md scale-110 text-slate-900' : 'bg-slate-200 opacity-50 hover:opacity-100'}`}>G</button>
          <button type="button" onClick={() => setFormData({...formData, metalType: MetalType.SILVER})} className={`w-12 h-12 rounded-xl flex items-center justify-center font-black transition-all ${formData.metalType === MetalType.SILVER ? 'bg-slate-400 text-white shadow-md scale-110' : 'bg-slate-200 opacity-50 hover:opacity-100'}`}>S</button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 md:p-12 rounded-[3rem] shadow-xl border border-slate-100 space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 relative">
            <label className={labelClasses}>SKU Master Identification *</label>
            <input type="text" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value.toUpperCase()})} className={inputClasses()} placeholder="Search by SKU Code..." />
            {skuSuggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-2 bg-white border-2 border-slate-100 rounded-2xl shadow-2xl max-h-60 overflow-y-auto">
                {skuSuggestions.map(s => (
                  <button key={s.skuCode} type="button" onClick={() => selectSKU(s)} className="w-full text-left p-4 hover:bg-indigo-50 border-b border-slate-50 flex justify-between group transition-colors">
                    <span className="font-black text-slate-900 group-hover:text-indigo-600">{s.skuCode}</span>
                    <span className="text-[10px] text-slate-400 uppercase font-black">{s.category}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="relative">
            <label className={labelClasses}>Unique Asset Barcode *</label>
            <input type="text" value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} className={inputClasses(!!barcodeError)} placeholder="Scan tag..." />
            {barcodeError && <span className="absolute -bottom-5 left-1 text-[9px] font-black text-rose-500 uppercase tracking-widest">{barcodeError}</span>}
          </div>

          <div>
            <label className={labelClasses}>Net Mass (g) *</label>
            <input type="number" step="0.001" value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} className={inputClasses()} placeholder="0.000" />
          </div>
          <div>
            <label className={labelClasses}>Metal Tunch (%)</label>
            <input type="number" step="0.1" value={formData.tunch} onChange={e => setFormData({...formData, tunch: e.target.value})} className={inputClasses()} placeholder="91.6" />
          </div>
          <div>
            <label className={labelClasses}>Crafting Labour (INR)</label>
            <input type="number" value={formData.labourCharges} onChange={e => setFormData({...formData, labourCharges: e.target.value})} className={inputClasses()} placeholder="0" />
          </div>

          <div>
            <label className={labelClasses}>Final Acquisition Cost (INR) *</label>
            <input type="number" value={formData.purchasePrice} onChange={e => setFormData({...formData, purchasePrice: e.target.value})} className={`${inputClasses()} border-indigo-100 bg-indigo-50/30`} />
          </div>
          <div>
            <label className={labelClasses}>Vendor / Karigar Name</label>
            <input type="text" value={formData.supplierName} onChange={e => setFormData({...formData, supplierName: e.target.value})} className={inputClasses()} placeholder="Enter supplier name" />
          </div>
          <div>
            <label className={labelClasses}>Transaction Date</label>
            <input type="date" value={formData.purchaseDate} onChange={e => setFormData({...formData, purchaseDate: e.target.value})} className={inputClasses()} />
          </div>

          <div className="md:col-span-2 lg:col-span-3">
            <label className={labelClasses}>Item Memo & Internal Notes</label>
            <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className={`${inputClasses()} h-32 resize-none`} placeholder="Add specific details like design notes..." />
          </div>
        </div>

        <button 
          disabled={isSubmitting || !!barcodeError}
          type="submit" 
          className="w-full py-6 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:bg-slate-300 disabled:scale-100 disabled:shadow-none"
        >
          {isSubmitting ? "Registering Asset..." : "Authorize Registry Entry"}
        </button>
      </form>
      {showSuccess && <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-8 py-4 rounded-full shadow-2xl animate-bounce z-[100] font-black uppercase text-[10px] tracking-widest">✓ Asset Successfully Registered</div>}
    </div>
  );
};
