'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getUtensilProvider } from '@/lib/utensils/provider';
import { getTableProvider } from '@/lib/tables/provider';
import { 
  UtensilDiscrepancy, 
  DiscrepancyStatus, 
  DiningTable 
} from '@/types/database';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  AlertTriangle, 
  MapPin, 
  CheckCircle2, 
  RotateCcw, 
  Wrench, 
  Trash2, 
  Clock, 
  ShieldCheck, 
  User, 
  Calendar, 
  ChevronRight, 
  ArrowRight,
  PackageX,
  Layers,
  FileText,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export default function DiscrepancyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const discrepancyId = params?.id as string;

  const [discrepancy, setDiscrepancy] = useState<UtensilDiscrepancy | null>(null);
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Action inputs
  const [foundTableId, setFoundTableId] = useState<string>('t-32');
  const [actionReason, setActionReason] = useState<string>('');
  const [classificationStatus, setClassificationStatus] = useState<DiscrepancyStatus>('MISSING');

  const loadData = useCallback(async () => {
    if (!discrepancyId) return;
    setIsLoading(true);
    try {
      const utensilProvider = getUtensilProvider();
      const tableProvider = getTableProvider();

      const [disc, allTables] = await Promise.all([
        utensilProvider.getDiscrepancyById(discrepancyId),
        tableProvider.getTables(),
      ]);

      setDiscrepancy(disc);
      setTables(allTables);
    } catch (err) {
      console.error('Failed to load discrepancy details', err);
    } finally {
      setIsLoading(false);
    }
  }, [discrepancyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-center text-slate-400">
        Loading discrepancy audit details...
      </div>
    );
  }

  if (!discrepancy) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-800">Discrepancy Record Not Found</h2>
        <p className="text-xs text-slate-500">The requested discrepancy does not exist or has been archived.</p>
        <Link href="/admin/utensils/discrepancies">
          <Button variant="outline" size="sm" className="text-xs">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Back to Discrepancy Ledger
          </Button>
        </Link>
      </div>
    );
  }

  const handleClassify = async () => {
    setIsProcessing(true);
    try {
      const provider = getUtensilProvider();
      await provider.classifyDiscrepancy(
        discrepancy.id,
        classificationStatus,
        classificationStatus === 'MISPLACED' ? foundTableId : null,
        actionReason || `Classified as ${classificationStatus}`,
        'a0000000-0000-0000-0000-000000000001',
        'Supervisor Shafi',
        'SUPERVISOR'
      );
      setActionReason('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Classification failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMarkFound = async () => {
    setIsProcessing(true);
    try {
      const provider = getUtensilProvider();
      await provider.markFound(
        discrepancy.id,
        foundTableId,
        'a0000000-0000-0000-0000-000000000001',
        'Supervisor Shafi',
        actionReason || 'Physically located at neighbouring table'
      );
      setActionReason('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Action failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRecordReturn = async () => {
    setIsProcessing(true);
    try {
      const provider = getUtensilProvider();
      await provider.recordReturn(
        discrepancy.id,
        discrepancy.origin_table_id,
        'a0000000-0000-0000-0000-000000000001',
        'Supervisor Shafi',
        actionReason || 'Returned to source shelf'
      );
      setActionReason('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Action failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmRecovery = async () => {
    setIsProcessing(true);
    try {
      const provider = getUtensilProvider();
      await provider.confirmRecovery(
        discrepancy.id,
        'a0000000-0000-0000-0000-000000000001',
        'Supervisor Shafi',
        'SUPERVISOR',
        actionReason || 'Verified count present, discrepancy resolved'
      );
      setActionReason('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Recovery failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRepairStatus = async (status: 'REPAIR_REQUIRED' | 'UNDER_REPAIR' | 'RETURNED_FROM_REPAIR' | 'IN_SERVICE') => {
    setIsProcessing(true);
    try {
      const provider = getUtensilProvider();
      await provider.updateRepairStatus(
        discrepancy.id,
        status,
        'a0000000-0000-0000-0000-000000000001',
        'Supervisor Shafi',
        'SUPERVISOR',
        actionReason || `Status updated to ${status}`
      );
      setActionReason('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Repair action failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApproveDisposal = async () => {
    if (!actionReason || actionReason.trim().length < 5) {
      alert('Please enter a specific disposal reason (e.g. Broken beyond repair, institutional safety disposal).');
      return;
    }
    setIsProcessing(true);
    try {
      const provider = getUtensilProvider();
      await provider.approveDisposal(
        discrepancy.id,
        actionReason,
        'a0000000-0000-0000-0000-000000000001',
        'Supervisor Shafi',
        'SUPERVISOR'
      );
      setActionReason('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Disposal approval failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReopen = async () => {
    if (!actionReason || actionReason.trim().length < 5) {
      alert('A specific reason is required by PRD Section 44 to reopen a resolved discrepancy.');
      return;
    }
    setIsProcessing(true);
    try {
      const provider = getUtensilProvider();
      await provider.reopenDiscrepancy(
        discrepancy.id,
        actionReason,
        'a0000000-0000-0000-0000-000000000001',
        'Supervisor Shafi',
        'SUPERVISOR'
      );
      setActionReason('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Reopening failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Navigation & Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/utensils/discrepancies"
          className="text-xs font-bold text-slate-500 hover:text-slate-800 inline-flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Discrepancy Ledger
        </Link>
        <span className="text-[11px] font-mono text-slate-400">ID: {discrepancy.id}</span>
      </div>

      {/* Main Header Card (PRD Section 33) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
              PRD Section 33 • Investigation Detail
            </span>
            <span className="text-xs font-bold text-slate-400">
              Table {discrepancy.origin_table?.table_number}
            </span>
          </div>

          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2.5">
            <span>{discrepancy.quantity}x {discrepancy.utensil_type?.name}</span>
            <span className="text-slate-300 font-normal">|</span>
            <span className="text-indigo-600">Table {discrepancy.origin_table?.table_number}</span>
          </h1>

          <p className="text-xs text-slate-500 mt-1">
            Dining Area: <span className="font-bold text-slate-700">{discrepancy.origin_table?.dining_area?.name || 'Main Dining Hall'}</span>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
            <div className="text-[10px] uppercase font-extrabold text-slate-400">Current Status</div>
            <div className="text-sm font-black text-slate-900 mt-0.5">{discrepancy.status}</div>
          </div>
          {discrepancy.resolution_type && (
            <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-xs">
              <div className="text-[10px] uppercase font-extrabold text-emerald-600">Resolution</div>
              <div className="text-sm font-black text-emerald-900 mt-0.5">{discrepancy.resolution_type}</div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Context & Action Controls */}
        <div className="lg:col-span-2 space-y-6">
          {/* Location Context (Expected vs Found) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-600" />
              Location Context &amp; Cross-Table Tracking
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-black uppercase text-slate-400 block">Assigned / Source Shelf</span>
                <span className="text-lg font-black text-slate-900 block mt-1">
                  Table {discrepancy.origin_table?.table_number}
                </span>
                <span className="text-xs text-slate-500 block mt-0.5">
                  {discrepancy.origin_table?.dining_area?.name}
                </span>
                <span className="inline-block mt-2 text-[10px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                  Stamped Origin
                </span>
              </div>

              <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200">
                <span className="text-[10px] font-black uppercase text-amber-600 block">Observed / Found Table</span>
                <span className="text-lg font-black text-amber-900 block mt-1">
                  {discrepancy.current_table ? `Table ${discrepancy.current_table.table_number}` : 'Unlocated'}
                </span>
                <span className="text-xs text-amber-700 block mt-0.5">
                  {discrepancy.current_table ? discrepancy.current_table.dining_area?.name || 'Same Hall' : 'Not yet found at neighbour tables'}
                </span>
                {discrepancy.current_table && (
                  <span className="inline-block mt-2 text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded">
                    Cross-Table Transfer
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Supplier Accountability Context (PRD Section 33 & 35) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-600" />
              Duty &amp; Operational Context
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 text-[10px] font-bold uppercase block">Duty Supplier</span>
                <span className="font-extrabold text-slate-900 block mt-0.5">
                  {discrepancy.reported_by_name || 'Ijas K'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 text-[10px] font-bold uppercase block">Duty Area</span>
                <span className="font-extrabold text-slate-900 block mt-0.5">
                  {discrepancy.origin_table?.dining_area?.name || 'First Floor CHS Side'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 text-[10px] font-bold uppercase block">Meal Session</span>
                <span className="font-extrabold text-slate-900 block mt-0.5">
                  Lunch (12:45 PM)
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 text-[10px] font-bold uppercase block">Reported At</span>
                <span className="font-extrabold text-slate-900 block mt-0.5">
                  {discrepancy.reported_at?.split('T')[1]?.substring(0, 5) || '09:00'} IST
                </span>
              </div>
            </div>
          </div>

          {/* Action Center: Valid State Machine Transitions (PRD Section 9, 10, 43) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Authorized Workflow Actions
              </h2>
              <span className="text-[11px] font-bold text-slate-400">Role: Supervisor / Dining Manager</span>
            </div>

            {/* If UNRESOLVED */}
            {discrepancy.status === 'UNRESOLVED' && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="text-xs font-bold text-slate-800">
                  Step 1: Classify Discrepancy
                </div>
                <div className="flex flex-wrap gap-2">
                  {(['MISSING', 'MISPLACED', 'DAMAGED', 'BROKEN'] as DiscrepancyStatus[]).map((st) => (
                    <button
                      key={st}
                      onClick={() => setClassificationStatus(st)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                        classificationStatus === st
                          ? "bg-slate-900 text-white shadow-xs"
                          : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                      )}
                    >
                      {st}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 pt-2">
                  <input
                    type="text"
                    placeholder="Classification reason / investigation note..."
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium"
                  />
                  <Button
                    size="sm"
                    onClick={handleClassify}
                    disabled={isProcessing}
                    className="bg-indigo-600 text-white font-bold text-xs"
                  >
                    Confirm Classification
                  </Button>
                </div>
              </div>
            )}

            {/* If MISSING or MISPLACED */}
            {(discrepancy.status === 'MISSING' || discrepancy.status === 'MISPLACED') && (
              <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-200 space-y-3">
                <div className="text-xs font-extrabold text-blue-900 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  Search &amp; Recovery Workflow
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                      Found at which Neighbour Table?
                    </label>
                    <select
                      value={foundTableId}
                      onChange={(e) => setFoundTableId(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold"
                    >
                      {tables.map((t) => (
                        <option key={t.id} value={t.id}>
                          Table {t.table_number} ({t.dining_area?.name || 'Hall'})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                      Notes
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Glass located under bench 32"
                      value={actionReason}
                      onChange={(e) => setActionReason(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-medium"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={handleMarkFound}
                    disabled={isProcessing}
                    className="bg-blue-600 text-white font-bold text-xs"
                  >
                    Mark Found at Table
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleConfirmRecovery}
                    disabled={isProcessing}
                    className="bg-emerald-600 text-white font-bold text-xs"
                  >
                    Direct Recovery Confirmation
                  </Button>
                </div>
              </div>
            )}

            {/* If FOUND */}
            {discrepancy.status === 'FOUND' && (
              <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-200 space-y-3">
                <div className="text-xs font-extrabold text-indigo-900 flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5 text-indigo-600" />
                  Item Physically Located — Awaiting Shelf Return
                </div>
                <p className="text-xs text-slate-600">
                  Utensil was found at Table {discrepancy.current_table?.table_number}. Record when it is returned to Table {discrepancy.origin_table?.table_number}.
                </p>
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    onClick={handleRecordReturn}
                    disabled={isProcessing}
                    className="bg-indigo-600 text-white font-bold text-xs"
                  >
                    Record Return to Table {discrepancy.origin_table?.table_number} Shelf
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleConfirmRecovery}
                    disabled={isProcessing}
                    className="bg-emerald-600 text-white font-bold text-xs"
                  >
                    Confirm Recovery &amp; Reconcile
                  </Button>
                </div>
              </div>
            )}

            {/* If RETURNED */}
            {discrepancy.status === 'RETURNED' && (
              <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-3">
                <div className="text-xs font-extrabold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Supervisor Confirmation Required
                </div>
                <p className="text-xs text-slate-600">
                  Item has been placed back in Table {discrepancy.origin_table?.table_number} shelf. Supervisor must inspect and confirm full 8/8 inventory.
                </p>
                <Button
                  size="sm"
                  onClick={handleConfirmRecovery}
                  disabled={isProcessing}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                >
                  Confirm Physical Recovery (Reconcile Table)
                </Button>
              </div>
            )}

            {/* If DAMAGED or BROKEN */}
            {(discrepancy.status === 'DAMAGED' || discrepancy.status === 'BROKEN' || discrepancy.status === 'REPAIR_REQUIRED' || discrepancy.status === 'UNDER_REPAIR') && (
              <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-200 space-y-3">
                <div className="text-xs font-extrabold text-purple-900 flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-purple-600" />
                  Maintenance &amp; Disposal Authorization
                </div>

                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Disposal reason or repair assessment notes..."
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium"
                  />
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      size="sm"
                      onClick={() => handleRepairStatus('REPAIR_REQUIRED')}
                      disabled={isProcessing}
                      className="bg-purple-600 text-white font-bold text-xs"
                    >
                      Send for Repair
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleRepairStatus('IN_SERVICE')}
                      disabled={isProcessing}
                      className="bg-slate-900 text-white font-bold text-xs"
                    >
                      Restored to Service
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleApproveDisposal}
                      disabled={isProcessing}
                      className="bg-rose-600 text-white font-bold text-xs"
                    >
                      Approve Permanent Disposal
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* If RESOLVED (Reopen action per PRD Section 44) */}
            {discrepancy.status === 'RESOLVED' && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Discrepancy Formally Resolved
                </div>
                <p className="text-xs text-slate-500">
                  Resolved on {discrepancy.resolved_at?.split('T')[0]} by {discrepancy.resolved_by_name || 'Supervisor'}.
                  Only authorized dining supervisors may reopen this discrepancy.
                </p>
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Reason to reopen (Required)..."
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleReopen}
                    disabled={isProcessing}
                    className="border-slate-300 font-bold text-xs text-slate-700"
                  >
                    Reopen Issue
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Immutable Audit Timeline (PRD Section 27, 28, 29) */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                Audit Trail Timeline
              </h2>
              <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Immutable
              </span>
            </div>

            <p className="text-xs text-slate-500">
              Complete chronological sequence answering WHO, WHAT, WHEN, WHERE, and WHY (PRD Section 67).
            </p>

            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {discrepancy.history && discrepancy.history.length > 0 ? (
                discrepancy.history.map((h, idx) => (
                  <div key={h.id || idx} className="relative">
                    <span className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-indigo-600 border-2 border-white ring-2 ring-indigo-100" />
                    <div className="text-xs font-extrabold text-slate-900">
                      {h.action.replace(/_/g, ' ')}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <span className="font-semibold text-slate-700">{h.performed_by_name || 'System Staff'}</span>
                      <span>•</span>
                      <span>{h.performed_at.split('T')[1]?.substring(0, 5) || '09:00'} IST</span>
                    </div>
                    {(h.notes || h.reason) && (
                      <div className="mt-1 p-2 bg-slate-50 rounded-lg text-[11px] text-slate-600 border border-slate-100">
                        {h.notes || h.reason}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-400">
                  Initial detection logged at {discrepancy.reported_at?.split('T')[1]?.substring(0, 5)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
