'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  X,
  Users,
  Package,
  FileText,
  ShieldCheck,
  Wallet,
  ArrowRight,
  Loader2,
  Command,
} from 'lucide-react';
import Link from 'next/link';

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  badge?: string | null;
  targetUrl: string;
}

interface SearchData {
  customers: SearchResult[];
  inventory: SearchResult[];
  sales: SearchResult[];
  girvi: SearchResult[];
  cashbook: SearchResult[];
}

type TabKey = 'all' | 'customers' | 'inventory' | 'sales' | 'girvi' | 'cashbook';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'all', label: 'All', icon: <Search className="w-3.5 h-3.5" /> },
  { key: 'customers', label: 'Customers', icon: <Users className="w-3.5 h-3.5" /> },
  { key: 'inventory', label: 'Inventory', icon: <Package className="w-3.5 h-3.5" /> },
  { key: 'sales', label: 'Invoices', icon: <FileText className="w-3.5 h-3.5" /> },
  { key: 'girvi', label: 'Girvi', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
  { key: 'cashbook', label: 'Cashbook', icon: <Wallet className="w-3.5 h-3.5" /> },
];

const ENTITY_ICONS: Record<string, React.ReactNode> = {
  customers: <Users className="w-4 h-4 text-primary" />,
  inventory: <Package className="w-4 h-4 text-emerald-600" />,
  sales: <FileText className="w-4 h-4 text-blue-600" />,
  girvi: <ShieldCheck className="w-4 h-4 text-purple-600" />,
  cashbook: <Wallet className="w-4 h-4 text-amber-600" />,
};

const BADGE_COLORS: Record<string, string> = {
  ACTIVE: 'bg-emerald-500/10 text-emerald-700',
  AVAILABLE: 'bg-emerald-500/10 text-emerald-700',
  SOLD: 'bg-rose-500/10 text-rose-700',
  REDEEMED: 'bg-slate-200 text-slate-600',
  OPEN: 'bg-blue-500/10 text-blue-700',
  VIP: 'bg-amber-500/10 text-amber-700',
  CREDIT: 'bg-red-500/10 text-red-700',
  DEBIT: 'bg-green-500/10 text-green-700',
  CASH: 'bg-amber-500/10 text-amber-700',
  UPI: 'bg-blue-500/10 text-blue-700',
};

interface GlobalSearchModalProps {
  open: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ open, onClose }) => {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [focusedIndex, setFocusedIndex] = useState(-1);

  // Auto-focus on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setResults(null);
      setActiveTab('all');
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/search?q=${encodeURIComponent(query)}`);
        const json = await res.json();
        if (json.ok) setResults(json.data);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => clearTimeout(timer);
  }, [query]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const getFilteredResults = useCallback((): { entity: string; items: SearchResult[] }[] => {
    if (!results) return [];
    const allEntities = ['customers', 'inventory', 'sales', 'girvi', 'cashbook'] as const;
    if (activeTab === 'all') {
      return allEntities
        .map((e) => ({ entity: e, items: (results as any)[e] || [] }))
        .filter((g) => g.items.length > 0);
    }
    const items = (results as any)[activeTab] || [];
    return items.length > 0 ? [{ entity: activeTab, items }] : [];
  }, [results, activeTab]);

  const totalCount = results
    ? Object.values(results).reduce((s, a) => s + a.length, 0)
    : 0;

  if (!open) return null;

  const entityGroups = getFilteredResults();

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[10vh] px-4"
      onClick={onClose}
    >
      <div
        className="bg-surface w-full max-w-2xl rounded-2xl border border-border shadow-2xl overflow-hidden animate-in slide-in-from-top-4 fade-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Row */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          {loading ? (
            <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0" />
          ) : (
            <Search className="w-5 h-5 text-text-muted shrink-0" />
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search customers, invoices, inventory, girvi, cashbook..."
            className="flex-1 bg-transparent text-sm font-medium text-text placeholder-text-muted outline-none py-1"
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1 text-text-muted hover:text-text rounded">
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold bg-surface-2 border border-border rounded text-text-muted">
            ESC
          </kbd>
        </div>

        {/* Tab Filter */}
        {results && (
          <div className="flex gap-1 px-3 py-2 border-b border-border bg-surface-2 overflow-x-auto no-scrollbar">
            {TABS.map((tab) => {
              const count = tab.key === 'all' ? totalCount : ((results as any)[tab.key] || []).length;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
                    activeTab === tab.key
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-text-muted hover:text-text hover:bg-border'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                  {count > 0 && (
                    <span className={`text-[10px] font-black px-1.5 rounded-full ${activeTab === tab.key ? 'bg-white/20' : 'bg-border'}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {!query && (
            <div className="py-12 text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Search className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm font-semibold text-text">Search everything</p>
              <p className="text-xs text-text-muted mt-1">Type customer name, phone, invoice #, tag no, SKU...</p>
              <div className="flex items-center justify-center gap-2 mt-4 text-xs text-text-muted">
                <kbd className="px-2 py-0.5 bg-surface-2 border border-border rounded font-bold"><Command className="w-3 h-3 inline" />K</kbd>
                <span>to open</span>
                <kbd className="px-2 py-0.5 bg-surface-2 border border-border rounded font-bold">ESC</kbd>
                <span>to close</span>
              </div>
            </div>
          )}

          {query && query.length < 2 && (
            <div className="py-8 text-center text-xs text-text-muted">Type at least 2 characters...</div>
          )}

          {results && totalCount === 0 && (
            <div className="py-12 text-center">
              <p className="text-sm font-semibold text-text">No results for "{query}"</p>
              <p className="text-xs text-text-muted mt-1">Try a different name, phone number, or code</p>
              <Link
                href={`/search?q=${encodeURIComponent(query)}`}
                onClick={onClose}
                className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg"
              >
                Full Search Page <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {entityGroups.map(({ entity, items }) => (
            <div key={entity} className="px-3 py-2">
              <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
                {ENTITY_ICONS[entity]}
                <span className="text-[10px] font-black text-text-muted uppercase tracking-wider">
                  {entity} ({items.length})
                </span>
              </div>
              <div className="space-y-0.5">
                {items.map((item) => (
                  <Link
                    key={item.id}
                    href={item.targetUrl}
                    onClick={onClose}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-2 transition-colors group"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text truncate">{item.title}</p>
                      <p className="text-xs text-text-muted truncate mt-0.5">{item.subtitle}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.badge && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${BADGE_COLORS[item.badge] || 'bg-surface-2 text-text-muted'}`}>
                          {item.badge}
                        </span>
                      )}
                      <ArrowRight className="w-3.5 h-3.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}

          {results && totalCount > 0 && (
            <div className="px-4 py-3 border-t border-border bg-surface-2">
              <Link
                href={`/search?q=${encodeURIComponent(query)}`}
                onClick={onClose}
                className="flex items-center justify-center gap-2 text-xs font-bold text-primary hover:underline"
              >
                View all {totalCount} results on full search page <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
