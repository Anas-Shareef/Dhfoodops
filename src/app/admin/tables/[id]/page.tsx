'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { getTableProvider } from '@/lib/tables/provider';
import { getAttendanceProvider } from '@/lib/attendance/provider';
import { DiningTable, TableMemberDetail, MealSession, Student } from '@/types/database';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoveStudentModal } from '@/components/admin/move-student-modal';
import { getTodayDateStringIST, formatTimeStringTo12H, formatDateIST } from '@/lib/utils/timezone';
import { 
  Utensils, 
  ArrowLeft, 
  MapPin, 
  Users, 
  School, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  ArrowRight,
  RefreshCw,
  Calendar
} from 'lucide-react';

export default function TableDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const tableId = resolvedParams.id;

  const [table, setTable] = useState<DiningTable | null>(null);
  const [allTables, setAllTables] = useState<DiningTable[]>([]);
  const [members, setMembers] = useState<TableMemberDetail[]>([]);
  const [sessions, setSessions] = useState<MealSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [movingStudent, setMovingStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const today = getTodayDateStringIST();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const tableProvider = getTableProvider();
    const attendanceProvider = getAttendanceProvider();

    // 1. Fetch table details
    const [tableData, tablesList, todaySessions] = await Promise.all([
      tableProvider.getTableById(tableId),
      tableProvider.getTables(),
      attendanceProvider.getDailySessions(today),
    ]);

    setTable(tableData);
    setAllTables(tablesList);
    setSessions(todaySessions);

    const activeSessionId = selectedSessionId || todaySessions[0]?.id || '';
    if (!selectedSessionId && todaySessions[0]) {
      setSelectedSessionId(todaySessions[0].id);
    }

    if (tableData) {
      const memberList = await tableProvider.getTableMembers(tableData.id, activeSessionId);
      setMembers(memberList);
    }

    setIsLoading(false);
  }, [tableId, today, selectedSessionId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!table && !isLoading) {
    return (
      <div className="text-center py-16 space-y-4">
        <h2 className="text-2xl font-black text-slate-900">Table Not Found</h2>
        <Link href="/admin/tables">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tables
          </Button>
        </Link>
      </div>
    );
  }

  // Compute Department Distribution (PRD Section 7: QS2 - 6, QS1 - 2)
  const deptCounts: Record<string, number> = {};
  for (const m of members) {
    deptCounts[m.department_code] = (deptCounts[m.department_code] || 0) + 1;
  }

  // Phase 1 Attendance Integration stats for this table
  const attendingCount = members.filter((m) => m.attendance_status === 'attending').length;
  const notAttendingCount = members.filter((m) => m.attendance_status === 'not_attending').length;
  const noResponseCount = members.filter((m) => m.attendance_status === 'no_response' || !m.attendance_status).length;

  const currentMembersCount = members.length;
  const isFull = currentMembersCount >= (table?.capacity ?? 8);
  const activeSession = sessions.find((s) => s.id === selectedSessionId) || sessions[0];
  const mealName = activeSession?.meal_type
    ? activeSession.meal_type.charAt(0).toUpperCase() + activeSession.meal_type.slice(1)
    : 'Breakfast';

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Back Button & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/tables">
            <Button variant="outline" size="sm" className="p-2.5">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Table {table?.table_number}
              </h1>
              <Badge variant={table?.status === 'Active' ? 'success' : 'neutral'}>
                {table?.status?.toUpperCase()}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{table?.dining_area?.name} • Floor: {table?.dining_area?.floor}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/admin/tables/seating">
            <Button variant="outline" size="sm">
              Seating Change Logs
            </Button>
          </Link>

          <Button variant="outline" size="sm" onClick={loadData} isLoading={isLoading}>
            <RefreshCw className="w-4 h-4 mr-1.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Table Metadata Cards (PRD Section 7) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 border-slate-200">
          <span className="text-xs font-semibold text-slate-500 block">Assigned Area</span>
          <span className="text-sm font-black text-slate-900 mt-1 block">
            {table?.dining_area?.name}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Section: {table?.dining_area?.section}</span>
        </Card>

        <Card className="p-4 border-slate-200">
          <span className="text-xs font-semibold text-slate-500 block">Capacity &amp; Occupancy</span>
          <span className="text-xl font-black text-slate-900 mt-1 block">
            {currentMembersCount} / {table?.capacity ?? 8} Members
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            {isFull ? '100% full capacity' : `${(table?.capacity ?? 8) - currentMembersCount} open seats`}
          </span>
        </Card>

        <Card className="p-4 border-slate-200 col-span-2 sm:col-span-2">
          <span className="text-xs font-semibold text-slate-500 block mb-1.5">
            Department Distribution
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {Object.entries(deptCounts).map(([code, count]) => (
              <span
                key={code}
                className="px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-200 text-xs font-extrabold text-sky-900"
              >
                {code} — {count} student{count === 1 ? '' : 's'}
              </span>
            ))}
            {Object.keys(deptCounts).length === 0 && (
              <span className="text-xs text-slate-400">No members currently assigned</span>
            )}
          </div>
        </Card>
      </div>

      {/* Phase 1 Attendance Integration Section (PRD Section 15 & 16) */}
      <Card className="p-5 border-indigo-100 bg-indigo-50/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-indigo-100">
          <div>
            <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider block">
              Phase 1 Attendance Cross-Integration
            </span>
            <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
              Live Attendance Snapshot for Table {table?.table_number}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Read-only attendance data directly sourced from Phase 1 attendance declarations
            </p>
          </div>

          {/* Meal Session Selector */}
          <div className="flex items-center gap-2">
            {sessions.map((sess) => (
              <button
                key={sess.id}
                onClick={() => setSelectedSessionId(sess.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedSessionId === sess.id
                    ? 'bg-indigo-900 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {sess.meal_type.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Attendance Metrics Bar */}
        <div className="grid grid-cols-3 gap-3 pt-4 text-center">
          <div className="p-3 bg-white rounded-xl border border-emerald-200 shadow-2xs">
            <span className="text-xs font-semibold text-emerald-800 flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Attending
            </span>
            <span className="text-2xl font-black text-emerald-900 block mt-1">
              {attendingCount}
            </span>
          </div>

          <div className="p-3 bg-white rounded-xl border border-rose-200 shadow-2xs">
            <span className="text-xs font-semibold text-rose-800 flex items-center justify-center gap-1.5">
              <XCircle className="w-4 h-4 text-rose-600" />
              Not Attending
            </span>
            <span className="text-2xl font-black text-rose-900 block mt-1">
              {notAttendingCount}
            </span>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-xs font-semibold text-slate-600 flex items-center justify-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-slate-400" />
              No Response
            </span>
            <span className="text-2xl font-black text-slate-800 block mt-1">
              {noResponseCount}
            </span>
          </div>
        </div>
      </Card>

      {/* Table Member Roster (PRD Section 7) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            Assigned Table Members ({members.length})
          </h2>
          <span className="text-xs text-slate-500">
            Click &ldquo;Move&rdquo; to transfer an assigned student to another table
          </span>
        </div>

        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3.5">Enrollment No</th>
                <th className="p-3.5">Student Name</th>
                <th className="p-3.5">Department</th>
                <th className="p-3.5">Year</th>
                <th className="p-3.5">{mealName} Attendance</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No students currently assigned to this table.
                  </td>
                </tr>
              ) : (
                members.map((m) => (
                  <tr key={m.student_id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-slate-700">
                      {m.enrollment_no}
                    </td>
                    <td className="p-3.5 font-extrabold text-slate-900">
                      {m.name}
                    </td>
                    <td className="p-3.5">
                      <span className="font-extrabold text-sky-900 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                        {m.department_code}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-600">
                      Year {m.year}
                    </td>
                    <td className="p-3.5">
                      <Badge
                        size="sm"
                        variant={
                          m.attendance_status === 'attending'
                            ? 'attending'
                            : m.attendance_status === 'not_attending'
                            ? 'not_attending'
                            : 'no_response'
                        }
                      >
                        {m.attendance_status === 'attending'
                          ? '✓ Attending'
                          : m.attendance_status === 'not_attending'
                          ? '✕ Not Attending'
                          : 'No Response'}
                      </Badge>
                    </td>
                    <td className="p-3.5 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setMovingStudent({
                            id: m.student_id,
                            auth_user_id: '',
                            enrollment_no: m.enrollment_no,
                            name: m.name,
                            email: '',
                            department_id: '',
                            department: { id: '', name: m.department_name, code: m.department_code, created_at: '' },
                            year: m.year,
                            table_number: table?.table_number ?? null,
                            status: 'active',
                            created_at: '',
                            updated_at: '',
                          });
                        }}
                        className="text-xs"
                      >
                        Move
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Move Student Modal Dialog */}
      <MoveStudentModal
        isOpen={Boolean(movingStudent)}
        onClose={() => setMovingStudent(null)}
        student={movingStudent}
        availableTables={allTables}
        onSuccess={loadData}
      />
    </div>
  );
}
