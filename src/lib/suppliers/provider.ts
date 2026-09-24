// =====================================================================
// Phase 3 & 6: Supplier Duty Management & Live Monitoring Provider
// Operational Duty Periods, Multi-Scoped Assignments (TABLE, AREA, TEACHER),
// Supplier Pools, Rotation Rules, Automated Schedule Generation, Check-Ins,
// Absences, Backup Activation, Handover Audit, and Live Monitoring.
// =====================================================================

import {
  SupplierDutyPeriod,
  SupplierAssignment,
  SupplierCheckin,
  SupplierAbsence,
  SupplierHandover,
  SupplierDutyEvent,
  TodayDutyItem,
  SupplierDashboardStats,
  SupplierDutyStatus,
  SupplierRole,
  SupplierScopeType,
  SupplierPool,
  SupplierPoolMember,
  SupplierRotationRule,
  SupplierScheduleGeneration,
  TableMonitoringStatus,
  SupplierAreaMonitoringSummary,
  Student,
  DiningTable,
  DiningArea
} from '@/types/database';
import { getTableProvider } from '@/lib/tables/provider';
import { getAttendanceProvider } from '@/lib/attendance/provider';
import { getUtensilProvider } from '@/lib/utensils/provider';
import { getTodayDateStringIST, formatTimeIST } from '@/lib/utils/timezone';
import { validateSupplierAssignment } from './conflicts';
import { generateSupplierSchedule, GeneratedScheduleResult } from './generator';
import { computeTableSupplierMonitoring } from './monitoring';

interface SupplierStore {
  dutyPeriods: SupplierDutyPeriod[];
  assignments: SupplierAssignment[];
  checkins: SupplierCheckin[];
  absences: SupplierAbsence[];
  handovers: SupplierHandover[];
  events: SupplierDutyEvent[];
  backupActivations: Map<string, { activated_at: string; backup_id: string; reason: string }>;
  pools: SupplierPool[];
  poolMembers: SupplierPoolMember[];
  rotationRules: SupplierRotationRule[];
  generations: SupplierScheduleGeneration[];
}

function initializeSupplierStore(): SupplierStore {
  const dutyPeriods: SupplierDutyPeriod[] = [
    {
      id: 'p-sep-2026',
      name: 'September 2026 Supplier Duty',
      start_date: '2026-09-01',
      end_date: '2026-09-30',
      status: 'active',
      created_by: 'a0000000-0000-0000-0000-000000000001',
      created_at: '2026-09-01T00:00:00Z',
      updated_at: '2026-09-01T00:00:00Z',
    },
  ];

  const firstFloorChsAreaId = 'a1111111-1111-1111-1111-111111111111';
  const teacherAreaId = 'a5555555-5555-5555-5555-555555555555';

  // Seed assignments with TABLE, AREA, and TEACHER_AREA scopes (PRD Section 6, 7, 8)
  const assignments: SupplierAssignment[] = [
    // Table 31 (Primary: Ijas K, Backup: Ahmed K)
    {
      id: 'sasgn-31-p',
      duty_period_id: 'p-sep-2026',
      scope_type: 'TABLE',
      scope_id: 't-31',
      table_id: 't-31',
      dining_area_id: firstFloorChsAreaId,
      student_id: 'b5555555-5555-5555-5555-555555555551', // Ijas K
      role: 'primary',
      valid_from: '2026-09-01',
      valid_until: '2026-09-30',
      status: 'active',
      assigned_by: 'a0000000-0000-0000-0000-000000000001',
      created_at: '2026-09-01T00:00:00Z',
      updated_at: '2026-09-01T00:00:00Z',
    },
    {
      id: 'sasgn-31-b',
      duty_period_id: 'p-sep-2026',
      scope_type: 'TABLE',
      scope_id: 't-31',
      table_id: 't-31',
      dining_area_id: firstFloorChsAreaId,
      student_id: 'b5555555-5555-5555-5555-555555555552', // Ahmed K
      role: 'backup',
      valid_from: '2026-09-01',
      valid_until: '2026-09-30',
      status: 'active',
      assigned_by: 'a0000000-0000-0000-0000-000000000001',
      created_at: '2026-09-01T00:00:00Z',
      updated_at: '2026-09-01T00:00:00Z',
    },
    // Area Main Supplier for First Floor CHS Side (PRD Section 6)
    {
      id: 'sasgn-area-chs-main',
      duty_period_id: 'p-sep-2026',
      scope_type: 'AREA',
      scope_id: firstFloorChsAreaId,
      table_id: null,
      dining_area_id: firstFloorChsAreaId,
      student_id: 'b5555555-5555-5555-5555-555555555551', // Ijas K (Area Main Supplier)
      role: 'area_main',
      valid_from: '2026-09-01',
      valid_until: '2026-09-30',
      status: 'active',
      assigned_by: 'a0000000-0000-0000-0000-000000000001',
      created_at: '2026-09-01T00:00:00Z',
      updated_at: '2026-09-01T00:00:00Z',
    },
    // Teacher Area Supplier (PRD Section 8)
    {
      id: 'sasgn-teacher-chs',
      duty_period_id: 'p-sep-2026',
      scope_type: 'TEACHER_AREA',
      scope_id: teacherAreaId,
      table_id: null,
      dining_area_id: teacherAreaId,
      student_id: 'b4444444-4444-4444-4444-444444444433', // Rashid V.P.
      role: 'teacher_supplier',
      valid_from: '2026-09-01',
      valid_until: '2026-09-30',
      status: 'active',
      assigned_by: 'a0000000-0000-0000-0000-000000000001',
      created_at: '2026-09-01T00:00:00Z',
      updated_at: '2026-09-01T00:00:00Z',
    },
    // Table 32 (Primary: Zayd Ansari, Backup: Farhan Qadir)
    {
      id: 'sasgn-32-p',
      duty_period_id: 'p-sep-2026',
      scope_type: 'TABLE',
      scope_id: 't-32',
      table_id: 't-32',
      dining_area_id: firstFloorChsAreaId,
      student_id: 'b4444444-4444-4444-4444-444444444431',
      role: 'primary',
      valid_from: '2026-09-01',
      valid_until: '2026-09-30',
      status: 'active',
      assigned_by: 'a0000000-0000-0000-0000-000000000001',
      created_at: '2026-09-01T00:00:00Z',
      updated_at: '2026-09-01T00:00:00Z',
    },
    {
      id: 'sasgn-32-b',
      duty_period_id: 'p-sep-2026',
      scope_type: 'TABLE',
      scope_id: 't-32',
      table_id: 't-32',
      dining_area_id: firstFloorChsAreaId,
      student_id: 'b4444444-4444-4444-4444-444444444432',
      role: 'backup',
      valid_from: '2026-09-01',
      valid_until: '2026-09-30',
      status: 'active',
      assigned_by: 'a0000000-0000-0000-0000-000000000001',
      created_at: '2026-09-01T00:00:00Z',
      updated_at: '2026-09-01T00:00:00Z',
    },
    // Table 33 (Primary: Salman)
    {
      id: 'sasgn-33-p',
      duty_period_id: 'p-sep-2026',
      scope_type: 'TABLE',
      scope_id: 't-33',
      table_id: 't-33',
      dining_area_id: firstFloorChsAreaId,
      student_id: 'b1111111-1111-1111-1111-111111111113', // Moosa Fayiz
      role: 'primary',
      valid_from: '2026-09-01',
      valid_until: '2026-09-30',
      status: 'active',
      assigned_by: 'a0000000-0000-0000-0000-000000000001',
      created_at: '2026-09-01T00:00:00Z',
      updated_at: '2026-09-01T00:00:00Z',
    },
    // Table 34 (Primary: Farhan)
    {
      id: 'sasgn-34-p',
      duty_period_id: 'p-sep-2026',
      scope_type: 'TABLE',
      scope_id: 't-34',
      table_id: 't-34',
      dining_area_id: firstFloorChsAreaId,
      student_id: 'b2222222-2222-2222-2222-222222222221',
      role: 'primary',
      valid_from: '2026-09-01',
      valid_until: '2026-09-30',
      status: 'active',
      assigned_by: 'a0000000-0000-0000-0000-000000000001',
      created_at: '2026-09-01T00:00:00Z',
      updated_at: '2026-09-01T00:00:00Z',
    },
  ];

  const today = getTodayDateStringIST();
  const checkins: SupplierCheckin[] = [
    {
      id: 'chk-31',
      assignment_id: 'sasgn-31-p',
      table_id: 't-31',
      student_id: 'b5555555-5555-5555-5555-555555555551',
      duty_date: today,
      status: 'checked_in',
      checked_in_at: `${today}T07:30:00+05:30`,
      checked_out_at: null,
      remarks: 'Self check-in on time',
    },
    {
      id: 'chk-32',
      assignment_id: 'sasgn-32-p',
      table_id: 't-32',
      student_id: 'b4444444-4444-4444-4444-444444444431',
      duty_date: today,
      status: 'checked_in',
      checked_in_at: `${today}T07:35:00+05:30`,
      checked_out_at: null,
      remarks: 'Checked in on time',
    },
  ];

  const absences: SupplierAbsence[] = [];
  const handovers: SupplierHandover[] = [];
  const events: SupplierDutyEvent[] = [
    {
      id: 'ev-31-chk',
      table_id: 't-31',
      supplier_id: 'b5555555-5555-5555-5555-555555555551',
      duty_date: today,
      event_type: 'CHECK_IN',
      metadata: { checked_in_at: '07:30 AM' },
      created_at: `${today}T07:30:00+05:30`,
    },
    {
      id: 'ev-1',
      table_id: 't-32',
      supplier_id: 'b4444444-4444-4444-4444-444444444431',
      duty_date: today,
      event_type: 'CHECK_IN',
      metadata: { checked_in_at: '07:35 AM' },
      created_at: `${today}T07:35:00+05:30`,
    },
    {
      id: 'ev-2',
      table_id: 't-32',
      supplier_id: 'b4444444-4444-4444-4444-444444444431',
      duty_date: today,
      event_type: 'SHELF_OPENED',
      metadata: { opened_at: '07:38 AM' },
      created_at: `${today}T07:38:00+05:30`,
    },
  ];

  const backupActivations = new Map<string, { activated_at: string; backup_id: string; reason: string }>();

  // Supplier Pools & Rotation Rules (PRD Section 10 & 11)
  const pools: SupplierPool[] = [
    {
      id: 'pool-chs-first',
      name: 'First Floor CHS Supplier Pool',
      dining_area_id: firstFloorChsAreaId,
      duty_period_id: 'p-sep-2026',
      status: 'active',
      created_at: '2026-09-01T00:00:00Z',
      updated_at: '2026-09-01T00:00:00Z',
    },
  ];

  const poolMembers: SupplierPoolMember[] = [
    { id: 'pm-1', pool_id: 'pool-chs-first', student_id: 'b5555555-5555-5555-5555-555555555551', priority: 1, is_backup_eligible: true, created_at: '2026-09-01T00:00:00Z' },
    { id: 'pm-2', pool_id: 'pool-chs-first', student_id: 'b5555555-5555-5555-5555-555555555552', priority: 2, is_backup_eligible: true, created_at: '2026-09-01T00:00:00Z' },
    { id: 'pm-3', pool_id: 'pool-chs-first', student_id: 'b4444444-4444-4444-4444-444444444431', priority: 3, is_backup_eligible: true, created_at: '2026-09-01T00:00:00Z' },
    { id: 'pm-4', pool_id: 'pool-chs-first', student_id: 'b4444444-4444-4444-4444-444444444432', priority: 4, is_backup_eligible: true, created_at: '2026-09-01T00:00:00Z' },
    { id: 'pm-5', pool_id: 'pool-chs-first', student_id: 'b1111111-1111-1111-1111-111111111113', priority: 5, is_backup_eligible: true, created_at: '2026-09-01T00:00:00Z' },
    { id: 'pm-6', pool_id: 'pool-chs-first', student_id: 'b2222222-2222-2222-2222-222222222221', priority: 6, is_backup_eligible: true, created_at: '2026-09-01T00:00:00Z' },
  ];

  const rotationRules: SupplierRotationRule[] = [
    {
      id: 'rr-round-robin',
      name: 'Standard Round-Robin Rotation',
      rule_type: 'ROUND_ROBIN',
      frequency: 'MONTHLY',
      parameters: { offset_shift: 1 },
      created_at: '2026-09-01T00:00:00Z',
    },
  ];

  const generations: SupplierScheduleGeneration[] = [];

  return { dutyPeriods, assignments, checkins, absences, handovers, events, backupActivations, pools, poolMembers, rotationRules, generations };
}

export class SupplierProvider {
  private store: SupplierStore;

  constructor() {
    this.store = initializeSupplierStore();
  }

  async getDutyPeriods(): Promise<SupplierDutyPeriod[]> {
    return this.store.dutyPeriods;
  }

  async getDutyPeriodById(id: string): Promise<SupplierDutyPeriod | null> {
    return this.store.dutyPeriods.find((p) => p.id === id) || null;
  }

  async getSupplierAssignments(dutyPeriodId: string): Promise<SupplierAssignment[]> {
    const tableProvider = getTableProvider();
    const attendanceProvider = getAttendanceProvider();
    const [tables, areas, students] = await Promise.all([
      tableProvider.getTables(),
      tableProvider.getDiningAreas(),
      attendanceProvider.getAllStudents(),
    ]);

    return this.store.assignments
      .filter((a) => a.duty_period_id === dutyPeriodId && a.status === 'active')
      .map((a) => ({
        ...a,
        table: tables.find((t) => t.id === a.table_id),
        dining_area: areas.find((ar) => ar.id === a.dining_area_id),
        student: students.find((s) => s.id === a.student_id),
      }));
  }

  async saveSupplierAssignment(
    tableId: string,
    primaryStudentId: string,
    backupStudentId: string,
    dutyPeriodId: string,
    adminId: string = 'a0000000-0000-0000-0000-000000000001'
  ): Promise<{ success: boolean; error?: string }> {
    if (primaryStudentId === backupStudentId) {
      return { success: false, error: 'Primary and backup supplier cannot be the same student.' };
    }

    const tableProvider = getTableProvider();
    const tables = await tableProvider.getTables();
    const targetTable = tables.find((t) => t.id === tableId);
    const areaId = targetTable?.dining_area_id;

    // Remove existing assignments for this table in this duty period
    this.store.assignments = this.store.assignments.filter(
      (a) => !(a.duty_period_id === dutyPeriodId && a.table_id === tableId)
    );

    const period = this.store.dutyPeriods.find((p) => p.id === dutyPeriodId);
    const validFrom = period?.start_date || '2026-09-01';
    const validUntil = period?.end_date || '2026-09-30';
    const nowIso = new Date().toISOString();

    // Insert primary
    this.store.assignments.push({
      id: `sasgn-${Date.now()}-p`,
      duty_period_id: dutyPeriodId,
      scope_type: 'TABLE',
      scope_id: tableId,
      table_id: tableId,
      dining_area_id: areaId,
      student_id: primaryStudentId,
      role: 'primary',
      valid_from: validFrom,
      valid_until: validUntil,
      status: 'active',
      assigned_by: adminId,
      created_at: nowIso,
      updated_at: nowIso,
    });

    // Insert backup
    this.store.assignments.push({
      id: `sasgn-${Date.now()}-b`,
      duty_period_id: dutyPeriodId,
      scope_type: 'TABLE',
      scope_id: tableId,
      table_id: tableId,
      dining_area_id: areaId,
      student_id: backupStudentId,
      role: 'backup',
      valid_from: validFrom,
      valid_until: validUntil,
      status: 'active',
      assigned_by: adminId,
      created_at: nowIso,
      updated_at: nowIso,
    });

    return { success: true };
  }

  async assignScopedSupplier(params: {
    dutyPeriodId: string;
    scopeType: SupplierScopeType;
    scopeId: string;
    studentId: string;
    role: SupplierRole;
    tableId?: string | null;
    diningAreaId?: string | null;
    adminId?: string;
  }): Promise<{ success: boolean; error?: string }> {
    const { dutyPeriodId, scopeType, scopeId, studentId, role, tableId, diningAreaId, adminId } = params;

    // Validate using conflict engine
    const check = validateSupplierAssignment(
      scopeId,
      studentId,
      role,
      dutyPeriodId,
      this.store.assignments,
      undefined,
      scopeType
    );

    if (check.hasConflict && check.errors.length > 0) {
      return { success: false, error: check.errors[0] };
    }

    const period = this.store.dutyPeriods.find((p) => p.id === dutyPeriodId);
    const validFrom = period?.start_date || '2026-09-01';
    const validUntil = period?.end_date || '2026-09-30';
    const nowIso = new Date().toISOString();

    this.store.assignments.push({
      id: `sasgn-${Date.now()}`,
      duty_period_id: dutyPeriodId,
      scope_type: scopeType,
      scope_id: scopeId,
      table_id: tableId || null,
      dining_area_id: diningAreaId || null,
      student_id: studentId,
      role,
      valid_from: validFrom,
      valid_until: validUntil,
      status: 'active',
      assigned_by: adminId || 'a0000000-0000-0000-0000-000000000001',
      created_at: nowIso,
      updated_at: nowIso,
    });

    return { success: true };
  }

  // --- Supplier Pools & Rotation Generator (PRD Section 10 & 11) ---

  async getPools(areaId?: string): Promise<SupplierPool[]> {
    const tableProvider = getTableProvider();
    const attendanceProvider = getAttendanceProvider();
    const [areas, students] = await Promise.all([
      tableProvider.getDiningAreas(),
      attendanceProvider.getAllStudents(),
    ]);

    let list = this.store.pools;
    if (areaId) list = list.filter((p) => p.dining_area_id === areaId);

    return list.map((p) => ({
      ...p,
      dining_area: areas.find((a) => a.id === p.dining_area_id),
      members: this.store.poolMembers
        .filter((pm) => pm.pool_id === p.id)
        .map((pm) => ({
          ...pm,
          student: students.find((s) => s.id === pm.student_id),
        })),
    }));
  }

  async getSupplierPools(areaId?: string): Promise<SupplierPool[]> {
    return this.getPools(areaId);
  }

  async getRotationRules(): Promise<SupplierRotationRule[]> {
    return this.store.rotationRules;
  }

  async previewGeneratedSchedule(params: {
    dutyPeriodId: string;
    areaId: string;
    poolId: string;
    rotationRuleId: string;
    offset?: number;
  }): Promise<GeneratedScheduleResult> {
    return this.previewScheduleGeneration(
      params.dutyPeriodId,
      params.areaId,
      params.poolId,
      params.rotationRuleId,
      params.offset || 0
    );
  }

  async previewScheduleGeneration(
    dutyPeriodId: string,
    areaId: string,
    poolId: string,
    rotationRuleId: string,
    offset: number = 0
  ): Promise<GeneratedScheduleResult> {
    const tableProvider = getTableProvider();
    const attendanceProvider = getAttendanceProvider();
    const [tables, students] = await Promise.all([
      tableProvider.getTables(),
      attendanceProvider.getAllStudents(),
    ]);

    const pool = this.store.pools.find((p) => p.id === poolId);
    const rule = this.store.rotationRules.find((r) => r.id === rotationRuleId) || this.store.rotationRules[0];
    const members = this.store.poolMembers
      .filter((pm) => pm.pool_id === poolId)
      .map((pm) => ({
        student: students.find((s) => s.id === pm.student_id)!,
        priority: pm.priority,
        is_backup_eligible: pm.is_backup_eligible,
      }))
      .filter((m) => m.student !== undefined);

    const period = this.store.dutyPeriods.find((p) => p.id === dutyPeriodId);
    const validFrom = period?.start_date || '2026-09-01';
    const validUntil = period?.end_date || '2026-09-30';

    return generateSupplierSchedule(
      dutyPeriodId,
      areaId,
      validFrom,
      validUntil,
      tables,
      members,
      rule,
      this.store.assignments,
      offset
    );
  }

  async publishGeneratedSchedule(
    result: GeneratedScheduleResult,
    adminId: string = 'a0000000-0000-0000-0000-000000000001'
  ): Promise<{ success: boolean; error?: string }> {
    if (result.conflicts.length > 0) {
      return { success: false, error: 'Cannot publish schedule with unresolved conflicts.' };
    }

    const period = this.store.dutyPeriods.find((p) => p.id === result.dutyPeriodId);
    const validFrom = period?.start_date || '2026-09-01';
    const validUntil = period?.end_date || '2026-09-30';
    const nowIso = new Date().toISOString();

    for (const item of result.assignments) {
      // Remove existing for table
      this.store.assignments = this.store.assignments.filter(
        (a) => !(a.duty_period_id === result.dutyPeriodId && a.table_id === item.tableId)
      );

      // Add Primary
      this.store.assignments.push({
        id: `sasgn-${Date.now()}-${item.tableNumber}-p`,
        duty_period_id: result.dutyPeriodId,
        scope_type: 'TABLE',
        scope_id: item.tableId,
        table_id: item.tableId,
        dining_area_id: result.diningAreaId,
        student_id: item.primarySupplierId,
        role: 'primary',
        valid_from: validFrom,
        valid_until: validUntil,
        status: 'active',
        assigned_by: adminId,
        created_at: nowIso,
        updated_at: nowIso,
      });

      // Add Backup
      this.store.assignments.push({
        id: `sasgn-${Date.now()}-${item.tableNumber}-b`,
        duty_period_id: result.dutyPeriodId,
        scope_type: 'TABLE',
        scope_id: item.tableId,
        table_id: item.tableId,
        dining_area_id: result.diningAreaId,
        student_id: item.backupSupplierId,
        role: 'backup',
        valid_from: validFrom,
        valid_until: validUntil,
        status: 'active',
        assigned_by: adminId,
        created_at: nowIso,
        updated_at: nowIso,
      });
    }

    // Save generation audit record
    this.store.generations.push({
      id: `gen-${Date.now()}`,
      duty_period_id: result.dutyPeriodId,
      dining_area_id: result.diningAreaId,
      status: 'PUBLISHED',
      generated_assignments_count: result.assignments.length,
      conflicts_count: 0,
      published_by: adminId,
      published_at: nowIso,
      created_at: nowIso,
      updated_at: nowIso,
    });

    return { success: true };
  }

  // --- Phase 6: Live Monitoring & Operational Duty Execution ---

  async checkInSupplier(
    tableId: string,
    studentId: string,
    remarks?: string
  ): Promise<{ success: boolean; error?: string }> {
    const today = getTodayDateStringIST();
    const nowIso = new Date().toISOString();

    const existingCheckin = this.store.checkins.find(
      (c) => c.table_id === tableId && c.duty_date === today
    );
    if (existingCheckin) {
      return { success: true };
    }

    const assignment = this.store.assignments.find(
      (a) => a.table_id === tableId && a.student_id === studentId && a.status === 'active'
    );

    const newCheckin: SupplierCheckin = {
      id: `chk-${Date.now()}`,
      assignment_id: assignment?.id || 'manual',
      table_id: tableId,
      student_id: studentId,
      duty_date: today,
      status: 'checked_in',
      checked_in_at: nowIso,
      checked_out_at: null,
      remarks: remarks || 'Checked in',
    };

    this.store.checkins.push(newCheckin);

    this.store.events.push({
      id: `ev-${Date.now()}`,
      table_id: tableId,
      supplier_id: studentId,
      duty_date: today,
      event_type: 'CHECK_IN',
      metadata: { time: formatTimeIST(nowIso), remarks },
      created_at: nowIso,
    });

    return { success: true };
  }

  async reportAbsence(
    tableId: string,
    studentId: string,
    dutyDate: string,
    reason: string,
    status: 'approved_absent' | 'unapproved_absent' = 'approved_absent',
    approvedBy: string = 'a0000000-0000-0000-0000-000000000001'
  ): Promise<{ success: boolean; error?: string }> {
    const nowIso = new Date().toISOString();

    this.store.absences.push({
      id: `abs-${Date.now()}`,
      student_id: studentId,
      table_id: tableId,
      duty_date: dutyDate,
      status,
      reason,
      approved_by: approvedBy,
      created_at: nowIso,
    });

    return { success: true };
  }

  async activateBackup(
    tableId: string,
    supervisorId: string = 'a0000000-0000-0000-0000-000000000001',
    reason: string = 'Primary supplier absent; standby backup activated'
  ): Promise<{ success: boolean; error?: string }> {
    const backupAssignment = this.store.assignments.find(
      (a) => a.table_id === tableId && a.role === 'backup' && a.status === 'active'
    );

    if (!backupAssignment) {
      return { success: false, error: 'No active standby backup assigned to this table.' };
    }

    const today = getTodayDateStringIST();
    const nowIso = new Date().toISOString();

    this.store.backupActivations.set(tableId, {
      activated_at: nowIso,
      backup_id: backupAssignment.student_id,
      reason,
    });

    this.store.events.push({
      id: `ev-${Date.now()}`,
      table_id: tableId,
      supplier_id: backupAssignment.student_id,
      duty_date: today,
      event_type: 'BACKUP_ACTIVATED',
      metadata: { supervisor_id: supervisorId, reason, time: formatTimeIST(nowIso) },
      created_at: nowIso,
    });

    return { success: true };
  }

  async requestHandover(
    tableId: string,
    fromSupplierId: string,
    toSupplierId: string,
    reason: string,
    authorizedBy: string = 'a0000000-0000-0000-0000-000000000001'
  ): Promise<{ success: boolean; error?: string }> {
    const nowIso = new Date().toISOString();
    const today = getTodayDateStringIST();

    const handover: SupplierHandover = {
      id: `hnd-${Date.now()}`,
      table_id: tableId,
      from_supplier_id: fromSupplierId,
      to_supplier_id: toSupplierId,
      reason,
      authorized_by: authorizedBy,
      handed_over_at: nowIso,
      status: 'completed',
      remarks: 'Handover executed and approved',
    };

    this.store.handovers.push(handover);

    this.store.events.push({
      id: `ev-${Date.now()}`,
      table_id: tableId,
      supplier_id: toSupplierId,
      duty_date: today,
      event_type: 'HANDOVER',
      metadata: { from_supplier_id: fromSupplierId, reason, time: formatTimeIST(nowIso) },
      created_at: nowIso,
    });

    return { success: true };
  }

  async markSupplierAbsent(
    studentId: string,
    tableId: string,
    dutyDate: string,
    status: 'approved_absent' | 'unapproved_absent' = 'unapproved_absent',
    reason: string = 'Supplier absent'
  ) {
    return this.reportAbsence(tableId, studentId, dutyDate, reason, status);
  }

  async activateBackupSupplier(
    tableId: string,
    _primaryStudentId?: string,
    _backupStudentId?: string,
    reason?: string
  ) {
    return this.activateBackup(tableId, 'a0000000-0000-0000-0000-000000000001', reason);
  }

  async recordSupplierHandover(
    tableId: string,
    fromSupplierId: string,
    toSupplierId: string,
    reason: string,
    _remarks?: string
  ) {
    return this.requestHandover(tableId, fromSupplierId, toSupplierId, reason);
  }

  async recordDutyEvent(
    tableId: string,
    supplierId: string,
    eventType: 'CHECK_IN' | 'SHELF_OPENED' | 'SHELF_CLOSED' | 'UTENSILS_VERIFIED',
    metadata?: Record<string, unknown>
  ): Promise<{ success: boolean; error?: string }> {
    const today = getTodayDateStringIST();
    const nowIso = new Date().toISOString();

    this.store.events.push({
      id: `ev-${Date.now()}`,
      table_id: tableId,
      supplier_id: supplierId,
      duty_date: today,
      event_type: eventType,
      metadata: metadata || {},
      created_at: nowIso,
    });

    return { success: true };
  }

  // --- Synthesis of Phase 6 Live Monitoring Summaries ---

  async getAreaMonitoring(areaId?: string, dateStr?: string): Promise<SupplierAreaMonitoringSummary[]> {
    const targetDate = dateStr || getTodayDateStringIST();
    const tableProvider = getTableProvider();
    const attendanceProvider = getAttendanceProvider();
    const utensilProvider = getUtensilProvider();

    const [areas, allTables, allStudents, allDiscrepancies] = await Promise.all([
      tableProvider.getDiningAreas(),
      tableProvider.getTables(),
      attendanceProvider.getAllStudents(),
      utensilProvider.getAllDiscrepancies(),
    ]);

    const activeAreas = areaId && areaId !== 'all' ? areas.filter((a) => a.id === areaId) : areas;

    const results: SupplierAreaMonitoringSummary[] = [];

    for (const area of activeAreas) {
      const areaTables = allTables.filter((t) => t.dining_area_id === area.id);

      // Find Area Main Supplier (PRD Section 6)
      const areaMainAssignment = this.store.assignments.find(
        (a) => a.scope_type === 'AREA' && a.scope_id === area.id && a.role === 'area_main' && a.status === 'active'
      );
      const mainStudent = areaMainAssignment ? allStudents.find((s) => s.id === areaMainAssignment.student_id) : null;

      const tableMonitoringList: TableMonitoringStatus[] = [];

      for (const table of areaTables) {
        const primaryAsgn = this.store.assignments.find(
          (a) => a.table_id === table.id && a.role === 'primary' && a.status === 'active'
        ) || null;

        const backupAsgn = this.store.assignments.find(
          (a) => a.table_id === table.id && a.role === 'backup' && a.status === 'active'
        ) || null;

        // Populate student profiles
        const enrichedPrimary = primaryAsgn
          ? { ...primaryAsgn, student: allStudents.find((s) => s.id === primaryAsgn.student_id) }
          : null;
        const enrichedBackup = backupAsgn
          ? { ...backupAsgn, student: allStudents.find((s) => s.id === backupAsgn.student_id) }
          : null;

        const uDetail = await utensilProvider.getTableDetail(table.id);

        const isBackupActive = this.store.backupActivations.has(table.id);

        const status = computeTableSupplierMonitoring({
          table,
          primaryAssignment: enrichedPrimary,
          backupAssignment: enrichedBackup,
          checkins: this.store.checkins,
          absences: this.store.absences,
          handovers: this.store.handovers,
          dutyEvents: this.store.events,
          utensilSession: uDetail.session,
          utensilDiscrepancies: uDetail.discrepancies,
          utensilEvents: uDetail.events,
          dutyDate: targetDate,
          isBackupActivated: isBackupActive,
        });

        tableMonitoringList.push(status);
      }

      const completed = tableMonitoringList.filter((t) => t.operational_status === 'COMPLETED').length;
      const inProgress = tableMonitoringList.filter(
        (t) =>
          t.operational_status === 'OPERATING' ||
          t.operational_status === 'COLLECTING' ||
          t.operational_status === 'VERIFYING' ||
          t.operational_status === 'CHECKED_IN'
      ).length;
      const notStarted = tableMonitoringList.filter((t) => t.operational_status === 'NOT_STARTED').length;
      const discrepancies = tableMonitoringList.filter((t) => t.operational_status === 'DISCREPANCY').length;
      const absents = tableMonitoringList.filter((t) => t.operational_status === 'ABSENT').length;
      const backupActives = tableMonitoringList.filter((t) => t.is_backup_active).length;

      results.push({
        area_id: area.id,
        area_name: area.name,
        main_supplier: mainStudent || null,
        total_tables: areaTables.length,
        completed_count: completed,
        in_progress_count: inProgress,
        not_started_count: notStarted,
        discrepancy_count: discrepancies,
        absent_count: absents,
        backup_active_count: backupActives,
        tables: tableMonitoringList,
      });
    }

    return results;
  }

  async getTodaySupplierDuties(dateStr: string): Promise<TodayDutyItem[]> {
    const tableProvider = getTableProvider();
    const attendanceProvider = getAttendanceProvider();
    const [tables, students] = await Promise.all([
      tableProvider.getTables(),
      attendanceProvider.getAllStudents(),
    ]);

    return tables.map((t) => {
      const pAsgn = this.store.assignments.find(
        (a) => a.table_id === t.id && a.role === 'primary' && a.status === 'active'
      ) || null;
      const bAsgn = this.store.assignments.find(
        (a) => a.table_id === t.id && a.role === 'backup' && a.status === 'active'
      ) || null;

      const pStudent = pAsgn ? students.find((s) => s.id === pAsgn.student_id) || null : null;
      const bStudent = bAsgn ? students.find((s) => s.id === bAsgn.student_id) || null : null;

      const isCheckedIn = this.store.checkins.some(
        (c) => c.table_id === t.id && c.duty_date === dateStr
      );
      const isAbsent = this.store.absences.find(
        (ab) => ab.table_id === t.id && ab.duty_date === dateStr
      );
      const isBackupActive = this.store.backupActivations.has(t.id);

      let currentStatus: SupplierDutyStatus = 'assigned';
      if (isBackupActive) currentStatus = 'backup_activated';
      else if (isAbsent) currentStatus = isAbsent.status === 'approved_absent' ? 'absent_approved' : 'unapproved_absent';
      else if (isCheckedIn) currentStatus = 'checked_in';

      return {
        table_id: t.id,
        table_number: t.table_number,
        area_name: t.dining_area?.name || 'CHS Side',
        primary_assignment: pAsgn ? { ...pAsgn, student: pStudent || undefined } : null,
        backup_assignment: bAsgn ? { ...bAsgn, student: bStudent || undefined } : null,
        current_status: currentStatus,
        active_supplier: isBackupActive ? bStudent : pStudent,
      };
    });
  }

  async getSupplierDashboardStats(dateStr: string): Promise<SupplierDashboardStats> {
    const duties = await this.getTodaySupplierDuties(dateStr);
    const totalTables = duties.length;
    const assignedTables = duties.filter((d) => d.primary_assignment !== null).length;
    const checkedIn = duties.filter((d) => d.current_status === 'checked_in').length;
    const absent = duties.filter(
      (d) => d.current_status === 'absent_approved' || d.current_status === 'unapproved_absent'
    ).length;
    const pending = duties.filter((d) => d.current_status === 'assigned').length;
    const backupActivated = duties.filter((d) => d.current_status === 'backup_activated').length;

    return {
      total_tables: totalTables,
      assigned_tables: assignedTables,
      checked_in: checkedIn,
      absent: absent,
      pending: pending,
      backup_activated: backupActivated,
      completed: 21,
      discrepancies: 1,
    };
  }

  async getStudentDuties(studentId: string): Promise<{
    assignments: SupplierAssignment[];
    todayDuty: TodayDutyItem | null;
  }> {
    const today = getTodayDateStringIST();
    const tableProvider = getTableProvider();
    const tables = await tableProvider.getTables();

    const studentAssignments = this.store.assignments
      .filter((a) => a.student_id === studentId && a.status === 'active')
      .map((a) => ({
        ...a,
        table: tables.find((t) => t.id === a.table_id),
      }));

    const todayDuties = await this.getTodaySupplierDuties(today);
    const todayDuty = todayDuties.find(
      (d) =>
        d.primary_assignment?.student_id === studentId ||
        d.backup_assignment?.student_id === studentId
    ) || null;

    return { assignments: studentAssignments, todayDuty };
  }

  async getTableDutyDetails(tableId: string, dateStr: string): Promise<TodayDutyItem | null> {
    const duties = await this.getTodaySupplierDuties(dateStr);
    return duties.find((d) => d.table_id === tableId) || null;
  }

  async getTableDutyEvents(tableId: string, dateStr: string): Promise<SupplierDutyEvent[]> {
    return this.store.events
      .filter((e) => e.table_id === tableId && e.duty_date === dateStr)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async getAbsences(dateStr?: string): Promise<SupplierAbsence[]> {
    const attendanceProvider = getAttendanceProvider();
    const tableProvider = getTableProvider();
    const [students, tables] = await Promise.all([
      attendanceProvider.getAllStudents(),
      tableProvider.getTables(),
    ]);

    let list = this.store.absences;
    if (dateStr) {
      list = list.filter((ab) => ab.duty_date === dateStr);
    }

    return list.map((ab) => ({
      ...ab,
      student: students.find((s) => s.id === ab.student_id),
      table: tables.find((t) => t.id === ab.table_id),
    })).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async getHandovers(): Promise<SupplierHandover[]> {
    const attendanceProvider = getAttendanceProvider();
    const tableProvider = getTableProvider();
    const [students, tables] = await Promise.all([
      attendanceProvider.getAllStudents(),
      tableProvider.getTables(),
    ]);

    return this.store.handovers.map((h) => ({
      ...h,
      from_student: students.find((s) => s.id === h.from_supplier_id),
      to_student: students.find((s) => s.id === h.to_supplier_id),
      table: tables.find((t) => t.id === h.table_id),
    })).sort((a, b) => new Date(b.handed_over_at).getTime() - new Date(a.handed_over_at).getTime());
  }
}

// Singleton provider instance
let supplierProviderInstance: SupplierProvider | null = null;

export function getSupplierProvider(): SupplierProvider {
  if (!supplierProviderInstance) {
    supplierProviderInstance = new SupplierProvider();
  }
  return supplierProviderInstance;
}
