'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getTableProvider } from '@/lib/tables/provider';
import { DiningArea, DiningTable, TableOverviewStats } from '@/types/database';
import { TableCard } from '@/components/admin/table-card';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Utensils, 
  Map, 
  ArrowLeftRight, 
  RefreshCw, 
  Filter, 
  Users, 
  CheckCircle2, 
  AlertCircle,
  Armchair
} from 'lucide-react';

export default function AdminTablesDirectoryPage() {
  const [areas, setAreas] = useState<DiningArea[]>([]);
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [stats, setStats] = useState<TableOverviewStats | null>(null);
  const [selectedAreaId, setSelectedAreaId] = useState<string>('all');
  const [selectedFloor, setSelectedFloor] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const provider = getTableProvider();
    const [areaList, tableList, statsData] = await Promise.all([
      provider.getDiningAreas(),
      provider.getTables(selectedAreaId !== 'all' ? selectedAreaId : undefined),
      provider.getTableOverviewStats(),
    ]);

    setAreas(areaList);
    setTables(tableList);
    setStats(statsData);
    setIsLoading(false);
  }, [selectedAreaId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredTables = tables.filter((t) => {
    if (selectedFloor !== 'all' && t.dining_area?.floor !== selectedFloor) return false;
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* 1. Header with Quick Map and Rearrangement Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block">
            Phase 2 • Seating &amp; Tables
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 mt-0.5">
            <Utensils className="w-6 h-6 text-indigo-600" />
            Dining Hall Tables &amp; Seating Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Physical table mapping, capacity tracking, and student assignment structure
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/admin/tables/map">
            <Button variant="outline" size="sm" className="font-bold">
              <Map className="w-4 h-4 mr-1.5 text-indigo-600" />
              Visual Table Map
            </Button>
          </Link>

          <Link href="/admin/tables/seating">
            <Button variant="primary" size="sm" className="font-bold">
              <ArrowLeftRight className="w-4 h-4 mr-1.5" />
              Rearrangement Hub
            </Button>
          </Link>

          <Button variant="ghost" size="sm" onClick={loadData} isLoading={isLoading}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 2. Overview KPI Summary Cards (PRD Section 22) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <Card className="p-4 border-slate-200">
          <span className="text-xs font-semibold text-slate-500 block">Total Tables</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">
            {stats?.total_tables ?? 24}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Configured physical tables</span>
        </Card>

        <Card className="p-4 border-slate-200">
          <span className="text-xs font-semibold text-slate-500 block">Active Tables</span>
          <span className="text-2xl font-black text-indigo-600 mt-1 block">
            {stats?.active_tables ?? 22}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">In daily dining rotation</span>
        </Card>

        <Card className="p-4 border-slate-200">
          <span className="text-xs font-semibold text-slate-500 block">Full Tables (8/8)</span>
          <span className="text-2xl font-black text-emerald-600 mt-1 block">
            {stats?.full_tables ?? 18}
          </span>
          <span className="text-[10px] text-emerald-700 font-medium mt-0.5 block">100% capacity filled</span>
        </Card>

        <Card className="p-4 border-slate-200">
          <span className="text-xs font-semibold text-slate-500 block">Available Seats</span>
          <span className="text-2xl font-black text-sky-600 mt-1 block">
            {stats?.available_seats ?? 12}
          </span>
          <span className="text-[10px] text-sky-700 font-medium mt-0.5 block">Ready for student moves</span>
        </Card>

        <Card className="p-4 border-slate-200 col-span-2 sm:col-span-1">
          <span className="text-xs font-semibold text-slate-500 block">Unassigned Students</span>
          <span className="text-2xl font-black text-amber-600 mt-1 block">
            {stats?.unassigned_students ?? 4}
          </span>
          <span className="text-[10px] text-amber-700 font-medium mt-0.5 block">Awaiting table allocation</span>
        </Card>
      </div>

      {/* 3. Filter Controls */}
      <Card className="p-4 bg-slate-50 border-slate-200">
        <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-700">
          <div className="flex items-center gap-1.5 font-bold text-slate-900">
            <Filter className="w-4 h-4 text-slate-500" />
            Filter Dining Area:
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="area-filter">Area:</label>
            <select
              id="area-filter"
              value={selectedAreaId}
              onChange={(e) => setSelectedAreaId(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:border-indigo-600 outline-none"
            >
              <option value="all">All Dining Areas</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.floor})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="floor-filter">Floor:</label>
            <select
              id="floor-filter"
              value={selectedFloor}
              onChange={(e) => setSelectedFloor(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:border-indigo-600 outline-none"
            >
              <option value="all">All Floors</option>
              <option value="First Floor">First Floor</option>
              <option value="Ground Floor">Ground Floor</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="status-filter">Status:</label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:border-indigo-600 outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Reserved">Reserved</option>
              <option value="Inactive">Inactive</option>
              <option value="Maintenance">Maintenance</option>
            </select>
          </div>
        </div>
      </Card>

      {/* 4. Tables Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Tables ({filteredTables.length})
          </h2>
          <span className="text-xs text-slate-500">
            Click &ldquo;View Table Roster&rdquo; on any table to view assigned members and attendance
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {filteredTables.map((table) => (
            <TableCard key={table.id} table={table} />
          ))}
        </div>
      </div>
    </div>
  );
}
