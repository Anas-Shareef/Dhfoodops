// =====================================================================
// DH Dining Management System - Phase 1 & Phase 2 Type Definitions
// =====================================================================

export type SystemRole = 
  | 'SUPER_ADMIN' 
  | 'ADMIN' 
  | 'SUPERVISOR' 
  | 'AREA_MAIN_SUPPLIER' 
  | 'TABLE_SUPPLIER' 
  | 'TEACHER_SUPPLIER' 
  | 'COOK' 
  | 'KITCHEN_STAFF' 
  | 'CLEANING_IN_CHARGE' 
  | 'DEPARTMENT_LEADER' 
  | 'STUDENT';

export type UserRole = SystemRole;

export type MealSlot = 
  | 'EARLY_MORNING_SNACKS' 
  | 'BREAKFAST' 
  | 'LUNCH' 
  | 'EVENING_SNACKS' 
  | 'DINNER';

export type MealType = 
  | 'early_morning_snacks' 
  | 'breakfast' 
  | 'lunch' 
  | 'evening_snacks' 
  | 'dinner' 
  | MealSlot;

export type SessionStatus = 
  | 'scheduled' 
  | 'attendance_open' 
  | 'attendance_closed' 
  | 'meal_active' 
  | 'completed' 
  | 'cancelled';

export type AttendanceStatus = 'attending' | 'not_attending';

export type CorrectionRequestStatus = 'pending' | 'approved' | 'rejected';

export type WindowStatus = 
  | 'NOT_OPEN'      // Before attendance_start_at
  | 'OPEN'          // Active window for declaring/changing attendance
  | 'CLOSED'        // After cutoff, awaiting meal time
  | 'MEAL_ACTIVE'   // Meal is currently being served
  | 'COMPLETED';    // Meal time has concluded

export type TableStatus = 'Active' | 'Inactive' | 'Reserved' | 'Maintenance';

export type AssignmentStatus = 'active' | 'transferred' | 'removed';

// ---------------------------------------------------------------------
// Core Entities
// ---------------------------------------------------------------------

export interface Profile {
  id: string;
  auth_user_id: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  created_at: string;
}

export interface DiningHall {
  id: string;
  name: string;
  code: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface DiningFloor {
  id: string;
  dining_hall_id: string;
  name: string;
  floor_number: number;
  created_at: string;
  updated_at: string;
  dining_hall?: DiningHall;
}

export type DiningAreaType = 'STUDENT' | 'TEACHER';

export interface DiningArea {
  id: string;
  dining_floor_id?: string | null;
  name: string;
  floor: string;
  section: string;
  area_type?: DiningAreaType;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  dining_floor?: DiningFloor;
}

export interface DiningTable {
  id: string;
  table_number: number;
  dining_area_id: string;
  dining_area?: DiningArea;
  capacity: number;
  status: TableStatus;
  map_position?: { row: number; col: number };
  created_at: string;
  updated_at: string;
  // Computed helpers
  current_members_count?: number;
  available_seats?: number;
  department_breakdown?: Record<string, number>;
}

export interface TableAssignment {
  id: string;
  student_id: string;
  table_id: string;
  assigned_from: string;
  assigned_until: string | null;
  assigned_by: string | null;
  status: AssignmentStatus;
  created_at: string;
  updated_at: string;
  student?: Student;
  table?: DiningTable;
}

export interface SeatingChangeLog {
  id: string;
  student_id: string;
  from_table_id: string | null;
  to_table_id: string | null;
  reason: string;
  changed_by: string | null;
  changed_at: string;
  metadata?: Record<string, unknown>;
  student?: Student;
  from_table_number?: number | null;
  to_table_number?: number | null;
  changed_by_name?: string;
}

export interface Student {
  id: string;
  auth_user_id: string;
  enrollment_no: string;
  name: string;
  email: string;
  department_id: string;
  department?: Department;
  year: number;
  table_number: number | null;
  table_id?: string | null;
  table_details?: DiningTable | null;
  dining_area_name?: string | null;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at: string;
}

export interface MealSchedule {
  id: string;
  meal_type: MealType;
  meal_time: string; // "HH:mm:ss"
  attendance_start_time: string; // "HH:mm:ss"
  attendance_end_time: string; // "HH:mm:ss"
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MealSession {
  id: string;
  meal_schedule_id: string | null;
  session_date: string; // "YYYY-MM-DD"
  meal_type: MealType;
  meal_time: string; // "HH:mm:ss"
  attendance_start_at: string; // ISO timestamp (TIMESTAMPTZ)
  attendance_end_at: string; // ISO timestamp (TIMESTAMPTZ)
  status: SessionStatus;
  created_at: string;
  updated_at: string;
}

export interface MealAttendance {
  id: string;
  meal_session_id: string;
  student_id: string;
  status: AttendanceStatus;
  submitted_at: string;
  updated_at: string;
  locked_at: string | null;
  created_at: string;
  student?: Student;
  meal_session?: MealSession;
}

export interface AttendanceCorrectionRequest {
  id: string;
  meal_session_id: string;
  student_id: string;
  attendance_id: string | null;
  requested_status: AttendanceStatus;
  reason: string;
  status: CorrectionRequestStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  student?: Student;
  meal_session?: MealSession;
}

export interface AuditLog {
  id: string;
  actor_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ---------------------------------------------------------------------
// Operational Dashboard & Aggregation Types
// ---------------------------------------------------------------------

export interface MealSummaryStats {
  meal_type: MealType;
  meal_time: string;
  attendance_window: string;
  total_students: number;
  attending: number;
  not_attending: number;
  no_response: number;
  window_status: WindowStatus;
}

export interface DepartmentAttendanceSummary {
  department_id: string;
  department_code: string;
  department_name: string;
  total_students: number;
  attending: number;
  not_attending: number;
  no_response: number;
  students: {
    student_id: string;
    name: string;
    enrollment_no: string;
    table_number: number | null;
    status: AttendanceStatus | 'no_response';
  }[];
}

export interface TableAttendanceSummary {
  table_number: number;
  total_assigned: number;
  attending: number;
  not_attending: number;
  no_response: number;
  members: {
    student_id: string;
    name: string;
    enrollment_no: string;
    department_code: string;
    status: AttendanceStatus | 'no_response';
  }[];
}

export interface TableOverviewStats {
  total_tables: number;
  active_tables: number;
  full_tables: number;
  available_seats: number;
  unassigned_students: number;
}

export interface TableMemberDetail {
  student_id: string;
  enrollment_no: string;
  name: string;
  department_code: string;
  department_name: string;
  year: number;
  assigned_from: string;
  attendance_status?: AttendanceStatus | 'no_response';
}

// ---------------------------------------------------------------------
// Phase 3: Monthly Supplier / Table Duty Types
// ---------------------------------------------------------------------

export type SupplierRole = 'primary' | 'backup' | 'area_main' | 'teacher_supplier';

export type SupplierScopeType = 'TABLE' | 'AREA' | 'TEACHER_AREA';

export type DutyPeriodStatus = 'draft' | 'published' | 'active' | 'completed' | 'cancelled';

export type SupplierDutyStatus = 
  | 'assigned' 
  | 'checked_in' 
  | 'active' 
  | 'absent_approved' 
  | 'unapproved_absent' 
  | 'backup_activated' 
  | 'handed_over' 
  | 'completed';

export type SupplierDerivedStatus =
  | 'NOT_STARTED'
  | 'CHECKED_IN'
  | 'OPERATING'
  | 'COLLECTING'
  | 'VERIFYING'
  | 'COMPLETED'
  | 'ABSENT'
  | 'BACKUP_REQUESTED'
  | 'BACKUP_ACTIVE'
  | 'HANDED_OVER'
  | 'DISCREPANCY';

export interface SupplierDutyPeriod {
  id: string;
  name: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  status: DutyPeriodStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupplierAssignment {
  id: string;
  duty_period_id: string;
  scope_type?: SupplierScopeType;
  scope_id?: string;
  table_id?: string | null;
  dining_area_id?: string | null;
  student_id: string;
  role: SupplierRole;
  valid_from: string;
  valid_until: string;
  status: 'active' | 'transferred' | 'cancelled';
  assigned_by: string | null;
  created_at: string;
  updated_at: string;
  student?: Student;
  table?: DiningTable;
  dining_area?: DiningArea;
  duty_period?: SupplierDutyPeriod;
}

export interface SupplierCheckin {
  id: string;
  assignment_id: string;
  table_id: string;
  student_id: string;
  duty_date: string;
  status: 'checked_in' | 'completed' | 'missed';
  checked_in_at: string;
  checked_out_at: string | null;
  remarks: string | null;
  student?: Student;
  table?: DiningTable;
}

export interface SupplierAbsence {
  id: string;
  student_id: string;
  table_id: string;
  duty_date: string;
  status: 'approved_absent' | 'unapproved_absent';
  reason: string;
  approved_by: string | null;
  created_at: string;
  student?: Student;
  table?: DiningTable;
}

export interface SupplierHandover {
  id: string;
  table_id: string;
  from_supplier_id: string;
  to_supplier_id: string;
  reason: string;
  authorized_by: string | null;
  handed_over_at: string;
  status: 'pending' | 'completed' | 'rejected';
  remarks: string | null;
  from_student?: Student;
  to_student?: Student;
  table?: DiningTable;
}

export interface SupplierDutyEvent {
  id: string;
  table_id: string;
  supplier_id: string;
  duty_date: string;
  event_type: 'CHECK_IN' | 'SHELF_OPENED' | 'SHELF_CLOSED' | 'UTENSILS_VERIFIED' | 'BACKUP_ACTIVATED' | 'HANDOVER';
  metadata?: Record<string, unknown>;
  created_at: string;
  table?: DiningTable;
  supplier?: Student;
}

export interface TodayDutyItem {
  table_id: string;
  table_number: number;
  area_name: string;
  primary_assignment: SupplierAssignment | null;
  backup_assignment: SupplierAssignment | null;
  current_status: SupplierDutyStatus;
  checked_in_at?: string | null;
  backup_activated_at?: string | null;
  active_supplier?: Student | null;
  latest_event?: string | null;
}

export interface SupplierDashboardStats {
  total_tables: number;
  assigned_tables: number;
  checked_in: number;
  absent: number;
  pending: number;
  backup_activated: number;
  completed?: number;
  discrepancies?: number;
}

export interface SupplierPool {
  id: string;
  name: string;
  dining_area_id?: string | null;
  duty_period_id: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  dining_area?: DiningArea;
  members?: SupplierPoolMember[];
}

export interface SupplierPoolMember {
  id: string;
  pool_id: string;
  student_id: string;
  priority: number;
  is_backup_eligible: boolean;
  created_at: string;
  student?: Student;
}

export interface SupplierRotationRule {
  id: string;
  name: string;
  rule_type: 'ROUND_ROBIN' | 'FIXED' | 'CUSTOM';
  frequency: 'WEEKLY' | 'MONTHLY' | 'DUTY_PERIOD';
  parameters?: Record<string, unknown>;
  created_at: string;
}

export interface SupplierScheduleGeneration {
  id: string;
  duty_period_id: string;
  dining_area_id: string;
  pool_id?: string | null;
  rotation_rule_id?: string | null;
  status: 'DRAFT' | 'GENERATED' | 'REVIEW' | 'PUBLISHED' | 'ACTIVE' | 'COMPLETED';
  generated_assignments_count: number;
  conflicts_count: number;
  published_by?: string | null;
  published_at?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  duty_period?: SupplierDutyPeriod;
  dining_area?: DiningArea;
  pool?: SupplierPool;
  rotation_rule?: SupplierRotationRule;
}

export interface TableMonitoringStatus {
  table_id: string;
  table_number: number;
  area_name: string;
  area_id: string;
  primary_supplier: Student | null;
  backup_supplier: Student | null;
  active_supplier: Student | null;
  operational_status: SupplierDerivedStatus;
  check_in_time?: string | null;
  shelf_status: ShelfOperationStatus;
  plates_summary: string;
  glasses_summary: string;
  jugs_summary: string;
  discrepancy_count: number;
  timeline: { time: string; event: string; actor: string }[];
  is_backup_active: boolean;
  active_handover?: SupplierHandover | null;
}

export interface SupplierAreaMonitoringSummary {
  area_id: string;
  area_name: string;
  main_supplier?: Student | null;
  total_tables: number;
  completed_count: number;
  in_progress_count: number;
  not_started_count: number;
  discrepancy_count: number;
  absent_count: number;
  backup_active_count: number;
  tables: TableMonitoringStatus[];
}

// ---------------------------------------------------------------------
// Phase 4: Food Requirement & Meal Planning Domain Types
// ---------------------------------------------------------------------

export type FoodItemCategory = 'main_dish' | 'curry' | 'side' | 'beverage' | 'staple' | 'dessert';

export type FoodUnit = 'portions' | 'kg' | 'litres' | 'cups' | 'pieces' | 'packets' | 'trays' | 'batches';

export type MealRequirementStatus = 
  | 'draft' 
  | 'awaiting_attendance' 
  | 'calculated' 
  | 'approved' 
  | 'preparation_started' 
  | 'prepared' 
  | 'serving' 
  | 'completed' 
  | 'cancelled';

export type LeftoverClassification = 'usable' | 'not_usable' | 'discarded' | 'stored' | 'transferred';

export type ServingStatus = 'not_started' | 'ready' | 'serving' | 'completed';

export interface FoodItem {
  id: string;
  name: string;
  category: FoodItemCategory;
  unit: FoodUnit;
  default_consumption_factor: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MealRequirement {
  id: string;
  meal_session_id: string;
  attending_count: number;
  not_attending_count: number;
  no_response_count: number;
  buffer_percent: number;
  base_quantity: number;
  recommended_quantity: number;
  status: MealRequirementStatus;
  calculation_version: number;
  approved_by?: string | null;
  approved_at?: string | null;
  created_at: string;
  updated_at: string;
  items?: MealRequirementItem[];
  revisions?: MealRequirementRevision[];
  meal_session?: MealSession;
}

export interface MealRequirementItem {
  id: string;
  meal_requirement_id: string;
  food_item_id: string;
  consumption_factor: number;
  base_quantity: number;
  buffer_quantity: number;
  recommended_quantity: number;
  unit: FoodUnit;
  created_at: string;
  updated_at: string;
  food_item?: FoodItem;
}

export interface MealRequirementRevision {
  id: string;
  meal_requirement_id: string;
  version: number;
  previous_quantity: number;
  new_quantity: number;
  previous_attending: number;
  new_attending: number;
  reason: string;
  created_by?: string | null;
  created_at: string;
}

export interface MealPreparationRecord {
  id: string;
  meal_requirement_id: string;
  food_item_id: string;
  planned_quantity: number;
  prepared_quantity: number;
  unit: FoodUnit;
  recorded_by?: string | null;
  recorded_at: string;
  remarks?: string | null;
  food_item?: FoodItem;
}

export interface MealServingRecord {
  id: string;
  meal_session_id: string;
  food_item_id: string;
  served_quantity: number;
  unit: FoodUnit;
  serving_status: ServingStatus;
  recorded_by?: string | null;
  recorded_at: string;
  remarks?: string | null;
  food_item?: FoodItem;
}

export interface MealLeftoverRecord {
  id: string;
  meal_session_id: string;
  food_item_id: string;
  quantity: number;
  unit: FoodUnit;
  classification: LeftoverClassification;
  recorded_by?: string | null;
  recorded_at: string;
  remarks?: string | null;
  food_item?: FoodItem;
}

export interface MealFoodEvent {
  id: string;
  meal_session_id: string;
  event_type: 
    | 'REQUIREMENT_CALCULATED'
    | 'REQUIREMENT_APPROVED'
    | 'REQUIREMENT_REVISED'
    | 'PREPARATION_STARTED'
    | 'PREPARATION_ENTERED'
    | 'SERVING_STARTED'
    | 'SERVING_ENTERED'
    | 'LEFTOVER_RECORDED'
    | 'MEAL_COMPLETED';
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface MealFoodPipelineItem {
  session_id: string;
  date: string;
  meal_type: MealType;
  meal_time: string;
  session_status: SessionStatus;
  attending_count: number;
  not_attending_count: number;
  no_response_count: number;
  total_students: number;
  requirement: MealRequirement | null;
  base_quantity: number;
  buffer_percent: number;
  buffer_quantity: number;
  recommended_quantity: number;
  prepared_quantity: number | null;
  served_quantity: number | null;
  leftover_quantity: number | null;
  leftover_classification?: LeftoverClassification | null;
  pipeline_status: MealRequirementStatus;
  items: MealRequirementItem[];
  preparations: MealPreparationRecord[];
  servings: MealServingRecord[];
  leftovers: MealLeftoverRecord[];
}

export interface TableFoodRequirement {
  table_id: string;
  table_number: number;
  area_name: string;
  capacity: number;
  total_members: number;
  attending_count: number;
  not_attending_count: number;
  no_response_count: number;
  primary_supplier_name?: string | null;
  supplier_status?: string | null;
}

export interface DepartmentFoodRequirement {
  department_id: string;
  department_name: string;
  department_code: string;
  total_students: number;
  attending_count: number;
  not_attending_count: number;
  no_response_count: number;
}

// ---------------------------------------------------------------------
// Master PRD: Weekly Meal Menu & Food Surplus Management Types
// ---------------------------------------------------------------------

export type DayOfWeek = 
  | 'MONDAY' 
  | 'TUESDAY' 
  | 'WEDNESDAY' 
  | 'THURSDAY' 
  | 'FRIDAY' 
  | 'SATURDAY' 
  | 'SUNDAY'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export type MenuStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface WeeklyMenuItem {
  id: string;
  day_of_week: DayOfWeek;
  meal_slot: MealSlot;
  title_en: string;
  title_ml: string;
  items_en: string[];
  items_ml: string[];
  description_en?: string;
  description_ml?: string;
  display_order: number;
  status: MenuStatus;
  effective_from: string;
  effective_to?: string | null;
  version: number;
  updated_at: string;
  updated_by?: string;
}

export interface MenuChangeLog {
  id: string;
  date: string;
  meal_slot: MealSlot;
  day_of_week?: DayOfWeek;
  previous_menu_text?: string;
  previous_menu?: string;
  new_menu_text?: string;
  new_menu?: string;
  reason: string;
  changed_by?: string;
  changed_by_name?: string;
  changed_at: string;
}

export interface TodayMealMenuSlot {
  slot?: MealSlot;
  meal_slot?: MealSlot;
  name_en?: string;
  label_en?: string;
  name_ml?: string;
  label_ml?: string;
  time?: string;
  default_time?: string;
  items_en?: string[];
  items_ml?: string[];
  menu_text_ml?: string;
  description_ml?: string;
  menu_text_en?: string;
  description_en?: string;
  session_id?: string;
  is_updated_today?: boolean;
  update_notice?: string;
  order?: number;
}

export interface TodayMenuSummary {
  date: string;
  day_of_week: DayOfWeek;
  day_name_en: string;
  day_name_ml: string;
  slots: TodayMealMenuSlot[];
  has_emergency_update?: boolean;
  has_changed?: boolean;
  change_notification?: string;
}

export type SurplusClassification = 'EDIBLE_SURPLUS' | 'UNUSABLE_FOOD';
export type SurplusDestination = 'DONATION' | 'STORAGE' | 'APPROVED_REUSE' | 'OTHER_APPROVED_USE' | 'DISPOSAL';
export type FoodQualityStatus = 'NOT_ASSESSED' | 'ELIGIBLE' | 'NOT_ELIGIBLE';
export type DonationStatus = 'PENDING_REVIEW' | 'APPROVED' | 'DONATED' | 'REJECTED' | 'CANCELLED';
export type WasteReason = 
  | 'LOW_ATTENDANCE' 
  | 'OVER_PREPARATION' 
  | 'UNEXPECTED_ABSENCE' 
  | 'MENU_CHANGE' 
  | 'SPECIAL_EVENT' 
  | 'COOKING_VARIANCE' 
  | 'OTHER';

export interface FoodSurplusRecord {
  id: string;
  meal_session_id?: string;
  meal_slot?: MealSlot;
  food_item_id?: string;
  food_name?: string;
  quantity: number;
  unit: FoodUnit | string;
  classification: SurplusClassification;
  quality_status: FoodQualityStatus;
  destination: SurplusDestination;
  waste_reason?: WasteReason;
  donation_status?: DonationStatus;
  donation_recipient?: string | null;
  recipient_org?: string | null;
  destination_notes?: string | null;
  notes?: string | null;
  recorded_by?: string;
  recorded_by_name?: string;
  recorded_at: string;
  quality_assessed_by?: string | null;
  quality_assessed_at?: string | null;
  approved_by?: string | null;
  approved_by_name?: string | null;
  approved_at?: string | null;
  food_item?: FoodItem;
  meal_session?: MealSession;
}

export interface MealAudienceBreakdown {
  meal_session_id: string;
  students_count: number;
  student_count?: number;
  teachers_count: number;
  teacher_count?: number;
  special_group_count: number;
  guests_count: number;
  guest_count?: number;
  total_expected: number;
}

// ---------------------------------------------------------------------
// Phase 5: Utensil Accountability (Plates + Glasses + Jugs) Types
// ---------------------------------------------------------------------

export type UtensilTypeCode = 'PLATE' | 'GLASS' | 'JUG' | 'BOWL' | 'SPOON' | 'TRAY' | 'OTHER';

export type ShelfOperationStatus = 
  | 'LOCKED' 
  | 'OPENED' 
  | 'DISTRIBUTING' 
  | 'COLLECTING' 
  | 'VERIFYING' 
  | 'DISCREPANCY';

export type DiscrepancyStatus = 
  | 'UNRESOLVED' 
  | 'MISSING' 
  | 'MISPLACED' 
  | 'FOUND'
  | 'RETURNED'
  | 'RECOVERED' 
  | 'DAMAGED' 
  | 'BROKEN' 
  | 'REPAIR_REQUIRED'
  | 'UNDER_REPAIR'
  | 'RETURNED_FROM_REPAIR'
  | 'IN_SERVICE'
  | 'DISCARDED'
  | 'RESOLVED'
  | 'OVERAGE';

export type DiscrepancyIssueType = 
  | 'COUNT_MISMATCH'
  | 'MISSING'
  | 'MISPLACED'
  | 'DAMAGED'
  | 'BROKEN'
  | 'OVERAGE'
  | 'OTHER';

export type DiscrepancyResolutionType = 
  | 'RECOVERED'
  | 'RETURNED'
  | 'REPAIRED'
  | 'RETURNED_TO_SERVICE'
  | 'DISCARDED'
  | 'FORGIVEN_WITH_AUTHORIZATION'
  | 'OTHER';

export type UtensilEventType = 
  | 'SHELF_OPENED'
  | 'SHELF_CLOSED'
  | 'DISTRIBUTION_STARTED'
  | 'ITEM_DISTRIBUTED'
  | 'COLLECTION_STARTED'
  | 'ITEM_RETURNED'
  | 'VERIFICATION_COMPLETED'
  | 'DISCREPANCY_REPORTED'
  | 'DISCREPANCY_CLASSIFIED'
  | 'ITEM_MARKED_MISPLACED'
  | 'ITEM_FOUND'
  | 'RETURN_REQUESTED'
  | 'ITEM_RECOVERED'
  | 'RECOVERY_CONFIRMED'
  | 'ITEM_MARKED_DAMAGED'
  | 'ITEM_MARKED_BROKEN'
  | 'REPAIR_REQUESTED'
  | 'REPAIR_STARTED'
  | 'REPAIR_COMPLETED'
  | 'DISPOSAL_REQUESTED'
  | 'DISPOSAL_APPROVED'
  | 'ITEM_DISCARDED'
  | 'DISCREPANCY_RESOLVED'
  | 'DISCREPANCY_REOPENED'
  | 'SUPERVISOR_OVERRIDE';

export interface UtensilType {
  id: string;
  name: string;
  code: UtensilTypeCode;
  unit: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TableUtensilConfig {
  id: string;
  table_id: string;
  utensil_type_id: string;
  expected_quantity: number;
  effective_from: string;
  effective_until?: string | null;
  created_at: string;
  updated_at: string;
  utensil_type?: UtensilType;
  table?: DiningTable;
}

export interface UtensilOperationSession {
  id: string;
  table_id: string;
  meal_session_id?: string | null;
  supplier_assignment_id?: string | null;
  status: ShelfOperationStatus;
  opened_by?: string | null;
  opened_at?: string | null;
  distribution_started_at?: string | null;
  collection_started_at?: string | null;
  verification_started_at?: string | null;
  verified_by?: string | null;
  verified_at?: string | null;
  closed_by?: string | null;
  closed_at?: string | null;
  created_at: string;
  updated_at: string;
  table?: DiningTable;
  meal_session?: MealSession;
  items?: UtensilOperationItem[];
  discrepancies?: UtensilDiscrepancy[];
}

export interface UtensilOperationItem {
  id: string;
  operation_session_id: string;
  utensil_type_id: string;
  expected_quantity: number;
  distributed_quantity: number;
  returned_quantity: number;
  unresolved_quantity: number;
  created_at: string;
  updated_at: string;
  utensil_type?: UtensilType;
}

export interface UtensilDiscrepancyHistoryItem {
  id: string;
  discrepancy_id: string;
  previous_status: DiscrepancyStatus;
  new_status: DiscrepancyStatus;
  action: string;
  performed_by?: string | null;
  performed_by_name?: string | null;
  performed_at: string;
  reason?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown>;
}

export interface UtensilDiscrepancy {
  id: string;
  operation_session_id: string;
  operation_item_id?: string | null;
  utensil_type_id: string;
  quantity: number;
  status: DiscrepancyStatus;
  issue_type?: DiscrepancyIssueType;
  origin_table_id: string;
  current_table_id?: string | null;
  source_table_id?: string | null;
  reported_by?: string | null;
  reported_by_name?: string | null;
  reported_at: string;
  found_by?: string | null;
  found_by_name?: string | null;
  found_at?: string | null;
  return_confirmed_by?: string | null;
  return_confirmed_by_name?: string | null;
  return_confirmed_at?: string | null;
  approved_by?: string | null;
  approved_by_name?: string | null;
  approved_at?: string | null;
  resolution_type?: DiscrepancyResolutionType | null;
  resolution_reason?: string | null;
  resolved_by?: string | null;
  resolved_by_name?: string | null;
  resolved_at?: string | null;
  resolution_note?: string | null;
  notes?: string | null;
  meal_session_id?: string | null;
  history?: UtensilDiscrepancyHistoryItem[];
  created_at: string;
  updated_at: string;
  utensil_type?: UtensilType;
  origin_table?: DiningTable;
  current_table?: DiningTable;
  reporter?: Student;
}

export interface Phase7DiscrepancyKPIs {
  total_open: number;
  missing_count: number;
  misplaced_count: number;
  damaged_count: number;
  broken_count: number;
  overage_count: number;
  recovered_today: number;
  awaiting_approval: number;
  discarded_this_month: number;
  recovery_rate: string;
  average_recovery_time_minutes: number;
}

export interface UtensilEvent {
  id: string;
  operation_session_id?: string | null;
  table_id: string;
  utensil_type_id?: string | null;
  event_type: UtensilEventType;
  quantity?: number | null;
  performed_by?: string | null;
  performed_at: string;
  metadata?: Record<string, unknown>;
  table?: DiningTable;
  utensil_type?: UtensilType;
}

export interface UtensilTableSummary {
  table_id: string;
  table_number: number;
  area_name: string;
  shelf_status: ShelfOperationStatus;
  primary_supplier_name: string;
  backup_supplier_name?: string | null;
  expected_plates: number;
  returned_plates: number;
  expected_glasses: number;
  returned_glasses: number;
  expected_jugs: number;
  returned_jugs: number;
  unresolved_count: number;
  has_discrepancy: boolean;
  active_session_id?: string | null;
  last_event_time?: string | null;
}

export interface UtensilDashboardStats {
  total_tables: number;
  tables_open: number;
  tables_verified: number;
  tables_with_discrepancies: number;
  missing_items: number;
  misplaced_items: number;
  damaged_items: number;
  broken_items: number;
  recovered_items: number;
}

// =====================================================================
// Phase 8: Kitchen Operations & Special / Party Orders Types
// =====================================================================

export type SpecialMealOrderAudienceType = 
  | 'PROGRAMME' 
  | 'GUEST' 
  | 'VISITOR' 
  | 'TEACHER_EVENT' 
  | 'MEETING' 
  | 'SEMINAR' 
  | 'EXTERNAL_GROUP' 
  | 'OTHER';

export type SpecialMealOrderStatus = 
  | 'DRAFT' 
  | 'SUBMITTED' 
  | 'APPROVED' 
  | 'ASSIGNED' 
  | 'PREPARING' 
  | 'PREPARED' 
  | 'SERVED' 
  | 'COMPLETED' 
  | 'REJECTED' 
  | 'CANCELLED';

export type KitchenMealStatus = 
  | 'SCHEDULED' 
  | 'PREPARING' 
  | 'PREPARED' 
  | 'READY_TO_SERVE' 
  | 'SERVING' 
  | 'COMPLETED' 
  | 'CANCELLED';

export interface SpecialMealOrder {
  id: string;
  order_number: string; // e.g. "SMO-000001"
  meal_session_id?: string | null;
  title: string;
  description?: string | null;
  requested_for_date: string; // YYYY-MM-DD
  meal_slot: MealSlot;
  quantity: number;
  requested_by?: string | null;
  requester_name: string;
  requester_role?: string | null;
  audience_type: SpecialMealOrderAudienceType;
  special_requirements?: string | null;
  status: SpecialMealOrderStatus;
  approved_by?: string | null;
  approved_by_name?: string | null;
  approved_at?: string | null;
  assigned_to?: string | null;
  assigned_to_name?: string | null;
  assigned_at?: string | null;
  prepared_quantity?: number | null;
  served_quantity?: number | null;
  completed_at?: string | null;
  cancelled_reason?: string | null;
  created_at: string;
  updated_at: string;
  events?: SpecialMealOrderEvent[];
}

export interface SpecialMealOrderEvent {
  id: string;
  order_id: string;
  event_type: string;
  previous_status?: SpecialMealOrderStatus | null;
  new_status: SpecialMealOrderStatus;
  performed_by?: string | null;
  performed_by_name?: string | null;
  performed_at: string;
  notes?: string | null;
}

export interface KitchenMealSessionCard {
  session_id: string;
  meal_slot: MealSlot;
  meal_name_en: string;
  meal_name_ml: string;
  meal_time: string;
  date: string;
  status: KitchenMealStatus;
  menu_items_en: string[];
  menu_items_ml: string[];
  students_expected: number;
  teachers_expected: number;
  programme_candidates: number;
  guests_expected: number;
  total_expected: number;
  buffer_quantity: number;
  recommended_portions: number;
  prepared_quantity: number;
  served_quantity: number;
  surplus_quantity: number;
  prepared_by?: string | null;
  prepared_at?: string | null;
  served_at?: string | null;
  special_orders_count: number;
}

// =====================================================================
// Phase 9: Roles, Permissions, Scopes & Authorization Types
// =====================================================================

export type ScopeType = 
  | 'GLOBAL' 
  | 'DINING_HALL' 
  | 'FLOOR' 
  | 'AREA' 
  | 'TABLE' 
  | 'TEACHER_AREA' 
  | 'MEAL_SESSION';

export interface UserScope {
  id: string;
  user_id: string;
  scope_type: ScopeType;
  scope_id: string;
  scope_name?: string;
  effective_from: string;
  effective_to?: string | null;
  created_at: string;
}

export type PermissionKey =
  | 'attendance.view'
  | 'attendance.submit'
  | 'attendance.correct'
  | 'tables.view'
  | 'tables.manage'
  | 'tables.assign'
  | 'suppliers.view'
  | 'suppliers.generate'
  | 'suppliers.assign'
  | 'suppliers.checkin'
  | 'suppliers.absence'
  | 'suppliers.handover'
  | 'meals.view'
  | 'meals.manage'
  | 'meals.publish'
  | 'meals.requirement'
  | 'meals.preparation'
  | 'meals.serving'
  | 'menu.view'
  | 'menu.manage'
  | 'menu.publish'
  | 'utensils.view'
  | 'utensils.operate'
  | 'utensils.discrepancy.report'
  | 'utensils.discrepancy.resolve'
  | 'utensils.discrepancy.disposal'
  | 'kitchen.view'
  | 'kitchen.prepare'
  | 'kitchen.serve'
  | 'kitchen.surplus'
  | 'special_orders.view'
  | 'special_orders.create'
  | 'special_orders.approve'
  | 'special_orders.assign'
  | 'special_orders.execute'
  | 'special_orders.cancel'
  | 'reports.view'
  | 'audit.view'
  | 'users.view'
  | 'users.manage'
  | 'roles.view'
  | 'roles.manage'
  | 'permissions.manage';

export interface RoleDefinition {
  key: SystemRole;
  name: string;
  description: string;
  is_system: boolean;
  permissions: PermissionKey[];
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: SystemRole;
  additional_roles?: SystemRole[];
  scopes: UserScope[];
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  last_active_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SecurityAuditEvent {
  id: string;
  actor_id: string;
  actor_name: string;
  actor_role: string;
  action: string;
  target_entity_type: string;
  target_entity_id: string;
  previous_value?: string | null;
  new_value?: string | null;
  reason?: string | null;
  performed_at: string;
  metadata?: Record<string, unknown>;
}
