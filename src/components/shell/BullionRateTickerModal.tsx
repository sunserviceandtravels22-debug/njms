'use client';

import React, { useState, useEffect } from 'react';
import { Coins, Sparkles, TrendingUp, Check, X, RefreshCw, Edit3 } from 'lucide-react';

interface RateItem {
  id: string;
  metal: string;
  purityPpt: number;
  rateRupeesPerGram: number;
}

export function BullionRateTickerModal() {
  const [rates, setRates] = useState<RateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Edit fields (in ₹ per 10g for gold, ₹ per kg for silver)
  const [gold24Per10g, setGold24Per10g] = useState('');
  const [gold22Per10g, setGold22Per10g] = useState('');
  const [silverPerKg, setSilverPerKg] = useState('');

  const fetchRates = async () => {
    try {
      const res = await fetch('/api/v1/rates', { credentials: 'include' });
      const json = await res.json();
      if (json.ok && Array.isArray(json.data)) {
        setRates(json.data);
        const g24 = json.data.find((r: any) => r.metal === 'GOLD' && (r.purityPpt >= 999 || r.purityPpt === 1000));
        const g22 = json.data.find((r: any) => r.metal === 'GOLD' && r.purityPpt === 916);
        const sil = json.data.find((r: any) => r.metal === 'SILVER');

        if (g24) setGold24Per10g(String(Math.round(g24.rateRupeesPerGram * 10)));
        if (g22) setGold22Per10g(String(Math.round(g22.rateRupeesPerGram * 10)));
        else if (g24) setGold22Per10g(String(Math.round(g24.rateRupeesPerGram * 9.16)));
        if (sil) setSilverPerKg(String(Math.round(sil.rateRupeesPerGram * 1000)));
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, []);

  const handleGold24Change = (val: string) => {
    setGold24Per10g(val);
    const num = parseFloat(val);
    if (num && num > 0) {
      setGold22Per10g(String(Math.round(num * 0.916)));
    }
  };

  const handleSaveRates = async (e: React.FormEvent) => {
    e.preventDefault();
    const g24Val = parseFloat(gold24Per10g) / 10;
    const g22Val = parseFloat(gold22Per10g) / 10;
    const sVal = parseFloat(silverPerKg) / 1000;

    if (!g24Val || !sVal || g24Val <= 0 || sVal <= 0) return;

    setSaving(true);
    try {
      const res = await fetch('/api/v1/rates', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rates: [
            { metal: 'GOLD', purityPpt: 999, rateRupeesPerGram: g24Val },
            { metal: 'GOLD', purityPpt: 916, rateRupeesPerGram: g22Val > 0 ? g22Val : Math.round(g24Val * 0.916) },
            { metal: 'SILVER', purityPpt: 999, rateRupeesPerGram: sVal },
          ],
        }),
      });

      const json = await res.json();
      if (json.ok) {
        setSavedSuccess(true);
        await fetchRates();
        window.dispatchEvent(new CustomEvent('njms-rates-updated'));
        setTimeout(() => {
          setSavedSuccess(false);
          setIsOpen(false);
        }, 1200);
      } else {
        alert(json.error || 'Failed to update rates');
      }
    } catch (err: any) {
      alert(err.message || 'Network error');
    } finally {
      setSaving(false);
    }
  };

  const g24Rate = rates.find((r) => r.metal === 'GOLD' && (r.purityPpt >= 999 || r.purityPpt === 1000))?.rateRupeesPerGram || 7500;
  const g22Rate = rates.find((r) => r.metal === 'GOLD' && r.purityPpt === 916)?.rateRupeesPerGram || Math.round(g24Rate * 0.916);
  const silRate = rates.find((r) => r.metal === 'SILVER')?.rateRupeesPerGram || 90;

  return (
    <>
      {/* Top Header Ticker Pill */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all text-left group"
        title="Click to adjust Today's Bullion Board Rates"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
        </span>
        <div className="flex items-center gap-2 sm:gap-3 text-[11px] sm:text-xs">
          <span className="font-extrabold text-amber-700">
            24K: ₹{Math.round(g24Rate).toLocaleString('en-IN')}<span className="text-[10px] font-normal text-text-muted">/g</span>
          </span>
          <span className="hidden sm:inline font-bold text-text">
            22K: ₹{Math.round(g22Rate).toLocaleString('en-IN')}<span className="text-[10px] font-normal text-text-muted">/g</span>
          </span>
          <span className="hidden md:inline font-medium text-text-muted">
            Ag: ₹{Math.round(silRate).toLocaleString('en-IN')}<span className="text-[10px] font-normal text-text-muted">/g</span>
          </span>
        </div>
        <Edit3 className="w-3 h-3 text-amber-600 opacity-60 group-hover:opacity-100 transition-opacity ml-0.5" />
      </button>

      {/* Quick Rate Editor Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-surface border border-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-text">Today's Bullion Board Rates</h3>
                  <p className="text-xs text-text-muted">Live rates apply store-wide across POS & Valuation</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-text-muted hover:text-text transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRates} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-text-muted block mb-1">
                  Gold 24K Pure (₹ per 10 grams) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-text-muted">₹</span>
                  <input
                    type="number"
                    required
                    value={gold24Per10g}
                    onChange={(e) => handleGold24Change(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 bg-surface-2 border border-border rounded-xl text-sm font-extrabold text-amber-700 outline-none focus:border-amber-500"
                    placeholder="e.g. 78500"
                  />
                </div>
                <span className="text-[10px] text-text-muted mt-0.5 block">
                  Per gram: ₹{gold24Per10g ? Math.round(parseFloat(gold24Per10g) / 10).toLocaleString('en-IN') : '0'}/g
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-text-muted block mb-1">
                  Gold 22K Hallmark (₹ per 10 grams) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-text-muted">₹</span>
                  <input
                    type="number"
                    required
                    value={gold22Per10g}
                    onChange={(e) => setGold22Per10g(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 bg-surface-2 border border-border rounded-xl text-sm font-extrabold text-text outline-none focus:border-amber-500"
                    placeholder="e.g. 71900"
                  />
                </div>
                <span className="text-[10px] text-text-muted mt-0.5 block">
                  Per gram: ₹{gold22Per10g ? Math.round(parseFloat(gold22Per10g) / 10).toLocaleString('en-IN') : '0'}/g
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-text-muted block mb-1">
                  Silver 999 Fine (₹ per 1 Kilogram) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-text-muted">₹</span>
                  <input
                    type="number"
                    required
                    value={silverPerKg}
                    onChange={(e) => setSilverPerKg(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 bg-surface-2 border border-border rounded-xl text-sm font-extrabold text-text outline-none focus:border-amber-500"
                    placeholder="e.g. 94000"
                  />
                </div>
                <span className="text-[10px] text-text-muted mt-0.5 block">
                  Per gram: ₹{silverPerKg ? Math.round(parseFloat(silverPerKg) / 1000).toLocaleString('en-IN') : '0'}/g
                </span>
              </div>

              <div className="flex gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 py-2.5 bg-surface-2 border border-border text-xs font-bold rounded-xl text-text hover:bg-border transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-primary hover:bg-primary/90 text-white text-xs font-extrabold rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  {saving ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : savedSuccess ? (
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                  ) : null}
                  <span>{saving ? 'Updating Rates...' : savedSuccess ? 'Rates Updated!' : 'Save & Publish Rates'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
