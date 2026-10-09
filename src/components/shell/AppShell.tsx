// Implements: FR-PLT-01 | Component: C-01 | Doc: 02_DESIGN §3, §5

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GlobalSearchModal } from '../search/GlobalSearchModal';
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
} from 'lucide-react';
import { SaveIndicator } from '../ui/SaveIndicator';
import { AlertBell } from '../AlertBell';
import { Bell } from 'lucide-react';

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
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

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

  const navItems = [
    { label: 'Home', href: '/dashboard', icon: Home },
    { label: 'Sell', href: '/pos', icon: ShoppingBag, highlight: true },
    { label: 'Customers', href: '/customers', icon: Users },
    { label: 'Girvi', href: '/girvi', icon: ShieldCheck },
  ];

  const moreItems = [
    { label: 'Alerts', href: '/alerts', icon: Bell },
    { label: 'Cash Flow', href: '/cashbook', icon: Wallet },
    { label: 'Re-pledge', href: '/repledge', icon: Building2 },
    { label: 'Custody Vault', href: '/custody', icon: Warehouse },
    { label: 'Credit (Udhaar)', href: '/credit', icon: CreditCard },
    { label: 'Inventory', href: '/inventory', icon: Package },
    { label: 'Barcode Studio', href: '/barcode', icon: Barcode },
    { label: 'Reports', href: '/reports', icon: FileText },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <div className="min-h-dvh bg-bg text-text flex flex-col lg:flex-row font-sans antialiased">
      {/* Desktop Sidebar (lg+) */}
      <aside className="hidden lg:flex flex-col w-64 bg-surface border-r border-border shrink-0 sticky top-0 h-dvh">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h1 className="font-extrabold text-primary text-lg tracking-tight">NARAYAN JEWELLERS</h1>
            <p className="text-xs text-text-muted">Management System</p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
          <div className="text-xs font-semibold text-text-muted uppercase px-3 pt-2 pb-1">Core Modules</div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active ? 'bg-primary text-white font-semibold' : 'text-text-muted hover:bg-surface-2 hover:text-text'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}

          <div className="text-xs font-semibold text-text-muted uppercase px-3 pt-4 pb-1">Management</div>
          {moreItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active ? 'bg-primary text-white font-semibold' : 'text-text-muted hover:bg-surface-2 hover:text-text'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border bg-surface-2 flex items-center justify-between text-xs">
          <div>
            <div className="font-semibold text-text">{userName}</div>
            <div className="text-text-muted">{userRole}</div>
          </div>
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1 px-2.5 py-1 bg-surface border border-border rounded font-semibold text-text hover:bg-bg"
          >
            <Globe className="w-3.5 h-3.5" />
            {lang.toUpperCase()}
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 min-h-dvh pb-16 lg:pb-0">
        {/* Top Navigation Bar */}
        <header className="bg-surface border-b border-border h-14 px-4 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-base text-primary lg:hidden">NJMS</h2>
            <SaveIndicator status="saved" />
          </div>

          <div className="flex items-center gap-2">
            <AlertBell />
            <button
              aria-label="Global Search (Ctrl+K)"
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-text-muted hover:bg-surface-2 hover:text-text border border-border bg-surface text-xs font-medium"
            >
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline">Search</span>
              <kbd className="hidden md:inline text-[10px] font-bold px-1.5 py-0.5 bg-surface-2 border border-border rounded">⌘K</kbd>
            </button>
            <button
              onClick={toggleLanguage}
              className="lg:hidden flex items-center gap-1 px-2 py-1 text-xs bg-surface-2 border border-border rounded font-semibold text-text"
            >
              <Globe className="w-3.5 h-3.5" />
              {lang.toUpperCase()}
            </button>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto">{children}</main>

        {/* Mobile Bottom Navigation Bar (5 tabs base layout) */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border flex items-center justify-around h-16 px-1 safe-area-inset-bottom">
          {navItems.map((item) => {
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
                {!item.highlight && <span className="mt-0.5">{item.label}</span>}
              </Link>
            );
          })}

          <button
            onClick={() => setIsMoreOpen(!isMoreOpen)}
            className="flex flex-col items-center justify-center flex-1 h-full py-1 text-xs font-medium text-text-muted hover:text-text"
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className="mt-0.5">More</span>
          </button>
        </nav>

        {/* Mobile "More" Bottom Sheet */}
        {isMoreOpen && (
          <div
            className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex flex-col justify-end"
            onClick={() => setIsMoreOpen(false)}
          >
            <div
              className="bg-surface rounded-t-2xl p-4 space-y-2 border-t border-border shadow-2xl animate-in slide-in-from-bottom"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-1 bg-border rounded-full mx-auto mb-2" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted px-2">Management Modules</h3>
              <div className="grid grid-cols-2 gap-2">
                {moreItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMoreOpen(false)}
                      className="flex items-center gap-3 p-3 rounded-xl bg-surface-2 hover:bg-border text-sm font-medium text-text"
                    >
                      <Icon className="w-5 h-5 text-primary shrink-0" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Global Search Modal */}
      <GlobalSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
};
