'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check, Sparkles, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function InventoryIngestionPage() {
  const [metalType, setMetalType] = useState<'GOLD' | 'SILVER'>('GOLD');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState('Ring');
  const [weight, setWeight] = useState('');
  const [tunch, setTunch] = useState('91.6');
  const [labourCharges, setLabourCharges] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [notes, setNotes] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);

  const [goldRate, setGoldRate] = useState(7250); // ₹/g
  const [silverRate, setSilverRate] = useState(88); // ₹/g

  const [skuSuggestions, setSkuSuggestions] = useState<any[]>([]);
  const [availableSkus, setAvailableSkus] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Load benchmarks and SKU catalog
  useEffect(() => {
    fetch('/api/v1/rates')
      .then((res) => res.json())
      .then((res) => {
        if (res.ok && Array.isArray(res.data)) {
          const gold = res.data.find((r: any) => r.metal === 'GOLD');
          const silver = res.data.find((r: any) => r.metal === 'SILVER');
          if (gold) setGoldRate(gold.rateRupeesPerGram);
          if (silver) setSilverRate(silver.rateRupeesPerGram);
        }
      })
      .catch(() => {});

    fetch('/api/v1/inventory/sku')
      .then((res) => res.json())
      .then((res) => {
        if (res.ok && Array.isArray(res.data)) setAvailableSkus(res.data);
      })
      .catch(() => {});
  }, []);

  // Auto calculate acquisition price based on mass and benchmark rates
  useEffect(() => {
    const w = parseFloat(weight || '0');
    if (w > 0) {
      const basePrice = metalType === 'GOLD' ? w * goldRate : w * silverRate;
      setPurchasePrice(Math.round(basePrice).toString());
    }
  }, [weight, metalType, goldRate, silverRate]);

  // SKU suggestion filter
  useEffect(() => {
    if (sku.length > 1) {
      setSkuSuggestions(availableSkus.filter((s) => s.skuCode.toLowerCase().includes(sku.toLowerCase())));
    } else {
      setSkuSuggestions([]);
    }
  }, [sku, availableSkus]);

  const selectSKU = (s: any) => {
    setSku(s.skuCode);
    setCategory(s.category);
    setMetalType(s.metalType === 'Gold' ? 'GOLD' : 'SILVER');
    setTunch(String(s.defaultTunch));
    setSkuSuggestions([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sku || !weight) return alert('Fill mandatory fields (SKU Protocol & Mass Weight)');

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/v1/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${metalType === 'GOLD' ? 'Gold' : 'Silver'} ${category} (${sku})`,
          sku,
          category,
          metal: metalType,
          purityPpt: Math.round(parseFloat(tunch) * 10),
          grossWeightGrams: parseFloat(weight),
          stoneWeightGrams: 0,
          makingType: 'PER_GRAM',
          makingValueRupees: parseFloat(labourCharges) || 0,
          huid: barcode || undefined,
        }),
      });

      if (res.ok) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
        setSku('');
        setBarcode('');
        setWeight('');
        setLabourCharges('');
        setSupplierName('');
        setNotes('');
      } else {
        const data = await res.json();
        alert(data.error || 'Ingestion failed');
      }
    } catch (err: any) {
      alert(err.message || 'Asset registry entry failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between bg-surface border border-border p-6 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3">
          <Link href="/inventory" className="p-2 bg-surface-2 rounded-xl border border-border hover:bg-border text-text transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-primary uppercase tracking-tight">Inventory Ingestion</h1>
            <p className="text-xs text-text-muted">Certified Physical Asset Registry & Cost Basis Terminal</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMetalType('GOLD')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              metalType === 'GOLD' ? 'bg-amber-500 text-white shadow-md' : 'bg-surface-2 text-text-muted'
            }`}
          >
            GOLD
          </button>
          <button
            type="button"
            onClick={() => setMetalType('SILVER')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              metalType === 'SILVER' ? 'bg-slate-400 text-white shadow-md' : 'bg-surface-2 text-text-muted'
            }`}
          >
            SILVER
          </button>
        </div>
      </div>

      {/* Form Container */}
      <form onSubmit={handleSubmit} className="bg-surface border border-border p-6 sm:p-8 rounded-2xl shadow-xs space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* SKU Code */}
          <div className="lg:col-span-2 relative">
            <label className="text-xs font-bold text-text-muted block mb-1.5 uppercase">SKU Master Protocol *</label>
            <input
              type="text"
              required
              value={sku}
              onChange={(e) => setSku(e.target.value.toUpperCase())}
              placeholder="Search or enter SKU Code..."
              className="w-full p-3 bg-surface-2 border border-border rounded-xl text-xs font-bold text-text outline-none focus:border-primary font-mono uppercase"
            />
            {skuSuggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-surface border border-border rounded-xl shadow-2xl max-h-48 overflow-y-auto divide-y divide-border">
                {skuSuggestions.map((s) => (
                  <button
                    key={s.skuCode}
                    type="button"
                    onClick={() => selectSKU(s)}
                    className="w-full text-left p-3 hover:bg-surface-2 flex justify-between items-center text-xs"
                  >
                    <span className="font-bold text-primary font-mono">{s.skuCode}</span>
                    <span className="text-[10px] text-text-muted uppercase font-bold">{s.category} ({s.metalType})</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Asset Tag / Barcode */}
          <div>
            <label className="text-xs font-bold text-text-muted block mb-1.5 uppercase">Asset Tag / HUID Barcode</label>
            <input
              type="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="Scan physical tag..."
              className="w-full p-3 bg-surface-2 border border-border rounded-xl text-xs font-bold text-text outline-none focus:border-primary font-mono"
            />
          </div>

          {/* Net Mass */}
          <div>
            <label className="text-xs font-bold text-text-muted block mb-1.5 uppercase">Net Mass Weight (g) *</label>
            <input
              type="number"
              step="0.001"
              required
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="0.000"
              className="w-full p-3 bg-surface-2 border border-border rounded-xl text-xs font-bold text-text outline-none focus:border-primary font-mono"
            />
          </div>

          {/* Metal Tunch % */}
          <div>
            <label className="text-xs font-bold text-text-muted block mb-1.5 uppercase">Metal Tunch (%)</label>
            <input
              type="number"
              step="0.1"
              value={tunch}
              onChange={(e) => setTunch(e.target.value)}
              placeholder="91.6"
              className="w-full p-3 bg-surface-2 border border-border rounded-xl text-xs font-bold text-text outline-none focus:border-primary font-mono"
            />
          </div>

          {/* Crafting Labour Charges */}
          <div>
            <label className="text-xs font-bold text-text-muted block mb-1.5 uppercase">Crafting Labour Fee (₹)</label>
            <input
              type="number"
              value={labourCharges}
              onChange={(e) => setLabourCharges(e.target.value)}
              placeholder="0"
              className="w-full p-3 bg-surface-2 border border-border rounded-xl text-xs font-bold text-text outline-none focus:border-primary font-mono"
            />
          </div>

          {/* Acquisition Price */}
          <div>
            <label className="text-xs font-bold text-primary block mb-1.5 uppercase">Acquisition Cost (₹) *</label>
            <input
              type="number"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              className="w-full p-3 bg-primary/10 border border-primary/30 rounded-xl text-sm font-extrabold text-primary outline-none focus:border-primary font-mono"
            />
          </div>

          {/* Supplier / Karigar */}
          <div>
            <label className="text-xs font-bold text-text-muted block mb-1.5 uppercase">Vendor / Karigar Name</label>
            <input
              type="text"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              placeholder="Source name..."
              className="w-full p-3 bg-surface-2 border border-border rounded-xl text-xs font-bold text-text outline-none focus:border-primary"
            />
          </div>

          {/* Transaction Date */}
          <div>
            <label className="text-xs font-bold text-text-muted block mb-1.5 uppercase">Ingestion Date</label>
            <input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="w-full p-3 bg-surface-2 border border-border rounded-xl text-xs font-bold text-text outline-none focus:border-primary"
            />
          </div>

          {/* Notes */}
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="text-xs font-bold text-text-muted block mb-1.5 uppercase">Item Memo & Design Notes</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter design specifications, stone breakdown..."
              className="w-full p-3 bg-surface-2 border border-border rounded-xl text-xs font-semibold text-text outline-none focus:border-primary resize-none"
            />
          </div>
        </div>

        <button
          disabled={isSubmitting}
          type="submit"
          className="w-full py-4 bg-primary text-white rounded-xl font-bold uppercase tracking-wider text-xs shadow-md hover:bg-primary/90 transition-all disabled:opacity-40"
        >
          {isSubmitting ? 'Registering Asset...' : 'Authorize Asset Registry Entry'}
        </button>
      </form>

      {showSuccess && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-bold uppercase tracking-wider animate-bounce">
          <Check className="w-4 h-4 text-emerald-400" /> Asset Successfully Registered
        </div>
      )}
    </div>
  );
}
