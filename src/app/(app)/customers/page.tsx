'use client';

import React, { useState, useEffect } from 'react';
import { ResponsiveList, Column } from '@/components/common/ResponsiveList';
import { CustomerFormDrawer } from '@/components/customers/CustomerFormDrawer';
import { PhotoPreviewModal } from '@/components/common/PhotoPreviewModal';
import { CandidateCustomer } from '@/components/customers/DuplicateWarningSheet';
import { formatMoney } from '@/domain/money';
import {
  Users,
  Search,
  UserPlus,
  Filter,
  Shield,
  AlertTriangle,
  Lock,
  CheckCircle,
  Eye,
  Edit,
  GitMerge,
  Image as ImageIcon,
} from 'lucide-react';
import Link from 'next/link';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CandidateCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState<string>('ALL');

  // Modal & Drawer States
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<CandidateCustomer | null>(null);

  // Photo Preview State
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; driveUrl?: string; name: string } | null>(null);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      let url = `/api/v1/customers?limit=50`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (activeTag !== 'ALL') url += `&tag=${activeTag}`;

      const res = await fetch(url);
      const json = await res.json();
      if (json.ok) {
        setCustomers(json.data);
      }
    } catch (err) {
      console.error('Fetch customers error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, activeTag]);

  const renderTagBadge = (tag: string) => {
    switch (tag) {
      case 'VIP':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
            <Shield className="w-3 h-3 fill-amber-500" /> VIP
          </span>
        );
      case 'RISK':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-orange-100 text-orange-900 border border-orange-300">
            <AlertTriangle className="w-3 h-3" /> RISK
          </span>
        );
      case 'BLOCKED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-900 border border-red-300">
            <Lock className="w-3 h-3" /> BLOCKED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded bg-stone-100 text-stone-700 border border-stone-200">
            <CheckCircle className="w-3 h-3 text-stone-400" /> STANDARD
          </span>
        );
    }
  };

  const columns: Column<CandidateCustomer>[] = [
    {
      header: 'Customer',
      cell: (c) => (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() =>
              c.photoUrl
                ? setPreviewPhoto({ url: c.photoUrl, driveUrl: c.photoDriveUrl || undefined, name: c.name })
                : null
            }
            className="w-10 h-10 rounded-lg overflow-hidden bg-amber-100 border border-amber-300 shrink-0 flex items-center justify-center hover:opacity-80 transition cursor-pointer"
          >
            {c.photoUrl ? (
              <img src={c.photoUrl} alt={c.name} className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="w-5 h-5 text-amber-400" />
            )}
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-amber-950 text-sm">{c.name}</span>
              {c.nameHindi && <span className="text-xs text-amber-700">({c.nameHindi})</span>}
            </div>
            {c.relationName && (
              <p className="text-xs text-stone-500">
                {c.relationType || 'Rel'}: {c.relationName}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Mobile Phone',
      cell: (c) => (
        <div className="text-xs font-semibold text-stone-800">
          📞 +91 {c.phone}
        </div>
      ),
    },
    {
      header: 'City / Address',
      cell: (c) => (
        <div className="text-xs text-stone-600">
          <p className="font-medium text-stone-900">{c.city || 'Local'}</p>
          {c.address && <p className="text-[11px] text-stone-400 truncate max-w-xs">{c.address}</p>}
        </div>
      ),
    },
    {
      header: 'Status Tag',
      cell: (c) => renderTagBadge(c.tag),
    },
    {
      header: 'Actions',
      className: 'text-right',
      cell: (c) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => {
              setEditCustomer(c);
              setDrawerOpen(true);
            }}
            className="p-2 text-stone-600 hover:text-amber-900 hover:bg-amber-100 rounded-lg transition min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Edit Customer"
          >
            <Edit className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const renderMobileCard = (c: CandidateCustomer) => (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() =>
              c.photoUrl
                ? setPreviewPhoto({ url: c.photoUrl, driveUrl: c.photoDriveUrl || undefined, name: c.name })
                : null
            }
            className="w-12 h-12 rounded-xl overflow-hidden bg-amber-100 border border-amber-300 shrink-0 flex items-center justify-center cursor-pointer"
          >
            {c.photoUrl ? (
              <img src={c.photoUrl} alt={c.name} className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="w-6 h-6 text-amber-400" />
            )}
          </button>

          <div>
            <h4 className="font-bold text-amber-950 text-base">{c.name}</h4>
            {c.nameHindi && <p className="text-xs text-amber-800 font-medium">{c.nameHindi}</p>}
            <p className="text-xs font-semibold text-stone-700 mt-0.5">📞 +91 {c.phone}</p>
          </div>
        </div>

        {renderTagBadge(c.tag)}
      </div>

      {c.relationName && (
        <p className="text-xs text-stone-500">
          <span className="font-medium text-stone-700">{c.relationType || 'Rel'}:</span> {c.relationName}
        </p>
      )}

      {c.address && (
        <p className="text-xs text-stone-400 bg-stone-50 p-2 rounded border border-stone-100">
          📍 {c.address} ({c.city || 'Local'})
        </p>
      )}

      <div className="pt-2 border-t border-amber-100 flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            setEditCustomer(c);
            setDrawerOpen(true);
          }}
          className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 hover:underline min-h-[44px]"
        >
          <Edit className="w-3.5 h-3.5" /> Edit Profile
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-amber-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-amber-950">Customer Base CRM</h1>
            <p className="text-xs text-stone-500">
              Manage customer identity, WebP photo avatars, exposure limits, and duplicate prevention
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/customers/merge"
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-700 hover:bg-stone-100 text-xs font-bold transition min-h-[44px]"
          >
            <GitMerge className="w-4 h-4 text-amber-700" /> Duplicate Finder
          </Link>
          <button
            type="button"
            onClick={() => {
              setEditCustomer(null);
              setDrawerOpen(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-800 text-white font-bold text-xs hover:bg-amber-900 shadow-md transition active:scale-95 min-h-[44px]"
          >
            <UserPlus className="w-4 h-4" /> Add New Customer
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by English name, Hindi name (रमेश), phone number..."
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-amber-200 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 min-h-[44px]"
            />
          </div>

          {/* Tag Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
            {['ALL', 'STANDARD', 'VIP', 'RISK', 'BLOCKED'].map((t) => (
              <button
                key={t}
                onClick={() => setActiveTag(t)}
                className={`px-3 py-2 text-xs font-bold rounded-lg transition min-h-[40px] ${
                  activeTag === t
                    ? 'bg-amber-800 text-white shadow-sm'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main List */}
      <ResponsiveList
        items={customers}
        keyExtractor={(c) => c.id}
        columns={columns}
        renderMobileCard={renderMobileCard}
        loading={loading}
        emptyState={
          <div className="p-12 text-center bg-white rounded-2xl border border-amber-200 space-y-3">
            <Users className="w-12 h-12 text-amber-300 mx-auto" />
            <h3 className="text-base font-bold text-amber-950">No Customers Found</h3>
            <p className="text-xs text-stone-500">
              Try adjusting your search query or click "Add New Customer" above.
            </p>
          </div>
        }
      />

      {/* Quick Add / Edit Form Drawer */}
      <CustomerFormDrawer
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditCustomer(null);
        }}
        initialData={editCustomer}
        onSuccess={() => fetchCustomers()}
        title={editCustomer ? 'Edit Customer Profile' : 'Add New Customer'}
      />

      {/* Photo Preview Modal */}
      <PhotoPreviewModal
        isOpen={Boolean(previewPhoto)}
        onClose={() => setPreviewPhoto(null)}
        title={`${previewPhoto?.name || 'Customer'} Photo`}
        photoUrl={previewPhoto?.url}
        photoDriveUrl={previewPhoto?.driveUrl}
      />
    </div>
  );
}
