'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { getUtensilProvider } from '@/lib/utensils/provider';
import { getTableProvider } from '@/lib/tables/provider';
import { 
  UtensilDiscrepancy, 
  DiscrepancyStatus, 
  DiningTable,
  Phase7DiscrepancyKPIs
} from '@/types/database';
import { UtensilsSubnav } from '@/components/admin/utensils-subnav';
import { CrossTableRecoveryModal } from '@/components/admin/cross-table-recovery-modal';
import { ReportDiscrepancyModal } from '@/components/admin/report-discrepancy-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  Search, 
  RotateCcw, 
  CheckCircle2, 
  ArrowRight,
  Clock, 
  MapPin, 
  RefreshCw, 
  Plus, 
  Wrench, 
  Trash2, 
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  PackageX,
  Layers,
  ArrowUpRight,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export default function UtensilDiscrepanciesPage() {
  const [discrepancies, setDiscrepancies] = useState<UtensilDiscrepancy[]>([]);
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [kpis, setKpis] = useState<Phase7DiscrepancyKPIs | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [issueFilter, setIssueFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);
  const [isDiscrepancyModalOpen, setIsDiscrepancyModalOpen] = useState(false);

  // Quick Action Modal states
  const [activeActionDisc, setActiveActionDisc] = useState<UtensilDiscrepancy | null>(null);
  const [actionType, setActionType] = useState<'FOUND' | 'DISPOSE' | 'REPAIR' | 'REOPEN' | null>(null);
  const [actionFoundTableId, setActionFoundTableId] = useState<string>('t-32');
  const [actionReason, setActionReason] = useState<string>('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const utensilProvider = getUtensilProvider();
      const tableProvider = getTableProvider();

      const [discs, allTables, kpiData] = await Promise.all([
        utensilProvider.getAllDiscrepancies(),
        tableProvider.getTables(),
        utensilProvider.getPhase7DiscrepancyKPIs(),
      ]);

      setDiscrepancies(discs);
      setTables(allTables);
      setKpis(kpiData);
    } catch (err) {
      console.error('Failed to load discrepancies', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Aging calculation (PRD Section 32 & 52)
  const calculateAge = (reportedAtStr: string) => {
    const reported = new Date(reportedAtStr).getTime();
    const now = new Date('2026-09-24T09:30:00+05:30').getTime(); // Reference current operation time
    const diffMs = Math.max(0, now - reported);
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 60) return { text: `${diffMins} min`, isUrgent: diffMins >= 30 };
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return { text: `${diffHours} hour${diffHours > 1 ? 's' : ''}`, isUrgent: true };
    const diffDays = Math.floor(diffHours / 24);
    return { text: `${diffDays} day${diffDays > 1 ? 's' : ''}`, isUrgent: true };
  };

  const handleConfirmRecovery = async (discId: string) => {
    setIsLoading(true);
    try {
      const provider = getUtensilProvider();
      await provider.confirmRecovery(discId, 'a0000000-0000-0000-0000-000000000001', 'Supervisor Shafi', 'SUPERVISOR', 'Supervisor confirmed table recovery on dashboard');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Recovery failed.');
      setIsLoading(false);
    }
  };

  const handleExecuteActionModal = async () => {
    if (!activeActionDisc || !actionType) return;
    setIsSubmittingAction(true);
    const provider = getUtensilProvider();

    try {
      if (actionType === 'FOUND') {
        await provider.markFound(activeActionDisc.id, actionFoundTableId, 'a0000000-0000-0000-0000-000000000001', 'Supervisor Shafi', actionReason || 'Found during hall inspection');
      } else if (actionType === 'DISPOSE') {
        if (!actionReason || actionReason.trim().length < 5) {
          alert('Please enter a valid disposal justification reason.');
          setIsSubmittingAction(false);
          return;
        }
        await provider.approveDisposal(activeActionDisc.id, actionReason, 'a0000000-0000-0000-0000-000000000001', 'Supervisor Shafi', 'SUPERVISOR');
      } else if (actionType === 'REPAIR') {
        await provider.updateRepairStatus(activeActionDisc.id, 'REPAIR_REQUIRED', 'a0000000-0000-0000-0000-000000000001', 'Supervisor Shafi', 'SUPERVISOR', actionReason || 'Sent for dining repair');
      } else if (actionType === 'REOPEN') {
        if (!actionReason || actionReason.trim().length < 5) {
          alert('Please enter a justification reason for reopening.');
          setIsSubmittingAction(false);
          return;
        }
        await provider.reopenDiscrepancy(activeActionDisc.id, actionReason, 'a0000000-0000-0000-0000-000000000001', 'Supervisor Shafi', 'SUPERVISOR');
      }

      setActiveActionDisc(null);
      setActionType(null);
      setActionReason('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Operation failed.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const filtered = useMemo(() => {
    return discrepancies.filter((d) => {
      const originTableNum = d.origin_table?.table_number?.toString() || '';
      const currentTableNum = d.current_table?.table_number?.toString() || '';
      const utensilName = d.utensil_type?.name?.toLowerCase() || '';
      const notes = (d.notes || '').toLowerCase();
      const q = searchQuery.toLowerCase();

      const matchesSearch = originTableNum.includes(q) || currentTableNum.includes(q) || utensilName.includes(q) || notes.includes(q);
      const matchesStatus = statusFilter === 'ALL' ? true : d.status === statusFilter;
      const matchesIssue = issueFilter === 'ALL' ? true : d.issue_type === issueFilter;

      return matchesSearch && matchesStatus && matchesIssue;
    });
  }, [discrepancies, searchQuery, statusFilter, issueFilter]);

  const getStatusBadge = (status: DiscrepancyStatus, issueType?: string) => {
    switch (status) {
      case 'UNRESOLVED':
        return (
          <Badge className="bg-rose-500/10 text-rose-700 border-rose-200 font-extrabold text-[11px] animate-pulse flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            Unresolved
          </Badge>
        );
      case 'MISSING':
        return (
          <Badge className="bg-rose-100 text-rose-800 border-rose-300 font-bold text-[11px] flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-rose-600" />
            Missing
          </Badge>
        );
      case 'MISPLACED':
        return (
          <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-bold text-[11px] flex items-center gap-1">
            <MapPin className="w-3 h-3 text-amber-600" />
            Misplaced
          </Badge>
        );
      case 'FOUND':
        return (
          <Badge className="bg-blue-100 text-blue-900 border-blue-300 font-bold text-[11px] flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-blue-600" />
            Found (Return Pending)
          </Badge>
        );
      case 'RETURNED':
        return (
          <Badge className="bg-indigo-100 text-indigo-900 border-indigo-300 font-bold text-[11px] flex items-center gap-1">
            <RotateCcw className="w-3 h-3 text-indigo-600" />
            Returned to Shelf
          </Badge>
        );
      case 'RECOVERED':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-[11px] flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Recovered
          </Badge>
        );
      case 'DAMAGED':
      case 'REPAIR_REQUIRED':
      case 'UNDER_REPAIR':
        return (
          <Badge className="bg-purple-100 text-purple-800 border-purple-300 font-bold text-[11px] flex items-center gap-1">
            <Wrench className="w-3 h-3 text-purple-600" />
            {status.replace('_', ' ')}
          </Badge>
        );
      case 'BROKEN':
        return (
          <Badge className="bg-slate-200 text-slate-800 border-slate-300 font-bold text-[11px] flex items-center gap-1">
            <PackageX className="w-3 h-3 text-slate-700" />
            Broken
          </Badge>
        );
      case 'DISCARDED':
        return (
          <Badge className="bg-slate-100 text-slate-600 border-slate-300 font-bold text-[11px] flex items-center gap-1">
            <Trash2 className="w-3 h-3 text-slate-500" />
            Discarded
          </Badge>
        );
      case 'OVERAGE':
        return (
          <Badge className="bg-sky-100 text-sky-800 border-sky-300 font-bold text-[11px] flex items-center gap-1">
            <Layers className="w-3 h-3 text-sky-600" />
            Overage (+1 Extra)
          </Badge>
        );
      case 'RESOLVED':
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold text-[11px] flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            Resolved
          </Badge>
        );
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      <UtensilsSubnav
        onOpenRecoveryModal={() => setIsRecoveryModalOpen(true)}
        onOpenDiscrepancyModal={() => setIsDiscrepancyModalOpen(true)}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header Banner */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-100">
                Phase 7 • Discrepancy &amp; Recovery Management
              </span>
              <span className="text-[11px] font-bold text-slate-400">
                Authoritative Shelf Audit
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 mt-1">
              <AlertTriangle className="w-6 h-6 text-rose-600" />
              Utensil Discrepancy Ledger
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Track physical count differences from Phase 5 verification. Distinguish Missing, Misplaced, Damaged, Broken and Overages with immutable supervisor audit history.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => setIsRecoveryModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Cross-Table Recovery
            </Button>
            <Button
              onClick={() => setIsDiscrepancyModalOpen(true)}
              variant="outline"
              className="border-amber-300 bg-amber-50/70 text-amber-900 hover:bg-amber-100 font-bold text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Report Issue
            </Button>
            <Button
              variant="outline"
              onClick={loadData}
              className="text-xs font-semibold"
            >
              <RefreshCw className={cn("w-3.5 h-3.5 mr-1", isLoading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Phase 7 KPI Metric Cards (PRD Section 30 & 51) */}
        {kpis && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Open Issues</div>
              <div className="text-2xl font-black text-rose-600 mt-0.5">{kpis.total_open}</div>
              <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                Active investigation
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Missing</div>
              <div className="text-2xl font-black text-amber-600 mt-0.5">{kpis.missing_count}</div>
              <div className="text-[10px] text-slate-500 mt-1">Pending search</div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Misplaced / Overages</div>
              <div className="text-2xl font-black text-blue-600 mt-0.5">{kpis.misplaced_count + kpis.overage_count}</div>
              <div className="text-[10px] text-slate-500 mt-1">Cross-table candidates</div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Damaged / Broken</div>
              <div className="text-2xl font-black text-purple-700 mt-0.5">{kpis.damaged_count + kpis.broken_count}</div>
              <div className="text-[10px] text-slate-500 mt-1">In repair / review</div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Recovered Today</div>
              <div className="text-2xl font-black text-emerald-600 mt-0.5">{kpis.recovered_today}</div>
              <div className="text-[10px] text-emerald-700 font-semibold mt-1">Rate: {kpis.recovery_rate}</div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Avg Recovery Time</div>
              <div className="text-2xl font-black text-slate-800 mt-0.5">{kpis.average_recovery_time_minutes}m</div>
              <div className="text-[10px] text-slate-500 mt-1">From detection to lock</div>
            </div>
          </div>
        )}

        {/* Filters Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search by table #, utensil, or note..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:bg-white focus:outline-indigo-600 font-medium"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 overflow-x-auto">
              <span className="font-extrabold text-slate-400 uppercase text-[10px]">Status:</span>
              {[
                { id: 'ALL', label: 'All' },
                { id: 'MISSING', label: 'Missing' },
                { id: 'MISPLACED', label: 'Misplaced' },
                { id: 'OVERAGE', label: 'Overage' },
                { id: 'FOUND', label: 'Found' },
                { id: 'DAMAGED', label: 'Damaged' },
                { id: 'BROKEN', label: 'Broken' },
                { id: 'RESOLVED', label: 'Resolved' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id)}
                  className={cn(
                    'px-2 py-1 rounded-md text-[11px] font-bold transition-colors whitespace-nowrap',
                    statusFilter === f.id
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Discrepancy Ledger Table (PRD Section 31) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Utensil</th>
                  <th className="py-3 px-4">Qty</th>
                  <th className="py-3 px-4">Responsible Table</th>
                  <th className="py-3 px-4">Found / Current Location</th>
                  <th className="py-3 px-4">Supplier Duty</th>
                  <th className="py-3 px-4">Reported Context</th>
                  <th className="py-3 px-4">Age</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      Loading discrepancy records...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      No discrepancy records matching query.
                    </td>
                  </tr>
                ) : (
                  filtered.map((d) => {
                    const age = calculateAge(d.reported_at);
                    const isTable31Demo = d.origin_table?.table_number === 31;
                    const isTable32Demo = d.origin_table?.table_number === 32;

                    return (
                      <tr
                        key={d.id}
                        className={cn(
                          "hover:bg-slate-50/80 transition-colors",
                          d.status === 'UNRESOLVED' && "bg-rose-50/30",
                          d.status === 'OVERAGE' && "bg-sky-50/30",
                          d.status === 'FOUND' && "bg-blue-50/20"
                        )}
                      >
                        {/* Status */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {getStatusBadge(d.status, d.issue_type)}
                        </td>

                        {/* Utensil Type */}
                        <td className="py-3 px-4 whitespace-nowrap font-extrabold text-slate-900">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-800">{d.utensil_type?.name || 'Utensil'}</span>
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1 py-0.5 rounded font-bold">
                              #{d.origin_table?.table_number || '-'}
                            </span>
                          </div>
                        </td>

                        {/* Quantity */}
                        <td className="py-3 px-4 whitespace-nowrap font-black">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-xs font-black inline-block",
                            d.status === 'OVERAGE' ? "bg-sky-100 text-sky-800" : "bg-rose-100 text-rose-800"
                          )}>
                            {d.status === 'OVERAGE' ? `+${d.quantity}` : `-${d.quantity}`}
                          </span>
                        </td>

                        {/* Responsible Table & Area */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-bold text-slate-900">
                            Table {d.origin_table?.table_number || '-'}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {d.origin_table?.dining_area?.name || 'First Floor CHS Side'}
                          </div>
                        </td>

                        {/* Location / Destination Table */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {d.current_table ? (
                            <div className="flex items-center gap-1 text-amber-900 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                              <MapPin className="w-3 h-3 text-amber-600 shrink-0" />
                              Table {d.current_table.table_number}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Unlocated</span>
                          )}
                        </td>

                        {/* Supplier */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-semibold text-slate-800 block">
                            {d.reported_by_name || 'Assigned Supplier'}
                          </span>
                          <span className="text-[10px] text-slate-400">Meal: Lunch</span>
                        </td>

                        {/* Reported Context & Notes */}
                        <td className="py-3 px-4 max-w-xs truncate text-slate-600">
                          <div className="font-medium text-slate-800 truncate">{d.notes || d.resolution_reason || '-'}</div>
                          <div className="text-[10px] text-slate-400">{d.reported_at?.split('T')[1]?.substring(0, 5) || '09:00'} IST</div>
                        </td>

                        {/* Aging Indicator (PRD Section 32) */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={cn(
                            "px-2 py-0.5 rounded-md text-[10px] font-bold inline-flex items-center gap-1",
                            age.isUrgent ? "bg-amber-100 text-amber-900 font-black border border-amber-200" : "bg-slate-100 text-slate-600"
                          )}>
                            <Clock className="w-2.5 h-2.5" />
                            {age.text}
                          </span>
                        </td>

                        {/* Actions (Section 31) */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Detail Link */}
                            <Link
                              href={`/admin/utensils/discrepancies/${d.id}`}
                              className="px-2 py-1 rounded-md text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors inline-flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Inspect
                            </Link>

                            {/* Quick Context-Aware Transitions */}
                            {d.status === 'MISSING' && (
                              <button
                                onClick={() => {
                                  setActiveActionDisc(d);
                                  setActionType('FOUND');
                                  setActionFoundTableId('t-32');
                                }}
                                className="px-2 py-1 rounded-md text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 transition-colors"
                              >
                                Mark Found
                              </button>
                            )}

                            {(d.status === 'FOUND' || d.status === 'RETURNED' || (d.status === 'MISSING' && isTable31Demo)) && (
                              <button
                                onClick={() => handleConfirmRecovery(d.id)}
                                className="px-2 py-1 rounded-md text-[11px] font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-2xs"
                              >
                                Confirm Recovery
                              </button>
                            )}

                            {(d.status === 'DAMAGED' || d.status === 'BROKEN') && (
                              <>
                                <button
                                  onClick={() => {
                                    setActiveActionDisc(d);
                                    setActionType('REPAIR');
                                  }}
                                  className="px-2 py-1 rounded-md text-[11px] font-bold bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100 transition-colors"
                                >
                                  Repair
                                </button>
                                <button
                                  onClick={() => {
                                    setActiveActionDisc(d);
                                    setActionType('DISPOSE');
                                  }}
                                  className="px-2 py-1 rounded-md text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100 transition-colors"
                                >
                                  Dispose
                                </button>
                              </>
                            )}

                            {d.status === 'RESOLVED' && (
                              <button
                                onClick={() => {
                                  setActiveActionDisc(d);
                                  setActionType('REOPEN');
                                }}
                                className="px-2 py-1 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition-colors"
                              >
                                Reopen
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Quick Action Modal */}
      {activeActionDisc && actionType && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                {actionType === 'FOUND' && <MapPin className="w-5 h-5 text-blue-600" />}
                {actionType === 'DISPOSE' && <Trash2 className="w-5 h-5 text-rose-600" />}
                {actionType === 'REPAIR' && <Wrench className="w-5 h-5 text-purple-600" />}
                {actionType === 'REOPEN' && <RotateCcw className="w-5 h-5 text-slate-700" />}
                {actionType === 'FOUND' && 'Record Found Location'}
                {actionType === 'DISPOSE' && 'Authorized Disposal Approval'}
                {actionType === 'REPAIR' && 'Send Item For Repair'}
                {actionType === 'REOPEN' && 'Reopen Discrepancy'}
              </h3>
              <button
                onClick={() => {
                  setActiveActionDisc(null);
                  setActionType(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
              <div className="font-bold text-slate-900">
                {activeActionDisc.quantity}x {activeActionDisc.utensil_type?.name} (Source: Table {activeActionDisc.origin_table?.table_number})
              </div>
              <div className="text-slate-500">{activeActionDisc.notes}</div>
            </div>

            {actionType === 'FOUND' && (
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  Which Table Was This Item Found At?
                </label>
                <select
                  value={actionFoundTableId}
                  onChange={(e) => setActionFoundTableId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold"
                >
                  {tables.map((t) => (
                    <option key={t.id} value={t.id}>
                      Table {t.table_number} ({t.dining_area?.name || 'Hall'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1">
                {actionType === 'DISPOSE' ? 'Reason for Disposal (Required by PRD Sec 20):' : 'Notes / Justification:'}
              </label>
              <textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder={
                  actionType === 'DISPOSE'
                    ? 'e.g. Broken beyond repair, ceramic shards hazardous, institutional disposal approved'
                    : 'Add note...'
                }
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-medium"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setActiveActionDisc(null);
                  setActionType(null);
                }}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleExecuteActionModal}
                disabled={isSubmittingAction}
                className={cn(
                  "text-xs font-bold text-white",
                  actionType === 'DISPOSE' ? "bg-rose-600 hover:bg-rose-700" : "bg-slate-900 hover:bg-slate-800"
                )}
              >
                {isSubmittingAction ? 'Processing...' : 'Confirm Action'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <CrossTableRecoveryModal
        isOpen={isRecoveryModalOpen}
        onClose={() => setIsRecoveryModalOpen(false)}
        onSuccess={loadData}
      />

      <ReportDiscrepancyModal
        isOpen={isDiscrepancyModalOpen}
        onClose={() => setIsDiscrepancyModalOpen(false)}
        onSuccess={loadData}
        tables={tables}
      />
    </div>
  );
}
