'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { getRolesProvider } from '@/lib/auth/roles-provider';
import { 
  UserAccount, 
  SystemRole, 
  ScopeType 
} from '@/types/database';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  ShieldCheck, 
  Search, 
  UserCheck, 
  UserX, 
  ShieldAlert, 
  RotateCcw, 
  ChevronRight, 
  Layers, 
  MapPin, 
  CheckCircle2, 
  Plus,
  Key
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export default function UserManagementPage() {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Edit / Assign Role Modal
  const [activeUser, setActiveUser] = useState<UserAccount | null>(null);
  const [selectedRole, setSelectedRole] = useState<SystemRole>('TABLE_SUPPLIER');
  const [scopeType, setScopeType] = useState<ScopeType>('TABLE');
  const [scopeId, setScopeId] = useState('t-31');
  const [scopeName, setScopeName] = useState('Table 31 (First Floor CHS Side)');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const provider = getRolesProvider();
      const allUsers = await provider.getAllUsers();
      setUsers(allUsers);
    } catch (err) {
      console.error('Failed to load users', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenAssignModal = (user: UserAccount) => {
    setActiveUser(user);
    setSelectedRole(user.role);
    if (user.scopes.length > 0) {
      setScopeType(user.scopes[0].scope_type);
      setScopeId(user.scopes[0].scope_id);
      setScopeName(user.scopes[0].scope_name || 'Assigned Scope');
    } else {
      setScopeType('GLOBAL');
      setScopeId('global');
      setScopeName('Global Access');
    }
  };

  const handleSaveRole = async () => {
    if (!activeUser) return;
    setIsSubmitting(true);
    try {
      const provider = getRolesProvider();
      const res = await provider.assignUserRole(
        activeUser.id,
        selectedRole,
        scopeType,
        scopeId,
        scopeName,
        'u-super-admin',
        'Super Admin'
      );

      if (!res.success) {
        alert(res.error || 'Failed to update user role.');
        return;
      }

      setActiveUser(null);
      await loadData();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: UserAccount) => {
    const nextStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const confirmMsg = user.status === 'ACTIVE'
      ? `Are you sure you want to deactivate ${user.name}? They will lose access to operational features.`
      : `Reactivate ${user.name}?`;

    if (!confirm(confirmMsg)) return;

    const provider = getRolesProvider();
    const res = await provider.setUserStatus(
      user.id,
      nextStatus,
      'u-super-admin',
      'Super Admin',
      `Manual status toggle by administrator`
    );

    if (!res.success) {
      alert(res.error || 'Status change rejected.');
      return;
    }

    await loadData();
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q);

      const matchesRole = roleFilter === 'ALL' ? true : u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  const getRoleBadge = (role: SystemRole) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return <Badge className="bg-purple-100 text-purple-900 border-purple-300 font-extrabold text-[11px]">Super Admin</Badge>;
      case 'ADMIN':
        return <Badge className="bg-indigo-100 text-indigo-900 border-indigo-300 font-bold text-[11px]">Admin</Badge>;
      case 'SUPERVISOR':
        return <Badge className="bg-blue-100 text-blue-900 border-blue-300 font-bold text-[11px]">Supervisor</Badge>;
      case 'COOK':
      case 'KITCHEN_STAFF':
        return <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-bold text-[11px]">Kitchen / Cook</Badge>;
      case 'TABLE_SUPPLIER':
      case 'AREA_MAIN_SUPPLIER':
      case 'TEACHER_SUPPLIER':
        return <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 font-bold text-[11px]">Supplier</Badge>;
      default:
        return <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[11px]">Student</Badge>;
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Subnav for Phase 9 */}
      <div className="bg-white border-b border-slate-200 -mt-2 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-2">
        <div className="flex items-center justify-between">
          <nav className="flex space-x-3 overflow-x-auto" aria-label="Security & Roles">
            <Link
              href="/admin/users"
              className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200"
            >
              <Users className="w-3.5 h-3.5" />
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
                Phase 9 • Institutional Access Control
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 mt-1">
              <Users className="w-6 h-6 text-indigo-600" />
              User Accounts &amp; Scope Assignments
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Manage system roles, operational dining scopes (Global, Hall, Floor, Area, Table), account statuses, and Last Super Admin protection rules.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/admin/roles">
              <Button variant="outline" className="text-xs font-bold">
                <Key className="w-3.5 h-3.5 mr-1" />
                Permission Matrix
              </Button>
            </Link>
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
              placeholder="Search by name, email, role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:bg-white focus:outline-indigo-600 font-medium"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="font-bold text-slate-500 uppercase text-[10px]">Filter Role:</span>
            {[
              { id: 'ALL', label: 'All Users' },
              { id: 'SUPER_ADMIN', label: 'Super Admin' },
              { id: 'ADMIN', label: 'Admin' },
              { id: 'SUPERVISOR', label: 'Supervisor' },
              { id: 'COOK', label: 'Cook' },
              { id: 'TABLE_SUPPLIER', label: 'Supplier' },
              { id: 'STUDENT', label: 'Student' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setRoleFilter(f.id)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap',
                  roleFilter === f.id
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Assigned Scope</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4">Last Activity</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">Loading accounts...</td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">No users found.</td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const primaryScope = u.scopes[0];
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-bold text-slate-900">{u.name}</div>
                          <div className="text-[11px] text-slate-400">{u.email}</div>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          {getRoleBadge(u.role)}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          {primaryScope ? (
                            <div>
                              <span className="font-extrabold text-slate-800 flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-indigo-600" />
                                {primaryScope.scope_name || primaryScope.scope_id}
                              </span>
                              <span className="text-[10px] text-slate-400 uppercase font-mono">
                                Scope: {primaryScope.scope_type}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">No scope constraint</span>
                          )}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-black uppercase inline-flex items-center gap-1",
                            u.status === 'ACTIVE' ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                          )}>
                            <span className={cn("w-1.5 h-1.5 rounded-full", u.status === 'ACTIVE' ? "bg-emerald-600" : "bg-rose-600")} />
                            {u.status}
                          </span>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                          {u.last_active_at ? u.last_active_at.split('T')[1]?.substring(0, 5) + ' IST' : 'Never'}
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenAssignModal(u)}
                              className="text-[11px] font-bold h-7 px-2.5 text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                            >
                              Assign Role &amp; Scope
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggleStatus(u)}
                              className={cn(
                                "text-[11px] font-bold h-7 px-2",
                                u.status === 'ACTIVE'
                                  ? "text-rose-700 border-rose-200 hover:bg-rose-50"
                                  : "text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                              )}
                            >
                              {u.status === 'ACTIVE' ? 'Deactivate' : 'Reactivate'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal: Assign Role & Scope */}
      {activeUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-indigo-600" />
              Assign Role &amp; Scope ({activeUser.name})
            </h3>
            <p className="text-xs text-slate-500">
              PRD Section 54: Role determines permitted actions. Scope bounds where the user can execute them.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Role</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as SystemRole)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold text-slate-900"
                >
                  <option value="SUPER_ADMIN">Super Administrator (Full Institutional Control)</option>
                  <option value="ADMIN">Dining Administrator</option>
                  <option value="SUPERVISOR">Dining Hall Supervisor</option>
                  <option value="COOK">Head / Operational Cook</option>
                  <option value="KITCHEN_STAFF">Kitchen Assistant Staff</option>
                  <option value="TABLE_SUPPLIER">Table Supplier (Table Duty)</option>
                  <option value="AREA_MAIN_SUPPLIER">Area Main Supplier</option>
                  <option value="TEACHER_SUPPLIER">Teacher Dining Supplier</option>
                  <option value="STUDENT">Student (Standard Resident)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Scope Type</label>
                  <select
                    value={scopeType}
                    onChange={(e) => setScopeType(e.target.value as ScopeType)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-semibold"
                  >
                    <option value="GLOBAL">Global (Campus-wide)</option>
                    <option value="DINING_HALL">Dining Hall</option>
                    <option value="FLOOR">Floor</option>
                    <option value="AREA">Area Section</option>
                    <option value="TABLE">Specific Table</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Scope Identifier</label>
                  <input
                    type="text"
                    value={scopeId}
                    onChange={(e) => setScopeId(e.target.value)}
                    placeholder="e.g. t-31 or global"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Scope Display Label</label>
                <input
                  type="text"
                  value={scopeName}
                  onChange={(e) => setScopeName(e.target.value)}
                  placeholder="e.g. Table 31 (First Floor CHS Side)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setActiveUser(null)}>Cancel</Button>
              <Button size="sm" onClick={handleSaveRole} disabled={isSubmitting} className="bg-indigo-600 text-white font-bold">
                {isSubmitting ? 'Saving...' : 'Confirm Assignment'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
