'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { StudentProfileHeader } from '@/components/student/student-profile-header';
import { TodayMenuCard } from '@/components/student/today-menu-card';
import { MealCard } from '@/components/student/meal-card';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { getAttendanceProvider } from '@/lib/attendance/provider';
import { MealSession, MealAttendance } from '@/types/database';
import { getTodayDateStringIST, formatDateIST } from '@/lib/utils/timezone';
import { Calendar, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<MealSession[]>([]);
  const [attendance, setAttendance] = useState<MealAttendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const student = user?.studentProfile || null;
  const studentId = student?.id || 'b1111111-1111-1111-1111-111111111111';
  const today = getTodayDateStringIST();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const provider = getAttendanceProvider();
    const todaySessions = await provider.getDailySessions(today);
    setSessions(todaySessions);

    const sessionIds = todaySessions.map((s) => s.id);
    const studentAtt = await provider.getStudentAttendanceForSessions(studentId, sessionIds);
    setAttendance(studentAtt);
    setIsLoading(false);
  }, [today, studentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* 1. Student Identity Banner (PRD Section 24) */}
      <StudentProfileHeader student={student} />

      {/* 2. Today's Meals Menu Card (PRD Section 15, 19, 46) */}
      <TodayMenuCard />

      {/* 3. Today's Meals Attendance Declaration Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-500" />
              Today&apos;s Meal Schedule
            </h2>
            <p className="text-xs text-slate-500">
              Institutional Date: <span className="font-semibold text-slate-700">{formatDateIST(today)}</span> • Asia/Kolkata
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            isLoading={isLoading}
            className="self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Refresh Schedule
          </Button>
        </div>

        {sessions.length === 0 && !isLoading && (
          <Card className="p-8 text-center bg-slate-50 border-dashed">
            <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No meals scheduled for today.</p>
            <p className="text-xs text-slate-500 mt-1">Please check back later or contact the dining supervisor.</p>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {sessions.map((session) => {
            const currentAtt = attendance.find((a) => a.meal_session_id === session.id) || null;
            return (
              <MealCard
                key={session.id}
                session={session}
                attendance={currentAtt}
                studentId={studentId}
                onAttendanceChange={loadData}
              />
            );
          })}
        </div>
      </div>

      {/* 3. Quick Dining Guidelines Notice */}
      <Card className="bg-slate-900 text-slate-200 p-5 border-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              Institutional Dining Rule
            </span>
            <h4 className="text-sm font-bold text-white">
              Official Attendance Snapshot & Cutoff Times
            </h4>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Attendance must be submitted during the specified opening window for each meal. Once the window locks at cutoff time, your declared status is used for kitchen preparation and table allocation.
            </p>
          </div>
          <div className="text-right sm:border-l sm:border-slate-800 sm:pl-6 shrink-0">
            <span className="text-xs text-slate-400 block">Assigned Table</span>
            <span className="text-2xl font-black text-amber-400">
              Table {student?.table_number || 31}
            </span>
          </div>
        </div>
      </Card>

      {/* 4. Table Utensil & Supplier Information (PRD Phase 5 Section 23: Read-Only) */}
      <Card className="bg-white border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black">
              {student?.table_number || 31}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-slate-900">
                  My Table: Table {student?.table_number || 31}
                </span>
                <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200">
                  Read-Only (Section 23)
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Today&apos;s Duty Supplier: <strong className="text-slate-800">Ijas K</strong> • Standard Table Inventory: 8 Plates, 8 Glasses, 1 Jug
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Utensil Status: Verified
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
