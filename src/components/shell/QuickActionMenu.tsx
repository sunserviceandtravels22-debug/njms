'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Plus, ShoppingBag, ShieldCheck, Coins, Layers, Clock, X } from 'lucide-react';

export function QuickActionMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const actions = [
    {
      label: 'New Sale (POS Terminal)',
      description: 'Scan item tag & bill customer',
      href: '/pos',
      icon: ShoppingBag,
      color: 'text-primary bg-primary/10',
    },
    {
      label: 'New Girvi Loan',
      description: 'Intake ornaments & issue pledge',
      href: '/girvi',
      icon: ShieldCheck,
      color: 'text-amber-700 bg-amber-500/10',
    },
    {
      label: 'Old Gold Trade-in',
      description: 'Test purity & buy customer metal',
      href: '/old-gold',
      icon: Coins,
      color: 'text-emerald-700 bg-emerald-500/10',
    },
    {
      label: 'Wholesaler Approval (Memo-In)',
      description: 'Receive stock on approval',
      href: '/memo-in',
      icon: Layers,
      color: 'text-blue-700 bg-blue-500/10',
    },
    {
      label: 'Bhaav Kaatna (Rate Settle)',
      description: 'Fix floating bullion rate with vendor',
      href: '/settlement-queue',
      icon: Clock,
      color: 'text-purple-700 bg-purple-500/10',
    },
  ];

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white font-bold text-xs rounded-xl hover:bg-primary/90 transition-all shadow-xs active:scale-95"
        title="Quick Counter Actions"
      >
        <Plus className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-45' : ''}`} />
        <span className="hidden sm:inline">Quick Action</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-surface border border-border rounded-2xl shadow-xl z-50 p-2 space-y-1 animate-in fade-in zoom-in-95">
          <div className="px-3 py-1.5 border-b border-border text-[10px] font-black uppercase text-text-muted tracking-wider">
            Counter Speed Launchpad
          </div>
          {actions.map((act) => {
            const Icon = act.icon;
            return (
              <Link
                key={act.href}
                href={act.href}
                onClick={() => setIsOpen(false)}
                className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-surface-2 transition-colors group"
              >
                <div className={`p-2 rounded-lg ${act.color} shrink-0`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-text group-hover:text-primary transition-colors">
                    {act.label}
                  </div>
                  <div className="text-[10px] text-text-muted">{act.description}</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
