'use client';

import React from 'react';
import Link from 'next/link';
import { DiningTable } from '@/types/database';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Utensils, Users, ArrowRight, MapPin, Eye } from 'lucide-react';

interface TableCardProps {
  table: DiningTable;
  onQuickMove?: (table: DiningTable) => void;
}

export function TableCard({ table, onQuickMove }: TableCardProps) {
  const currentCount = table.current_members_count ?? 0;
  const isFull = currentCount >= table.capacity;
  const availableSeats = Math.max(0, table.capacity - currentCount);
  const occupancyRate = Math.round((currentCount / table.capacity) * 100);

  return (
    <Card className="border-slate-200/90 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between">
      <div>
        <CardHeader className="bg-slate-50/50 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-sm shadow-xs">
              {table.table_number}
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                Table {table.table_number}
              </h3>
              <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                <MapPin className="w-3 h-3 text-slate-400" />
                <span>{table.dining_area?.name || 'Dining Area'}</span>
              </div>
            </div>
          </div>

          <Badge
            size="sm"
            variant={
              table.status === 'Active'
                ? isFull
                  ? 'attending'
                  : 'info'
                : 'neutral'
            }
          >
            {table.status !== 'Active'
              ? table.status.toUpperCase()
              : isFull
              ? 'FULL (8/8)'
              : `${availableSeats} SEAT${availableSeats === 1 ? '' : 'S'} OPEN`}
          </Badge>
        </CardHeader>

        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Assigned Members:</span>
            <span className="font-extrabold text-slate-900">
              {currentCount} / {table.capacity} students
            </span>
          </div>

          {/* Occupancy Progress Bar */}
          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden flex">
            <div
              style={{ width: `${occupancyRate}%` }}
              className={`h-full rounded-full transition-all duration-300 ${
                isFull ? 'bg-emerald-600' : 'bg-sky-500'
              }`}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
            <span>Floor: <strong>{table.dining_area?.floor || '1st'}</strong></span>
            <span>Section: <strong>{table.dining_area?.section || 'CHS'}</strong></span>
          </div>
        </CardContent>
      </div>

      <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
        <Link href={`/admin/tables/${table.id}`} className="flex-1">
          <Button variant="outline" size="sm" className="w-full text-xs font-semibold">
            <Eye className="w-3.5 h-3.5 mr-1 text-slate-500" />
            View Table Roster
          </Button>
        </Link>

        {onQuickMove && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onQuickMove(table)}
            className="text-xs text-indigo-700 hover:bg-indigo-50"
          >
            Move Here
          </Button>
        )}
      </div>
    </Card>
  );
}
