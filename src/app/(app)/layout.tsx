import React from 'react';
import { AppShell } from '@/components/shell/AppShell';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell userRole="OWNER" userName="Shop Owner">{children}</AppShell>;
}
