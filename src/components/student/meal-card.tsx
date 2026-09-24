'use client';

import React, { useState } from 'react';
import { MealSession, MealAttendance, AttendanceStatus } from '@/types/database';
import { evaluateSessionWindow } from '@/lib/attendance/window-engine';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { getAttendanceProvider } from '@/lib/attendance/provider';
import { formatTimeStringTo12H } from '@/lib/utils/timezone';
import { CorrectionModal } from './correction-modal';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Lock, 
  AlertCircle, 
  Coffee, 
  Sun, 
  Moon, 
  RotateCcw,
  Sparkles
} from 'lucide-react';

interface MealCardProps {
  session: MealSession;
  attendance: MealAttendance | null;
  studentId: string;
  onAttendanceChange: () => void;
}

export function MealCard({
  session,
  attendance,
  studentId,
  onAttendanceChange,
}: MealCardProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCorrectionOpen, setIsCorrectionOpen] = useState(false);
  const [simulatedState, setSimulatedState] = useState<'real' | 'force_open' | 'force_closed'>('real');
  const toast = useToast();

  // Evaluate Window based on real time or developer simulation toggle
  let windowEval = evaluateSessionWindow(session);
  if (simulatedState === 'force_open') {
    windowEval = {
      status: 'OPEN',
      badgeLabel: 'Attendance Open',
      badgeVariant: 'success',
      description: `Closes at ${formatTimeStringTo12H(session.attendance_end_at.slice(11, 16))}`,
      isModifiable: true,
      canRequestCorrection: false,
      timeRemainingMs: 15 * 60 * 1000,
    };
  } else if (simulatedState === 'force_closed') {
    windowEval = {
      status: 'CLOSED',
      badgeLabel: 'Attendance Closed',
      badgeVariant: 'danger',
      description: `Cutoff passed at ${formatTimeStringTo12H(session.attendance_end_at.slice(11, 16))}. Official snapshot locked.`,
      isModifiable: false,
      canRequestCorrection: true,
      timeRemainingMs: null,
    };
  }

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
  const MealIcon = mealIcons[session.meal_type] || Coffee;
  const mealName = session.meal_type.charAt(0).toUpperCase() + session.meal_type.slice(1);

  const handleAttendanceSubmit = async (status: AttendanceStatus) => {
    setIsSubmitting(true);
    const provider = getAttendanceProvider();

    try {
      const res = await provider.submitAttendance(session.id, studentId, status);
      if (res.success) {
        toast.success(
          status === 'attending'
            ? `✓ ${mealName} attendance confirmed: Attending`
            : `✓ ${mealName} attendance marked: Not Attending`
        );
        onAttendanceChange();
      } else {
        toast.error(res.error || 'Failed to update attendance');
      }
    } catch {
      toast.error('Network or database error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentStatus = attendance?.status;

  return (
    <>
      <Card className="flex flex-col border border-slate-200/80 hover:border-slate-300 shadow-xs hover:shadow-md transition-all">
        {/* Card Header */}
        <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-800 shadow-xs">
              <MealIcon className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                {mealName}
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-0.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Meal Time: <strong className="text-slate-900">{formatTimeStringTo12H(session.meal_time)}</strong></span>
              </div>
            </div>
          </div>

          <Badge variant={windowEval.badgeVariant}>
            {windowEval.badgeLabel}
          </Badge>
        </div>

        {/* Card Body */}
        <div className="p-5 flex-1 flex flex-col justify-between gap-5">
          {/* Attendance Window Details */}
          <div className="rounded-xl p-3.5 bg-slate-50 border border-slate-200 text-xs flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-slate-600 font-medium">
              <span>Attendance Window:</span>
              <span className="font-bold text-slate-900">
                {formatTimeStringTo12H(session.attendance_start_at.slice(11, 16))} – {formatTimeStringTo12H(session.attendance_end_at.slice(11, 16))}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-1">
              <span className="font-medium text-slate-700">{windowEval.description}</span>
            </div>
          </div>

          {/* Current Selection Status Display */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Your Current Status
            </span>
            {currentStatus === 'attending' && (
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Attending</span>
                <span className="text-xs font-normal text-slate-500 ml-auto">
                  Confirmed
                </span>
              </div>
            )}
            {currentStatus === 'not_attending' && (
              <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                <XCircle className="w-5 h-5 text-rose-600" />
                <span>Not Attending</span>
                <span className="text-xs font-normal text-slate-500 ml-auto">
                  Confirmed
                </span>
              </div>
            )}
            {!currentStatus && (
              <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                <AlertCircle className="w-4 h-4 text-slate-400" />
                <span>No declaration yet</span>
              </div>
            )}
          </div>

          {/* Action Area based on Window State */}
          <div className="pt-2">
            {/* STATE 1: NOT OPEN */}
            {windowEval.status === 'NOT_OPEN' && (
              <div className="space-y-2">
                <Button variant="secondary" className="w-full text-slate-400 cursor-not-allowed" disabled>
                  <Lock className="w-4 h-4 mr-2" />
                  Not Available Yet
                </Button>
                <p className="text-[11px] text-center text-slate-500">
                  Attendance opens at {formatTimeStringTo12H(session.attendance_start_at.slice(11, 16))}
                </p>
              </div>
            )}

            {/* STATE 2: OPEN */}
            {windowEval.status === 'OPEN' && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-700 text-center mb-2">
                  Will you have {session.meal_type}?
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  <Button
                    variant={currentStatus === 'attending' ? 'success' : 'outline'}
                    className={`w-full py-3 ${
                      currentStatus === 'attending'
                        ? 'ring-2 ring-emerald-600 ring-offset-1'
                        : 'hover:border-emerald-600 hover:text-emerald-700'
                    }`}
                    onClick={() => handleAttendanceSubmit('attending')}
                    isLoading={isSubmitting}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1 text-emerald-600" />
                    I&apos;ll Attend
                  </Button>

                  <Button
                    variant={currentStatus === 'not_attending' ? 'danger' : 'outline'}
                    className={`w-full py-3 ${
                      currentStatus === 'not_attending'
                        ? 'ring-2 ring-rose-600 ring-offset-1'
                        : 'hover:border-rose-600 hover:text-rose-700'
                    }`}
                    onClick={() => handleAttendanceSubmit('not_attending')}
                    isLoading={isSubmitting}
                  >
                    <XCircle className="w-4 h-4 mr-1 text-rose-600" />
                    I Won&apos;t Attend
                  </Button>
                </div>
                {currentStatus && (
                  <p className="text-[11px] text-center text-slate-500 mt-1">
                    You can change your decision freely until {formatTimeStringTo12H(session.attendance_end_at.slice(11, 16))}.
                  </p>
                )}
              </div>
            )}

            {/* STATE 3, 4, 5: CLOSED / MEAL ACTIVE / COMPLETED */}
            {windowEval.status !== 'NOT_OPEN' && windowEval.status !== 'OPEN' && (
              <div className="space-y-2.5">
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <Lock className="w-3.5 h-3.5 text-rose-600" />
                    <span>Attendance Cutoff Passed</span>
                  </div>
                  <span className="text-[11px] text-rose-600 font-mono">
                    Locked
                  </span>
                </div>

                <Button
                  variant="outline"
                  className="w-full text-slate-700 hover:bg-slate-100"
                  onClick={() => setIsCorrectionOpen(true)}
                >
                  <RotateCcw className="w-4 h-4 mr-1.5 text-slate-500" />
                  Request Correction
                </Button>
              </div>
            )}

            {/* Demo Testing Helper: Simulation pill */}
            <div className="mt-4 pt-3 border-t border-dashed border-slate-200 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                Demo Window Tester:
              </span>
              <div className="flex items-center gap-1 font-semibold">
                <button
                  onClick={() => setSimulatedState('real')}
                  className={`px-1.5 py-0.5 rounded ${
                    simulatedState === 'real' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                  title="Use real institutional clock"
                >
                  Live
                </button>
                <button
                  onClick={() => setSimulatedState('force_open')}
                  className={`px-1.5 py-0.5 rounded ${
                    simulatedState === 'force_open' ? 'bg-emerald-700 text-white' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                  title="Simulate active attendance window"
                >
                  Test Open
                </button>
                <button
                  onClick={() => setSimulatedState('force_closed')}
                  className={`px-1.5 py-0.5 rounded ${
                    simulatedState === 'force_closed' ? 'bg-rose-700 text-white' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                  title="Simulate cutoff closed"
                >
                  Test Cutoff
                </button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <CorrectionModal
        isOpen={isCorrectionOpen}
        onClose={() => setIsCorrectionOpen(false)}
        session={session}
        studentId={studentId}
        onSuccess={onAttendanceChange}
      />
    </>
  );
}
