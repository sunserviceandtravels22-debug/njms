// Implements: FR-PLT-01 | Component: C-01 | Doc: 02_DESIGN §3, §5

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { GlobalSearchModal } from '../search/GlobalSearchModal';
import { BullionRateTickerModal } from './BullionRateTickerModal';
import { QuickActionMenu } from './QuickActionMenu';
import {
  Home,
  ShoppingBag,
  Users,
  ShieldCheck,
  MoreHorizontal,
  Search,
  Settings,
  FileText,
  Package,
  Barcode,
  CreditCard,
  LogOut,
  Globe,
  Wallet,
  Building2,
  Warehouse,
  Receipt,
  Coins,
  ScrollText,
  Clock,
  Layers,
  Bell,
} from 'lucide-react';
import { SaveIndicator } from '../ui/SaveIndicator';
import { AlertBell } from '../AlertBell';

interface AppShellProps {
  userRole?: string;
  userName?: string;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  userRole = 'OWNER',
  userName = 'Owner User',
  children,
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' });
    } finally {
      router.push('/login');
    }
  };

  // Global Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const toggleLanguage = () => {
    setLang((prev) => (prev === 'en' ? 'hi' : 'en'));
  };

  // 4 Business Suites matching showroom operations
  const suites = [
    {
      title: 'Counter & Sales',
      items: [
        { label: 'Home Dashboard', href: '/dashboard', icon: Home },
        { label: 'Sell (POS Terminal)', href: '/pos', icon: ShoppingBag, highlight: true },
        { label: 'Customers & Khata', href: '/customers', icon: Users },
        { label: 'Old Metal Exchange', href: '/old-gold', icon: Coins },
        { label: 'Sales History', href: '/sales', icon: Receipt },
      ],
    },
    {
      title: 'Girvi & Financier',
      items: [
        { label: 'Girvi Loans', href: '/girvi', icon: ShieldCheck },
        { label: 'Custody Vault', href: '/custody', icon: Warehouse },
        { label: 'Re-pledge Financier', href: '/repledge', icon: Building2 },
      ],
    },
    {
      title: 'Stock & Wholesaler',
      items: [
        { label: 'Inventory Master', href: '/inventory', icon: Package },
        { label: 'Barcode Studio', href: '/barcode', icon: Barcode },
        { label: 'Wholesaler Approval', href: '/memo-in', icon: Layers },
        { label: 'Settlement Queue', href: '/settlement-queue', icon: Clock },
      ],
    },
    {
      title: 'Finance & Audit',
      items: [
        { label: 'Cash Flow (Galla)', href: '/cashbook', icon: Wallet },
        { label: 'Credit (Udhaar)', href: '/credit', icon: CreditCard },
        { label: 'Alerts & Reminders', href: '/alerts', icon: Bell },
        { label: 'Tamper Audit Log', href: '/audit-log', icon: ScrollText },
        { label: 'Reports & P&L', href: '/reports', icon: FileText },
        { label: 'Settings', href: '/settings', icon: Settings },
      ],
    },
  ];

  // Primary 4 tabs for mobile bottom bar
  const bottomBarTabs = [
    { label: 'Home', href: '/dashboard', icon: Home },
    { label: 'Sell (POS)', href: '/pos', icon: ShoppingBag, highlight: true },
    { label: 'Customers', href: '/customers', icon: Users },
    { label: 'Girvi', href: '/girvi', icon: ShieldCheck },
  ];

  return (
    <div className="min-h-dvh bg-bg text-text flex flex-col lg:flex-row font-sans antialiased">
      {/* Desktop Sidebar (lg+) */}
      <aside className="hidden lg:flex flex-col w-64 bg-surface border-r border-border shrink-0 sticky top-0 h-dvh">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h1 className="font-extrabold text-primary text-lg tracking-tight">NARAYAN JEWELLERS</h1>
            <p className="text-[11px] text-text-muted font-medium">Fine Jewellery Enterprise</p>
          </div>
        </div>

        {/* 4 Grouped Navigation Suites */}
        <nav className="flex-1 p-3 space-y-4 overflow-y-auto custom-scrollbar">
          {suites.map((suite, idx) => (
            <div key={idx} className="space-y-1">
              <div className="text-[10px] font-black text-text-muted uppercase tracking-wider px-3 pb-1">
                {suite.title}
              </div>
              {suite.items.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                      item.highlight && !active
                        ? 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white'
                        : active
                        ? 'bg-primary text-white shadow-xs'
                        : 'text-text-muted hover:bg-surface-2 hover:text-text'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User Status Bar */}
        <div className="p-3 border-t border-border bg-surface-2 flex items-center justify-between text-xs">
          <div>
            <div className="font-bold text-text truncate max-w-[120px]">{userName}</div>
            <div className="text-[10px] text-text-muted font-medium uppercase">{userRole}</div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1 px-2.5 py-1 bg-surface border border-border rounded-lg font-bold text-text hover:bg-bg transition-colors"
            >
              <Globe className="w-3 h-3" />
              {lang.toUpperCase()}
            </button>
            <button
              onClick={handleLogout}
              title="Logout"
              className="flex items-center gap-1 p-1.5 bg-surface border border-border rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 min-h-dvh pb-16 lg:pb-0">
        {/* Top Navigation Bar with Live Bullion Bar & Quick Actions */}
        <header className="bg-surface border-b border-border h-16 px-4 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
          <div className="flex items-center gap-2 sm:gap-3">
            <h2 className="font-black text-base text-primary lg:hidden tracking-tight">NJMS</h2>
            <BullionRateTickerModal />
            <SaveIndicator status="saved" />
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <QuickActionMenu />
            <AlertBell />
            <button
              aria-label="Global Search (Ctrl+K)"
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-text-muted hover:bg-surface-2 hover:text-text border border-border bg-surface text-xs font-semibold"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Search</span>
              <kbd className="hidden md:inline text-[10px] font-bold px-1.5 py-0.5 bg-surface-2 border border-border rounded font-mono">⌘K</kbd>
            </button>
            <button
              onClick={toggleLanguage}
              className="lg:hidden flex items-center gap-1 px-2 py-1 text-xs bg-surface-2 border border-border rounded-lg font-bold text-text"
            >
              <Globe className="w-3.5 h-3.5" />
              {lang.toUpperCase()}
            </button>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto">{children}</main>

        {/* Mobile Bottom Navigation Bar (4 primary tabs + More) */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border flex items-center justify-around h-16 px-1 safe-area-inset-bottom">
          {bottomBarTabs.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-xs font-medium transition-colors ${
                  item.highlight
                    ? 'text-primary font-bold'
                    : active
                    ? 'text-primary font-semibold'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                <div
                  className={`p-1 rounded-full ${
                    item.highlight ? 'bg-primary text-white p-2.5 shadow-md -mt-4' : ''
                  }`}
                >
                  <Icon className={item.highlight ? 'w-6 h-6' : 'w-5 h-5'} />
                </div>
                {!item.highlight && <span className="mt-0.5 text-[11px]">{item.label}</span>}
              </Link>
            );
          })}

          <button
            onClick={() => setIsMoreOpen(!isMoreOpen)}
            className="flex flex-col items-center justify-center flex-1 h-full py-1 text-xs font-medium text-text-muted hover:text-text"
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className="mt-0.5 text-[11px]">More</span>
          </button>
        </nav>

        {/* Mobile "More" Categorized Bottom Sheet */}
        {isMoreOpen && (
          <div
            className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-in fade-in"
            onClick={() => setIsMoreOpen(false)}
          >
            <div
              className="bg-surface rounded-t-3xl p-5 space-y-4 border-t border-border shadow-2xl animate-in slide-in-from-bottom max-h-[85dvh] overflow-y-auto custom-scrollbar"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-1 bg-border rounded-full mx-auto mb-1" />
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-primary">
                  Store Management Suites
                </h3>
                <span className="text-xs text-text-muted font-medium">All Modules</span>
              </div>

              {suites.map((suite, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="text-[11px] font-black uppercase tracking-wider text-text-muted px-1">
                    {suite.title}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {suite.items.map((item) => {
                      const Icon = item.icon;
                      const active = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsMoreOpen(false)}
                          className={`flex items-center gap-2.5 p-3 rounded-2xl border text-xs font-bold transition-all ${
                            active
                              ? 'bg-primary text-white border-primary shadow-xs'
                              : 'bg-surface-2 hover:bg-surface border-border text-text'
                          }`}
                        >
                          <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-primary'}`} />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Global Search Modal */}
      <GlobalSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
};
