'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, UserPlus, Check, X, Image as ImageIcon, Phone } from 'lucide-react';
import { CandidateCustomer } from './DuplicateWarningSheet';

interface CustomerPickerProps {
  selectedCustomer?: CandidateCustomer | null;
  onSelect: (customer: CandidateCustomer | null) => void;
  onOpenQuickAdd?: () => void;
  label?: string;
  placeholder?: string;
  error?: string;
}

export function CustomerPicker({
  selectedCustomer,
  onSelect,
  onOpenQuickAdd,
  label = 'Select Customer',
  placeholder = 'Search by name, Hindi name, or phone...',
  error,
}: CustomerPickerProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CandidateCustomer[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/customers?search=${encodeURIComponent(query)}&limit=8`);
        const json = await res.json();
        if (json.ok) {
          setResults(json.data);
        }
      } catch (err) {
        console.error('Customer picker search error:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div ref={containerRef} className="w-full relative">
      {label && <label className="block text-sm font-medium text-amber-900 mb-1">{label}</label>}

      {selectedCustomer ? (
        <div className="flex items-center justify-between p-2.5 rounded-xl border border-amber-300 bg-amber-50/60 shadow-sm min-h-[52px]">
          <div className="flex items-center gap-3 overflow-hidden">
            {/* 44px WebP Avatar Thumbnail */}
            <div className="w-11 h-11 rounded-lg overflow-hidden bg-amber-100 border border-amber-300 shrink-0 flex items-center justify-center">
              {selectedCustomer.photoUrl ? (
                <img
                  src={selectedCustomer.photoUrl}
                  alt={selectedCustomer.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <ImageIcon className="w-5 h-5 text-amber-500" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-amber-950 text-sm truncate">{selectedCustomer.name}</h4>
                {selectedCustomer.tag && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-amber-200 text-amber-900">
                    {selectedCustomer.tag}
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-600 font-medium">📞 +91 {selectedCustomer.phone}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onSelect(null)}
            className="p-2 text-stone-400 hover:text-stone-700 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              placeholder={placeholder}
              className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-amber-200 bg-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 min-h-[44px]"
            />
            {onOpenQuickAdd && (
              <button
                type="button"
                onClick={onOpenQuickAdd}
                title="Quick Add Customer"
                className="absolute right-2 px-2 py-1 text-xs font-semibold rounded-lg bg-amber-700 text-white hover:bg-amber-800 flex items-center gap-1 min-h-[36px]"
              >
                <UserPlus className="w-3.5 h-3.5" /> + Add
              </button>
            )}
          </div>

          {/* Dropdown Options */}
          {open && (query.length >= 2 || results.length > 0) && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-amber-200 rounded-xl shadow-xl z-40 overflow-hidden max-h-72 overflow-y-auto divide-y divide-amber-100">
              {loading ? (
                <div className="p-4 text-center text-xs text-stone-500">Searching customers...</div>
              ) : results.length > 0 ? (
                results.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      onSelect(c);
                      setOpen(false);
                    }}
                    className="w-full p-3 text-left hover:bg-amber-50 flex items-center gap-3 transition min-h-[48px]"
                  >
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-amber-100 border border-amber-200 shrink-0 flex items-center justify-center">
                      {c.photoUrl ? (
                        <img src={c.photoUrl} alt={c.name} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-amber-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-950 text-sm truncate">{c.name}</span>
                        {c.nameHindi && (
                          <span className="text-xs text-amber-700 font-medium">{c.nameHindi}</span>
                        )}
                      </div>
                      <p className="text-xs text-stone-500">
                        📞 {c.phone} {c.relationName ? `• ${c.relationType || 'Rel'}: ${c.relationName}` : ''}
                      </p>
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-4 text-center space-y-2">
                  <p className="text-xs text-stone-500">No matching customer found.</p>
                  {onOpenQuickAdd && (
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        onOpenQuickAdd();
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-amber-700 text-white hover:bg-amber-800 min-h-[44px]"
                    >
                      <UserPlus className="w-4 h-4" /> Create "{query}" as New Customer
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
