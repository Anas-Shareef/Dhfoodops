'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getUtensilProvider } from '@/lib/utensils/provider';
import { getTableProvider } from '@/lib/tables/provider';
import { 
  UtensilTableSummary, 
  UtensilDashboardStats, 
  DiningTable, 
  ShelfOperationStatus 
} from '@/types/database';
import { UtensilsSubnav } from '@/components/admin/utensils-subnav';
import { CrossTableRecoveryModal } from '@/components/admin/cross-table-recovery-modal';
import { ReportDiscrepancyModal } from '@/components/admin/report-discrepancy-modal';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Search, 
  CheckCircle2, 
  Clock, 
  DoorOpen, 
  RotateCcw,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Wine,
  FolderOpen
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export default function UtensilDashboardPage() {
  const [stats, setStats] = useState<UtensilDashboardStats | null>(null);
  const [summaries, setSummaries] = useState<UtensilTableSummary[]>([]);
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals state
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);
  const [isDiscrepancyModalOpen, setIsDiscrepancyModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const utensilProvider = getUtensilProvider();
      const tableProvider = getTableProvider();

      const [statsData, summariesData, allTables] = await Promise.all([
        utensilProvider.getDashboardStats(),
        utensilProvider.getTableSummaries(),
        tableProvider.getTables(),
      ]);

      setStats(statsData);
      setSummaries(summariesData);
      setTables(allTables);
    } catch (err) {
      console.error('Failed to load utensil dashboard data', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredSummaries = summaries.filter((s) => {
    const matchesSearch =
      s.table_number.toString().includes(searchQuery) ||
      s.area_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.primary_supplier_name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'DISCREPANCY'
        ? s.has_discrepancy || s.shelf_status === 'DISCREPANCY'
        : statusFilter === 'OPEN'
        ? s.shelf_status !== 'LOCKED'
        : s.shelf_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: ShelfOperationStatus, hasDiscrepancy: boolean) => {
    if (hasDiscrepancy || status === 'DISCREPANCY') {
      return (
        <Badge className="bg-rose-100 text-rose-800 border-rose-200 font-extrabold text-[11px] animate-pulse">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Discrepancy
        </Badge>
      );
    }

    switch (status) {
      case 'LOCKED':
        return (
          <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 font-bold text-[11px]">
            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
            Locked &amp; Verified
          </Badge>
        );
      case 'OPENED':
        return (
          <Badge className="bg-blue-50 text-blue-800 border-blue-200 font-bold text-[11px]">
            <DoorOpen className="w-3 h-3 mr-1 text-blue-600" />
            Shelf Open
          </Badge>
        );
      case 'DISTRIBUTING':
        return (
          <Badge className="bg-indigo-50 text-indigo-800 border-indigo-200 font-bold text-[11px]">
            <Clock className="w-3 h-3 mr-1 text-indigo-600" />
            Distributing
          </Badge>
        );
      case 'COLLECTING':
        return (
          <Badge className="bg-amber-50 text-amber-800 border-amber-200 font-bold text-[11px]">
            <Clock className="w-3 h-3 mr-1 text-amber-600" />
            Collecting
          </Badge>
        );
      case 'VERIFYING':
        return (
          <Badge className="bg-purple-50 text-purple-800 border-purple-200 font-bold text-[11px]">
            <RefreshCw className="w-3 h-3 mr-1 text-purple-600 animate-spin" />
            Verifying
          </Badge>
        );
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Subnavigation */}
      <UtensilsSubnav
        onOpenRecoveryModal={() => setIsRecoveryModalOpen(true)}
        onOpenDiscrepancyModal={() => setIsDiscrepancyModalOpen(true)}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header with Title and Quick Summary */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                Phase 5 • Table Utensil Accountability
              </span>
              <span className="text-xs text-slate-400 font-medium">Standard 8 Plates • 8 Glasses • 1 Jug</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5 mt-1.5">
              <ShieldCheck className="w-7 h-7 text-indigo-600" />
              Dining Utensil Accountability Dashboard
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Real-time shelf reconciliation from opening through collection and verification. Physical tableware marked with table numbers.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => setIsRecoveryModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Cross-Table Recovery
            </Button>
            <Button
              variant="outline"
              onClick={loadData}
              className="text-slate-600 hover:text-slate-900 text-xs font-semibold"
            >
              <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", isLoading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Top KPI Cards (PRD Section 19 & 38) */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 block uppercase">Total Tables</span>
              <span className="text-xl font-black text-slate-900 mt-0.5 block">{stats.total_tables}</span>
              <span className="text-[10px] text-slate-400 font-medium">Active Dining Hall</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-emerald-600 block uppercase">Verified</span>
              <span className="text-xl font-black text-emerald-700 mt-0.5 block">{stats.tables_verified}</span>
              <span className="text-[10px] text-emerald-600 font-medium">Reconciled / Locked</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-blue-600 block uppercase">Tables Open</span>
              <span className="text-xl font-black text-blue-700 mt-0.5 block">{stats.tables_open}</span>
              <span className="text-[10px] text-blue-500 font-medium">In Service / Active</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-rose-600 block uppercase">Discrepancies</span>
              <span className="text-xl font-black text-rose-700 mt-0.5 block">{stats.tables_with_discrepancies}</span>
              <span className="text-[10px] text-rose-500 font-medium">Requires Resolution</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-amber-600 block uppercase">Misplaced</span>
              <span className="text-xl font-black text-amber-700 mt-0.5 block">{stats.misplaced_items}</span>
              <span className="text-[10px] text-amber-500 font-medium">Neighbouring Tables</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-rose-600 block uppercase">Missing</span>
              <span className="text-xl font-black text-rose-700 mt-0.5 block">{stats.missing_items}</span>
              <span className="text-[10px] text-rose-500 font-medium">Search In Progress</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-purple-600 block uppercase">Damaged / Broke</span>
              <span className="text-xl font-black text-purple-700 mt-0.5 block">{stats.damaged_items + stats.broken_items}</span>
              <span className="text-[10px] text-purple-500 font-medium">Physical Loss</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-indigo-600 block uppercase">Recovered</span>
              <span className="text-xl font-black text-indigo-700 mt-0.5 block">{stats.recovered_items}</span>
              <span className="text-[10px] text-indigo-500 font-medium">Returned Today</span>
            </div>
          </div>
        )}

        {/* Section 41 Seed Demo Scenario Showcase Banner */}
        <div className="bg-linear-to-r from-indigo-900 to-slate-900 rounded-2xl p-5 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge className="bg-amber-400 text-slate-950 font-black text-[10px]">
                PRD Section 41 Demo Flow
              </Badge>
              <span className="text-xs text-indigo-200">Table 31 • Ijas K (Primary) • Ahmed K (Backup)</span>
            </div>
            <h2 className="text-base font-bold tracking-tight">
              Table 31 Demo Scenario: 8 Plates, 8 Glasses, 1 Jug
            </h2>
            <p className="text-xs text-indigo-100/80 leading-relaxed max-w-2xl">
              1 glass unreturned during collection → Stamped &quot;31&quot; identified at Table 32 (<span className="text-amber-300 font-bold">MISPLACED</span>) → Safely returned to Table 31 shelf (<span className="text-emerald-300 font-bold">RECOVERED</span>) → Verification verified &amp; locked.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/admin/utensils/t-31"
              className="px-4 py-2 rounded-xl bg-white text-slate-950 hover:bg-indigo-50 text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              <span>Inspect Table 31 Ledger</span>
              <ArrowRight className="w-3.5 h-3.5 text-indigo-600" />
            </Link>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by table number, area, or supplier name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-indigo-600 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Filter:</span>
            {[
              { id: 'ALL', label: 'All Tables' },
              { id: 'DISCREPANCY', label: 'Discrepancies' },
              { id: 'OPEN', label: 'In Operation' },
              { id: 'LOCKED', label: 'Locked & Verified' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={cn(
                  'px-3 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap',
                  statusFilter === f.id
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Utensil Table Grid */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wine className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Dining Hall Table Inventory Matrix
              </h2>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              Showing {filteredSummaries.length} of {summaries.length} Tables
            </span>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-400 font-semibold">
              Loading table utensil ledger...
            </div>
          ) : filteredSummaries.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 font-medium">
              No dining tables matching query.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Table</th>
                    <th className="py-3 px-4">Area</th>
                    <th className="py-3 px-4">Active Supplier</th>
                    <th className="py-3 px-4">Shelf Status</th>
                    <th className="py-3 px-4 text-center">Plates (Ret / Exp)</th>
                    <th className="py-3 px-4 text-center">Glasses (Ret / Exp)</th>
                    <th className="py-3 px-4 text-center">Jug (Ret / Exp)</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSummaries.map((summary) => (
                    <tr
                      key={summary.table_id}
                      className={cn(
                        "hover:bg-slate-50/80 transition-colors",
                        summary.has_discrepancy && "bg-rose-50/30"
                      )}
                    >
                      <td className="py-3 px-4 font-black text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xs">
                            {summary.table_number}
                          </span>
                          <span>Table {summary.table_number}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-600 font-medium whitespace-nowrap">
                        {summary.area_name}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{summary.primary_supplier_name}</div>
                        {summary.backup_supplier_name && (
                          <div className="text-[10px] text-slate-400">Backup: {summary.backup_supplier_name}</div>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {getStatusBadge(summary.shelf_status, summary.has_discrepancy)}
                      </td>

                      {/* Plates Count */}
                      <td className="py-3 px-4 text-center font-bold">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-md",
                            summary.returned_plates < summary.expected_plates
                              ? "bg-rose-100 text-rose-800"
                              : "text-slate-800"
                          )}
                        >
                          {summary.returned_plates} / {summary.expected_plates}
                        </span>
                      </td>

                      {/* Glasses Count */}
                      <td className="py-3 px-4 text-center font-bold">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-md",
                            summary.returned_glasses < summary.expected_glasses
                              ? "bg-rose-100 text-rose-800"
                              : "text-slate-800"
                          )}
                        >
                          {summary.returned_glasses} / {summary.expected_glasses}
                        </span>
                      </td>

                      {/* Jugs Count */}
                      <td className="py-3 px-4 text-center font-bold">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-md",
                            summary.returned_jugs < summary.expected_jugs
                              ? "bg-rose-100 text-rose-800"
                              : "text-slate-800"
                          )}
                        >
                          {summary.returned_jugs} / {summary.expected_jugs}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <Link
                          href={`/admin/utensils/${summary.table_id}`}
                          className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 py-1 px-2.5 rounded-lg transition-colors"
                        >
                          <span>Manage Shelf</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Global Modals */}
      <CrossTableRecoveryModal
        isOpen={isRecoveryModalOpen}
        onClose={() => setIsRecoveryModalOpen(false)}
        onSuccess={() => {
          loadData();
        }}
      />

      <ReportDiscrepancyModal
        isOpen={isDiscrepancyModalOpen}
        onClose={() => setIsDiscrepancyModalOpen(false)}
        onSuccess={() => {
          loadData();
        }}
        tables={tables}
      />
    </div>
  );
}
