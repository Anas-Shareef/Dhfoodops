'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getFoodPlanningProvider } from '@/lib/food/provider';
import { 
  MealLeftoverRecord, 
  FoodSurplusRecord, 
  SurplusClassification, 
  SurplusDestination, 
  FoodQualityStatus, 
  DonationStatus, 
  WasteReason,
  MealSlot
} from '@/types/database';
import { MealsSubnav } from '@/components/admin/meals-subnav';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Archive, 
  Trash2, 
  CheckCircle2, 
  Search, 
  RefreshCw, 
  Info, 
  HeartHandshake,
  ShieldCheck,
  AlertTriangle,
  PlusCircle,
  FileCheck,
  X,
  Package,
  Layers,
  ArrowRight,
  UserCheck
} from 'lucide-react';
import { formatTimeIST } from '@/lib/utils/timezone';
import { MEAL_SLOT_CONFIGS } from '@/lib/food/menu-provider';

export default function LeftoverAndSurplusPage() {
  const [activeTab, setActiveTab] = useState<'surplus' | 'donations'>('surplus');
  const [leftoverRecords, setLeftoverRecords] = useState<MealLeftoverRecord[]>([]);
  const [surplusRecords, setSurplusRecords] = useState<FoodSurplusRecord[]>([]);
  const [stats, setStats] = useState({
    totalPrepared: 320,
    totalServed: 292,
    totalSurplus: 28,
    donated: 12,
    stored: 8,
    reused: 4,
    discarded: 4,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDestination, setSelectedDestination] = useState<string>('all');

  // Modals
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [actionDonation, setActionDonation] = useState<FoodSurplusRecord | null>(null);
  const [approverName, setApproverName] = useState('Senior Dining Supervisor');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New Record Form
  const [newSurplus, setNewSurplus] = useState({
    food_name: 'White Rice & Dal Curry',
    meal_slot: 'LUNCH' as MealSlot,
    quantity: 10,
    unit: 'kg',
    classification: 'EDIBLE_SURPLUS' as SurplusClassification,
    destination: 'DONATION' as SurplusDestination,
    quality_status: 'ELIGIBLE' as FoodQualityStatus,
    quality_assessed_by: 'Staff Food Inspector (Rahman)',
    waste_reason: 'LOW_ATTENDANCE' as WasteReason,
    recipient_org: 'Anjuman Welfare Home & Orphanage',
    notes: 'Hot and freshly stored in insulated thermal containers within 30 min of service cutoff.',
  });

  const provider = getFoodPlanningProvider();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [leftovers, surplus, statData] = await Promise.all([
        provider.getAllLeftoverRecords(),
        provider.getFoodSurplusRecords(),
        provider.getFoodSurplusStats(),
      ]);
      setLeftoverRecords(leftovers);
      setSurplusRecords(surplus);
      setStats({
        totalPrepared: statData.totalPrepared,
        totalServed: statData.totalServed,
        totalSurplus: statData.totalSurplus,
        donated: statData.totalDonated,
        stored: statData.totalStored,
        reused: statData.totalReused,
        discarded: statData.totalDiscarded,
      });
    } catch (err) {
      console.error('Failed to load leftovers/surplus data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [provider]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRecordSurplus = async () => {
    try {
      await provider.recordFoodSurplus({
        food_name: newSurplus.food_name,
        meal_slot: newSurplus.meal_slot,
        quantity: Number(newSurplus.quantity),
        unit: newSurplus.unit as any,
        classification: newSurplus.classification,
        destination: newSurplus.classification === 'UNUSABLE_FOOD' ? 'DISPOSAL' : newSurplus.destination,
        quality_status: newSurplus.classification === 'UNUSABLE_FOOD' ? 'NOT_ELIGIBLE' : newSurplus.quality_status,
        quality_assessed_by: newSurplus.quality_assessed_by,
        waste_reason: newSurplus.waste_reason,
        recipient_org: newSurplus.destination === 'DONATION' ? newSurplus.recipient_org : undefined,
        notes: newSurplus.notes,
        recorded_by_name: newSurplus.quality_assessed_by,
      });

      setFeedback({ type: 'success', text: `Food Surplus (${newSurplus.quantity} ${newSurplus.unit}) recorded with safety verification audit.` });
      setShowRecordModal(false);
      await loadData();
    } catch (err) {
      setFeedback({ type: 'error', text: 'Failed to record food surplus.' });
    }
  };

  const handleApproveDonation = async (recordId: string) => {
    try {
      await provider.approveDonation(recordId, approverName);
      setFeedback({ type: 'success', text: 'Donation approved safely by authorized supervisor.' });
      setActionDonation(null);
      await loadData();
    } catch (err) {
      setFeedback({ type: 'error', text: 'Failed to approve donation.' });
    }
  };

  const handleCompleteDonation = async (recordId: string) => {
    try {
      await provider.completeDonation(recordId);
      setFeedback({ type: 'success', text: 'Donation handover verified and marked as DONATED.' });
      setActionDonation(null);
      await loadData();
    } catch (err) {
      setFeedback({ type: 'error', text: 'Failed to complete donation.' });
    }
  };

  const filteredSurplus = surplusRecords.filter((r) => {
    if (selectedDestination !== 'all' && r.destination !== selectedDestination) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchFood = r.food_name?.toLowerCase().includes(q);
      const matchNotes = r.notes?.toLowerCase().includes(q);
      const matchOrg = r.recipient_org?.toLowerCase().includes(q);
      return matchFood || matchNotes || matchOrg;
    }
    return true;
  });

  const donationRecords = surplusRecords.filter((r) => r.destination === 'DONATION');

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
              PRD Sections 23–37 • Food Surplus &amp; Safe Donation
            </span>
            <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" /> Human Safety Certified
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Archive className="w-6 h-6 text-amber-600" />
            Food Surplus &amp; Waste Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Controlled classification of edible surplus vs unusable waste, reason analysis, and human-authorized donation workflows.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            onClick={() => setShowRecordModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1.5 shadow-xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Record Food Surplus
          </Button>
          <Button variant="outline" size="sm" onClick={() => loadData()} disabled={isLoading} className="font-semibold text-xs">
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* 2. Subnav */}
      <MealsSubnav />

      {/* 3. Feedback Banner */}
      {feedback && (
        <div className={`p-4 rounded-xl flex items-center justify-between border ${
          feedback.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center gap-2 text-sm font-medium">
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-xs font-semibold hover:opacity-75">
            Dismiss
          </button>
        </div>
      )}

      {/* 4. Complete Lifecycle Food KPIs (PRD Section 34) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-3">
            <p className="text-[10px] font-bold uppercase text-slate-400">Total Prepared</p>
            <p className="text-lg font-black text-slate-800 mt-0.5">{stats.totalPrepared} <span className="text-[10px] font-normal text-slate-400">kg</span></p>
            <span className="text-[10px] text-slate-500 font-medium">Kitchen production</span>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-3">
            <p className="text-[10px] font-bold uppercase text-slate-400">Total Served</p>
            <p className="text-lg font-black text-slate-800 mt-0.5">{stats.totalServed} <span className="text-[10px] font-normal text-slate-400">kg</span></p>
            <span className="text-[10px] text-slate-500 font-medium">Dining consumption</span>
          </CardContent>
        </Card>

        <Card className="bg-amber-50/70 border-amber-200 shadow-xs">
          <CardContent className="p-3">
            <p className="text-[10px] font-bold uppercase text-amber-700">Total Surplus</p>
            <p className="text-lg font-black text-amber-800 mt-0.5">{stats.totalSurplus} <span className="text-[10px] font-normal text-amber-600">kg</span></p>
            <span className="text-[10px] text-amber-700 font-medium">Post-meal remaining</span>
          </CardContent>
        </Card>

        <Card className="bg-indigo-50/70 border-indigo-200 shadow-xs">
          <CardContent className="p-3">
            <p className="text-[10px] font-bold uppercase text-indigo-700">Donated</p>
            <p className="text-lg font-black text-indigo-800 mt-0.5">{stats.donated} <span className="text-[10px] font-normal text-indigo-600">kg</span></p>
            <span className="text-[10px] text-indigo-700 font-medium">Welfare / Homes</span>
          </CardContent>
        </Card>

        <Card className="bg-emerald-50/70 border-emerald-200 shadow-xs">
          <CardContent className="p-3">
            <p className="text-[10px] font-bold uppercase text-emerald-700">Stored Safely</p>
            <p className="text-lg font-black text-emerald-800 mt-0.5">{stats.stored} <span className="text-[10px] font-normal text-emerald-600">kg</span></p>
            <span className="text-[10px] text-emerald-700 font-medium">Refrigerated / Saved</span>
          </CardContent>
        </Card>

        <Card className="bg-teal-50/70 border-teal-200 shadow-xs">
          <CardContent className="p-3">
            <p className="text-[10px] font-bold uppercase text-teal-700">Approved Reuse</p>
            <p className="text-lg font-black text-teal-800 mt-0.5">{stats.reused} <span className="text-[10px] font-normal text-teal-600">kg</span></p>
            <span className="text-[10px] text-teal-700 font-medium">Repurposed in menu</span>
          </CardContent>
        </Card>

        <Card className="bg-rose-50/70 border-rose-200 shadow-xs">
          <CardContent className="p-3">
            <p className="text-[10px] font-bold uppercase text-rose-700">Discarded Waste</p>
            <p className="text-lg font-black text-rose-800 mt-0.5">{stats.discarded} <span className="text-[10px] font-normal text-rose-600">kg</span></p>
            <span className="text-[10px] text-rose-700 font-medium">Unfit / Disposed</span>
          </CardContent>
        </Card>
      </div>

      {/* 5. Food Safety Policy Callout (PRD Section 62) */}
      <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-start gap-3 shadow-xs">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <div className="font-bold text-sm text-slate-100 flex items-center gap-2">
            Institutional Food Safety Verification (PRD Section 62)
          </div>
          <p className="text-slate-300 leading-relaxed">
            The software records authorized institutional and human decisions. It does not automatically certify food as medically safe. 
            All edible surplus designated for donation must be physically inspected by authorized dining staff, sealed in compliant containers, 
            and approved by an authorized supervisor before transfer.
          </p>
        </div>
      </div>

      {/* 6. Tabs & Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Dual Mode Tabs */}
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setActiveTab('surplus')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'surplus'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            Surplus &amp; Leftovers Inventory ({surplusRecords.length})
          </button>
          <button
            onClick={() => setActiveTab('donations')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'donations'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <HeartHandshake className="w-3.5 h-3.5" />
            Safe Donation Workflow ({donationRecords.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search food item, recipient, reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* TAB 1: ALL SURPLUS & LEFTOVERS INVENTORY */}
      {activeTab === 'surplus' && (
        <Card className="bg-white border-slate-200 shadow-xs overflow-hidden">
          {/* Destination Pills */}
          <div className="p-3 border-b border-slate-100 flex items-center gap-2 overflow-x-auto text-xs bg-slate-50/50">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mr-1">Filter Destination:</span>
            {['all', 'DONATION', 'STORAGE', 'APPROVED_REUSE', 'DISPOSAL'].map((d) => (
              <button
                key={d}
                onClick={() => setSelectedDestination(d)}
                className={`px-3 py-1 rounded-md text-[11px] font-bold uppercase transition-all ${
                  selectedDestination === d
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Recorded At</th>
                  <th className="py-3 px-4">Meal Slot</th>
                  <th className="py-3 px-4">Food Item</th>
                  <th className="py-3 px-4">Surplus Qty</th>
                  <th className="py-3 px-4">Classification</th>
                  <th className="py-3 px-4">Quality &amp; Assessor</th>
                  <th className="py-3 px-4">Destination &amp; Reason</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSurplus.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400">
                      No surplus records matching selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredSurplus.map((r) => {
                    const isWaste = r.classification === 'UNUSABLE_FOOD';
                    const isEligible = r.quality_status === 'ELIGIBLE';

                    return (
                      <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-slate-500 whitespace-nowrap">
                          {formatTimeIST(r.recorded_at)}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-[11px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200/60">
                            {r.meal_slot ? (MEAL_SLOT_CONFIGS[r.meal_slot]?.labelEn || r.meal_slot) : 'Meal Service'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900">{r.food_name || 'Meal Item'}</span>
                        </td>
                        <td className="py-3 px-4 font-black text-slate-800">
                          {r.quantity} {r.unit}
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            className={`font-bold text-[10px] uppercase ${
                              isWaste
                                ? 'bg-rose-100 text-rose-800 border-rose-200'
                                : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            }`}
                          >
                            {r.classification.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                              isEligible ? 'text-emerald-700' : 'text-slate-500'
                            }`}>
                              {isEligible ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <AlertTriangle className="w-3 h-3 text-amber-500" />}
                              {r.quality_status}
                            </span>
                            <div className="text-[10px] text-slate-400 mt-0.5">By {r.quality_assessed_by || 'Staff'}</div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800">{r.destination}</div>
                          <div className="text-[10px] text-slate-400">Reason: {r.waste_reason ? r.waste_reason.replace('_', ' ') : 'General Surplus'}</div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {r.destination === 'DONATION' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setActionDonation(r);
                              }}
                              className="text-[11px] h-7 font-bold text-indigo-700 border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100"
                            >
                              Donation Review
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 2: SAFE FOOD DONATION WORKFLOW (PRD Section 27-30) */}
      {activeTab === 'donations' && (
        <div className="space-y-4">
          <div className="p-4 bg-indigo-50/80 border border-indigo-200 rounded-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-indigo-950">Controlled Food Donation Protocol</h3>
                <p className="text-xs text-indigo-700">
                  Surplus food verified as ELIGIBLE by authorized staff is dispatched to verified partner institutions without compromising safety.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 bg-white text-indigo-800 text-xs font-bold rounded-lg border border-indigo-200">
              {donationRecords.length} Active Records
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {donationRecords.map((d) => {
              const isApproved = d.donation_status === 'APPROVED';
              const isDonated = d.donation_status === 'DONATED';
              const isPending = d.donation_status === 'PENDING_REVIEW';

              return (
                <div key={d.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {d.meal_slot ? (MEAL_SLOT_CONFIGS[d.meal_slot]?.labelEn || d.meal_slot) : 'Meal Service'} · {formatTimeIST(d.recorded_at)}
                        </span>
                        <h4 className="text-base font-bold text-slate-900 mt-0.5">{d.food_name}</h4>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        isDonated 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : isApproved 
                          ? 'bg-indigo-100 text-indigo-800' 
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {d.donation_status}
                      </span>
                    </div>

                    {/* Quantity & Recipient */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Quantity Allocated:</span>
                        <span className="font-black text-slate-800">{d.quantity} {d.unit}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Destination / Recipient:</span>
                        <span className="font-bold text-indigo-700">{d.recipient_org || 'Registered Welfare Org'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Safety Check:</span>
                        <span className="font-bold text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          {d.quality_status} (by {d.quality_assessed_by})
                        </span>
                      </div>
                    </div>

                    {/* Notes */}
                    {(d.notes || d.destination_notes) && (
                      <p className="text-[11px] text-slate-500 italic bg-amber-50/50 p-2 rounded-lg border border-amber-100">
                        {d.notes || d.destination_notes}
                      </p>
                    )}

                    {/* Approver Details */}
                    {(d.approved_by_name || d.approved_by) && (
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                        Approved by <strong>{d.approved_by_name || d.approved_by}</strong> at {d.approved_at ? formatTimeIST(d.approved_at) : 'recently'}
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    {isPending && (
                      <Button
                        size="sm"
                        onClick={() => handleApproveDonation(d.id)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Approve Donation
                      </Button>
                    )}

                    {isApproved && (
                      <Button
                        size="sm"
                        onClick={() => handleCompleteDonation(d.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Verify Handover &amp; Complete
                      </Button>
                    )}

                    {isDonated && (
                      <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Completed &amp; Handed Over
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL 1: RECORD FOOD SURPLUS */}
      {showRecordModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Post-Meal Food Logging</span>
                <h3 className="text-base font-bold text-white">Record Food Surplus / Waste</h3>
              </div>
              <button onClick={() => setShowRecordModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Food Item Name *</label>
                <input
                  type="text"
                  value={newSurplus.food_name}
                  onChange={(e) => setNewSurplus({ ...newSurplus, food_name: e.target.value })}
                  className="w-full text-sm p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Meal Slot *</label>
                  <select
                    value={newSurplus.meal_slot}
                    onChange={(e) => setNewSurplus({ ...newSurplus, meal_slot: e.target.value as MealSlot })}
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    <option value="EARLY_MORNING_SNACKS">Early Morning Tea &amp; Snacks</option>
                    <option value="BREAKFAST">Breakfast</option>
                    <option value="LUNCH">Lunch</option>
                    <option value="EVENING_SNACKS">Evening Snacks</option>
                    <option value="DINNER">Dinner</option>
                  </select>
                </div>

                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Quantity *</label>
                    <input
                      type="number"
                      min={0.5}
                      step={0.5}
                      value={newSurplus.quantity}
                      onChange={(e) => setNewSurplus({ ...newSurplus, quantity: Number(e.target.value) })}
                      className="w-full text-sm p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                    />
                  </div>
                  <div className="w-24">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Unit</label>
                    <select
                      value={newSurplus.unit}
                      onChange={(e) => setNewSurplus({ ...newSurplus, unit: e.target.value })}
                      className="w-full text-sm p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    >
                      <option value="kg">kg</option>
                      <option value="litres">litres</option>
                      <option value="portions">portions</option>
                      <option value="pieces">pieces</option>
                      <option value="packets">packets</option>
                      <option value="trays">trays</option>
                      <option value="cups">cups</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Classification */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Surplus Classification</label>
                  <select
                    value={newSurplus.classification}
                    onChange={(e) => setNewSurplus({ ...newSurplus, classification: e.target.value as SurplusClassification })}
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                  >
                    <option value="EDIBLE_SURPLUS">EDIBLE SURPLUS (Safe for use/donation)</option>
                    <option value="UNUSABLE_FOOD">UNUSABLE FOOD (Waste/Expired/Discard)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Planned Destination</label>
                  <select
                    value={newSurplus.destination}
                    onChange={(e) => setNewSurplus({ ...newSurplus, destination: e.target.value as SurplusDestination })}
                    disabled={newSurplus.classification === 'UNUSABLE_FOOD'}
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    <option value="DONATION">DONATION (Charity / Welfare)</option>
                    <option value="STORAGE">STORAGE (Cold storage / Next meal)</option>
                    <option value="APPROVED_REUSE">APPROVED REUSE (Snack conversion)</option>
                    <option value="DISPOSAL">DISPOSAL (Waste bin)</option>
                  </select>
                </div>
              </div>

              {/* Human Assessment */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Human Food Quality Assessment (PRD Section 30 &amp; 62)
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Quality Assessment Result</label>
                    <select
                      value={newSurplus.quality_status}
                      onChange={(e) => setNewSurplus({ ...newSurplus, quality_status: e.target.value as FoodQualityStatus })}
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 font-bold"
                    >
                      <option value="ELIGIBLE">ELIGIBLE (Safe for human consumption)</option>
                      <option value="NOT_ELIGIBLE">NOT ELIGIBLE (Unsafe / Degraded)</option>
                      <option value="NOT_ASSESSED">NOT ASSESSED</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Authorized Assessor *</label>
                    <input
                      type="text"
                      value={newSurplus.quality_assessed_by}
                      onChange={(e) => setNewSurplus({ ...newSurplus, quality_assessed_by: e.target.value })}
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Reason Analysis */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Primary Waste/Surplus Reason</label>
                  <select
                    value={newSurplus.waste_reason}
                    onChange={(e) => setNewSurplus({ ...newSurplus, waste_reason: e.target.value as WasteReason })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 font-medium"
                  >
                    <option value="LOW_ATTENDANCE">LOW ATTENDANCE (Fewer students)</option>
                    <option value="OVER_PREPARATION">OVER PREPARATION (Excess batch)</option>
                    <option value="UNEXPECTED_ABSENCE">UNEXPECTED ABSENCE</option>
                    <option value="MENU_CHANGE">MENU CHANGE</option>
                    <option value="SPECIAL_EVENT">SPECIAL EVENT</option>
                    <option value="COOKING_VARIANCE">COOKING VARIANCE</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Recipient Org (if Donation)</label>
                  <input
                    type="text"
                    value={newSurplus.recipient_org}
                    onChange={(e) => setNewSurplus({ ...newSurplus, recipient_org: e.target.value })}
                    disabled={newSurplus.destination !== 'DONATION'}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 font-medium"
                    placeholder="e.g. Local Shelter or Orphanage"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Handling Notes &amp; Temperature Conditions</label>
                <textarea
                  rows={2}
                  value={newSurplus.notes}
                  onChange={(e) => setNewSurplus({ ...newSurplus, notes: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200"
                  placeholder="e.g. Stored in hot containers at 65°C immediately after meal."
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <Button variant="outline" size="sm" onClick={() => setShowRecordModal(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleRecordSurplus} className="bg-indigo-600 hover:bg-indigo-700 font-bold">
                Save Surplus Record
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: DONATION ACTION / APPROVAL */}
      {actionDonation && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-indigo-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HeartHandshake className="w-5 h-5 text-indigo-300" />
                <h3 className="text-base font-bold text-white">Donation Review</h3>
              </div>
              <button onClick={() => setActionDonation(null)} className="text-indigo-300 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 text-xs text-indigo-900">
                <strong>Item:</strong> {actionDonation.food_name || actionDonation.food_item?.name || 'Meal Portion'} ({actionDonation.quantity} {actionDonation.unit})
                <br />
                <strong>Recipient:</strong> {actionDonation.recipient_org || actionDonation.donation_recipient || 'Welfare Organization'}
                <br />
                <strong>Current Status:</strong> {actionDonation.donation_status}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Supervisor Approver Name *
                </label>
                <input
                  type="text"
                  value={approverName}
                  onChange={(e) => setApproverName(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div className="flex flex-col gap-2 pt-2">
                {actionDonation.donation_status === 'PENDING_REVIEW' && (
                  <Button
                    onClick={() => handleApproveDonation(actionDonation.id)}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
                  >
                    Approve Safe Donation
                  </Button>
                )}

                {actionDonation.donation_status === 'APPROVED' && (
                  <Button
                    onClick={() => handleCompleteDonation(actionDonation.id)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                  >
                    Confirm Recipient Handover (Mark Donated)
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={() => setActionDonation(null)}
                  className="w-full text-xs font-semibold"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
