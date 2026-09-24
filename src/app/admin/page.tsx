'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getAttendanceProvider } from '@/lib/attendance/provider';
import { 
  MealSummaryStats, 
  DepartmentAttendanceSummary, 
  TableAttendanceSummary,
  MealSession 
} from '@/types/database';
import { getTodayDateStringIST, formatDateIST } from '@/lib/utils/timezone';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { 
  LayoutDashboard, 
  Users, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  Coffee, 
  Sun, 
  Moon, 
  School, 
  Utensils, 
  RefreshCw,
  Eye
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateStringIST());
  const [sessions, setSessions] = useState<MealSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [summaryStats, setSummaryStats] = useState<MealSummaryStats[]>([]);
  const [deptSummaries, setDeptSummaries] = useState<DepartmentAttendanceSummary[]>([]);
  const [tableSummaries, setTableSummaries] = useState<TableAttendanceSummary[]>([]);
  const [activeDeptModal, setActiveDeptModal] = useState<DepartmentAttendanceSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const provider = getAttendanceProvider();

    // 1. Get daily sessions
    const dailySessions = await provider.getDailySessions(selectedDate);
    setSessions(dailySessions);

    // Default to first session (e.g. Breakfast)
    const targetSessionId = selectedSessionId || dailySessions[0]?.id || '';
    if (!selectedSessionId && dailySessions[0]) {
      setSelectedSessionId(dailySessions[0].id);
    }

    // 2. Load summaries
    const [stats, depts, tables] = await Promise.all([
      provider.getAdminDashboardSummary(selectedDate),
      targetSessionId ? provider.getDepartmentAttendanceSummary(targetSessionId) : [],
      targetSessionId ? provider.getTableAttendanceSummary(targetSessionId) : [],
    ]);

    setSummaryStats(stats);
    setDeptSummaries(depts);
    setTableSummaries(tables);
    setIsLoading(false);
  }, [selectedDate, selectedSessionId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeSession = sessions.find((s) => s.id === selectedSessionId) || sessions[0];
  const activeMealName = activeSession?.meal_type
    ? activeSession.meal_type.charAt(0).toUpperCase() + activeSession.meal_type.slice(1)
    : 'Breakfast';

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* 1. Header with Date Selector & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block">
            Administrative Operations
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 mt-0.5">
            <LayoutDashboard className="w-6 h-6 text-indigo-600" />
            Today&apos;s Operational Summary
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time meal attendance snapshots and kitchen preparation requirements
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:border-slate-900 outline-none"
          />

          <Button variant="outline" size="sm" onClick={loadData} isLoading={isLoading}>
            <RefreshCw className="w-4 h-4 mr-1.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* 2. Today's Meal Operational Summary Cards (PRD Section 27) */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
          Meal Summaries ({formatDateIST(selectedDate)})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {summaryStats.map((stat) => {
            const mealIcons: Record<string, typeof Coffee> = { 
              breakfast: Coffee, 
              lunch: Sun, 
              dinner: Moon,
              early_morning_snacks: Coffee,
              evening_snacks: Coffee,
              EARLY_MORNING_SNACKS: Coffee,
              BREAKFAST: Coffee,
              LUNCH: Sun,
              EVENING_SNACKS: Coffee,
              DINNER: Moon,
            };
            const Icon = mealIcons[stat.meal_type] || Coffee;
            const title = stat.meal_type.charAt(0).toUpperCase() + stat.meal_type.slice(1);

            return (
              <Card key={stat.meal_type} className="border-slate-200/90 shadow-xs hover:border-slate-300 transition-all">
                <CardHeader className="bg-slate-50/50 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-800 shadow-xs">
                      <Icon className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="font-black text-base text-slate-900">{title}</h3>
                      <span className="text-xs text-slate-500">Meal: {stat.meal_time}</span>
                    </div>
                  </div>
                  <Badge variant={stat.window_status === 'OPEN' ? 'success' : stat.window_status === 'CLOSED' ? 'danger' : 'neutral'}>
                    {stat.window_status}
                  </Badge>
                </CardHeader>

                <CardContent className="pt-4 space-y-4">
                  <div className="text-xs text-slate-500 font-medium">
                    Window: <strong className="text-slate-800">{stat.attendance_window}</strong>
                  </div>

                  {/* Operational Metrics Grid */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
                      <span className="text-xs font-semibold text-emerald-800 flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Attending
                      </span>
                      <span className="text-xl font-black text-emerald-900 block mt-1">
                        {stat.attending}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-100">
                      <span className="text-xs font-semibold text-rose-800 flex items-center justify-center gap-1">
                        <XCircle className="w-3.5 h-3.5 text-rose-600" /> Not Attending
                      </span>
                      <span className="text-xl font-black text-rose-900 block mt-1">
                        {stat.not_attending}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200">
                      <span className="text-xs font-semibold text-slate-600 flex items-center justify-center gap-1">
                        <HelpCircle className="w-3.5 h-3.5 text-slate-500" /> No Response
                      </span>
                      <span className="text-xl font-black text-slate-800 block mt-1">
                        {stat.no_response}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 font-medium text-slate-500">
                    <span>Total Students Registered:</span>
                    <span className="font-bold text-slate-900">{stat.total_students}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Meal Session Filter Selector for Breakdown Drill-downs */}
      <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          Inspect Breakdowns For Meal:
        </span>
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

      {/* 3. Department Breakdown (PRD Section 28) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <School className="w-5 h-5 text-sky-600" />
              Department Attendance Breakdown — {activeMealName}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any department row to view the detailed student roster
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {deptSummaries.map((dept) => {
            const attendRate = dept.total_students > 0 
              ? Math.round((dept.attending / dept.total_students) * 100) 
              : 0;

            return (
              <Card
                key={dept.department_id}
                onClick={() => setActiveDeptModal(dept)}
                className="p-4 hover:border-indigo-400 hover:shadow-md cursor-pointer transition-all border-slate-200 bg-white group"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-bold text-indigo-600 tracking-wider">
                      {dept.department_code}
                    </span>
                    <h4 className="text-sm font-black text-slate-900 leading-tight mt-0.5">
                      {dept.department_name}
                    </h4>
                  </div>
                  <div className="p-1 rounded-lg bg-slate-50 group-hover:bg-indigo-50 text-slate-400 group-hover:text-indigo-600 transition-colors">
                    <Eye className="w-4 h-4" />
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Attending:</span>
                    <span className="font-extrabold text-emerald-700">
                      {dept.attending} / {dept.total_students} ({attendRate}%)
                    </span>
                  </div>

                  {/* Mini Progress Bar */}
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden flex">
                    <div
                      style={{ width: `${attendRate}%` }}
                      className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>Not Attending: <strong>{dept.not_attending}</strong></span>
                    <span>No Response: <strong>{dept.no_response}</strong></span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* 4. Table Breakdown (PRD Section 29) */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Utensils className="w-5 h-5 text-amber-600" />
            Table-Level Attendance Mapping — {activeMealName}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Table allocations preparing data for Phase 2 seating and food quantity delivery
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {tableSummaries.map((tbl) => (
            <Card key={tbl.table_number} className="border-slate-200">
              <CardHeader className="bg-slate-50/70 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-base text-slate-900">
                    Table {tbl.table_number}
                  </h3>
                  <span className="text-xs text-slate-500">
                    {tbl.total_assigned} assigned students
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="attending" size="sm">
                    {tbl.attending} Attending
                  </Badge>
                  {tbl.not_attending > 0 && (
                    <Badge variant="not_attending" size="sm">
                      {tbl.not_attending} Absent
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-2">
                <div className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Assigned Members
                </div>

                <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto pr-1">
                  {tbl.members.map((member) => (
                    <div
                      key={member.student_id}
                      className="py-1.5 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{member.name}</span>
                        <span className="text-[11px] font-mono text-slate-400">
                          ({member.enrollment_no})
                        </span>
                      </div>

                      {member.status === 'attending' && (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          Attending
                        </span>
                      )}
                      {member.status === 'not_attending' && (
                        <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                          Not Attending
                        </span>
                      )}
                      {member.status === 'no_response' && (
                        <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          No Response
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* 5. Department Student Roster Inspection Modal */}
      {activeDeptModal && (
        <Modal
          isOpen={Boolean(activeDeptModal)}
          onClose={() => setActiveDeptModal(null)}
          title={`Department Roster — ${activeDeptModal.department_name} (${activeDeptModal.department_code})`}
          description={`Viewing students for ${activeMealName} attendance`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold">
              <div className="p-2 bg-emerald-50 text-emerald-800 rounded-lg">
                Attending: {activeDeptModal.attending}
              </div>
              <div className="p-2 bg-rose-50 text-rose-800 rounded-lg">
                Not Attending: {activeDeptModal.not_attending}
              </div>
              <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
                No Response: {activeDeptModal.no_response}
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="p-3">Student Name</th>
                    <th className="p-3">Enrollment</th>
                    <th className="p-3">Table</th>
                    <th className="p-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeDeptModal.students.map((st) => (
                    <tr key={st.student_id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-bold text-slate-900">{st.name}</td>
                      <td className="p-3 font-mono text-slate-600">{st.enrollment_no}</td>
                      <td className="p-3 text-slate-700">
                        {st.table_number ? `Table ${st.table_number}` : 'Unassigned'}
                      </td>
                      <td className="p-3 text-right">
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
                            ? 'Attending'
                            : st.status === 'not_attending'
                            ? 'Not Attending'
                            : 'No Response'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setActiveDeptModal(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
