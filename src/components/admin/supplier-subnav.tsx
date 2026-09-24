'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardList, Calendar, AlertTriangle, ArrowLeftRight, Radio, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const supplierNavTabs = [
  { label: "Today's Duty Board", href: '/admin/suppliers', icon: ClipboardList, exact: true },
  { label: 'Live Monitoring', href: '/admin/suppliers/monitoring', icon: Radio },
  { label: 'Monthly Schedule', href: '/admin/suppliers/schedule', icon: Calendar },
  { label: 'Auto Generator', href: '/admin/suppliers/generate', icon: Wand2 },
  { label: 'Absences & Queue', href: '/admin/suppliers/absences', icon: AlertTriangle },
  { label: 'Handover Log', href: '/admin/suppliers/handovers', icon: ArrowLeftRight },
];

export function SupplierSubnav() {
  const pathname = usePathname();

  return (
    <div className="flex border-b border-slate-200 gap-2 mb-6">
      {supplierNavTabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.exact ? pathname === tab.href : pathname?.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors -mb-px',
              isActive
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            )}
          >
            <Icon className={cn('w-3.5 h-3.5', isActive ? 'text-indigo-600' : 'text-slate-400')} />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
