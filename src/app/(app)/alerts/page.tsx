'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Clock,
  Filter,
  RefreshCw,
  Bell,
} from 'lucide-react';

interface AlertItem {
  id: string;
  ruleId: string;
  rule: {
    code: string;
    module: string;
    kind: string;
  };
  entityType: string;
  entityId: string;
  severity: 'INFO' | 'WARN' | 'CRITICAL';
  status: 'OPEN' | 'ACK' | 'SNOOZED' | 'RESOLVED';
  occurrences: number;
  firstRaisedAt: string;
  lastSeenAt: string;
  snoozeUntil: string | null;
  note: string | null;
  payloadJson: any;
}

export default function AlertsPage() {
  const [tab, setTab] = useState<'OPEN' | 'SNOOZED' | 'RESOLVED'>('OPEN');
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [moduleFilter, setModuleFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/alerts?status=${tab}`, { credentials: 'include' });
      const json = await res.json();
      if (json.ok) {
        setAlerts(json.data || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const syncAlerts = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/v1/alerts/sync', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok) {
        setSyncResult(data.message || 'Sync complete');
        fetchAlerts();
      } else {
        setSyncResult(`Sync failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      setSyncResult(`Sync error: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [tab]);

  const handleAck = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/v1/alerts/${id}/ack`, { method: 'POST' });
      if (res.ok) fetchAlerts();
    } finally {
      setActionLoading(null);
    }
  };

  const handleSnooze = async (id: string, hours: number) => {
    setActionLoading(id);
    try {
      const until = new Date(Date.now() + hours * 3600 * 1000).toISOString();
      const res = await fetch(`/api/v1/alerts/${id}/snooze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ until }),
      });
      if (res.ok) fetchAlerts();
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolve = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/v1/alerts/${id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Resolved via dashboard' }),
      });
      if (res.ok) fetchAlerts();
    } finally {
      setActionLoading(null);
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    if (moduleFilter !== 'ALL' && a.rule.module !== moduleFilter) return false;
    if (severityFilter !== 'ALL' && a.severity !== severityFilter) return false;
    return true;
  });

  const modules = Array.from(new Set(alerts.map((a) => a.rule.module)));

  return (
    <div className="space-y-6 pb-28">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5">
            <Bell className="w-6 h-6 text-primary" />
            Alerts & Control Exceptions
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Real-time shop alerts, variance checks, and operational exceptions (D12-ALT)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchAlerts}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-2 text-sm font-medium transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={syncAlerts}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing…' : 'Sync Alerts'}
          </button>
        </div>
      </div>

      {syncResult && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-xs font-medium flex items-center justify-between">
          <span>{syncResult}</span>
          <button onClick={() => setSyncResult(null)} className="ml-3 underline opacity-70 hover:opacity-100 text-xs">dismiss</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border space-x-6 text-sm font-medium">
        {(['OPEN', 'SNOOZED', 'RESOLVED'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-3 relative transition-colors ${
              tab === t ? 'text-primary font-bold' : 'text-text-muted hover:text-text'
            }`}
          >
            {t === 'OPEN' ? 'Open Alerts' : t === 'SNOOZED' ? 'Snoozed' : 'Resolved'}
            {tab === t && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </div>


      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <Filter className="w-4 h-4" />
          <span>Filters:</span>
        </div>
        <select
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
          className="text-xs px-2.5 py-1.5 rounded-md border border-border bg-surface text-text"
        >
          <option value="ALL">All Modules</option>
          {modules.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="text-xs px-2.5 py-1.5 rounded-md border border-border bg-surface text-text"
        >
          <option value="ALL">All Severities</option>
          <option value="CRITICAL">CRITICAL</option>
          <option value="WARN">WARN</option>
          <option value="INFO">INFO</option>
        </select>
      </div>

      {/* Alert List */}
      {loading ? (
        <div className="text-center py-12 text-text-muted">Loading alerts...</div>
      ) : filteredAlerts.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-xl bg-surface/50">
          <CheckCircle2 className="w-10 h-10 text-success mx-auto mb-2 opacity-80" />
          <h3 className="font-semibold text-text">No {tab.toLowerCase()} alerts</h3>
          <p className="text-xs text-text-muted mt-1">All operational invariants are clear.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((alert) => {
            const isCrit = alert.severity === 'CRITICAL';
            const isWarn = alert.severity === 'WARN';

            return (
              <div
                key={alert.id}
                className="p-4 rounded-xl border border-border bg-surface hover:border-primary/40 transition-colors shadow-2xs space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    {isCrit ? (
                      <AlertCircle className="w-5 h-5 text-error shrink-0 animate-pulse" />
                    ) : isWarn ? (
                      <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
                    ) : (
                      <Info className="w-5 h-5 text-info shrink-0" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-text">{alert.rule.code}</span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            isCrit
                              ? 'bg-error/15 text-error'
                              : isWarn
                              ? 'bg-warning/15 text-warning-foreground'
                              : 'bg-info/15 text-info'
                          }`}
                        >
                          {alert.severity}
                        </span>
                        <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-surface-2 text-text-muted">
                          {alert.rule.module}
                        </span>
                      </div>
                      <p className="text-xs text-text-muted mt-0.5">
                        Target: {alert.entityType} #{alert.entityId} · Occurrences: {alert.occurrences}
                      </p>
                    </div>
                  </div>

                  <div className="text-xs text-text-muted flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Last: {new Date(alert.lastSeenAt).toLocaleString()}</span>
                  </div>
                </div>

                {alert.payloadJson && (
                  <pre className="text-[11px] p-2 bg-surface-2 rounded-md font-mono text-text-muted overflow-x-auto">
                    {JSON.stringify(alert.payloadJson, null, 2)}
                  </pre>
                )}

                {/* Actions */}
                {tab === 'OPEN' && (
                  <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border/50">
                    <button
                      disabled={actionLoading === alert.id}
                      onClick={() => handleAck(alert.id)}
                      className="px-2.5 py-1 text-xs font-semibold rounded bg-surface-2 hover:bg-surface border border-border transition-colors text-text"
                    >
                      Acknowledge
                    </button>
                    <button
                      disabled={actionLoading === alert.id}
                      onClick={() => handleSnooze(alert.id, 4)}
                      className="px-2.5 py-1 text-xs font-semibold rounded bg-surface-2 hover:bg-surface border border-border transition-colors text-text"
                    >
                      Snooze 4h
                    </button>
                    <button
                      disabled={actionLoading === alert.id}
                      onClick={() => handleResolve(alert.id)}
                      className="px-3 py-1 text-xs font-bold rounded bg-primary text-white hover:bg-primary/90 transition-colors shadow-2xs"
                    >
                      Resolve
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
