'use client';

import React from 'react';
import { formatMoney } from '@/domain/money';
import { CustomerTag } from '@prisma/client';
import { AlertTriangle, Shield, CheckCircle, CreditCard, Lock } from 'lucide-react';

interface ExposureBannerProps {
  tag: CustomerTag;
  creditOutstandingPaise: string | bigint;
  girviActivePrincipalPaise: string | bigint;
  creditLimitPaise: string | bigint;
  isOverdue?: boolean;
  isOverLimit?: boolean;
}

export function ExposureBanner({
  tag,
  creditOutstandingPaise,
  girviActivePrincipalPaise,
  creditLimitPaise,
  isOverdue = false,
  isOverLimit = false,
}: ExposureBannerProps) {
  const creditPaise = BigInt(creditOutstandingPaise.toString());
  const girviPaise = BigInt(girviActivePrincipalPaise.toString());
  const limitPaise = BigInt(creditLimitPaise.toString());
  const totalExposurePaise = creditPaise + girviPaise;

  const getTagBadge = () => {
    switch (tag) {
      case 'VIP':
        return <span className="px-2.5 py-1 rounded-md bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold flex items-center gap-1"><Shield className="w-3.5 h-3.5 fill-amber-500" /> VIP CUSTOMER</span>;
      case 'RISK':
        return <span className="px-2.5 py-1 rounded-md bg-orange-100 text-orange-900 border border-orange-300 text-xs font-bold flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> HIGH RISK</span>;
      case 'BLOCKED':
        return <span className="px-2.5 py-1 rounded-md bg-red-100 text-red-900 border border-red-300 text-xs font-bold flex items-center gap-1"><Lock className="w-3.5 h-3.5" /> BLOCKED</span>;
      default:
        return <span className="px-2.5 py-1 rounded-md bg-stone-100 text-stone-700 border border-stone-200 text-xs font-medium flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5 text-stone-400" /> STANDARD</span>;
    }
  };

  return (
    <div className={`p-4 rounded-xl border ${tag === 'BLOCKED' ? 'bg-red-50/70 border-red-200' : isOverdue ? 'bg-orange-50/70 border-orange-200' : 'bg-amber-50/50 border-amber-200'} space-y-3`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-amber-700" />
          <h4 className="text-sm font-semibold text-amber-950">Financial Exposure & Credit Status</h4>
        </div>
        {getTagBadge()}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-2.5 bg-white rounded-lg border border-amber-100">
          <p className="text-stone-500 font-medium">Credit Balance</p>
          <p className={`font-bold text-sm ${creditPaise > 0 ? 'text-amber-900' : 'text-stone-900'}`}>
            {formatMoney(creditPaise)}
          </p>
        </div>

        <div className="p-2.5 bg-white rounded-lg border border-amber-100">
          <p className="text-stone-500 font-medium">Active Girvi Principal</p>
          <p className="font-bold text-sm text-stone-900">{formatMoney(girviPaise)}</p>
        </div>

        <div className="p-2.5 bg-white rounded-lg border border-amber-100">
          <p className="text-stone-500 font-medium">Credit Limit</p>
          <p className="font-bold text-sm text-stone-700">
            {limitPaise > 0 ? formatMoney(limitPaise) : 'No Limit'}
          </p>
        </div>

        <div className="p-2.5 bg-white rounded-lg border border-amber-100">
          <p className="text-stone-500 font-medium">Total Exposure</p>
          <p className={`font-bold text-sm ${isOverLimit ? 'text-red-600' : 'text-amber-950'}`}>
            {formatMoney(totalExposurePaise)}
          </p>
        </div>
      </div>

      {(isOverdue || isOverLimit || tag === 'BLOCKED') && (
        <div className="flex items-center gap-2 text-xs font-semibold text-red-700 bg-red-100/60 p-2.5 rounded-lg border border-red-200">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
          <span>
            {tag === 'BLOCKED'
              ? 'Warning: Customer is marked BLOCKED. Require supervisor clearance before new sales/girvi.'
              : isOverdue
              ? 'Overdue payments pending!'
              : 'Credit exposure limit exceeded!'}
          </span>
        </div>
      )}
    </div>
  );
}
