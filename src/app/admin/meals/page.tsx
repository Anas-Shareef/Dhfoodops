'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getFoodPlanningProvider } from '@/lib/food/provider';
import { MealFoodPipelineItem } from '@/types/database';
import { MealsSubnav } from '@/components/admin/meals-subnav';
import { ApproveRequirementModal } from '@/components/admin/approve-requirement-modal';
import { RecordPreparationModal } from '@/components/admin/record-preparation-modal';
import { RecordServingModal } from '@/components/admin/record-serving-modal';
import { RecordLeftoverModal } from '@/components/admin/record-leftover-modal';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChefHat, 
  Clock, 
  Utensils, 
  Archive, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  ExternalLink,
  ShieldCheck,
  Building,
  UserCheck,
  Calendar,
  Layers,
  ArrowRight,
  Users,
  BookOpen,
  HeartHandshake
} from 'lucide-react';
import { getTodayDateStringIST, formatTimeStringTo12H } from '@/lib/utils/timezone';
import { getMealMenuProvider } from '@/lib/food/menu-provider';
import { TodayMenuSummary, MealAudienceBreakdown } from '@/types/database';

export default function AdminMealsDashboardPage() {
  const [pipelines, setPipelines] = useState<MealFoodPipelineItem[]>([]);
  const [todayMenu, setTodayMenu] = useState<TodayMenuSummary | null>(null);
  const [audienceMap, setAudienceMap] = useState<Record<string, MealAudienceBreakdown>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Modals target state
  const [approveTarget, setApproveTarget] = useState<MealFoodPipelineItem | null>(null);
  const [prepTarget, setPrepTarget] = useState<MealFoodPipelineItem | null>(null);
  const [servingTarget, setServingTarget] = useState<MealFoodPipelineItem | null>(null);
  const [leftoverTarget, setLeftoverTarget] = useState<MealFoodPipelineItem | null>(null);

  const todayStr = getTodayDateStringIST();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const foodProvider = getFoodPlanningProvider();
      const menuProvider = getMealMenuProvider();
      
      const [data, menu] = await Promise.all([
        foodProvider.getTodayMealPipelines(todayStr),
        menuProvider.getTodayMenu(),
      ]);
      setPipelines(data);
      setTodayMenu(menu);

      // Load audience breakdowns for all sessions
      const audMap: Record<string, MealAudienceBreakdown> = {};
      for (const p of data) {
        audMap[p.session_id] = await foodProvider.getMealAudienceBreakdown(p.session_id);
      }
      setAudienceMap(audMap);
    } catch (err) {
      console.error('Failed to load admin meals data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [todayStr]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCalculateRequirement = async (sessionId: string, bufferPercent: number = 5) => {
    const provider = getFoodPlanningProvider();
    const res = await provider.calculateMealRequirement(sessionId, bufferPercent);
    if (res.success) {
      loadData();
    } else {
      alert(res.error || 'Failed to calculate requirement');
    }
  };

  const totalAttending = pipelines.reduce((acc, p) => acc + p.attending_count, 0);
  const totalRecommended = pipelines.reduce((acc, p) => acc + p.recommended_quantity, 0);
  const totalPrepared = pipelines.reduce((acc, p) => acc + (p.prepared_quantity || 0), 0);
  const totalServed = pipelines.reduce((acc, p) => acc + (p.served_quantity || 0), 0);
  const totalLeftover = pipelines.reduce((acc, p) => acc + (p.leftover_quantity || 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block">
            Phase 4 • Kitchen &amp; Food Planning
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 mt-0.5">
            <ChefHat className="w-6 h-6 text-indigo-600" />
            Food Requirement &amp; Meal Operations
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Transforming finalized meal attendance into operational kitchen requirements, tracking actual preparation, serving, and leftovers
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => loadData()} disabled={isLoading} className="font-semibold text-xs">
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Operations
          </Button>
          <Link href="/admin/meals/schedules">
            <Button size="sm" className="font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white">
              Configure Schedules
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Subnav */}
      <MealsSubnav />

      {/* 2b. Today's Scheduled Menu Quick Overview (PRD Section 41 Kitchen View) */}
      {todayMenu && (
        <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-400/30">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                  Kitchen Production Context • {todayMenu.day_name_en} ({todayMenu.day_name_ml})
                </span>
                <h3 className="text-base font-bold text-white">Today&apos;s 5-Slot Scheduled Menu</h3>
              </div>
            </div>
            <Link href="/admin/meals/menu">
              <Button size="sm" variant="outline" className="text-xs font-bold text-slate-200 border-slate-700 bg-slate-800 hover:bg-slate-700 hover:text-white">
                Manage Weekly Menu
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
            {todayMenu.slots.map((slot, idx) => {
              const slotKey = slot.meal_slot || slot.slot || `slot-${idx}`;
              return (
                <div key={slotKey} className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                      <span className="font-bold text-slate-300 uppercase">{slot.label_en || slot.name_en}</span>
                      <span className="font-mono text-indigo-300">{slot.default_time || slot.time}</span>
                    </div>
                    <div className="text-indigo-400 font-medium text-[11px] font-malayalam">{slot.label_ml || slot.name_ml}</div>
                    <div className="mt-2 text-xs font-bold text-slate-100 font-malayalam leading-snug">
                      {slot.description_ml || slot.menu_text_ml}
                    </div>
                    <div className="text-[10px] text-slate-400 italic mt-0.5 leading-tight">
                      {slot.description_en || slot.menu_text_en}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Operational Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-700">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Confirmed</p>
              <p className="text-xl font-black text-indigo-900">{totalAttending}</p>
              <p className="text-[10px] text-slate-400">Eating students today</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-700">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Recommended</p>
              <p className="text-xl font-black text-purple-900">{totalRecommended}</p>
              <p className="text-[10px] text-slate-400">With safety buffer</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Actual Prepared</p>
              <p className="text-xl font-black text-emerald-800">{totalPrepared}</p>
              <p className="text-[10px] text-slate-400">Cooked in kitchen</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Actual Served</p>
              <p className="text-xl font-black text-blue-800">{totalServed}</p>
              <p className="text-[10px] text-slate-400">Dining consumption</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Leftover</p>
              <p className="text-xl font-black text-amber-800">{totalLeftover}</p>
              <p className="text-[10px] text-slate-400">Stored / Classified</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. Core Separation Principle Banner */}
      <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-4 text-xs">
        <div className="flex items-start gap-3">
          <div className="p-1.5 rounded-lg bg-indigo-600 text-white shrink-0 mt-0.5">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <p className="font-bold text-indigo-950 text-sm">
              Core Architectural Separation (PRD Section 3 &amp; 31)
            </p>
            <p className="text-indigo-800 mt-0.5 leading-relaxed">
              <strong>Expected Attendance ≠ Base Requirement ≠ Recommended Prep ≠ Actual Cooked ≠ Actual Served ≠ Leftovers.</strong>{' '}
              Each metric is independently recorded and preserved. Values are never overwritten or conflated, guaranteeing full operational accountability and non-fictitious food waste reporting.
            </p>
          </div>
        </div>
      </div>

      {/* 5. Today's Meals Pipeline List */}
      <div className="space-y-4">
        {pipelines.map((item) => {
          const isBreakfast = item.meal_type === 'breakfast';
          const title = item.meal_type.toUpperCase();
          const hasRequirement = Boolean(item.requirement);
          const isApproved = item.requirement?.status === 'approved' || item.pipeline_status === 'prepared' || item.pipeline_status === 'serving' || item.pipeline_status === 'completed';

          return (
            <Card key={item.session_id} className={`border bg-white transition-all ${isBreakfast ? 'border-indigo-300 ring-2 ring-indigo-500 shadow-md' : 'border-slate-200'}`}>
              <CardHeader className="p-4 bg-slate-50/70 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-indigo-600 shadow-xs">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-black text-slate-900">{title}</h2>
                      {isBreakfast && (
                        <Badge className="bg-indigo-600 text-white font-extrabold text-[10px] px-2 py-0.5">
                          PRD Demo Scenario
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      Serving Time: <strong>{formatTimeStringTo12H(item.meal_time)}</strong> • Date: {item.date}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {item.pipeline_status === 'completed' && (
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-xs py-1 px-2.5">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      Meal Service Completed
                    </Badge>
                  )}
                  {item.pipeline_status === 'serving' && (
                    <Badge className="bg-blue-100 text-blue-800 border-blue-300 font-bold text-xs py-1 px-2.5">
                      <Utensils className="w-3.5 h-3.5 mr-1" />
                      Serving in Progress
                    </Badge>
                  )}
                  {item.pipeline_status === 'prepared' && (
                    <Badge className="bg-purple-100 text-purple-800 border-purple-300 font-bold text-xs py-1 px-2.5">
                      <ChefHat className="w-3.5 h-3.5 mr-1" />
                      Kitchen Prepared
                    </Badge>
                  )}
                  {item.pipeline_status === 'approved' && (
                    <Badge className="bg-indigo-100 text-indigo-800 border-indigo-300 font-bold text-xs py-1 px-2.5">
                      Requirement Approved
                    </Badge>
                  )}
                  {item.pipeline_status === 'calculated' && (
                    <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-bold text-xs py-1 px-2.5">
                      Awaiting Supervisor Approval
                    </Badge>
                  )}
                  {item.pipeline_status === 'awaiting_attendance' && (
                    <Badge className="bg-slate-100 text-slate-600 border-slate-300 font-bold text-xs py-1 px-2.5">
                      Attendance In Progress
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-5 space-y-5">
                {/* 5-Stage Pipeline Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
                  {/* Stage 1: Attendance & Audience Breakdown (PRD Section 39, 40) */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        1. Attendance &amp; Audience
                      </span>
                      <p className="text-xl font-black text-slate-900">{item.attending_count} <span className="text-xs font-semibold text-slate-500">attending</span></p>
                    </div>
                    <div className="mt-2 text-[10px] text-slate-500 space-y-0.5 border-t border-slate-200/60 pt-1.5">
                      <div className="flex justify-between">
                        <span>Students:</span>
                        <span className="font-semibold text-slate-700">{audienceMap[item.session_id]?.student_count ?? item.attending_count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Teachers:</span>
                        <span className="font-semibold text-indigo-700">+{audienceMap[item.session_id]?.teacher_count ?? 12}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Special / Guests:</span>
                        <span className="font-semibold text-amber-700">+{ (audienceMap[item.session_id]?.special_group_count ?? 0) + (audienceMap[item.session_id]?.guest_count ?? 0) }</span>
                      </div>
                    </div>
                  </div>

                  {/* Stage 2: Food Requirement */}
                  <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-200 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block mb-1">
                        2. Recommended Prep
                      </span>
                      <p className="text-xl font-black text-indigo-950">
                        {item.recommended_quantity} <span className="text-xs font-semibold text-indigo-700">portions</span>
                      </p>
                    </div>
                    <div className="mt-2 text-[11px] text-indigo-800 space-y-0.5 border-t border-indigo-200/60 pt-1.5">
                      <div className="flex justify-between">
                        <span>Base:</span>
                        <span className="font-semibold">{item.base_quantity}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Buffer (+{item.buffer_percent}%):</span>
                        <span className="font-semibold">+{item.buffer_quantity}</span>
                      </div>
                    </div>
                  </div>

                  {/* Stage 3: Actual Cooked */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        3. Kitchen Output
                      </span>
                      {item.prepared_quantity !== null ? (
                        <p className="text-xl font-black text-emerald-700">
                          {item.prepared_quantity} <span className="text-xs font-semibold text-slate-500">portions</span>
                        </p>
                      ) : (
                        <p className="text-sm font-semibold text-slate-400 italic">Not prepared yet</p>
                      )}
                    </div>
                    <div className="mt-2 text-[11px] text-slate-500 border-t border-slate-200/60 pt-1.5">
                      <span>Planned: <strong>{item.recommended_quantity}</strong></span>
                    </div>
                  </div>

                  {/* Stage 4: Actual Served */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        4. Served to Students
                      </span>
                      {item.served_quantity !== null ? (
                        <p className="text-xl font-black text-blue-700">
                          {item.served_quantity} <span className="text-xs font-semibold text-slate-500">portions</span>
                        </p>
                      ) : (
                        <p className="text-sm font-semibold text-slate-400 italic">Awaiting service</p>
                      )}
                    </div>
                    <div className="mt-2 text-[11px] text-slate-500 border-t border-slate-200/60 pt-1.5">
                      <span>Attendees: <strong>{item.attending_count}</strong></span>
                    </div>
                  </div>

                  {/* Stage 5: Leftovers */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        5. Food Leftovers
                      </span>
                      {item.leftover_quantity !== null ? (
                        <div>
                          <p className="text-xl font-black text-amber-700">
                            {item.leftover_quantity} <span className="text-xs font-semibold text-slate-500">portions</span>
                          </p>
                          <Badge className="bg-amber-100 text-amber-800 text-[10px] font-bold mt-1 uppercase">
                            {item.leftover_classification || 'Stored'}
                          </Badge>
                        </div>
                      ) : (
                        <p className="text-sm font-semibold text-slate-400 italic">No leftovers logged</p>
                      )}
                    </div>
                    <div className="mt-2 text-[11px] text-slate-500 border-t border-slate-200/60 pt-1.5">
                      <span>Variance: <strong>{item.prepared_quantity && item.served_quantity ? item.prepared_quantity - item.served_quantity : 0} portions</strong></span>
                    </div>
                  </div>
                </div>

                {/* Operational Action Controls */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                  <div className="flex flex-wrap items-center gap-2">
                    {!hasRequirement && item.session_status !== 'scheduled' && (
                      <Button
                        size="sm"
                        onClick={() => handleCalculateRequirement(item.session_id, item.buffer_percent)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-8"
                      >
                        Calculate Food Requirement
                      </Button>
                    )}

                    {hasRequirement && !isApproved && (
                      <Button
                        size="sm"
                        onClick={() => setApproveTarget(item)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-8"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                        Approve Requirement
                      </Button>
                    )}

                    {isApproved && item.prepared_quantity === null && (
                      <Button
                        size="sm"
                        onClick={() => setPrepTarget(item)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8"
                      >
                        <ChefHat className="w-3.5 h-3.5 mr-1" />
                        Log Kitchen Prep
                      </Button>
                    )}

                    {item.prepared_quantity !== null && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setServingTarget(item)}
                        className="text-xs h-8 border-blue-200 text-blue-700 hover:bg-blue-50 font-bold"
                      >
                        <Utensils className="w-3.5 h-3.5 mr-1" />
                        Record Serving
                      </Button>
                    )}

                    {item.served_quantity !== null && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLeftoverTarget(item)}
                        className="text-xs h-8 border-amber-200 text-amber-700 hover:bg-amber-50 font-bold"
                      >
                        <Archive className="w-3.5 h-3.5 mr-1" />
                        Log Leftovers
                      </Button>
                    )}

                    <Link href="/admin/meals/leftovers">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-8 border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold"
                      >
                        <HeartHandshake className="w-3.5 h-3.5 mr-1" />
                        Surplus &amp; Donations
                      </Button>
                    </Link>
                  </div>

                  <Link href={`/admin/meals/${item.session_id}`}>
                    <Button variant="ghost" size="sm" className="text-xs font-bold text-indigo-700 hover:text-indigo-900 h-8">
                      View Full Details &amp; Tables
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Modals */}
      <ApproveRequirementModal
        isOpen={Boolean(approveTarget)}
        onClose={() => setApproveTarget(null)}
        pipeline={approveTarget}
        onSuccess={() => loadData()}
      />

      <RecordPreparationModal
        isOpen={Boolean(prepTarget)}
        onClose={() => setPrepTarget(null)}
        pipeline={prepTarget}
        onSuccess={() => loadData()}
      />

      <RecordServingModal
        isOpen={Boolean(servingTarget)}
        onClose={() => setServingTarget(null)}
        pipeline={servingTarget}
        onSuccess={() => loadData()}
      />

      <RecordLeftoverModal
        isOpen={Boolean(leftoverTarget)}
        onClose={() => setLeftoverTarget(null)}
        pipeline={leftoverTarget}
        onSuccess={() => loadData()}
      />
    </div>
  );
}
