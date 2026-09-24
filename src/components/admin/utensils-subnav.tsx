'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { 
  ShieldCheck, 
  Layers, 
  AlertTriangle, 
  BarChart3,
  RotateCcw
} from 'lucide-react';

interface UtensilsSubnavProps {
  onOpenRecoveryModal?: () => void;
  onOpenDiscrepancyModal?: () => void;
}

export function UtensilsSubnav({
  onOpenRecoveryModal,
  onOpenDiscrepancyModal,
}: UtensilsSubnavProps) {
  const pathname = usePathname();

  const navItems = [
    { label: 'Executive Dashboard', href: '/admin/utensils', icon: ShieldCheck, exact: true },
    { label: 'Live Operations Board', href: '/admin/utensils/operations', icon: Layers },
    { label: 'Discrepancy Queue', href: '/admin/utensils/discrepancies', icon: AlertTriangle },
    { label: 'Accountability Reports', href: '/admin/reports/utensils', icon: BarChart3 },
  ];

  return (
    <div className="bg-white border-b border-slate-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-2">
        <nav className="flex space-x-2 sm:space-x-4 overflow-x-auto scrollbar-none" aria-label="Utensil Tracking Subnavigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact ? pathname === item.href : pathname?.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-colors whitespace-nowrap',
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                )}
              >
                <Icon className={cn('w-4 h-4', isActive ? 'text-indigo-600' : 'text-slate-400')} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Global Quick Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {onOpenRecoveryModal && (
            <button
              onClick={onOpenRecoveryModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Cross-Table Recovery</span>
            </button>
          )}

          {onOpenDiscrepancyModal && (
            <button
              onClick={onOpenDiscrepancyModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors shadow-2xs"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Report Issue</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
