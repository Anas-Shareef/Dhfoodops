'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Clock, 
  CalendarCheck, 
  RotateCcw, 
  Users,
  Utensils,
  ClipboardList,
  ChefHat,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const adminNavItems = [
  { label: 'Operational Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Kitchen Operations', href: '/admin/kitchen', icon: ChefHat },
  { label: 'Special Orders', href: '/admin/kitchen/special-orders', icon: RotateCcw },
  { label: 'Tables & Seating', href: '/admin/tables', icon: Utensils },
  { label: 'Supplier Duties', href: '/admin/suppliers', icon: ClipboardList },
  { label: 'Food Planning', href: '/admin/meals', icon: CalendarCheck },
  { label: 'Utensil Tracking', href: '/admin/utensils', icon: ShieldCheck },
  { label: 'Attendance Monitor', href: '/admin/attendance', icon: CalendarCheck },
  { label: 'Corrections Queue', href: '/admin/corrections', icon: RotateCcw },
  { label: 'Student Directory', href: '/admin/students', icon: Users },
  { label: 'Users & Roles', href: '/admin/users', icon: UserCheck },
  { label: 'Security Audit', href: '/admin/audit', icon: ShieldCheck },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-6 overflow-x-auto scrollbar-none" aria-label="Admin Navigation">
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/admin'
                ? pathname === '/admin'
                : pathname?.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 py-3.5 px-1 border-b-2 text-sm font-semibold transition-colors shrink-0',
                  isActive
                    ? 'border-indigo-600 text-indigo-900'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                )}
              >
                <Icon className={cn('w-4 h-4', isActive ? 'text-indigo-600' : 'text-slate-400')} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
