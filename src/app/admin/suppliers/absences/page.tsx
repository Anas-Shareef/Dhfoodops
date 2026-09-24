'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getSupplierProvider } from '@/lib/suppliers/provider';
import { SupplierAbsence, TodayDutyItem } from '@/types/database';
import { SupplierSubnav } from '@/components/admin/supplier-subnav';
import { ActivateBackupModal } from '@/components/admin/activate-backup-modal';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  ShieldAlert, 
  UserX, 
  CheckCircle2, 
  RefreshCw, 
  Search,
  Calendar,
  Clock
} from 'lucide-react';
import { getTodayDateStringIST } from '@/lib/utils/timezone';

export default function SupplierAbsencesPage() {
  const [absences, setAbsences] = useState<SupplierAbsence[]>([]);
  const [todayDuties, setTodayDuties] = useState<TodayDutyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Backup modal target duty state
  const [backupTargetDuty, setBackupTargetDuty] = useState<TodayDutyItem | null>(null);

  const todayStr = getTodayDateStringIST();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const provider = getSupplierProvider();
    const [absenceList, duties] = await Promise.all([
      provider.getAbsences(),
      provider.getTodaySupplierDuties(todayStr),
    ]);

    setAbsences(absenceList);
    setTodayDuties(duties);
    setIsLoading(false);
  }, [todayStr]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredAbsences = absences.filter((ab) => {
    if (filterType === 'unapproved' && ab.status !== 'unapproved_absent') return false;
    if (filterType === 'approved' && ab.status !== 'approved_absent') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = ab.student?.name?.toLowerCase().includes(q) || ab.student?.enrollment_no?.toLowerCase().includes(q);
      const matchTable = `table ${ab.table?.table_number}`.toLowerCase().includes(q) || String(ab.table?.table_number).includes(q);
      const matchReason = ab.reason?.toLowerCase().includes(q);
      return matchName || matchTable || matchReason;
    }

    return true;
  });

  const unapprovedCount = absences.filter((a) => a.status === 'unapproved_absent').length;
  const approvedCount = absences.filter((a) => a.status === 'approved_absent').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-rose-600 uppercase tracking-wider block">
            Phase 3 • Emergency Duty Contingency
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 mt-0.5">
            <AlertTriangle className="w-6 h-6 text-rose-600" />
            Supplier Absence &amp; Backup Queue
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Audit recorded supplier absences, track unapproved dining hall no-shows, and activate standby backups
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={() => loadData()} disabled={isLoading} className="font-semibold text-xs">
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Queue
        </Button>
      </div>

      {/* 2. Subnav */}
      <SupplierSubnav />

      {/* 3. Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700">
              <UserX className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Total Absences Recorded</p>
              <p className="text-xl font-black text-slate-900">{absences.length}</p>
              <p className="text-[11px] text-slate-500">Institutional record log</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Unapproved No-Shows</p>
              <p className="text-xl font-black text-rose-700">{unapprovedCount}</p>
              <p className="text-[11px] text-rose-600 font-medium">Failed to appear without prior notice</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Approved Leave</p>
              <p className="text-xl font-black text-amber-700">{approvedCount}</p>
              <p className="text-[11px] text-amber-600 font-medium">Prior supervisor approval documented</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search Supplier, Table #, Reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          {[
            { id: 'all', label: 'All Records' },
            { id: 'unapproved', label: 'Unapproved No-Shows' },
            { id: 'approved', label: 'Approved Leave' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                filterType === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Absence Records List */}
      <Card className="bg-white border-slate-200 shadow-xs overflow-hidden">
        {filteredAbsences.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
            <h3 className="text-sm font-bold text-slate-800">No Supplier Absences In This View</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              All assigned primary suppliers are either active or no unapproved absences have been logged.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Table</th>
                  <th className="py-3 px-4">Absent Supplier</th>
                  <th className="py-3 px-4">Absence Classification</th>
                  <th className="py-3 px-4">Stated Reason</th>
                  <th className="py-3 px-4">Backup Contingency</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAbsences.map((ab) => {
                  const duty = todayDuties.find((d) => d.table_id === ab.table_id);
                  const isBackupActive = duty?.current_status === 'backup_activated';
                  const backupStudent = duty?.backup_assignment?.student;

                  return (
                    <tr key={ab.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-600">
                        {ab.duty_date}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-black text-slate-900">Table {ab.table?.table_number || '-'}</span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{ab.student?.name || 'Unknown'}</p>
                        <p className="text-[10px] text-slate-500 font-mono">ID: {ab.student?.enrollment_no}</p>
                      </td>
                      <td className="py-3 px-4">
                        {ab.status === 'unapproved_absent' ? (
                          <Badge className="bg-rose-100 text-rose-800 border-rose-300 font-bold">
                            Unapproved No-Show
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-bold">
                            Approved Leave
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-700 max-w-xs truncate">
                        {ab.reason}
                      </td>
                      <td className="py-3 px-4">
                        {isBackupActive ? (
                          <div className="flex items-center gap-1.5 text-purple-700 font-bold">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>Backup Activated ({backupStudent?.name})</span>
                          </div>
                        ) : backupStudent ? (
                          <div className="text-slate-500">
                            Standby: <span className="font-semibold text-slate-700">{backupStudent.name}</span>
                          </div>
                        ) : (
                          <span className="text-rose-500 font-semibold italic">No backup assigned</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {!isBackupActive && backupStudent && (
                          <Button
                            size="sm"
                            onClick={() => setBackupTargetDuty(duty || null)}
                            className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-7"
                          >
                            <ShieldAlert className="w-3 h-3 mr-1" />
                            Activate Backup
                          </Button>
                        )}
                        {isBackupActive && (
                          <span className="text-emerald-600 font-bold text-[11px] inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Covered
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Backup Activation Modal */}
      <ActivateBackupModal
        isOpen={Boolean(backupTargetDuty)}
        onClose={() => setBackupTargetDuty(null)}
        duty={backupTargetDuty}
        onSuccess={() => loadData()}
      />
    </div>
  );
}
