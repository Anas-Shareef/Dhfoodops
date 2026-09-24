'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupplierProvider } from '@/lib/suppliers/provider';
import { getTableProvider } from '@/lib/tables/provider';
import {
  SupplierPool,
  SupplierRotationRule,
  SupplierDutyPeriod,
  DiningArea
} from '@/types/database';
import { GeneratedScheduleResult } from '@/lib/suppliers/generator';
import { SupplierSubnav } from '@/components/admin/supplier-subnav';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils/cn';
import {
  Wand2,
  CheckCircle2,
  AlertTriangle,
  Users,
  Calendar,
  Building,
  RefreshCw,
  Sparkles,
  Info,
  Check
} from 'lucide-react';

export default function SupplierScheduleGeneratorPage() {
  const router = useRouter();
  const toast = useToast();

  const [areas, setAreas] = useState<DiningArea[]>([]);
  const [dutyPeriods, setDutyPeriods] = useState<SupplierDutyPeriod[]>([]);
  const [pools, setPools] = useState<SupplierPool[]>([]);
  const [rules, setRules] = useState<SupplierRotationRule[]>([]);

  // Form selections
  const [selectedAreaId, setSelectedAreaId] = useState<string>('');
  const [selectedDutyPeriodId, setSelectedDutyPeriodId] = useState<string>('');
  const [selectedPoolId, setSelectedPoolId] = useState<string>('');
  const [selectedRuleId, setSelectedRuleId] = useState<string>('');

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Preview Result
  const [previewResult, setPreviewResult] = useState<GeneratedScheduleResult | null>(null);

  // Load initial options
  useEffect(() => {
    async function loadData() {
      const tableProvider = getTableProvider();
      const supplierProvider = getSupplierProvider();

      const [allAreas, periods, allPools, allRules] = await Promise.all([
        tableProvider.getDiningAreas(),
        supplierProvider.getDutyPeriods(),
        supplierProvider.getSupplierPools(),
        supplierProvider.getRotationRules(),
      ]);

      setAreas(allAreas);
      setDutyPeriods(periods);
      setPools(allPools);
      setRules(allRules);

      if (allAreas.length > 0) {
        const preferred = allAreas.find((a: DiningArea) => a.name.includes('First Floor CHS')) || allAreas[0];
        setSelectedAreaId(preferred.id);
      }
      if (periods.length > 0) {
        setSelectedDutyPeriodId(periods[0].id);
      }
      if (allPools.length > 0) {
        setSelectedPoolId(allPools[0].id);
      }
      if (allRules.length > 0) {
        setSelectedRuleId(allRules[0].id);
      }
    }
    loadData();
  }, []);

  // Update pool when area changes
  useEffect(() => {
    if (!selectedAreaId || pools.length === 0) return;
    const matchingPool = pools.find((p) => p.dining_area_id === selectedAreaId);
    if (matchingPool) {
      setSelectedPoolId(matchingPool.id);
    }
  }, [selectedAreaId, pools]);

  // Generate preview
  const handleGeneratePreview = async () => {
    if (!selectedDutyPeriodId || !selectedAreaId || !selectedPoolId || !selectedRuleId) {
      toast.error('Please configure all generation parameters before running.');
      return;
    }

    setIsGenerating(true);
    setPreviewResult(null);

    try {
      const supplierProvider = getSupplierProvider();
      const result = await supplierProvider.previewGeneratedSchedule({
        dutyPeriodId: selectedDutyPeriodId,
        areaId: selectedAreaId,
        poolId: selectedPoolId,
        rotationRuleId: selectedRuleId,
      });

      setPreviewResult(result);
      if (result.conflicts.length > 0) {
        toast.info(
          `Schedule preview generated with ${result.conflicts.length} conflict(s). Review before publishing.`
        );
      } else {
        toast.success(`✓ Generated clean preview for ${result.summary.totalTables} tables!`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Publish Schedule
  const handlePublishSchedule = async () => {
    if (!previewResult) return;
    setIsPublishing(true);

    try {
      const supplierProvider = getSupplierProvider();
      const res = await supplierProvider.publishGeneratedSchedule(
        previewResult,
        'a0000000-0000-0000-0000-000000000001'
      );

      if (res.success) {
        toast.success(
          `✓ Success! Published ${previewResult.assignments.length} table supplier assignments for the duty period.`
        );
        router.push('/admin/suppliers/schedule');
      } else {
        toast.error(res.error || 'Failed to publish schedule.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Publishing error.');
    } finally {
      setIsPublishing(false);
    }
  };

  const selectedArea = areas.find((a) => a.id === selectedAreaId);
  const selectedPool = pools.find((p) => p.id === selectedPoolId);
  const selectedPeriod = dutyPeriods.find((p) => p.id === selectedDutyPeriodId);
  const selectedRule = rules.find((r) => r.id === selectedRuleId);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <Wand2 className="w-5 h-5 text-indigo-600" />
            </span>
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
              Automated Scheduling Engine
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">
            Supplier Pool Schedule Generator
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Automatically calculate conflict-free primary and standby backup supplier rotations with
            audit previews before publishing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/suppliers/schedule">
            <Button variant="outline" size="sm" className="text-xs font-semibold gap-1">
              View Monthly Board
            </Button>
          </Link>
        </div>
      </div>

      <SupplierSubnav />

      {/* 2. Parameters Configuration Card */}
      <Card className="bg-white border-slate-200 shadow-xs overflow-hidden">
        <CardHeader className="bg-slate-50/70 border-b border-slate-200/80 p-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            Generation Parameters
          </h3>
        </CardHeader>

        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Dining Area */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                Target Dining Area
              </label>
              <select
                value={selectedAreaId}
                onChange={(e) => setSelectedAreaId(e.target.value)}
                className="w-full text-xs font-medium px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.area_type})
                  </option>
                ))}
              </select>
            </div>

            {/* Duty Period */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Duty Period
              </label>
              <select
                value={selectedDutyPeriodId}
                onChange={(e) => setSelectedDutyPeriodId(e.target.value)}
                className="w-full text-xs font-medium px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {dutyPeriods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.start_date} to {p.end_date})
                  </option>
                ))}
              </select>
            </div>

            {/* Supplier Pool */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                Supplier Pool
              </label>
              <select
                value={selectedPoolId}
                onChange={(e) => setSelectedPoolId(e.target.value)}
                className="w-full text-xs font-medium px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {pools.map((pool) => (
                  <option key={pool.id} value={pool.id}>
                    {pool.name} ({pool.members?.length || 0} eligible suppliers)
                  </option>
                ))}
              </select>
            </div>

            {/* Rotation Rule */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                Rotation Algorithm
              </label>
              <select
                value={selectedRuleId}
                onChange={(e) => setSelectedRuleId(e.target.value)}
                className="w-full text-xs font-medium px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {rules.map((rule) => (
                  <option key={rule.id} value={rule.id}>
                    {rule.name} ({rule.rule_type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Info className="w-4 h-4 text-indigo-500 shrink-0" />
              <span>
                Generated schedules remain in <strong>DRAFT / REVIEW</strong> until explicitly
                published. No active duty changes take effect immediately.
              </span>
            </div>

            <Button
              onClick={handleGeneratePreview}
              disabled={isGenerating}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1.5 shadow-sm"
            >
              <Wand2 className={cn('w-4 h-4', isGenerating && 'animate-spin')} />
              {isGenerating ? 'Computing Rotations...' : 'Generate Assignment Preview'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 3. Generated Schedule Review Section (PRD Section 13 & 46) */}
      {previewResult && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="bg-white border-slate-200 shadow-xs">
              <CardContent className="p-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Total Tables
                </span>
                <span className="text-2xl font-black text-slate-900 mt-1 block">
                  {previewResult.summary.totalTables}
                </span>
                <span className="text-[10px] text-slate-500">Covered in area</span>
              </CardContent>
            </Card>

            <Card className="bg-emerald-50/50 border-emerald-200 shadow-xs">
              <CardContent className="p-4">
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                  Primary Assigned
                </span>
                <span className="text-2xl font-black text-emerald-900 mt-1 block">
                  {previewResult.summary.primaryCount}
                </span>
                <span className="text-[10px] text-emerald-600">Assigned 1:1</span>
              </CardContent>
            </Card>

            <Card className="bg-teal-50/50 border-teal-200 shadow-xs">
              <CardContent className="p-4">
                <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider block">
                  Backup Coverage
                </span>
                <span className="text-2xl font-black text-teal-900 mt-1 block">
                  {previewResult.summary.backupCoverageCount} / {previewResult.summary.totalTables}
                </span>
                <span className="text-[10px] text-teal-600">Standby ready</span>
              </CardContent>
            </Card>

            <Card
              className={cn(
                'shadow-xs',
                previewResult.summary.conflictsCount === 0
                  ? 'bg-slate-50/80 border-slate-200'
                  : 'bg-rose-50/80 border-rose-200'
              )}
            >
              <CardContent className="p-4">
                <span
                  className={cn(
                    'text-[10px] font-bold uppercase tracking-wider block',
                    previewResult.summary.conflictsCount === 0 ? 'text-slate-500' : 'text-rose-700'
                  )}
                >
                  Detected Conflicts
                </span>
                <span
                  className={cn(
                    'text-2xl font-black mt-1 block',
                    previewResult.summary.conflictsCount === 0 ? 'text-slate-900' : 'text-rose-900'
                  )}
                >
                  {previewResult.summary.conflictsCount}
                </span>
                <span
                  className={cn(
                    'text-[10px]',
                    previewResult.summary.conflictsCount === 0
                      ? 'text-slate-500'
                      : 'text-rose-600 font-bold'
                  )}
                >
                  {previewResult.summary.conflictsCount === 0
                    ? '100% Conflict Free'
                    : 'Requires Resolution'}
                </span>
              </CardContent>
            </Card>
          </div>

          {/* Conflict Alert Banner if any */}
          {previewResult.conflicts.length > 0 && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-rose-950">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Validation Warnings Detected ({previewResult.conflicts.length}):
              </div>
              <ul className="list-disc pl-5 space-y-0.5">
                {previewResult.conflicts.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Generated Preview Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Generated Assignments Preview
                </h4>
                <p className="text-xs text-slate-500">
                  {selectedArea?.name} &bull; Period: {selectedPeriod?.name} &bull; Rule:{' '}
                  {selectedRule?.name}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={handlePublishSchedule}
                  disabled={isPublishing || previewResult.summary.conflictsCount > 0}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  {isPublishing ? 'Publishing Schedule...' : 'Publish Schedule to Active Board'}
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Table</th>
                    <th className="px-4 py-3">Primary Supplier</th>
                    <th className="px-4 py-3">Standby Backup Supplier</th>
                    <th className="px-4 py-3">Scope</th>
                    <th className="px-4 py-3">Validation Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewResult.assignments.map((item) => (
                    <tr key={item.tableId} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-black text-slate-900">
                        Table {item.tableNumber}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-800">
                          {item.primaryStudent?.name || 'Assigned'}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          ID: {item.primaryStudent?.enrollment_no || item.primarySupplierId}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {item.backupStudent ? (
                          <div>
                            <div className="font-bold text-teal-800">
                              {item.backupStudent.name}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400">
                              ID: {item.backupStudent.enrollment_no || item.backupSupplierId}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No backup assigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                          TABLE
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Ready for Publish
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
