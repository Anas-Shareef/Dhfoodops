// =====================================================================
// Phase 6: Supplier Live Monitoring Engine (PRD Section 18, 19, 21, 56)
// Synthesizes Supplier Check-Ins, Absences, Handovers, and Phase 5 Utensil
// Shelf Operations into real-time operational status and timelines.
// =====================================================================

import { 
  SupplierAssignment, 
  SupplierCheckin, 
  SupplierAbsence, 
  SupplierHandover, 
  SupplierDutyEvent, 
  UtensilOperationSession, 
  UtensilDiscrepancy, 
  UtensilEvent,
  TableMonitoringStatus,
  SupplierDerivedStatus,
  Student,
  DiningTable
} from '@/types/database';
import { formatTimeIST } from '@/lib/utils/timezone';

export interface ComputeMonitoringParams {
  table: DiningTable;
  primaryAssignment: SupplierAssignment | null;
  backupAssignment: SupplierAssignment | null;
  checkins: SupplierCheckin[];
  absences: SupplierAbsence[];
  handovers: SupplierHandover[];
  dutyEvents: SupplierDutyEvent[];
  utensilSession: UtensilOperationSession | null;
  utensilDiscrepancies: UtensilDiscrepancy[];
  utensilEvents: UtensilEvent[];
  dutyDate: string;
  isBackupActivated: boolean;
}

export function computeTableSupplierMonitoring(params: ComputeMonitoringParams): TableMonitoringStatus {
  const {
    table,
    primaryAssignment,
    backupAssignment,
    checkins,
    absences,
    handovers,
    dutyEvents,
    utensilSession,
    utensilDiscrepancies,
    utensilEvents,
    dutyDate,
    isBackupActivated,
  } = params;

  // Active absence for primary supplier today
  const activeAbsence = absences.find(
    (a) => a.table_id === table.id && a.duty_date === dutyDate
  );

  // Active handover for this table today
  const activeHandover = handovers.find(
    (h) => h.table_id === table.id && h.status === 'completed'
  );

  // Check-in record for table today
  const checkin = checkins.find(
    (c) => c.table_id === table.id && c.duty_date === dutyDate
  );

  // Determine active supplier
  let activeSupplier: Student | null = primaryAssignment?.student || null;

  if (activeHandover?.to_student) {
    activeSupplier = activeHandover.to_student;
  } else if (isBackupActivated && backupAssignment?.student) {
    activeSupplier = backupAssignment.student;
  }

  // Build unified event timeline (PRD Section 21)
  const timeline: { time: string; event: string; actor: string }[] = [];

  // 1. Check-in event
  if (checkin) {
    timeline.push({
      time: formatTimeIST(checkin.checked_in_at),
      event: 'Supplier checked in to table station',
      actor: activeSupplier?.name || 'Assigned Supplier',
    });
  }

  // 2. Absence event
  if (activeAbsence) {
    timeline.push({
      time: '07:30 AM',
      event: `Absence recorded: ${activeAbsence.reason}`,
      actor: 'Supervisor',
    });
  }

  // 3. Backup event
  if (isBackupActivated && backupAssignment?.student) {
    timeline.push({
      time: '07:35 AM',
      event: `Emergency backup activated: ${backupAssignment.student.name}`,
      actor: 'Supervisor',
    });
  }

  // 4. Handover event
  if (activeHandover) {
    timeline.push({
      time: formatTimeIST(activeHandover.handed_over_at),
      event: `Handover transferred: ${activeHandover.reason}`,
      actor: activeHandover.to_student?.name || 'New Supplier',
    });
  }

  // 5. Utensil Shelf Events from Phase 5
  if (utensilEvents && utensilEvents.length > 0) {
    for (const ue of utensilEvents) {
      timeline.push({
        time: formatTimeIST(ue.performed_at),
        event: ue.event_type.replace(/_/g, ' '),
        actor: ue.performed_by || 'Staff',
      });
    }
  }

  // Sort timeline chronologically
  timeline.sort((a, b) => a.time.localeCompare(b.time));

  // Determine Derived Operational Status (PRD Section 18 & 32)
  let derivedStatus: SupplierDerivedStatus = 'NOT_STARTED';

  // Check unresolved discrepancies from Phase 5
  const hasUnresolvedDiscrepancy =
    utensilSession?.status === 'DISCREPANCY' ||
    utensilDiscrepancies.some(
      (d) => d.status === 'UNRESOLVED' || d.status === 'MISPLACED' || d.status === 'MISSING'
    );

  if (activeAbsence) {
    if (isBackupActivated) {
      derivedStatus = 'BACKUP_ACTIVE';
    } else {
      derivedStatus = 'ABSENT';
    }
  } else if (activeHandover) {
    derivedStatus = 'HANDED_OVER';
  } else if (utensilSession) {
    if (hasUnresolvedDiscrepancy) {
      derivedStatus = 'DISCREPANCY';
    } else if (utensilSession.status === 'VERIFYING') {
      derivedStatus = 'VERIFYING';
    } else if (utensilSession.status === 'COLLECTING') {
      derivedStatus = 'COLLECTING';
    } else if (utensilSession.status === 'DISTRIBUTING' || utensilSession.status === 'OPENED') {
      derivedStatus = 'OPERATING';
    } else if (utensilSession.status === 'LOCKED') {
      derivedStatus = 'COMPLETED';
    }
  } else if (checkin) {
    derivedStatus = 'CHECKED_IN';
  }

  // Plates, glasses, jugs count summaries
  const platesSummary = utensilSession?.items?.find((i) => i.utensil_type?.code === 'PLATE')
    ? `${utensilSession.items.find((i) => i.utensil_type?.code === 'PLATE')?.returned_quantity} / 8`
    : '8 / 8';

  const glassesSummary = utensilSession?.items?.find((i) => i.utensil_type?.code === 'GLASS')
    ? `${utensilSession.items.find((i) => i.utensil_type?.code === 'GLASS')?.returned_quantity} / 8`
    : '8 / 8';

  const jugsSummary = utensilSession?.items?.find((i) => i.utensil_type?.code === 'JUG')
    ? `${utensilSession.items.find((i) => i.utensil_type?.code === 'JUG')?.returned_quantity} / 1`
    : '1 / 1';

  return {
    table_id: table.id,
    table_number: table.table_number,
    area_name: table.dining_area?.name || 'CHS Hall',
    area_id: table.dining_area_id,
    primary_supplier: primaryAssignment?.student || null,
    backup_supplier: backupAssignment?.student || null,
    active_supplier: activeSupplier,
    operational_status: derivedStatus,
    check_in_time: checkin ? formatTimeIST(checkin.checked_in_at) : null,
    shelf_status: utensilSession?.status || 'LOCKED',
    plates_summary: platesSummary,
    glasses_summary: glassesSummary,
    jugs_summary: jugsSummary,
    discrepancy_count: hasUnresolvedDiscrepancy ? 1 : 0,
    timeline,
    is_backup_active: isBackupActivated,
    active_handover: activeHandover || null,
  };
}
