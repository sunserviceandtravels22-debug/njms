'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';

export const AlertBell: React.FC = () => {
  const [openCount, setOpenCount] = useState<number>(0);
  const [criticalCount, setCriticalCount] = useState<number>(0);

  const fetchAlerts = async () => {
    try {
      const res = await fetch('/api/v1/alerts?status=OPEN');
      const json = await res.json();
      if (json.ok && Array.isArray(json.data)) {
        setOpenCount(json.data.length);
        const crits = json.data.filter((a: any) => a.severity === 'CRITICAL').length;
        setCriticalCount(crits);
      }
    } catch {
      // ignore fetch errors
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30_000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <Link
      href="/alerts"
      className="relative p-2 rounded-lg text-text-muted hover:text-text hover:bg-surface-2 transition-colors inline-flex items-center justify-center"
      aria-label={`Alerts: ${openCount} open`}
    >
      <Bell className="w-5 h-5" />
      {openCount > 0 && (
        <span
          className={`absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full text-white ${
            criticalCount > 0 ? 'bg-error animate-pulse' : 'bg-primary'
          }`}
        >
          {openCount > 99 ? '99+' : openCount}
        </span>
      )}
    </Link>
  );
};
