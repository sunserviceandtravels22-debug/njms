'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  User,
  Phone,
  MapPin,
  Calendar,
  Lock,
  Coins,
  Edit2,
  Check,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Receipt,
  RotateCcw,
  CheckCircle2,
  PackageOpen,
} from 'lucide-react';

interface Girvi360ModalProps {
  girviId: string;
  onClose: () => void;
  onRefresh: () => void;
}

export const Girvi360Modal: React.FC<Girvi360ModalProps> = ({
  girviId,
  onClose,
  onRefresh,
}) => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);

  // Settlement & Partial Modals
  const [activeModal, setActiveModal] = useState<'NONE' | 'REDEEM' | 'PART_PAYMENT' | 'PART_RELEASE'>('NONE');
  const [redeemInterest, setRedeemInterest] = useState('');
  const [redeemMode, setRedeemMode] = useState('CASH');
  const [partPrincipal, setPartPrincipal] = useState('');
  const [partInterest, setPartInterest] = useState('');
  const [partMode, setPartMode] = useState('CASH');
  const [selectedItemsForRelease, setSelectedItemsForRelease] = useState<string[]>([]);

  const fetchLoanDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/girvi/${girviId}`, { credentials: 'include' });
      const json = await res.json();
      if (json.ok) {
        setData(json.data);
        setRedeemInterest(json.data.estimatedInterestRupees?.toString() || '0');
        setEditForm({
          principalRupees: json.data.principalRupees,
          interestRatePerMonthPct: json.data.interestRatePerMonthPct,
          loanDate: json.data.date,
          dueDate: json.data.dueDate || '',
          notes: json.data.notes || '',
        });
      }
    } catch (err) {
      console.error('Fetch girvi error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (girviId) fetchLoanDetail();
  }, [girviId]);

  const handleSaveEdit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/girvi/${girviId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const json = await res.json();
      if (json.ok) {
        setIsEditing(false);
        fetchLoanDetail();
        onRefresh();
      } else {
        alert(json.error || 'Failed to update loan');
      }
    } catch (err: any) {
      alert(err.message || 'Update error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRedeemSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/girvi/${girviId}/redeem`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interestPaidRupees: parseFloat(redeemInterest) || 0,
          paymentMode: redeemMode,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        alert(json.message || 'Loan redeemed successfully!');
        setActiveModal('NONE');
        fetchLoanDetail();
        onRefresh();
      } else {
        alert(json.error || 'Redemption failed');
      }
    } catch (err: any) {
      alert(err.message || 'Redemption error');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePartPaymentSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/girvi/${girviId}/part-payment`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          principalPaidRupees: parseFloat(partPrincipal) || 0,
          interestPaidRupees: parseFloat(partInterest) || 0,
          paymentMode: partMode,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        alert(json.message || 'Partial payment recorded!');
        setActiveModal('NONE');
        setPartPrincipal('');
        setPartInterest('');
        fetchLoanDetail();
        onRefresh();
      } else {
        alert(json.error || 'Payment failed');
      }
    } catch (err: any) {
      alert(err.message || 'Payment error');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePartReleaseSubmit = async () => {
    if (selectedItemsForRelease.length === 0) {
      alert('Please select at least one ornament to release.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/girvi/${girviId}/part-release`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds: selectedItemsForRelease }),
      });
      const json = await res.json();
      if (json.ok) {
        alert(json.message || 'Items released successfully!');
        setActiveModal('NONE');
        setSelectedItemsForRelease([]);
        fetchLoanDetail();
        onRefresh();
      } else {
        alert(json.error || 'Release failed');
      }
    } catch (err: any) {
      alert(err.message || 'Release error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!girviId) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border rounded-3xl max-w-3xl w-full max-h-[92dvh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-surface-2/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-700 rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-text tracking-tight">
                  Girvi Contract #{data?.loanNo || girviId}
                </h2>
                {data?.status && (
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${
                    data.status === 'ACTIVE' ? 'bg-amber-100 text-amber-900 border-amber-300' :
                    data.status === 'REDEEMED' ? 'bg-emerald-100 text-emerald-900 border-emerald-300' :
                    'bg-surface-2 text-text-muted border-border'
                  }`}>
                    {data.status}
                  </span>
                )}
                {data?.isRepledged && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 border border-indigo-300">
                    Repledged
                  </span>
                )}
              </div>
              <p className="text-xs text-text-muted">Pawnbroking Custody & Valuation Record</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {data && data.status !== 'REDEEMED' && (
              <button
                onClick={() => setIsEditing(!isEditing)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors ${
                  isEditing ? 'bg-primary text-white border-primary' : 'bg-surface border-border text-text hover:bg-border'
                }`}
              >
                <Edit2 className="w-3.5 h-3.5" /> {isEditing ? 'Cancel Edit' : 'Edit Details'}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-text-muted hover:text-text hover:bg-surface-2 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="p-16 text-center text-text-muted text-sm space-y-2">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <div>Loading Girvi Contract Details...</div>
          </div>
        ) : !data ? (
          <div className="p-12 text-center text-rose-600 text-sm">Failed to load loan record.</div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar">
            {/* Customer KYC Snippet Card */}
            {data.customer && (
              <div className="p-4 bg-surface rounded-2xl border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0">
                    {data.customer.photoUrl ? (
                      <img src={data.customer.photoUrl} alt={data.customer.name} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-6 h-6 text-amber-500" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-text">{data.customer.name}</h3>
                    <p className="text-xs text-text-muted">📞 +91 {data.customer.phone}</p>
                    {data.customer.relationName && (
                      <p className="text-[11px] text-text-muted">
                        {data.customer.relationType}: {data.customer.relationName}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-xs text-text-muted sm:text-right">
                  <p>{data.customer.address || 'Local Address'}</p>
                  <p>{data.customer.city || 'Local'}</p>
                </div>
              </div>
            )}

            {/* Financial Status Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 bg-surface rounded-xl border border-border shadow-2xs text-center space-y-0.5">
                <span className="text-[10px] font-bold text-text-muted uppercase">Principal Loan</span>
                {isEditing ? (
                  <input
                    type="number"
                    value={editForm.principalRupees}
                    onChange={(e) => setEditForm({ ...editForm, principalRupees: e.target.value })}
                    className="w-full px-2 py-1 text-center bg-surface-2 border border-border rounded-lg text-sm font-black text-primary"
                  />
                ) : (
                  <p className="text-base font-black text-primary">₹{data.principalRupees.toLocaleString('en-IN')}</p>
                )}
                <span className="text-[10px] text-text-muted">Sanctioned</span>
              </div>

              <div className="p-3 bg-surface rounded-xl border border-border shadow-2xs text-center space-y-0.5">
                <span className="text-[10px] font-bold text-text-muted uppercase">Monthly Rate</span>
                {isEditing ? (
                  <input
                    type="number"
                    step="0.1"
                    value={editForm.interestRatePerMonthPct}
                    onChange={(e) => setEditForm({ ...editForm, interestRatePerMonthPct: e.target.value })}
                    className="w-full px-2 py-1 text-center bg-surface-2 border border-border rounded-lg text-sm font-black text-amber-700"
                  />
                ) : (
                  <p className="text-base font-black text-amber-700">{data.interestRatePerMonthPct}% / mo</p>
                )}
                <span className="text-[10px] text-text-muted">Interest rate</span>
              </div>

              <div className="p-3 bg-surface rounded-xl border border-border shadow-2xs text-center space-y-0.5">
                <span className="text-[10px] font-bold text-text-muted uppercase">Est. Accrued Interest</span>
                <p className="text-base font-black text-amber-800">₹{data.estimatedInterestRupees?.toLocaleString('en-IN') || 0}</p>
                <span className="text-[10px] text-text-muted">Till today</span>
              </div>

              <div className="p-3 bg-surface rounded-xl border border-border shadow-2xs text-center space-y-0.5">
                <span className="text-[10px] font-bold text-text-muted uppercase">Total Settle Payable</span>
                <p className="text-base font-black text-emerald-600">₹{data.totalPayableRupees?.toLocaleString('en-IN') || 0}</p>
                <span className="text-[10px] text-text-muted">Principal + Interest</span>
              </div>
            </div>

            {/* Dates & Edit Controls */}
            {isEditing && (
              <div className="p-4 bg-surface-2/60 border border-border rounded-2xl space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="font-semibold text-text-muted block mb-1">Loan Date</label>
                    <input
                      type="date"
                      value={editForm.loanDate}
                      onChange={(e) => setEditForm({ ...editForm, loanDate: e.target.value })}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-text font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-text-muted block mb-1">Due Date</label>
                    <input
                      type="date"
                      value={editForm.dueDate}
                      onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-text font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-text-muted block mb-1">Contract Notes</label>
                  <input
                    type="text"
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-text font-medium"
                    placeholder="Notes or conditions..."
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 bg-surface border border-border text-xs font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={submitting}
                    className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90"
                  >
                    {submitting ? 'Saving...' : 'Save All Changes'}
                  </button>
                </div>
              </div>
            )}

            {/* Pledged Ornaments Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-primary" /> Pledged Ornaments ({data.items.length})
                </h4>
                <span className="text-xs font-extrabold text-text">
                  Total: {data.totalNetWeightGrams} g net (Valuation ₹{data.totalValuationRupees.toLocaleString('en-IN')})
                </span>
              </div>

              <div className="divide-y divide-border bg-surface rounded-2xl border border-border overflow-hidden">
                {data.items.map((item: any) => (
                  <div key={item.id} className="p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-text">{item.ornamentType}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-800 border border-amber-500/20">
                          {item.purity} ({item.metal})
                        </span>
                        {item.defectType && item.defectType !== 'None' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-700 border border-rose-500/20">
                            Defect: {item.defectType}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-text-muted flex flex-wrap items-center gap-3">
                        <span>Gross: {item.grossWeightGrams}g</span>
                        <span>•</span>
                        <span className="font-bold text-text">Net: {item.netWeightGrams}g</span>
                        <span>•</span>
                        <span>Locker: {item.locationName}</span>
                      </div>
                    </div>

                    <div className="text-right self-end sm:self-center">
                      <span className="text-sm font-extrabold text-primary">₹{item.valuationRupees.toLocaleString('en-IN')}</span>
                      <p className="text-[10px] text-text-muted">Assessed Valuation</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Repledge Exposure Info if Active */}
            {data.isRepledged && (
              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl space-y-1.5 text-xs text-indigo-900">
                <span className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-indigo-600" /> Currently Repledged to Financier
                </span>
                <p>
                  This loan's ornaments have been deposited with external financier. Settle the repledge contract in the Re-pledge module to return ornaments to the shop vault before client redemption.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons Footer */}
        {data && data.status !== 'REDEEMED' && (
          <div className="p-4 border-t border-border bg-surface-2/50 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveModal('PART_RELEASE')}
                className="px-3 py-2 rounded-xl bg-surface border border-border text-xs font-bold text-text hover:bg-border transition-colors flex items-center gap-1.5"
              >
                <PackageOpen className="w-3.5 h-3.5 text-amber-700" /> Partial Item Release
              </button>
              <button
                onClick={() => setActiveModal('PART_PAYMENT')}
                className="px-3 py-2 rounded-xl bg-surface border border-border text-xs font-bold text-text hover:bg-border transition-colors flex items-center gap-1.5"
              >
                <Receipt className="w-3.5 h-3.5 text-primary" /> Partial Payment
              </button>
            </div>

            <button
              onClick={() => setActiveModal('REDEEM')}
              className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-md flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" /> Settle & Redeem Contract
            </button>
          </div>
        )}

        {/* Modal: Redeem / Full Settlement */}
        {activeModal === 'REDEEM' && (
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-surface border border-border rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h3 className="text-sm font-bold text-text">Settle & Redeem Loan</h3>
                <button onClick={() => setActiveModal('NONE')} className="p-1 rounded-lg text-text-muted hover:text-text">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-surface-2 rounded-xl space-y-1">
                  <div className="flex justify-between"><span className="text-text-muted">Principal to Pay:</span><span className="font-bold">₹{data.principalRupees.toLocaleString('en-IN')}</span></div>
                  <div className="flex justify-between"><span className="text-text-muted">Est. Interest:</span><span className="font-bold text-amber-800">₹{data.estimatedInterestRupees?.toLocaleString('en-IN') || 0}</span></div>
                </div>

                <div>
                  <label className="font-semibold text-text-muted block mb-1">Final Interest Paid (₹) *</label>
                  <input
                    type="number"
                    value={redeemInterest}
                    onChange={(e) => setRedeemInterest(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-2 border border-border rounded-xl text-xs font-bold text-text"
                  />
                </div>

                <div>
                  <label className="font-semibold text-text-muted block mb-1">Payment Mode</label>
                  <select
                    value={redeemMode}
                    onChange={(e) => setRedeemMode(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-2 border border-border rounded-xl text-xs font-bold text-text"
                  >
                    <option value="CASH">Cash Drawer</option>
                    <option value="UPI">Shop UPI</option>
                    <option value="BANK">Bank Account</option>
                  </select>
                </div>

                <div className="p-2.5 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl text-center">
                  <span className="text-[11px] block text-emerald-700">Total Money Received:</span>
                  <span className="text-base font-black">
                    ₹{(data.principalRupees + (parseFloat(redeemInterest) || 0)).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setActiveModal('NONE')}
                  className="flex-1 py-2 bg-surface-2 border border-border text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRedeemSubmit}
                  disabled={submitting}
                  className="flex-1 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700"
                >
                  {submitting ? 'Settling...' : 'Confirm Redemption'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Partial Payment */}
        {activeModal === 'PART_PAYMENT' && (
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-surface border border-border rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h3 className="text-sm font-bold text-text">Record Partial Payment</h3>
                <button onClick={() => setActiveModal('NONE')} className="p-1 rounded-lg text-text-muted hover:text-text">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-text-muted block mb-1">Principal Reduction Paid (₹)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={partPrincipal}
                    onChange={(e) => setPartPrincipal(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-2 border border-border rounded-xl text-xs font-bold text-text"
                  />
                </div>

                <div>
                  <label className="font-semibold text-text-muted block mb-1">Interest Amount Paid (₹)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={partInterest}
                    onChange={(e) => setPartInterest(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-2 border border-border rounded-xl text-xs font-bold text-text"
                  />
                </div>

                <div>
                  <label className="font-semibold text-text-muted block mb-1">Payment Mode</label>
                  <select
                    value={partMode}
                    onChange={(e) => setPartMode(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-2 border border-border rounded-xl text-xs font-bold text-text"
                  >
                    <option value="CASH">Cash Drawer</option>
                    <option value="UPI">Shop UPI</option>
                    <option value="BANK">Bank Account</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setActiveModal('NONE')}
                  className="flex-1 py-2 bg-surface-2 border border-border text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePartPaymentSubmit}
                  disabled={submitting}
                  className="flex-1 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90"
                >
                  {submitting ? 'Recording...' : 'Save Payment'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Partial Ornament Release */}
        {activeModal === 'PART_RELEASE' && (
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-surface border border-border rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h3 className="text-sm font-bold text-text">Select Ornaments to Release</h3>
                <button onClick={() => setActiveModal('NONE')} className="p-1 rounded-lg text-text-muted hover:text-text">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-text-muted">
                Select ornaments the customer is taking back. These will be marked released from vault custody.
              </p>

              <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                {data.items.map((item: any) => {
                  const isChecked = selectedItemsForRelease.includes(item.id);
                  return (
                    <label
                      key={item.id}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer text-xs transition-colors ${
                        isChecked ? 'bg-primary/10 border-primary' : 'bg-surface-2 border-border'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedItemsForRelease([...selectedItemsForRelease, item.id]);
                            else setSelectedItemsForRelease(selectedItemsForRelease.filter((id) => id !== item.id));
                          }}
                          className="w-4 h-4 text-primary rounded"
                        />
                        <div>
                          <span className="font-bold text-text">{item.ornamentType}</span>
                          <span className="text-text-muted ml-1.5">({item.netWeightGrams}g net)</span>
                        </div>
                      </div>
                      <span className="font-bold text-primary">₹{item.valuationRupees.toLocaleString('en-IN')}</span>
                    </label>
                  );
                })}
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setActiveModal('NONE')}
                  className="flex-1 py-2 bg-surface-2 border border-border text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePartReleaseSubmit}
                  disabled={submitting || selectedItemsForRelease.length === 0}
                  className="flex-1 py-2 bg-amber-600 text-white text-xs font-bold rounded-xl hover:bg-amber-700 disabled:opacity-50"
                >
                  {submitting ? 'Releasing...' : `Release (${selectedItemsForRelease.length}) Items`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
