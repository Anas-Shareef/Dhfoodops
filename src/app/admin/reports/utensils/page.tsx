'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getUtensilProvider } from '@/lib/utensils/provider';
import { UtensilsSubnav } from '@/components/admin/utensils-subnav';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCcw,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  FileSpreadsheet,
  Clock,
  Wrench,
  Trash2,
  MapPin,
  Layers,
  ArrowRight
} from 'lucide-react';

export default function UtensilReportsPage() {
  const [reportData, setReportData] = useState<{
    daily: { tablesOperated: number; distributed: number; returned: number; missing: number; misplaced: number; recovered: number; recoveryRate: string };
    weekly: { tableDiscrepancies: { tableNumber: number; incidents: number }[]; repeatedDiscrepancies: number };
    monthly: { totalMissing: number; totalRecovered: number; broken: number; discarded: number };
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const provider = getUtensilProvider();
      const data = await provider.getReports();
      setReportData(data);
    } catch (err) {
      console.error('Failed to load reports', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      <UtensilsSubnav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                Phase 7 &amp; PRD Section 50 • Utensil Ledger Reports
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 mt-1">
              <BarChart3 className="w-6 h-6 text-indigo-600" />
              Dining Utensil Accountability &amp; Recovery Reports
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Operational analysis across Daily, Weekly, and Monthly dining cycles. Tracking Cross-Table Misplacement, Damage, Breakage, Recovery Speed, and Disposal Approvals without individual student blame.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={loadData}
              className="text-xs font-semibold"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              Refresh Analytics
            </Button>
          </div>
        </div>

        {/* 1. Daily Operational Snapshot */}
        {reportData && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Daily Operational Report (Today)
              </h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Tables Operated</span>
                <span className="text-xl font-black text-slate-900 mt-0.5 block">{reportData.daily.tablesOperated}</span>
                <span className="text-[10px] text-slate-400">All 24 Tables</span>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[10px] font-bold text-indigo-600 uppercase block">Distributed</span>
                <span className="text-xl font-black text-indigo-700 mt-0.5 block">{reportData.daily.distributed}</span>
                <span className="text-[10px] text-indigo-400">Plates/Glasses/Jugs</span>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[10px] font-bold text-emerald-600 uppercase block">Returned</span>
                <span className="text-xl font-black text-emerald-700 mt-0.5 block">{reportData.daily.returned}</span>
                <span className="text-[10px] text-emerald-500">Collected post-dining</span>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[10px] font-bold text-amber-600 uppercase block">Misplaced</span>
                <span className="text-xl font-black text-amber-700 mt-0.5 block">{reportData.daily.misplaced}</span>
                <span className="text-[10px] text-amber-500">Neighbouring tables</span>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[10px] font-bold text-rose-600 uppercase block">Missing</span>
                <span className="text-xl font-black text-rose-700 mt-0.5 block">{reportData.daily.missing}</span>
                <span className="text-[10px] text-rose-400">In physical search</span>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[10px] font-bold text-purple-600 uppercase block">Recovered</span>
                <span className="text-xl font-black text-purple-700 mt-0.5 block">{reportData.daily.recovered}</span>
                <span className="text-[10px] text-purple-400">Returned to origin</span>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[10px] font-bold text-emerald-600 uppercase block">Recovery Rate</span>
                <span className="text-xl font-black text-emerald-700 mt-0.5 block">{reportData.daily.recoveryRate}</span>
                <span className="text-[10px] text-emerald-500">Reconciliation efficiency</span>
              </div>
            </div>
          </div>
        )}

        {/* 2. Phase 7 Specific: Cross-Table Misplacement Matrix & Recovery Speed */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border border-slate-200 shadow-xs bg-white">
            <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Cross-Table Misplacement Flow (PRD Section 50)
                </h3>
              </div>
              <Badge className="bg-amber-50 text-amber-800 border-amber-200 font-bold text-[10px]">
                Active Matrix
              </Badge>
            </CardHeader>

            <CardContent className="p-5 space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800">Source: Table 31</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-bold text-indigo-700">Found: Table 32</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-medium">1x Drinking Glass</span>
                  <Badge className="bg-sky-100 text-sky-800 text-[10px]">Overage Detected</Badge>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800">Source: Table 14</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-bold text-indigo-700">Found: Table 15</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-medium">1x Water Jug</span>
                  <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">Recovered in 45m</Badge>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800">Source: Table 21</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-bold text-indigo-700">Found: Table 22</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-medium">2x Dining Plates</span>
                  <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">Recovered in 15m</Badge>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 mt-2">
                <p className="font-bold">Cross-Table Operational Finding</p>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  Over 90% of misplaced utensils migrate between adjacent tables sharing the same floor aisle (e.g. Table 31 ↔ Table 32). Stamped table numbering accelerates recovery.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Damage, Breakage & Disposal Governance */}
          <Card className="border border-slate-200 shadow-xs bg-white">
            <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-purple-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Damage, Breakage &amp; Disposal Audit (PRD Sec 17–20)
                </h3>
              </div>
              <Badge className="bg-purple-50 text-purple-800 border-purple-200 font-bold text-[10px]">
                Authorized Log
              </Badge>
            </CardHeader>

            <CardContent className="p-5 space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-800 block">Table 24 — Dining Plate</span>
                  <span className="text-[11px] text-slate-500">Chipped edge • In maintenance review</span>
                </div>
                <Badge className="bg-purple-100 text-purple-800 text-[10px] font-bold">
                  Repair Required
                </Badge>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-800 block">Table 18 — Drinking Glass</span>
                  <span className="text-[11px] text-slate-500">Shattered during cleaning</span>
                </div>
                <Badge className="bg-slate-200 text-slate-800 text-[10px] font-bold">
                  Broken (Pending Approval)
                </Badge>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-800 block">Table 11 — Drinking Glass</span>
                  <span className="text-[11px] text-slate-500">Approved by Supervisor Shafi on 23 Sep</span>
                </div>
                <Badge className="bg-slate-100 text-slate-600 text-[10px] font-bold">
                  Officially Discarded
                </Badge>
              </div>

              <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200 text-xs text-purple-900 mt-2">
                <p className="font-bold">Strict Disposal Authorization Rule</p>
                <p className="text-[11px] text-purple-800 mt-0.5">
                  Phase 7 strictly forbids suppliers or auto-scripts from silently discarding utensils. Permanent write-offs require formal supervisor justification.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 3. Weekly & Monthly Analytics Section */}
        {reportData && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Weekly Analytics */}
            <Card className="border border-slate-200 shadow-xs bg-white">
              <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Weekly Incident Distribution
                  </h3>
                </div>
                <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 font-bold text-[10px]">
                  Last 7 Days
                </Badge>
              </CardHeader>

              <CardContent className="p-5 space-y-4">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Repeated Discrepancies</span>
                    <span className="text-[11px] text-slate-500">Tables with more than 1 shortage incident</span>
                  </div>
                  <span className="text-xl font-black text-indigo-700">
                    {reportData.weekly.repeatedDiscrepancies}
                  </span>
                </div>

                <div>
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                    Incidents by Table Marking
                  </span>
                  <div className="space-y-2">
                    {reportData.weekly.tableDiscrepancies.map((td) => (
                      <div
                        key={td.tableNumber}
                        className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <span className="font-bold text-slate-900">Table {td.tableNumber}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500">{td.incidents} incident(s)</span>
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-sm font-bold">
                            Resolved
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Monthly Loss & Damage Analytics */}
            <Card className="border border-slate-200 shadow-xs bg-white">
              <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Monthly Institutional Ledger (September 2026)
                  </h3>
                </div>
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-[10px]">
                  Monthly Audit
                </Badge>
              </CardHeader>

              <CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-500 font-medium block">Total Missing Incidents</span>
                    <span className="text-xl font-black text-slate-900 mt-1 block">
                      {reportData.monthly.totalMissing}
                    </span>
                    <span className="text-[10px] text-slate-400">Across dining hall</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-emerald-700 font-medium block">Total Items Recovered</span>
                    <span className="text-xl font-black text-emerald-700 mt-1 block">
                      {reportData.monthly.totalRecovered}
                    </span>
                    <span className="text-[10px] text-emerald-600">Cross-table returns</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-purple-700 font-medium block">Broken / Shattered</span>
                    <span className="text-xl font-black text-purple-800 mt-1 block">
                      {reportData.monthly.broken}
                    </span>
                    <span className="text-[10px] text-purple-500">Unusable</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-600 font-medium block">Officially Discarded</span>
                    <span className="text-xl font-black text-slate-800 mt-1 block">
                      {reportData.monthly.discarded}
                    </span>
                    <span className="text-[10px] text-slate-400">Written off</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200 text-xs text-indigo-900">
                  <p className="font-bold">Institutional Accountability Principle</p>
                  <p className="text-[11px] text-indigo-800 mt-0.5 leading-relaxed">
                    Physical utensils are marked with ownership table numbers. Over 85% of discrepancies result from dining table misplacement rather than permanent loss.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
