'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Utensils, CalendarCheck, ShieldCheck, UserCircle } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const navItems = [
  { label: 'Dashboard', href: '/student', icon: LayoutDashboard },
  { label: 'Meals', href: '/student/meals', icon: Utensils },
  { label: 'Attendance', href: '/student/attendance', icon: CalendarCheck },
  { label: 'Duties', href: '/student/duties', icon: ShieldCheck },
  { label: 'Profile', href: '/student/profile', icon: UserCircle },
];

export function StudentNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop Sub-nav Bar */}
      <div className="hidden sm:block border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8" aria-label="Student Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === '/student'
                  ? pathname === '/student'
                  : pathname?.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 py-3.5 px-1 border-b-2 text-sm font-semibold transition-colors',
                    isActive
                      ? 'border-slate-900 text-slate-900'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  )}
                >
                  <Icon className={cn('w-4 h-4', isActive ? 'text-slate-900' : 'text-slate-400')} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Mobile Fixed Bottom Navigation Bar (PRD Section 38 & 40) */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg">
        <div className="grid grid-cols-5 h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/student'
                ? pathname === '/student'
                : pathname?.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors',
                  isActive ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'
                )}
              >
                <div
                  className={cn(
                    'p-1 rounded-xl transition-colors',
                    isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-400'
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
