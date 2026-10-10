'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ShieldCheck, Search, RefreshCw, Filter, Clock, User, ArrowUpDown, ChevronRight } from 'lucide-react';

interface AuditLogEntry {
  id: string;
  timestamp: string;
  module: string;
  recordId: string;
  recordType: string;
  action: string;
  rawAction: string;
  userName: string;
  reason?: string;
  details?: string | null;
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterModule, setFilterModule] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);

  const loadLogs = async () => {
    setLoading(true);
    try {
      let url = `/api/v1/audit-log?limit=150`;
      if (filterModule !== 'All') url += `&module=${encodeURIComponent(filterModule)}`;
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;

      const res = await fetch(url, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.ok && Array.isArray(data.data)) {
          setLogs(data.data);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadLogs();
    }, 250);
    return () => clearTimeout(timer);
  }, [filterModule, searchTerm]);

  const modules = ['All', 'Sales', 'Girvi', 'Repledge', 'Custody', 'Inventory', 'Customers', 'Cashbook', 'Rates'];

  const getActionBadgeColor = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes('created')) return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20';
    if (act.includes('edited') || act.includes('update')) return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
    if (act.includes('settled') || act.includes('redeemed')) return 'bg-purple-500/10 text-purple-700 border-purple-500/20';
    if (act.includes('deleted') || act.includes('void')) return 'bg-rose-500/10 text-rose-700 border-rose-500/20';
    return 'bg-amber-500/10 text-amber-700 border-amber-500/20';
  };

  return (
    <div className="space-y-6 pb-28">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface border border-border p-6 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-primary uppercase">Activity & Audit Log</h1>
            <p className="text-xs text-text-muted">Immutable trace buffer of every transaction and system action</p>
          </div>
        </div>

        <button
          onClick={loadLogs}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-2 hover:bg-border text-xs font-bold text-text border border-border transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Trace
        </button>
      </div>

      {/* Control Filter & Search Bar */}
      <div className="bg-surface p-4 rounded-2xl border border-border space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by action, ID, actor, or details..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-surface-2 border border-border rounded-xl text-xs text-text placeholder-text-muted focus:outline-hidden focus:border-primary"
            />
          </div>
          <span className="text-xs font-semibold text-text-muted shrink-0 text-right">
            {logs.length} logged actions recorded
          </span>
        </div>

        {/* Module Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          <Filter className="w-3.5 h-3.5 text-text-muted shrink-0 mr-1" />
          {modules.map((m) => (
            <button
              key={m}
              onClick={() => setFilterModule(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                filterModule === m
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-surface-2 text-text-muted hover:text-text hover:bg-border'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Log Feed List */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-xs">
        {loading && logs.length === 0 ? (
          <div className="p-12 text-center text-text-muted text-sm">Loading activity logs...</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-text-muted text-sm">No activity logs found for the selected criteria.</div>
        ) : (
          <div className="divide-y divide-border">
            {logs.map((log) => {
              const dt = new Date(log.timestamp);
              const dateStr = dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
              const timeStr = dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

              return (
                <div
                  key={log.id}
                  onClick={() => setSelectedEntry(log)}
                  className="p-4 hover:bg-surface-2/60 transition-colors cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="p-2 rounded-xl bg-surface-2 border border-border shrink-0 mt-0.5">
                      <Clock className="w-4 h-4 text-primary" />
                    </div>
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${getActionBadgeColor(log.action)}`}>
                          {log.action}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-surface-2 text-text-muted border border-border">
                          {log.module}
                        </span>
                        {log.recordId && log.recordId !== '-' && (
                          <span className="text-xs font-mono font-medium text-text-muted">
                            Ref: {log.recordId}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text font-medium truncate">
                        {log.reason || log.action}
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-text-muted">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" /> {log.userName}
                        </span>
                        <span>•</span>
                        <span>{dateStr} at {timeStr}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <span className="text-xs text-primary font-semibold flex items-center gap-1 group">
                      Details <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedEntry && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setSelectedEntry(null)}
        >
          <div
            className="bg-surface border border-border rounded-2xl max-w-lg w-full max-h-[85dvh] overflow-y-auto p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
              <div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${getActionBadgeColor(selectedEntry.action)}`}>
                  {selectedEntry.action}
                </span>
                <h3 className="text-lg font-bold text-text mt-1">{selectedEntry.module} Trace Record</h3>
                <p className="text-xs text-text-muted">Event ID: #{selectedEntry.id}</p>
              </div>
              <button
                onClick={() => setSelectedEntry(null)}
                className="p-1 rounded-lg hover:bg-surface-2 text-text-muted hover:text-text"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 bg-surface-2 rounded-xl">
                <div>
                  <span className="text-text-muted font-semibold block">Actor:</span>
                  <span className="text-text font-bold">{selectedEntry.userName}</span>
                </div>
                <div>
                  <span className="text-text-muted font-semibold block">Timestamp:</span>
                  <span className="text-text font-bold">
                    {new Date(selectedEntry.timestamp).toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-text-muted font-semibold block">Entity Type:</span>
                  <span className="text-text font-mono">{selectedEntry.recordType}</span>
                </div>
                <div>
                  <span className="text-text-muted font-semibold block">Entity ID:</span>
                  <span className="text-text font-mono">{selectedEntry.recordId}</span>
                </div>
              </div>

              {selectedEntry.details && (
                <div>
                  <span className="font-semibold text-text-muted block mb-1">State Payload / Changes:</span>
                  <pre className="p-3 bg-black/80 text-emerald-400 rounded-xl overflow-x-auto text-[11px] font-mono whitespace-pre-wrap max-h-48">
                    {(() => {
                      try {
                        return JSON.stringify(JSON.parse(selectedEntry.details), null, 2);
                      } catch {
                        return selectedEntry.details;
                      }
                    })()}
                  </pre>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedEntry(null)}
                className="px-4 py-2 bg-primary text-white font-bold text-xs rounded-xl shadow-xs"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
