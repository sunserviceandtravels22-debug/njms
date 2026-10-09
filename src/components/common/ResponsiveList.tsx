'use client';

import React from 'react';

export interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (item: T) => React.ReactNode;
  className?: string;
}

interface ResponsiveListProps<T> {
  items: T[];
  keyExtractor: (item: T) => string;
  columns: Column<T>[];
  renderMobileCard: (item: T) => React.ReactNode;
  emptyState?: React.ReactNode;
  loading?: boolean;
}

export function ResponsiveList<T>({
  items,
  keyExtractor,
  columns,
  renderMobileCard,
  emptyState,
  loading = false,
}: ResponsiveListProps<T>) {
  if (loading) {
    return (
      <div className="p-8 text-center text-amber-900/60 text-sm font-medium animate-pulse">
        Loading records...
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      emptyState || (
        <div className="p-8 text-center text-stone-500 text-sm bg-white rounded-xl border border-stone-200">
          No records found.
        </div>
      )
    );
  }

  return (
    <div>
      {/* Mobile Card View (< 768px) */}
      <div className="block md:hidden space-y-3">
        {items.map((item) => (
          <div key={keyExtractor(item)} className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm">
            {renderMobileCard(item)}
          </div>
        ))}
      </div>

      {/* Desktop Table View (>= 768px) */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-amber-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-amber-100/60 text-amber-950 font-semibold border-b border-amber-200">
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} className={`px-4 py-3.5 ${col.className || ''}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-amber-100 text-stone-800">
            {items.map((item) => (
              <tr key={keyExtractor(item)} className="hover:bg-amber-50/50 transition">
                {columns.map((col, idx) => (
                  <td key={idx} className={`px-4 py-3.5 ${col.className || ''}`}>
                    {col.cell
                      ? col.cell(item)
                      : col.accessorKey
                      ? (item[col.accessorKey] as React.ReactNode)
                      : null}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
