'use client';

import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  PackageCheck,
  RefreshCw,
  Phone,
  Calendar,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

interface DeliveryQueueCard {
  id: string;
  girviId: string;
  loanNo: string;
  batchNo: string;
  state: 'PAID_AWAITING_RELEASE' | 'READY_TO_HAND_OVER' | 'RELEASED';
  lane: 'LANE_A_SHOP' | 'LANE_B_VENDOR';
  minPrincipalToPayRupees: number;
  collectorName: string;
  collectorRelation: string;
  customerPhone?: string;
  totalNetWeightGrams?: number;
  ornamentsCount?: number;
  eta?: string;
  hoursWaiting: number;
  waitingColor: string;
  createdAt: string;
}

interface LoanReminder {
  id: string;
  loanNo: string;
  customerName: string;
  customerPhone: string;
  dueDate: string | null;
  principalRupees: number;
  isPast: boolean;
  daysText: string;
}

export function DeliveryQueueWidget() {
  const [cards, setCards] = useState<DeliveryQueueCard[]>([]);
  const [reminders, setReminders] = useState<LoanReminder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/girvi/delivery-queue', { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        if (json.ok) {
          setCards(json.data || []);
          setReminders(json.reminders || []);
        }
      }
    } catch (e) {
      console.error('Failed to fetch delivery queue', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleStateUpdate = async (batchId: string, newState: string) => {
    try {
      const res = await fetch('/api/v1/girvi/delivery-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ batchId, newState }),
      });
      if (res.ok) {
        fetchQueue();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const laneA = cards.filter((c) => c.lane === 'LANE_A_SHOP' && c.state !== 'RELEASED');
  const laneB = cards.filter((c) => c.lane === 'LANE_B_VENDOR' && c.state !== 'RELEASED');

  return (
    <div className="bg-surface border border-border p-5 rounded-2xl shadow-xs space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-amber-500/10 text-amber-600 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-text uppercase tracking-tight flex items-center gap-2">
              <span>Jewellery Delivery Queue & Reminders</span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                Live Vault Sync
              </span>
            </h3>
            <p className="text-[11px] text-text-muted">
              Redeemed collateral transit from vault to shop counter & customer handover
            </p>
          </div>
        </div>

        <button
          onClick={fetchQueue}
          className="p-2 text-text-muted hover:text-text rounded-xl bg-surface-2 hover:bg-border transition-colors"
          title="Refresh Queue"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Two Lanes Grid: Ready in Shop vs. Vault Transit */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Lane A: Ready in Shop for Customer Handover */}
        <div className="space-y-3 p-4 bg-surface-2/60 rounded-xl border border-border">
          <div className="flex items-center justify-between pb-2 border-b border-border/60">
            <span className="text-xs font-black text-emerald-600 uppercase flex items-center gap-1.5">
              <PackageCheck className="w-4 h-4" /> Lane A: Ready for Handover ({laneA.length})
            </span>
            <span className="text-[10px] font-bold text-text-muted">At Shop Counter</span>
          </div>

          {laneA.length === 0 ? (
            <div className="p-8 text-center text-xs text-text-muted italic space-y-1">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto opacity-40" />
              <div>No ornaments currently waiting for handover</div>
            </div>
          ) : (
            laneA.map((card) => (
              <div key={card.id} className="p-3.5 bg-surface rounded-xl border border-border space-y-2.5 text-xs shadow-2xs">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-text">{card.loanNo}</span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                        Shop Counter
                      </span>
                    </div>
                    <div className="text-[11px] font-bold text-text mt-0.5">
                      Collector: {card.collectorName} {card.collectorRelation && `(${card.collectorRelation})`}
                    </div>
                    {card.customerPhone && (
                      <div className="text-[11px] text-text-muted flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-primary" />
                        <span className="font-mono">{card.customerPhone}</span>
                      </div>
                    )}
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${card.waitingColor}`}>
                    {card.hoursWaiting}h waiting
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border text-[11px]">
                  <span className="text-text-muted font-medium">
                    {card.ornamentsCount || 1} Ornaments • {card.totalNetWeightGrams?.toFixed(3) || '—'}g net
                  </span>
                  <button
                    onClick={() => handleStateUpdate(card.id, 'RELEASED')}
                    className="px-3.5 py-1.5 bg-emerald-600 text-white font-bold text-xs rounded-lg hover:bg-emerald-700 transition-colors shadow-2xs flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirm Handover</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Lane B: In Transit from Offsite Vault / Financier */}
        <div className="space-y-3 p-4 bg-surface-2/60 rounded-xl border border-border">
          <div className="flex items-center justify-between pb-2 border-b border-border/60">
            <span className="text-xs font-black text-amber-600 uppercase flex items-center gap-1.5">
              <Truck className="w-4 h-4" /> Lane B: In Vault / Financier Transit ({laneB.length})
            </span>
            <span className="text-[10px] font-bold text-text-muted">Safe Locker</span>
          </div>

          {laneB.length === 0 ? (
            <div className="p-8 text-center text-xs text-text-muted italic space-y-1">
              <ShieldCheck className="w-6 h-6 text-amber-500 mx-auto opacity-40" />
              <div>All redeemed ornaments safely delivered or at counter</div>
            </div>
          ) : (
            laneB.map((card) => (
              <div key={card.id} className="p-3.5 bg-surface rounded-xl border border-border space-y-2.5 text-xs shadow-2xs">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-text">{card.loanNo}</span>
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                        {card.eta || 'ETA ~30 mins'}
                      </span>
                    </div>
                    <div className="text-[11px] font-bold text-text mt-0.5">
                      Client: {card.collectorName}
                    </div>
                    {card.customerPhone && (
                      <div className="text-[11px] text-text-muted flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-primary" />
                        <span className="font-mono">{card.customerPhone}</span>
                      </div>
                    )}
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${card.waitingColor}`}>
                    {card.hoursWaiting}h in queue
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border text-[11px]">
                  <span className="text-text-muted font-medium">
                    {card.ornamentsCount || 1} Ornaments • {card.totalNetWeightGrams?.toFixed(3) || '—'}g net
                  </span>
                  <button
                    onClick={() => handleStateUpdate(card.id, 'READY_TO_HAND_OVER')}
                    className="px-3.5 py-1.5 bg-amber-600 text-white font-bold text-xs rounded-lg hover:bg-amber-700 transition-colors shadow-2xs flex items-center gap-1.5"
                  >
                    <PackageCheck className="w-3.5 h-3.5" />
                    <span>Received at Counter</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Reminders & Overdue Follow-ups */}
      {reminders.length > 0 && (
        <div className="p-4 bg-surface-2 rounded-xl border border-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-rose-600 uppercase flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> Due Date & Maturing Girvi Follow-ups ({reminders.length})
            </span>
            <span className="text-[11px] text-text-muted">Interest due or contract maturing</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {reminders.map((r) => (
              <div
                key={r.id}
                className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                  r.isPast
                    ? 'bg-rose-500/5 border-rose-500/20 text-rose-800'
                    : 'bg-amber-500/5 border-amber-500/20 text-amber-800'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="font-extrabold text-text">{r.loanNo}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    r.isPast ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {r.daysText}
                  </span>
                </div>
                <div className="font-bold text-text truncate">{r.customerName}</div>
                <div className="flex justify-between items-center text-[11px] text-text-muted pt-1 border-t border-border/50">
                  <span className="font-mono">📞 {r.customerPhone}</span>
                  <span className="font-black text-primary">₹{r.principalRupees.toLocaleString('en-IN')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
