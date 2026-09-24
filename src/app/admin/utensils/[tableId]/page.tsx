'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getUtensilProvider } from '@/lib/utensils/provider';
import { getTableProvider } from '@/lib/tables/provider';
import {
  DiningTable,
  UtensilOperationSession,
  UtensilOperationItem,
  UtensilDiscrepancy,
  UtensilEvent,
  TableUtensilConfig,
  ShelfOperationStatus,
  UtensilTableSummary,
} from '@/types/database';
import { UtensilsSubnav } from '@/components/admin/utensils-subnav';
import { CrossTableRecoveryModal } from '@/components/admin/cross-table-recovery-modal';
import { ReportDiscrepancyModal } from '@/components/admin/report-discrepancy-modal';
import { SupervisorOverrideModal } from '@/components/admin/supervisor-override-modal';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ShieldCheck,
  DoorOpen,
  DoorClosed,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Lock,
  ArrowLeft,
  Calendar,
  Layers,
  Sparkles,
  MapPin,
  RefreshCw,
  Wine,
  User,
  ShieldAlert
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export default function TableUtensilDetailPage({
  params,
}: {
  params: Promise<{ tableId: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const tableId = resolvedParams.tableId;

  const [table, setTable] = useState<UtensilTableSummary | null>(null);
  const [allTables, setAllTables] = useState<DiningTable[]>([]);
  const [session, setSession] = useState<UtensilOperationSession | null>(null);
  const [items, setItems] = useState<UtensilOperationItem[]>([]);
  const [discrepancies, setDiscrepancies] = useState<UtensilDiscrepancy[]>([]);
  const [events, setEvents] = useState<UtensilEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Return quantities form during COLLECTING state
  const [returnedPlates, setReturnedPlates] = useState<number>(8);
  const [returnedGlasses, setReturnedGlasses] = useState<number>(8);
  const [returnedJugs, setReturnedJugs] = useState<number>(1);

  // Action status message
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Modals state
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);
  const [isDiscrepancyModalOpen, setIsDiscrepancyModalOpen] = useState(false);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setActionError(null);
    try {
      const utensilProvider = getUtensilProvider();
      const tableProvider = getTableProvider();

      const [detail, tablesList] = await Promise.all([
        utensilProvider.getTableDetail(tableId),
        tableProvider.getTables(),
      ]);

      setTable(detail.table || null);
      setSession(detail.session || null);
      setItems(detail.items);
      setDiscrepancies(detail.discrepancies);
      setEvents(detail.events);
      setAllTables(tablesList);

      // Pre-fill returned values from session items if present
      const p = detail.items.find((i) => i.utensil_type?.code === 'PLATE');
      const g = detail.items.find((i) => i.utensil_type?.code === 'GLASS');
      const j = detail.items.find((i) => i.utensil_type?.code === 'JUG');
      if (p) setReturnedPlates(p.returned_quantity);
      if (g) setReturnedGlasses(g.returned_quantity);
      if (j) setReturnedJugs(j.returned_quantity);
    } catch (err: unknown) {
      console.error('Failed to load table detail', err);
      setActionError(err instanceof Error ? err.message : 'Failed to load details');
    } finally {
      setIsLoading(false);
    }
  }, [tableId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Operational State Machine Transitions
  const handleOpenShelf = async () => {
    setActionError(null);
    try {
      const provider = getUtensilProvider();
      const res = await provider.openShelf(tableId);
      if (res.success) {
        setActionSuccess('Table shelf unlocked and opened.');
        setTimeout(() => setActionSuccess(null), 3500);
        loadData();
      } else {
        setActionError(res.error || 'Failed to open shelf');
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Error');
    }
  };

  const handleStartDistribution = async () => {
    setActionError(null);
    try {
      const provider = getUtensilProvider();
      const res = await provider.startDistribution(tableId);
      if (res.success) {
        setActionSuccess('Utensil distribution in progress (8 Plates, 8 Glasses, 1 Jug).');
        setTimeout(() => setActionSuccess(null), 3500);
        loadData();
      } else {
        setActionError(res.error || 'Failed to start distribution');
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Error');
    }
  };

  const handleStartCollection = async () => {
    setActionError(null);
    try {
      const provider = getUtensilProvider();
      const res = await provider.startCollection(tableId);
      if (res.success) {
        setActionSuccess('Dining service completed. Collection from dining table started.');
        setTimeout(() => setActionSuccess(null), 3500);
        loadData();
      } else {
        setActionError(res.error || 'Failed to start collection');
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Error');
    }
  };

  const handleRecordReturnsAndVerify = async () => {
    setActionError(null);
    try {
      const provider = getUtensilProvider();
      const res = await provider.recordReturnsAndVerify(tableId, {
        plates: returnedPlates,
        glasses: returnedGlasses,
        jugs: returnedJugs,
      });

      if (res.success) {
        if (res.status === 'LOCKED') {
          setActionSuccess('All items accounted for! Shelf closed and LOCKED.');
        } else {
          setActionSuccess(`Discrepancy identified: ${res.unresolvedCount} item(s) unreturned. Shelf moved to DISCREPANCY.`);
        }
        setTimeout(() => setActionSuccess(null), 4000);
        loadData();
      } else {
        setActionError(res.error || 'Failed to verify returns');
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Error');
    }
  };

  const currentStatus: ShelfOperationStatus = session?.status || 'LOCKED';

  const steps: ShelfOperationStatus[] = [
    'LOCKED',
    'OPENED',
    'DISTRIBUTING',
    'COLLECTING',
    'VERIFYING',
  ];

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      <UtensilsSubnav
        onOpenRecoveryModal={() => setIsRecoveryModalOpen(true)}
        onOpenDiscrepancyModal={() => setIsDiscrepancyModalOpen(true)}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Link href="/admin/utensils" className="hover:text-indigo-600 flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            Utensil Dashboard
          </Link>
          <span>/</span>
          <span className="text-slate-900 font-bold">Table {table?.table_number || '-'} Ledger</span>
        </div>

        {/* Feedback Alerts */}
        {actionSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {actionSuccess}
          </div>
        )}

        {actionError && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            {actionError}
          </div>
        )}

        {/* Table Header Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                Table Level Accountability • PRD Section 20
              </span>
              <span className="text-xs text-slate-400 font-medium">Capacity: 8 Seats</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5 mt-1.5">
              <Wine className="w-7 h-7 text-indigo-600" />
              Table {table?.table_number || '-'} Utensil Station
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Dining Area: <strong className="text-slate-700">{table?.area_name || 'CHS Hall'}</strong> • Stamping: <strong className="text-indigo-600 font-mono">TBL #{table?.table_number}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {currentStatus === 'DISCREPANCY' && (
              <Button
                onClick={() => setIsOverrideModalOpen(true)}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
              >
                <Lock className="w-3.5 h-3.5" />
                Supervisor Force-Close
              </Button>
            )}
            <Button
              onClick={() => setIsRecoveryModalOpen(true)}
              variant="outline"
              className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold text-xs"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Found Stamped Item
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

        {/* Shelf State Stepper Machine (PRD Section 7 & 18) */}
        <Card className="border border-slate-200 shadow-xs bg-white">
          <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Shelf Operational State Machine
              </h2>
            </div>
            <div>
              {currentStatus === 'DISCREPANCY' ? (
                <Badge className="bg-rose-100 text-rose-800 border-rose-300 font-extrabold text-xs animate-pulse">
                  <AlertTriangle className="w-3.5 h-3.5 mr-1 text-rose-600" />
                  DISCREPANCY (Unresolved Shortage)
                </Badge>
              ) : currentStatus === 'LOCKED' ? (
                <Badge className="bg-emerald-50 text-emerald-800 border-emerald-300 font-bold text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  Shelf Reconciled &amp; LOCKED
                </Badge>
              ) : (
                <Badge className="bg-blue-50 text-blue-800 border-blue-200 font-bold text-xs">
                  Current State: {currentStatus}
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-5">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
              {steps.map((step, idx) => {
                const isCurrent = currentStatus === step;
                const isPassed =
                  steps.indexOf(currentStatus) > idx ||
                  (currentStatus === 'DISCREPANCY' && idx <= 3);

                return (
                  <div
                    key={step}
                    className={cn(
                      "p-3 rounded-xl border transition-all",
                      isCurrent
                        ? "border-indigo-600 bg-indigo-50/80 shadow-2xs font-black text-indigo-900 ring-2 ring-indigo-600/20"
                        : isPassed
                        ? "border-emerald-200 bg-emerald-50/40 text-emerald-800 font-semibold"
                        : "border-slate-100 bg-slate-50 text-slate-400 font-medium"
                    )}
                  >
                    <span className="text-[10px] block opacity-60">Step {idx + 1}</span>
                    <span className="font-bold block mt-0.5">{step}</span>
                  </div>
                );
              })}
            </div>

            {/* State Transition Action Strip */}
            <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Next Legal Operational Action</span>
                <p className="text-xs text-slate-700 font-medium mt-0.5">
                  {currentStatus === 'LOCKED' && 'Shelf is secured. Duty supplier unlocks prior to dining service.'}
                  {currentStatus === 'OPENED' && 'Shelf is open. Supplier begins distributing utensils to dining seats.'}
                  {currentStatus === 'DISTRIBUTING' && 'Utensils at table. Move to collection once students conclude dining.'}
                  {currentStatus === 'COLLECTING' && 'Record returned plate, glass, and jug counts below to verify shelf.'}
                  {currentStatus === 'DISCREPANCY' && 'Unresolved items detected. Check neighbouring tables or request supervisor override.'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {currentStatus === 'LOCKED' && (
                  <Button
                    onClick={handleOpenShelf}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
                  >
                    <DoorOpen className="w-3.5 h-3.5 mr-1.5" />
                    Open Shelf
                  </Button>
                )}

                {currentStatus === 'OPENED' && (
                  <Button
                    onClick={handleStartDistribution}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
                  >
                    <Clock className="w-3.5 h-3.5 mr-1.5" />
                    Start Distribution
                  </Button>
                )}

                {currentStatus === 'DISTRIBUTING' && (
                  <Button
                    onClick={handleStartCollection}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
                  >
                    <Clock className="w-3.5 h-3.5 mr-1.5" />
                    Start Collection
                  </Button>
                )}

                {currentStatus === 'COLLECTING' && (
                  <Button
                    onClick={handleRecordReturnsAndVerify}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                    Verify &amp; Close Shelf
                  </Button>
                )}

                {currentStatus === 'DISCREPANCY' && (
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setIsRecoveryModalOpen(true)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                      Search / Recover
                    </Button>
                    <Button
                      onClick={() => setIsOverrideModalOpen(true)}
                      variant="outline"
                      className="border-rose-300 text-rose-800 bg-rose-50 hover:bg-rose-100 font-bold text-xs"
                    >
                      <Lock className="w-3.5 h-3.5 mr-1.5" />
                      Supervisor Force-Close
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Physical Inventory & Collection Count Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Plates Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase">Dining Plates</span>
              <span className="text-xs font-black bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md">
                Expected: 8
              </span>
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <div>
                <span className="text-3xl font-black text-slate-900">{returnedPlates}</span>
                <span className="text-xs text-slate-400 font-medium ml-1">returned</span>
              </div>
              <span className={cn(
                "text-xs font-bold px-2 py-0.5 rounded-md",
                returnedPlates === 8 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
              )}>
                {returnedPlates === 8 ? '✓ Reconciled' : `${8 - returnedPlates} Shortage`}
              </span>
            </div>

            {currentStatus === 'COLLECTING' && (
              <div className="pt-2 border-t border-slate-100">
                <label className="text-[11px] font-bold text-slate-500 block mb-1">
                  Adjust Physical Returned Count:
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setReturnedPlates(Math.max(0, returnedPlates - 1))}
                    className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-slate-700"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={0}
                    max={12}
                    value={returnedPlates}
                    onChange={(e) => setReturnedPlates(parseInt(e.target.value) || 0)}
                    className="w-16 text-center font-black text-sm bg-slate-50 border border-slate-200 rounded-lg py-1"
                  />
                  <button
                    onClick={() => setReturnedPlates(Math.min(12, returnedPlates + 1))}
                    className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-slate-700"
                  >
                    +
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Glasses Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase">Drinking Glasses</span>
              <span className="text-xs font-black bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md">
                Expected: 8
              </span>
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <div>
                <span className="text-3xl font-black text-slate-900">{returnedGlasses}</span>
                <span className="text-xs text-slate-400 font-medium ml-1">returned</span>
              </div>
              <span className={cn(
                "text-xs font-bold px-2 py-0.5 rounded-md",
                returnedGlasses === 8 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
              )}>
                {returnedGlasses === 8 ? '✓ Reconciled' : `${8 - returnedGlasses} Shortage`}
              </span>
            </div>

            {currentStatus === 'COLLECTING' && (
              <div className="pt-2 border-t border-slate-100">
                <label className="text-[11px] font-bold text-slate-500 block mb-1">
                  Adjust Physical Returned Count:
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setReturnedGlasses(Math.max(0, returnedGlasses - 1))}
                    className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-slate-700"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={0}
                    max={12}
                    value={returnedGlasses}
                    onChange={(e) => setReturnedGlasses(parseInt(e.target.value) || 0)}
                    className="w-16 text-center font-black text-sm bg-slate-50 border border-slate-200 rounded-lg py-1"
                  />
                  <button
                    onClick={() => setReturnedGlasses(Math.min(12, returnedGlasses + 1))}
                    className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-slate-700"
                  >
                    +
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Water Jug Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase">Water Jug</span>
              <span className="text-xs font-black bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md">
                Expected: 1
              </span>
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <div>
                <span className="text-3xl font-black text-slate-900">{returnedJugs}</span>
                <span className="text-xs text-slate-400 font-medium ml-1">returned</span>
              </div>
              <span className={cn(
                "text-xs font-bold px-2 py-0.5 rounded-md",
                returnedJugs === 1 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
              )}>
                {returnedJugs === 1 ? '✓ Reconciled' : `${1 - returnedJugs} Shortage`}
              </span>
            </div>

            {currentStatus === 'COLLECTING' && (
              <div className="pt-2 border-t border-slate-100">
                <label className="text-[11px] font-bold text-slate-500 block mb-1">
                  Adjust Physical Returned Count:
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setReturnedJugs(Math.max(0, returnedJugs - 1))}
                    className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-slate-700"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={0}
                    max={3}
                    value={returnedJugs}
                    onChange={(e) => setReturnedJugs(parseInt(e.target.value) || 0)}
                    className="w-16 text-center font-black text-sm bg-slate-50 border border-slate-200 rounded-lg py-1"
                  />
                  <button
                    onClick={() => setReturnedJugs(Math.min(3, returnedJugs + 1))}
                    className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-slate-700"
                  >
                    +
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Discrepancy Ledger for Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Discrepancy &amp; Recovery Audit History
              </h2>
            </div>
            <Button
              onClick={() => setIsDiscrepancyModalOpen(true)}
              variant="outline"
              className="text-xs font-bold text-amber-900 bg-amber-50 border-amber-200 hover:bg-amber-100"
            >
              Report Discrepancy
            </Button>
          </div>

          {discrepancies.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-2">
              No discrepancies logged for Table {table?.table_number}. All expected utensils are present and reconciled.
            </p>
          ) : (
            <div className="space-y-2">
              {discrepancies.map((d) => (
                <div
                  key={d.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">
                        {d.quantity}x {d.utensil_type?.name}
                      </span>
                      <Badge className="text-[10px] font-bold">
                        {d.status}
                      </Badge>
                      {d.current_table && (
                        <span className="text-amber-800 font-bold text-[11px] bg-amber-100 px-2 py-0.5 rounded-md">
                          Found at Table {d.current_table.table_number}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-600 mt-1">{d.resolution_note || 'Logged during meal operational audit'}</p>
                    <span className="text-[10px] text-slate-400">
                      Reported: {d.reported_at?.split('T')[0]} at {d.reported_at?.split('T')[1]?.substring(0, 5)}
                    </span>
                  </div>

                  {d.status !== 'RECOVERED' && (
                    <Button
                      onClick={() => setIsRecoveryModalOpen(true)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shrink-0"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1" />
                      Mark Recovered
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Immutable Operational Audit Log (PRD Section 30) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Immutable Shelf Operations Ledger (utensil_events)
            </h2>
          </div>

          {events.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-2">No event records available.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Operational Event</th>
                    <th className="py-2.5 px-3">Quantity</th>
                    <th className="py-2.5 px-3">Performed By</th>
                    <th className="py-2.5 px-3">Metadata &amp; Context</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {events.map((ev) => (
                    <tr key={ev.id} className="hover:bg-slate-50/60">
                      <td className="py-2 px-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {ev.performed_at?.split('T')[1]?.substring(0, 5) || '08:00 AM'}
                      </td>
                      <td className="py-2 px-3 font-bold text-slate-900 whitespace-nowrap">
                        <span className={cn(
                          "px-2 py-0.5 rounded-md text-[10px] font-black",
                          ev.event_type === 'SHELF_OPENED' ? "bg-blue-100 text-blue-800" :
                          ev.event_type === 'SHELF_CLOSED' ? "bg-emerald-100 text-emerald-800" :
                          ev.event_type === 'DISCREPANCY_REPORTED' ? "bg-rose-100 text-rose-800" :
                          ev.event_type === 'ITEM_RECOVERED' ? "bg-indigo-100 text-indigo-800" :
                          ev.event_type === 'SUPERVISOR_OVERRIDE' ? "bg-purple-100 text-purple-800" :
                          "bg-slate-100 text-slate-700"
                        )}>
                          {ev.event_type}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-700 font-bold whitespace-nowrap">
                        {ev.quantity || '-'}
                      </td>
                      <td className="py-2 px-3 text-slate-800 font-medium whitespace-nowrap">
                        {ev.performed_by || 'Duty Supplier'}
                      </td>
                      <td className="py-2 px-3 text-slate-600 max-w-sm truncate">
                        {ev.metadata ? JSON.stringify(ev.metadata) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <CrossTableRecoveryModal
        isOpen={isRecoveryModalOpen}
        onClose={() => setIsRecoveryModalOpen(false)}
        onSuccess={loadData}
        defaultOriginTable={table?.table_number || 31}
        defaultFoundAtTable={32}
      />

      <ReportDiscrepancyModal
        isOpen={isDiscrepancyModalOpen}
        onClose={() => setIsDiscrepancyModalOpen(false)}
        onSuccess={loadData}
        tables={allTables}
        defaultTableId={tableId}
      />

      <SupervisorOverrideModal
        isOpen={isOverrideModalOpen}
        onClose={() => setIsOverrideModalOpen(false)}
        onSuccess={loadData}
        tableId={tableId}
        tableNumber={table?.table_number || 31}
      />
    </div>
  );
}
