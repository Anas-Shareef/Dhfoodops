// =====================================================================
// Supplier Conflict Detection & Validation Engine (PRD Section 51)
// Enforces institutional assignment rules across TABLE, AREA, and TEACHER scopes
// =====================================================================

import { 
  SupplierAssignment, 
  SupplierRole, 
  SupplierScopeType,
  Student 
} from '@/types/database';

export interface ConflictCheckResult {
  hasConflict: boolean;
  warnings: string[];
  errors: string[];
}

export function validateSupplierAssignment(
  targetId: string, // tableId or areaId
  studentId: string,
  role: SupplierRole,
  dutyPeriodId: string,
  existingAssignments: SupplierAssignment[],
  partnerStudentId?: string,
  scopeType: SupplierScopeType = 'TABLE'
): ConflictCheckResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Rule 1: Primary and Backup cannot be the exact same student for the same table (PRD Section 15 & 51)
  if (partnerStudentId && studentId === partnerStudentId) {
    errors.push('A student cannot be assigned as both Primary and Backup supplier for the same table.');
  }

  // Rule 2: Cannot be assigned as Primary Table Supplier to multiple tables in the same duty period
  if (role === 'primary' && scopeType === 'TABLE') {
    const existingPrimary = existingAssignments.find(
      (a) =>
        a.duty_period_id === dutyPeriodId &&
        a.student_id === studentId &&
        a.role === 'primary' &&
        (a.scope_type === 'TABLE' || !a.scope_type) &&
        a.table_id !== targetId &&
        a.status === 'active'
    );

    if (existingPrimary) {
      errors.push(
        `Student is already assigned as Primary Supplier for Table ${existingPrimary.table?.table_number || 'another table'} during this duty period.`
      );
    }
  }

  // Rule 3: Teacher Conflict (PRD Section 51)
  // Teacher supplier cannot simultaneously have conflicting student primary duties
  if (role === 'teacher_supplier' || scopeType === 'TEACHER_AREA') {
    const conflictingStudentPrimary = existingAssignments.find(
      (a) =>
        a.duty_period_id === dutyPeriodId &&
        a.student_id === studentId &&
        a.role === 'primary' &&
        a.status === 'active'
    );
    if (conflictingStudentPrimary) {
      errors.push('Student is already assigned as a Primary table supplier. Teacher dining duties must remain separated.');
    }
  } else if (role === 'primary') {
    const existingTeacher = existingAssignments.find(
      (a) =>
        a.duty_period_id === dutyPeriodId &&
        a.student_id === studentId &&
        (a.role === 'teacher_supplier' || a.scope_type === 'TEACHER_AREA') &&
        a.status === 'active'
    );
    if (existingTeacher) {
      errors.push('Student is currently assigned to Teacher Dining. Cannot assign simultaneously as student table supplier.');
    }
  }

  // Rule 4: Area Conflict (PRD Section 51)
  // Area Main Supplier cannot be assigned as primary supplier on more than 1 operational table
  if (role === 'area_main' || scopeType === 'AREA') {
    const existingAreaMain = existingAssignments.find(
      (a) =>
        a.duty_period_id === dutyPeriodId &&
        a.student_id === studentId &&
        a.role === 'area_main' &&
        a.scope_id !== targetId &&
        a.status === 'active'
    );
    if (existingAreaMain) {
      errors.push('Student is already assigned as Area Main Supplier for another dining area in this duty period.');
    }
  }

  // Rule 5: Backup double-assignment warning
  if (role === 'backup') {
    const existingBackup = existingAssignments.find(
      (a) =>
        a.duty_period_id === dutyPeriodId &&
        a.student_id === studentId &&
        a.role === 'backup' &&
        a.table_id !== targetId &&
        a.status === 'active'
    );

    if (existingBackup) {
      warnings.push(
        `Student is currently registered as standby backup on Table ${existingBackup.table?.table_number || 'another table'}. Double assignment may reduce response flexibility.`
      );
    }
  }

  return {
    hasConflict: errors.length > 0 || warnings.length > 0,
    warnings,
    errors,
  };
}
