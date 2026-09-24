// =====================================================================
// Phase 9: Roles, Permissions, Scopes & Authorization Provider
// Implements canonical role definitions, permission matrix, scope evaluation,
// last Super Admin protection, user management, and security audit log.
// =====================================================================

import {
  SystemRole,
  ScopeType,
  UserScope,
  PermissionKey,
  RoleDefinition,
  UserAccount,
  SecurityAuditEvent,
} from '@/types/database';
import { getTodayDateStringIST } from '@/lib/utils/timezone';

export const ROLE_DEFINITIONS: Record<SystemRole, RoleDefinition> = {
  SUPER_ADMIN: {
    key: 'SUPER_ADMIN',
    name: 'Super Administrator',
    description: 'Full institutional control across all dining modules, system security, roles, and audits',
    is_system: true,
    permissions: [
      'attendance.view', 'attendance.submit', 'attendance.correct',
      'tables.view', 'tables.manage', 'tables.assign',
      'suppliers.view', 'suppliers.generate', 'suppliers.assign', 'suppliers.checkin', 'suppliers.absence', 'suppliers.handover',
      'meals.view', 'meals.manage', 'meals.publish', 'meals.requirement', 'meals.preparation', 'meals.serving',
      'menu.view', 'menu.manage', 'menu.publish',
      'utensils.view', 'utensils.operate', 'utensils.discrepancy.report', 'utensils.discrepancy.resolve', 'utensils.discrepancy.disposal',
      'kitchen.view', 'kitchen.prepare', 'kitchen.serve', 'kitchen.surplus',
      'special_orders.view', 'special_orders.create', 'special_orders.approve', 'special_orders.assign', 'special_orders.execute', 'special_orders.cancel',
      'reports.view', 'audit.view', 'users.view', 'users.manage', 'roles.view', 'roles.manage', 'permissions.manage'
    ],
  },
  ADMIN: {
    key: 'ADMIN',
    name: 'Dining Administrator',
    description: 'Operational manager for meals, weekly menu, requirements, suppliers, utensils, and reports',
    is_system: true,
    permissions: [
      'attendance.view', 'attendance.correct',
      'tables.view', 'tables.manage', 'tables.assign',
      'suppliers.view', 'suppliers.generate', 'suppliers.assign', 'suppliers.checkin', 'suppliers.absence', 'suppliers.handover',
      'meals.view', 'meals.manage', 'meals.publish', 'meals.requirement', 'meals.preparation', 'meals.serving',
      'menu.view', 'menu.manage', 'menu.publish',
      'utensils.view', 'utensils.operate', 'utensils.discrepancy.report', 'utensils.discrepancy.resolve', 'utensils.discrepancy.disposal',
      'kitchen.view', 'kitchen.prepare', 'kitchen.serve', 'kitchen.surplus',
      'special_orders.view', 'special_orders.create', 'special_orders.approve', 'special_orders.assign', 'special_orders.execute', 'special_orders.cancel',
      'reports.view', 'audit.view', 'users.view'
    ],
  },
  SUPERVISOR: {
    key: 'SUPERVISOR',
    name: 'Dining Hall Supervisor',
    description: 'Operational oversight on floor, supplier monitoring, utensil recovery/disposal approvals, and kitchen flow',
    is_system: true,
    permissions: [
      'attendance.view', 'attendance.correct',
      'tables.view', 'tables.assign',
      'suppliers.view', 'suppliers.assign', 'suppliers.checkin', 'suppliers.absence', 'suppliers.handover',
      'meals.view', 'meals.requirement', 'meals.preparation', 'meals.serving',
      'menu.view',
      'utensils.view', 'utensils.operate', 'utensils.discrepancy.report', 'utensils.discrepancy.resolve', 'utensils.discrepancy.disposal',
      'kitchen.view', 'kitchen.prepare', 'kitchen.serve', 'kitchen.surplus',
      'special_orders.view', 'special_orders.approve', 'special_orders.assign', 'special_orders.cancel',
      'reports.view', 'audit.view'
    ],
  },
  AREA_MAIN_SUPPLIER: {
    key: 'AREA_MAIN_SUPPLIER',
    name: 'Area Main Supplier',
    description: 'Area-scoped operational supplier coordinating table duties within assigned dining section',
    is_system: true,
    permissions: [
      'tables.view',
      'suppliers.view', 'suppliers.checkin',
      'menu.view',
      'utensils.view', 'utensils.operate', 'utensils.discrepancy.report'
    ],
  },
  TABLE_SUPPLIER: {
    key: 'TABLE_SUPPLIER',
    name: 'Table Supplier',
    description: 'Table-scoped supplier managing dining table shelf, meal service, and utensil return',
    is_system: true,
    permissions: [
      'tables.view',
      'suppliers.view', 'suppliers.checkin',
      'menu.view',
      'utensils.view', 'utensils.operate', 'utensils.discrepancy.report'
    ],
  },
  TEACHER_SUPPLIER: {
    key: 'TEACHER_SUPPLIER',
    name: 'Teacher Dining Supplier',
    description: 'Teacher area designated supplier managing faculty dining hospitality and tableware',
    is_system: true,
    permissions: [
      'tables.view',
      'suppliers.view', 'suppliers.checkin',
      'menu.view',
      'utensils.view', 'utensils.operate', 'utensils.discrepancy.report'
    ],
  },
  COOK: {
    key: 'COOK',
    name: 'Head / Operational Cook',
    description: 'Kitchen operational executor recording meal preparation, serving, and surplus',
    is_system: true,
    permissions: [
      'meals.view', 'meals.requirement', 'meals.preparation', 'meals.serving',
      'menu.view',
      'kitchen.view', 'kitchen.prepare', 'kitchen.serve', 'kitchen.surplus',
      'special_orders.view', 'special_orders.execute'
    ],
  },
  KITCHEN_STAFF: {
    key: 'KITCHEN_STAFF',
    name: 'Kitchen Assistant Staff',
    description: 'Preparation assistant supporting meal readiness and portion dispatch',
    is_system: true,
    permissions: [
      'meals.view',
      'menu.view',
      'kitchen.view', 'kitchen.prepare', 'kitchen.serve',
      'special_orders.view', 'special_orders.execute'
    ],
  },
  CLEANING_IN_CHARGE: {
    key: 'CLEANING_IN_CHARGE',
    name: 'Cleaning In-Charge (Reserved for Phase 10)',
    description: 'Oversees dining hygiene and sanitation rotations',
    is_system: true,
    permissions: ['tables.view', 'reports.view'],
  },
  DEPARTMENT_LEADER: {
    key: 'DEPARTMENT_LEADER',
    name: 'Department Student Leader (Reserved for Phase 10)',
    description: 'Departmental coordinator for student rotas',
    is_system: true,
    permissions: ['attendance.view', 'tables.view'],
  },
  STUDENT: {
    key: 'STUDENT',
    name: 'Enrolled Student',
    description: 'Institutional resident declaring meal attendance and viewing dining schedules',
    is_system: true,
    permissions: [
      'attendance.view', 'attendance.submit',
      'tables.view',
      'menu.view'
    ],
  },
};

interface RolesStore {
  users: UserAccount[];
  auditLogs: SecurityAuditEvent[];
}

function initializeRolesStore(): RolesStore {
  const users: UserAccount[] = [
    {
      id: 'u-super-admin',
      name: 'Usthad Sayyid Munavvarali',
      email: 'superadmin@darulhuda.com',
      role: 'SUPER_ADMIN',
      scopes: [{ id: 'sc-1', user_id: 'u-super-admin', scope_type: 'GLOBAL', scope_id: 'global', scope_name: 'All Institutional Campuses', effective_from: '2026-01-01', created_at: '2026-01-01T00:00:00Z' }],
      status: 'ACTIVE',
      last_active_at: '2026-09-24T09:20:00+05:30',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-09-24T09:20:00+05:30',
    },
    {
      id: 'a0000000-0000-0000-0000-000000000001',
      name: 'Supervisor Shafi',
      email: 'supervisor@darulhuda.com',
      role: 'SUPERVISOR',
      additional_roles: ['ADMIN'],
      scopes: [{ id: 'sc-2', user_id: 'a0000000-0000-0000-0000-000000000001', scope_type: 'DINING_HALL', scope_id: 'dh-pg', scope_name: 'PG Dining Hall', effective_from: '2026-01-01', created_at: '2026-01-01T00:00:00Z' }],
      status: 'ACTIVE',
      last_active_at: '2026-09-24T09:30:00+05:30',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-09-24T09:30:00+05:30',
    },
    {
      id: 'c1111111-1111-1111-1111-111111111111',
      name: 'Chef Moideen (Head Cook)',
      email: 'kitchen@darulhuda.com',
      role: 'COOK',
      scopes: [{ id: 'sc-3', user_id: 'c1111111-1111-1111-1111-111111111111', scope_type: 'GLOBAL', scope_id: 'kitchen-main', scope_name: 'Central Institution Kitchen', effective_from: '2026-01-01', created_at: '2026-01-01T00:00:00Z' }],
      status: 'ACTIVE',
      last_active_at: '2026-09-24T09:15:00+05:30',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-09-24T09:15:00+05:30',
    },
    {
      id: 'b5555555-5555-5555-5555-555555555551',
      name: 'Ijas K',
      email: 'ijas@student.darulhuda.com',
      role: 'TABLE_SUPPLIER',
      additional_roles: ['STUDENT'],
      scopes: [{ id: 'sc-4', user_id: 'b5555555-5555-5555-5555-555555555551', scope_type: 'TABLE', scope_id: 't-31', scope_name: 'Table 31 (First Floor CHS Side)', effective_from: '2026-09-01', effective_to: '2026-09-30', created_at: '2026-09-01T00:00:00Z' }],
      status: 'ACTIVE',
      last_active_at: '2026-09-24T09:10:00+05:30',
      created_at: '2026-09-01T00:00:00Z',
      updated_at: '2026-09-24T09:10:00+05:30',
    },
    {
      id: 'b1111111-1111-1111-1111-111111111111',
      name: 'Muhammed',
      email: 'student@example.com',
      role: 'STUDENT',
      scopes: [{ id: 'sc-5', user_id: 'b1111111-1111-1111-1111-111111111111', scope_type: 'TABLE', scope_id: 't-31', scope_name: 'Table 31 (Seating Member)', effective_from: '2026-09-01', created_at: '2026-09-01T00:00:00Z' }],
      status: 'ACTIVE',
      last_active_at: '2026-09-24T09:00:00+05:30',
      created_at: '2026-09-01T00:00:00Z',
      updated_at: '2026-09-24T09:00:00+05:30',
    },
  ];

  const auditLogs: SecurityAuditEvent[] = [
    {
      id: 'sec-1',
      actor_id: 'u-super-admin',
      actor_name: 'Usthad Sayyid Munavvarali',
      actor_role: 'SUPER_ADMIN',
      action: 'ROLE_ASSIGNED',
      target_entity_type: 'USER',
      target_entity_id: 'a0000000-0000-0000-0000-000000000001',
      new_value: 'SUPERVISOR',
      reason: 'Assigned dining supervisor role for September term',
      performed_at: '2026-09-01T08:00:00+05:30',
    },
    {
      id: 'sec-2',
      actor_id: 'a0000000-0000-0000-0000-000000000001',
      actor_name: 'Supervisor Shafi',
      actor_role: 'SUPERVISOR',
      action: 'SCOPE_ASSIGNED',
      target_entity_type: 'SUPPLIER_SCOPE',
      target_entity_id: 'b5555555-5555-5555-5555-555555555551',
      new_value: 'TABLE:t-31',
      reason: 'Monthly table supplier rotation for Table 31',
      performed_at: '2026-09-01T09:00:00+05:30',
    },
    {
      id: 'sec-3',
      actor_id: 'a0000000-0000-0000-0000-000000000001',
      actor_name: 'Supervisor Shafi',
      actor_role: 'SUPERVISOR',
      action: 'SPECIAL_ORDER_APPROVED',
      target_entity_type: 'SPECIAL_ORDER',
      target_entity_id: 'smo-1',
      new_value: 'APPROVED (35 meals)',
      reason: 'PG Certificate Programme hospitality confirmed',
      performed_at: '2026-09-23T16:00:00+05:30',
    },
  ];

  return { users, auditLogs };
}

export class RolesProvider {
  private store: RolesStore;

  constructor() {
    this.store = initializeRolesStore();
  }

  getRoleDefinitions(): RoleDefinition[] {
    return Object.values(ROLE_DEFINITIONS);
  }

  async getAllUsers(): Promise<UserAccount[]> {
    return [...this.store.users].sort((a, b) => a.name.localeCompare(b.name));
  }

  async getUserById(id: string): Promise<UserAccount | null> {
    return this.store.users.find((u) => u.id === id) || null;
  }

  hasPermission(role: SystemRole, permission: PermissionKey): boolean {
    const def = ROLE_DEFINITIONS[role];
    return def ? def.permissions.includes(permission) : false;
  }

  /**
   * Centralized Server-Side Permission & Scope Evaluation (PRD Section 54 & 63)
   */
  evaluateUserPermission(
    userId: string,
    permission: PermissionKey,
    scopeType?: ScopeType,
    scopeId?: string
  ): { allowed: boolean; reason?: string } {
    const user = this.store.users.find((u) => u.id === userId);
    if (!user) return { allowed: false, reason: 'User not found or unauthenticated.' };
    if (user.status !== 'ACTIVE') return { allowed: false, reason: 'User account is inactive or suspended.' };

    // Super Admin has unrestricted access everywhere
    if (user.role === 'SUPER_ADMIN') return { allowed: true };

    const rolesToCheck: SystemRole[] = [user.role, ...(user.additional_roles || [])];
    const hasRolePerm = rolesToCheck.some((r) => this.hasPermission(r, permission));

    if (!hasRolePerm) {
      return {
        allowed: false,
        reason: `Role '${user.role}' lacks permission '${permission}'.`,
      };
    }

    // Check scope if required
    if (scopeType && scopeId) {
      const hasMatchingScope = user.scopes.some(
        (s) =>
          s.scope_type === 'GLOBAL' ||
          (s.scope_type === scopeType && s.scope_id === scopeId)
      );

      if (!hasMatchingScope) {
        return {
          allowed: false,
          reason: `Action restricted outside user's authorized scope (${scopeType}: ${scopeId}).`,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Assigns a role to a user with Last Super Admin Protection (PRD Section 70)
   */
  async assignUserRole(
    userId: string,
    newRole: SystemRole,
    scopeType: ScopeType = 'GLOBAL',
    scopeId: string = 'global',
    scopeName: string = 'Global Scope',
    actorId: string = 'u-super-admin',
    actorName: string = 'Super Admin'
  ): Promise<{ success: boolean; error?: string }> {
    const user = this.store.users.find((u) => u.id === userId);
    if (!user) return { success: false, error: 'User not found.' };

    // PRD Section 70: Never allow 0 active Super Admins
    if (user.role === 'SUPER_ADMIN' && newRole !== 'SUPER_ADMIN') {
      const activeSuperAdmins = this.store.users.filter(
        (u) => u.role === 'SUPER_ADMIN' && u.status === 'ACTIVE'
      );
      if (activeSuperAdmins.length <= 1) {
        return {
          success: false,
          error: 'Protection Violation: Cannot remove the last active Super Administrator.',
        };
      }
    }

    const prevRole = user.role;
    user.role = newRole;
    user.updated_at = new Date().toISOString();

    // Update or add scope
    const existingScope = user.scopes.find((s) => s.scope_type === scopeType);
    if (existingScope) {
      existingScope.scope_id = scopeId;
      existingScope.scope_name = scopeName;
    } else {
      user.scopes.push({
        id: `sc-${Date.now()}`,
        user_id: user.id,
        scope_type: scopeType,
        scope_id: scopeId,
        scope_name: scopeName,
        effective_from: getTodayDateStringIST(),
        created_at: new Date().toISOString(),
      });
    }

    this.store.auditLogs.unshift({
      id: `sec-${Date.now()}`,
      actor_id: actorId,
      actor_name: actorName,
      actor_role: 'SUPER_ADMIN',
      action: 'ROLE_ASSIGNED',
      target_entity_type: 'USER',
      target_entity_id: user.id,
      previous_value: prevRole,
      new_value: `${newRole} (${scopeName})`,
      reason: `Role changed from ${prevRole} to ${newRole}`,
      performed_at: new Date().toISOString(),
    });

    return { success: true };
  }

  /**
   * Deactivates a user with safety checks (PRD Section 71)
   */
  async setUserStatus(
    userId: string,
    status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED',
    actorId: string = 'u-super-admin',
    actorName: string = 'Super Admin',
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    const user = this.store.users.find((u) => u.id === userId);
    if (!user) return { success: false, error: 'User not found.' };

    if (user.role === 'SUPER_ADMIN' && status !== 'ACTIVE') {
      const activeSuperAdmins = this.store.users.filter(
        (u) => u.role === 'SUPER_ADMIN' && u.status === 'ACTIVE' && u.id !== userId
      );
      if (activeSuperAdmins.length === 0) {
        return {
          success: false,
          error: 'Protection Violation: Cannot deactivate the sole active Super Administrator.',
        };
      }
    }

    const prevStatus = user.status;
    user.status = status;
    user.updated_at = new Date().toISOString();

    this.store.auditLogs.unshift({
      id: `sec-${Date.now()}`,
      actor_id: actorId,
      actor_name: actorName,
      actor_role: 'SUPER_ADMIN',
      action: status === 'ACTIVE' ? 'USER_REACTIVATED' : 'USER_DEACTIVATED',
      target_entity_type: 'USER',
      target_entity_id: user.id,
      previous_value: prevStatus,
      new_value: status,
      reason: reason || `Status set to ${status}`,
      performed_at: new Date().toISOString(),
    });

    return { success: true };
  }

  async getSecurityAuditLogs(filters?: {
    action?: string;
    targetEntityType?: string;
    actorId?: string;
  }): Promise<SecurityAuditEvent[]> {
    return this.store.auditLogs.filter((log) => {
      if (filters?.action && filters.action !== 'ALL' && log.action !== filters.action) return false;
      if (filters?.targetEntityType && filters.targetEntityType !== 'ALL' && log.target_entity_type !== filters.targetEntityType) return false;
      if (filters?.actorId && log.actor_id !== filters.actorId) return false;
      return true;
    });
  }

  async recordAuditEvent(event: Omit<SecurityAuditEvent, 'id' | 'performed_at'>): Promise<void> {
    this.store.auditLogs.unshift({
      ...event,
      id: `sec-${Date.now()}`,
      performed_at: new Date().toISOString(),
    });
  }
}

let rolesProviderInstance: RolesProvider | null = null;

export function getRolesProvider(): RolesProvider {
  if (!rolesProviderInstance) {
    rolesProviderInstance = new RolesProvider();
  }
  return rolesProviderInstance;
}
