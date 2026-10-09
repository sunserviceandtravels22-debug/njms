'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, UserPlus, FileText, CheckCircle2, ChevronDown, User, AlertCircle } from 'lucide-react';
import { CustomerReportAction } from './CustomerReportAction';
import { InlineCustomerForm } from './InlineCustomerForm';

interface PartyResolverProps {
  mode?: 'full' | 'light';
  moduleId?: string;
  placeholder?: string;
  selectedCustomerId?: string | null;
  onResolved: (customer: any | null) => void;
}

export const PartyResolver: React.FC<PartyResolverProps> = ({
  mode = 'full',
  moduleId = 'GIRVI',
  placeholder = 'Type name or 10-digit phone...',
  selectedCustomerId,
  onResolved,
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [showInlineCreate, setShowInlineCreate] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch type-ahead suggestions
  useEffect(() => {
    if (query.trim().length >= 2) {
      const timer = setTimeout(() => {
        fetch(`/api/v1/customers/resolve?q=${encodeURIComponent(query.trim())}`)
          .then((res) => res.json())
          .then((res) => {
            if (res.ok && Array.isArray(res.data)) {
              setSuggestions(res.data);
              setIsOpen(true);
            }
          })
          .catch(() => {});
      }, 200);
      return () => clearTimeout(timer);
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }
  }, [query]);

  const handleSelectCandidate = (candidate: any) => {
    setSelectedCustomer(candidate);
    onResolved(candidate);
    setQuery(candidate.name);
    setIsOpen(false);
  };

  const handleClearSelection = () => {
    setSelectedCustomer(null);
    onResolved(null);
    setQuery('');
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      {selectedCustomer ? (
        <div className="flex items-center justify-between p-3 bg-primary/10 border border-primary/30 rounded-xl text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
              {selectedCustomer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-extrabold text-primary text-sm">{selectedCustomer.name}</div>
              <div className="text-[10px] text-text-muted">
                {selectedCustomer.phone} {selectedCustomer.relationName ? `• s/o ${selectedCustomer.relationName}` : ''}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CustomerReportAction customerId={selectedCustomer.id} customerName={selectedCustomer.name} />
            <button
              type="button"
              onClick={handleClearSelection}
              className="px-2.5 py-1 text-xs font-bold text-text-muted hover:text-rose-500 hover:bg-surface-2 rounded-lg transition-colors"
            >
              Change
            </button>
          </div>
        </div>
      ) : (
        <div className="relative">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-3.5" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => query.length >= 2 && setIsOpen(true)}
            placeholder={placeholder}
            className="w-full pl-9 pr-4 py-3 bg-surface-2 border border-border rounded-xl text-xs font-semibold text-text outline-none focus:border-primary"
          />

          {/* Suggestions Dropdown */}
          {isOpen && (
            <div className="absolute z-50 w-full mt-1.5 bg-surface border border-border rounded-xl shadow-2xl overflow-hidden divide-y divide-border animate-in fade-in zoom-in-95">
              {suggestions.length > 0 && (
                <div className="max-h-56 overflow-y-auto custom-scrollbar">
                  {suggestions.map((item) => {
                    const c = item.customer;
                    return (
                      <div
                        key={c.id}
                        onClick={() => handleSelectCandidate(c)}
                        className="p-3 hover:bg-surface-2 cursor-pointer flex justify-between items-center transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-surface-2 group-hover:bg-primary/20 text-text group-hover:text-primary flex items-center justify-center font-bold text-xs">
                            {c.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-xs text-text group-hover:text-primary">{c.name}</div>
                            <div className="text-[10px] text-text-muted">
                              {c.phone.slice(0, 4)}****{c.phone.slice(-2)}{' '}
                              {c.relationName ? `(s/o ${c.relationName})` : ''}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {c.openGirviCount > 0 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-500/10 text-amber-600 rounded-full">
                              Girvi Active ({c.openGirviCount})
                            </span>
                          )}
                          <CustomerReportAction customerId={c.id} customerName={c.name} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Always-visible Add New Customer Row */}
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setShowInlineCreate(true);
                }}
                className="w-full p-3 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs flex items-center gap-2 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                <span>＋ Add &apos;{query || 'new customer'}&apos; as new record inline</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Inline Quick-Add Customer Drawer Form */}
      {showInlineCreate && (
        <InlineCustomerForm
          initialName={isNaN(Number(query)) ? query : ''}
          initialPhone={!isNaN(Number(query)) ? query : ''}
          moduleId={moduleId}
          onClose={() => setShowInlineCreate(false)}
          onCreated={(newCustomer) => {
            setShowInlineCreate(false);
            handleSelectCandidate(newCustomer);
          }}
        />
      )}
    </div>
  );
};
