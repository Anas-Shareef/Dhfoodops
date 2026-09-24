'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getSupplierProvider } from '@/lib/suppliers/provider';
import { getTableProvider } from '@/lib/tables/provider';
import { 
  SupplierAreaMonitoringSummary, 
  TableMonitoringStatus, 
  DiningArea, 
  SupplierDerivedStatus
} from '@/types/database';
import { SupplierSubnav } from '@/components/admin/supplier-subnav';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { getTodayDateStringIST } from '@/lib/utils/timezone';
import { cn } from '@/lib/utils/cn';
import {
  Radio,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  RefreshCw,
  Building,
  UtensilsCrossed,
  History,
  ArrowRightLeft,
  AlertCircle
} from 'lucide-react';

export default function SupplierMonitoringPage() {
  const toast = useToast();
  const [areas, setAreas] = useState<DiningArea[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<string>('');
  const [date, setDate] = useState<string>(getTodayDateStringIST());
  const [monitoringSummary, setMonitoringSummary] = useState<SupplierAreaMonitoringSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Selected table for detailed audit timeline modal
  const [timelineTable, setTimelineTable] = useState<TableMonitoringStatus | null>(null);

  // Quick Action Modals
  const [absenceTarget, setAbsenceTarget] = useState<TableMonitoringStatus | null>(null);
  const [absenceReason, setAbsenceReason] = useState('Supplier absent during duty call');
  const [isSubmittingAbsence, setIsSubmittingAbsence] = useState(false);

  const [backupTarget, setBackupTarget] = useState<TableMonitoringStatus | null>(null);
  const [backupReason, setBackupReason] = useState('Primary supplier unavailable - activating standby');
  const [isSubmittingBackup, setIsSubmittingBackup] = useState(false);

  // Load dining areas
  useEffect(() => {
    async function loadAreas() {
      const tableProvider = getTableProvider();
      const allAreas = await tableProvider.getDiningAreas();
      setAreas(allAreas);
      if (allAreas.length > 0 && !selectedAreaId) {
        const preferred = allAreas.find(a => a.name.includes('First Floor CHS')) || allAreas[0];
        setSelectedAreaId(preferred.id);
      }
    }
    loadAreas();
  }, [selectedAreaId]);

  // Load monitoring summary for the selected area and date
  const loadMonitoring = useCallback(async () => {
    if (!selectedAreaId) return;
    setIsLoading(true);
    try {
      const supplierProvider = getSupplierProvider();
      const summaries = await supplierProvider.getAreaMonitoring(selectedAreaId, date);
      setMonitoringSummary(summaries[0] || null);
    } catch (err) {
      console.error('Failed to load area monitoring', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedAreaId, date]);

  useEffect(() => {
    loadMonitoring();
  }, [loadMonitoring]);

  // Quick check-in action
  const handleQuickCheckin = async (table: TableMonitoringStatus) => {
    const targetSupplier = table.active_supplier || table.primary_supplier;
    if (!targetSupplier) {
      toast.error('No supplier assigned to this table.');
      return;
    }
    const supplierProvider = getSupplierProvider();
    const res = await supplierProvider.checkInSupplier(
      table.table_id,
      targetSupplier.id,
      'Checked in via Live Area Monitoring Console'
    );
    if (res.success) {
      toast.success(`✓ Table ${table.table_number}: ${targetSupplier.name} checked in successfully!`);
      loadMonitoring();
    } else {
      toast.error(res.error || 'Failed to record check-in.');
    }
  };

  // Submit absence
  const handleSubmitAbsence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!absenceTarget || !absenceTarget.primary_supplier) return;
    setIsSubmittingAbsence(true);
    const supplierProvider = getSupplierProvider();
    const res = await supplierProvider.reportAbsence(
      absenceTarget.table_id,
      absenceTarget.primary_supplier.id,
      date,
      absenceReason.trim(),
      'unapproved_absent'
    );
    setIsSubmittingAbsence(false);
    if (res.success) {
      toast.success(`✓ Absence recorded for Table ${absenceTarget.table_number}. Standby backup is now eligible.`);
      setAbsenceTarget(null);
      loadMonitoring();
    } else {
      toast.error(res.error || 'Failed to record absence.');
    }
  };

  // Submit backup activation
  const handleSubmitBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!backupTarget) return;
    setIsSubmittingBackup(true);
    const supplierProvider = getSupplierProvider();

    const res = await supplierProvider.activateBackup(
      backupTarget.table_id,
      'a0000000-0000-0000-0000-000000000001',
      backupReason.trim()
    );
    setIsSubmittingBackup(false);
    if (res.success) {
      toast.success(`✓ Standby backup supplier activated for Table ${backupTarget.table_number}!`);
      setBackupTarget(null);
      loadMonitoring();
    } else {
      toast.error(res.error || 'Failed to activate backup.');
    }
  };

  // Filter tables
  const filteredTables = (monitoringSummary?.tables || []).filter(t => {
    if (statusFilter !== 'all') {
      if (statusFilter === 'COMPLETED' && t.operational_status !== 'COMPLETED') return false;
      if (statusFilter === 'IN_PROGRESS' && !['OPERATING', 'COLLECTING', 'VERIFYING'].includes(t.operational_status)) return false;
      if (statusFilter === 'NOT_STARTED' && t.operational_status !== 'NOT_STARTED') return false;
      if (statusFilter === 'DISCREPANCY' && t.operational_status !== 'DISCREPANCY') return false;
      if (statusFilter === 'ABSENT' && t.operational_status !== 'ABSENT') return false;
      if (statusFilter === 'BACKUP_ACTIVE' && t.operational_status !== 'BACKUP_ACTIVE') return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTable = `table ${t.table_number}`.toLowerCase().includes(q) || String(t.table_number).includes(q);
      const matchSupplier = (t.active_supplier?.name || '').toLowerCase().includes(q) || 
                            (t.active_supplier?.enrollment_no || '').toLowerCase().includes(q);
      return matchTable || matchSupplier;
    }
    return true;
  });

  // Calculate alert counts
  const tablesNeedingAttention = (monitoringSummary?.tables || []).filter(t => 
    t.operational_status === 'ABSENT' || 
    t.operational_status === 'DISCREPANCY' || 
    (t.operational_status === 'NOT_STARTED' && t.primary_supplier)
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header & Navigation */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <Radio className="w-5 h-5 animate-pulse text-indigo-600" />
            </span>
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
              Phase 6 Live Operational Command
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">Area Supplier Live Monitoring</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time synthesis of supplier check-ins, Phase 5 shelf operations, utensil verification, and discrepancy states.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={loadMonitoring}
            disabled={isLoading}
            className="text-xs font-semibold gap-1.5 text-slate-700 hover:bg-slate-100"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      <SupplierSubnav />

      {/* 2. Area Selector Pills */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-2">
          <Building className="w-4 h-4 text-slate-400" />
          Select Scoped Dining Area:
        </div>
        <div className="flex flex-wrap gap-2">
          {areas.map((area) => {
            const isSelected = area.id === selectedAreaId;
            return (
              <button
                key={area.id}
                onClick={() => setSelectedAreaId(area.id)}
                className={cn(
                  'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border',
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                )}
              >
                <span>{area.name}</span>
                {area.area_type === 'TEACHER' && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-400 text-amber-950 font-black">
                    TEACHER
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Operational KPIs */}
      {monitoringSummary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          <Card className="bg-white border-slate-200 shadow-xs">
            <CardContent className="p-4">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Tables</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">
                {monitoringSummary.total_tables}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">In Area</span>
            </CardContent>
          </Card>

          <Card className="bg-emerald-50/50 border-emerald-200/80 shadow-xs">
            <CardContent className="p-4">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Completed</span>
              <span className="text-2xl font-black text-emerald-900 mt-1 block">
                {monitoringSummary.completed_count}
              </span>
              <span className="text-[10px] text-emerald-600 font-medium">Verified & Closed</span>
            </CardContent>
          </Card>

          <Card className="bg-blue-50/50 border-blue-200/80 shadow-xs">
            <CardContent className="p-4">
              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">In Progress</span>
              <span className="text-2xl font-black text-blue-900 mt-1 block">
                {monitoringSummary.in_progress_count}
              </span>
              <span className="text-[10px] text-blue-600 font-medium">Operating / Verifying</span>
            </CardContent>
          </Card>

          <Card className="bg-amber-50/50 border-amber-200/80 shadow-xs">
            <CardContent className="p-4">
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Not Started</span>
              <span className="text-2xl font-black text-amber-900 mt-1 block">
                {monitoringSummary.not_started_count}
              </span>
              <span className="text-[10px] text-amber-600 font-medium">Pending Check-in</span>
            </CardContent>
          </Card>

          <Card className="bg-rose-50/50 border-rose-200/80 shadow-xs">
            <CardContent className="p-4">
              <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">Discrepancy</span>
              <span className="text-2xl font-black text-rose-900 mt-1 block">
                {monitoringSummary.discrepancy_count}
              </span>
              <span className="text-[10px] text-rose-600 font-medium">Utensil Mismatch</span>
            </CardContent>
          </Card>

          <Card className="bg-purple-50/50 border-purple-200/80 shadow-xs">
            <CardContent className="p-4">
              <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">Absent</span>
              <span className="text-2xl font-black text-purple-900 mt-1 block">
                {monitoringSummary.absent_count}
              </span>
              <span className="text-[10px] text-purple-600 font-medium">Needs Standby</span>
            </CardContent>
          </Card>

          <Card className="bg-teal-50/50 border-teal-200/80 shadow-xs">
            <CardContent className="p-4">
              <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider block">Backup Active</span>
              <span className="text-2xl font-black text-teal-900 mt-1 block">
                {monitoringSummary.backup_active_count}
              </span>
              <span className="text-[10px] text-teal-600 font-medium">Standby Operating</span>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 4. Operational In-App Alerts Banner */}
      {tablesNeedingAttention.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-amber-100 text-amber-800 rounded-lg shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </span>
            <div>
              <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                Operational Exceptions Requiring Attention ({tablesNeedingAttention.length})
              </h4>
              <div className="flex flex-wrap gap-2 mt-1">
                {tablesNeedingAttention.slice(0, 5).map(t => (
                  <span key={t.table_id} className="text-[11px] font-semibold text-amber-900 bg-amber-100/70 px-2 py-0.5 rounded-md">
                    Table {t.table_number}: {t.operational_status.replace('_', ' ')}
                  </span>
                ))}
                {tablesNeedingAttention.length > 5 && (
                  <span className="text-[11px] font-medium text-amber-800">
                    +{tablesNeedingAttention.length - 5} more
                  </span>
                )}
              </div>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setStatusFilter('NOT_STARTED')}
            className="text-xs font-bold text-amber-900 border-amber-300 hover:bg-amber-100 shrink-0"
          >
            Review Pending Tables
          </Button>
        </div>
      )}

      {/* 5. Filters and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search table or supplier name/ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {[
            { id: 'all', label: 'All Tables' },
            { id: 'COMPLETED', label: 'Completed' },
            { id: 'IN_PROGRESS', label: 'In Progress' },
            { id: 'NOT_STARTED', label: 'Not Started' },
            { id: 'DISCREPANCY', label: 'Discrepancies' },
            { id: 'ABSENT', label: 'Absent' },
            { id: 'BACKUP_ACTIVE', label: 'Backup Active' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap',
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 6. Grid of Table Monitoring Cards */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-500" />
          <p className="text-xs font-medium">Synthesizing live operational signals...</p>
        </div>
      ) : filteredTables.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-700">No tables match the selected filters</h3>
          <p className="text-xs text-slate-400 mt-1">Try selecting a different area or clearing the search query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTables.map((table) => {
            const isCompleted = table.operational_status === 'COMPLETED';
            const isOperating = ['OPERATING', 'COLLECTING', 'VERIFYING'].includes(table.operational_status);
            const isDiscrepancy = table.operational_status === 'DISCREPANCY';
            const isAbsent = table.operational_status === 'ABSENT';
            const isNotStarted = table.operational_status === 'NOT_STARTED';
            const isBackupActive = table.operational_status === 'BACKUP_ACTIVE';

            return (
              <div
                key={table.table_id}
                className={cn(
                  'bg-white rounded-2xl border transition-all duration-200 p-4 flex flex-col justify-between shadow-xs hover:shadow-md relative overflow-hidden',
                  isDiscrepancy && 'border-rose-300 ring-2 ring-rose-100 bg-rose-50/20',
                  isCompleted && 'border-emerald-200 bg-emerald-50/10',
                  isAbsent && 'border-purple-300 bg-purple-50/20',
                  !isDiscrepancy && !isCompleted && !isAbsent && 'border-slate-200'
                )}
              >
                {/* Header: Table Number & Status Badge */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-slate-900">
                        Table {table.table_number}
                      </span>
                      {table.active_handover && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold flex items-center gap-1">
                          <ArrowRightLeft className="w-3 h-3" />
                          Handover
                        </span>
                      )}
                    </div>
                    {/* Status Badge */}
                    <span
                      className={cn(
                        'text-[10px] font-black uppercase px-2 py-0.5 rounded-full border',
                        isCompleted && 'bg-emerald-100 text-emerald-800 border-emerald-300',
                        isOperating && 'bg-blue-100 text-blue-800 border-blue-300 animate-pulse',
                        isDiscrepancy && 'bg-rose-100 text-rose-800 border-rose-300',
                        isAbsent && 'bg-purple-100 text-purple-800 border-purple-300',
                        isNotStarted && 'bg-slate-100 text-slate-600 border-slate-300',
                        isBackupActive && 'bg-teal-100 text-teal-800 border-teal-300',
                        table.operational_status === 'CHECKED_IN' && 'bg-amber-100 text-amber-800 border-amber-300'
                      )}
                    >
                      {table.operational_status.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Supplier Info */}
                  <div className="bg-slate-50/80 rounded-xl p-2.5 mb-3 border border-slate-100">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
                          {isBackupActive ? 'Active Standby' : 'Responsible Supplier'}
                        </span>
                        <div className="text-xs font-bold text-slate-800 mt-0.5">
                          {table.active_supplier?.name || table.primary_supplier?.name || 'Unassigned'}
                        </div>
                        {(table.active_supplier?.enrollment_no || table.primary_supplier?.enrollment_no) && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            ID: {table.active_supplier?.enrollment_no || table.primary_supplier?.enrollment_no}
                          </span>
                        )}
                      </div>

                      {table.backup_supplier && (
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
                            Standby
                          </span>
                          <span className="text-[11px] font-semibold text-slate-600">
                            {table.backup_supplier.name}
                          </span>
                        </div>
                      )}
                    </div>

                    {table.check_in_time && (
                      <div className="text-[10px] text-emerald-700 font-medium mt-1.5 flex items-center gap-1 border-t border-slate-200/60 pt-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Checked in at {table.check_in_time}
                      </div>
                    )}
                  </div>

                  {/* Operational Step Checklist (PRD Section 19) */}
                  <div className="space-y-1 mb-3 text-[11px]">
                    <div className="flex items-center justify-between py-0.5 border-b border-slate-100">
                      <span className="text-slate-600 font-medium">1. Check-In</span>
                      {table.check_in_time ? (
                        <span className="text-emerald-600 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Checked
                        </span>
                      ) : (
                        <span className="text-slate-400 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> Pending
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between py-0.5 border-b border-slate-100">
                      <span className="text-slate-600 font-medium">2. Shelf Opened</span>
                      {table.shelf_status && table.shelf_status !== 'LOCKED' ? (
                        <span className="text-emerald-600 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> {table.shelf_status}
                        </span>
                      ) : (
                        <span className="text-slate-400 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> Locked
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between py-0.5 border-b border-slate-100">
                      <span className="text-slate-600 font-medium">3. Distribution</span>
                      {['OPERATING', 'COLLECTING', 'VERIFYING', 'COMPLETED', 'DISCREPANCY'].includes(table.operational_status) ? (
                        <span className="text-emerald-600 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Started
                        </span>
                      ) : (
                        <span className="text-slate-400 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> Pending
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between py-0.5 border-b border-slate-100">
                      <span className="text-slate-600 font-medium">4. Collection & Verification</span>
                      {['VERIFYING', 'COMPLETED'].includes(table.operational_status) ? (
                        <span className="text-emerald-600 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                        </span>
                      ) : (
                        <span className="text-slate-400 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> Pending
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between py-0.5">
                      <span className="text-slate-600 font-medium">5. Shelf Closed</span>
                      {table.shelf_status === 'LOCKED' && isCompleted ? (
                        <span className="text-emerald-600 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Closed
                        </span>
                      ) : (
                        <span className="text-slate-400 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> Open / Incomplete
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Utensil Counts & Discrepancies */}
                  <div className="bg-slate-50/70 rounded-xl p-2 mb-3 border border-slate-100">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                      <span className="flex items-center gap-1 text-slate-500">
                        <UtensilsCrossed className="w-3.5 h-3.5" /> Utensils:
                      </span>
                      <span>
                        P: {table.plates_summary} &bull; G: {table.glasses_summary} &bull; J: {table.jugs_summary}
                      </span>
                    </div>

                    {table.discrepancy_count > 0 && (
                      <div className="text-[10px] text-rose-700 font-bold mt-1.5 flex items-center gap-1 bg-rose-50 p-1 rounded border border-rose-200">
                        <AlertTriangle className="w-3 h-3 text-rose-600" />
                        {table.discrepancy_count} Unresolved Discrepancy!
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-2 border-t border-slate-100 flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5">
                    {/* Action 1: Check In */}
                    {!table.check_in_time && !isAbsent && (
                      <Button
                        size="sm"
                        onClick={() => handleQuickCheckin(table)}
                        className="flex-1 text-[11px] h-7 bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                      >
                        Check In
                      </Button>
                    )}

                    {/* Action 2: Mark Absent */}
                    {!table.check_in_time && !isAbsent && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setAbsenceTarget(table)}
                        className="text-[11px] h-7 text-purple-700 border-purple-200 hover:bg-purple-50 font-bold"
                      >
                        Mark Absent
                      </Button>
                    )}

                    {/* Action 3: Activate Backup */}
                    {isAbsent && !isBackupActive && (
                      <Button
                        size="sm"
                        onClick={() => setBackupTarget(table)}
                        className="flex-1 text-[11px] h-7 bg-teal-600 hover:bg-teal-700 text-white font-bold"
                      >
                        Activate Standby
                      </Button>
                    )}

                    {/* Action 4: View Detail */}
                    <Link href={`/admin/suppliers/${table.table_id}`} className="flex-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-[11px] h-7 text-slate-700 border-slate-200 hover:bg-slate-50 font-semibold"
                      >
                        View Table Duty
                      </Button>
                    </Link>
                  </div>

                  {/* Audit Timeline Button */}
                  <button
                    onClick={() => setTimelineTable(table)}
                    className="w-full text-center py-1 text-[10px] font-bold text-slate-500 hover:text-indigo-600 flex items-center justify-center gap-1 transition-colors"
                  >
                    <History className="w-3 h-3" />
                    View Operational Audit Timeline ({table.timeline?.length ?? 0})
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 7. Modal: Full Operational Audit Timeline (PRD Section 21) */}
      <Modal
        isOpen={Boolean(timelineTable)}
        onClose={() => setTimelineTable(null)}
        title={`Table ${timelineTable?.table_number} — Operational Event Chain`}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400 font-bold uppercase text-[10px] block">Responsible Supplier</span>
              <span className="font-bold text-slate-800">{timelineTable?.active_supplier?.name || 'Unassigned'}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 font-bold uppercase text-[10px] block">Operational Status</span>
              <span className="font-bold text-indigo-600">{timelineTable?.operational_status.replace('_', ' ')}</span>
            </div>
          </div>

          <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {timelineTable?.timeline && timelineTable.timeline.length > 0 ? (
              timelineTable.timeline.map((ev, idx) => (
                <div key={idx} className="relative group">
                  <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full border-2 border-white bg-indigo-600 ring-2 ring-indigo-100" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">{ev.event}</span>
                      <span className="text-[10px] font-mono text-slate-400">{ev.time}</span>
                    </div>
                    {ev.actor && (
                      <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                        By: {ev.actor}
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center">No operational events recorded yet.</p>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <Button size="sm" variant="outline" onClick={() => setTimelineTable(null)}>
              Close Timeline
            </Button>
          </div>
        </div>
      </Modal>

      {/* 8. Modal: Mark Absent */}
      <Modal
        isOpen={Boolean(absenceTarget)}
        onClose={() => setAbsenceTarget(null)}
        title={`Mark Absence — Table ${absenceTarget?.table_number}`}
        maxWidth="md"
      >
        <form onSubmit={handleSubmitAbsence} className="space-y-4">
          <div className="bg-purple-50 p-3 rounded-xl border border-purple-200 text-xs text-purple-900">
            You are recording an official absence for primary supplier{' '}
            <strong className="font-bold">{absenceTarget?.primary_supplier?.name}</strong>.
            This will make standby backup supplier <strong className="font-bold">{absenceTarget?.backup_supplier?.name || 'eligible standby'}</strong> eligible for activation.
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Absence Reason</label>
            <textarea
              rows={3}
              value={absenceReason}
              onChange={(e) => setAbsenceReason(e.target.value)}
              className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button size="sm" type="button" variant="outline" onClick={() => setAbsenceTarget(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              type="submit"
              disabled={isSubmittingAbsence}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
            >
              {isSubmittingAbsence ? 'Recording...' : 'Confirm Absence'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 9. Modal: Activate Backup */}
      <Modal
        isOpen={Boolean(backupTarget)}
        onClose={() => setBackupTarget(null)}
        title={`Activate Standby Backup — Table ${backupTarget?.table_number}`}
        maxWidth="md"
      >
        <form onSubmit={handleSubmitBackup} className="space-y-4">
          <div className="bg-teal-50 p-3 rounded-xl border border-teal-200 text-xs text-teal-900">
            Activate standby backup supplier{' '}
            <strong className="font-bold">{backupTarget?.backup_supplier?.name || 'Designated Standby'}</strong> for Table {backupTarget?.table_number}.
            This action creates an audit event and grants operational authority to the standby supplier.
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Activation Reason / Notes</label>
            <textarea
              rows={3}
              value={backupReason}
              onChange={(e) => setBackupReason(e.target.value)}
              className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button size="sm" type="button" variant="outline" onClick={() => setBackupTarget(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              type="submit"
              disabled={isSubmittingBackup}
              className="bg-teal-600 hover:bg-teal-700 text-white font-bold"
            >
              {isSubmittingBackup ? 'Activating...' : 'Authorize Standby Activation'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
