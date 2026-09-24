'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { getRolesProvider, ROLE_DEFINITIONS } from '@/lib/auth/roles-provider';
import { SystemRole, PermissionKey } from '@/types/database';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Key, 
  ShieldCheck, 
  Check, 
  X, 
  Users, 
  Search, 
  Layers, 
  ArrowLeft 
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface PermissionGroup {
  group: string;
  permissions: { key: PermissionKey; label: string; desc: string }[];
}

const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    group: 'Meal Attendance (Phase 1)',
    permissions: [
      { key: 'attendance.view', label: 'View Attendance', desc: 'Can view meal attendance lists' },
      { key: 'attendance.submit', label: 'Declare Attendance', desc: 'Can submit self attendance declaration' },
      { key: 'attendance.correct', label: 'Review Corrections', desc: 'Can approve post-cutoff corrections' },
    ],
  },
  {
    group: 'Seating & Tables (Phase 2)',
    permissions: [
      { key: 'tables.view', label: 'View Seating Maps', desc: 'Can view table assignments and capacity' },
      { key: 'tables.manage', label: 'Rearrange Members', desc: 'Can move, swap, and bulk assign tables' },
      { key: 'tables.assign', label: 'Assign Seating', desc: 'Can link students to tables' },
    ],
  },
  {
    group: 'Supplier Duties & Monitoring (Phases 3 & 6)',
    permissions: [
      { key: 'suppliers.view', label: 'View Duty Roster', desc: 'Can view today and monthly duty assignments' },
      { key: 'suppliers.generate', label: 'Generate Rotation', desc: 'Can run automated monthly rotation' },
      { key: 'suppliers.assign', label: 'Manual Overrides', desc: 'Can reassign duty and pool membership' },
      { key: 'suppliers.checkin', label: 'Perform Check-In', desc: 'Can record hall arrival at table' },
      { key: 'suppliers.absence', label: 'Absence & Standby', desc: 'Can mark absence and trigger backup' },
      { key: 'suppliers.handover', label: 'Process Handover', desc: 'Can transfer live table responsibility' },
    ],
  },
  {
    group: 'Food Planning & Menu (Phase 4)',
    permissions: [
      { key: 'meals.view', label: 'View Meal Sessions', desc: 'Can view meal times and requirements' },
      { key: 'meals.manage', label: 'Manage Meal Setup', desc: 'Can configure schedules and dishes' },
      { key: 'meals.publish', label: 'Publish Menu', desc: 'Can publish weekly dining menu' },
      { key: 'meals.requirement', label: 'Compute Requirement', desc: 'Can approve consumption portions' },
      { key: 'meals.preparation', label: 'Record Preparation', desc: 'Can log kitchen cooking quantities' },
      { key: 'meals.serving', label: 'Record Serving', desc: 'Can log portions dispatched' },
    ],
  },
  {
    group: 'Utensil Accountability & Discrepancies (Phases 5 & 7)',
    permissions: [
      { key: 'utensils.view', label: 'View Utensil Ledger', desc: 'Can view table shelf inventory status' },
      { key: 'utensils.operate', label: 'Operate Table Shelf', desc: 'Can open shelf, distribute, collect' },
      { key: 'utensils.discrepancy.report', label: 'Report Discrepancy', desc: 'Can report missing, damaged, or broken' },
      { key: 'utensils.discrepancy.resolve', label: 'Confirm Recovery', desc: 'Can close discrepancy and reconcile' },
      { key: 'utensils.discrepancy.disposal', label: 'Approve Disposal', desc: 'Can authorize permanent discard' },
    ],
  },
  {
    group: 'Kitchen & Special Orders (Phase 8)',
    permissions: [
      { key: 'kitchen.view', label: 'View Kitchen Queue', desc: 'Can view live kitchen prep cards' },
      { key: 'kitchen.prepare', label: 'Start/Finish Cooking', desc: 'Can transition meal prep states' },
      { key: 'kitchen.serve', label: 'Dispatch Food', desc: 'Can record dining serving quantities' },
      { key: 'kitchen.surplus', label: 'Classify Surplus', desc: 'Can log leftovers to donation/reuse' },
      { key: 'special_orders.view', label: 'View Special Orders', desc: 'Can view party and delegation requests' },
      { key: 'special_orders.create', label: 'Create Order Request', desc: 'Can submit programme meal requests' },
      { key: 'special_orders.approve', label: 'Approve Special Order', desc: 'Can authorize kitchen preparation' },
      { key: 'special_orders.assign', label: 'Assign Order to Cook', desc: 'Can delegate order to specific cook' },
      { key: 'special_orders.execute', label: 'Execute Special Order', desc: 'Can cook and dispatch special orders' },
      { key: 'special_orders.cancel', label: 'Cancel Special Order', desc: 'Can reject order with audit reason' },
    ],
  },
  {
    group: 'Security, Users & System Governance (Phase 9)',
    permissions: [
      { key: 'reports.view', label: 'View All Reports', desc: 'Can access institutional analytics' },
      { key: 'audit.view', label: 'View Security Audit', desc: 'Can inspect immutable action trail' },
      { key: 'users.view', label: 'View User Directory', desc: 'Can browse institutional accounts' },
      { key: 'users.manage', label: 'Manage Accounts', desc: 'Can assign roles, scopes, deactivations' },
      { key: 'roles.manage', label: 'Manage Permissions', desc: 'Can modify authorization bindings' },
    ],
  },
];

const DISPLAY_ROLES: { role: SystemRole; label: string }[] = [
  { role: 'SUPER_ADMIN', label: 'Super Admin' },
  { role: 'ADMIN', label: 'Admin' },
  { role: 'SUPERVISOR', label: 'Supervisor' },
  { role: 'COOK', label: 'Cook' },
  { role: 'TABLE_SUPPLIER', label: 'Table Supplier' },
  { role: 'STUDENT', label: 'Student' },
];

export default function RolesMatrixPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const provider = getRolesProvider();

  const filteredGroups = PERMISSION_GROUPS.map((g) => ({
    ...g,
    permissions: g.permissions.filter(
      (p) =>
        p.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.desc.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((g) => g.permissions.length > 0);

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
              className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Roles &amp; Permission Matrix</span>
            </Link>
            <Link
              href="/admin/audit"
              className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
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
              <span className="text-[11px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                PRD Section 40–62 • System Authorization Model
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 mt-1">
              <Key className="w-6 h-6 text-indigo-600" />
              Roles &amp; Permission Evaluation Matrix
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Canonical permission evaluation matrix dynamically generated from <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">ROLE_DEFINITIONS</code>. Zero hardcoded UI permissions.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/admin/users">
              <Button variant="outline" className="text-xs font-bold">
                <Users className="w-3.5 h-3.5 mr-1" />
                Manage User Scopes
              </Button>
            </Link>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-4 min-w-[260px]">Capability / Resource Action</th>
                  {DISPLAY_ROLES.map((r) => (
                    <th key={r.role} className="py-3.5 px-3 text-center whitespace-nowrap">
                      {r.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredGroups.map((group) => (
                  <React.Fragment key={group.group}>
                    <tr className="bg-slate-100/60 font-black text-slate-900 text-[11px]">
                      <td colSpan={1 + DISPLAY_ROLES.length} className="py-2.5 px-4 uppercase tracking-wider text-indigo-900 bg-indigo-50/40">
                        {group.group}
                      </td>
                    </tr>
                    {group.permissions.map((p) => (
                      <tr key={p.key} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-extrabold text-slate-900">{p.label}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{p.key} • {p.desc}</div>
                        </td>
                        {DISPLAY_ROLES.map((r) => {
                          const hasPerm = provider.hasPermission(r.role, p.key);
                          return (
                            <td key={r.role} className="py-3 px-3 text-center">
                              {hasPerm ? (
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700">
                                  <Check className="w-3 h-3 stroke-[3]" />
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-slate-300">
                                  <X className="w-3 h-3" />
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
