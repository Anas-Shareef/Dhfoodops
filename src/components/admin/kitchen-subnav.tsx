'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { 
  ChefHat, 
  Flame, 
  RotateCcw, 
  BookOpen, 
  HeartHandshake, 
  Plus 
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface KitchenSubnavProps {
  onOpenNewOrderModal?: () => void;
}

export function KitchenSubnav({ onOpenNewOrderModal }: KitchenSubnavProps) {
  const pathname = usePathname();

  const navItems = [
    { label: "Today's Kitchen", href: '/admin/kitchen', icon: ChefHat, exact: true },
    { label: 'Special & Party Orders', href: '/admin/kitchen/special-orders', icon: RotateCcw },
    { label: 'Published Weekly Menu', href: '/admin/meals/menu', icon: BookOpen },
    { label: 'Food Surplus & Donations', href: '/admin/meals/leftovers', icon: HeartHandshake },
  ];

  return (
    <div className="bg-white border-b border-slate-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-2">
        <nav className="flex space-x-2 sm:space-x-4 overflow-x-auto scrollbar-none" aria-label="Kitchen Operational Subnavigation">
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
                    ? 'bg-amber-50 text-amber-900 border border-amber-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                )}
              >
                <Icon className={cn('w-4 h-4', isActive ? 'text-amber-600' : 'text-slate-400')} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {onOpenNewOrderModal && (
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              onClick={onOpenNewOrderModal}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              New Special Order
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
