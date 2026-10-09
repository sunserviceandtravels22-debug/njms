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
  MessageSquare,
  ArrowRight,
} from 'lucide-react';

interface DeliveryQueueCard {
  id: string;
  girviId: string;
  batchNo: string;
  state: 'PAID_AWAITING_RELEASE' | 'READY_TO_HAND_OVER' | 'RELEASED';
  lane: 'LANE_A_SHOP' | 'LANE_B_VENDOR';
  minPrincipalToPayRupees: number;
  collectorName: string;
  collectorRelation: string;
  hoursWaiting: number;
  waitingColor: string;
  createdAt: string;
}

export function DeliveryQueueWidget() {
  const [cards, setCards] = useState<DeliveryQueueCard[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/girvi/delivery-queue');
      if (res.ok) {
        const json = await res.json();
        if (json.ok) {
          setCards(json.data);
        }
      }
    } catch (e) {
      console.error(e);
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
    <div className="bg-surface border border-border p-5 rounded-2xl shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-amber-500/10 text-amber-600 rounded-lg">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-text uppercase tracking-tight">
              Jewellery Delivery Queue & Reminders
            </h3>
            <p className="text-[11px] text-text-muted">
              Paid releases waiting for customer handover or vendor recall
            </p>
          </div>
        </div>

        <button onClick={fetchQueue} className="p-1.5 text-text-muted hover:text-text rounded-lg">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Two Lanes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Lane A: Ready in Shop */}
        <div className="space-y-3 p-3 bg-surface-2 rounded-xl border border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-emerald-600 uppercase flex items-center gap-1.5">
              <PackageCheck className="w-4 h-4" /> Lane A: Ready to Hand Over ({laneA.length})
            </span>
          </div>

          {laneA.length === 0 ? (
            <div className="p-6 text-center text-xs text-text-muted italic">No items waiting in shop</div>
          ) : (
            laneA.map((card) => (
              <div key={card.id} className="p-3 bg-surface rounded-xl border border-border space-y-2 text-xs">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-extrabold text-text">{card.batchNo}</span>
                    <div className="text-[11px] text-text-muted">Collector: {card.collectorName} ({card.collectorRelation})</div>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${card.waitingColor}`}>
                    {card.hoursWaiting}h waiting
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-border">
                  <span className="text-[10px] text-emerald-600 font-bold">Interest Frozen</span>
                  <button
                    onClick={() => handleStateUpdate(card.id, 'RELEASED')}
                    className="px-3 py-1 bg-emerald-600 text-white font-bold text-[11px] rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    Mark Delivered
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Lane B: Coming from Vendor */}
        <div className="space-y-3 p-3 bg-surface-2 rounded-xl border border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-amber-600 uppercase flex items-center gap-1.5">
              <Truck className="w-4 h-4" /> Lane B: Coming from Vendor ({laneB.length})
            </span>
          </div>

          {laneB.length === 0 ? (
            <div className="p-6 text-center text-xs text-text-muted italic">No active vendor recalls pending</div>
          ) : (
            laneB.map((card) => (
              <div key={card.id} className="p-3 bg-surface rounded-xl border border-border space-y-2 text-xs">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-extrabold text-text">{card.batchNo}</span>
                    <div className="text-[11px] text-text-muted font-bold">State: {card.state}</div>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${card.waitingColor}`}>
                    {card.hoursWaiting}h waiting
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-border">
                  <span className="text-[10px] text-amber-600 font-bold">Recall in Progress</span>
                  <button
                    onClick={() => handleStateUpdate(card.id, 'READY_TO_HAND_OVER')}
                    className="px-3 py-1 bg-amber-600 text-white font-bold text-[11px] rounded-lg hover:bg-amber-700 transition-colors"
                  >
                    Mark Received
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
