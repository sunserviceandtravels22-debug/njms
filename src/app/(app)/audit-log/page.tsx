'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ShieldCheck, Trash2, RefreshCw, Filter } from 'lucide-react';

interface AuditLogEntry {
  id: string;
  timestamp: string;
  module: string;
  recordId: string;
  recordType: string;
  action: 'Created' | 'Edited' | 'Voided' | 'Deleted';
  userName: string;
  reason?: string;
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [filterModule, setFilterModule] = useState('All');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const loadLogs = async () => {
    try {
      const res = await fetch('/api/v1/audit-log');
      if (res.ok) {
        const data = await res.json();
        if (data.ok && Array.isArray(data.data)) {
          setLogs(data.data);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => filterModule === 'All' || log.module === filterModule);
  }, [logs, filterModule]);

  const handleDelete = async (id?: string) => {
    if (!confirm('Purge log trace records?')) return;

    try {
      const url = id ? `/api/v1/audit-log?id=${id}` : '/api/v1/audit-log';
      const res = await fetch(url, { method: 'DELETE' });
      if (res.ok) {
        loadLogs();
        setSelectedIds(new Set());
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface border border-border p-6 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-primary uppercase">Security & Audit Trace Log</h1>
            <p className="text-xs text-text-muted">Real-time Operational Vector Trace Buffer</p>
          </div>
        </div>

        <button
          onClick={() => handleDelete()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-xs font-bold text-rose-600 border border-rose-500/20 transition-all"
        >
          <Trash2 className="w-4 h-4" /> Purge All Traces
        </button>
      </div>

      {/* Control Filter Bar */}
      <div className="bg-surface p-4 rounded-2xl border border-border flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Filter className="w-4 h-4 text-text-muted my-auto mr-1" />
          {['All', 'Inventory', 'Sales', 'Purchase', 'SKU'].map((m) => (
            <button
              key={m}
              onClick={() => setFilterModule(m)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                filterModule === m
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-surface-2 text-text-muted hover:text-text hover:bg-border'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <span className="text-xs font-semibold text-text-muted">{filteredLogs.length} Events in Trace Buffer</span>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-2xl border border-border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead className="bg-surface-2 border-b border-border text-xs font-bold text-text-muted uppercase">
              <tr>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Vector Module</th>
                <th className="px-6 py-4 text-center">Action</th>
                <th className="px-6 py-4">Trace Reason / Record ID</th>
                <th className="px-6 py-4 text-center">Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-surface-2 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-bold text-text block">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    <span className="text-xs text-text-muted">{new Date(log.timestamp).toLocaleDateString()}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 bg-surface-2 border border-border rounded-lg text-xs font-semibold text-text">
                      {log.module}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        log.action === 'Deleted'
                          ? 'bg-rose-500/10 text-rose-600'
                          : log.action === 'Created'
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : 'bg-amber-500/10 text-amber-600'
                      }`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-text-muted font-mono">{log.reason || log.recordId}</td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleDelete(log.id)}
                      className="p-1.5 text-text-muted hover:text-rose-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
