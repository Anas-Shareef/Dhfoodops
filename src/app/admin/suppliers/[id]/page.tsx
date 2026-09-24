'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { getSupplierProvider } from '@/lib/suppliers/provider';
import { getTableProvider } from '@/lib/tables/provider';
import { getAttendanceProvider } from '@/lib/attendance/provider';
import { 
  TodayDutyItem, 
  DiningTable, 
  SupplierDutyEvent, 
  MealAttendance,
  Student 
} from '@/types/database';
import { MarkAbsenceModal } from '@/components/admin/mark-absence-modal';
import { ActivateBackupModal } from '@/components/admin/activate-backup-modal';
import { SupplierHandoverModal } from '@/components/admin/supplier-handover-modal';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  ClipboardList, 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  AlertTriangle, 
  UserCheck, 
  Box, 
  DoorOpen, 
  DoorClosed, 
  ExternalLink,
  Users
} from 'lucide-react';
import { getTodayDateStringIST, formatTimeIST } from '@/lib/utils/timezone';

export default function TableDutyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const tableId = resolvedParams.id;

  const [table, setTable] = useState<DiningTable | null>(null);
  const [duty, setDuty] = useState<TodayDutyItem | null>(null);
  const [events, setEvents] = useState<SupplierDutyEvent[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [primaryMealAttendance, setPrimaryMealAttendance] = useState<MealAttendance | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [absenceModalOpen, setAbsenceModalOpen] = useState(false);
  const [backupModalOpen, setBackupModalOpen] = useState(false);
  const [handoverModalOpen, setHandoverModalOpen] = useState(false);

  const todayStr = getTodayDateStringIST();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const supplierProvider = getSupplierProvider();
    const tableProvider = getTableProvider();
    const attendanceProvider = getAttendanceProvider();

    const [tableData, dutyData, eventsData, studentList] = await Promise.all([
      tableProvider.getTableById(tableId),
      supplierProvider.getTableDutyDetails(tableId, todayStr),
      supplierProvider.getTableDutyEvents(tableId, todayStr),
      attendanceProvider.getAllStudents(),
    ]);

    setTable(tableData);
    setDuty(dutyData);
    setEvents(eventsData);
    setStudents(studentList);

    // Fetch primary supplier's meal attendance declaration
    if (dutyData?.primary_assignment?.student_id) {
      const history = await attendanceProvider.getStudentAttendanceHistory(
        dutyData.primary_assignment.student_id,
        { date: todayStr }
      );
      setPrimaryMealAttendance(history[0] || null);
    }

    setIsLoading(false);
  }, [tableId, todayStr]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDutyEvent = async (type: 'SHELF_OPENED' | 'SHELF_CLOSED') => {
    if (!duty?.active_supplier) return;
    const provider = getSupplierProvider();
    await provider.recordDutyEvent(tableId, duty.active_supplier.id, type, {
      recorded_by: 'supervisor_panel',
      timestamp: new Date().toISOString(),
    });
    loadData();
  };

  const handleCheckIn = async () => {
    if (!duty?.active_supplier) return;
    const provider = getSupplierProvider();
    const res = await provider.checkInSupplier(tableId, duty.active_supplier.id, 'Desk check-in');
    if (res.success) {
      loadData();
    } else {
      alert(res.error || 'Failed to check in');
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-500 text-xs">
        Loading table supplier duty details...
      </div>
    );
  }

  if (!table) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-sm font-bold text-slate-800">Table not found</p>
        <Link href="/admin/suppliers">
          <Button size="sm" variant="outline">Back to Supplier Dashboard</Button>
        </Link>
      </div>
    );
  }

  const primary = duty?.primary_assignment?.student;
  const backup = duty?.backup_assignment?.student;
  const active = duty?.active_supplier;
  const isTable31 = table.table_number === 31;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header & Breadcrumbs */}
      <div>
        <Link
          href="/admin/suppliers"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Supplier Operational Board
        </Link>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Table {table.table_number} Supplier Duty
              </h1>
              {isTable31 && (
                <Badge className="bg-indigo-600 text-white font-extrabold text-[10px] px-2 py-0.5">
                  Phase 3 Seed Table
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {table.dining_area?.name || 'Main Hall'} • Capacity: {table.capacity} students • Date: {todayStr}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href={`/admin/tables/${table.id}`}>
              <Button variant="outline" size="sm" className="text-xs font-semibold">
                <Users className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                View Seating Members
              </Button>
            </Link>

            {duty?.current_status !== 'checked_in' && active && (
              <Button
                size="sm"
                onClick={handleCheckIn}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Check In Active Supplier
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Decoupled Architecture Banner */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-xs">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-indigo-600 text-white shrink-0 mt-0.5">
            <ClipboardList className="w-4 h-4" />
          </div>
          <div>
            <p className="font-bold text-indigo-950 text-sm">
              Institutional Decoupling Principle (PRD Section 2)
            </p>
            <p className="text-indigo-800 mt-0.5 leading-relaxed">
              <strong>Supplier Duty Attendance ≠ Meal Attendance.</strong> A student can be absent from eating a meal
              (Phase 1 Meal Attendance = <em>Will Not Attend</em>) but can still perform their duty as table supplier.
              Similarly, eating at a table does not exempt or automatically qualify a student as supplier.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Primary & Backup Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Primary Supplier */}
        <Card className={`border ${duty?.current_status === 'backup_activated' ? 'border-slate-200 bg-slate-50/50' : 'border-indigo-200 bg-white shadow-xs'}`}>
          <CardHeader className="p-4 pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Primary Supplier</span>
            </div>
            {duty?.current_status === 'backup_activated' ? (
              <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-[10px] font-bold">Relieved / Absent</Badge>
            ) : (
              <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 text-[10px] font-bold">Active Role</Badge>
            )}
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {primary ? (
              <div>
                <p className="text-base font-black text-slate-900">{primary.name}</p>
                <p className="text-xs text-slate-500 font-mono">ID: {primary.enrollment_no}</p>
                <p className="text-xs text-slate-500">{primary.email}</p>

                {/* Meal Attendance vs Duty check */}
                <div className="mt-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Phase 1 Meal Attendance:</span>
                    <span className="font-bold text-slate-800">
                      {primaryMealAttendance ? primaryMealAttendance.status.toUpperCase() : 'Attending (Default)'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Phase 3 Duty Status:</span>
                    <span className="font-bold text-indigo-700">
                      {duty?.checked_in_at ? `Checked In (${duty.checked_in_at})` : 'Pending Check-In'}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAbsenceModalOpen(true)}
                    className="flex-1 text-xs h-7 border-rose-200 text-rose-700 hover:bg-rose-50"
                  >
                    Mark Absent
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setHandoverModalOpen(true)}
                    className="flex-1 text-xs h-7 border-slate-200 text-slate-700 hover:bg-slate-50"
                  >
                    Transfer Handover
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-rose-600 font-semibold italic">No primary supplier assigned</p>
            )}
          </CardContent>
        </Card>

        {/* Backup Supplier */}
        <Card className={`border ${duty?.current_status === 'backup_activated' ? 'border-purple-300 ring-2 ring-purple-400 bg-purple-50/20' : 'border-slate-200 bg-white'}`}>
          <CardHeader className="p-4 pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Standby Backup Supplier</span>
            </div>
            {duty?.current_status === 'backup_activated' ? (
              <Badge className="bg-purple-600 text-white font-black text-[10px]">Activated &amp; Responsible</Badge>
            ) : (
              <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-[10px] font-bold">On Standby</Badge>
            )}
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {backup ? (
              <div>
                <p className="text-base font-black text-slate-900">{backup.name}</p>
                <p className="text-xs text-slate-500 font-mono">ID: {backup.enrollment_no}</p>
                <p className="text-xs text-slate-500">{backup.email}</p>

                <div className="mt-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Standby Readiness:</span>
                    <span className="font-bold text-purple-700">Ready for Immediate Activation</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Activated Timestamp:</span>
                    <span className="font-bold text-slate-800">{duty?.backup_activated_at || 'Not Activated'}</span>
                  </div>
                </div>

                {duty?.current_status !== 'backup_activated' && primary && (
                  <Button
                    size="sm"
                    onClick={() => setBackupModalOpen(true)}
                    className="w-full mt-2 text-xs h-7 bg-purple-600 hover:bg-purple-700 text-white font-bold"
                  >
                    Activate Standby Backup Now
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-xs text-amber-600 font-semibold italic">No standby backup supplier configured</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 4. Table Shelf & Utensil Controls (Phase 3 Foundation for Phase 5) */}
      <Card className="bg-white border-slate-200 shadow-xs">
        <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Box className="w-5 h-5 text-indigo-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">Table Shelf &amp; Utensil Station Readiness</h2>
              <p className="text-[11px] text-slate-500">Supplier duty execution timeline and physical shelf tracking</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDutyEvent('SHELF_OPENED')}
              className="text-xs font-bold border-indigo-200 text-indigo-700 hover:bg-indigo-50"
            >
              <DoorOpen className="w-3.5 h-3.5 mr-1.5" />
              Log Shelf Opened
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDutyEvent('SHELF_CLOSED')}
              className="text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <DoorClosed className="w-3.5 h-3.5 mr-1.5" />
              Log Shelf Closed
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4">
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Recorded Hall Events for Today ({todayStr})
            </h3>

            {events.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No shelf or hall events recorded yet for this table today.</p>
            ) : (
              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {events.map((ev) => (
                  <div key={ev.id} className="relative flex items-start gap-3">
                    <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-indigo-600 ring-4 ring-white" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900">{ev.event_type}</span>
                        <span className="text-[11px] font-mono text-slate-500">{formatTimeIST(ev.created_at)}</span>
                      </div>
                      {ev.metadata && Object.keys(ev.metadata).length > 0 && (
                        <p className="text-[11px] text-slate-600 font-mono mt-0.5">
                          {JSON.stringify(ev.metadata)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <MarkAbsenceModal
        isOpen={absenceModalOpen}
        onClose={() => setAbsenceModalOpen(false)}
        onSuccess={() => loadData()}
        duty={duty}
      />

      <ActivateBackupModal
        isOpen={backupModalOpen}
        onClose={() => setBackupModalOpen(false)}
        onSuccess={() => loadData()}
        duty={duty}
      />

      <SupplierHandoverModal
        isOpen={handoverModalOpen}
        onClose={() => setHandoverModalOpen(false)}
        onSuccess={() => loadData()}
        duty={duty}
        students={students}
      />
    </div>
  );
}
