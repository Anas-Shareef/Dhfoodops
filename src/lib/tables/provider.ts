// =====================================================================
// Phase 2: Seating & Table Management Provider
// Handles Dining Areas, Physical Tables, Historical Time-ranged Assignments,
// Rearrangements (Individual Move, Bulk Assign, Swap), and Phase 1 Attendance cross-referencing.
// =====================================================================

import {
  DiningHall,
  DiningFloor,
  DiningArea,
  DiningTable,
  TableAssignment,
  SeatingChangeLog,
  TableOverviewStats,
  TableMemberDetail,
  Student,
  AttendanceStatus,
} from '@/types/database';
import { getAttendanceProvider } from '@/lib/attendance/provider';
import { createClient } from '@/lib/supabase/client';

interface TableStore {
  halls: DiningHall[];
  floors: DiningFloor[];
  areas: DiningArea[];
  tables: DiningTable[];
  assignments: TableAssignment[];
  changeLogs: SeatingChangeLog[];
}

function initializeTableStore(): TableStore {
  const halls: DiningHall[] = [
    {
      id: 'dh111111-1111-1111-1111-111111111111',
      name: 'PG Dining Hall',
      code: 'PG_HALL',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const floors: DiningFloor[] = [
    {
      id: 'df111111-1111-1111-1111-111111111111',
      dining_hall_id: halls[0].id,
      name: 'Ground Floor',
      floor_number: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'df222222-2222-2222-2222-222222222222',
      dining_hall_id: halls[0].id,
      name: 'First Floor',
      floor_number: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const areas: DiningArea[] = [
    {
      id: 'a1111111-1111-1111-1111-111111111111',
      dining_floor_id: floors[1].id,
      name: 'First Floor CHS Side',
      floor: 'First Floor',
      section: 'CHS Side',
      area_type: 'STUDENT',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'a2222222-2222-2222-2222-222222222222',
      dining_floor_id: floors[1].id,
      name: 'First Floor PG Side',
      floor: 'First Floor',
      section: 'PG Side',
      area_type: 'STUDENT',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'a3333333-3333-3333-3333-333333333333',
      dining_floor_id: floors[0].id,
      name: 'Ground Floor PG Side',
      floor: 'Ground Floor',
      section: 'PG Side',
      area_type: 'STUDENT',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'a4444444-4444-4444-4444-444444444444',
      dining_floor_id: floors[0].id,
      name: 'Ground Floor CHS Side',
      floor: 'Ground Floor',
      section: 'CHS Side',
      area_type: 'STUDENT',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'a5555555-5555-5555-5555-555555555555',
      dining_floor_id: floors[1].id,
      name: 'First Floor CHS Teacher Area',
      floor: 'First Floor',
      section: 'Teacher Side',
      area_type: 'TEACHER',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  // 24 Tables across areas (PRD Section 22 dashboard example: 24 total tables, 22 active)
  const tables: DiningTable[] = [
    // First Floor CHS Side (Tables 31 - 36)
    { id: 't-31', table_number: 31, dining_area_id: areas[0].id, capacity: 8, status: 'Active', map_position: { row: 1, col: 1 }, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 't-32', table_number: 32, dining_area_id: areas[0].id, capacity: 8, status: 'Active', map_position: { row: 1, col: 2 }, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 't-33', table_number: 33, dining_area_id: areas[0].id, capacity: 8, status: 'Active', map_position: { row: 2, col: 1 }, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 't-34', table_number: 34, dining_area_id: areas[0].id, capacity: 8, status: 'Active', map_position: { row: 2, col: 2 }, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 't-35', table_number: 35, dining_area_id: areas[0].id, capacity: 8, status: 'Active', map_position: { row: 3, col: 1 }, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 't-36', table_number: 36, dining_area_id: areas[0].id, capacity: 8, status: 'Active', map_position: { row: 3, col: 2 }, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },

    // First Floor Other Side (Tables 21 - 26)
    { id: 't-21', table_number: 21, dining_area_id: areas[1].id, capacity: 8, status: 'Active', map_position: { row: 1, col: 1 }, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 't-22', table_number: 22, dining_area_id: areas[1].id, capacity: 8, status: 'Active', map_position: { row: 1, col: 2 }, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 't-23', table_number: 23, dining_area_id: areas[1].id, capacity: 8, status: 'Active', map_position: { row: 2, col: 1 }, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 't-24', table_number: 24, dining_area_id: areas[1].id, capacity: 8, status: 'Active', map_position: { row: 2, col: 2 }, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 't-25', table_number: 25, dining_area_id: areas[1].id, capacity: 8, status: 'Reserved', map_position: { row: 3, col: 1 }, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 't-26', table_number: 26, dining_area_id: areas[1].id, capacity: 8, status: 'Inactive', map_position: { row: 3, col: 2 }, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },

    // Ground Floor PG Side (Tables 11 - 16)
    { id: 't-11', table_number: 11, dining_area_id: areas[2].id, capacity: 8, status: 'Active', map_position: { row: 1, col: 1 }, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 't-12', table_number: 12, dining_area_id: areas[2].id, capacity: 8, status: 'Active', map_position: { row: 1, col: 2 }, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 't-13', table_number: 13, dining_area_id: areas[2].id, capacity: 8, status: 'Active', map_position: { row: 2, col: 1 }, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 't-14', table_number: 14, dining_area_id: areas[2].id, capacity: 8, status: 'Active', map_position: { row: 2, col: 2 }, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 't-17', table_number: 17, dining_area_id: areas[2].id, capacity: 8, status: 'Active', map_position: { row: 3, col: 1 }, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 't-18', table_number: 18, dining_area_id: areas[2].id, capacity: 8, status: 'Maintenance', map_position: { row: 3, col: 2 }, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },

    // Ground Floor CHS Side (Tables 1 - 6)
    { id: 't-1', table_number: 1, dining_area_id: areas[3].id, capacity: 8, status: 'Active', map_position: { row: 1, col: 1 }, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 't-2', table_number: 2, dining_area_id: areas[3].id, capacity: 8, status: 'Active', map_position: { row: 1, col: 2 }, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 't-3', table_number: 3, dining_area_id: areas[3].id, capacity: 8, status: 'Active', map_position: { row: 2, col: 1 }, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 't-4', table_number: 4, dining_area_id: areas[3].id, capacity: 8, status: 'Active', map_position: { row: 2, col: 2 }, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 't-15', table_number: 15, dining_area_id: areas[3].id, capacity: 8, status: 'Active', map_position: { row: 3, col: 1 }, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 't-16', table_number: 16, dining_area_id: areas[3].id, capacity: 8, status: 'Active', map_position: { row: 3, col: 2 }, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  ];

  // Seed Table 31 EXACT 8 Members as required by PRD Section 7:
  // 16889 Muhammed (QS2)
  // 16960 Muhammed Alfas (QS2)
  // 17028 Moosa Fayiz (QS2)
  // 17047 Mohammed Muzammil (QS2)
  // 17106 Muhammad Sabith (QS2)
  // 17195 Muhammed Hinan (QS2)
  // 17207 Muhammed Irfan (QS1)
  // 17209 Muhammed Sanad (QS1)
  const assignments: TableAssignment[] = [
    { id: 'asgn-1', student_id: 'b1111111-1111-1111-1111-111111111111', table_id: 't-31', assigned_from: '2026-09-01T00:00:00Z', assigned_until: null, assigned_by: null, status: 'active', created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z' },
    { id: 'asgn-2', student_id: 'b1111111-1111-1111-1111-111111111112', table_id: 't-31', assigned_from: '2026-09-01T00:00:00Z', assigned_until: null, assigned_by: null, status: 'active', created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z' },
    { id: 'asgn-3', student_id: 'b1111111-1111-1111-1111-111111111113', table_id: 't-31', assigned_from: '2026-09-01T00:00:00Z', assigned_until: null, assigned_by: null, status: 'active', created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z' },
    { id: 'asgn-4', student_id: 'b1111111-1111-1111-1111-111111111114', table_id: 't-31', assigned_from: '2026-09-01T00:00:00Z', assigned_until: null, assigned_by: null, status: 'active', created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z' },
    { id: 'asgn-5', student_id: 'b1111111-1111-1111-1111-111111111115', table_id: 't-31', assigned_from: '2026-09-01T00:00:00Z', assigned_until: null, assigned_by: null, status: 'active', created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z' },
    { id: 'asgn-6', student_id: 'b1111111-1111-1111-1111-111111111116', table_id: 't-31', assigned_from: '2026-09-01T00:00:00Z', assigned_until: null, assigned_by: null, status: 'active', created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z' },
    { id: 'asgn-7', student_id: 'b1111111-1111-1111-1111-111111111117', table_id: 't-31', assigned_from: '2026-09-01T00:00:00Z', assigned_until: null, assigned_by: null, status: 'active', created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z' },
    { id: 'asgn-8', student_id: 'b1111111-1111-1111-1111-111111111118', table_id: 't-31', assigned_from: '2026-09-01T00:00:00Z', assigned_until: null, assigned_by: null, status: 'active', created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z' },

    // Other table members (Table 12, Table 15, Table 32)
    { id: 'asgn-21', student_id: 'b2222222-2222-2222-2222-222222222221', table_id: 't-12', assigned_from: '2026-09-01T00:00:00Z', assigned_until: null, assigned_by: null, status: 'active', created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z' },
    { id: 'asgn-22', student_id: 'b2222222-2222-2222-2222-222222222222', table_id: 't-12', assigned_from: '2026-09-01T00:00:00Z', assigned_until: null, assigned_by: null, status: 'active', created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z' },
    { id: 'asgn-23', student_id: 'b2222222-2222-2222-2222-222222222223', table_id: 't-12', assigned_from: '2026-09-01T00:00:00Z', assigned_until: null, assigned_by: null, status: 'active', created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z' },
    { id: 'asgn-31', student_id: 'b3333333-3333-3333-3333-333333333331', table_id: 't-15', assigned_from: '2026-09-01T00:00:00Z', assigned_until: null, assigned_by: null, status: 'active', created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z' },
    { id: 'asgn-32', student_id: 'b3333333-3333-3333-3333-333333333332', table_id: 't-15', assigned_from: '2026-09-01T00:00:00Z', assigned_until: null, assigned_by: null, status: 'active', created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z' },
    { id: 'asgn-41', student_id: 'b4444444-4444-4444-4444-444444444431', table_id: 't-32', assigned_from: '2026-09-01T00:00:00Z', assigned_until: null, assigned_by: null, status: 'active', created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z' },
    { id: 'asgn-42', student_id: 'b4444444-4444-4444-4444-444444444432', table_id: 't-32', assigned_from: '2026-09-01T00:00:00Z', assigned_until: null, assigned_by: null, status: 'active', created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z' },
    { id: 'asgn-43', student_id: 'b4444444-4444-4444-4444-444444444433', table_id: 't-32', assigned_from: '2026-09-01T00:00:00Z', assigned_until: null, assigned_by: null, status: 'active', created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z' },
  ];

  const changeLogs: SeatingChangeLog[] = [
    {
      id: 'log-init-1',
      student_id: 'b1111111-1111-1111-1111-111111111111',
      from_table_id: null,
      to_table_id: 't-31',
      from_table_number: null,
      to_table_number: 31,
      reason: 'Academic Term Seating Allocation',
      changed_by: 'a0000000-0000-0000-0000-000000000001',
      changed_by_name: 'Registry Admin',
      changed_at: '2026-09-01T09:00:00Z',
    },
  ];

  return { halls, floors, areas, tables, assignments, changeLogs };
}

export class TableProvider {
  private store: TableStore;

  constructor() {
    this.store = initializeTableStore();
  }

  async getDiningHalls(): Promise<DiningHall[]> {
    return this.store.halls;
  }

  async getDiningFloors(hallId?: string): Promise<DiningFloor[]> {
    if (hallId) return this.store.floors.filter((f) => f.dining_hall_id === hallId);
    return this.store.floors;
  }

  async getDiningAreas(): Promise<DiningArea[]> {
    return this.store.areas;
  }

  async getTables(areaId?: string, floor?: string): Promise<DiningTable[]> {
    let list = this.store.tables;

    if (areaId && areaId !== 'all') {
      list = list.filter((t) => t.dining_area_id === areaId);
    } else if (floor && floor !== 'all') {
      const areaIdsOnFloor = this.store.areas.filter((a) => a.floor === floor).map((a) => a.id);
      list = list.filter((t) => areaIdsOnFloor.includes(t.dining_area_id));
    }

    // Attach computed counts and dining area details
    return list.map((table) => {
      const area = this.store.areas.find((a) => a.id === table.dining_area_id);
      const activeAssignments = this.store.assignments.filter(
        (as) => as.table_id === table.id && as.status === 'active' && as.assigned_until === null
      );
      const currentCount = activeAssignments.length;
      const available = Math.max(0, table.capacity - currentCount);

      return {
        ...table,
        dining_area: area,
        current_members_count: currentCount,
        available_seats: available,
      };
    }).sort((a, b) => a.table_number - b.table_number);
  }

  async getTableById(idOrNumber: string | number): Promise<DiningTable | null> {
    const table = typeof idOrNumber === 'number'
      ? this.store.tables.find((t) => t.table_number === idOrNumber)
      : this.store.tables.find((t) => t.id === idOrNumber || t.table_number === parseInt(idOrNumber, 10));

    if (!table) return null;

    const area = this.store.areas.find((a) => a.id === table.dining_area_id);
    const activeAssignments = this.store.assignments.filter(
      (as) => as.table_id === table.id && as.status === 'active' && as.assigned_until === null
    );

    return {
      ...table,
      dining_area: area,
      current_members_count: activeAssignments.length,
      available_seats: Math.max(0, table.capacity - activeAssignments.length),
    };
  }

  async getTableMembers(tableId: string, sessionId?: string): Promise<TableMemberDetail[]> {
    const activeAssignments = this.store.assignments.filter(
      (as) => as.table_id === tableId && as.status === 'active' && as.assigned_until === null
    );

    const attendanceProvider = getAttendanceProvider();
    const allStudents = await attendanceProvider.getAllStudents();

    // If session ID given, fetch attendance map
    let attendanceMap = new Map<string, AttendanceStatus>();
    if (sessionId) {
      const studentIds = activeAssignments.map((a) => a.student_id);
      const attList = await attendanceProvider.getStudentAttendanceForSessions(studentIds[0] || '', [sessionId]);
      for (const a of attList) {
        attendanceMap.set(a.student_id, a.status);
      }
    }

    const members: TableMemberDetail[] = [];
    for (const asgn of activeAssignments) {
      const student = allStudents.find((s) => s.id === asgn.student_id);
      if (student) {
        members.push({
          student_id: student.id,
          enrollment_no: student.enrollment_no,
          name: student.name,
          department_code: student.department?.code || 'QS2',
          department_name: student.department?.name || 'Department',
          year: student.year,
          assigned_from: asgn.assigned_from,
          attendance_status: attendanceMap.get(student.id) || 'no_response',
        });
      }
    }

    return members.sort((a, b) => a.enrollment_no.localeCompare(b.enrollment_no));
  }

  async moveStudent(
    studentId: string,
    toTableId: string,
    reason: string,
    adminId: string = 'a0000000-0000-0000-0000-000000000001'
  ): Promise<{ success: boolean; error?: string }> {
    const targetTable = await this.getTableById(toTableId);
    if (!targetTable) return { success: false, error: 'Destination table not found.' };

    if (targetTable.status !== 'Active') {
      return { success: false, error: `Cannot assign to Table ${targetTable.table_number} because its status is ${targetTable.status}.` };
    }

    // Capacity validation (PRD Section 11)
    const currentMembers = this.store.assignments.filter(
      (as) => as.table_id === targetTable.id && as.status === 'active' && as.assigned_until === null
    );
    if (currentMembers.length >= targetTable.capacity) {
      return {
        success: false,
        error: `Table ${targetTable.table_number} is at full capacity (${currentMembers.length}/${targetTable.capacity} students).`,
      };
    }

    const nowIso = new Date().toISOString();

    // 1. Close previous active assignment
    const prevAssignment = this.store.assignments.find(
      (as) => as.student_id === studentId && as.status === 'active' && as.assigned_until === null
    );

    let fromTableNumber: number | null = null;
    let fromTableId: string | null = null;

    if (prevAssignment) {
      prevAssignment.assigned_until = nowIso;
      prevAssignment.status = 'transferred';
      fromTableId = prevAssignment.table_id;
      const prevTable = this.store.tables.find((t) => t.id === prevAssignment.table_id);
      fromTableNumber = prevTable?.table_number ?? null;
    }

    // 2. Insert new active assignment (PRD Section 12 & 14)
    const newAssignment: TableAssignment = {
      id: `asgn-${Date.now()}`,
      student_id: studentId,
      table_id: targetTable.id,
      assigned_from: nowIso,
      assigned_until: null,
      assigned_by: adminId,
      status: 'active',
      created_at: nowIso,
      updated_at: nowIso,
    };
    this.store.assignments.push(newAssignment);

    // 3. Update student table_number backward-compat link
    const attendanceProvider = getAttendanceProvider();
    const students = await attendanceProvider.getAllStudents();
    const targetStudent = students.find((s) => s.id === studentId);
    if (targetStudent) {
      targetStudent.table_number = targetTable.table_number;
    }

    // 4. Record audit change log (PRD Section 13)
    this.store.changeLogs.unshift({
      id: `log-${Date.now()}`,
      student_id: studentId,
      from_table_id: fromTableId,
      to_table_id: targetTable.id,
      from_table_number: fromTableNumber,
      to_table_number: targetTable.table_number,
      reason: reason || 'Seating rearrangement',
      changed_by: adminId,
      changed_by_name: 'Administrator',
      changed_at: nowIso,
    });

    return { success: true };
  }

  async bulkAssignStudents(
    studentIds: string[],
    toTableId: string,
    reason: string,
    adminId: string = 'a0000000-0000-0000-0000-000000000001'
  ): Promise<{ success: boolean; movedCount: number; error?: string }> {
    const targetTable = await this.getTableById(toTableId);
    if (!targetTable) return { success: false, movedCount: 0, error: 'Destination table not found.' };

    const currentMembers = this.store.assignments.filter(
      (as) => as.table_id === targetTable.id && as.status === 'active' && as.assigned_until === null
    );
    const available = targetTable.capacity - currentMembers.length;

    if (studentIds.length > available) {
      return {
        success: false,
        movedCount: 0,
        error: `Cannot bulk assign ${studentIds.length} students. Table ${targetTable.table_number} has only ${available} seat(s) available.`,
      };
    }

    let count = 0;
    for (const sid of studentIds) {
      const res = await this.moveStudent(sid, toTableId, reason || 'Bulk seating allocation', adminId);
      if (res.success) count++;
    }

    return { success: true, movedCount: count };
  }

  async swapStudents(
    studentIdA: string,
    studentIdB: string,
    reason: string,
    adminId: string = 'a0000000-0000-0000-0000-000000000001'
  ): Promise<{ success: boolean; error?: string }> {
    const asgnA = this.store.assignments.find(
      (as) => as.student_id === studentIdA && as.status === 'active' && as.assigned_until === null
    );
    const asgnB = this.store.assignments.find(
      (as) => as.student_id === studentIdB && as.status === 'active' && as.assigned_until === null
    );

    if (!asgnA || !asgnB) {
      return { success: false, error: 'Both students must have an active table assignment to perform a swap.' };
    }

    if (asgnA.table_id === asgnB.table_id) {
      return { success: false, error: 'Both students are already assigned to the same table.' };
    }

    const tableIdA = asgnA.table_id;
    const tableIdB = asgnB.table_id;

    const tableA = this.store.tables.find((t) => t.id === tableIdA);
    const tableB = this.store.tables.find((t) => t.id === tableIdB);

    const nowIso = new Date().toISOString();

    // Close both
    asgnA.assigned_until = nowIso;
    asgnA.status = 'transferred';
    asgnB.assigned_until = nowIso;
    asgnB.status = 'transferred';

    // Insert swapped
    this.store.assignments.push({
      id: `asgn-swap-A-${Date.now()}`,
      student_id: studentIdA,
      table_id: tableIdB,
      assigned_from: nowIso,
      assigned_until: null,
      assigned_by: adminId,
      status: 'active',
      created_at: nowIso,
      updated_at: nowIso,
    });

    this.store.assignments.push({
      id: `asgn-swap-B-${Date.now()}`,
      student_id: studentIdB,
      table_id: tableIdA,
      assigned_from: nowIso,
      assigned_until: null,
      assigned_by: adminId,
      status: 'active',
      created_at: nowIso,
      updated_at: nowIso,
    });

    // Update students table_number
    const attendanceProvider = getAttendanceProvider();
    const students = await attendanceProvider.getAllStudents();
    const stA = students.find((s) => s.id === studentIdA);
    const stB = students.find((s) => s.id === studentIdB);
    if (stA && tableB) stA.table_number = tableB.table_number;
    if (stB && tableA) stB.table_number = tableA.table_number;

    // Log both
    const swapReason = reason || 'Mutual seating swap';
    this.store.changeLogs.unshift(
      {
        id: `log-swap-A-${Date.now()}`,
        student_id: studentIdA,
        from_table_id: tableIdA,
        to_table_id: tableIdB,
        from_table_number: tableA?.table_number ?? null,
        to_table_number: tableB?.table_number ?? null,
        reason: `${swapReason} (Swapped with student ${stB?.name || studentIdB})`,
        changed_by: adminId,
        changed_by_name: 'Administrator',
        changed_at: nowIso,
      },
      {
        id: `log-swap-B-${Date.now()}`,
        student_id: studentIdB,
        from_table_id: tableIdB,
        to_table_id: tableIdA,
        from_table_number: tableB?.table_number ?? null,
        to_table_number: tableA?.table_number ?? null,
        reason: `${swapReason} (Swapped with student ${stA?.name || studentIdA})`,
        changed_by: adminId,
        changed_by_name: 'Administrator',
        changed_at: nowIso,
      }
    );

    return { success: true };
  }

  async getSeatingChangeLogs(limit: number = 50): Promise<SeatingChangeLog[]> {
    const attendanceProvider = getAttendanceProvider();
    const students = await attendanceProvider.getAllStudents();

    return this.store.changeLogs.slice(0, limit).map((log) => ({
      ...log,
      student: students.find((s) => s.id === log.student_id),
    }));
  }

  async getTableOverviewStats(): Promise<TableOverviewStats> {
    const totalTables = this.store.tables.length;
    const activeTables = this.store.tables.filter((t) => t.status === 'Active').length;

    let fullTables = 0;
    let availableSeats = 0;

    for (const table of this.store.tables) {
      if (table.status === 'Active') {
        const memberCount = this.store.assignments.filter(
          (as) => as.table_id === table.id && as.status === 'active' && as.assigned_until === null
        ).length;

        if (memberCount >= table.capacity) {
          fullTables++;
        } else {
          availableSeats += Math.max(0, table.capacity - memberCount);
        }
      }
    }

    const attendanceProvider = getAttendanceProvider();
    const students = await attendanceProvider.getAllStudents();
    const assignedStudentIds = new Set(
      this.store.assignments
        .filter((as) => as.status === 'active' && as.assigned_until === null)
        .map((as) => as.student_id)
    );
    const unassignedStudents = students.filter((s) => !assignedStudentIds.has(s.id)).length;

    return {
      total_tables: totalTables,
      active_tables: activeTables,
      full_tables: fullTables,
      available_seats: availableSeats,
      unassigned_students: unassignedStudents,
    };
  }

  async getStudentCurrentTable(studentId: string): Promise<{ table: DiningTable | null; area: DiningArea | null }> {
    const assignment = this.store.assignments.find(
      (as) => as.student_id === studentId && as.status === 'active' && as.assigned_until === null
    );

    if (!assignment) return { table: null, area: null };

    const table = this.store.tables.find((t) => t.id === assignment.table_id) || null;
    const area = table ? this.store.areas.find((a) => a.id === table.dining_area_id) || null : null;

    return { table, area };
  }
}

// Singleton export
let tableProviderInstance: TableProvider | null = null;

export function getTableProvider(): TableProvider {
  if (!tableProviderInstance) {
    tableProviderInstance = new TableProvider();
  }
  return tableProviderInstance;
}
