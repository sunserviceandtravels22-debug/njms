
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useInventory } from '../context/InventoryContext';

interface LayoutProps {
  children: React.ReactNode;
  activePage: string;
  onNavigate: (page: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activePage, onNavigate }) => {
  const { logout } = useAuth();
  const { isLoading } = useInventory();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'inventory', label: 'Inventory', icon: '📦' },
    { id: 'purchase', label: 'New Purchase', icon: '➕' },
    { id: 'sales', label: 'Point of Sale', icon: '💰' },
    { id: 'skus', label: 'SKU Master', icon: '🏷️' },
    { id: 'history', label: 'Sale History', icon: '📜' },
    { id: 'audit', label: 'Audit Log', icon: '🛡️' },
    { id: 'reports', label: 'Reports', icon: '📈' },
  ];

  const handleNavigate = (id: string) => {
    onNavigate(id);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/80 z-[100] md:hidden backdrop-blur-md transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Desktop & Mobile */}
      <aside 
        className={`${isSidebarOpen ? 'w-64' : 'w-24'} fixed md:relative h-full bg-slate-950 z-[110] transition-all duration-300 flex flex-col shrink-0 ${isMobileMenuOpen ? 'translate-x-0' : 'md:translate-x-0 -translate-x-full'} shadow-2xl`}
      >
        <div className="p-6 flex items-center gap-3 border-b border-white/5 h-24 overflow-hidden shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black shrink-0 shadow-lg border border-indigo-400">NJ</div>
          {isSidebarOpen && (
            <div className="flex flex-col leading-tight text-white">
              <span className="font-black text-lg tracking-tighter">NARAYAN</span>
              <span className="text-[10px] text-indigo-400 tracking-[0.2em] uppercase font-black">Jewellers</span>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-8 px-3 space-y-2 no-scrollbar">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => handleNavigate(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all group relative ${
                activePage === item.id 
                  ? 'bg-indigo-600 text-white font-black shadow-xl shadow-indigo-900/40' 
                  : 'text-slate-500 hover:bg-white/5 hover:text-white font-bold'
              }`}
            >
              <span className="text-xl shrink-0 group-hover:scale-110 transition-transform">{item.icon}</span>
              {isSidebarOpen && <span className="truncate text-[10px] uppercase tracking-[0.2em]">{item.label}</span>}
              {activePage === item.id && isSidebarOpen && (
                <span className="absolute right-3 w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5 space-y-2 shrink-0">
          <button 
            onClick={logout}
            className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-rose-500 hover:bg-rose-500/10 font-black transition-all"
          >
            <span className="text-xl shrink-0">🚪</span>
            {isSidebarOpen && <span className="truncate text-[10px] uppercase tracking-widest">Terminate Session</span>}
          </button>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="hidden md:flex w-full items-center justify-center p-3 text-white/20 hover:text-white hover:bg-white/5 rounded-2xl transition-colors"
          >
            {isSidebarOpen ? '◀ Collapse' : '▶'}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden w-full relative">
        <header className="h-24 bg-white border-b-2 border-slate-200 flex items-center justify-between px-6 md:px-12 z-20 shrink-0 shadow-sm">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setIsMobileMenuOpen(true)} 
              className="md:hidden w-12 h-12 flex items-center justify-center bg-slate-950 rounded-2xl text-white text-xl shadow-lg active:scale-95"
            >
              ☰
            </button>
            <div className="flex flex-col">
              <h1 className="text-2xl md:text-4xl font-black text-slate-950 uppercase tracking-tighter leading-none">
                {navItems.find(i => i.id === activePage)?.label || 'Protocol'}
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isLoading ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'}`}></span>
                <span className="text-[10px] font-black text-slate-700 uppercase tracking-[0.2em]">
                  {isLoading ? 'Synchronizing State...' : 'Encrypted Ledger • Live Sync'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-[11px] font-black text-slate-950 uppercase tracking-widest leading-none">Root Admin</span>
              <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-[0.2em] mt-1">Level 10 Access</span>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-slate-950 flex items-center justify-center text-white font-black border-4 border-white shadow-2xl relative group overflow-hidden">
               <span className="relative z-10 text-xl">A</span>
               <div className="absolute inset-0 bg-indigo-600 translate-y-full group-hover:translate-y-0 transition-transform"></div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-12 no-scrollbar scroll-smooth">
          {children}
        </div>
      </main>
    </div>
  );
};
