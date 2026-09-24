'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { getSupplierProvider } from '@/lib/suppliers/provider';
import { getAttendanceProvider } from '@/lib/attendance/provider';
import { getUtensilProvider } from '@/lib/utensils/provider';
import { SupplierAssignment, TodayDutyItem, Student, UtensilOperationSession } from '@/types/database';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CrossTableRecoveryModal } from '@/components/admin/cross-table-recovery-modal';
import { ReportDiscrepancyModal } from '@/components/admin/report-discrepancy-modal';
import { getTableProvider } from '@/lib/tables/provider';
import { DiningTable } from '@/types/database';
import Link from 'next/link';
import { 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  DoorOpen, 
  DoorClosed, 
  Calendar, 
  Info, 
  AlertTriangle,
  UserCheck,
  Check,
  Building,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { getTodayDateStringIST } from '@/lib/utils/timezone';

export default function StudentDutiesPage() {
  const { user } = useAuth();
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [tablesList, setTablesList] = useState<DiningTable[]>([]);
  const [assignments, setAssignments] = useState<SupplierAssignment[]>([]);
  const [todayDuty, setTodayDuty] = useState<TodayDutyItem | null>(null);
  const [utensilSession, setUtensilSession] = useState<UtensilOperationSession | null>(null);
  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Initialize selectedStudentId from user context
  useEffect(() => {
    if (user?.studentProfile?.id && !selectedStudentId) {
      setSelectedStudentId(user.studentProfile.id);
    }
  }, [user, selectedStudentId]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const supplierProvider = getSupplierProvider();
    const attendanceProvider = getAttendanceProvider();
    const tableProvider = getTableProvider();

    const [students, dutiesData, allTables] = await Promise.all([
      attendanceProvider.getAllStudents(),
      selectedStudentId ? supplierProvider.getStudentDuties(selectedStudentId) : { assignments: [], todayDuty: null },
      tableProvider.getTables(),
    ]);

    setAllStudents(students);
    setTablesList(allTables);
    setAssignments(dutiesData.assignments);
    setTodayDuty(dutiesData.todayDuty);

    if (dutiesData.todayDuty?.table_id) {
      const uProvider = getUtensilProvider();
      const uDetail = await uProvider.getTableDetail(dutiesData.todayDuty.table_id);
      setUtensilSession(uDetail.session || null);
    } else {
      setUtensilSession(null);
    }

    setIsLoading(false);
  }, [selectedStudentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const currentStudent = allStudents.find((s) => s.id === selectedStudentId) || user?.studentProfile;

  const handleCheckIn = async () => {
    if (!todayDuty || !selectedStudentId) return;
    const provider = getSupplierProvider();
    const res = await provider.checkInSupplier(todayDuty.table_id, selectedStudentId, 'Self check-in via student portal');
    if (res.success) {
      setActionSuccess('Successfully checked in for today\'s table supplier duty!');
      setTimeout(() => setActionSuccess(null), 4000);
      loadData();
    } else {
      alert(res.error || 'Failed to check in');
    }
  };

  const handleShelfEvent = async (type: 'SHELF_OPENED' | 'SHELF_CLOSED') => {
    if (!todayDuty || !selectedStudentId) return;
    const provider = getSupplierProvider();
    await provider.recordDutyEvent(todayDuty.table_id, selectedStudentId, type, {
      triggered_by: 'student_portal',
      student_name: currentStudent?.name,
    });
    setActionSuccess(`Recorded: ${type === 'SHELF_OPENED' ? 'Shelf Opened' : 'Shelf Closed'}`);
    setTimeout(() => setActionSuccess(null), 4000);
    loadData();
  };

  // Determine user's role on today's table
  const isPrimary = todayDuty?.primary_assignment?.student_id === selectedStudentId;
  const isBackup = todayDuty?.backup_assignment?.student_id === selectedStudentId;
  const isBackupActive = todayDuty?.current_status === 'backup_activated';
  const isAuthorizedSupplier = isPrimary || (isBackup && isBackupActive);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      {/* 1. Header with Demo Quick Switcher */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block">
            Phase 3 • Table Duty Responsibilities
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 mt-0.5">
            <ShieldCheck className="w-6 h-6 text-indigo-600" />
            My Supplier Duties
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Table shelf management, timely check-in, and dining responsibility for Darul Huda students
          </p>
        </div>

        {/* Demo Switcher for fast verification of Ijas K vs Ahmed K */}
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">View As Student:</span>
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="text-xs font-bold text-slate-900 bg-white border border-slate-200 rounded-lg px-2 py-1 focus:outline-hidden"
          >
            {allStudents.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.enrollment_no}) {s.enrollment_no === '16880' ? '★ Table 31 Primary' : s.enrollment_no === '16881' ? '★ Table 31 Backup' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          {actionSuccess}
        </div>
      )}

      {/* 2. Decoupled Institutional Rule Notice */}
      <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-4 text-xs">
        <div className="flex items-start gap-3">
          <div className="p-1.5 rounded-lg bg-indigo-600 text-white shrink-0 mt-0.5">
            <Info className="w-4 h-4" />
          </div>
          <div>
            <p className="font-bold text-indigo-950">
              Institutional Rule: Supplier Duty ≠ Meal Attendance (PRD Section 2)
            </p>
            <p className="text-indigo-800 mt-0.5 leading-relaxed">
              Your table supplier duties are recorded independently from your personal meal attendance.
              If you mark <em>Will Not Attend</em> for eating a meal, you are still expected to fulfill your table
              supplier duty unless an official absence is authorized by the dining hall supervisor.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Today's Duty Status Card */}
      {todayDuty ? (
        <Card className="border border-indigo-200 shadow-sm bg-white overflow-hidden">
          <CardHeader className="p-5 bg-gradient-to-r from-indigo-50/60 to-purple-50/30 border-b border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-slate-900">
                  Table {todayDuty.table_number} Duty
                </span>
                {isPrimary && (
                  <Badge className="bg-indigo-600 text-white font-extrabold text-[10px]">
                    Assigned Primary Supplier
                  </Badge>
                )}
                {isBackup && !isBackupActive && (
                  <Badge className="bg-purple-100 text-purple-800 border-purple-300 font-extrabold text-[10px]">
                    Standby Backup Supplier
                  </Badge>
                )}
                {isBackup && isBackupActive && (
                  <Badge className="bg-purple-600 text-white font-extrabold text-[10px] animate-pulse">
                    Emergency Backup Activated!
                  </Badge>
                )}
                {!isAuthorizedSupplier && !isBackup && (
                  <Badge variant="neutral" className="text-slate-500 border-slate-300 font-bold text-[10px]">
                    Read-Only Table Member
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {todayDuty.area_name} • Date: {getTodayDateStringIST()}
              </p>
            </div>

            <div>
              {todayDuty.current_status === 'checked_in' && (
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-xs py-1 px-3">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  Checked In {todayDuty.checked_in_at && `• ${todayDuty.checked_in_at}`}
                </Badge>
              )}
              {todayDuty.current_status === 'assigned' && (
                <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-bold text-xs py-1 px-3">
                  <Clock className="w-3.5 h-3.5 mr-1.5" />
                  Pending Check-In
                </Badge>
              )}
              {todayDuty.current_status === 'backup_activated' && (
                <Badge className="bg-purple-100 text-purple-800 border-purple-300 font-bold text-xs py-1 px-3">
                  <ShieldAlert className="w-3.5 h-3.5 mr-1.5" />
                  Backup Duty In Effect
                </Badge>
              )}
              {(todayDuty.current_status === 'absent_approved' || todayDuty.current_status === 'unapproved_absent') && (
                <Badge className="bg-rose-100 text-rose-800 border-rose-300 font-bold text-xs py-1 px-3">
                  <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
                  Absence Recorded
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-5 space-y-5">
            {/* Backup Notification Banner if Activated */}
            {isBackup && isBackupActive && (
              <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs">
                <div className="flex items-start gap-2.5">
                  <ShieldAlert className="w-5 h-5 text-purple-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-extrabold text-sm">Emergency Backup Duty Activated</p>
                    <p className="mt-0.5 leading-relaxed">
                      The dining hall supervisor has activated your standby duty for Table {todayDuty.table_number}.
                      Please proceed to the dining hall immediately and check in.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Check-In and Shelf Action Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Check-In Action */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-1">
                    <UserCheck className="w-4 h-4 text-indigo-600" />
                    <span>Hall Check-In Status</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Suppliers must check in at least 15 minutes before scheduled dining service.
                  </p>
                </div>

                <div className="mt-4">
                  {todayDuty.current_status === 'checked_in' ? (
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Check-In Verified ({todayDuty.checked_in_at})</span>
                    </div>
                  ) : isAuthorizedSupplier ? (
                    <Button
                      onClick={handleCheckIn}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Check In to Table {todayDuty.table_number}
                    </Button>
                  ) : (
                    <div className="text-xs text-slate-500 bg-slate-100 p-2.5 rounded-lg border border-slate-200">
                      <span className="font-semibold text-slate-700 block">Pending Check-in</span>
                      Only the active supplier ({todayDuty.primary_assignment?.student?.name || 'Assigned Supplier'}) can check in.
                    </div>
                  )}
                </div>
              </div>

              {/* Shelf Station Controls (PRD Phase 5 Section 24 & PRD Phase 6 Section 38) */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                      <Building className="w-4 h-4 text-indigo-600" />
                      <span>Shelf State &amp; Utensils</span>
                    </div>
                    <Badge className={cn(
                      "text-[10px] font-black",
                      (utensilSession?.status === 'DISCREPANCY') ? "bg-rose-100 text-rose-800 border-rose-300 animate-pulse" :
                      (utensilSession?.status === 'LOCKED' || !utensilSession) ? "bg-emerald-50 text-emerald-800 border-emerald-300" :
                      "bg-blue-50 text-blue-800 border-blue-200"
                    )}>
                      {utensilSession?.status || 'LOCKED'}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500">
                    Standard 8 Plates • 8 Glasses • 1 Jug. Only authorized active supplier can operate shelf.
                  </p>
                </div>

                <div className="mt-4">
                  {!isAuthorizedSupplier ? (
                    <div className="p-3 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-600 space-y-1">
                      <div className="font-bold text-slate-700 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                        Read-Only View
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Shelf operations and utensil verification are restricted to the active assigned table supplier.
                      </p>
                    </div>
                  ) : (
                    <>
                      {(!utensilSession || utensilSession.status === 'LOCKED') && (
                        <Button
                          onClick={async () => {
                            if (!todayDuty) return;
                            const uProvider = getUtensilProvider();
                            await uProvider.openShelf(todayDuty.table_id, selectedStudentId);
                            setActionSuccess(`Shelf unlocked and opened for Table ${todayDuty.table_number}`);
                            setTimeout(() => setActionSuccess(null), 3500);
                            loadData();
                          }}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
                        >
                          <DoorOpen className="w-3.5 h-3.5 mr-1.5" />
                          Open Shelf (Begin Service)
                        </Button>
                      )}

                      {utensilSession?.status === 'OPENED' && (
                        <Button
                          onClick={async () => {
                            if (!todayDuty) return;
                            const uProvider = getUtensilProvider();
                            await uProvider.startDistribution(todayDuty.table_id);
                            setActionSuccess(`Utensils distributed to Table ${todayDuty.table_number} seats.`);
                            setTimeout(() => setActionSuccess(null), 3500);
                            loadData();
                          }}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
                        >
                          <Clock className="w-3.5 h-3.5 mr-1.5" />
                          Start Distribution (8P / 8G / 1J)
                        </Button>
                      )}

                      {utensilSession?.status === 'DISTRIBUTING' && (
                        <Button
                          onClick={async () => {
                            if (!todayDuty) return;
                            const uProvider = getUtensilProvider();
                            await uProvider.startCollection(todayDuty.table_id);
                            setActionSuccess(`Collection started for Table ${todayDuty.table_number}.`);
                            setTimeout(() => setActionSuccess(null), 3500);
                            loadData();
                          }}
                          className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
                        >
                          <Clock className="w-3.5 h-3.5 mr-1.5" />
                          Start Collection (Post-Dining)
                        </Button>
                      )}

                      {utensilSession?.status === 'COLLECTING' && (
                        <Button
                          onClick={async () => {
                            if (!todayDuty) return;
                            const uProvider = getUtensilProvider();
                            const res = await uProvider.recordReturnsAndVerify(todayDuty.table_id, {
                              plates: 8,
                              glasses: 8,
                              jugs: 1,
                            }, currentStudent?.name);
                            if (res.status === 'LOCKED') {
                              setActionSuccess(`All 8 plates, 8 glasses, and 1 jug verified! Shelf locked.`);
                            } else {
                              setActionSuccess(`Discrepancy detected! Please check neighbouring tables.`);
                            }
                            setTimeout(() => setActionSuccess(null), 4000);
                            loadData();
                          }}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                          Verify Returns (8P / 8G / 1J) &amp; Lock
                        </Button>
                      )}

                      {utensilSession?.status === 'DISCREPANCY' && (
                        <div className="space-y-2">
                          <div className="text-[11px] text-rose-800 font-bold bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                            ⚠ Discrepancy detected (e.g. shortage observed). Check neighbouring tables for table stamp.
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              onClick={() => setIsRecoveryOpen(true)}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
                            >
                              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                              Found (Recover)
                            </Button>
                            <Button
                              onClick={() => setIsReportOpen(true)}
                              variant="outline"
                              className="border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 font-bold text-xs"
                            >
                              <Plus className="w-3.5 h-3.5 mr-1.5" />
                              Report Issue
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Standard Operating Duty Protocol */}
            <div className="border-t border-slate-100 pt-4">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                Standard Supplier Operational Protocol
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs text-slate-600">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="font-bold text-slate-900 block">Step 1: Check In</span>
                  <span className="text-[11px] text-slate-500">15 min prior to meal call</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="font-bold text-slate-900 block">Step 2: Open Shelf</span>
                  <span className="text-[11px] text-slate-500">Ensure plate/cup readiness</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="font-bold text-slate-900 block">Step 3: Food Service</span>
                  <span className="text-[11px] text-slate-500">Serve table members fairly</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="font-bold text-slate-900 block">Step 4: Close Shelf</span>
                  <span className="text-[11px] text-slate-500">Wipe clean &amp; lock shelf</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-white border-slate-200 p-8 text-center">
          <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <h2 className="text-base font-bold text-slate-800">No Active Supplier Duty for Today</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            You are not assigned as a primary or activated backup supplier for any dining table today.
          </p>
        </Card>
      )}

      {/* 4. Monthly Roster Assignments for Current Student */}
      <Card className="bg-white border-slate-200 shadow-xs">
        <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">Assigned Monthly Duty Terms</h2>
          </div>
          <span className="text-xs text-slate-500 font-semibold">
            {assignments.length} Active Assignment(s)
          </span>
        </CardHeader>

        <CardContent className="p-4">
          {assignments.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No historical or active monthly terms assigned.</p>
          ) : (
            <div className="space-y-2">
              {assignments.map((asgn) => (
                <div
                  key={asgn.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-900">
                        Table {asgn.table?.table_number || '-'}
                      </span>
                      <Badge
                        className={`text-[10px] font-bold ${
                          asgn.role === 'primary'
                            ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                            : 'bg-purple-100 text-purple-800 border-purple-200'
                        }`}
                      >
                        {asgn.role === 'primary' ? 'Primary Supplier' : 'Standby Backup'}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Period: {asgn.valid_from} to {asgn.valid_until} • Status: {asgn.status}
                    </p>
                  </div>

                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    Active Term
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      {/* Cross Table Recovery Modal for Supplier */}
      <CrossTableRecoveryModal
        isOpen={isRecoveryOpen}
        onClose={() => setIsRecoveryOpen(false)}
        onSuccess={loadData}
        defaultOriginTable={todayDuty?.table_number || 31}
        defaultFoundAtTable={32}
      />
      {/* Report Discrepancy Modal for Supplier */}
      <ReportDiscrepancyModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        onSuccess={loadData}
        tables={tablesList}
        defaultTableId={todayDuty?.table_id}
      />
    </div>
  );
}
