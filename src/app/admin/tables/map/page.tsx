'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getTableProvider } from '@/lib/tables/provider';
import { DiningArea, DiningTable, TableMemberDetail } from '@/types/database';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { 
  Map, 
  ArrowLeft, 
  RefreshCw, 
  Armchair, 
  Users, 
  Eye, 
  ArrowRight,
  School,
  CheckCircle2
} from 'lucide-react';

export default function VisualTableMapPage() {
  const [areas, setAreas] = useState<DiningArea[]>([]);
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<string>('');
  const [inspectedTable, setInspectedTable] = useState<DiningTable | null>(null);
  const [tableMembers, setTableMembers] = useState<TableMemberDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const provider = getTableProvider();
    const [areaList, tableList] = await Promise.all([
      provider.getDiningAreas(),
      provider.getTables(),
    ]);

    setAreas(areaList);
    setTables(tableList);

    if (!selectedAreaId && areaList[0]) {
      setSelectedAreaId(areaList[0].id);
    }

    setIsLoading(false);
  }, [selectedAreaId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleInspectTable = async (table: DiningTable) => {
    setInspectedTable(table);
    const provider = getTableProvider();
    const members = await provider.getTableMembers(table.id);
    setTableMembers(members);
  };

  const activeArea = areas.find((a) => a.id === selectedAreaId) || areas[0];
  const areaTables = tables.filter((t) => t.dining_area_id === (activeArea?.id ?? ''));

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <Link href="/admin/tables">
            <Button variant="outline" size="sm" className="p-2.5">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Map className="w-6 h-6 text-indigo-600" />
              Dining Hall Visual Seating Map
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Interactive physical floor layout and real-time table capacity visualizer
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/admin/tables/seating">
            <Button variant="outline" size="sm">
              Rearrangement Hub
            </Button>
          </Link>

          <Button variant="outline" size="sm" onClick={loadData} isLoading={isLoading}>
            <RefreshCw className="w-4 h-4 mr-1.5" />
            Refresh Map
          </Button>
        </div>
      </div>

      {/* Area & Floor Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
        {areas.map((area) => (
          <button
            key={area.id}
            onClick={() => setSelectedAreaId(area.id)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedAreaId === area.id
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {area.name} ({area.floor})
          </button>
        ))}
      </div>

      {/* Map Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs font-semibold p-3 bg-white rounded-xl border border-slate-200">
        <span className="text-slate-500 uppercase tracking-wider text-[11px]">Map Legend:</span>
        <div className="flex items-center gap-1.5 text-slate-700">
          <span className="w-3.5 h-3.5 rounded-md bg-emerald-600" />
          <span>Full Capacity (8/8)</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-700">
          <span className="w-3.5 h-3.5 rounded-md bg-sky-500" />
          <span>Seats Available</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-700">
          <span className="w-3.5 h-3.5 rounded-md bg-amber-500" />
          <span>Reserved</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-700">
          <span className="w-3.5 h-3.5 rounded-md bg-slate-300" />
          <span>Inactive / Maintenance</span>
        </div>
      </div>

      {/* Visual Hall Layout Grid (PRD Section 8) */}
      <div className="p-8 bg-slate-100 rounded-3xl border border-slate-300 shadow-inner">
        <div className="text-center mb-6">
          <span className="text-xs font-black tracking-widest text-slate-400 uppercase">
            {activeArea?.floor} — {activeArea?.section}
          </span>
          <div className="w-24 h-1 bg-slate-300 rounded-full mx-auto mt-1" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {areaTables.map((t) => {
            const current = t.current_members_count ?? 0;
            const isFull = current >= t.capacity;
            const available = Math.max(0, t.capacity - current);

            const cardBorder =
              t.status !== 'Active'
                ? 'border-slate-300 bg-slate-200/80 text-slate-500'
                : isFull
                ? 'border-emerald-500 bg-emerald-50/60 hover:bg-emerald-50'
                : 'border-sky-400 bg-white hover:border-sky-500';

            return (
              <div
                key={t.id}
                onClick={() => handleInspectTable(t)}
                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer shadow-xs hover:shadow-lg flex flex-col justify-between group ${cardBorder}`}
              >
                <div className="flex items-start justify-between">
                  <span className="text-2xl font-black tracking-tight text-slate-900">
                    TABLE {t.table_number}
                  </span>
                  <Badge
                    size="sm"
                    variant={
                      t.status !== 'Active'
                        ? 'neutral'
                        : isFull
                        ? 'attending'
                        : 'info'
                    }
                  >
                    {t.status !== 'Active' ? t.status : `${current} / ${t.capacity}`}
                  </Badge>
                </div>

                {/* Chairs visual indicator (8 chairs) */}
                <div className="grid grid-cols-4 gap-1.5 my-4">
                  {Array.from({ length: t.capacity }).map((_, idx) => {
                    const isOccupied = idx < current;
                    return (
                      <div
                        key={idx}
                        className={`h-4 rounded-md transition-colors ${
                          isOccupied ? 'bg-slate-900' : 'bg-slate-200 border border-slate-300'
                        }`}
                        title={isOccupied ? `Seat ${idx + 1}: Occupied` : `Seat ${idx + 1}: Available`}
                      />
                    );
                  })}
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200/60 text-slate-600 font-semibold">
                  <span>{isFull ? 'Full' : `${available} Available`}</span>
                  <span className="text-indigo-600 group-hover:underline flex items-center gap-0.5">
                    Inspect <Eye className="w-3.5 h-3.5 ml-0.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Table Inspection Modal */}
      {inspectedTable && (
        <Modal
          isOpen={Boolean(inspectedTable)}
          onClose={() => setInspectedTable(null)}
          title={`Table ${inspectedTable.table_number} • ${inspectedTable.dining_area?.name}`}
          description={`Capacity: ${inspectedTable.capacity} students • Floor: ${inspectedTable.dining_area?.floor}`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <span className="text-slate-600 font-medium">Occupancy:</span>
              <span className="font-extrabold text-slate-900">
                {tableMembers.length} / {inspectedTable.capacity} Seats Filled
              </span>
            </div>

            {/* Members List */}
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="p-3">Enrollment</th>
                    <th className="p-3">Student Name</th>
                    <th className="p-3">Department</th>
                    <th className="p-3">Year</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tableMembers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-slate-500">
                        No students currently assigned to this table.
                      </td>
                    </tr>
                  ) : (
                    tableMembers.map((m) => (
                      <tr key={m.student_id}>
                        <td className="p-3 font-mono font-bold text-slate-700">{m.enrollment_no}</td>
                        <td className="p-3 font-extrabold text-slate-900">{m.name}</td>
                        <td className="p-3 font-bold text-sky-800">{m.department_code}</td>
                        <td className="p-3 text-slate-600">Year {m.year}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <Link href={`/admin/tables/${inspectedTable.id}`}>
                <Button variant="primary" size="sm">
                  Open Full Table Page
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </Link>

              <Button variant="secondary" size="sm" onClick={() => setInspectedTable(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
