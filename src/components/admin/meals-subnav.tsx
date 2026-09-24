'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChefHat, Clock, Utensils, Archive, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const mealsNavTabs = [
  { label: "Today's Food Operations", href: '/admin/meals', icon: ChefHat, exact: true },
  { label: 'Weekly Meal Menu', href: '/admin/meals/menu', icon: CalendarDays },
  { label: 'Meal Schedules', href: '/admin/meals/schedules', icon: Clock },
  { label: 'Food Items & Factors', href: '/admin/meals/items', icon: Utensils },
  { label: 'Leftover & Surplus Log', href: '/admin/meals/leftovers', icon: Archive },
];

export function MealsSubnav() {
  const pathname = usePathname();

  return (
    <div className="flex border-b border-slate-200 gap-2 mb-6">
      {mealsNavTabs.map((tab) => {
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
