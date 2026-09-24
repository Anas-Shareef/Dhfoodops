'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getAttendanceProvider } from '@/lib/attendance/provider';
import { AttendanceCorrectionRequest } from '@/types/database';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/lib/auth/auth-context';
import { formatDateIST, formatTimeStringTo12H } from '@/lib/utils/timezone';
import { RotateCcw, Check, X, Clock, AlertCircle, RefreshCw, User } from 'lucide-react';

export default function AdminCorrectionsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<AttendanceCorrectionRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const toast = useToast();

  const loadRequests = useCallback(async () => {
    setIsLoading(true);
    const provider = getAttendanceProvider();
    const data = await provider.getPendingCorrectionRequests();
    setRequests(data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleReview = async (requestId: string, decision: 'approved' | 'rejected') => {
    setProcessingId(requestId);
    const provider = getAttendanceProvider();
    const reviewerId = user?.id || 'a0000000-0000-0000-0000-000000000001';

    const result = await provider.reviewCorrectionRequest(requestId, reviewerId, decision);
    setProcessingId(null);

    if (result.success) {
      toast.success(`Request ${decision === 'approved' ? 'Approved' : 'Rejected'} successfully.`);
      loadRequests();
    } else {
      toast.error(result.error || 'Failed to process request.');
    }
  };

  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const pastRequests = requests.filter((r) => r.status !== 'pending');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <RotateCcw className="w-6 h-6 text-indigo-600" />
            Attendance Correction Queue
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Review and adjudicate post-cutoff student attendance modification requests
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={loadRequests} isLoading={isLoading}>
          <RefreshCw className="w-4 h-4 mr-1.5" />
          Refresh Queue
        </Button>
      </div>

      {/* Pending Appeals */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <span>Pending Appeals</span>
          <Badge variant="warning" size="sm">
            {pendingRequests.length} Pending
          </Badge>
        </h2>

        {pendingRequests.length === 0 && !isLoading && (
          <Card className="p-8 text-center bg-slate-50 border-dashed">
            <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No pending correction requests.</p>
            <p className="text-xs text-slate-500 mt-1">Any late appeals submitted by students will appear here.</p>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {pendingRequests.map((req) => {
            const student = req.student;
            const session = req.meal_session;
            const mealTitle = session?.meal_type
              ? session.meal_type.charAt(0).toUpperCase() + session.meal_type.slice(1)
              : 'Meal';

            return (
              <Card key={req.id} className="border-amber-200 bg-amber-50/20">
                <CardHeader className="bg-amber-50/60 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900">{student?.name || 'Student'}</h4>
                      <span className="text-[11px] text-slate-500">
                        Enrollment: <strong className="text-slate-700">{student?.enrollment_no}</strong> • Table {student?.table_number || '31'}
                      </span>
                    </div>
                  </div>
                  <Badge variant="warning" size="sm">
                    PENDING REVIEW
                  </Badge>
                </CardHeader>

                <CardContent className="p-4 space-y-3">
                  <div className="text-xs text-slate-600 flex items-center justify-between">
                    <span>Target Meal: <strong>{mealTitle}</strong> ({session?.session_date})</span>
                    <span>Requested: <strong className={req.requested_status === 'attending' ? 'text-emerald-700' : 'text-rose-700'}>{req.requested_status.toUpperCase()}</strong></span>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 italic leading-relaxed">
                    &ldquo;{req.reason}&rdquo;
                  </div>

                  <div className="text-[10px] text-slate-400">
                    Submitted: {formatDateIST(req.created_at)}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                    <Button
                      variant="danger"
                      size="sm"
                      isLoading={processingId === req.id}
                      onClick={() => handleReview(req.id, 'rejected')}
                    >
                      <X className="w-3.5 h-3.5 mr-1" />
                      Reject
                    </Button>
                    <Button
                      variant="success"
                      size="sm"
                      isLoading={processingId === req.id}
                      onClick={() => handleReview(req.id, 'approved')}
                    >
                      <Check className="w-3.5 h-3.5 mr-1" />
                      Approve &amp; Update
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Historical Resolved Appeals */}
      {pastRequests.length > 0 && (
        <div className="space-y-3 pt-6 border-t border-slate-200">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
            Past Adjudicated Appeals ({pastRequests.length})
          </h2>

          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Student</th>
                  <th className="p-3">Meal</th>
                  <th className="p-3">Requested</th>
                  <th className="p-3">Reason</th>
                  <th className="p-3 text-right">Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pastRequests.map((req) => (
                  <tr key={req.id}>
                    <td className="p-3 font-bold text-slate-900">{req.student?.name}</td>
                    <td className="p-3 text-slate-600">{req.meal_session?.meal_type}</td>
                    <td className="p-3 font-semibold text-slate-800">{req.requested_status}</td>
                    <td className="p-3 text-slate-500 italic max-w-xs truncate">{req.reason}</td>
                    <td className="p-3 text-right">
                      <Badge size="sm" variant={req.status === 'approved' ? 'success' : 'danger'}>
                        {req.status.toUpperCase()}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
