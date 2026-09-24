// =====================================================================
// Automated Supplier Schedule Generator (PRD Section 10, 11, 12, 13)
// Generates round-robin / pool-based duty assignments with conflict checks,
// review mode, and publication workflow (DRAFT -> REVIEW -> PUBLISHED).
// =====================================================================

import { 
  SupplierAssignment, 
  SupplierPool, 
  SupplierPoolMember, 
  SupplierRotationRule, 
  DiningTable, 
  Student 
} from '@/types/database';
import { validateSupplierAssignment } from './conflicts';

export interface GeneratedScheduleResult {
  dutyPeriodId: string;
  diningAreaId: string;
  assignments: {
    tableId: string;
    tableNumber: number;
    primarySupplierId: string;
    primaryStudent: Student;
    backupSupplierId: string;
    backupStudent: Student;
  }[];
  conflicts: string[];
  warnings: string[];
  summary: {
    totalTables: number;
    assignedCount: number;
    primaryCount: number;
    backupCoverageCount: number;
    conflictsCount: number;
  };
}

export function generateSupplierSchedule(
  dutyPeriodId: string,
  diningAreaId: string,
  validFrom: string,
  validUntil: string,
  tables: DiningTable[],
  poolMembers: { student: Student; priority: number; is_backup_eligible: boolean }[],
  rule: SupplierRotationRule,
  existingAssignments: SupplierAssignment[],
  rotationOffset: number = 0
): GeneratedScheduleResult {
  const eligibleTables = tables
    .filter((t) => t.dining_area_id === diningAreaId && t.status === 'Active')
    .sort((a, b) => a.table_number - b.table_number);

  const students = poolMembers.map((m) => m.student);
  const conflicts: string[] = [];
  const warnings: string[] = [];
  const generatedAssignments: GeneratedScheduleResult['assignments'] = [];

  if (students.length === 0) {
    return {
      dutyPeriodId,
      diningAreaId,
      assignments: [],
      conflicts: ['Supplier pool contains no active students.'],
      warnings: [],
      summary: { totalTables: eligibleTables.length, assignedCount: 0, primaryCount: 0, backupCoverageCount: 0, conflictsCount: 1 },
    };
  }

  // Round-Robin Assignment Generation
  for (let i = 0; i < eligibleTables.length; i++) {
    const table = eligibleTables[i];

    // Primary index with configurable rotation offset
    const primaryIndex = (i + rotationOffset) % students.length;
    const primaryStudent = students[primaryIndex];

    // Backup is shifted to ensure primary != backup
    let backupShift = 1;
    let backupIndex = (primaryIndex + backupShift) % students.length;
    let backupStudent = students[backupIndex];

    // If backup is identical, shift again
    if (backupStudent.id === primaryStudent.id && students.length > 1) {
      backupShift = 2;
      backupIndex = (primaryIndex + backupShift) % students.length;
      backupStudent = students[backupIndex];
    }

    // Validate conflicts
    const primaryCheck = validateSupplierAssignment(
      table.id,
      primaryStudent.id,
      'primary',
      dutyPeriodId,
      existingAssignments,
      backupStudent.id,
      'TABLE'
    );

    const backupCheck = validateSupplierAssignment(
      table.id,
      backupStudent.id,
      'backup',
      dutyPeriodId,
      existingAssignments,
      primaryStudent.id,
      'TABLE'
    );

    if (primaryCheck.hasConflict) {
      conflicts.push(...primaryCheck.errors.map((e) => `Table ${table.table_number} Primary: ${e}`));
      warnings.push(...primaryCheck.warnings.map((w) => `Table ${table.table_number} Primary: ${w}`));
    }

    if (backupCheck.hasConflict) {
      conflicts.push(...backupCheck.errors.map((e) => `Table ${table.table_number} Backup: ${e}`));
      warnings.push(...backupCheck.warnings.map((w) => `Table ${table.table_number} Backup: ${w}`));
    }

    generatedAssignments.push({
      tableId: table.id,
      tableNumber: table.table_number,
      primarySupplierId: primaryStudent.id,
      primaryStudent,
      backupSupplierId: backupStudent.id,
      backupStudent,
    });
  }

  return {
    dutyPeriodId,
    diningAreaId,
    assignments: generatedAssignments,
    conflicts,
    warnings,
    summary: {
      totalTables: eligibleTables.length,
      assignedCount: generatedAssignments.length,
      primaryCount: generatedAssignments.length,
      backupCoverageCount: generatedAssignments.length,
      conflictsCount: conflicts.length,
    },
  };
}
