'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileText,
  Plus,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { formatWeightMg } from '@/domain/weight';

interface MemoInRow {
  id: string;
  shopMemoNo: string;
  wholesalerVendorId: string;
  wholesalerMemoNo?: string;
  receivedOn: string;
  returnByDate: string;
  status: string;
  lines: Array<{
    id: string;
    category: string;
    netMg: number;
    touchPpt: number;
    status: string;
  }>;
}

export default function MemoInListPage() {
  const [memos, setMemos] = useState<MemoInRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/memo-in')
      .then((res) => res.json())
      .then((json) => {
        if (json.ok) setMemos(json.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const getReturnStatus = (returnByDate: string) => {
    const diffDays = Math.ceil(
      (new Date(returnByDate).getTime() - Date.now()) / (1000 * 3600 * 24)
    );
    if (diffDays < 0) {
      return { text: `Overdue by ${Math.abs(diffDays)}d`, color: 'bg-error/15 text-error border-error/30' };
    }
    if (diffDays <= 3) {
      return { text: `Due in ${diffDays}d`, color: 'bg-warning/15 text-warning-foreground border-warning/30' };
    }
    return { text: `Due in ${diffDays}d`, color: 'bg-success/15 text-success border-success/30' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-primary" />
            Wholesaler Approval Stock (Memo-In)
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Track inward consignments, touch schedules, approvals, and sales conversions (Doc 13 / S-250)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/settlement-queue"
            className="px-3.5 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-2 text-sm font-semibold transition-colors"
          >
            Settlement Queue
          </Link>
          <Link
            href="/memo-in/receive"
            className="px-3.5 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 text-sm font-bold shadow-2xs transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Receive Inward Memo
          </Link>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-12 text-text-muted">Loading memo-in consignments...</div>
      ) : memos.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-xl bg-surface/50">
          <FileText className="w-10 h-10 text-text-muted mx-auto mb-2 opacity-50" />
          <h3 className="font-semibold text-text">No active memo-in consignments</h3>
          <p className="text-xs text-text-muted mt-1">
            Receive jewellery from wholesalers on approval to start tracking.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {memos.map((memo) => {
            const returnPill = getReturnStatus(memo.returnByDate);
            const totalNetMg = memo.lines.reduce((acc, l) => acc + l.netMg, 0);

            return (
              <div
                key={memo.id}
                className="p-4 rounded-xl border border-border bg-surface hover:border-primary/40 transition-colors shadow-2xs space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                      {memo.lines.length}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base text-text">{memo.shopMemoNo}</span>
                        {memo.wholesalerMemoNo && (
                          <span className="text-xs text-text-muted">
                            (Vendor Memo: {memo.wholesalerMemoNo})
                          </span>
                        )}
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-bold border ${returnPill.color}`}
                        >
                          {returnPill.text}
                        </span>
                      </div>
                      <p className="text-xs text-text-muted mt-0.5">
                        Received: {new Date(memo.receivedOn).toLocaleDateString()} · Total Net:{' '}
                        {formatWeightMg(totalNetMg)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-md font-semibold ${
                        memo.status === 'OPEN'
                          ? 'bg-primary/10 text-primary'
                          : 'bg-surface-2 text-text-muted'
                      }`}
                    >
                      {memo.status}
                    </span>
                  </div>
                </div>

                {/* Lines summary */}
                <div className="pt-2 border-t border-border/50 flex flex-wrap gap-2 text-xs">
                  {memo.lines.slice(0, 4).map((line) => (
                    <span
                      key={line.id}
                      className="px-2 py-1 rounded bg-surface-2 text-text border border-border flex items-center gap-1.5"
                    >
                      <span>{line.category}</span>
                      <span className="text-text-muted">({formatWeightMg(line.netMg)})</span>
                      <span className="text-[10px] text-primary font-bold">
                        Touch {(line.touchPpt / 10).toFixed(1)}%
                      </span>
                    </span>
                  ))}
                  {memo.lines.length > 4 && (
                    <span className="px-2 py-1 rounded bg-surface-2 text-text-muted text-xs">
                      +{memo.lines.length - 4} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
