'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getSupplierProvider } from '@/lib/suppliers/provider';
import { getTableProvider } from '@/lib/tables/provider';
import { getAttendanceProvider } from '@/lib/attendance/provider';
import { 
  SupplierDutyPeriod, 
  SupplierAssignment, 
  DiningTable, 
  Student 
} from '@/types/database';
import { SupplierSubnav } from '@/components/admin/supplier-subnav';
import { validateSupplierAssignment } from '@/lib/suppliers/conflicts';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { 
  Calendar, 
  ShieldCheck, 
  ShieldAlert, 
  UserCheck, 
  Users, 
  AlertTriangle, 
  Edit3, 
  Search,
  CheckCircle2,
  Clock,
  Sparkles
} from 'lucide-react';

export default function SupplierSchedulePage() {
  const [periods, setPeriods] = useState<SupplierDutyPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('p-sep-2026');
  const [assignments, setAssignments] = useState<SupplierAssignment[]>([]);
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Assign Modal state
  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    table: DiningTable | null;
    primaryStudentId: string;
    backupStudentId: string;
    errors: string[];
    warnings: string[];
    isSubmitting: boolean;
  }>({
    isOpen: false,
    table: null,
    primaryStudentId: '',
    backupStudentId: '',
    errors: [],
    warnings: [],
    isSubmitting: false,
  });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const supplierProvider = getSupplierProvider();
    const tableProvider = getTableProvider();
    const attendanceProvider = getAttendanceProvider();

    const [periodList, asgnList, tableList, studentList] = await Promise.all([
      supplierProvider.getDutyPeriods(),
      supplierProvider.getSupplierAssignments(selectedPeriodId),
      tableProvider.getTables(),
      attendanceProvider.getAllStudents(),
    ]);

    setPeriods(periodList);
    setAssignments(asgnList);
    setTables(tableList);
    setStudents(studentList);
    setIsLoading(false);
  }, [selectedPeriodId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activePeriod = periods.find((p) => p.id === selectedPeriodId) || periods[0];

  const openEditModal = (table: DiningTable) => {
    const primary = assignments.find((a) => a.table_id === table.id && a.role === 'primary' && a.status === 'active');
    const backup = assignments.find((a) => a.table_id === table.id && a.role === 'backup' && a.status === 'active');

    setEditModal({
      isOpen: true,
      table,
      primaryStudentId: primary?.student_id || '',
      backupStudentId: backup?.student_id || '',
      errors: [],
      warnings: [],
      isSubmitting: false,
    });
  };

  const handleStudentChange = (role: 'primary' | 'backup', studentId: string) => {
    if (!editModal.table) return;

    const newPrimary = role === 'primary' ? studentId : editModal.primaryStudentId;
    const newBackup = role === 'backup' ? studentId : editModal.backupStudentId;

    // Validate conflict
    let errors: string[] = [];
    let warnings: string[] = [];

    if (newPrimary) {
      const res = validateSupplierAssignment(
        editModal.table.id,
        newPrimary,
        'primary',
        selectedPeriodId,
        assignments,
        newBackup
      );
      errors = [...errors, ...res.errors];
      warnings = [...warnings, ...res.warnings];
    }

    if (newBackup && newBackup === newPrimary) {
      if (!errors.includes('A student cannot be assigned as both Primary and Backup supplier for the same table.')) {
        errors.push('A student cannot be assigned as both Primary and Backup supplier for the same table.');
      }
    }

    setEditModal((prev) => ({
      ...prev,
      primaryStudentId: newPrimary,
      backupStudentId: newBackup,
      errors: Array.from(new Set(errors)),
      warnings: Array.from(new Set(warnings)),
    }));
  };

  const handleSaveAssignment = async () => {
    if (!editModal.table || !editModal.primaryStudentId) return;

    setEditModal((prev) => ({ ...prev, isSubmitting: true }));
    const provider = getSupplierProvider();
    const result = await provider.saveSupplierAssignment(
      editModal.table.id,
      editModal.primaryStudentId,
      editModal.backupStudentId,
      selectedPeriodId
    );

    if (result.success) {
      setEditModal((prev) => ({ ...prev, isOpen: false, isSubmitting: false }));
      loadData();
    } else {
      setEditModal((prev) => ({
        ...prev,
        isSubmitting: false,
        errors: [result.error || 'Failed to save assignment'],
      }));
    }
  };

  const filteredTables = tables.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchTable = `table ${t.table_number}`.toLowerCase().includes(q) || String(t.table_number).includes(q);
    const primary = assignments.find((a) => a.table_id === t.id && a.role === 'primary');
    const backup = assignments.find((a) => a.table_id === t.id && a.role === 'backup');
    const matchPrimary = primary?.student?.name?.toLowerCase().includes(q) || primary?.student?.enrollment_no?.toLowerCase().includes(q);
    const matchBackup = backup?.student?.name?.toLowerCase().includes(q) || backup?.student?.enrollment_no?.toLowerCase().includes(q);
    return matchTable || matchPrimary || matchBackup;
  });

  const fullyStaffedCount = tables.filter((t) => {
    const p = assignments.some((a) => a.table_id === t.id && a.role === 'primary');
    const b = assignments.some((a) => a.table_id === t.id && a.role === 'backup');
    return p && b;
  }).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header Section */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block">
            Phase 3 • Monthly Duty Assignments
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 mt-0.5">
            <Calendar className="w-6 h-6 text-indigo-600" />
            Monthly Supplier Duty Roster
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pre-configure monthly table responsibility with Primary and Standby Backup assignments and zero conflict overlaps
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/admin/suppliers/generate">
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1.5 shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
              Auto Generator
            </Button>
          </Link>

          {/* Duty Period Selector */}
          <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
            <Clock className="w-4 h-4 text-indigo-600 ml-1" />
            <select
              value={selectedPeriodId}
              onChange={(e) => setSelectedPeriodId(e.target.value)}
              className="text-xs font-bold text-slate-900 bg-transparent border-none focus:outline-hidden cursor-pointer"
            >
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.start_date} → {p.end_date})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2. Subnav */}
      <SupplierSubnav />

      {/* 3. Roster Status Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-700">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Active Duty Period</p>
              <p className="text-sm font-black text-slate-900">{activePeriod?.name || 'September 2026'}</p>
              <p className="text-[11px] text-slate-500">{activePeriod?.start_date} to {activePeriod?.end_date}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Fully Staffed Tables</p>
              <p className="text-xl font-black text-emerald-700">{fullyStaffedCount} / {tables.length}</p>
              <p className="text-[11px] text-slate-500">Both Primary &amp; Backup ready</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Needs Staffing Attention</p>
              <p className="text-xl font-black text-amber-700">{tables.length - fullyStaffedCount}</p>
              <p className="text-[11px] text-slate-500">Missing primary or backup assignment</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. Search Filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search Table #, Student Name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <span className="text-xs text-slate-500 font-semibold">
          Showing {filteredTables.length} tables
        </span>
      </div>

      {/* 5. Table Roster Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTables.map((table) => {
          const isTable31 = table.table_number === 31;
          const primaryAsgn = assignments.find((a) => a.table_id === table.id && a.role === 'primary' && a.status === 'active');
          const backupAsgn = assignments.find((a) => a.table_id === table.id && a.role === 'backup' && a.status === 'active');
          const isComplete = primaryAsgn && backupAsgn;

          return (
            <Card
              key={table.id}
              className={`border transition-all ${
                isTable31
                  ? 'border-indigo-400 ring-2 ring-indigo-500 shadow-sm bg-indigo-50/15'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <CardHeader className="p-4 pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black text-slate-900">Table {table.table_number}</span>
                    {isTable31 && (
                      <Badge className="bg-indigo-600 text-white font-extrabold text-[10px] px-1.5 py-0.5">
                        Table 31 Seed
                      </Badge>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500">{table.dining_area?.name || 'Main Dining Hall'}</span>
                </div>

                <Badge
                  className={`text-[10px] font-bold ${
                    isComplete
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-amber-100 text-amber-800 border-amber-300'
                  }`}
                >
                  {isComplete ? 'Staffed' : 'Partial'}
                </Badge>
              </CardHeader>

              <CardContent className="p-4 space-y-3">
                {/* Primary */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-700 uppercase tracking-wider mb-0.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Primary Supplier
                    </div>
                    {primaryAsgn?.student ? (
                      <div>
                        <p className="text-xs font-black text-slate-900 truncate">{primaryAsgn.student.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">ID: {primaryAsgn.student.enrollment_no}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-rose-600 font-bold italic">No Primary Assigned</p>
                    )}
                  </div>
                  <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
                    <UserCheck className="w-4 h-4" />
                  </div>
                </div>

                {/* Backup */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-purple-700 uppercase tracking-wider mb-0.5">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      Backup Standby Supplier
                    </div>
                    {backupAsgn?.student ? (
                      <div>
                        <p className="text-xs font-black text-slate-900 truncate">{backupAsgn.student.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">ID: {backupAsgn.student.enrollment_no}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-amber-600 font-bold italic">No Backup Assigned</p>
                    )}
                  </div>
                  <div className="p-1.5 rounded-lg bg-purple-100 text-purple-700">
                    <Users className="w-4 h-4" />
                  </div>
                </div>

                {/* Assign / Change Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditModal(table)}
                  className="w-full text-xs font-bold h-8 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                >
                  <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                  Configure Table Suppliers
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit Supplier Assignment Modal */}
      {editModal.isOpen && editModal.table && (
        <Modal
          isOpen={editModal.isOpen}
          onClose={() => setEditModal((prev) => ({ ...prev, isOpen: false }))}
          title={`Configure Suppliers for Table ${editModal.table.table_number}`}
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Assign a dedicated <strong>Primary Supplier</strong> and standby <strong>Backup Supplier</strong> for{' '}
              Table {editModal.table.table_number} for <strong>{activePeriod?.name}</strong>.
            </p>

            {/* Error notifications */}
            {editModal.errors.length > 0 && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  Assignment Rules Violation
                </div>
                {editModal.errors.map((err, i) => (
                  <p key={i}>• {err}</p>
                ))}
              </div>
            )}

            {/* Warning notifications */}
            {editModal.warnings.length > 0 && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Conflict Warning
                </div>
                {editModal.warnings.map((warn, i) => (
                  <p key={i}>• {warn}</p>
                ))}
              </div>
            )}

            {/* Primary Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Primary Supplier <span className="text-rose-500">*</span>
              </label>
              <select
                value={editModal.primaryStudentId}
                onChange={(e) => handleStudentChange('primary', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- Select Primary Supplier --</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.enrollment_no})
                  </option>
                ))}
              </select>
            </div>

            {/* Backup Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Backup Standby Supplier (Optional but recommended)
              </label>
              <select
                value={editModal.backupStudentId}
                onChange={(e) => handleStudentChange('backup', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- None (No Backup) --</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.enrollment_no})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditModal((prev) => ({ ...prev, isOpen: false }))}
                className="text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveAssignment}
                disabled={
                  !editModal.primaryStudentId ||
                  editModal.errors.length > 0 ||
                  editModal.isSubmitting
                }
                className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {editModal.isSubmitting ? 'Saving...' : 'Save Table Suppliers'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
