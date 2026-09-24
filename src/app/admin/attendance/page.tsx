'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getAttendanceProvider } from '@/lib/attendance/provider';
import { MealSession, Student, DepartmentAttendanceSummary, TableAttendanceSummary } from '@/types/database';
import { getTodayDateStringIST, formatDateIST } from '@/lib/utils/timezone';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarCheck, Filter, RefreshCw, Search } from 'lucide-react';

export default function AdminAttendanceMonitorPage() {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateStringIST());
  const [sessions, setSessions] = useState<MealSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [deptSummaries, setDeptSummaries] = useState<DepartmentAttendanceSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const provider = getAttendanceProvider();
    const dailySessions = await provider.getDailySessions(selectedDate);
    setSessions(dailySessions);

    const targetId = selectedSessionId || dailySessions[0]?.id || '';
    if (!selectedSessionId && dailySessions[0]) {
      setSelectedSessionId(dailySessions[0].id);
    }

    if (targetId) {
      const depts = await provider.getDepartmentAttendanceSummary(targetId);
      setDeptSummaries(depts);
    }
    setIsLoading(false);
  }, [selectedDate, selectedSessionId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Flatten all students from all departments
  const allStudents = deptSummaries.flatMap((dept) =>
    dept.students.map((st) => ({
      ...st,
      dept_code: dept.department_code,
      dept_name: dept.department_name,
    }))
  );

  const filteredStudents = allStudents.filter((st) => {
    const q = searchQuery.toLowerCase();
    return (
      st.name.toLowerCase().includes(q) ||
      st.enrollment_no.toLowerCase().includes(q) ||
      st.dept_code.toLowerCase().includes(q) ||
      (st.table_number && `table ${st.table_number}`.includes(q))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-indigo-600" />
            Live Attendance Monitor
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time individual and table-level verification across all departments
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="text-xs font-semibold px-3 py-2 bg-white border border-slate-300 rounded-xl focus:border-slate-900 outline-none"
          />

          <Button variant="outline" size="sm" onClick={loadData} isLoading={isLoading}>
            <RefreshCw className="w-4 h-4 mr-1.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Meal Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        {sessions.map((sess) => (
          <button
            key={sess.id}
            onClick={() => setSelectedSessionId(sess.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedSessionId === sess.id
                ? 'bg-indigo-900 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {sess.meal_type.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search by student name, enrollment no, department, or table..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:border-slate-900 outline-none"
        />
      </div>

      {/* Roster Table */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
            <tr>
              <th className="p-3.5">Student Name</th>
              <th className="p-3.5">Enrollment No</th>
              <th className="p-3.5">Department</th>
              <th className="p-3.5">Table Number</th>
              <th className="p-3.5 text-right">Attendance Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500">
                  No matching students found for this session.
                </td>
              </tr>
            ) : (
              filteredStudents.map((st) => (
                <tr key={st.student_id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="p-3.5 font-bold text-slate-900">{st.name}</td>
                  <td className="p-3.5 font-mono text-slate-600">{st.enrollment_no}</td>
                  <td className="p-3.5 text-slate-700">
                    <span className="font-semibold">{st.dept_code}</span> ({st.dept_name})
                  </td>
                  <td className="p-3.5 text-slate-800 font-medium">
                    {st.table_number ? (
                      <span className="bg-amber-50 text-amber-900 font-bold px-2 py-0.5 rounded-md border border-amber-200">
                        Table {st.table_number}
                      </span>
                    ) : (
                      'Unassigned'
                    )}
                  </td>
                  <td className="p-3.5 text-right">
                    <Badge
                      size="sm"
                      variant={
                        st.status === 'attending'
                          ? 'attending'
                          : st.status === 'not_attending'
                          ? 'not_attending'
                          : 'no_response'
                      }
                    >
                      {st.status === 'attending'
                        ? '✓ Attending'
                        : st.status === 'not_attending'
                        ? '✕ Not Attending'
                        : 'No Response'}
                    </Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
