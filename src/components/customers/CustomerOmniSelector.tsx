'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, UserCheck, UserPlus, Phone, MapPin, X, Check, ShieldCheck, ChevronDown } from 'lucide-react';

export interface CustomerOmniData {
  id?: string;
  name: string;
  nameHindi?: string | null;
  phone: string;
  altPhone?: string | null;
  relationType?: string;
  relationName?: string | null;
  address?: string | null;
  city?: string | null;
  identityDocType?: string | null;
  identityDocNumber?: string | null;
  photoUrl?: string | null;
  tag?: string;
}

interface CustomerOmniSelectorProps {
  selectedCustomer: CustomerOmniData | null;
  onSelectCustomer: (customer: CustomerOmniData | null) => void;
  title?: string;
  required?: boolean;
}

export function CustomerOmniSelector({
  selectedCustomer,
  onSelectCustomer,
  title = 'Customer / Buyer Dossier',
  required = true,
}: CustomerOmniSelectorProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CustomerOmniData[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isNewMode, setIsNewMode] = useState(false);

  // New customer inline form state
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRelationType, setNewRelationType] = useState('FATHER');
  const [newRelationName, setNewRelationName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newCity, setNewCity] = useState('Local');
  const [newIdType, setNewIdType] = useState('Aadhaar Card');
  const [newIdNumber, setNewIdNumber] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/customers?search=${encodeURIComponent(query.trim())}&limit=8`, {
          credentials: 'include',
        });
        if (res.ok) {
          const json = await res.json();
          if (json.ok && Array.isArray(json.data)) {
            setResults(json.data);
            setShowDropdown(true);
          }
        }
      } catch (err) {
        console.error('Customer search error:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (cust: CustomerOmniData) => {
    onSelectCustomer(cust);
    setShowDropdown(false);
    setQuery('');
    setIsNewMode(false);
  };

  const handleClear = () => {
    onSelectCustomer(null);
    setQuery('');
    setIsNewMode(false);
  };

  const handleCreateNewCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    const cleanName = newName.trim();
    const cleanPhone = newPhone.trim();

    if (!cleanName) {
      setCreateError('Customer name is required');
      return;
    }
    if (!cleanPhone || cleanPhone.length < 10) {
      setCreateError('Valid 10-digit mobile number is required');
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/v1/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: cleanName,
          phone: cleanPhone,
          relationType: newRelationType,
          relationName: newRelationName.trim() || undefined,
          address: newAddress.trim() || undefined,
          city: newCity.trim() || 'Local',
          identityDocType: newIdType,
          identityDocNumber: newIdNumber.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (res.ok && json.ok) {
        const createdCust: CustomerOmniData = {
          id: json.data.id,
          name: json.data.name,
          phone: json.data.phone,
          relationType: json.data.relationType,
          relationName: json.data.relationName,
          address: json.data.address,
          city: json.data.city,
          identityDocType: json.data.identityDocType,
          identityDocNumber: json.data.identityDocNumber,
          tag: json.data.tag || 'STANDARD',
        };
        onSelectCustomer(createdCust);
        setIsNewMode(false);
        setNewName('');
        setNewPhone('');
        setNewRelationName('');
        setNewAddress('');
        setNewIdNumber('');
      } else {
        setCreateError(json.error || 'Failed to enroll new customer');
      }
    } catch (err: any) {
      setCreateError(err.message || 'Network error while creating customer');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-3" ref={containerRef}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-1.5">
          <UserCheck className="w-4 h-4 text-primary" />
          <span>{title} {required && <span className="text-rose-500">*</span>}</span>
        </label>
        {selectedCustomer ? (
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-text-muted hover:text-rose-600 font-semibold transition-colors flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" />
            <span>Change</span>
          </button>
        ) : !isNewMode ? (
          <button
            type="button"
            onClick={() => setIsNewMode(true)}
            className="text-xs text-primary hover:underline font-bold flex items-center gap-1"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ New Customer</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsNewMode(false)}
            className="text-xs text-text-muted hover:text-text font-semibold flex items-center gap-1"
          >
            <span>Cancel</span>
          </button>
        )}
      </div>

      {/* Selected Customer Verified Card */}
      {selectedCustomer ? (
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 text-primary font-black flex items-center justify-center text-sm">
                {selectedCustomer.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-extrabold text-text">{selectedCustomer.name}</h4>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                    Verified Customer
                  </span>
                  {selectedCustomer.tag && selectedCustomer.tag !== 'STANDARD' && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-surface-2 text-text-muted">
                      {selectedCustomer.tag}
                    </span>
                  )}
                </div>
                {selectedCustomer.relationName && (
                  <p className="text-xs text-text-muted font-medium">
                    {selectedCustomer.relationType || 'S/O'}: {selectedCustomer.relationName}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-border/50 text-xs">
            <div className="flex items-center gap-1.5 text-text-muted">
              <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="font-mono font-bold text-text">{selectedCustomer.phone}</span>
              {selectedCustomer.altPhone && <span>/ {selectedCustomer.altPhone}</span>}
            </div>
            <div className="flex items-center gap-1.5 text-text-muted">
              <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="truncate">{selectedCustomer.address || selectedCustomer.city || 'Local Area'}</span>
            </div>
            {selectedCustomer.identityDocNumber && (
              <div className="flex items-center gap-1.5 text-text-muted sm:col-span-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{selectedCustomer.identityDocType || 'ID'}: </span>
                <span className="font-mono font-bold text-text">{selectedCustomer.identityDocNumber}</span>
              </div>
            )}
          </div>
        </div>
      ) : isNewMode ? (
        /* Inline New Customer Enrollment Form */
        <form onSubmit={handleCreateNewCustomer} className="p-4 rounded-xl bg-surface-2 border border-border space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <span className="text-xs font-bold text-text flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-primary" />
              <span>Register & Enroll New Customer</span>
            </span>
            <span className="text-[11px] text-text-muted">Directly saved to CRM</span>
          </div>

          {createError && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 text-xs font-bold">
              {createError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-text-muted uppercase block mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Ramesh Kumar"
                className="w-full p-2 bg-surface border border-border rounded-lg text-xs font-semibold text-text focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-text-muted uppercase block mb-1">
                Mobile Number *
              </label>
              <input
                type="tel"
                required
                maxLength={10}
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="10-digit mobile"
                className="w-full p-2 bg-surface border border-border rounded-lg text-xs font-semibold font-mono text-text focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-text-muted uppercase block mb-1">
                Relation
              </label>
              <div className="flex gap-2">
                <select
                  value={newRelationType}
                  onChange={(e) => setNewRelationType(e.target.value)}
                  className="w-24 p-2 bg-surface border border-border rounded-lg text-xs font-semibold text-text"
                >
                  <option value="FATHER">S/O (Father)</option>
                  <option value="HUSBAND">W/O (Husband)</option>
                  <option value="MOTHER">D/O (Mother)</option>
                  <option value="SELF">Self</option>
                </select>
                <input
                  type="text"
                  value={newRelationName}
                  onChange={(e) => setNewRelationName(e.target.value)}
                  placeholder="Father / Husband Name"
                  className="flex-1 p-2 bg-surface border border-border rounded-lg text-xs font-semibold text-text"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-text-muted uppercase block mb-1">
                City / Town
              </label>
              <input
                type="text"
                value={newCity}
                onChange={(e) => setNewCity(e.target.value)}
                placeholder="City"
                className="w-full p-2 bg-surface border border-border rounded-lg text-xs font-semibold text-text"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[11px] font-bold text-text-muted uppercase block mb-1">
                Street Address / Locality
              </label>
              <input
                type="text"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                placeholder="Residential address / village"
                className="w-full p-2 bg-surface border border-border rounded-lg text-xs font-semibold text-text"
              />
            </div>

            <div className="sm:col-span-2 flex gap-2">
              <select
                value={newIdType}
                onChange={(e) => setNewIdType(e.target.value)}
                className="w-36 p-2 bg-surface border border-border rounded-lg text-xs font-semibold text-text"
              >
                <option value="Aadhaar Card">Aadhaar Card</option>
                <option value="PAN Card">PAN Card</option>
                <option value="Voter ID">Voter ID</option>
                <option value="Driving Licence">Driving Licence</option>
              </select>
              <input
                type="text"
                value={newIdNumber}
                onChange={(e) => setNewIdNumber(e.target.value)}
                placeholder="Document ID Number (optional)"
                className="flex-1 p-2 bg-surface border border-border rounded-lg text-xs font-semibold text-text font-mono"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsNewMode(false)}
              className="px-3 py-2 bg-surface hover:bg-border text-text rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="flex-1 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5"
            >
              {creating ? (
                <span>Enrolling Customer...</span>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Save & Select Customer</span>
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        /* Omnisearch Input Field */
        <div className="relative">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-text-muted absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => {
                if (results.length > 0) setShowDropdown(true);
              }}
              placeholder="Search by Name, Phone, S/O Father's name, or Aadhaar..."
              className="w-full pl-9 pr-9 py-2.5 bg-surface border border-border rounded-xl text-xs font-semibold text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3 text-text-muted hover:text-text"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown List */}
          {showDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto divide-y divide-border">
              {loading ? (
                <div className="p-3 text-center text-xs text-text-muted">Searching customer database...</div>
              ) : results.length > 0 ? (
                results.map((cust) => (
                  <button
                    type="button"
                    key={cust.id || cust.phone}
                    onClick={() => handleSelect(cust)}
                    className="w-full p-3 text-left hover:bg-primary/5 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0">
                        {cust.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-extrabold text-text">{cust.name}</span>
                          {cust.relationName && (
                            <span className="text-[11px] text-text-muted">
                              ({cust.relationType || 'S/O'} {cust.relationName})
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-text-muted flex items-center gap-2 mt-0.5">
                          <span className="font-mono font-semibold text-text">{cust.phone}</span>
                          {cust.city && <span>• {cust.city}</span>}
                          {cust.identityDocNumber && (
                            <span className="font-mono">• {cust.identityDocNumber}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary uppercase">
                      Select
                    </span>
                  </button>
                ))
              ) : (
                <div className="p-4 text-center space-y-2">
                  <p className="text-xs text-text-muted">No existing customer found matching "{query}"</p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewMode(true);
                      setShowDropdown(false);
                      if (/^\d{10}$/.test(query.trim())) {
                        setNewPhone(query.trim());
                      } else {
                        setNewName(query.trim());
                      }
                    }}
                    className="px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90"
                  >
                    + Register "{query}" as New Customer
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
