'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { getRolesProvider } from '@/lib/auth/roles-provider';
import { SecurityAuditEvent } from '@/types/database';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ShieldCheck, 
  Search, 
  Clock, 
  RotateCcw, 
  Users, 
  Key, 
  Filter, 
  ArrowRight,
  ShieldAlert,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export default function SecurityAuditPage() {
  const [logs, setLogs] = useState<SecurityAuditEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const provider = getRolesProvider();
      const allLogs = await provider.getSecurityAuditLogs();
      setLogs(allLogs);
    } catch (err) {
      console.error('Failed to load audit logs', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        l.actor_name.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q) ||
        l.target_entity_type.toLowerCase().includes(q) ||
        (l.reason || '').toLowerCase().includes(q);

      const matchesAction = actionFilter === 'ALL' ? true : l.action === actionFilter;
      return matchesSearch && matchesAction;
    });
  }, [logs, searchQuery, actionFilter]);

  const getActionBadge = (action: string) => {
    if (action.includes('ASSIGN')) {
      return <Badge className="bg-indigo-100 text-indigo-900 border-indigo-200 text-[10px] font-bold">{action}</Badge>;
    }
    if (action.includes('APPROVED')) {
      return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-bold">{action}</Badge>;
    }
    if (action.includes('DEACTIVATED') || action.includes('CANCEL')) {
      return <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-[10px] font-bold">{action}</Badge>;
    }
    return <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[10px]">{action}</Badge>;
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Subnav for Phase 9 */}
      <div className="bg-white border-b border-slate-200 -mt-2 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-2">
        <div className="flex items-center justify-between">
          <nav className="flex space-x-3 overflow-x-auto" aria-label="Security & Roles">
            <Link
              href="/admin/users"
              className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
            >
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>User Accounts</span>
            </Link>
            <Link
              href="/admin/roles"
              className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
            >
              <Key className="w-3.5 h-3.5 text-slate-400" />
              <span>Roles &amp; Permission Matrix</span>
            </Link>
            <Link
              href="/admin/audit"
              className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Security Audit Ledger</span>
            </Link>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                PRD Section 68 &amp; 80 • Immutable Security Audit
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 mt-1">
              <ShieldCheck className="w-6 h-6 text-emerald-600" />
              Institutional Security &amp; Authorization Ledger
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Every sensitive operation — role promotions, scope assignments, special order authorizations, and deactivations — is permanently recorded answering WHO, WHAT, WHEN, and WHY.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={loadData} className="text-xs font-semibold">
              <RotateCcw className={cn("w-3.5 h-3.5 mr-1", isLoading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by actor, action, entity, reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:bg-white focus:outline-indigo-600 font-medium"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="font-bold text-slate-500 uppercase text-[10px]">Filter Action:</span>
            {[
              { id: 'ALL', label: 'All Actions' },
              { id: 'ROLE_ASSIGNED', label: 'Role Assigned' },
              { id: 'SCOPE_ASSIGNED', label: 'Scope Assigned' },
              { id: 'SPECIAL_ORDER_APPROVED', label: 'Order Approved' },
              { id: 'USER_DEACTIVATED', label: 'Deactivated' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setActionFilter(f.id)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap',
                  actionFilter === f.id
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Timestamp (IST)</th>
                  <th className="py-3 px-4">Authorized Actor</th>
                  <th className="py-3 px-4">Security Action</th>
                  <th className="py-3 px-4">Target Entity</th>
                  <th className="py-3 px-4">Change Applied</th>
                  <th className="py-3 px-4">Justification &amp; Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">Loading audit records...</td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">No audit records found.</td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-slate-600">
                        {log.performed_at.split('T')[0]} {log.performed_at.split('T')[1]?.substring(0, 5)}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-extrabold text-slate-900">{log.actor_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{log.actor_role}</div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getActionBadge(log.action)}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-slate-700">
                        {log.target_entity_type}: {log.target_entity_id}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {log.previous_value ? (
                          <div className="flex items-center gap-1 text-[11px]">
                            <span className="line-through text-slate-400">{log.previous_value}</span>
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                            <span className="font-bold text-indigo-700">{log.new_value}</span>
                          </div>
                        ) : (
                          <span className="font-bold text-indigo-700 text-[11px]">{log.new_value || '-'}</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                        {log.reason || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
