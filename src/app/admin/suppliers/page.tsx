'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getSupplierProvider } from '@/lib/suppliers/provider';
import { getAttendanceProvider } from '@/lib/attendance/provider';
import { TodayDutyItem, SupplierDashboardStats, Student } from '@/types/database';
import { SupplierSubnav } from '@/components/admin/supplier-subnav';
import { MarkAbsenceModal } from '@/components/admin/mark-absence-modal';
import { ActivateBackupModal } from '@/components/admin/activate-backup-modal';
import { SupplierHandoverModal } from '@/components/admin/supplier-handover-modal';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ClipboardList, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ShieldAlert, 
  Search, 
  RefreshCw, 
  UserCheck, 
  ExternalLink,
  ShieldCheck,
  Building,
  UserX
} from 'lucide-react';
import { getTodayDateStringIST } from '@/lib/utils/timezone';

export default function AdminSuppliersPage() {
  const [duties, setDuties] = useState<TodayDutyItem[]>([]);
  const [stats, setStats] = useState<SupplierDashboardStats | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal target duty states
  const [absenceTargetDuty, setAbsenceTargetDuty] = useState<TodayDutyItem | null>(null);
  const [backupTargetDuty, setBackupTargetDuty] = useState<TodayDutyItem | null>(null);
  const [handoverTargetDuty, setHandoverTargetDuty] = useState<TodayDutyItem | null>(null);

  const todayStr = getTodayDateStringIST();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const provider = getSupplierProvider();
    const attendanceProvider = getAttendanceProvider();
    const [dutiesData, statsData, studentList] = await Promise.all([
      provider.getTodaySupplierDuties(todayStr),
      provider.getSupplierDashboardStats(todayStr),
      attendanceProvider.getAllStudents(),
    ]);

    setDuties(dutiesData);
    setStats(statsData);
    setStudents(studentList);
    setIsLoading(false);
  }, [todayStr]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleQuickCheckIn = async (tableId: string, studentId: string) => {
    const provider = getSupplierProvider();
    const result = await provider.checkInSupplier(tableId, studentId, 'Checked in via Admin Desk');
    if (result.success) {
      loadData();
    } else {
      alert(result.error || 'Failed to check in');
    }
  };

  const filteredDuties = duties.filter((d) => {
    if (statusFilter !== 'all') {
      if (statusFilter === 'checked_in' && d.current_status !== 'checked_in') return false;
      if (statusFilter === 'pending' && d.current_status !== 'assigned') return false;
      if (statusFilter === 'absent' && d.current_status !== 'absent_approved' && d.current_status !== 'unapproved_absent') return false;
      if (statusFilter === 'backup_activated' && d.current_status !== 'backup_activated') return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTable = `table ${d.table_number}`.toLowerCase().includes(q) || String(d.table_number).includes(q);
      const matchPrimary = d.primary_assignment?.student?.name?.toLowerCase().includes(q) || d.primary_assignment?.student?.enrollment_no?.toLowerCase().includes(q);
      const matchBackup = d.backup_assignment?.student?.name?.toLowerCase().includes(q) || d.backup_assignment?.student?.enrollment_no?.toLowerCase().includes(q);
      return matchTable || matchPrimary || matchBackup;
    }

    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header Section */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block">
            Phase 3 • Table Duty Management
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 mt-0.5">
            <ClipboardList className="w-6 h-6 text-indigo-600" />
            Supplier Operational Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time table supplier duty tracking, attendance decoupling, emergency backup activation, and shelf accountability
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/suppliers/monitoring">
            <Button size="sm" className="font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live Area Monitoring
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={() => loadData()} disabled={isLoading} className="font-semibold text-xs">
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Link href="/admin/suppliers/schedule">
            <Button variant="outline" size="sm" className="font-semibold text-xs text-slate-700 hover:bg-slate-50">
              Monthly Roster
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Subnav */}
      <SupplierSubnav />

      {/* 3. Operational KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="bg-white border-slate-200 shadow-xs">
            <CardContent className="p-3.5 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Tables</p>
                <p className="text-xl font-black text-slate-900">{stats.total_tables}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-xs">
            <CardContent className="p-3.5 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-700">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Assigned</p>
                <p className="text-xl font-black text-indigo-900">{stats.assigned_tables}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-xs">
            <CardContent className="p-3.5 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Checked In</p>
                <p className="text-xl font-black text-emerald-700">{stats.checked_in}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-xs">
            <CardContent className="p-3.5 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Pending</p>
                <p className="text-xl font-black text-amber-700">{stats.pending}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-xs">
            <CardContent className="p-3.5 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700">
                <UserX className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Absent</p>
                <p className="text-xl font-black text-rose-700">{stats.absent}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-xs">
            <CardContent className="p-3.5 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-50 text-purple-700">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Backup Active</p>
                <p className="text-xl font-black text-purple-700">{stats.backup_activated}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 4. Filter & Search Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search Table #, Student Name, Enrollment ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {[
            { id: 'all', label: 'All Tables' },
            { id: 'checked_in', label: 'Checked In' },
            { id: 'pending', label: 'Pending' },
            { id: 'absent', label: 'Absent' },
            { id: 'backup_activated', label: 'Backup Activated' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Real-Time Duty Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDuties.map((item) => {
          const isTable31 = item.table_number === 31;
          const primary = item.primary_assignment?.student;
          const backup = item.backup_assignment?.student;
          const active = item.active_supplier;

          return (
            <Card 
              key={item.table_id} 
              className={`border transition-all duration-200 ${
                isTable31 ? 'ring-2 ring-indigo-500 border-indigo-200 shadow-md bg-indigo-50/15' : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <CardHeader className="p-4 pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black text-slate-900">Table {item.table_number}</span>
                    {isTable31 && (
                      <Badge className="bg-indigo-600 text-white font-extrabold text-[10px] px-1.5 py-0.5">
                        Seed Focus
                      </Badge>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500">{item.area_name}</span>
                </div>

                <div>
                  {item.current_status === 'checked_in' && (
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-[11px]">
                      Checked In {item.checked_in_at && `• ${item.checked_in_at}`}
                    </Badge>
                  )}
                  {item.current_status === 'backup_activated' && (
                    <Badge className="bg-purple-100 text-purple-800 border-purple-300 font-bold text-[11px]">
                      Backup Active
                    </Badge>
                  )}
                  {item.current_status === 'absent_approved' && (
                    <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-bold text-[11px]">
                      Absent (Approved)
                    </Badge>
                  )}
                  {item.current_status === 'unapproved_absent' && (
                    <Badge className="bg-rose-100 text-rose-800 border-rose-300 font-bold text-[11px]">
                      Unapproved Absence
                    </Badge>
                  )}
                  {item.current_status === 'assigned' && (
                    <Badge className="bg-slate-100 text-slate-600 border-slate-300 font-bold text-[11px]">
                      Pending Check-In
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-3.5">
                {/* Active Supplier Display */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1">
                    <span>ACTIVE RESPONSIBLE SUPPLIER</span>
                    {item.current_status === 'backup_activated' ? (
                      <span className="text-purple-600 uppercase">Standby Activated</span>
                    ) : (
                      <span className="text-indigo-600 uppercase">Primary</span>
                    )}
                  </div>
                  {active ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-black text-slate-900">{active.name}</p>
                        <p className="text-[11px] text-slate-500 font-mono">ID: {active.enrollment_no}</p>
                      </div>
                      <div className="p-1.5 rounded-full bg-indigo-100 text-indigo-700">
                        <UserCheck className="w-4 h-4" />
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-rose-600 font-semibold">No active supplier configured</p>
                  )}
                </div>

                {/* Primary & Backup details */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-white border border-slate-100">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Primary Supplier</p>
                    <p className="font-bold text-slate-800 truncate">{primary?.name || 'Unassigned'}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{primary?.enrollment_no || '-'}</p>
                  </div>

                  <div className="p-2 rounded-lg bg-white border border-slate-100">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Backup Standby</p>
                    <p className="font-bold text-slate-800 truncate">{backup?.name || 'Unassigned'}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{backup?.enrollment_no || '-'}</p>
                  </div>
                </div>

                {/* Latest Event Indicator */}
                {item.latest_event && (
                  <div className="text-[11px] flex items-center justify-between text-slate-500 border-t border-slate-100 pt-2">
                    <span>Latest Shelf / Hall Event:</span>
                    <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-[10px]">
                      {item.latest_event}
                    </span>
                  </div>
                )}

                {/* Operational Action Buttons */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {item.current_status !== 'checked_in' && active && (
                    <Button
                      size="sm"
                      onClick={() => handleQuickCheckIn(item.table_id, active.id)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      Check In
                    </Button>
                  )}

                  {primary && item.current_status !== 'absent_approved' && item.current_status !== 'unapproved_absent' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAbsenceTargetDuty(item)}
                      className="text-xs h-8 border-rose-200 text-rose-700 hover:bg-rose-50"
                    >
                      <UserX className="w-3.5 h-3.5 mr-1" />
                      Absence
                    </Button>
                  )}

                  {backup && primary && item.current_status !== 'backup_activated' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setBackupTargetDuty(item)}
                      className="text-xs h-8 border-purple-200 text-purple-700 hover:bg-purple-50"
                    >
                      <ShieldAlert className="w-3.5 h-3.5 mr-1" />
                      Backup
                    </Button>
                  )}

                  {active && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setHandoverTargetDuty(item)}
                      className="text-xs h-8 border-slate-200 text-slate-700 hover:bg-slate-50"
                    >
                      Handover
                    </Button>
                  )}

                  <Link href={`/admin/suppliers/${item.table_id}`} className="shrink-0">
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-slate-500 hover:text-slate-800">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Modals */}
      <MarkAbsenceModal
        isOpen={Boolean(absenceTargetDuty)}
        onClose={() => setAbsenceTargetDuty(null)}
        duty={absenceTargetDuty}
        onSuccess={() => loadData()}
      />

      <ActivateBackupModal
        isOpen={Boolean(backupTargetDuty)}
        onClose={() => setBackupTargetDuty(null)}
        duty={backupTargetDuty}
        onSuccess={() => loadData()}
      />

      <SupplierHandoverModal
        isOpen={Boolean(handoverTargetDuty)}
        onClose={() => setHandoverTargetDuty(null)}
        duty={handoverTargetDuty}
        students={students}
        onSuccess={() => loadData()}
      />
    </div>
  );
}
