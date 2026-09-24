'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getUtensilProvider } from '@/lib/utensils/provider';
import { getTableProvider } from '@/lib/tables/provider';
import { 
  UtensilTableSummary, 
  ShelfOperationStatus,
  DiningTable 
} from '@/types/database';
import { UtensilsSubnav } from '@/components/admin/utensils-subnav';
import { CrossTableRecoveryModal } from '@/components/admin/cross-table-recovery-modal';
import { ReportDiscrepancyModal } from '@/components/admin/report-discrepancy-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Layers, 
  Search, 
  CheckCircle2, 
  Clock, 
  DoorOpen, 
  AlertTriangle,
  ArrowRight,
  Filter,
  RefreshCw,
  RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export default function UtensilOperationsPage() {
  const [summaries, setSummaries] = useState<UtensilTableSummary[]>([]);
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedArea, setSelectedArea] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);
  const [isDiscrepancyModalOpen, setIsDiscrepancyModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const utensilProvider = getUtensilProvider();
      const tableProvider = getTableProvider();

      const [sumData, allTables] = await Promise.all([
        utensilProvider.getTableSummaries(),
        tableProvider.getTables(),
      ]);

      setSummaries(sumData);
      setTables(allTables);
    } catch (err) {
      console.error('Failed to load utensil operations', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const areas = Array.from(new Set(summaries.map((s) => s.area_name)));

  const filtered = summaries.filter((s) => {
    const matchesSearch =
      s.table_number.toString().includes(searchQuery) ||
      s.primary_supplier_name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      selectedStatus === 'ALL'
        ? true
        : selectedStatus === 'DISCREPANCY'
        ? s.has_discrepancy || s.shelf_status === 'DISCREPANCY'
        : s.shelf_status === selectedStatus;

    const matchesArea = selectedArea === 'ALL' ? true : s.area_name === selectedArea;

    return matchesSearch && matchesStatus && matchesArea;
  });

  const getStatusBadge = (status: ShelfOperationStatus, hasDiscrepancy: boolean) => {
    if (hasDiscrepancy || status === 'DISCREPANCY') {
      return (
        <Badge className="bg-rose-100 text-rose-800 border-rose-200 font-extrabold text-[11px]">
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
            Locked
          </Badge>
        );
      case 'OPENED':
        return (
          <Badge className="bg-blue-50 text-blue-800 border-blue-200 font-bold text-[11px]">
            <DoorOpen className="w-3 h-3 mr-1 text-blue-600" />
            Opened
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
      <UtensilsSubnav
        onOpenRecoveryModal={() => setIsRecoveryModalOpen(true)}
        onOpenDiscrepancyModal={() => setIsDiscrepancyModalOpen(true)}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                PRD Section 21 • Shelf Operations Board
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 mt-1">
              <Layers className="w-6 h-6 text-indigo-600" />
              Live Utensil Operations Board
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Track shelf state transitions in real time across the Darul Huda dining hall.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsRecoveryModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Found Item (Cross-Table)
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

        {/* Filters Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search table # or supplier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:bg-white focus:outline-indigo-600 font-medium"
            />
          </div>

          <div className="flex items-center gap-3 overflow-x-auto">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-bold text-slate-500 uppercase text-[10px]">Area:</span>
              <select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-800"
              >
                <option value="ALL">All Areas</option>
                {areas.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-500 uppercase text-[10px]">State:</span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-800"
              >
                <option value="ALL">All States</option>
                <option value="LOCKED">LOCKED (Verified)</option>
                <option value="OPENED">OPENED</option>
                <option value="DISTRIBUTING">DISTRIBUTING</option>
                <option value="COLLECTING">COLLECTING</option>
                <option value="VERIFYING">VERIFYING</option>
                <option value="DISCREPANCY">DISCREPANCY (Unresolved)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Operations Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Table</th>
                  <th className="py-3 px-4">Dining Area</th>
                  <th className="py-3 px-4">Meal</th>
                  <th className="py-3 px-4">Duty Supplier</th>
                  <th className="py-3 px-4">Shelf State</th>
                  <th className="py-3 px-4 text-center">Expected (P/G/J)</th>
                  <th className="py-3 px-4 text-center">Returned (P/G/J)</th>
                  <th className="py-3 px-4 text-center">Discrepancy</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      Loading operations ledger...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      No operational sessions match the filter criteria.
                    </td>
                  </tr>
                ) : (
                  filtered.map((s) => (
                    <tr
                      key={s.table_id}
                      className={cn(
                        "hover:bg-slate-50/80 transition-colors",
                        s.has_discrepancy && "bg-rose-50/20"
                      )}
                    >
                      <td className="py-3 px-4 font-black text-slate-900 whitespace-nowrap">
                        Table {s.table_number}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium whitespace-nowrap">
                        {s.area_name}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-bold text-slate-800">Breakfast</span>
                        <span className="text-[10px] text-slate-400 block">Today</span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-bold text-slate-900 block">{s.primary_supplier_name}</span>
                        {s.backup_supplier_name && (
                          <span className="text-[10px] text-slate-400">Standby: {s.backup_supplier_name}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getStatusBadge(s.shelf_status, s.has_discrepancy)}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-700 whitespace-nowrap">
                        {s.expected_plates} / {s.expected_glasses} / {s.expected_jugs}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-900 whitespace-nowrap">
                        {s.returned_plates} / {s.returned_glasses} / {s.returned_jugs}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {s.unresolved_count > 0 ? (
                          <Badge className="bg-rose-100 text-rose-800 border-rose-200 font-extrabold text-[10px]">
                            {s.unresolved_count} Unresolved
                          </Badge>
                        ) : (
                          <span className="text-emerald-600 font-bold text-xs">0 (All Reconciled)</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <Link
                          href={`/admin/utensils/${s.table_id}`}
                          className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 py-1 px-2.5 rounded-lg transition-colors"
                        >
                          <span>Manage</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

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
