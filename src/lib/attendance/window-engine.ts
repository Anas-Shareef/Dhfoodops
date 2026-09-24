// =====================================================================
// Attendance Window Engine
// Computes window states and enforces cutoff rules strictly in IST
// =====================================================================

import { MealSession, WindowStatus } from '@/types/database';
import { buildISTTimestamp, getNowInInstitutionalTime, formatTimeStringTo12H } from '@/lib/utils/timezone';

export interface WindowEvaluation {
  status: WindowStatus;
  badgeLabel: string;
  badgeVariant: 'warning' | 'success' | 'danger' | 'info' | 'neutral';
  description: string;
  isModifiable: boolean;
  canRequestCorrection: boolean;
  timeRemainingMs: number | null;
}

/**
 * Evaluates the live status of an attendance window for a meal session
 */
export function evaluateSessionWindow(session: MealSession, simulatedNow?: Date): WindowEvaluation {
  const now = simulatedNow ?? getNowInInstitutionalTime();
  const nowMs = now.getTime();

  const startMs = new Date(session.attendance_start_at).getTime();
  const endMs = new Date(session.attendance_end_at).getTime();

  // Meal time timestamp in IST
  const mealIso = buildISTTimestamp(session.session_date, session.meal_time);
  const mealMs = new Date(mealIso).getTime();
  const mealEndMs = mealMs + 60 * 60 * 1000; // 1 hour meal duration

  // Window State 1: NOT_OPEN
  if (nowMs < startMs) {
    const diffMins = Math.ceil((startMs - nowMs) / (60 * 1000));
    const countdown = diffMins > 60 
      ? `Opens at ${formatTimeStringTo12H(session.attendance_start_at.slice(11, 16))}` 
      : `Opens in ${diffMins} min${diffMins === 1 ? '' : 's'}`;

    return {
      status: 'NOT_OPEN',
      badgeLabel: 'Not Open',
      badgeVariant: 'neutral',
      description: countdown,
      isModifiable: false,
      canRequestCorrection: false,
      timeRemainingMs: startMs - nowMs,
    };
  }

  // Window State 2: OPEN
  if (nowMs >= startMs && nowMs <= endMs) {
    const remainingMins = Math.ceil((endMs - nowMs) / (60 * 1000));
    return {
      status: 'OPEN',
      badgeLabel: 'Attendance Open',
      badgeVariant: 'success',
      description: `Closes in ${remainingMins} min${remainingMins === 1 ? '' : 's'} (${formatTimeStringTo12H(session.attendance_end_at.slice(11, 16))})`,
      isModifiable: true,
      canRequestCorrection: false,
      timeRemainingMs: endMs - nowMs,
    };
  }

  // Window State 3: CLOSED (Cutoff passed, food preparation snapshot locked)
  if (nowMs > endMs && nowMs < mealMs) {
    return {
      status: 'CLOSED',
      badgeLabel: 'Attendance Closed',
      badgeVariant: 'danger',
      description: `Locked at ${formatTimeStringTo12H(session.attendance_end_at.slice(11, 16))}. Meal begins at ${formatTimeStringTo12H(session.meal_time)}.`,
      isModifiable: false,
      canRequestCorrection: true,
      timeRemainingMs: null,
    };
  }

  // Window State 4: MEAL_ACTIVE
  if (nowMs >= mealMs && nowMs < mealEndMs) {
    return {
      status: 'MEAL_ACTIVE',
      badgeLabel: 'Meal Active',
      badgeVariant: 'info',
      description: `Dining hall is currently serving ${session.meal_type}.`,
      isModifiable: false,
      canRequestCorrection: true,
      timeRemainingMs: null,
    };
  }

  // Window State 5: COMPLETED
  return {
    status: 'COMPLETED',
    badgeLabel: 'Completed',
    badgeVariant: 'neutral',
    description: `Meal service concluded.`,
    isModifiable: false,
    canRequestCorrection: true,
    timeRemainingMs: null,
  };
}

/**
 * Server-side check before updating or creating attendance records
 */
export function validateAttendanceSubmissionWindow(session: MealSession): { allowed: boolean; error?: string } {
  const evaluation = evaluateSessionWindow(session);

  if (!evaluation.isModifiable) {
    if (evaluation.status === 'NOT_OPEN') {
      return {
        allowed: false,
        error: 'Attendance window has not opened yet. Please check back at the scheduled opening time.',
      };
    }
    return {
      allowed: false,
      error: `Attendance is strictly locked for this meal. The cutoff was at ${formatTimeStringTo12H(session.attendance_end_at.slice(11, 16))}. You may submit a correction request instead.`,
    };
  }

  return { allowed: true };
}
