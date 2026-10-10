// Implements: FR-PLT-04, FR-PLT-04a | Screen: S-80 | Doc: 02_DESIGN §3, §6, 03_TECH §9

'use client';

import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Building2, Percent, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { SaveIndicator } from '@/components/ui/SaveIndicator';
import { useDraft } from '@/lib/useDraft';
import { DraftBanner } from '@/components/ui/DraftBanner';

export default function SettingsPage() {
  const [shopName, setShopName] = useState('Narayan Jewellers');
  const [address, setAddress] = useState('Main Bazaar, Jewellery Market');
  const [phone, setPhone] = useState('+91 98765 43210');
  const [gstin, setGstin] = useState('07AAAAA0000A1Z5');

  // Configurable GST Toggle (Change Request)
  const [gstEnabled, setGstEnabled] = useState(true);
  const [jewelleryGstBp, setJewelleryGstBp] = useState(300); // 3%
  const [makingGstBp, setMakingGstBp] = useState(500); // 5%

  const [goldInterestBp, setGoldInterestBp] = useState(200); // 2%/mo
  const [silverInterestBp, setSilverInterestBp] = useState(250); // 2.5%/mo
  const [ltvLimitBp, setLtvLimitBp] = useState(7500); // 75%

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load settings from DB on mount
  useEffect(() => {
    fetch('/api/v1/settings', { credentials: 'include' })
      .then((r) => r.json())
      .then((res) => {
        const s = res.settings || {};
        if (s['shop.name']) setShopName(s['shop.name']);
        if (s['shop.address']) setAddress(s['shop.address']);
        if (s['shop.phone']) setPhone(s['shop.phone']);
        if (s['shop.gstin']) setGstin(s['shop.gstin']);
        if (s['gst.settings']) {
          const g = s['gst.settings'];
          if (g.enabled !== undefined) setGstEnabled(g.enabled);
          if (g.jewelleryBp) setJewelleryGstBp(g.jewelleryBp);
          if (g.makingBp) setMakingGstBp(g.makingBp);
        }
        if (s['girvi.goldInterestBp']) setGoldInterestBp(Number(s['girvi.goldInterestBp']));
        if (s['girvi.silverInterestBp']) setSilverInterestBp(Number(s['girvi.silverInterestBp']));
        if (s['girvi.ltvLimitBp']) setLtvLimitBp(Number(s['girvi.ltvLimitBp']));
      })
      .catch(() => setLoadError('Could not load settings from server'));
  }, []);

  const currentFormData = {
    shopName,
    address,
    phone,
    gstin,
    gstEnabled,
    jewelleryGstBp,
    makingGstBp,
    goldInterestBp,
    silverInterestBp,
    ltvLimitBp,
  };

  const { hasDraft, draftData, draftTimestamp, saveStatus, discardDraft } = useDraft(
    'settings',
    's-80-basics',
    currentFormData
  );

  const handleResumeDraft = () => {
    if (draftData) {
      setShopName(draftData.shopName || shopName);
      setAddress(draftData.address || address);
      setPhone(draftData.phone || phone);
      setGstin(draftData.gstin || gstin);
      setGstEnabled(draftData.gstEnabled ?? true);
      setJewelleryGstBp(draftData.jewelleryGstBp || jewelleryGstBp);
      setMakingGstBp(draftData.makingGstBp || makingGstBp);
      setGoldInterestBp(draftData.goldInterestBp || goldInterestBp);
      setSilverInterestBp(draftData.silverInterestBp || silverInterestBp);
      setLtvLimitBp(draftData.ltvLimitBp || ltvLimitBp);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    try {
      // Save all settings to DB
      const puts = [
        { key: 'shop.name', value: shopName },
        { key: 'shop.address', value: address },
        { key: 'shop.phone', value: phone },
        { key: 'shop.gstin', value: gstin },
        { key: 'gst.settings', value: { enabled: gstEnabled, jewelleryBp: jewelleryGstBp, makingBp: makingGstBp } },
        { key: 'girvi.goldInterestBp', value: goldInterestBp },
        { key: 'girvi.silverInterestBp', value: silverInterestBp },
        { key: 'girvi.ltvLimitBp', value: ltvLimitBp },
      ];

      for (const entry of puts) {
        await fetch('/api/v1/settings', {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry),
        });
      }

      setMsg('Settings saved to database!');
      await discardDraft();
    } catch {
      setMsg('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {hasDraft && (
        <DraftBanner timestamp={draftTimestamp} onResume={handleResumeDraft} onDiscard={discardDraft} />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-primary" />
            Shop & System Settings
          </h1>
          <p className="text-xs text-text-muted">Configure shop profile, GST preferences, and risk limits</p>
        </div>
        <SaveIndicator status={saveStatus} />
      </div>

      {loadError && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-xs font-medium">
          ⚠️ {loadError} — showing defaults
        </div>
      )}

      {msg && (
        <div className={`p-3 border rounded-lg text-xs font-medium flex items-center gap-2 ${
          msg.includes('Failed') ? 'bg-red-50 border-red-200 text-red-800' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
        }`}>
          {msg.includes('Failed') ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          {msg}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Shop Profile Section */}
        <div className="bg-surface border border-border rounded-xl p-4 sm:p-6 space-y-4">
          <h3 className="text-sm font-bold text-text flex items-center gap-2 border-b border-border pb-2">
            <Building2 className="w-4 h-4 text-primary" />
            Shop Profile
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Shop Name" required>
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-bg text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </Field>
            <Field label="Contact Phone" required>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-bg text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </Field>
            <Field label="GSTIN">
              <input
                type="text"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-bg text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </Field>
            <Field label="Shop Address">
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-bg text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </Field>
          </div>
        </div>

        {/* Master GST Calculation Toggle (Change Request) */}
        <div className="bg-surface border border-border rounded-xl p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h3 className="text-sm font-bold text-text flex items-center gap-2">
              <Percent className="w-4 h-4 text-primary" />
              GST Tax Calculation Preferences
            </h3>
          </div>

          <div className="p-4 rounded-xl border border-border bg-surface-2 flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-bold text-text">Enable Master GST Calculation</div>
              <p className="text-xs text-text-muted mt-0.5">
                {gstEnabled
                  ? 'Tax Invoice mode: POS cart and invoices calculate and print GST breakdown (3% jewellery / 5% making).'
                  : 'Non-GST mode: GST calculation is disabled (0%), and invoices print as Non-GST Bill of Supply.'}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={gstEnabled}
                onChange={(e) => setGstEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          {gstEnabled && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <Field label="Jewellery GST Rate (%)">
                <input
                  type="number"
                  step="0.1"
                  value={jewelleryGstBp / 100}
                  onChange={(e) => setJewelleryGstBp(Math.round(parseFloat(e.target.value || '0') * 100))}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-bg text-sm focus:ring-2 focus:ring-primary focus:outline-none font-mono"
                />
              </Field>
              <Field label="Job Work / Making GST Rate (%)">
                <input
                  type="number"
                  step="0.1"
                  value={makingGstBp / 100}
                  onChange={(e) => setMakingGstBp(Math.round(parseFloat(e.target.value || '0') * 100))}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-bg text-sm focus:ring-2 focus:ring-primary focus:outline-none font-mono"
                />
              </Field>
            </div>
          )}
        </div>

        {/* Financial & Girvi Limits */}
        <div className="bg-surface border border-border rounded-xl p-4 sm:p-6 space-y-4">
          <h3 className="text-sm font-bold text-text flex items-center gap-2 border-b border-border pb-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            Financial & Girvi Limits
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Gold Default Interest (% / mo)">
              <input
                type="number"
                step="0.1"
                value={goldInterestBp / 100}
                onChange={(e) => setGoldInterestBp(Math.round(parseFloat(e.target.value || '0') * 100))}
                className="w-full px-3 py-2 border border-border rounded-lg bg-bg text-sm font-mono focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </Field>
            <Field label="Silver Default Interest (% / mo)">
              <input
                type="number"
                step="0.1"
                value={silverInterestBp / 100}
                onChange={(e) => setSilverInterestBp(Math.round(parseFloat(e.target.value || '0') * 100))}
                className="w-full px-3 py-2 border border-border rounded-lg bg-bg text-sm font-mono focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </Field>
            <Field label="Maximum LTV Limit (%)">
              <input
                type="number"
                value={ltvLimitBp / 100}
                onChange={(e) => setLtvLimitBp(Math.round(parseFloat(e.target.value || '0') * 100))}
                className="w-full px-3 py-2 border border-border rounded-lg bg-bg text-sm font-mono focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </Field>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" loading={saving}>
            <Save className="w-4 h-4" />
            Save Settings
          </Button>
        </div>
      </form>
    </div>
  );
}
