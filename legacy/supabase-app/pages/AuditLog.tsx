
import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { formatDate } from '../utils/formatters';

export const AuditLog: React.FC = () => {
  const { auditLog, deleteAuditEntry, bulkDeleteAuditEntries } = useInventory();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterModule, setFilterModule] = useState('All');

  const filteredLogs = useMemo(() => {
    return auditLog.filter(log => filterModule === 'All' || log.module === filterModule);
  }, [auditLog, filterModule]);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkDelete = async () => {
    if (confirm(`Authorize permanent purge of ${selectedIds.size} trace entries?`)) {
      await bulkDeleteAuditEntries(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  return (
    <div className="space-y-8 pb-20 px-4 md:px-0">
      <div className="bg-indigo-950 p-10 rounded-[3rem] border-b-8 border-indigo-600 shadow-2xl text-white">
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-indigo-400 mb-2">Security & Operational Trace</p>
        <h4 className="text-5xl font-black tracking-tighter">{filteredLogs.length} <span className="text-[15px] opacity-30">Active Events In Buffer</span></h4>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center bg-slate-900 p-6 rounded-[2rem] shadow-xl border-b-4 border-indigo-500 gap-4">
        <div className="flex flex-wrap gap-2">
          {['All', 'Inventory', 'Sales', 'Purchase', 'SKU'].map(m => (
            <button key={m} onClick={() => setFilterModule(m)} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${filterModule === m ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>{m}</button>
          ))}
        </div>
        {selectedIds.size > 0 && (
          <button onClick={handleBulkDelete} className="bg-rose-600 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase shadow-xl animate-pulse">Purge Selected Traces ({selectedIds.size})</button>
        )}
      </div>

      <div className="bg-white rounded-[2.5rem] border-4 border-slate-200 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[1000px]">
            <thead className="bg-indigo-950 text-white border-b-8 border-indigo-600">
              <tr>
                <th className="px-8 py-7 w-12 text-center">
                  <input type="checkbox" className="w-5 h-5 accent-indigo-500 rounded" onChange={() => setSelectedIds(selectedIds.size === filteredLogs.length ? new Set() : new Set(filteredLogs.map(i => i.id)))} checked={selectedIds.size === filteredLogs.length && filteredLogs.length > 0} />
                </th>
                <th className="px-8 py-7 text-[12px] uppercase font-black tracking-[0.2em] text-indigo-300">Timestamp</th>
                <th className="px-8 py-7 text-[12px] uppercase font-black tracking-[0.2em]">Operational Vector</th>
                <th className="px-8 py-7 text-[12px] uppercase font-black tracking-[0.2em] text-center">Protocol Action</th>
                <th className="px-8 py-7 text-[12px] uppercase font-black tracking-[0.2em]">Trace Reason</th>
                <th className="px-8 py-7 text-center">Control</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-100">
              {filteredLogs.map((log, idx) => (
                <tr key={log.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-indigo-50 transition-colors`}>
                  <td className="px-8 py-7 text-center">
                    <input type="checkbox" className="w-5 h-5 accent-indigo-500 rounded" checked={selectedIds.has(log.id)} onChange={() => toggleSelect(log.id)} />
                  </td>
                  <td className="px-8 py-7">
                    <div className="flex flex-col leading-none">
                      <span className="text-sm font-black text-slate-950">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      <span className="text-[9px] font-black text-slate-400 uppercase mt-1">{formatDate(log.timestamp)}</span>
                    </div>
                  </td>
                  <td className="px-8 py-7"><span className="px-3 py-1.5 bg-slate-100 text-[10px] font-black uppercase text-slate-800 rounded-lg border border-slate-200">{log.module}</span></td>
                  <td className="px-8 py-7 text-center">
                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                      log.action === 'Deleted' ? 'bg-rose-100 text-rose-800' : 
                      log.action === 'Created' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>{log.action}</span>
                  </td>
                  <td className="px-8 py-7"><p className="text-[10px] font-black text-slate-600 uppercase tracking-tight truncate max-w-xs">{log.reason || log.recordId}</p></td>
                  <td className="px-8 py-7 text-center">
                    <button onClick={() => confirm("Purge log trace?") && deleteAuditEntry(log.id)} className="text-slate-200 hover:text-rose-600 transition-colors text-xl">🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
