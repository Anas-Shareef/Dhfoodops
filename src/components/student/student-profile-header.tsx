'use client';

import React from 'react';
import { Student } from '@/types/database';
import { Card } from '@/components/ui/card';
import { User, Hash, School, Utensils, MapPin } from 'lucide-react';

interface StudentProfileHeaderProps {
  student: Student | null;
}

export function StudentProfileHeader({ student }: StudentProfileHeaderProps) {
  // Institutional Greeting based on time of day
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  // Area text based on table number (e.g. Table 31 -> First Floor CHS Side)
  const diningArea = student?.table_number && student.table_number >= 31 && student.table_number <= 36
    ? 'First Floor CHS Side'
    : student?.table_number && student.table_number >= 21 && student.table_number <= 26
    ? 'First Floor Other Side'
    : student?.table_number && student.table_number >= 11 && student.table_number <= 16
    ? 'Ground Floor PG Side'
    : 'First Floor CHS Side';

  return (
    <Card className="p-5 sm:p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white border-0 shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold tracking-wider uppercase text-amber-400">
            {greeting}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-0.5 text-white">
            {student?.name || 'Muhammed'}
          </h1>
          <p className="text-xs text-slate-300 mt-1 flex items-center gap-1.5">
            <span>Registered Student • Academic Year {student?.year || 2}</span>
            <span>•</span>
            <span className="text-amber-300 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {diningArea}
            </span>
          </p>
        </div>

        {/* Info Grid (Enrollment, Dept, Table) */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 bg-white/10 backdrop-blur-xs rounded-xl p-2.5 sm:p-3 border border-white/10">
          <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-black/20 text-center">
            <div className="flex items-center gap-1 text-[11px] font-medium text-slate-300">
              <Hash className="w-3 h-3 text-amber-400" />
              <span>Enrollment</span>
            </div>
            <span className="text-sm sm:text-base font-extrabold text-white mt-0.5">
              {student?.enrollment_no || '16889'}
            </span>
          </div>

          <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-black/20 text-center">
            <div className="flex items-center gap-1 text-[11px] font-medium text-slate-300">
              <School className="w-3 h-3 text-sky-400" />
              <span>Dept</span>
            </div>
            <span className="text-sm sm:text-base font-extrabold text-white mt-0.5">
              {student?.department?.code || 'QS2'}
            </span>
          </div>

          <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-black/20 text-center">
            <div className="flex items-center gap-1 text-[11px] font-medium text-slate-300">
              <Utensils className="w-3 h-3 text-emerald-400" />
              <span>Table</span>
            </div>
            <span className="text-sm sm:text-base font-extrabold text-amber-300 mt-0.5">
              {student?.table_number ? `Table ${student.table_number}` : '31'}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
