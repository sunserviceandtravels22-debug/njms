'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, AlertCircle, ChevronRight, X } from 'lucide-react';

export interface AlertSummary {
  id: string;
  ruleCode: string;
  severity: string;
  rule?: { module: string };
  entityType: string;
  entityId: string;
  note?: string;
}

export const AlertStrip: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertSummary[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/api/v1/alerts?status=OPEN&limit=10')
      .then((res) => res.json())
      .then((json) => {
        if (json.ok && Array.isArray(json.data)) {
          const highPri = json.data
            .filter((a: any) => a.severity === 'CRITICAL' || a.severity === 'WARN')
            .slice(0, 3);
          setAlerts(highPri);
        }
      })
      .catch(() => {});
  }, []);

  const visibleAlerts = alerts.filter((a) => !dismissedIds.has(a.id));

  if (visibleAlerts.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {visibleAlerts.map((alert) => {
        const isCrit = alert.severity === 'CRITICAL';
        return (
          <div
            key={alert.id}
            className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg border text-sm transition-all shadow-xs ${
              isCrit
                ? 'bg-error/10 border-error/30 text-error'
                : 'bg-warning/10 border-warning/30 text-warning-foreground'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {isCrit ? (
                <AlertCircle className="w-4 h-4 shrink-0 text-error animate-pulse" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-warning" />
              )}
              <div className="truncate">
                <span className="font-semibold mr-1.5">[{alert.rule?.module || 'SYSTEM'}] {alert.ruleCode}:</span>
                <span className="text-xs opacity-90">{alert.entityType} #{alert.entityId}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/alerts"
                className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded bg-surface hover:bg-surface-2 border border-border transition-colors text-text"
              >
                View
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
              <button
                onClick={() => setDismissedIds((prev) => new Set([...prev, alert.id]))}
                className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 opacity-70 hover:opacity-100"
                aria-label="Dismiss alert from strip"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
