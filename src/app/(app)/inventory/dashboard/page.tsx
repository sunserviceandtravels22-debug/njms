'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AlertStrip } from '@/components/AlertStrip';
import {
  Package,
  Coins,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  Layers,
  Sparkles,
  BarChart3,
} from 'lucide-react';
import { formatMoney } from '@/domain/money';
import { formatWeightMg } from '@/domain/weight';

export default function InventoryDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/inventory/dashboard')
      .then((res) => res.json())
      .then((json) => {
        if (json.ok) setData(json.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      {/* Alert Strip (top 3 critical/warn) */}
      <AlertStrip />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-primary" />
            Inventory Control & Stock Analytics
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Real-time stock valuation, pure metal weights, item classes and aging (S-223 / D12-DSH)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/inventory"
            className="px-3.5 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-2 text-sm font-semibold transition-colors"
          >
            Inventory List
          </Link>
          <Link
            href="/inventory/new"
            className="px-3.5 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 text-sm font-bold shadow-2xs transition-colors"
          >
            + Add Item
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-text-muted">Loading inventory metrics...</div>
      ) : data ? (
        <>
          {/* Key Metric Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-border bg-surface shadow-2xs space-y-1.5">
              <div className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center justify-between">
                <span>Market Value</span>
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
              <div className="text-2xl font-extrabold text-primary">
                {formatMoney(BigInt(data.summary.totalMarketValuePaise || 0))}
              </div>
              <div className="text-xs text-text-muted">Current spot rate bullion basis</div>
            </div>

            {data.summary.totalCostPaise !== null && (
              <div className="p-4 rounded-xl border border-border bg-surface shadow-2xs space-y-1.5">
                <div className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center justify-between">
                  <span>Stock Cost</span>
                  <Coins className="w-4 h-4 text-text-muted" />
                </div>
                <div className="text-2xl font-extrabold text-text">
                  {formatMoney(BigInt(data.summary.totalCostPaise || 0))}
                </div>
                <div className="text-xs text-text-muted">Owner / Manager cost basis</div>
              </div>
            )}

            <div className="p-4 rounded-xl border border-border bg-surface shadow-2xs space-y-1.5">
              <div className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center justify-between">
                <span>Fine Pure Gold</span>
                <Sparkles className="w-4 h-4 text-warning" />
              </div>
              <div className="text-2xl font-extrabold text-warning-foreground">
                {formatWeightMg(data.summary.totalFineGoldMg || 0)}
              </div>
              <div className="text-xs text-text-muted">24K 999 equivalent weight</div>
            </div>

            <div className="p-4 rounded-xl border border-border bg-surface shadow-2xs space-y-1.5">
              <div className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center justify-between">
                <span>Active Stock Units</span>
                <Package className="w-4 h-4 text-text-muted" />
              </div>
              <div className="text-2xl font-extrabold text-text">
                {data.summary.totalItems} <span className="text-xs font-normal text-text-muted">pieces</span>
              </div>
              <div className="text-xs text-error font-medium">
                {data.summary.deadStockCount} items dead stock (&gt; 1 yr)
              </div>
            </div>
          </div>

          {/* Breakdown Rows */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By Item Class */}
            <div className="p-5 rounded-xl border border-border bg-surface shadow-2xs space-y-4">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                Stock by Classification (ItemClass)
              </h3>
              <div className="space-y-2.5">
                {Object.entries(data.classBreakdown || {}).map(([cls, count]) => (
                  <div key={cls} className="flex items-center justify-between text-sm py-1 border-b border-border/50">
                    <span className="font-medium text-text">{cls.replace('_', ' ')}</span>
                    <span className="font-bold text-primary">{String(count)} units</span>
                  </div>
                ))}
              </div>
            </div>

            {/* By Category */}
            <div className="p-5 rounded-xl border border-border bg-surface shadow-2xs space-y-4">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />
                Stock by Category
              </h3>
              <div className="space-y-2.5">
                {Object.entries(data.categoryBreakdown || {}).map(([cat, count]) => (
                  <div key={cat} className="flex items-center justify-between text-sm py-1 border-b border-border/50">
                    <span className="font-medium text-text">{cat}</span>
                    <span className="font-bold text-primary">{String(count)} units</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
