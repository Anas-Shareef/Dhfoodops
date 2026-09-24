'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getAttendanceProvider } from '@/lib/attendance/provider';
import { Student } from '@/types/database';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Search, RefreshCw, Mail, Hash, School, Utensils } from 'lucide-react';

export default function AdminStudentsDirectoryPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadStudents = useCallback(async () => {
    setIsLoading(true);
    const provider = getAttendanceProvider();
    const data = await provider.getAllStudents();
    setStudents(data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const filtered = students.filter((s) => {
    const q = searchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.enrollment_no.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      (s.table_number && `table ${s.table_number}`.includes(q))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            Institutional Student Directory
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Registered students roster with academic departments and assigned dining tables
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={loadStudents} isLoading={isLoading}>
          <RefreshCw className="w-4 h-4 mr-1.5" />
          Refresh Directory
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search by student name, enrollment no, email, or table..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:border-slate-900 outline-none"
        />
      </div>

      {/* Directory Table */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
            <tr>
              <th className="p-3.5">Student</th>
              <th className="p-3.5">Enrollment No</th>
              <th className="p-3.5">Email (Read-Only)</th>
              <th className="p-3.5">Department</th>
              <th className="p-3.5">Assigned Table</th>
              <th className="p-3.5 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                <td className="p-3.5 font-bold text-slate-900">
                  {s.name}
                  <span className="block text-[10px] text-slate-400 font-normal">
                    Year {s.year}
                  </span>
                </td>
                <td className="p-3.5 font-mono text-slate-700 font-semibold">
                  {s.enrollment_no}
                </td>
                <td className="p-3.5 text-slate-600 font-mono">
                  {s.email}
                </td>
                <td className="p-3.5">
                  <span className="font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                    {s.department?.code || 'QS2'}
                  </span>
                </td>
                <td className="p-3.5">
                  {s.table_number ? (
                    <span className="font-extrabold text-amber-900 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                      Table {s.table_number}
                    </span>
                  ) : (
                    <span className="text-slate-400">Unassigned</span>
                  )}
                </td>
                <td className="p-3.5 text-right">
                  <Badge size="sm" variant={s.status === 'active' ? 'success' : 'neutral'}>
                    {s.status.toUpperCase()}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
