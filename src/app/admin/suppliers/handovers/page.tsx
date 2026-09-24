'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getSupplierProvider } from '@/lib/suppliers/provider';
import { SupplierHandover } from '@/types/database';
import { SupplierSubnav } from '@/components/admin/supplier-subnav';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeftRight, 
  CheckCircle2, 
  RefreshCw, 
  Search, 
  UserCheck, 
  ShieldCheck,
  Clock
} from 'lucide-react';
import { formatTimeIST } from '@/lib/utils/timezone';

export default function SupplierHandoversPage() {
  const [handovers, setHandovers] = useState<SupplierHandover[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const provider = getSupplierProvider();
    const data = await provider.getHandovers();
    setHandovers(data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredHandovers = handovers.filter((h) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchTable = `table ${h.table?.table_number}`.toLowerCase().includes(q) || String(h.table?.table_number).includes(q);
    const matchFrom = h.from_student?.name?.toLowerCase().includes(q) || h.from_student?.enrollment_no?.toLowerCase().includes(q);
    const matchTo = h.to_student?.name?.toLowerCase().includes(q) || h.to_student?.enrollment_no?.toLowerCase().includes(q);
    const matchReason = h.reason?.toLowerCase().includes(q);
    return matchTable || matchFrom || matchTo || matchReason;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block">
            Phase 3 • Duty Accountability &amp; Audit
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 mt-0.5">
            <ArrowLeftRight className="w-6 h-6 text-indigo-600" />
            Supplier Handover Audit Trail
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Complete institutional audit log of all table duty transfers and supervisor authorizations
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={() => loadData()} disabled={isLoading} className="font-semibold text-xs">
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Log
        </Button>
      </div>

      {/* 2. Subnav */}
      <SupplierSubnav />

      {/* 3. Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search Supplier, Table #, Reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <span className="text-xs text-slate-500 font-semibold">
          {handovers.length} Total Handover Records
        </span>
      </div>

      {/* 4. Table Audit List */}
      <Card className="bg-white border-slate-200 shadow-xs overflow-hidden">
        {filteredHandovers.length === 0 ? (
          <div className="p-8 text-center">
            <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-800">No Handover Transfers Recorded Yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              When a table duty is transferred between students, an immutable audit entry will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Timestamp (IST)</th>
                  <th className="py-3 px-4">Table</th>
                  <th className="py-3 px-4">Relieved Supplier (From)</th>
                  <th className="py-3 px-4">New Supplier (To)</th>
                  <th className="py-3 px-4">Authorized Reason</th>
                  <th className="py-3 px-4">Supervisor</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHandovers.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-600 whitespace-nowrap">
                      {new Date(h.handed_over_at).toLocaleDateString('en-GB')} {formatTimeIST(h.handed_over_at)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-black text-slate-900">Table {h.table?.table_number || '-'}</span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-800">{h.from_student?.name || 'Unknown'}</p>
                      <p className="text-[10px] text-slate-500 font-mono">ID: {h.from_student?.enrollment_no}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-indigo-700">{h.to_student?.name || 'Unknown'}</p>
                      <p className="text-[10px] text-slate-500 font-mono">ID: {h.to_student?.enrollment_no}</p>
                    </td>
                    <td className="py-3 px-4 text-slate-700 max-w-xs">
                      {h.reason}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      Supervisor Verified
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-[10px]">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Completed
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
