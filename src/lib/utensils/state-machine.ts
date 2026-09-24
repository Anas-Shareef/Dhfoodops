// =====================================================================
// Phase 5: Shelf State Machine Validator
// Enforces PRD Section 7 & 18:
// LOCKED -> OPENED -> DISTRIBUTING -> COLLECTING -> VERIFYING -> LOCKED / DISCREPANCY
// =====================================================================

import { ShelfOperationStatus } from '@/types/database';

export const ALLOWED_TRANSITIONS: Record<ShelfOperationStatus, ShelfOperationStatus[]> = {
  LOCKED: ['OPENED'],
  OPENED: ['DISTRIBUTING'],
  DISTRIBUTING: ['COLLECTING'],
  COLLECTING: ['VERIFYING'],
  VERIFYING: ['LOCKED', 'DISCREPANCY'],
  DISCREPANCY: ['LOCKED', 'VERIFYING'], // Locked via resolution or supervisor override
};

export function isValidShelfTransition(
  from: ShelfOperationStatus,
  to: ShelfOperationStatus
): boolean {
  const allowed = ALLOWED_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

export function validateShelfTransitionOrThrow(
  from: ShelfOperationStatus,
  to: ShelfOperationStatus
): void {
  if (!isValidShelfTransition(from, to)) {
    throw new Error(
      `Invalid shelf transition from "${from}" to "${to}". Permitted next states: [${(ALLOWED_TRANSITIONS[from] || []).join(', ')}]`
    );
  }
}
