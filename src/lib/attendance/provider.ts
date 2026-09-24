// =====================================================================
// Attendance Provider Abstraction Layer
// Decouples frontend and business logic from specific attendance backend
// Enables future plug-and-play integration with the official DH Attendance API
// =====================================================================

import {
  MealSession,
  MealSchedule,
  MealAttendance,
  AttendanceStatus,
  AttendanceCorrectionRequest,
  MealSummaryStats,
  DepartmentAttendanceSummary,
  TableAttendanceSummary,
  Student,
} from '@/types/database';

export interface IAttendanceProvider {
  // Student Context
  getStudentProfileByUserId(authUserId: string): Promise<Student | null>;
  getStudentProfileById(studentId: string): Promise<Student | null>;
  getDailySessions(dateStr: string): Promise<MealSession[]>;
  getStudentAttendanceForSessions(studentId: string, sessionIds: string[]): Promise<MealAttendance[]>;
  submitAttendance(
    sessionId: string,
    studentId: string,
    status: AttendanceStatus,
    actorUserId?: string
  ): Promise<{ success: boolean; data?: MealAttendance; error?: string }>;
  requestCorrection(
    sessionId: string,
    studentId: string,
    requestedStatus: AttendanceStatus,
    reason: string
  ): Promise<{ success: boolean; data?: AttendanceCorrectionRequest; error?: string }>;
  getStudentAttendanceHistory(
    studentId: string,
    filters?: { date?: string; mealType?: string; status?: string }
  ): Promise<MealAttendance[]>;
  getStudentCorrectionRequests(studentId: string): Promise<AttendanceCorrectionRequest[]>;

  // Admin & Operational Context
  getAdminDashboardSummary(dateStr: string): Promise<MealSummaryStats[]>;
  getDepartmentAttendanceSummary(sessionId: string): Promise<DepartmentAttendanceSummary[]>;
  getTableAttendanceSummary(sessionId: string): Promise<TableAttendanceSummary[]>;
  getMealSchedules(): Promise<MealSchedule[]>;
  saveMealSchedule(schedule: Partial<MealSchedule> & { id?: string }): Promise<{ success: boolean; data?: MealSchedule; error?: string }>;
  deleteMealSchedule(id: string): Promise<{ success: boolean; error?: string }>;
  getPendingCorrectionRequests(): Promise<AttendanceCorrectionRequest[]>;
  reviewCorrectionRequest(
    requestId: string,
    reviewerId: string,
    newStatus: 'approved' | 'rejected'
  ): Promise<{ success: boolean; error?: string }>;
  getAllStudents(): Promise<Student[]>;
}

// Provider Factory
import { SupabaseAttendanceProvider } from './supabase-provider';

let cachedProvider: IAttendanceProvider | null = null;

export function getAttendanceProvider(): IAttendanceProvider {
  if (!cachedProvider) {
    cachedProvider = new SupabaseAttendanceProvider();
  }
  return cachedProvider;
}
