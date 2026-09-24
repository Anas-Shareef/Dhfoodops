'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getTableProvider } from '@/lib/tables/provider';
import { getAttendanceProvider } from '@/lib/attendance/provider';
import { DiningTable, Student, SeatingChangeLog } from '@/types/database';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { formatDateIST } from '@/lib/utils/timezone';
import { 
  ArrowLeftRight, 
  ArrowLeft, 
  Users, 
  UserCheck, 
  History, 
  Check, 
  AlertTriangle, 
  RefreshCw,
  Sparkles
} from 'lucide-react';

export default function SeatingRearrangementHubPage() {
  const [activeTab, setActiveTab] = useState<'individual' | 'bulk' | 'swap' | 'logs'>('individual');
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [changeLogs, setChangeLogs] = useState<SeatingChangeLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Individual Form
  const [indStudentId, setIndStudentId] = useState('');
  const [indTargetTableId, setIndTargetTableId] = useState('');
  const [indReason, setIndReason] = useState('Seating rearrangement');
  const [isIndSubmitting, setIsIndSubmitting] = useState(false);

  // Bulk Form
  const [bulkSelectedIds, setBulkSelectedIds] = useState<string[]>([]);
  const [bulkTargetTableId, setBulkTargetTableId] = useState('');
  const [bulkReason, setBulkReason] = useState('Bulk cohort seating allocation');
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);

  // Swap Form
  const [swapIdA, setSwapIdA] = useState('');
  const [swapIdB, setSwapIdB] = useState('');
  const [swapReason, setSwapReason] = useState('Mutual seating swap');
  const [isSwapSubmitting, setIsSwapSubmitting] = useState(false);

  const toast = useToast();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const tableProvider = getTableProvider();
    const attendanceProvider = getAttendanceProvider();

    const [tableList, studentList, logsList] = await Promise.all([
      tableProvider.getTables(),
      attendanceProvider.getAllStudents(),
      tableProvider.getSeatingChangeLogs(50),
    ]);

    setTables(tableList);
    setStudents(studentList);
    setChangeLogs(logsList);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Individual Move
  const handleIndividualMove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!indStudentId || !indTargetTableId) {
      toast.error('Please select both a student and a destination table.');
      return;
    }

    setIsIndSubmitting(true);
    const provider = getTableProvider();
    const res = await provider.moveStudent(indStudentId, indTargetTableId, indReason.trim());
    setIsIndSubmitting(false);

    if (res.success) {
      toast.success('✓ Seating change applied and recorded in historical audit logs.');
      setIndStudentId('');
      setIndTargetTableId('');
      loadData();
    } else {
      toast.error(res.error || 'Failed to move student.');
    }
  };

  // Handle Bulk Move
  const handleBulkMove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bulkSelectedIds.length === 0 || !bulkTargetTableId) {
      toast.error('Please select at least one student and a destination table.');
      return;
    }

    setIsBulkSubmitting(true);
    const provider = getTableProvider();
    const res = await provider.bulkAssignStudents(bulkSelectedIds, bulkTargetTableId, bulkReason.trim());
    setIsBulkSubmitting(false);

    if (res.success) {
      toast.success(`✓ Successfully moved ${res.movedCount} students.`);
      setBulkSelectedIds([]);
      setBulkTargetTableId('');
      loadData();
    } else {
      toast.error(res.error || 'Failed to bulk assign students.');
    }
  };

  // Handle Swap
  const handleSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!swapIdA || !swapIdB) {
      toast.error('Please select both students to perform a swap.');
      return;
    }

    setIsSwapSubmitting(true);
    const provider = getTableProvider();
    const res = await provider.swapStudents(swapIdA, swapIdB, swapReason.trim());
    setIsSwapSubmitting(false);

    if (res.success) {
      toast.success('✓ Mutual table swap completed and logged.');
      setSwapIdA('');
      setSwapIdB('');
      loadData();
    } else {
      toast.error(res.error || 'Failed to perform swap.');
    }
  };

  const selectedIndStudent = students.find((s) => s.id === indStudentId);
  const selectedIndTable = tables.find((t) => t.id === indTargetTableId);
  const isIndTableFull = selectedIndTable ? (selectedIndTable.current_members_count ?? 0) >= selectedIndTable.capacity : false;

  const targetBulkTable = tables.find((t) => t.id === bulkTargetTableId);
  const bulkAvailable = targetBulkTable ? Math.max(0, targetBulkTable.capacity - (targetBulkTable.current_members_count ?? 0)) : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <Link href="/admin/tables">
            <Button variant="outline" size="sm" className="p-2.5">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <ArrowLeftRight className="w-6 h-6 text-indigo-600" />
              Seating Rearrangement Hub
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Execute individual moves, bulk assignments, mutual table swaps, and review audit history
            </p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={loadData} isLoading={isLoading}>
          <RefreshCw className="w-4 h-4 mr-1.5" />
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('individual')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'individual'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Individual Move
        </button>

        <button
          onClick={() => setActiveTab('bulk')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'bulk'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Bulk Assignment
        </button>

        <button
          onClick={() => setActiveTab('swap')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'swap'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Student Swap
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'logs'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Audit Logs ({changeLogs.length})</span>
        </button>
      </div>

      {/* TAB 1: INDIVIDUAL MOVE */}
      {activeTab === 'individual' && (
        <Card className="max-w-2xl mx-auto border-slate-200 shadow-md">
          <CardHeader className="bg-slate-50/60 pb-3">
            <CardTitle>Transfer Individual Student (PRD Section 10)</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleIndividualMove} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Select Student
                </label>
                <select
                  required
                  value={indStudentId}
                  onChange={(e) => setIndStudentId(e.target.value)}
                  className="w-full text-xs font-semibold p-3 rounded-xl border border-slate-300 focus:border-indigo-600 outline-none bg-white"
                >
                  <option value="">-- Choose Student to Move --</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.enrollment_no}) • Currently Table {s.table_number || 'Unassigned'} ({s.department?.code || 'QS2'})
                    </option>
                  ))}
                </select>
              </div>

              {selectedIndStudent && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <span className="text-slate-500">Current Assignment:</span>{' '}
                  <strong className="text-slate-900">
                    {selectedIndStudent.table_number ? `Table ${selectedIndStudent.table_number}` : 'Unassigned'}
                  </strong>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Select Target Destination Table
                </label>
                <select
                  required
                  value={indTargetTableId}
                  onChange={(e) => setIndTargetTableId(e.target.value)}
                  className="w-full text-xs font-semibold p-3 rounded-xl border border-slate-300 focus:border-indigo-600 outline-none bg-white"
                >
                  <option value="">-- Choose Destination Table --</option>
                  {tables.map((t) => {
                    const current = t.current_members_count ?? 0;
                    const full = current >= t.capacity;
                    return (
                      <option key={t.id} value={t.id} disabled={full}>
                        Table {t.table_number} • {t.dining_area?.name} ({current}/{t.capacity} members) {full ? '[FULL]' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedIndTable && isIndTableFull && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Cannot move student here. Table is at full capacity.</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Reason for Transfer
                </label>
                <input
                  type="text"
                  required
                  value={indReason}
                  onChange={(e) => setIndReason(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:border-indigo-600 outline-none"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full py-3 mt-2"
                isLoading={isIndSubmitting}
                disabled={!indStudentId || !indTargetTableId || isIndTableFull}
              >
                Confirm Individual Transfer
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* TAB 2: BULK ASSIGNMENT */}
      {activeTab === 'bulk' && (
        <Card className="max-w-3xl mx-auto border-slate-200 shadow-md">
          <CardHeader className="bg-slate-50/60 pb-3">
            <CardTitle>Bulk Student Table Allocation (PRD Section 11)</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleBulkMove} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Select Target Table
                </label>
                <select
                  required
                  value={bulkTargetTableId}
                  onChange={(e) => setBulkTargetTableId(e.target.value)}
                  className="w-full text-xs font-semibold p-3 rounded-xl border border-slate-300 focus:border-indigo-600 outline-none bg-white"
                >
                  <option value="">-- Choose Target Table --</option>
                  {tables.map((t) => {
                    const current = t.current_members_count ?? 0;
                    const available = Math.max(0, t.capacity - current);
                    return (
                      <option key={t.id} value={t.id} disabled={available === 0}>
                        Table {t.table_number} • {t.dining_area?.name} ({available} seats available)
                      </option>
                    );
                  })}
                </select>
              </div>

              {targetBulkTable && (
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-950">
                  Target: <strong>Table {targetBulkTable.table_number}</strong> currently has{' '}
                  <strong>{bulkAvailable}</strong> available seat(s). You have selected{' '}
                  <strong>{bulkSelectedIds.length}</strong> student(s).
                </div>
              )}

              {/* Student Checkbox Roster */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Check Students to Allocate ({bulkSelectedIds.length} Selected)
                </label>
                <div className="border border-slate-200 rounded-xl max-h-60 overflow-y-auto divide-y divide-slate-100 p-2 bg-white">
                  {students.map((s) => {
                    const isChecked = bulkSelectedIds.includes(s.id);
                    return (
                      <label
                        key={s.id}
                        className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setBulkSelectedIds((prev) => [...prev, s.id]);
                            } else {
                              setBulkSelectedIds((prev) => prev.filter((id) => id !== s.id));
                            }
                          }}
                          className="w-4 h-4 text-indigo-600 rounded"
                        />
                        <span className="font-bold text-slate-900">{s.name}</span>
                        <span className="font-mono text-slate-500">({s.enrollment_no})</span>
                        <span className="text-slate-400 ml-auto">
                          Current: Table {s.table_number || 'Unassigned'}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Allocation Reason
                </label>
                <input
                  type="text"
                  required
                  value={bulkReason}
                  onChange={(e) => setBulkReason(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:border-indigo-600 outline-none"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full py-3"
                isLoading={isBulkSubmitting}
                disabled={bulkSelectedIds.length === 0 || !bulkTargetTableId || bulkSelectedIds.length > bulkAvailable}
              >
                Execute Bulk Allocation
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* TAB 3: STUDENT SWAP */}
      {activeTab === 'swap' && (
        <Card className="max-w-2xl mx-auto border-slate-200 shadow-md">
          <CardHeader className="bg-slate-50/60 pb-3">
            <CardTitle>Swap Seating Between Two Students (PRD Section 18)</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSwap} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Student A
                  </label>
                  <select
                    required
                    value={swapIdA}
                    onChange={(e) => setSwapIdA(e.target.value)}
                    className="w-full text-xs font-semibold p-3 rounded-xl border border-slate-300 focus:border-indigo-600 outline-none bg-white"
                  >
                    <option value="">-- Choose Student A --</option>
                    {students.filter((s) => s.table_number !== null).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (T{s.table_number})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Student B
                  </label>
                  <select
                    required
                    value={swapIdB}
                    onChange={(e) => setSwapIdB(e.target.value)}
                    className="w-full text-xs font-semibold p-3 rounded-xl border border-slate-300 focus:border-indigo-600 outline-none bg-white"
                  >
                    <option value="">-- Choose Student B --</option>
                    {students.filter((s) => s.table_number !== null && s.id !== swapIdA).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (T{s.table_number})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Reason for Mutual Swap
                </label>
                <input
                  type="text"
                  required
                  value={swapReason}
                  onChange={(e) => setSwapReason(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:border-indigo-600 outline-none"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full py-3"
                isLoading={isSwapSubmitting}
                disabled={!swapIdA || !swapIdB}
              >
                Execute Seating Swap
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* TAB 4: SEATING CHANGE AUDIT LOGS (PRD Section 13) */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-600" />
              Historical Seating Change Audit Trail ({changeLogs.length})
            </h2>
            <span className="text-xs text-slate-500">
              Preserves previous table and new table for audit compliance
            </span>
          </div>

          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Student</th>
                  <th className="p-3.5">Enrollment</th>
                  <th className="p-3.5">From Table</th>
                  <th className="p-3.5">To Table</th>
                  <th className="p-3.5">Reason</th>
                  <th className="p-3.5">Authorized By</th>
                  <th className="p-3.5 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {changeLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3.5 font-bold text-slate-900">
                      {log.student?.name || 'Student'}
                    </td>
                    <td className="p-3.5 font-mono text-slate-600">
                      {log.student?.enrollment_no || '---'}
                    </td>
                    <td className="p-3.5">
                      {log.from_table_number ? (
                        <span className="font-extrabold text-rose-800 bg-rose-50 px-2.5 py-0.5 rounded-md border border-rose-200">
                          Table {log.from_table_number}
                        </span>
                      ) : (
                        <span className="text-slate-400">Unassigned</span>
                      )}
                    </td>
                    <td className="p-3.5">
                      {log.to_table_number ? (
                        <span className="font-extrabold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                          Table {log.to_table_number}
                        </span>
                      ) : (
                        <span className="text-slate-400">Unassigned</span>
                      )}
                    </td>
                    <td className="p-3.5 text-slate-700 italic max-w-xs">
                      &ldquo;{log.reason}&rdquo;
                    </td>
                    <td className="p-3.5 text-slate-600">
                      {log.changed_by_name || 'Admin'}
                    </td>
                    <td className="p-3.5 text-right font-mono text-slate-500">
                      {formatDateIST(log.changed_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
