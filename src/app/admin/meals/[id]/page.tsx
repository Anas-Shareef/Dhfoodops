'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { getFoodPlanningProvider } from '@/lib/food/provider';
import { 
  MealFoodPipelineItem, 
  TableFoodRequirement, 
  DepartmentFoodRequirement,
  MealRequirementRevision 
} from '@/types/database';
import { ApproveRequirementModal } from '@/components/admin/approve-requirement-modal';
import { RecordPreparationModal } from '@/components/admin/record-preparation-modal';
import { RecordServingModal } from '@/components/admin/record-serving-modal';
import { RecordLeftoverModal } from '@/components/admin/record-leftover-modal';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { 
  ArrowLeft, 
  ChefHat, 
  Utensils, 
  Clock, 
  ShieldCheck, 
  Archive, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw, 
  Layers, 
  Users, 
  Building,
  Info,
  History,
  Scale
} from 'lucide-react';
import { formatTimeStringTo12H } from '@/lib/utils/timezone';

export default function MealSessionFoodDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const sessionId = resolvedParams.id;

  const [pipeline, setPipeline] = useState<MealFoodPipelineItem | null>(null);
  const [tables, setTables] = useState<TableFoodRequirement[]>([]);
  const [departments, setDepartments] = useState<DepartmentFoodRequirement[]>([]);
  const [revisions, setRevisions] = useState<MealRequirementRevision[]>([]);
  const [activeTab, setActiveTab] = useState<'items' | 'tables' | 'departments' | 'revisions'>('items');
  const [isLoading, setIsLoading] = useState(true);

  // Buffer tuning state
  const [customBuffer, setCustomBuffer] = useState<number>(5);

  // Correction Simulation Modal state
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [revisionNewCount, setRevisionNewCount] = useState<number>(287);
  const [revisionReason, setRevisionReason] = useState('Approved late attendance correction appeal after cutoff');
  const [isRevising, setIsRevising] = useState(false);

  // Modals state
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isPrepOpen, setIsPrepOpen] = useState(false);
  const [isServingOpen, setIsServingOpen] = useState(false);
  const [isLeftoverOpen, setIsLeftoverOpen] = useState(false);

  const toast = useToast();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const provider = getFoodPlanningProvider();
    const [pipelineData, tableData, deptData] = await Promise.all([
      provider.getMealPipelineBySessionId(sessionId),
      provider.getTableWiseFoodRequirement(sessionId),
      provider.getDepartmentWiseFoodRequirement(sessionId),
    ]);

    setPipeline(pipelineData);
    setTables(tableData);
    setDepartments(deptData);

    if (pipelineData?.buffer_percent) {
      setCustomBuffer(pipelineData.buffer_percent);
    }

    if (pipelineData?.requirement?.id) {
      const revs = await provider.getRevisionsForRequirement(pipelineData.requirement.id);
      setRevisions(revs);
    }

    setIsLoading(false);
  }, [sessionId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRecalculateWithBuffer = async () => {
    if (!pipeline) return;
    const provider = getFoodPlanningProvider();
    const res = await provider.calculateMealRequirement(sessionId, customBuffer);
    if (res.success) {
      toast.success(`Recalculated requirement with ${customBuffer}% buffer.`);
      loadData();
    } else {
      toast.error(res.error || 'Failed to recalculate requirement');
    }
  };

  const handleApplyRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pipeline?.requirement?.id) return;

    setIsRevising(true);
    const provider = getFoodPlanningProvider();
    const res = await provider.reviseMealRequirement(
      pipeline.requirement.id,
      revisionNewCount,
      revisionReason
    );
    setIsRevising(false);

    if (res.success) {
      toast.success('Requirement revision recorded successfully.');
      setIsRevisionModalOpen(false);
      loadData();
    } else {
      toast.error(res.error || 'Failed to revise requirement');
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-500 text-xs">
        Loading meal food requirement details...
      </div>
    );
  }

  if (!pipeline) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-sm font-bold text-slate-800">Meal session not found</p>
        <Link href="/admin/meals">
          <Button size="sm" variant="outline">Back to Meals Operations</Button>
        </Link>
      </div>
    );
  }

  const isApproved = pipeline.requirement?.status === 'approved' || pipeline.pipeline_status === 'prepared' || pipeline.pipeline_status === 'serving' || pipeline.pipeline_status === 'completed';

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header & Navigation */}
      <div>
        <Link
          href="/admin/meals"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Food Operations Dashboard
        </Link>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {pipeline.meal_type.toUpperCase()} Food Requirement
              </h1>
              <Badge className="bg-indigo-600 text-white font-extrabold text-[10px] px-2 py-0.5">
                Version {pipeline.requirement?.calculation_version || 1}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Serving Time: <strong>{formatTimeStringTo12H(pipeline.meal_time)}</strong> • Date: {pipeline.date}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!isApproved && (
              <Button
                size="sm"
                onClick={() => setIsApproveOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
              >
                <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                Approve Requirement
              </Button>
            )}

            {isApproved && pipeline.prepared_quantity === null && (
              <Button
                size="sm"
                onClick={() => setIsPrepOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
              >
                <ChefHat className="w-3.5 h-3.5 mr-1" />
                Log Kitchen Prep
              </Button>
            )}

            {pipeline.prepared_quantity !== null && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsServingOpen(true)}
                className="text-xs font-bold border-blue-200 text-blue-700 hover:bg-blue-50"
              >
                <Utensils className="w-3.5 h-3.5 mr-1" />
                Record Serving
              </Button>
            )}

            {pipeline.served_quantity !== null && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsLeftoverOpen(true)}
                className="text-xs font-bold border-amber-200 text-amber-700 hover:bg-amber-50"
              >
                <Archive className="w-3.5 h-3.5 mr-1" />
                Log Leftovers
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Pipeline Visual Status Stepper */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <p className="text-[10px] uppercase font-bold text-slate-400 mb-2">Operational Execution Lifecycle</p>
        <div className="grid grid-cols-5 gap-2 text-center text-xs">
          <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800">
            <span className="font-extrabold block">1. Attendance Finalized</span>
            <span className="text-[11px] text-emerald-600 font-semibold">{pipeline.attending_count} Confirmed</span>
          </div>
          <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800">
            <span className="font-extrabold block">2. Requirement Calculated</span>
            <span className="text-[11px] text-indigo-600 font-semibold">{pipeline.recommended_quantity} Portions</span>
          </div>
          <div className={`p-2.5 rounded-lg border ${isApproved ? 'bg-indigo-50 border-indigo-200 text-indigo-800' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
            <span className="font-extrabold block">3. Supervisor Approved</span>
            <span className="text-[11px] font-semibold">{isApproved ? 'Authorized' : 'Pending'}</span>
          </div>
          <div className={`p-2.5 rounded-lg border ${pipeline.prepared_quantity !== null ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
            <span className="font-extrabold block">4. Kitchen Prepared</span>
            <span className="text-[11px] font-semibold">{pipeline.prepared_quantity !== null ? `${pipeline.prepared_quantity} Portions` : 'Not Cooked'}</span>
          </div>
          <div className={`p-2.5 rounded-lg border ${pipeline.served_quantity !== null ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
            <span className="font-extrabold block">5. Served &amp; Leftover</span>
            <span className="text-[11px] font-semibold">{pipeline.served_quantity !== null ? `${pipeline.served_quantity} Served • ${pipeline.leftover_quantity || 0} Left` : 'Pending Service'}</span>
          </div>
        </div>
      </div>

      {/* 3. Section 1: Final Attendance vs Section 2: Requirement Calculation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Attendance Basis Card */}
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardHeader className="p-4 pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900">Finalized Meal Attendance (Phase 1)</h2>
            </div>
            <Badge className="bg-slate-100 text-slate-700 font-bold text-[10px]">Authoritative</Badge>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <p className="text-[10px] uppercase font-bold text-emerald-700">Confirmed Attending</p>
                <p className="text-2xl font-black text-emerald-800">{pipeline.attending_count}</p>
                <p className="text-[10px] text-emerald-600 font-medium">Food Basis</p>
              </div>

              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                <p className="text-[10px] uppercase font-bold text-rose-700">Not Attending</p>
                <p className="text-2xl font-black text-rose-800">{pipeline.not_attending_count}</p>
                <p className="text-[10px] text-rose-600 font-medium">Exempt from cooking</p>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                <p className="text-[10px] uppercase font-bold text-amber-700">No Response</p>
                <p className="text-2xl font-black text-amber-800">{pipeline.no_response_count}</p>
                <p className="text-[10px] text-amber-600 font-medium">Unresolved (Excluded)</p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start justify-between gap-2">
              <div>
                <p className="font-bold text-slate-800">Post-Cutoff Correction Handling (PRD Section 6 &amp; 18)</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  If an appeal is approved after cutoff, create an auditable version revision rather than mutating history.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRevisionModalOpen(true)}
                className="shrink-0 text-xs h-7 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Apply Revision
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Calculation & Buffer Control Card */}
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardHeader className="p-4 pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900">Food Requirement Calculation Engine</h2>
            </div>
            <Badge className="bg-indigo-100 text-indigo-800 font-bold text-[10px]">Ceiling Rounding</Badge>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-[10px] uppercase font-bold text-slate-400">Base Requirement</p>
                <p className="text-2xl font-black text-slate-900">{pipeline.base_quantity}</p>
                <p className="text-[10px] text-slate-400">1:1 Student Ratio</p>
              </div>

              <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200">
                <p className="text-[10px] uppercase font-bold text-indigo-700">Safety Buffer</p>
                <p className="text-2xl font-black text-indigo-800">+{pipeline.buffer_quantity}</p>
                <p className="text-[10px] text-indigo-600 font-medium">({pipeline.buffer_percent}%)</p>
              </div>

              <div className="p-3 rounded-xl bg-purple-50 border border-purple-200">
                <p className="text-[10px] uppercase font-bold text-purple-700">Recommended Prep</p>
                <p className="text-2xl font-black text-purple-900">{pipeline.recommended_quantity}</p>
                <p className="text-[10px] text-purple-600 font-medium">Portions</p>
              </div>
            </div>

            {/* Buffer adjustment control */}
            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-700 whitespace-nowrap">Configure Buffer %:</span>
              <input
                type="number"
                min="0"
                max="25"
                step="1"
                value={customBuffer}
                onChange={(e) => setCustomBuffer(Number(e.target.value))}
                className="w-16 px-2 py-1 border border-slate-300 rounded text-xs text-center font-bold bg-white"
              />
              <span className="text-xs text-slate-500 font-bold">%</span>
              <Button
                size="sm"
                onClick={handleRecalculateWithBuffer}
                className="ml-auto text-xs h-7 bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              >
                Recalculate
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. Section 5: Actual Output vs Serving vs Leftovers (PRD Section 19, 21, 22) */}
      <Card className="bg-white border-slate-200 shadow-xs">
        <CardHeader className="p-4 pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <ChefHat className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900">Operational Kitchen Output &amp; Serving Reconciler</h2>
          </div>
          <span className="text-xs text-slate-500 font-semibold">PRD Demo Reconciliation Scenario</span>
        </CardHeader>

        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Planned Target</span>
              <span className="text-2xl font-black text-slate-900">{pipeline.recommended_quantity}</span>
              <span className="text-xs font-semibold text-slate-500 ml-1">portions</span>
              <p className="text-[10px] text-slate-400 mt-1">Preserved original baseline</p>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <span className="text-[10px] uppercase font-bold text-emerald-700 block mb-1">Actual Cooked</span>
              <span className="text-2xl font-black text-emerald-800">{pipeline.prepared_quantity || '—'}</span>
              <span className="text-xs font-semibold text-emerald-700 ml-1">portions</span>
              <p className="text-[10px] text-emerald-600 mt-1">
                {pipeline.prepared_quantity ? `Variance: ${pipeline.prepared_quantity - pipeline.recommended_quantity} portions` : 'Kitchen not started'}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
              <span className="text-[10px] uppercase font-bold text-blue-700 block mb-1">Served to Tables</span>
              <span className="text-2xl font-black text-blue-800">{pipeline.served_quantity || '—'}</span>
              <span className="text-xs font-semibold text-blue-700 ml-1">portions</span>
              <p className="text-[10px] text-blue-600 mt-1">
                {pipeline.served_quantity ? `${pipeline.served_quantity} of ${pipeline.attending_count} attendees served` : 'Service pending'}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
              <span className="text-[10px] uppercase font-bold text-amber-700 block mb-1">Leftovers Remaining</span>
              <span className="text-2xl font-black text-amber-800">{pipeline.leftover_quantity || '—'}</span>
              <span className="text-xs font-semibold text-amber-700 ml-1">portions</span>
              {pipeline.leftover_classification && (
                <p className="text-[10px] text-amber-700 font-bold uppercase mt-1">
                  Status: {pipeline.leftover_classification} (Not Waste)
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 5. Sub-Tabs: Menu Items Requirement, Table-Wise Requirement, Department-Wise, Revisions */}
      <div className="space-y-4">
        <div className="flex border-b border-slate-200 gap-2">
          {[
            { id: 'items', label: 'Itemized Menu Requirements', icon: Utensils },
            { id: 'tables', label: 'Table-Wise Distribution & Suppliers', icon: Building },
            { id: 'departments', label: 'Department-Wise Breakdown', icon: Users },
            { id: 'revisions', label: `Revision History (${revisions.length})`, icon: History },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors -mb-px ${
                  isActive
                    ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab 1: Itemized Menu Requirements */}
        {activeTab === 'items' && (
          <Card className="bg-white border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Menu Preparation</th>
                    <th className="py-3 px-4">Unit</th>
                    <th className="py-3 px-4">Consumption Factor</th>
                    <th className="py-3 px-4">Base Quantity (286 Students)</th>
                    <th className="py-3 px-4">Buffer (+{pipeline.buffer_percent}%)</th>
                    <th className="py-3 px-4">Recommended Kitchen Output</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pipeline.items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-black text-slate-900 text-sm">
                        {item.food_item?.name || 'Item'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-[11px] font-bold">
                          {item.unit}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700 font-semibold">
                        {item.consumption_factor} {item.unit} / student
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                        {item.base_quantity} {item.unit}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-indigo-700">
                        +{item.buffer_quantity} {item.unit}
                      </td>
                      <td className="py-3 px-4 font-mono font-black text-emerald-700 text-sm">
                        {item.recommended_quantity} {item.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Tab 2: Table-Wise Distribution (PRD Section 13, 25, 26) */}
        {activeTab === 'tables' && (
          <Card className="bg-white border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100 text-xs text-slate-600">
              <p>
                <strong>Operational Distribution Note (PRD Section 25 &amp; 26):</strong> Table attendance guides food server
                distribution in the hall. Assigned suppliers (Phase 3) ensure table service but do not alter total quantity calculation.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Table</th>
                    <th className="py-3 px-4">Dining Area</th>
                    <th className="py-3 px-4">Assigned Members</th>
                    <th className="py-3 px-4">Confirmed Attending</th>
                    <th className="py-3 px-4">Not Attending</th>
                    <th className="py-3 px-4">Assigned Supplier (Phase 3)</th>
                    <th className="py-3 px-4">Supplier Readiness</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tables.map((t) => {
                    const isTable31 = t.table_number === 31;

                    return (
                      <tr key={t.table_id} className={`hover:bg-slate-50/60 transition-colors ${isTable31 ? 'bg-indigo-50/20 font-semibold' : ''}`}>
                        <td className="py-3 px-4">
                          <span className="font-black text-slate-900">Table {t.table_number}</span>
                          {isTable31 && (
                            <Badge className="ml-2 bg-indigo-600 text-white text-[9px] px-1.5 py-0.2">Focus Table</Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{t.area_name}</td>
                        <td className="py-3 px-4">{t.total_members} students</td>
                        <td className="py-3 px-4 font-bold text-emerald-700">
                          {t.attending_count} attending
                        </td>
                        <td className="py-3 px-4 text-slate-500">{t.not_attending_count} absent</td>
                        <td className="py-3 px-4 font-bold text-indigo-700">
                          {t.primary_supplier_name || 'Assigned Supplier'}
                        </td>
                        <td className="py-3 px-4">
                          <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            {t.supplier_status || 'Checked In'}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Tab 3: Department-Wise Breakdown (PRD Section 14) */}
        {activeTab === 'departments' && (
          <Card className="bg-white border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Department / Batch</th>
                    <th className="py-3 px-4">Total Students</th>
                    <th className="py-3 px-4">Confirmed Attending</th>
                    <th className="py-3 px-4">Not Attending</th>
                    <th className="py-3 px-4">No Response</th>
                    <th className="py-3 px-4 text-right">Attendance Ratio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {departments.map((d) => (
                    <tr key={d.department_id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-black text-slate-900">{d.department_name}</td>
                      <td className="py-3 px-4 text-slate-600">{d.total_students}</td>
                      <td className="py-3 px-4 font-bold text-emerald-700">{d.attending_count}</td>
                      <td className="py-3 px-4 text-rose-600">{d.not_attending_count}</td>
                      <td className="py-3 px-4 text-amber-600">{d.no_response_count}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                        {Math.round((d.attending_count / d.total_students) * 100)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Tab 4: Revision History (PRD Section 18) */}
        {activeTab === 'revisions' && (
          <Card className="bg-white border-slate-200 shadow-xs overflow-hidden">
            {revisions.length === 0 ? (
              <div className="p-8 text-center">
                <History className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-slate-800">No Post-Cutoff Revisions</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Original requirement version 1 is active. Any approved post-cutoff attendance corrections will create an auditable version log here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Version</th>
                      <th className="py-3 px-4">Previous Quantity</th>
                      <th className="py-3 px-4">Revised Quantity</th>
                      <th className="py-3 px-4">Attendee Shift</th>
                      <th className="py-3 px-4">Audit Reason</th>
                      <th className="py-3 px-4 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {revisions.map((rev) => (
                      <tr key={rev.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-black text-indigo-700">v{rev.version}</td>
                        <td className="py-3 px-4 line-through text-slate-400">{rev.previous_quantity} portions</td>
                        <td className="py-3 px-4 font-bold text-emerald-700">{rev.new_quantity} portions</td>
                        <td className="py-3 px-4">
                          {rev.previous_attending} → <strong>{rev.new_attending}</strong>
                        </td>
                        <td className="py-3 px-4 text-slate-700">{rev.reason}</td>
                        <td className="py-3 px-4 text-right font-mono text-slate-500">
                          {new Date(rev.created_at).toLocaleTimeString('en-GB')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Revision Modal Dialog */}
      <Modal
        isOpen={isRevisionModalOpen}
        onClose={() => setIsRevisionModalOpen(false)}
        title="Apply Post-Cutoff Attendance Revision"
      >
        <form onSubmit={handleApplyRevision} className="space-y-4">
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <Info className="w-4 h-4 text-amber-700" />
              <span>Immutable Audit Revision Rule (PRD Section 18)</span>
            </div>
            <p>
              Applying an attendance correction will create <strong>Version {(pipeline.requirement?.calculation_version || 1) + 1}</strong> of the food requirement without erasing the original baseline.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              New Confirmed Attending Count <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={revisionNewCount}
              onChange={(e) => setRevisionNewCount(Number(e.target.value))}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-bold"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Administrative Reason <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={revisionReason}
              onChange={(e) => setRevisionReason(e.target.value)}
              placeholder="e.g. Approved attendance correction request after cutoff"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsRevisionModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              type="submit"
              disabled={isRevising}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
            >
              {isRevising ? 'Saving Revision...' : 'Save New Version'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Operational Modals */}
      <ApproveRequirementModal
        isOpen={isApproveOpen}
        onClose={() => setIsApproveOpen(false)}
        pipeline={pipeline}
        onSuccess={() => loadData()}
      />

      <RecordPreparationModal
        isOpen={isPrepOpen}
        onClose={() => setIsPrepOpen(false)}
        pipeline={pipeline}
        onSuccess={() => loadData()}
      />

      <RecordServingModal
        isOpen={isServingOpen}
        onClose={() => setIsServingOpen(false)}
        pipeline={pipeline}
        onSuccess={() => loadData()}
      />

      <RecordLeftoverModal
        isOpen={isLeftoverOpen}
        onClose={() => setIsLeftoverOpen(false)}
        pipeline={pipeline}
        onSuccess={() => loadData()}
      />
    </div>
  );
}
