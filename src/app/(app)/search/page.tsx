'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Search,
  Users,
  Package,
  FileText,
  ShieldCheck,
  Wallet,
  ArrowRight,
  Loader2,
  X,
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

const TABS: { key: TabKey; label: string; icon: React.ReactNode; color: string }[] = [
  { key: 'all', label: 'All Results', icon: <Search className="w-4 h-4" />, color: 'text-primary' },
  { key: 'customers', label: 'Customers', icon: <Users className="w-4 h-4" />, color: 'text-primary' },
  { key: 'inventory', label: 'Inventory', icon: <Package className="w-4 h-4" />, color: 'text-emerald-600' },
  { key: 'sales', label: 'Invoices', icon: <FileText className="w-4 h-4" />, color: 'text-blue-600' },
  { key: 'girvi', label: 'Girvi Pledges', icon: <ShieldCheck className="w-4 h-4" />, color: 'text-purple-600' },
  { key: 'cashbook', label: 'Cashbook', icon: <Wallet className="w-4 h-4" />, color: 'text-amber-600' },
];

const BADGE_COLORS: Record<string, string> = {
  ACTIVE: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  AVAILABLE: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  SOLD: 'bg-rose-500/10 text-rose-700 border-rose-200',
  REDEEMED: 'bg-slate-200 text-slate-600 border-slate-300',
  OPEN: 'bg-blue-500/10 text-blue-700 border-blue-200',
  VIP: 'bg-amber-500/10 text-amber-700 border-amber-200',
  CREDIT: 'bg-red-500/10 text-red-700 border-red-200',
  DEBIT: 'bg-green-500/10 text-green-700 border-green-200',
  CASH: 'bg-amber-500/10 text-amber-700 border-amber-200',
  UPI: 'bg-blue-500/10 text-blue-700 border-blue-200',
};

const ENTITY_META: Record<string, { icon: React.ReactNode; heading: string; emptyMsg: string }> = {
  customers: {
    icon: <Users className="w-5 h-5 text-primary" />,
    heading: 'Customer Profiles',
    emptyMsg: 'No matching customers',
  },
  inventory: {
    icon: <Package className="w-5 h-5 text-emerald-600" />,
    heading: 'Inventory Items',
    emptyMsg: 'No matching inventory items',
  },
  sales: {
    icon: <FileText className="w-5 h-5 text-blue-600" />,
    heading: 'Sales Invoices',
    emptyMsg: 'No matching invoices',
  },
  girvi: {
    icon: <ShieldCheck className="w-5 h-5 text-purple-600" />,
    heading: 'Girvi Pledges',
    emptyMsg: 'No matching girvi records',
  },
  cashbook: {
    icon: <Wallet className="w-5 h-5 text-amber-600" />,
    heading: 'Cashbook Entries',
    emptyMsg: 'No matching cash transactions',
  },
};

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get('q') || '';
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState(urlQuery);
  const [committed, setCommitted] = useState(urlQuery);
  const [results, setResults] = useState<SearchData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('all');

  // Push query param on commit
  const handleSearch = (q: string) => {
    setCommitted(q);
    router.replace(`/search?q=${encodeURIComponent(q)}`, { scroll: false });
  };

  // Fetch on committed query
  useEffect(() => {
    if (!committed || committed.length < 2) {
      setResults(null);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    fetch(`/api/v1/search?q=${encodeURIComponent(committed)}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((json) => { if (json.ok) setResults(json.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [committed]);

  // Sync URL → state on mount
  useEffect(() => {
    if (urlQuery) {
      setQuery(urlQuery);
      setCommitted(urlQuery);
    }
    inputRef.current?.focus();
  }, [urlQuery]);

  // Cmd+K
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const tabCounts: Record<TabKey, number> = {
    all: results ? Object.values(results).reduce((s, a) => s + a.length, 0) : 0,
    customers: results?.customers.length ?? 0,
    inventory: results?.inventory.length ?? 0,
    sales: results?.sales.length ?? 0,
    girvi: results?.girvi.length ?? 0,
    cashbook: results?.cashbook.length ?? 0,
  };

  const getVisible = (): { entity: string; items: SearchResult[] }[] => {
    if (!results) return [];
    const all = ['customers', 'inventory', 'sales', 'girvi', 'cashbook'] as const;
    if (activeTab === 'all') {
      return all.map((e) => ({ entity: e, items: results[e] })).filter((g) => g.items.length > 0);
    }
    const items = results[activeTab] || [];
    return [{ entity: activeTab, items }];
  };

  const visible = getVisible();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Search className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-text">Universal Search</h1>
            <p className="text-xs text-text-muted mt-0.5">
              Customers · Inventory · Invoices · Girvi · Cashbook
            </p>
          </div>
          <div className="ml-auto hidden sm:flex items-center gap-1 text-xs text-text-muted">
            <kbd className="px-2 py-0.5 bg-surface-2 border border-border rounded font-bold">
              <Command className="w-3 h-3 inline mr-0.5" />K
            </kbd>
            <span>to focus</span>
          </div>
        </div>

        {/* Large Search Input */}
        <div className="relative">
          {loading ? (
            <Loader2 className="w-5 h-5 text-primary absolute left-4 top-3.5 animate-spin pointer-events-none" />
          ) : (
            <Search className="w-5 h-5 text-text-muted absolute left-4 top-3.5 pointer-events-none" />
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch(query)}
            placeholder="Customer name · Hindi name (रमेश) · Phone · Invoice # · Tag No · SKU..."
            autoFocus
            className="w-full pl-12 pr-12 py-3.5 text-sm rounded-xl border-2 border-border bg-surface-2/50 text-text placeholder-text-muted outline-none focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/10 font-medium transition-all"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setCommitted(''); setResults(null); router.replace('/search'); }}
              className="absolute right-4 top-3.5 p-0.5 text-text-muted hover:text-text"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {query && query !== committed && (
          <button
            onClick={() => handleSearch(query)}
            className="mt-2 text-xs text-primary font-bold hover:underline"
          >
            Press Enter to search for "{query}"
          </button>
        )}
      </div>

      {/* Tabs (only show when we have results) */}
      {results && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="flex overflow-x-auto no-scrollbar border-b border-border">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold whitespace-nowrap transition-all border-b-2 ${
                  activeTab === tab.key
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-text-muted hover:text-text hover:bg-surface-2'
                }`}
              >
                {tab.icon}
                {tab.label}
                {tabCounts[tab.key] > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                    activeTab === tab.key ? 'bg-primary text-white' : 'bg-border text-text-muted'
                  }`}>
                    {tabCounts[tab.key]}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Results body */}
          <div className="divide-y divide-border">
            {visible.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm font-semibold text-text">No results for "{committed}"</p>
                <p className="text-xs text-text-muted mt-1">
                  {activeTab === 'all'
                    ? 'Try a different search term'
                    : `No ${ENTITY_META[activeTab]?.heading.toLowerCase()} match this search`}
                </p>
              </div>
            ) : (
              visible.map(({ entity, items }) => {
                const meta = ENTITY_META[entity];
                return (
                  <div key={entity}>
                    {activeTab === 'all' && (
                      <div className="flex items-center gap-2 px-5 py-3 bg-surface-2">
                        {meta?.icon}
                        <span className="text-xs font-black text-text uppercase tracking-wider">
                          {meta?.heading} ({items.length})
                        </span>
                      </div>
                    )}
                    <div className="divide-y divide-border/50">
                      {items.map((item) => (
                        <Link
                          key={item.id}
                          href={item.targetUrl}
                          className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-surface-2 transition-colors group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center shrink-0">
                              {meta?.icon}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-text truncate">{item.title}</p>
                              <p className="text-xs text-text-muted truncate mt-0.5">{item.subtitle}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {item.badge && (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${BADGE_COLORS[item.badge] || 'bg-surface-2 text-text-muted border-border'}`}>
                                {item.badge}
                              </span>
                            )}
                            <ArrowRight className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="px-5 py-3 bg-surface-2 border-t border-border text-xs text-text-muted">
            Showing results for <strong className="text-text">"{committed}"</strong>
            {' · '}{tabCounts.all} total matches
          </div>
        </div>
      )}

      {/* Empty / Prompt State */}
      {!committed && !loading && (
        <div className="bg-surface border border-border rounded-2xl p-10 text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-base font-bold text-text">Search the entire shop</h2>
          <p className="text-sm text-text-muted mt-2 max-w-sm mx-auto leading-relaxed">
            Find customers by name or phone · locate inventory by tag/SKU · look up invoices, girvi loans, or cash transactions
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6 max-w-lg mx-auto">
            {['रमेश शर्मा', '9876543210', 'NJ-GOLD-1001', 'INV-2026-0042', 'GRV-0012', 'CASH-TXN'].map((hint) => (
              <button
                key={hint}
                onClick={() => { setQuery(hint); handleSearch(hint); }}
                className="px-3 py-2 rounded-lg bg-surface-2 border border-border text-xs font-medium text-text-muted hover:text-text hover:border-primary/30 transition-all text-left truncate"
              >
                {hint}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function GlobalSearchPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
