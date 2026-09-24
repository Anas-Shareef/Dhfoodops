'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { getAttendanceProvider } from '@/lib/attendance/provider';
import { MealAttendance, AttendanceCorrectionRequest } from '@/types/database';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateIST, formatTimeStringTo12H } from '@/lib/utils/timezone';
import { 
  CalendarCheck, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  RotateCcw, 
  RefreshCw,
  AlertCircle
} from 'lucide-react';

export default function StudentAttendanceHistoryPage() {
  const { user } = useAuth();
  const [history, setHistory] = useState<MealAttendance[]>([]);
  const [corrections, setCorrections] = useState<AttendanceCorrectionRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [mealFilter, setMealFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const student = user?.studentProfile || null;
  const studentId = student?.id || 'b1111111-1111-1111-1111-111111111111';

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const provider = getAttendanceProvider();

    const [attList, corrList] = await Promise.all([
      provider.getStudentAttendanceHistory(studentId, {
        mealType: mealFilter,
        status: statusFilter,
      }),
      provider.getStudentCorrectionRequests(studentId),
    ]);

    setHistory(attList);
    setCorrections(corrList);
    setIsLoading(false);
  }, [studentId, mealFilter, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-amber-500" />
            My Attendance History
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Complete historical record of submitted meal declarations and correction requests
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={loadData} isLoading={isLoading}>
          <RefreshCw className="w-4 h-4 mr-1.5" />
          Refresh History
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 bg-slate-50 border-slate-200">
        <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-700">
          <div className="flex items-center gap-1.5 font-bold text-slate-900">
            <Filter className="w-4 h-4 text-slate-500" />
            Filters:
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="meal-filter">Meal:</label>
            <select
              id="meal-filter"
              value={mealFilter}
              onChange={(e) => setMealFilter(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:border-slate-900 outline-none"
            >
              <option value="all">All Meals</option>
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="status-filter">Status:</label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:border-slate-900 outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="attending">Attending</option>
              <option value="not_attending">Not Attending</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Main Grid: Attendance Records + Correction Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Records List (2 Cols) */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Attendance Log ({history.length})
          </h2>

          {history.length === 0 && !isLoading ? (
            <Card className="p-8 text-center bg-white border-dashed">
              <AlertCircle className="w-7 h-7 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No attendance records found.</p>
              <p className="text-xs text-slate-500 mt-1">Submit meal attendance from today&apos;s meals dashboard.</p>
            </Card>
          ) : (
            history.map((record) => {
              const session = record.meal_session;
              const mealType = session?.meal_type || 'meal';
              const mealName = mealType.charAt(0).toUpperCase() + mealType.slice(1);

              return (
                <Card key={record.id} className="p-4 hover:border-slate-300 transition-colors">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                          record.status === 'attending'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {record.status === 'attending' ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <XCircle className="w-5 h-5" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-extrabold text-slate-900">{mealName}</h4>
                          <span className="text-xs text-slate-500">
                            ({formatDateIST(session?.session_date)})
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                          <span>Served: <strong>{formatTimeStringTo12H(session?.meal_time)}</strong></span>
                          <span>•</span>
                          <span>Submitted: {formatDateIST(record.submitted_at)}</span>
                        </div>
                      </div>
                    </div>

                    <Badge variant={record.status === 'attending' ? 'attending' : 'not_attending'}>
                      {record.status === 'attending' ? '✓ Attending' : '✕ Not Attending'}
                    </Badge>
                  </div>
                </Card>
              );
            })
          )}
        </div>

        {/* Correction Appeals Column (1 Col) */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <RotateCcw className="w-4 h-4 text-slate-500" />
            Correction Requests ({corrections.length})
          </h2>

          {corrections.length === 0 ? (
            <Card className="p-6 text-center bg-slate-50/70 border-dashed">
              <Clock className="w-6 h-6 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">No correction appeals submitted.</p>
              <p className="text-[11px] text-slate-500 mt-1">
                If you miss a cutoff window, you can request a late change from the meal card.
              </p>
            </Card>
          ) : (
            corrections.map((corr) => {
              const session = corr.meal_session;
              const mealName = session?.meal_type
                ? session.meal_type.charAt(0).toUpperCase() + session.meal_type.slice(1)
                : 'Meal';

              const statusVariant =
                corr.status === 'approved'
                  ? 'success'
                  : corr.status === 'rejected'
                  ? 'danger'
                  : 'warning';

              return (
                <Card key={corr.id} className="p-4 border-slate-200">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">
                        {mealName} ({session?.session_date})
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Requested: <strong className="text-slate-800">{corr.requested_status}</strong>
                      </span>
                    </div>

                    <Badge variant={statusVariant} size="sm">
                      {corr.status.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-50 text-xs text-slate-700 italic border border-slate-100">
                    &ldquo;{corr.reason}&rdquo;
                  </div>

                  <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
                    <span>Submitted: {formatDateIST(corr.created_at)}</span>
                    {corr.reviewed_at && <span>Reviewed</span>}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
