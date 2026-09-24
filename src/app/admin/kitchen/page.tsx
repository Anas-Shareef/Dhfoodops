'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getKitchenProvider } from '@/lib/kitchen/provider';
import { 
  KitchenMealSessionCard, 
  MealSlot, 
  KitchenMealStatus,
  SpecialMealOrder,
  SurplusClassification,
  SurplusDestination
} from '@/types/database';
import { KitchenSubnav } from '@/components/admin/kitchen-subnav';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ChefHat, 
  Clock, 
  Users, 
  Utensils, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Plus, 
  ArrowRight, 
  Flame, 
  Sparkles, 
  HeartHandshake, 
  RotateCcw,
  Calendar,
  Layers,
  Check,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export default function KitchenDashboardPage() {
  const [meals, setMeals] = useState<KitchenMealSessionCard[]>([]);
  const [specialOrders, setSpecialOrders] = useState<SpecialMealOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Quick Action Modal states
  const [activeMealForAction, setActiveMealForAction] = useState<KitchenMealSessionCard | null>(null);
  const [actionType, setActionType] = useState<'PREP' | 'SERVE' | 'SURPLUS' | 'NEW_ORDER' | null>(null);
  const [prepQty, setPrepQty] = useState<number>(350);
  const [serveQty, setServeQty] = useState<number>(330);
  const [surplusQty, setSurplusQty] = useState<number>(20);
  const [surplusClass, setSurplusClass] = useState<SurplusClassification>('EDIBLE_SURPLUS');
  const [surplusDest, setSurplusDest] = useState<SurplusDestination>('DONATION');
  const [surplusNote, setSurplusNote] = useState<string>('');

  // New Special Order Form state
  const [orderTitle, setOrderTitle] = useState('');
  const [orderDate, setOrderDate] = useState('2026-09-24');
  const [orderSlot, setOrderSlot] = useState<MealSlot>('LUNCH');
  const [orderQty, setOrderQty] = useState(25);
  const [orderRequester, setOrderRequester] = useState('');
  const [orderRole, setOrderRole] = useState('Programme Coordinator');
  const [orderAudience, setOrderAudience] = useState<'PROGRAMME' | 'GUEST' | 'SEMINAR'>('PROGRAMME');
  const [orderRequirements, setOrderRequirements] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const provider = getKitchenProvider();
      const [mealsData, ordersData] = await Promise.all([
        provider.getTodayKitchenMeals(),
        provider.getAllSpecialOrders(),
      ]);

      setMeals(mealsData);
      setSpecialOrders(ordersData);
    } catch (err) {
      console.error('Failed to load kitchen dashboard', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Status badge helper
  const getStatusBadge = (status: KitchenMealStatus) => {
    switch (status) {
      case 'PREPARING':
        return (
          <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-extrabold text-[11px] animate-pulse flex items-center gap-1">
            <Flame className="w-3 h-3 text-amber-600" />
            Preparing
          </Badge>
        );
      case 'READY_TO_SERVE':
        return (
          <Badge className="bg-blue-100 text-blue-900 border-blue-300 font-extrabold text-[11px] flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-blue-600" />
            Ready to Serve
          </Badge>
        );
      case 'SERVING':
        return (
          <Badge className="bg-indigo-100 text-indigo-900 border-indigo-300 font-extrabold text-[11px] flex items-center gap-1">
            <Utensils className="w-3 h-3 text-indigo-600" />
            Serving Active
          </Badge>
        );
      case 'COMPLETED':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-[11px] flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Completed
          </Badge>
        );
      case 'SCHEDULED':
      default:
        return (
          <Badge className="bg-slate-100 text-slate-700 border-slate-200 font-semibold text-[11px] flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-500" />
            Scheduled
          </Badge>
        );
    }
  };

  const handleStartPrep = async (meal: KitchenMealSessionCard) => {
    const provider = getKitchenProvider();
    await provider.startPreparation(meal.meal_slot, 'Chef Moideen (Head Cook)');
    await loadData();
  };

  const handleConfirmPrep = async () => {
    if (!activeMealForAction) return;
    setIsSubmitting(true);
    try {
      const provider = getKitchenProvider();
      await provider.markPrepared(activeMealForAction.meal_slot, prepQty, 'Chef Moideen');
      setActiveMealForAction(null);
      setActionType(null);
      await loadData();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmServing = async () => {
    if (!activeMealForAction) return;
    setIsSubmitting(true);
    try {
      const provider = getKitchenProvider();
      await provider.recordServing(activeMealForAction.meal_slot, serveQty, 'Chef Moideen');
      setActiveMealForAction(null);
      setActionType(null);
      await loadData();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmSurplus = async () => {
    if (!activeMealForAction) return;
    setIsSubmitting(true);
    try {
      const provider = getKitchenProvider();
      await provider.logKitchenSurplus(
        activeMealForAction.meal_slot,
        surplusQty,
        surplusClass,
        surplusDest,
        'OVER_PREPARATION',
        surplusNote,
        'Chef Moideen'
      );
      setActiveMealForAction(null);
      setActionType(null);
      await loadData();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderTitle || !orderRequester) {
      alert('Please fill out all required fields.');
      return;
    }
    setIsSubmitting(true);
    try {
      const provider = getKitchenProvider();
      await provider.createSpecialOrder({
        title: orderTitle,
        requested_for_date: orderDate,
        meal_slot: orderSlot,
        quantity: orderQty,
        requester_name: orderRequester,
        requester_role: orderRole,
        audience_type: orderAudience,
        special_requirements: orderRequirements,
      });

      setOrderTitle('');
      setOrderRequester('');
      setOrderRequirements('');
      setActionType(null);
      await loadData();
    } finally {
      setIsSubmitting(false);
    }
  };

  const completedCount = meals.filter((m) => m.status === 'COMPLETED').length;
  const preparingCount = meals.filter((m) => m.status === 'PREPARING' || m.status === 'READY_TO_SERVE' || m.status === 'SERVING').length;
  const upcomingCount = meals.filter((m) => m.status === 'SCHEDULED').length;
  const totalSpecialOrdersToday = specialOrders.filter((o) => o.requested_for_date === '2026-09-24').length;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      <KitchenSubnav onOpenNewOrderModal={() => setActionType('NEW_ORDER')} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header Banner */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                Phase 8 • Kitchen Operations &amp; Cook Management
              </span>
              <span className="text-[11px] font-bold text-slate-400">
                Asia/Kolkata (IST)
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5 mt-1">
              <ChefHat className="w-6 h-6 text-amber-600" />
              <span>Today&apos;s Kitchen Dashboard</span>
              <span className="text-slate-300 font-normal">|</span>
              <span className="text-slate-600 font-bold text-base">Thursday · വ്യാഴം (24 Sep 2026)</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Operational view for head cooks and kitchen staff. Real-time meal requirements combining student attendance, faculty dining, programme scholars, and guest delegations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href="/admin/kitchen/special-orders">
              <Button
                variant="outline"
                className="border-indigo-300 bg-indigo-50/70 text-indigo-900 hover:bg-indigo-100 font-bold text-xs"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Special Orders ({specialOrders.length})
              </Button>
            </Link>
            <Button
              onClick={() => setActionType('NEW_ORDER')}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              New Special Order
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

        {/* Kitchen Operational KPIs (PRD Section 32) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Today&apos;s Slots</div>
            <div className="text-2xl font-black text-slate-900 mt-0.5">5 Meals</div>
            <div className="text-[10px] text-slate-500 mt-1">Full dining cycle</div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Completed</div>
            <div className="text-2xl font-black text-emerald-600 mt-0.5">{completedCount}</div>
            <div className="text-[10px] text-emerald-700 mt-1">Served &amp; logged</div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Preparing / Live</div>
            <div className="text-2xl font-black text-amber-600 mt-0.5">{preparingCount}</div>
            <div className="text-[10px] text-amber-700 font-semibold mt-1">Active pots</div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Upcoming</div>
            <div className="text-2xl font-black text-slate-600 mt-0.5">{upcomingCount}</div>
            <div className="text-[10px] text-slate-500 mt-1">Scheduled next</div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Special Orders</div>
            <div className="text-2xl font-black text-indigo-600 mt-0.5">{totalSpecialOrdersToday}</div>
            <div className="text-[10px] text-slate-500 mt-1">Delegations &amp; events</div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Head Cook</div>
            <div className="text-xs font-black text-slate-800 mt-1.5 truncate">Chef Moideen</div>
            <div className="text-[10px] text-slate-500">Duty in effect</div>
          </div>
        </div>

        {/* 5 Daily Kitchen Meal Sessions (PRD Sections 6, 9, 10, 23, 33) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-600" />
              Kitchen Preparation Schedule &amp; Audience Breakdown
            </h2>
            <span className="text-xs text-slate-500">Click any card to inspect full requirements</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {meals.map((meal) => {
              const isLunch = meal.meal_slot === 'LUNCH';
              return (
                <div
                  key={meal.session_id}
                  className={cn(
                    "bg-white rounded-2xl border p-5 shadow-xs transition-all space-y-4 flex flex-col justify-between",
                    meal.status === 'PREPARING'
                      ? "border-amber-300 ring-2 ring-amber-100/80 bg-amber-50/10"
                      : meal.status === 'COMPLETED'
                      ? "border-slate-200 bg-slate-50/30"
                      : "border-slate-200 hover:border-slate-300"
                  )}
                >
                  {/* Top Bar: Slot, Time, Status */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider block">
                          {meal.meal_time}
                        </span>
                        <h3 className="text-lg font-black text-slate-900 tracking-tight">
                          {meal.meal_name_en}
                        </h3>
                        <p className="text-xs font-bold text-amber-900/70">
                          {meal.meal_name_ml}
                        </p>
                      </div>
                      {getStatusBadge(meal.status)}
                    </div>

                    {/* Published Menu Snippet (English + Malayalam) */}
                    <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                      <div className="text-[10px] font-black uppercase text-slate-400 flex items-center justify-between">
                        <span>Menu Items</span>
                        <span className="text-amber-700 font-bold">Published</span>
                      </div>
                      <div className="text-xs font-bold text-slate-800 leading-snug">
                        {meal.menu_items_ml.join(' • ')}
                      </div>
                      <div className="text-[11px] text-slate-500 italic">
                        {meal.menu_items_en.join(' • ')}
                      </div>
                    </div>

                    {/* Audience Breakdown Grid (PRD Section 9 & 10) */}
                    <div className="mt-3 grid grid-cols-4 gap-1.5 text-center text-xs">
                      <div className="p-2 bg-slate-50 rounded-lg">
                        <span className="text-[10px] font-extrabold text-slate-400 block">Students</span>
                        <span className="font-black text-slate-900">{meal.students_expected}</span>
                      </div>
                      <div className="p-2 bg-slate-50 rounded-lg">
                        <span className="text-[10px] font-extrabold text-slate-400 block">Teachers</span>
                        <span className="font-black text-slate-900">{meal.teachers_expected}</span>
                      </div>
                      <div className="p-2 bg-amber-50 rounded-lg border border-amber-100">
                        <span className="text-[10px] font-extrabold text-amber-700 block">Scholars</span>
                        <span className="font-black text-amber-900">{meal.programme_candidates}</span>
                      </div>
                      <div className="p-2 bg-indigo-50 rounded-lg border border-indigo-100">
                        <span className="text-[10px] font-extrabold text-indigo-700 block">Guests</span>
                        <span className="font-black text-indigo-900">{meal.guests_expected}</span>
                      </div>
                    </div>

                    {/* Kitchen Quantity Formula */}
                    <div className="mt-3 p-2.5 rounded-xl bg-slate-900 text-white flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-extrabold block">
                          Total Audience: {meal.total_expected} (+{meal.buffer_quantity} buf)
                        </span>
                        <span className="font-bold text-amber-400">
                          Recommended: {meal.recommended_portions} portions
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase font-extrabold block">Prepared</span>
                        <span className="text-base font-black text-emerald-400">
                          {meal.prepared_quantity > 0 ? meal.prepared_quantity : '-'}
                        </span>
                      </div>
                    </div>

                    {meal.surplus_quantity > 0 && (
                      <div className="mt-2 text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center justify-between">
                        <span>Surplus Classified:</span>
                        <span>{meal.surplus_quantity} portions</span>
                      </div>
                    )}
                  </div>

                  {/* Operational Action Controls (PRD Section 33 & 91) */}
                  <div className="border-t border-slate-100 pt-3 space-y-2">
                    {meal.status === 'SCHEDULED' && (
                      <Button
                        onClick={() => handleStartPrep(meal)}
                        className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
                      >
                        <Flame className="w-3.5 h-3.5 mr-1" />
                        Start Preparation
                      </Button>
                    )}

                    {meal.status === 'PREPARING' && (
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          onClick={() => {
                            setActiveMealForAction(meal);
                            setActionType('PREP');
                            setPrepQty(meal.recommended_portions);
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                        >
                          <Check className="w-3.5 h-3.5 mr-1" />
                          Mark Ready
                        </Button>
                        <Button
                          onClick={() => {
                            setActiveMealForAction(meal);
                            setActionType('SERVE');
                            setServeQty(meal.total_expected);
                          }}
                          variant="outline"
                          className="border-indigo-300 text-indigo-900 font-bold text-xs"
                        >
                          Record Serving
                        </Button>
                      </div>
                    )}

                    {meal.status === 'READY_TO_SERVE' && (
                      <Button
                        onClick={() => {
                          setActiveMealForAction(meal);
                          setActionType('SERVE');
                          setServeQty(meal.total_expected);
                        }}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
                      >
                        <Utensils className="w-3.5 h-3.5 mr-1" />
                        Record Serving Dispatch
                      </Button>
                    )}

                    {meal.status === 'SERVING' && (
                      <Button
                        onClick={() => {
                          setActiveMealForAction(meal);
                          setActionType('SURPLUS');
                          setSurplusQty(meal.prepared_quantity - meal.served_quantity);
                        }}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                      >
                        <HeartHandshake className="w-3.5 h-3.5 mr-1" />
                        Log Surplus &amp; Complete
                      </Button>
                    )}

                    {meal.status === 'COMPLETED' && (
                      <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg">
                        <span className="flex items-center gap-1 font-bold text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Service Concluded
                        </span>
                        <Link
                          href="/admin/meals/leftovers"
                          className="text-[11px] font-bold text-indigo-600 hover:underline inline-flex items-center"
                        >
                          View Surplus <ChevronRight className="w-3 h-3" />
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal: Mark Prepared */}
      {actionType === 'PREP' && activeMealForAction && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Check className="w-5 h-5 text-emerald-600" />
              Confirm Prepared Quantity ({activeMealForAction.meal_name_en})
            </h3>
            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
              <div className="text-slate-500">Recommended Portions: <span className="font-bold text-slate-900">{activeMealForAction.recommended_portions}</span></div>
              <div className="text-slate-500">Total Expected Audience: <span className="font-bold text-slate-900">{activeMealForAction.total_expected}</span></div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Actual Prepared Portions
              </label>
              <input
                type="number"
                value={prepQty}
                onChange={(e) => setPrepQty(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm font-black"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setActionType(null)}>Cancel</Button>
              <Button size="sm" onClick={handleConfirmPrep} disabled={isSubmitting} className="bg-emerald-600 text-white font-bold">
                {isSubmitting ? 'Saving...' : 'Confirm Preparation'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Record Serving */}
      {actionType === 'SERVE' && activeMealForAction && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Utensils className="w-5 h-5 text-indigo-600" />
              Record Actual Served Quantity
            </h3>
            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
              <div className="text-slate-500">Meal: <span className="font-bold text-slate-900">{activeMealForAction.meal_name_en}</span></div>
              <div className="text-slate-500">Prepared Quantity: <span className="font-bold text-slate-900">{activeMealForAction.prepared_quantity || prepQty}</span></div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Portions Served to Dining Hall &amp; Tables
              </label>
              <input
                type="number"
                value={serveQty}
                onChange={(e) => setServeQty(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm font-black"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setActionType(null)}>Cancel</Button>
              <Button size="sm" onClick={handleConfirmServing} disabled={isSubmitting} className="bg-indigo-600 text-white font-bold">
                {isSubmitting ? 'Saving...' : 'Record Serving'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Log Surplus */}
      {actionType === 'SURPLUS' && activeMealForAction && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <HeartHandshake className="w-5 h-5 text-emerald-600" />
              Log Kitchen Surplus (Phase 4 Integration)
            </h3>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Remaining Portions</label>
              <input
                type="number"
                value={surplusQty}
                onChange={(e) => setSurplusQty(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm font-black"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Classification</label>
                <select
                  value={surplusClass}
                  onChange={(e) => setSurplusClass(e.target.value as SurplusClassification)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold"
                >
                  <option value="EDIBLE_SURPLUS">Edible Surplus (Safe)</option>
                  <option value="UNUSABLE_FOOD">Unusable / Plate Leftover</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Destination</label>
                <select
                  value={surplusDest}
                  onChange={(e) => setSurplusDest(e.target.value as SurplusDestination)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold"
                >
                  <option value="DONATION">Charity / Donation</option>
                  <option value="STORAGE">Chilled Storage</option>
                  <option value="APPROVED_REUSE">Approved Kitchen Reuse</option>
                  <option value="DISPOSAL">Controlled Disposal</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Notes / Quality Verification</label>
              <textarea
                value={surplusNote}
                onChange={(e) => setSurplusNote(e.target.value)}
                placeholder="Inspected by head cook, hygienically packed..."
                rows={2}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-medium"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setActionType(null)}>Cancel</Button>
              <Button size="sm" onClick={handleConfirmSurplus} disabled={isSubmitting} className="bg-emerald-600 text-white font-bold">
                {isSubmitting ? 'Logging...' : 'Confirm & Log Surplus'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: New Special Order */}
      {actionType === 'NEW_ORDER' && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Plus className="w-5 h-5 text-amber-600" />
              Create Special / Party Meal Request (PRD Section 19)
            </h3>
            <form onSubmit={handleCreateOrder} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Request Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Arabic Department Seminar Lunch"
                  value={orderTitle}
                  onChange={(e) => setOrderTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Meal Slot *</label>
                  <select
                    value={orderSlot}
                    onChange={(e) => setOrderSlot(e.target.value as MealSlot)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold"
                  >
                    <option value="BREAKFAST">Breakfast</option>
                    <option value="LUNCH">Lunch</option>
                    <option value="EVENING_SNACKS">Evening Snacks</option>
                    <option value="DINNER">Dinner</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Quantity *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={orderQty}
                    onChange={(e) => setOrderQty(parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Requester Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Prof. Faisal Hameed"
                    value={orderRequester}
                    onChange={(e) => setOrderRequester(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Audience Type</label>
                  <select
                    value={orderAudience}
                    onChange={(e) => setOrderAudience(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold"
                  >
                    <option value="PROGRAMME">Academic Programme</option>
                    <option value="GUEST">Official Guests / Delegation</option>
                    <option value="SEMINAR">Conference / Seminar</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Special Dietary / Serving Requirements</label>
                <textarea
                  value={orderRequirements}
                  onChange={(e) => setOrderRequirements(e.target.value)}
                  placeholder="e.g. Deliver to Faculty Hall at 1:00 PM, vegetarian option for 3 guests..."
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setActionType(null)}>Cancel</Button>
                <Button size="sm" type="submit" disabled={isSubmitting} className="bg-amber-600 text-white font-bold">
                  {isSubmitting ? 'Submitting...' : 'Submit Special Order'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
