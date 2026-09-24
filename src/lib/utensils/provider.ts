// =====================================================================
// Phase 5 & 7: Utensil Accountability & Discrepancy Lifecycle Provider
// Manages table-level physical tableware (Plates, Glasses, Jugs),
// shelf operations, collection verification, cross-table recovery,
// damage/breakage/repair, disposal authorization, and immutable audit history.
// =====================================================================

import {
  UtensilType,
  TableUtensilConfig,
  UtensilOperationSession,
  UtensilOperationItem,
  UtensilDiscrepancy,
  UtensilDiscrepancyHistoryItem,
  Phase7DiscrepancyKPIs,
  UtensilEvent,
  UtensilTableSummary,
  UtensilDashboardStats,
  ShelfOperationStatus,
  DiscrepancyStatus,
  DiscrepancyIssueType,
  DiscrepancyResolutionType,
  UtensilTypeCode,
  UserRole,
} from '@/types/database';
import { getTableProvider } from '@/lib/tables/provider';
import { getSupplierProvider } from '@/lib/suppliers/provider';
import { getTodayDateStringIST, formatTimeIST } from '@/lib/utils/timezone';
import { validateShelfTransitionOrThrow } from './state-machine';
import {
  validateDiscrepancyTransitionOrThrow,
  isAuthorizedForTransition,
} from './discrepancy-state';

interface UtensilStore {
  types: UtensilType[];
  configs: TableUtensilConfig[];
  sessions: UtensilOperationSession[];
  items: UtensilOperationItem[];
  discrepancies: UtensilDiscrepancy[];
  events: UtensilEvent[];
}

function initializeUtensilStore(): UtensilStore {
  const types: UtensilType[] = [
    { id: 'u-plate', name: 'Dining Plate', code: 'PLATE', unit: 'pieces', active: true, created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z' },
    { id: 'u-glass', name: 'Drinking Glass', code: 'GLASS', unit: 'pieces', active: true, created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z' },
    { id: 'u-jug', name: 'Water Jug', code: 'JUG', unit: 'pieces', active: true, created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z' },
  ];

  const configs: TableUtensilConfig[] = [];
  const sessions: UtensilOperationSession[] = [];
  const items: UtensilOperationItem[] = [];
  const discrepancies: UtensilDiscrepancy[] = [];
  const events: UtensilEvent[] = [];

  const t31Id = 't-31';
  const t32Id = 't-32';
  const t24Id = 't-24';
  const t18Id = 't-18';
  const t14Id = 't-14';
  const t11Id = 't-11';
  const sess31Id = 'ops-31';
  const sess32Id = 'ops-32';
  const sess24Id = 'ops-24';

  // Seed Table 31 (PRD Section 79 & 80):
  // 8 Plates, 7 Glasses (1 Missing), 1 Jug. Status: DISCREPANCY
  sessions.push({
    id: sess31Id,
    table_id: t31Id,
    meal_session_id: 's1111111-1111-1111-1111-111111111111',
    status: 'DISCREPANCY',
    opened_by: 'b5555555-5555-5555-5555-555555555551', // Ijas K
    opened_at: '2026-09-24T07:35:00+05:30',
    distribution_started_at: '2026-09-24T07:45:00+05:30',
    collection_started_at: '2026-09-24T08:45:00+05:30',
    verification_started_at: '2026-09-24T09:00:00+05:30',
    verified_by: 'b5555555-5555-5555-5555-555555555551',
    verified_at: '2026-09-24T09:10:00+05:30',
    created_at: '2026-09-24T07:35:00+05:30',
    updated_at: '2026-09-24T09:10:00+05:30',
  });

  items.push(
    { id: 'it-31-p', operation_session_id: sess31Id, utensil_type_id: 'u-plate', expected_quantity: 8, distributed_quantity: 8, returned_quantity: 8, unresolved_quantity: 0, created_at: '2026-09-24T07:35:00+05:30', updated_at: '2026-09-24T09:10:00+05:30' },
    { id: 'it-31-g', operation_session_id: sess31Id, utensil_type_id: 'u-glass', expected_quantity: 8, distributed_quantity: 8, returned_quantity: 7, unresolved_quantity: 1, created_at: '2026-09-24T07:35:00+05:30', updated_at: '2026-09-24T09:10:00+05:30' },
    { id: 'it-31-j', operation_session_id: sess31Id, utensil_type_id: 'u-jug', expected_quantity: 1, distributed_quantity: 1, returned_quantity: 1, unresolved_quantity: 0, created_at: '2026-09-24T07:35:00+05:30', updated_at: '2026-09-24T09:10:00+05:30' }
  );

  // Table 32: 8 Plates, 9 Glasses (1 Overage), 1 Jug. Status: VERIFYING
  sessions.push({
    id: sess32Id,
    table_id: t32Id,
    meal_session_id: 's1111111-1111-1111-1111-111111111111',
    status: 'VERIFYING',
    opened_by: 'b5555555-5555-5555-5555-555555555552',
    opened_at: '2026-09-24T07:35:00+05:30',
    distribution_started_at: '2026-09-24T07:45:00+05:30',
    collection_started_at: '2026-09-24T08:45:00+05:30',
    verification_started_at: '2026-09-24T09:05:00+05:30',
    created_at: '2026-09-24T07:35:00+05:30',
    updated_at: '2026-09-24T09:05:00+05:30',
  });

  items.push(
    { id: 'it-32-p', operation_session_id: sess32Id, utensil_type_id: 'u-plate', expected_quantity: 8, distributed_quantity: 8, returned_quantity: 8, unresolved_quantity: 0, created_at: '2026-09-24T07:35:00+05:30', updated_at: '2026-09-24T09:05:00+05:30' },
    { id: 'it-32-g', operation_session_id: sess32Id, utensil_type_id: 'u-glass', expected_quantity: 8, distributed_quantity: 8, returned_quantity: 9, unresolved_quantity: 0, created_at: '2026-09-24T07:35:00+05:30', updated_at: '2026-09-24T09:05:00+05:30' },
    { id: 'it-32-j', operation_session_id: sess32Id, utensil_type_id: 'u-jug', expected_quantity: 1, distributed_quantity: 1, returned_quantity: 1, unresolved_quantity: 0, created_at: '2026-09-24T07:35:00+05:30', updated_at: '2026-09-24T09:05:00+05:30' }
  );

  // Table 24: Plate Damaged
  sessions.push({
    id: sess24Id,
    table_id: t24Id,
    meal_session_id: 's1111111-1111-1111-1111-111111111111',
    status: 'DISCREPANCY',
    opened_by: 'b5555555-5555-5555-5555-555555555553',
    opened_at: '2026-09-24T07:35:00+05:30',
    distribution_started_at: '2026-09-24T07:45:00+05:30',
    collection_started_at: '2026-09-24T08:45:00+05:30',
    verification_started_at: '2026-09-24T09:02:00+05:30',
    created_at: '2026-09-24T07:35:00+05:30',
    updated_at: '2026-09-24T09:02:00+05:30',
  });

  items.push(
    { id: 'it-24-p', operation_session_id: sess24Id, utensil_type_id: 'u-plate', expected_quantity: 8, distributed_quantity: 8, returned_quantity: 7, unresolved_quantity: 1, created_at: '2026-09-24T07:35:00+05:30', updated_at: '2026-09-24T09:02:00+05:30' },
    { id: 'it-24-g', operation_session_id: sess24Id, utensil_type_id: 'u-glass', expected_quantity: 8, distributed_quantity: 8, returned_quantity: 8, unresolved_quantity: 0, created_at: '2026-09-24T07:35:00+05:30', updated_at: '2026-09-24T09:02:00+05:30' },
    { id: 'it-24-j', operation_session_id: sess24Id, utensil_type_id: 'u-jug', expected_quantity: 1, distributed_quantity: 1, returned_quantity: 1, unresolved_quantity: 0, created_at: '2026-09-24T07:35:00+05:30', updated_at: '2026-09-24T09:02:00+05:30' }
  );

  // Active Discrepancies
  // 1. Table 31: 1 Glass Missing
  discrepancies.push({
    id: 'disc-31',
    operation_session_id: sess31Id,
    utensil_type_id: 'u-glass',
    quantity: 1,
    status: 'MISSING',
    issue_type: 'MISSING',
    origin_table_id: t31Id,
    current_table_id: null,
    source_table_id: t31Id,
    reported_by: 'b5555555-5555-5555-5555-555555555551',
    reported_by_name: 'Ijas K',
    reported_at: '2026-09-24T09:00:00+05:30',
    notes: 'Glass count was 7 instead of 8 during table collection',
    history: [
      {
        id: 'h-31-1',
        discrepancy_id: 'disc-31',
        previous_status: 'UNRESOLVED',
        new_status: 'UNRESOLVED',
        action: 'DISCREPANCY_DETECTED',
        performed_by_name: 'System (Verification)',
        performed_at: '2026-09-24T09:00:00+05:30',
        reason: 'Automated verification mismatch: Expected 8, Returned 7',
      },
      {
        id: 'h-31-2',
        discrepancy_id: 'disc-31',
        previous_status: 'UNRESOLVED',
        new_status: 'MISSING',
        action: 'MISSING_REPORTED',
        performed_by_name: 'Ijas K (Supplier)',
        performed_at: '2026-09-24T09:02:00+05:30',
        reason: 'Supplier checked under table and benches, unable to locate glass',
      },
    ],
    created_at: '2026-09-24T09:00:00+05:30',
    updated_at: '2026-09-24T09:02:00+05:30',
  });

  // 2. Table 32: 1 Glass Overage (PRD Section 48 & 79)
  discrepancies.push({
    id: 'disc-32',
    operation_session_id: sess32Id,
    utensil_type_id: 'u-glass',
    quantity: 1,
    status: 'OVERAGE',
    issue_type: 'OVERAGE',
    origin_table_id: t32Id,
    current_table_id: t32Id,
    source_table_id: null,
    reported_by: 'b5555555-5555-5555-5555-555555555552',
    reported_by_name: 'Ahmed K',
    reported_at: '2026-09-24T09:05:00+05:30',
    notes: '9 Drinking Glasses observed at Table 32 (Expected 8). Possible misplaced glass from Table 31.',
    history: [
      {
        id: 'h-32-1',
        discrepancy_id: 'disc-32',
        previous_status: 'UNRESOLVED',
        new_status: 'OVERAGE',
        action: 'OVERAGE_DETECTED',
        performed_by_name: 'Ahmed K (Supplier)',
        performed_at: '2026-09-24T09:05:00+05:30',
        reason: 'Extra glass found during collection tray grouping',
      },
    ],
    created_at: '2026-09-24T09:05:00+05:30',
    updated_at: '2026-09-24T09:05:00+05:30',
  });

  // 3. Table 24: 1 Plate Damaged -> Repair Required (PRD Section 81)
  discrepancies.push({
    id: 'disc-24',
    operation_session_id: sess24Id,
    utensil_type_id: 'u-plate',
    quantity: 1,
    status: 'REPAIR_REQUIRED',
    issue_type: 'DAMAGED',
    origin_table_id: t24Id,
    current_table_id: t24Id,
    source_table_id: t24Id,
    reported_by: 'b5555555-5555-5555-5555-555555555553',
    reported_by_name: 'Sabith V',
    reported_at: '2026-09-24T08:50:00+05:30',
    notes: 'Chipped edge on ceramic dining plate',
    history: [
      {
        id: 'h-24-1',
        discrepancy_id: 'disc-24',
        previous_status: 'UNRESOLVED',
        new_status: 'DAMAGED',
        action: 'DAMAGE_REPORTED',
        performed_by_name: 'Sabith V (Supplier)',
        performed_at: '2026-09-24T08:50:00+05:30',
        reason: 'Plate chipped during post-breakfast wash stack',
      },
      {
        id: 'h-24-2',
        discrepancy_id: 'disc-24',
        previous_status: 'DAMAGED',
        new_status: 'REPAIR_REQUIRED',
        action: 'REPAIR_REQUESTED',
        performed_by_name: 'Dining Supervisor',
        performed_at: '2026-09-24T09:00:00+05:30',
        reason: 'Smooth sanding/buffing possible, sent to dining maintenance',
      },
    ],
    created_at: '2026-09-24T08:50:00+05:30',
    updated_at: '2026-09-24T09:00:00+05:30',
  });

  // 4. Table 18: 1 Glass Broken (PRD Section 18 & 81)
  discrepancies.push({
    id: 'disc-18',
    operation_session_id: 'ops-18',
    utensil_type_id: 'u-glass',
    quantity: 1,
    status: 'BROKEN',
    issue_type: 'BROKEN',
    origin_table_id: t18Id,
    current_table_id: t18Id,
    source_table_id: t18Id,
    reported_by: 'b5555555-5555-5555-5555-555555555554',
    reported_by_name: 'Fayiz P',
    reported_at: '2026-09-24T08:20:00+05:30',
    notes: 'Glass shattered on floor during cleaning. Fragments safely cleared.',
    history: [
      {
        id: 'h-18-1',
        discrepancy_id: 'disc-18',
        previous_status: 'UNRESOLVED',
        new_status: 'BROKEN',
        action: 'BREAKAGE_REPORTED',
        performed_by_name: 'Fayiz P (Supplier)',
        performed_at: '2026-09-24T08:20:00+05:30',
        reason: 'Slipped during wet collection',
      },
    ],
    created_at: '2026-09-24T08:20:00+05:30',
    updated_at: '2026-09-24T08:20:00+05:30',
  });

  // 5. Table 14: Historical Resolved Recovered
  discrepancies.push({
    id: 'disc-14',
    operation_session_id: 'ops-14',
    utensil_type_id: 'u-jug',
    quantity: 1,
    status: 'RESOLVED',
    issue_type: 'MISPLACED',
    origin_table_id: t14Id,
    current_table_id: 't-15',
    source_table_id: t14Id,
    reported_by: 'b5555555-5555-5555-5555-555555555555',
    reported_by_name: 'Muhammed K',
    reported_at: '2026-09-24T07:40:00+05:30',
    found_by: 'b5555555-5555-5555-5555-555555555556',
    found_by_name: 'Ali H',
    found_at: '2026-09-24T08:15:00+05:30',
    return_confirmed_by: 'a0000000-0000-0000-0000-000000000001',
    return_confirmed_by_name: 'Supervisor Shafi',
    return_confirmed_at: '2026-09-24T08:25:00+05:30',
    resolution_type: 'RECOVERED',
    resolution_reason: 'Returned to Table 14 shelf after cross-table return',
    resolved_by: 'a0000000-0000-0000-0000-000000000001',
    resolved_by_name: 'Supervisor Shafi',
    resolved_at: '2026-09-24T08:25:00+05:30',
    notes: 'Jug stamped "14" found at Table 15 and returned',
    history: [
      {
        id: 'h-14-1',
        discrepancy_id: 'disc-14',
        previous_status: 'UNRESOLVED',
        new_status: 'MISPLACED',
        action: 'MISPLACED_REPORTED',
        performed_by_name: 'Muhammed K',
        performed_at: '2026-09-24T07:40:00+05:30',
      },
      {
        id: 'h-14-2',
        discrepancy_id: 'disc-14',
        previous_status: 'MISPLACED',
        new_status: 'FOUND',
        action: 'ITEM_FOUND',
        performed_by_name: 'Ali H',
        performed_at: '2026-09-24T08:15:00+05:30',
        notes: 'Found at Table 15 end bench',
      },
      {
        id: 'h-14-3',
        discrepancy_id: 'disc-14',
        previous_status: 'FOUND',
        new_status: 'RETURNED',
        action: 'ITEM_RETURNED',
        performed_by_name: 'Ali H',
        performed_at: '2026-09-24T08:20:00+05:30',
        notes: 'Handed back to Table 14 supplier',
      },
      {
        id: 'h-14-4',
        discrepancy_id: 'disc-14',
        previous_status: 'RETURNED',
        new_status: 'RESOLVED',
        action: 'RECOVERY_CONFIRMED',
        performed_by_name: 'Supervisor Shafi',
        performed_at: '2026-09-24T08:25:00+05:30',
        reason: 'Verified count 1/1 present on Table 14',
      },
    ],
    created_at: '2026-09-24T07:40:00+05:30',
    updated_at: '2026-09-24T08:25:00+05:30',
  });

  // 6. Table 11: Historical Discarded
  discrepancies.push({
    id: 'disc-11',
    operation_session_id: 'ops-11',
    utensil_type_id: 'u-glass',
    quantity: 1,
    status: 'RESOLVED',
    issue_type: 'BROKEN',
    origin_table_id: t11Id,
    current_table_id: t11Id,
    source_table_id: t11Id,
    reported_by: 'b5555555-5555-5555-5555-555555555557',
    reported_by_name: 'Farhan M',
    reported_at: '2026-09-23T13:10:00+05:30',
    approved_by: 'a0000000-0000-0000-0000-000000000001',
    approved_by_name: 'Supervisor Shafi',
    approved_at: '2026-09-23T13:30:00+05:30',
    resolution_type: 'DISCARDED',
    resolution_reason: 'Broken beyond repair, institutional safety disposal',
    resolved_by: 'a0000000-0000-0000-0000-000000000001',
    resolved_by_name: 'Supervisor Shafi',
    resolved_at: '2026-09-23T13:30:00+05:30',
    notes: 'Discarded per dining safety procedure',
    history: [
      {
        id: 'h-11-1',
        discrepancy_id: 'disc-11',
        previous_status: 'UNRESOLVED',
        new_status: 'BROKEN',
        action: 'BREAKAGE_REPORTED',
        performed_by_name: 'Farhan M',
        performed_at: '2026-09-23T13:10:00+05:30',
      },
      {
        id: 'h-11-2',
        discrepancy_id: 'disc-11',
        previous_status: 'BROKEN',
        new_status: 'RESOLVED',
        action: 'DISPOSAL_APPROVED',
        performed_by_name: 'Supervisor Shafi',
        performed_at: '2026-09-23T13:30:00+05:30',
        reason: 'Broken beyond repair',
      },
    ],
    created_at: '2026-09-23T13:10:00+05:30',
    updated_at: '2026-09-23T13:30:00+05:30',
  });

  // Events for Table 31
  events.push(
    { id: 'ue-1', operation_session_id: sess31Id, table_id: t31Id, event_type: 'SHELF_OPENED', performed_by: 'Ijas K', performed_at: '2026-09-24T07:35:00+05:30', metadata: { time: '07:35 AM' } },
    { id: 'ue-2', operation_session_id: sess31Id, table_id: t31Id, event_type: 'DISTRIBUTION_STARTED', performed_by: 'Ijas K', performed_at: '2026-09-24T07:45:00+05:30', metadata: { plates: 8, glasses: 8, jug: 1 } },
    { id: 'ue-3', operation_session_id: sess31Id, table_id: t31Id, event_type: 'COLLECTION_STARTED', performed_by: 'Ijas K', performed_at: '2026-09-24T08:45:00+05:30', metadata: { plates: 8, glasses: 7, jug: 1 } },
    { id: 'ue-4', operation_session_id: sess31Id, table_id: t31Id, event_type: 'DISCREPANCY_REPORTED', quantity: 1, performed_by: 'Ijas K', performed_at: '2026-09-24T09:00:00+05:30', metadata: { item: 'GLASS', missing: 1 } }
  );

  return { types, configs, sessions, items, discrepancies, events };
}

export class UtensilProvider {
  private store: UtensilStore;

  constructor() {
    this.store = initializeUtensilStore();
  }

  async getUtensilTypes(): Promise<UtensilType[]> {
    return this.store.types;
  }

  async getDashboardStats(): Promise<UtensilDashboardStats> {
    const tableProvider = getTableProvider();
    const tables = await tableProvider.getTables();
    const totalTables = tables.length || 24;

    const openCount = this.store.sessions.filter(
      (s) => s.status === 'OPENED' || s.status === 'DISTRIBUTING' || s.status === 'COLLECTING' || s.status === 'VERIFYING'
    ).length;

    const verifiedCount = this.store.sessions.filter((s) => s.status === 'LOCKED').length;
    const discrepancyCount = this.store.sessions.filter((s) => s.status === 'DISCREPANCY').length;

    const missing = this.store.discrepancies.filter((d) => d.status === 'MISSING').length;
    const misplaced = this.store.discrepancies.filter((d) => d.status === 'MISPLACED' || d.status === 'FOUND' || d.status === 'RETURNED').length;
    const damaged = this.store.discrepancies.filter((d) => d.status === 'DAMAGED' || d.status === 'REPAIR_REQUIRED' || d.status === 'UNDER_REPAIR').length;
    const broken = this.store.discrepancies.filter((d) => d.status === 'BROKEN').length;
    const recovered = this.store.discrepancies.filter((d) => d.status === 'RECOVERED' || d.resolution_type === 'RECOVERED').length;

    return {
      total_tables: totalTables,
      tables_open: openCount,
      tables_verified: Math.max(verifiedCount, 21),
      tables_with_discrepancies: discrepancyCount,
      missing_items: missing,
      misplaced_items: misplaced,
      damaged_items: damaged,
      broken_items: broken,
      recovered_items: recovered,
    };
  }

  async getPhase7DiscrepancyKPIs(): Promise<Phase7DiscrepancyKPIs> {
    const all = this.store.discrepancies;
    const openDiscrepancies = all.filter((d) => d.status !== 'RESOLVED');

    const missing = openDiscrepancies.filter((d) => d.status === 'MISSING').length;
    const misplaced = openDiscrepancies.filter(
      (d) => d.status === 'MISPLACED' || d.status === 'FOUND' || d.status === 'RETURNED'
    ).length;
    const damaged = openDiscrepancies.filter(
      (d) => d.status === 'DAMAGED' || d.status === 'REPAIR_REQUIRED' || d.status === 'UNDER_REPAIR' || d.status === 'RETURNED_FROM_REPAIR'
    ).length;
    const broken = openDiscrepancies.filter((d) => d.status === 'BROKEN').length;
    const overage = openDiscrepancies.filter((d) => d.status === 'OVERAGE').length;

    const recoveredToday = all.filter(
      (d) => (d.status === 'RECOVERED' || d.resolution_type === 'RECOVERED') && d.updated_at.startsWith('2026-09-24')
    ).length;

    const awaitingApproval = openDiscrepancies.filter(
      (d) => d.status === 'DAMAGED' || d.status === 'BROKEN' || d.status === 'RETURNED'
    ).length;

    const discardedThisMonth = all.filter(
      (d) => d.resolution_type === 'DISCARDED' || d.status === 'DISCARDED'
    ).length;

    // Calculate recovery rate: recovered / (missing + misplaced + recovered)
    const totalLostOrMisplaced = all.filter(
      (d) => d.issue_type === 'MISSING' || d.issue_type === 'MISPLACED' || d.issue_type === 'COUNT_MISMATCH'
    ).length;
    const totalRecovered = all.filter((d) => d.resolution_type === 'RECOVERED' || d.status === 'RECOVERED').length;
    const recoveryRate = totalLostOrMisplaced > 0
      ? `${Math.round((totalRecovered / (totalLostOrMisplaced + totalRecovered)) * 100)}%`
      : '92%';

    return {
      total_open: openDiscrepancies.length,
      missing_count: missing,
      misplaced_count: misplaced,
      damaged_count: damaged,
      broken_count: broken,
      overage_count: overage,
      recovered_today: recoveredToday,
      awaiting_approval: awaitingApproval,
      discarded_this_month: discardedThisMonth,
      recovery_rate: recoveryRate,
      average_recovery_time_minutes: 28, // Seed average recovery time
    };
  }

  async getTableSummaries(): Promise<UtensilTableSummary[]> {
    const tableProvider = getTableProvider();
    const supplierProvider = getSupplierProvider();
    const today = getTodayDateStringIST();

    const [tables, supplierDuties] = await Promise.all([
      tableProvider.getTables(),
      supplierProvider.getTodaySupplierDuties(today),
    ]);

    const summaries: UtensilTableSummary[] = [];

    for (const table of tables) {
      const duty = supplierDuties.find((d) => d.table_id === table.id);
      const isTable31 = table.table_number === 31;
      const isTable32 = table.table_number === 32;

      const session = this.store.sessions.find((s) => s.table_id === table.id);
      const sessionItems = session ? this.store.items.filter((i) => i.operation_session_id === session.id) : [];

      const plateItem = sessionItems.find((i) => i.utensil_type_id === 'u-plate');
      const glassItem = sessionItems.find((i) => i.utensil_type_id === 'u-glass');
      const jugItem = sessionItems.find((i) => i.utensil_type_id === 'u-jug');

      const status: ShelfOperationStatus = session?.status || (isTable31 ? 'DISCREPANCY' : isTable32 ? 'VERIFYING' : 'LOCKED');
      const hasDiscrepancy = status === 'DISCREPANCY';

      const expPlates = plateItem?.expected_quantity ?? 8;
      const retPlates = plateItem?.returned_quantity ?? 8;
      const expGlasses = glassItem?.expected_quantity ?? 8;
      const retGlasses = glassItem?.returned_quantity ?? (isTable31 ? 7 : isTable32 ? 9 : 8);
      const expJugs = jugItem?.expected_quantity ?? 1;
      const retJugs = jugItem?.returned_quantity ?? 1;

      const unresolved = (expPlates - retPlates) + (expGlasses - retGlasses) + (expJugs - retJugs);

      summaries.push({
        table_id: table.id,
        table_number: table.table_number,
        area_name: table.dining_area?.name || 'Main Dining Hall',
        shelf_status: status,
        primary_supplier_name: duty?.primary_assignment?.student?.name || (isTable31 ? 'Ijas K' : isTable32 ? 'Ahmed K' : 'Assigned Supplier'),
        backup_supplier_name: duty?.backup_assignment?.student?.name || (isTable31 ? 'Ahmed K' : null),
        expected_plates: expPlates,
        returned_plates: retPlates,
        expected_glasses: expGlasses,
        returned_glasses: retGlasses,
        expected_jugs: expJugs,
        returned_jugs: retJugs,
        unresolved_count: Math.max(0, unresolved),
        has_discrepancy: hasDiscrepancy,
        active_session_id: session?.id || null,
        last_event_time: session ? formatTimeIST(session.updated_at) : null,
      });
    }

    return summaries.sort((a, b) => a.table_number - b.table_number);
  }

  async getTableDetail(tableId: string): Promise<{
    table: UtensilTableSummary | null;
    session: UtensilOperationSession | null;
    items: UtensilOperationItem[];
    discrepancies: UtensilDiscrepancy[];
    events: UtensilEvent[];
  }> {
    const summaries = await this.getTableSummaries();
    const tableSummary = summaries.find((t) => t.table_id === tableId) || null;

    const session = this.store.sessions.find((s) => s.table_id === tableId) || null;
    const items = session ? this.store.items.filter((i) => i.operation_session_id === session.id) : [];
    const discrepancies = session
      ? this.store.discrepancies.filter((d) => d.operation_session_id === session.id || d.origin_table_id === tableId)
      : this.store.discrepancies.filter((d) => d.origin_table_id === tableId);
    const events = this.store.events
      .filter((e) => e.table_id === tableId)
      .sort((a, b) => new Date(b.performed_at).getTime() - new Date(a.performed_at).getTime());

    return {
      table: tableSummary,
      session,
      items,
      discrepancies,
      events,
    };
  }

  async openShelf(
    tableId: string,
    supplierId: string = 'b5555555-5555-5555-5555-555555555551',
    mealSessionId?: string
  ): Promise<{ success: boolean; session?: UtensilOperationSession; error?: string }> {
    const existing = this.store.sessions.find((s) => s.table_id === tableId);
    const nowIso = new Date().toISOString();

    if (existing) {
      validateShelfTransitionOrThrow(existing.status, 'OPENED');
      existing.status = 'OPENED';
      existing.opened_by = supplierId;
      existing.opened_at = nowIso;
      existing.updated_at = nowIso;

      this.store.events.push({
        id: `ue-${Date.now()}`,
        operation_session_id: existing.id,
        table_id: tableId,
        event_type: 'SHELF_OPENED',
        performed_by: supplierId,
        performed_at: nowIso,
        metadata: { time: formatTimeIST(nowIso) },
      });

      return { success: true, session: existing };
    }

    const sessionId = `ops-${Date.now()}`;
    const newSession: UtensilOperationSession = {
      id: sessionId,
      table_id: tableId,
      meal_session_id: mealSessionId || null,
      status: 'OPENED',
      opened_by: supplierId,
      opened_at: nowIso,
      created_at: nowIso,
      updated_at: nowIso,
    };
    this.store.sessions.push(newSession);

    // Default 8 plates, 8 glasses, 1 jug
    this.store.items.push(
      { id: `it-${sessionId}-p`, operation_session_id: sessionId, utensil_type_id: 'u-plate', expected_quantity: 8, distributed_quantity: 0, returned_quantity: 0, unresolved_quantity: 0, created_at: nowIso, updated_at: nowIso },
      { id: `it-${sessionId}-g`, operation_session_id: sessionId, utensil_type_id: 'u-glass', expected_quantity: 8, distributed_quantity: 0, returned_quantity: 0, unresolved_quantity: 0, created_at: nowIso, updated_at: nowIso },
      { id: `it-${sessionId}-j`, operation_session_id: sessionId, utensil_type_id: 'u-jug', expected_quantity: 1, distributed_quantity: 0, returned_quantity: 0, unresolved_quantity: 0, created_at: nowIso, updated_at: nowIso }
    );

    this.store.events.push({
      id: `ue-${Date.now()}`,
      operation_session_id: sessionId,
      table_id: tableId,
      event_type: 'SHELF_OPENED',
      performed_by: supplierId,
      performed_at: nowIso,
      metadata: { time: formatTimeIST(nowIso) },
    });

    return { success: true, session: newSession };
  }

  async startDistribution(tableId: string): Promise<{ success: boolean; error?: string }> {
    const session = this.store.sessions.find((s) => s.table_id === tableId);
    if (!session) return { success: false, error: 'Session not found. Please open shelf first.' };

    validateShelfTransitionOrThrow(session.status, 'DISTRIBUTING');
    const nowIso = new Date().toISOString();
    session.status = 'DISTRIBUTING';
    session.distribution_started_at = nowIso;
    session.updated_at = nowIso;

    const items = this.store.items.filter((i) => i.operation_session_id === session.id);
    for (const it of items) {
      it.distributed_quantity = it.expected_quantity;
      it.updated_at = nowIso;
    }

    this.store.events.push({
      id: `ue-${Date.now()}`,
      operation_session_id: session.id,
      table_id: tableId,
      event_type: 'DISTRIBUTION_STARTED',
      performed_at: nowIso,
      metadata: { time: formatTimeIST(nowIso) },
    });

    return { success: true };
  }

  async startCollection(tableId: string): Promise<{ success: boolean; error?: string }> {
    const session = this.store.sessions.find((s) => s.table_id === tableId);
    if (!session) return { success: false, error: 'Session not found.' };

    validateShelfTransitionOrThrow(session.status, 'COLLECTING');
    const nowIso = new Date().toISOString();
    session.status = 'COLLECTING';
    session.collection_started_at = nowIso;
    session.updated_at = nowIso;

    this.store.events.push({
      id: `ue-${Date.now()}`,
      operation_session_id: session.id,
      table_id: tableId,
      event_type: 'COLLECTION_STARTED',
      performed_at: nowIso,
      metadata: { time: formatTimeIST(nowIso) },
    });

    return { success: true };
  }

  /**
   * Phase 7 Automatic Discrepancy Detection:
   * Consumes verification count. If difference > 0, creates/updates UNRESOLVED discrepancy.
   * If difference < 0, creates OVERAGE discrepancy (PRD Section 48 & 72).
   */
  async recordReturnsAndVerify(
    tableId: string,
    returned: { plates: number; glasses: number; jugs: number },
    verifiedBy?: string,
    verifiedByName?: string
  ): Promise<{ success: boolean; status: ShelfOperationStatus; unresolvedCount: number; error?: string }> {
    const session = this.store.sessions.find((s) => s.table_id === tableId);
    if (!session) return { success: false, status: 'LOCKED', unresolvedCount: 0, error: 'Session not found.' };

    validateShelfTransitionOrThrow(session.status, 'VERIFYING');
    const nowIso = new Date().toISOString();

    const items = this.store.items.filter((i) => i.operation_session_id === session.id);
    let totalUnresolved = 0;

    for (const it of items) {
      let retCount = 0;
      if (it.utensil_type_id === 'u-plate') retCount = returned.plates;
      if (it.utensil_type_id === 'u-glass') retCount = returned.glasses;
      if (it.utensil_type_id === 'u-jug') retCount = returned.jugs;

      it.returned_quantity = retCount;
      const diff = it.expected_quantity - retCount;
      it.unresolved_quantity = Math.max(0, diff);
      totalUnresolved += it.unresolved_quantity;
      it.updated_at = nowIso;

      if (diff > 0) {
        // Missing / Shortage: check for existing open duplicate before creating
        const existingDisc = this.store.discrepancies.find(
          (d) => d.origin_table_id === tableId && d.utensil_type_id === it.utensil_type_id && d.status !== 'RESOLVED'
        );

        if (existingDisc) {
          existingDisc.quantity = diff;
          existingDisc.updated_at = nowIso;
        } else {
          this.store.discrepancies.push({
            id: `disc-${Date.now()}-${it.utensil_type_id}`,
            operation_session_id: session.id,
            utensil_type_id: it.utensil_type_id,
            quantity: diff,
            status: 'UNRESOLVED',
            issue_type: 'COUNT_MISMATCH',
            origin_table_id: tableId,
            current_table_id: null,
            source_table_id: tableId,
            reported_by: verifiedBy || null,
            reported_by_name: verifiedByName || 'Supplier',
            reported_at: nowIso,
            notes: `Auto-detected verification shortage of ${diff} piece(s)`,
            history: [
              {
                id: `h-${Date.now()}`,
                discrepancy_id: `disc-${Date.now()}-${it.utensil_type_id}`,
                previous_status: 'UNRESOLVED',
                new_status: 'UNRESOLVED',
                action: 'DISCREPANCY_DETECTED',
                performed_by_name: verifiedByName || 'Automated Verification',
                performed_at: nowIso,
                reason: `Expected ${it.expected_quantity}, returned ${retCount}. Shortage: ${diff}`,
              },
            ],
            created_at: nowIso,
            updated_at: nowIso,
          });
        }

        this.store.events.push({
          id: `ue-${Date.now()}`,
          operation_session_id: session.id,
          table_id: tableId,
          utensil_type_id: it.utensil_type_id,
          event_type: 'DISCREPANCY_REPORTED',
          quantity: diff,
          performed_by: verifiedBy,
          performed_at: nowIso,
          metadata: { difference: diff, expected: it.expected_quantity, returned: retCount },
        });
      } else if (diff < 0) {
        // Overage / Extra Utensil (PRD Section 48 & 72)
        const overageCount = Math.abs(diff);
        const existingOverage = this.store.discrepancies.find(
          (d) => d.origin_table_id === tableId && d.utensil_type_id === it.utensil_type_id && d.status === 'OVERAGE'
        );

        if (existingOverage) {
          existingOverage.quantity = overageCount;
          existingOverage.updated_at = nowIso;
        } else {
          this.store.discrepancies.push({
            id: `disc-${Date.now()}-overage-${it.utensil_type_id}`,
            operation_session_id: session.id,
            utensil_type_id: it.utensil_type_id,
            quantity: overageCount,
            status: 'OVERAGE',
            issue_type: 'OVERAGE',
            origin_table_id: tableId,
            current_table_id: tableId,
            source_table_id: null,
            reported_by: verifiedBy || null,
            reported_by_name: verifiedByName || 'Supplier',
            reported_at: nowIso,
            notes: `Auto-detected overage of ${overageCount} piece(s). Possible misplaced item from another table.`,
            history: [
              {
                id: `h-ov-${Date.now()}`,
                discrepancy_id: `disc-${Date.now()}-overage-${it.utensil_type_id}`,
                previous_status: 'UNRESOLVED',
                new_status: 'OVERAGE',
                action: 'OVERAGE_DETECTED',
                performed_by_name: verifiedByName || 'Automated Verification',
                performed_at: nowIso,
                reason: `Observed ${retCount} items (expected ${it.expected_quantity}). Extra: ${overageCount}`,
              },
            ],
            created_at: nowIso,
            updated_at: nowIso,
          });
        }
      }
    }

    session.verification_started_at = nowIso;
    session.verified_by = verifiedBy || null;
    session.verified_at = nowIso;

    if (totalUnresolved > 0) {
      session.status = 'DISCREPANCY';
      session.updated_at = nowIso;
      return { success: true, status: 'DISCREPANCY', unresolvedCount: totalUnresolved };
    } else {
      session.status = 'LOCKED';
      session.closed_by = verifiedBy || null;
      session.closed_at = nowIso;
      session.updated_at = nowIso;

      this.store.events.push({
        id: `ue-${Date.now()}`,
        operation_session_id: session.id,
        table_id: tableId,
        event_type: 'SHELF_CLOSED',
        performed_by: verifiedBy,
        performed_at: nowIso,
        metadata: { status: 'All items verified and returned' },
      });

      return { success: true, status: 'LOCKED', unresolvedCount: 0 };
    }
  }

  /**
   * Phase 7 Manual Discrepancy Reporting (PRD Section 12 & 45):
   * Includes duplicate prevention. If an open issue of same type exists for this table, updates it.
   */
  async reportDiscrepancy(
    originTableId: string,
    utensilCode: UtensilTypeCode,
    quantity: number,
    status: DiscrepancyStatus = 'MISSING',
    currentTableId?: string | null,
    note?: string,
    reporterId?: string,
    reporterName?: string,
    userRole?: UserRole | string
  ): Promise<{ success: boolean; discrepancyId?: string; error?: string }> {
    if (quantity <= 0) return { success: false, error: 'Discrepancy quantity must be greater than zero.' };

    const type = this.store.types.find((t) => t.code === utensilCode) || this.store.types[0];
    const session = this.store.sessions.find((s) => s.table_id === originTableId);
    const nowIso = new Date().toISOString();

    // Duplicate Prevention Check (PRD Section 45 & 70)
    const existingOpen = this.store.discrepancies.find(
      (d) => d.origin_table_id === originTableId && d.utensil_type_id === type.id && d.status !== 'RESOLVED'
    );

    if (existingOpen) {
      // Update existing discrepancy with note and updated quantity
      existingOpen.quantity = Math.max(existingOpen.quantity, quantity);
      existingOpen.status = status;
      existingOpen.issue_type = (status === 'DAMAGED' || status === 'BROKEN' || status === 'MISPLACED' || status === 'OVERAGE') ? status : 'MISSING';
      existingOpen.notes = note ? `${existingOpen.notes || ''} | ${note}` : existingOpen.notes;
      existingOpen.updated_at = nowIso;

      existingOpen.history = existingOpen.history || [];
      existingOpen.history.push({
        id: `h-${Date.now()}`,
        discrepancy_id: existingOpen.id,
        previous_status: existingOpen.status,
        new_status: status,
        action: 'DISCREPANCY_UPDATED',
        performed_by: reporterId,
        performed_by_name: reporterName || 'Supplier',
        performed_at: nowIso,
        notes: note || `Updated quantity to ${existingOpen.quantity}`,
      });

      return { success: true, discrepancyId: existingOpen.id };
    }

    const discId = `disc-${Date.now()}`;
    const issueType: DiscrepancyIssueType =
      status === 'DAMAGED' ? 'DAMAGED' :
      status === 'BROKEN' ? 'BROKEN' :
      status === 'MISPLACED' ? 'MISPLACED' :
      status === 'OVERAGE' ? 'OVERAGE' : 'MISSING';

    const newDisc: UtensilDiscrepancy = {
      id: discId,
      operation_session_id: session?.id || `ops-${Date.now()}`,
      utensil_type_id: type.id,
      quantity,
      status,
      issue_type: issueType,
      origin_table_id: originTableId,
      current_table_id: currentTableId || null,
      source_table_id: originTableId,
      reported_by: reporterId || null,
      reported_by_name: reporterName || 'Supplier',
      reported_at: nowIso,
      notes: note || `Reported as ${status}`,
      history: [
        {
          id: `h-${Date.now()}`,
          discrepancy_id: discId,
          previous_status: 'UNRESOLVED',
          new_status: status,
          action: status === 'DAMAGED' ? 'DAMAGE_REPORTED' : status === 'BROKEN' ? 'BREAKAGE_REPORTED' : 'MISSING_REPORTED',
          performed_by: reporterId,
          performed_by_name: reporterName || 'Supplier',
          performed_at: nowIso,
          notes: note || `Reported ${quantity} ${type.name} as ${status}`,
        },
      ],
      created_at: nowIso,
      updated_at: nowIso,
    };

    this.store.discrepancies.push(newDisc);

    if (session && (status === 'UNRESOLVED' || status === 'MISSING' || status === 'MISPLACED' || status === 'DAMAGED' || status === 'BROKEN')) {
      session.status = 'DISCREPANCY';
      session.updated_at = nowIso;
    }

    this.store.events.push({
      id: `ue-${Date.now()}`,
      table_id: originTableId,
      utensil_type_id: type.id,
      event_type: status === 'MISPLACED' ? 'ITEM_MARKED_MISPLACED' : status === 'DAMAGED' ? 'ITEM_MARKED_DAMAGED' : status === 'BROKEN' ? 'ITEM_MARKED_BROKEN' : 'DISCREPANCY_REPORTED',
      quantity,
      performed_by: reporterId,
      performed_at: nowIso,
      metadata: { status, currentTableId, note },
    });

    return { success: true, discrepancyId: discId };
  }

  /**
   * Phase 7 Classification Mutation:
   * Moves UNRESOLVED into MISSING, MISPLACED, DAMAGED, or BROKEN.
   */
  async classifyDiscrepancy(
    discrepancyId: string,
    newStatus: DiscrepancyStatus,
    currentTableId?: string | null,
    notes?: string,
    performedBy?: string,
    performedByName?: string,
    userRole?: UserRole | string
  ): Promise<{ success: boolean; error?: string }> {
    const disc = this.store.discrepancies.find((d) => d.id === discrepancyId);
    if (!disc) return { success: false, error: 'Discrepancy record not found.' };

    try {
      validateDiscrepancyTransitionOrThrow(disc.status, newStatus);
    } catch (err: any) {
      return { success: false, error: err.message };
    }

    const authCheck = isAuthorizedForTransition(userRole || 'ADMIN', newStatus);
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.reason || 'Unauthorized transition.' };
    }

    const nowIso = new Date().toISOString();
    const prevStatus = disc.status;

    disc.status = newStatus;
    if (newStatus === 'MISSING' || newStatus === 'MISPLACED' || newStatus === 'DAMAGED' || newStatus === 'BROKEN') {
      disc.issue_type = newStatus;
    }
    if (currentTableId) disc.current_table_id = currentTableId;
    disc.updated_at = nowIso;

    disc.history = disc.history || [];
    disc.history.push({
      id: `h-${Date.now()}`,
      discrepancy_id: disc.id,
      previous_status: prevStatus,
      new_status: newStatus,
      action: 'DISCREPANCY_CLASSIFIED',
      performed_by: performedBy,
      performed_by_name: performedByName || 'Supervisor',
      performed_at: nowIso,
      notes,
    });

    this.store.events.push({
      id: `ue-${Date.now()}`,
      table_id: disc.origin_table_id,
      utensil_type_id: disc.utensil_type_id,
      event_type: 'DISCREPANCY_CLASSIFIED',
      quantity: disc.quantity,
      performed_by: performedBy,
      performed_at: nowIso,
      metadata: { previous_status: prevStatus, new_status: newStatus, currentTableId, notes },
    });

    return { success: true };
  }

  /**
   * Phase 7 Step: Mark Found (PRD Section 16)
   * Finding an item at a table is recorded as FOUND.
   */
  async markFound(
    discrepancyId: string,
    foundTableId: string,
    foundBy?: string,
    foundByName?: string,
    notes?: string
  ): Promise<{ success: boolean; error?: string }> {
    const disc = this.store.discrepancies.find((d) => d.id === discrepancyId);
    if (!disc) return { success: false, error: 'Discrepancy not found.' };

    try {
      validateDiscrepancyTransitionOrThrow(disc.status, 'FOUND');
    } catch (err: any) {
      return { success: false, error: err.message };
    }

    const nowIso = new Date().toISOString();
    const prevStatus = disc.status;

    disc.status = 'FOUND';
    disc.current_table_id = foundTableId;
    disc.found_by = foundBy || null;
    disc.found_by_name = foundByName || 'Dining Staff';
    disc.found_at = nowIso;
    disc.updated_at = nowIso;

    disc.history = disc.history || [];
    disc.history.push({
      id: `h-${Date.now()}`,
      discrepancy_id: disc.id,
      previous_status: prevStatus,
      new_status: 'FOUND',
      action: 'ITEM_FOUND',
      performed_by: foundBy,
      performed_by_name: foundByName || 'Dining Staff',
      performed_at: nowIso,
      notes: notes || `Utensil physically located at Table ${foundTableId}`,
    });

    this.store.events.push({
      id: `ue-${Date.now()}`,
      table_id: disc.origin_table_id,
      utensil_type_id: disc.utensil_type_id,
      event_type: 'ITEM_FOUND',
      quantity: disc.quantity,
      performed_by: foundBy,
      performed_at: nowIso,
      metadata: { foundTableId, notes },
    });

    return { success: true };
  }

  /**
   * Phase 7 Step: Record Physical Return (PRD Section 16)
   * Found item has been physically transferred back to the source table.
   */
  async recordReturn(
    discrepancyId: string,
    returnedToTableId: string,
    performedBy?: string,
    performedByName?: string,
    notes?: string
  ): Promise<{ success: boolean; error?: string }> {
    const disc = this.store.discrepancies.find((d) => d.id === discrepancyId);
    if (!disc) return { success: false, error: 'Discrepancy not found.' };

    try {
      validateDiscrepancyTransitionOrThrow(disc.status, 'RETURNED');
    } catch (err: any) {
      return { success: false, error: err.message };
    }

    const nowIso = new Date().toISOString();
    const prevStatus = disc.status;

    disc.status = 'RETURNED';
    disc.updated_at = nowIso;

    disc.history = disc.history || [];
    disc.history.push({
      id: `h-${Date.now()}`,
      discrepancy_id: disc.id,
      previous_status: prevStatus,
      new_status: 'RETURNED',
      action: 'ITEM_RETURNED',
      performed_by: performedBy,
      performed_by_name: performedByName || 'Supplier',
      performed_at: nowIso,
      notes: notes || `Item physically brought back to Table ${returnedToTableId}`,
    });

    this.store.events.push({
      id: `ue-${Date.now()}`,
      table_id: disc.origin_table_id,
      utensil_type_id: disc.utensil_type_id,
      event_type: 'ITEM_RETURNED',
      quantity: disc.quantity,
      performed_by: performedBy,
      performed_at: nowIso,
      metadata: { returnedToTableId, notes },
    });

    return { success: true };
  }

  /**
   * Phase 7 Step: Confirm Recovery & Atomic Inventory Reconciliation (PRD Section 15, 16, 47, 64)
   * Only authorized roles (Supervisor/Admin) may confirm recovery.
   * Atomically updates source table inventory, balances any found table overage,
   * closes shelf session if zero unresolved remain, and locks the discrepancy as RESOLVED.
   */
  async confirmRecovery(
    discrepancyId: string,
    confirmedBy: string = 'a0000000-0000-0000-0000-000000000001',
    confirmedByName: string = 'Supervisor',
    userRole: UserRole | string = 'SUPERVISOR',
    notes?: string
  ): Promise<{ success: boolean; error?: string }> {
    const disc = this.store.discrepancies.find((d) => d.id === discrepancyId);
    if (!disc) return { success: false, error: 'Discrepancy not found.' };

    const authCheck = isAuthorizedForTransition(userRole, 'RECOVERED');
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.reason || 'Only authorized supervisors can confirm utensil recovery.' };
    }

    const nowIso = new Date().toISOString();
    const prevStatus = disc.status;

    // Transition directly to RESOLVED via RECOVERED
    disc.status = 'RESOLVED';
    disc.resolution_type = 'RECOVERED';
    disc.resolution_reason = notes || 'Recovered and reconciled into table inventory';
    disc.return_confirmed_by = confirmedBy;
    disc.return_confirmed_by_name = confirmedByName;
    disc.return_confirmed_at = nowIso;
    disc.resolved_by = confirmedBy;
    disc.resolved_by_name = confirmedByName;
    disc.resolved_at = nowIso;
    disc.updated_at = nowIso;

    disc.history = disc.history || [];
    disc.history.push(
      {
        id: `h-${Date.now()}-rec`,
        discrepancy_id: disc.id,
        previous_status: prevStatus,
        new_status: 'RECOVERED',
        action: 'RECOVERY_CONFIRMED',
        performed_by: confirmedBy,
        performed_by_name: confirmedByName,
        performed_at: nowIso,
        notes: notes || 'Physical presence confirmed by supervisor',
      },
      {
        id: `h-${Date.now()}-res`,
        discrepancy_id: disc.id,
        previous_status: 'RECOVERED',
        new_status: 'RESOLVED',
        action: 'DISCREPANCY_RESOLVED',
        performed_by: confirmedBy,
        performed_by_name: confirmedByName,
        performed_at: nowIso,
        reason: 'Reconciled into inventory',
      }
    );

    // Atomic Inventory Update for Source Table
    const sourceSession = this.store.sessions.find((s) => s.table_id === disc.origin_table_id);
    if (sourceSession) {
      const items = this.store.items.filter((i) => i.operation_session_id === sourceSession.id);
      for (const it of items) {
        if (it.utensil_type_id === disc.utensil_type_id) {
          it.returned_quantity = it.expected_quantity;
          it.unresolved_quantity = 0;
          it.updated_at = nowIso;
        }
      }

      // Check if all session items are now reconciled
      const unresolvedRemaining = items.reduce((acc, i) => acc + i.unresolved_quantity, 0);
      if (unresolvedRemaining === 0) {
        sourceSession.status = 'LOCKED';
        sourceSession.closed_by = confirmedBy;
        sourceSession.closed_at = nowIso;
        sourceSession.updated_at = nowIso;

        this.store.events.push({
          id: `ue-${Date.now()}-close`,
          operation_session_id: sourceSession.id,
          table_id: disc.origin_table_id,
          event_type: 'SHELF_CLOSED',
          performed_by: confirmedBy,
          performed_at: nowIso,
          metadata: { note: 'All items reconciled after verified recovery' },
        });
      }
    }

    // Reconcile Found Table Overage if applicable (PRD Section 47)
    if (disc.current_table_id && disc.current_table_id !== disc.origin_table_id) {
      const foundSession = this.store.sessions.find((s) => s.table_id === disc.current_table_id);
      if (foundSession) {
        const foundItems = this.store.items.filter((i) => i.operation_session_id === foundSession.id);
        for (const it of foundItems) {
          if (it.utensil_type_id === disc.utensil_type_id) {
            it.returned_quantity = it.expected_quantity; // Reconcile extra count
            it.updated_at = nowIso;
          }
        }
      }

      // Resolve linked overage discrepancy at found table
      const overageDisc = this.store.discrepancies.find(
        (d) => d.origin_table_id === disc.current_table_id && d.utensil_type_id === disc.utensil_type_id && d.status === 'OVERAGE'
      );
      if (overageDisc) {
        overageDisc.status = 'RESOLVED';
        overageDisc.resolution_type = 'RETURNED';
        overageDisc.resolution_reason = `Item transferred back to Table ${disc.origin_table_id}`;
        overageDisc.resolved_at = nowIso;
        overageDisc.resolved_by = confirmedBy;
        overageDisc.resolved_by_name = confirmedByName;
        overageDisc.updated_at = nowIso;
      }
    }

    this.store.events.push({
      id: `ue-${Date.now()}`,
      table_id: disc.origin_table_id,
      utensil_type_id: disc.utensil_type_id,
      event_type: 'RECOVERY_CONFIRMED',
      quantity: disc.quantity,
      performed_by: confirmedBy,
      performed_at: nowIso,
      metadata: { notes, confirmedByName },
    });

    return { success: true };
  }

  /**
   * Phase 7 Repair Tracking (PRD Section 19)
   */
  async updateRepairStatus(
    discrepancyId: string,
    repairStatus: 'REPAIR_REQUIRED' | 'UNDER_REPAIR' | 'RETURNED_FROM_REPAIR' | 'IN_SERVICE',
    performedBy?: string,
    performedByName?: string,
    userRole: UserRole | string = 'SUPERVISOR',
    notes?: string
  ): Promise<{ success: boolean; error?: string }> {
    const disc = this.store.discrepancies.find((d) => d.id === discrepancyId);
    if (!disc) return { success: false, error: 'Discrepancy not found.' };

    try {
      validateDiscrepancyTransitionOrThrow(disc.status, repairStatus);
    } catch (err: any) {
      return { success: false, error: err.message };
    }

    const nowIso = new Date().toISOString();
    const prevStatus = disc.status;

    disc.status = repairStatus;
    disc.updated_at = nowIso;

    // If returning into service, resolve discrepancy
    if (repairStatus === 'IN_SERVICE') {
      disc.status = 'RESOLVED';
      disc.resolution_type = 'RETURNED_TO_SERVICE';
      disc.resolution_reason = notes || 'Repaired and restored to active dining inventory';
      disc.resolved_by = performedBy || null;
      disc.resolved_by_name = performedByName || 'Maintenance';
      disc.resolved_at = nowIso;
    }

    disc.history = disc.history || [];
    disc.history.push({
      id: `h-${Date.now()}`,
      discrepancy_id: disc.id,
      previous_status: prevStatus,
      new_status: repairStatus,
      action: repairStatus === 'REPAIR_REQUIRED' ? 'REPAIR_REQUESTED' : repairStatus === 'UNDER_REPAIR' ? 'REPAIR_STARTED' : 'REPAIR_COMPLETED',
      performed_by: performedBy,
      performed_by_name: performedByName || 'Supervisor',
      performed_at: nowIso,
      notes,
    });

    this.store.events.push({
      id: `ue-${Date.now()}`,
      table_id: disc.origin_table_id,
      utensil_type_id: disc.utensil_type_id,
      event_type: repairStatus === 'UNDER_REPAIR' ? 'REPAIR_STARTED' : repairStatus === 'IN_SERVICE' ? 'REPAIR_COMPLETED' : 'REPAIR_REQUESTED',
      quantity: disc.quantity,
      performed_by: performedBy,
      performed_at: nowIso,
      metadata: { repairStatus, notes },
    });

    return { success: true };
  }

  /**
   * Phase 7 Permanent Disposal (PRD Section 20)
   * Only authorized roles can approve disposal.
   */
  async approveDisposal(
    discrepancyId: string,
    reason: string,
    approvedBy: string = 'a0000000-0000-0000-0000-000000000001',
    approvedByName: string = 'Dining Supervisor',
    userRole: UserRole | string = 'SUPERVISOR',
    notes?: string
  ): Promise<{ success: boolean; error?: string }> {
    const disc = this.store.discrepancies.find((d) => d.id === discrepancyId);
    if (!disc) return { success: false, error: 'Discrepancy not found.' };

    const authCheck = isAuthorizedForTransition(userRole, 'DISCARDED');
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.reason || 'Only authorized supervisors can approve utensil disposal.' };
    }

    try {
      validateDiscrepancyTransitionOrThrow(disc.status, 'DISCARDED');
    } catch (err: any) {
      return { success: false, error: err.message };
    }

    const nowIso = new Date().toISOString();
    const prevStatus = disc.status;

    disc.status = 'RESOLVED';
    disc.resolution_type = 'DISCARDED';
    disc.resolution_reason = reason;
    disc.approved_by = approvedBy;
    disc.approved_by_name = approvedByName;
    disc.approved_at = nowIso;
    disc.resolved_by = approvedBy;
    disc.resolved_by_name = approvedByName;
    disc.resolved_at = nowIso;
    disc.updated_at = nowIso;

    disc.history = disc.history || [];
    disc.history.push({
      id: `h-${Date.now()}`,
      discrepancy_id: disc.id,
      previous_status: prevStatus,
      new_status: 'DISCARDED',
      action: 'DISPOSAL_APPROVED',
      performed_by: approvedBy,
      performed_by_name: approvedByName,
      performed_at: nowIso,
      reason,
      notes,
    });

    this.store.events.push({
      id: `ue-${Date.now()}`,
      table_id: disc.origin_table_id,
      utensil_type_id: disc.utensil_type_id,
      event_type: 'DISPOSAL_APPROVED',
      quantity: disc.quantity,
      performed_by: approvedBy,
      performed_at: nowIso,
      metadata: { reason, notes, approvedByName },
    });

    return { success: true };
  }

  /**
   * Phase 7 Discrepancy Reopening (PRD Section 44)
   * Only authorized roles can reopen a resolved discrepancy with reason.
   */
  async reopenDiscrepancy(
    discrepancyId: string,
    reason: string,
    reopenedBy: string = 'a0000000-0000-0000-0000-000000000001',
    reopenedByName: string = 'Supervisor',
    userRole: UserRole | string = 'SUPERVISOR'
  ): Promise<{ success: boolean; error?: string }> {
    const disc = this.store.discrepancies.find((d) => d.id === discrepancyId);
    if (!disc) return { success: false, error: 'Discrepancy not found.' };

    const authCheck = isAuthorizedForTransition(userRole, 'UNRESOLVED');
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.reason || 'Only authorized supervisors can reopen a discrepancy.' };
    }

    if (!reason || reason.trim().length < 5) {
      return { success: false, error: 'A specific valid reason is required to reopen this discrepancy.' };
    }

    const nowIso = new Date().toISOString();
    const prevStatus = disc.status;

    disc.status = 'UNRESOLVED';
    disc.resolution_type = null;
    disc.resolution_reason = null;
    disc.resolved_at = null;
    disc.resolved_by = null;
    disc.updated_at = nowIso;

    disc.history = disc.history || [];
    disc.history.push({
      id: `h-${Date.now()}`,
      discrepancy_id: disc.id,
      previous_status: prevStatus,
      new_status: 'UNRESOLVED',
      action: 'DISCREPANCY_REOPENED',
      performed_by: reopenedBy,
      performed_by_name: reopenedByName,
      performed_at: nowIso,
      reason,
    });

    this.store.events.push({
      id: `ue-${Date.now()}`,
      table_id: disc.origin_table_id,
      utensil_type_id: disc.utensil_type_id,
      event_type: 'DISCREPANCY_REOPENED',
      quantity: disc.quantity,
      performed_by: reopenedBy,
      performed_at: nowIso,
      metadata: { reason, reopenedByName },
    });

    return { success: true };
  }

  async getDiscrepancyById(id: string): Promise<UtensilDiscrepancy | null> {
    const disc = this.store.discrepancies.find((d) => d.id === id);
    if (!disc) return null;

    const tableProvider = getTableProvider();
    const tables = await tableProvider.getTables();

    return {
      ...disc,
      utensil_type: this.store.types.find((t) => t.id === disc.utensil_type_id),
      origin_table: tables.find((t) => t.id === disc.origin_table_id),
      current_table: tables.find((t) => t.id === disc.current_table_id),
    };
  }

  async getAllDiscrepancies(): Promise<UtensilDiscrepancy[]> {
    const tableProvider = getTableProvider();
    const tables = await tableProvider.getTables();

    return this.store.discrepancies.map((d) => ({
      ...d,
      utensil_type: this.store.types.find((t) => t.id === d.utensil_type_id),
      origin_table: tables.find((t) => t.id === d.origin_table_id),
      current_table: tables.find((t) => t.id === d.current_table_id),
    })).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async crossTableRecovery(
    originTableNumber: number,
    foundAtTableNumber: number,
    utensilCode: UtensilTypeCode,
    note?: string
  ): Promise<{ success: boolean; error?: string }> {
    const tableProvider = getTableProvider();
    const tables = await tableProvider.getTables();
    const originTable = tables.find((t) => t.table_number === originTableNumber);
    const foundTable = tables.find((t) => t.table_number === foundAtTableNumber);

    if (!originTable) return { success: false, error: `Origin Table ${originTableNumber} not found.` };
    const type = this.store.types.find((t) => t.code === utensilCode) || this.store.types[1];

    const disc = this.store.discrepancies.find(
      (d) => d.origin_table_id === originTable.id && d.status !== 'RESOLVED'
    );

    if (disc) {
      disc.current_table_id = foundTable?.id || null;
      return this.confirmRecovery(disc.id, 'a0000000-0000-0000-0000-000000000001', 'Supervisor', 'SUPERVISOR', note);
    } else {
      // Create and confirm recovery
      const res = await this.reportDiscrepancy(
        originTable.id,
        utensilCode,
        1,
        'MISPLACED',
        foundTable?.id,
        note
      );
      if (res.success && res.discrepancyId) {
        return this.confirmRecovery(res.discrepancyId, 'a0000000-0000-0000-0000-000000000001', 'Supervisor', 'SUPERVISOR', note);
      }
      return { success: false, error: 'Could not create discrepancy for recovery.' };
    }
  }

  async supervisorOverrideClose(
    tableId: string,
    reason: string,
    supervisorId: string = 'a0000000-0000-0000-0000-000000000001'
  ): Promise<{ success: boolean; error?: string }> {
    const session = this.store.sessions.find((s) => s.table_id === tableId);
    if (!session) return { success: false, error: 'Session not found.' };

    const nowIso = new Date().toISOString();
    session.status = 'LOCKED';
    session.closed_by = supervisorId;
    session.closed_at = nowIso;
    session.updated_at = nowIso;

    this.store.events.push({
      id: `ue-${Date.now()}`,
      operation_session_id: session.id,
      table_id: tableId,
      event_type: 'SUPERVISOR_OVERRIDE',
      performed_by: supervisorId,
      performed_at: nowIso,
      metadata: { reason, previous_status: 'DISCREPANCY', forced_state: 'LOCKED' },
    });

    return { success: true };
  }

  async getReports(): Promise<{
    daily: { tablesOperated: number; distributed: number; returned: number; missing: number; misplaced: number; recovered: number; recoveryRate: string };
    weekly: { tableDiscrepancies: { tableNumber: number; incidents: number }[]; repeatedDiscrepancies: number };
    monthly: { totalMissing: number; totalRecovered: number; broken: number; discarded: number };
  }> {
    const stats = await this.getDashboardStats();

    return {
      daily: {
        tablesOperated: 24,
        distributed: 24 * 17,
        returned: 24 * 17 - stats.missing_items,
        missing: stats.missing_items,
        misplaced: stats.misplaced_items,
        recovered: stats.recovered_items,
        recoveryRate: '92.5%',
      },
      weekly: {
        tableDiscrepancies: [
          { tableNumber: 31, incidents: 1 },
          { tableNumber: 32, incidents: 1 },
          { tableNumber: 24, incidents: 1 },
          { tableNumber: 18, incidents: 1 },
          { tableNumber: 14, incidents: 1 },
        ],
        repeatedDiscrepancies: 2,
      },
      monthly: {
        totalMissing: 3,
        totalRecovered: 14,
        broken: 3,
        discarded: 1,
      },
    };
  }
}

// Singleton provider instance
let utensilProviderInstance: UtensilProvider | null = null;

export function getUtensilProvider(): UtensilProvider {
  if (!utensilProviderInstance) {
    utensilProviderInstance = new UtensilProvider();
  }
  return utensilProviderInstance;
}
