'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { MealCard } from '@/components/student/meal-card';
import { TodayMenuCard } from '@/components/student/today-menu-card';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getAttendanceProvider } from '@/lib/attendance/provider';
import { MealSession, MealAttendance } from '@/types/database';
import { getTodayDateStringIST, formatDateIST } from '@/lib/utils/timezone';
import { Utensils, RefreshCw, Info } from 'lucide-react';

export default function StudentMealsPage() {
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Utensils className="w-6 h-6 text-amber-500" />
            Meals & Attendance Declaration
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Active daily meal sessions for <span className="font-bold text-slate-800">{formatDateIST(today)}</span>
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={loadData} isLoading={isLoading}>
          <RefreshCw className="w-4 h-4 mr-1.5" />
          Refresh
        </Button>
      </div>

      {/* Today's Meals Menu Card (PRD Section 15, 19, 46) */}
      <TodayMenuCard />

      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="block font-bold">Important Attendance Notice</strong>
          Please declare your attendance during the configured window for each meal. If you miss the cutoff, the window will lock automatically and you must submit a correction appeal for administrative review.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
  );
}
