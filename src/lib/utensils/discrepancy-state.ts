// =====================================================================
// Phase 7: Utensil Discrepancy State Machine Validator
// Enforces PRD Section 9, 10, 43 & 44:
// Strict transition rules, role-based authorization, and reopening safety.
// =====================================================================

import { DiscrepancyStatus, UserRole } from '@/types/database';

export const ALLOWED_DISCREPANCY_TRANSITIONS: Record<DiscrepancyStatus, DiscrepancyStatus[]> = {
  UNRESOLVED: ['MISSING', 'MISPLACED', 'DAMAGED', 'BROKEN', 'OVERAGE', 'RESOLVED'],
  MISSING: ['FOUND', 'RECOVERED', 'RESOLVED'],
  MISPLACED: ['FOUND', 'RETURNED', 'RECOVERED', 'RESOLVED'],
  FOUND: ['RETURNED', 'RECOVERED', 'RESOLVED'],
  RETURNED: ['RECOVERED', 'RESOLVED'],
  DAMAGED: ['REPAIR_REQUIRED', 'DISCARDED', 'IN_SERVICE', 'RESOLVED'],
  BROKEN: ['REPAIR_REQUIRED', 'DISCARDED', 'RESOLVED'],
  REPAIR_REQUIRED: ['UNDER_REPAIR', 'DISCARDED', 'IN_SERVICE', 'RESOLVED'],
  UNDER_REPAIR: ['RETURNED_FROM_REPAIR', 'DISCARDED', 'IN_SERVICE', 'RESOLVED'],
  RETURNED_FROM_REPAIR: ['IN_SERVICE', 'RESOLVED'],
  IN_SERVICE: ['RESOLVED'],
  OVERAGE: ['RETURNED', 'RESOLVED'],
  RECOVERED: ['RESOLVED'],
  DISCARDED: ['RESOLVED'],
  RESOLVED: ['UNRESOLVED'], // Reopening requires authorized supervisor with reason
};

/**
 * Checks if a transition between two discrepancy states is logically valid.
 */
export function isValidDiscrepancyTransition(
  from: DiscrepancyStatus,
  to: DiscrepancyStatus
): boolean {
  if (from === to) return true;
  const allowed = ALLOWED_DISCREPANCY_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

/**
 * Validates transition and throws detailed error if invalid (e.g. DISCARDED -> RECOVERED)
 */
export function validateDiscrepancyTransitionOrThrow(
  from: DiscrepancyStatus,
  to: DiscrepancyStatus
): void {
  if (!isValidDiscrepancyTransition(from, to)) {
    throw new Error(
      `Invalid utensil discrepancy transition from "${from}" to "${to}". Permitted next states: [${(
        ALLOWED_DISCREPANCY_TRANSITIONS[from] || []
      ).join(', ')}]`
    );
  }
}

/**
 * Validates if the user role is authorized to perform the requested transition.
 * Suppliers can report issues and mark found/returned.
 * Only Supervisors and Admins can approve disposal, confirm recovery, or resolve/reopen.
 */
export function isAuthorizedForTransition(
  role: UserRole | string,
  targetStatus: DiscrepancyStatus
): { authorized: boolean; reason?: string } {
  const isSupervisorOrAdmin = role === 'ADMIN' || role === 'SUPERVISOR';

  // Privileged actions reserved for Supervisors and Admins
  if (targetStatus === 'DISCARDED') {
    if (!isSupervisorOrAdmin) {
      return { authorized: false, reason: 'Only authorized supervisors or dining administrators can approve utensil disposal.' };
    }
  }

  if (targetStatus === 'RECOVERED' || targetStatus === 'RESOLVED') {
    if (!isSupervisorOrAdmin) {
      return { authorized: false, reason: 'Only authorized supervisors can confirm final utensil recovery or close a discrepancy.' };
    }
  }

  if (targetStatus === 'UNRESOLVED') {
    // Reopening
    if (!isSupervisorOrAdmin) {
      return { authorized: false, reason: 'Only authorized supervisors can reopen a resolved discrepancy.' };
    }
  }

  return { authorized: true };
}
