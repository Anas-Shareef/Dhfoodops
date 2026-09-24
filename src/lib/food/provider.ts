// =====================================================================
// Phase 4: Food Requirement & Meal Planning Provider
// Implements 5-stage food management pipeline:
// Finalized Attendance -> Food Requirement -> Preparation -> Serving -> Leftovers
// =====================================================================

import {
  FoodItem,
  FoodUnit,
  MealRequirement,
  MealRequirementItem,
  MealRequirementRevision,
  MealPreparationRecord,
  MealServingRecord,
  MealLeftoverRecord,
  MealFoodEvent,
  MealFoodPipelineItem,
  TableFoodRequirement,
  DepartmentFoodRequirement,
  MealRequirementStatus,
  LeftoverClassification,
  ServingStatus,
  MealSession,
  FoodSurplusRecord,
  SurplusClassification,
  SurplusDestination,
  FoodQualityStatus,
  DonationStatus,
  WasteReason,
  MealAudienceBreakdown,
  MealSlot,
} from '@/types/database';
import { getAttendanceProvider } from '@/lib/attendance/provider';
import { getTableProvider } from '@/lib/tables/provider';
import { getSupplierProvider } from '@/lib/suppliers/provider';
import { getTodayDateStringIST, formatTimeIST } from '@/lib/utils/timezone';
import { calculateFoodRequirement } from './calculator';

interface FoodPlanningStore {
  foodItems: FoodItem[];
  requirements: MealRequirement[];
  requirementItems: MealRequirementItem[];
  revisions: MealRequirementRevision[];
  preparations: MealPreparationRecord[];
  servings: MealServingRecord[];
  leftovers: MealLeftoverRecord[];
  events: MealFoodEvent[];
  surplusRecords: FoodSurplusRecord[];
}

function initializeFoodStore(): FoodPlanningStore {
  const foodItems: FoodItem[] = [
    {
      id: 'f-idli',
      name: 'Idli',
      category: 'main_dish',
      unit: 'portions',
      default_consumption_factor: 1.000,
      is_active: true,
      created_at: '2026-09-01T00:00:00Z',
      updated_at: '2026-09-01T00:00:00Z',
    },
    {
      id: 'f-sambar',
      name: 'Sambar',
      category: 'curry',
      unit: 'litres',
      default_consumption_factor: 0.200,
      is_active: true,
      created_at: '2026-09-01T00:00:00Z',
      updated_at: '2026-09-01T00:00:00Z',
    },
    {
      id: 'f-chutney',
      name: 'Coconut Chutney',
      category: 'side',
      unit: 'kg',
      default_consumption_factor: 0.050,
      is_active: true,
      created_at: '2026-09-01T00:00:00Z',
      updated_at: '2026-09-01T00:00:00Z',
    },
    {
      id: 'f-tea',
      name: 'Hot Tea',
      category: 'beverage',
      unit: 'litres',
      default_consumption_factor: 0.200,
      is_active: true,
      created_at: '2026-09-01T00:00:00Z',
      updated_at: '2026-09-01T00:00:00Z',
    },
    {
      id: 'f-ghee-rice',
      name: 'Ghee Rice',
      category: 'staple',
      unit: 'kg',
      default_consumption_factor: 0.250,
      is_active: true,
      created_at: '2026-09-01T00:00:00Z',
      updated_at: '2026-09-01T00:00:00Z',
    },
    {
      id: 'f-chicken-curry',
      name: 'Chicken Curry',
      category: 'curry',
      unit: 'portions',
      default_consumption_factor: 1.000,
      is_active: true,
      created_at: '2026-09-01T00:00:00Z',
      updated_at: '2026-09-01T00:00:00Z',
    },
    {
      id: 'f-rice',
      name: 'Steamed Rice',
      category: 'staple',
      unit: 'kg',
      default_consumption_factor: 0.300,
      is_active: true,
      created_at: '2026-09-01T00:00:00Z',
      updated_at: '2026-09-01T00:00:00Z',
    },
  ];

  // Seed demo session requirement (PRD Section 39: 24 Sep Breakfast 08:30 AM)
  const reqId = 'req-demo-breakfast';
  const sessionId = 's1111111-1111-1111-1111-111111111111';

  const requirements: MealRequirement[] = [
    {
      id: reqId,
      meal_session_id: sessionId,
      attending_count: 286,
      not_attending_count: 31,
      no_response_count: 8,
      buffer_percent: 5.0,
      base_quantity: 286,
      recommended_quantity: 301,
      status: 'completed',
      calculation_version: 1,
      approved_by: 'a0000000-0000-0000-0000-000000000001',
      approved_at: '2026-09-24T07:50:00+05:30',
      created_at: '2026-09-24T07:45:00+05:30',
      updated_at: '2026-09-24T09:15:00+05:30',
    },
  ];

  const requirementItems: MealRequirementItem[] = [
    {
      id: 'ritem-1',
      meal_requirement_id: reqId,
      food_item_id: 'f-idli',
      consumption_factor: 1.000,
      base_quantity: 286,
      buffer_quantity: 15,
      recommended_quantity: 301,
      unit: 'portions',
      created_at: '2026-09-24T07:45:00+05:30',
      updated_at: '2026-09-24T07:45:00+05:30',
    },
    {
      id: 'ritem-2',
      meal_requirement_id: reqId,
      food_item_id: 'f-sambar',
      consumption_factor: 0.200,
      base_quantity: 57.2,
      buffer_quantity: 2.9,
      recommended_quantity: 60.1,
      unit: 'litres',
      created_at: '2026-09-24T07:45:00+05:30',
      updated_at: '2026-09-24T07:45:00+05:30',
    },
    {
      id: 'ritem-3',
      meal_requirement_id: reqId,
      food_item_id: 'f-tea',
      consumption_factor: 0.200,
      base_quantity: 57.2,
      buffer_quantity: 2.9,
      recommended_quantity: 60.1,
      unit: 'litres',
      created_at: '2026-09-24T07:45:00+05:30',
      updated_at: '2026-09-24T07:45:00+05:30',
    },
  ];

  const revisions: MealRequirementRevision[] = [];

  const preparations: MealPreparationRecord[] = [
    {
      id: 'prep-1',
      meal_requirement_id: reqId,
      food_item_id: 'f-idli',
      planned_quantity: 301,
      prepared_quantity: 300,
      unit: 'portions',
      recorded_by: 'a0000000-0000-0000-0000-000000000001',
      recorded_at: '2026-09-24T08:15:00+05:30',
      remarks: 'Kitchen batch rounded to 300 portions',
    },
  ];

  const servings: MealServingRecord[] = [
    {
      id: 'srv-1',
      meal_session_id: sessionId,
      food_item_id: 'f-idli',
      served_quantity: 281,
      unit: 'portions',
      serving_status: 'completed',
      recorded_by: 'a0000000-0000-0000-0000-000000000001',
      recorded_at: '2026-09-24T09:00:00+05:30',
      remarks: 'All 281 present students served on time',
    },
  ];

  const leftovers: MealLeftoverRecord[] = [
    {
      id: 'left-1',
      meal_session_id: sessionId,
      food_item_id: 'f-idli',
      quantity: 19,
      unit: 'portions',
      classification: 'stored',
      recorded_by: 'a0000000-0000-0000-0000-000000000001',
      recorded_at: '2026-09-24T09:15:00+05:30',
      remarks: 'Transferred to clean insulated warmer for afternoon tea snack redistribution',
    },
  ];

  const events: MealFoodEvent[] = [
    {
      id: 'fe-1',
      meal_session_id: sessionId,
      event_type: 'REQUIREMENT_CALCULATED',
      metadata: { attending: 286, buffer: 5, recommended: 301 },
      created_at: '2026-09-24T07:45:00+05:30',
    },
    {
      id: 'fe-2',
      meal_session_id: sessionId,
      event_type: 'REQUIREMENT_APPROVED',
      metadata: { approved_by: 'Supervisor', version: 1 },
      created_at: '2026-09-24T07:50:00+05:30',
    },
    {
      id: 'fe-3',
      meal_session_id: sessionId,
      event_type: 'PREPARATION_ENTERED',
      metadata: { prepared: 300, planned: 301 },
      created_at: '2026-09-24T08:15:00+05:30',
    },
    {
      id: 'fe-4',
      meal_session_id: sessionId,
      event_type: 'SERVING_ENTERED',
      metadata: { served: 281 },
      created_at: '2026-09-24T09:00:00+05:30',
    },
    {
      id: 'fe-5',
      meal_session_id: sessionId,
      event_type: 'LEFTOVER_RECORDED',
      metadata: { leftover: 19, classification: 'stored' },
      created_at: '2026-09-24T09:15:00+05:30',
    },
  ];

  const surplusRecords: FoodSurplusRecord[] = [
    {
      id: 'surp-1',
      meal_session_id: sessionId,
      food_item_id: 'f-idli',
      quantity: 19,
      unit: 'portions',
      classification: 'EDIBLE_SURPLUS',
      quality_status: 'ELIGIBLE',
      destination: 'DONATION',
      waste_reason: 'UNEXPECTED_ABSENCE',
      donation_status: 'APPROVED',
      donation_recipient: 'Kozhikode Community Relief Service',
      destination_notes: 'Kept in sanitized thermal insulated carrier, authorized for community donation',
      recorded_by: 'a0000000-0000-0000-0000-000000000001',
      recorded_at: '2026-09-24T09:15:00+05:30',
      quality_assessed_by: 'a0000000-0000-0000-0000-000000000001',
      quality_assessed_at: '2026-09-24T09:18:00+05:30',
      approved_by: 'a0000000-0000-0000-0000-000000000001',
      approved_at: '2026-09-24T09:20:00+05:30',
    },
    {
      id: 'surp-2',
      meal_session_id: sessionId,
      food_item_id: 'f-sambar',
      quantity: 3,
      unit: 'litres',
      classification: 'EDIBLE_SURPLUS',
      quality_status: 'ELIGIBLE',
      destination: 'STORAGE',
      waste_reason: 'OVER_PREPARATION',
      destination_notes: 'Refrigerated in sealed SS container for evening meal supplement',
      recorded_by: 'a0000000-0000-0000-0000-000000000001',
      recorded_at: '2026-09-24T09:16:00+05:30',
    },
    {
      id: 'surp-3',
      meal_session_id: sessionId,
      food_item_id: 'f-chutney',
      quantity: 1.5,
      unit: 'kg',
      classification: 'UNUSABLE_FOOD',
      quality_status: 'NOT_ELIGIBLE',
      destination: 'DISPOSAL',
      waste_reason: 'COOKING_VARIANCE',
      destination_notes: 'Perishable coconut condiment unsuited for prolonged warm storage; segregated for organic compost',
      recorded_by: 'a0000000-0000-0000-0000-000000000001',
      recorded_at: '2026-09-24T09:17:00+05:30',
    },
  ];

  return { foodItems, requirements, requirementItems, revisions, preparations, servings, leftovers, events, surplusRecords };
}

export class FoodPlanningProvider {
  private store: FoodPlanningStore;

  constructor() {
    this.store = initializeFoodStore();
  }

  async getFoodItems(): Promise<FoodItem[]> {
    return this.store.foodItems.filter((f) => f.is_active);
  }

  async saveFoodItem(itemData: Partial<FoodItem>): Promise<{ success: boolean; item?: FoodItem; error?: string }> {
    const nowIso = new Date().toISOString();
    if (itemData.id) {
      const idx = this.store.foodItems.findIndex((f) => f.id === itemData.id);
      if (idx !== -1) {
        this.store.foodItems[idx] = {
          ...this.store.foodItems[idx],
          ...itemData,
          updated_at: nowIso,
        };
        return { success: true, item: this.store.foodItems[idx] };
      }
    }

    const newItem: FoodItem = {
      id: `f-${Date.now()}`,
      name: itemData.name || 'New Item',
      category: itemData.category || 'main_dish',
      unit: itemData.unit || 'portions',
      default_consumption_factor: itemData.default_consumption_factor || 1.0,
      is_active: itemData.is_active !== undefined ? itemData.is_active : true,
      created_at: nowIso,
      updated_at: nowIso,
    };

    this.store.foodItems.push(newItem);
    return { success: true, item: newItem };
  }

  async getTodayMealPipelines(dateStr: string): Promise<MealFoodPipelineItem[]> {
    const attendanceProvider = getAttendanceProvider();
    const [sessions, students] = await Promise.all([
      attendanceProvider.getDailySessions(dateStr),
      attendanceProvider.getAllStudents(),
    ]);

    const totalStudents = students.length || 325;
    const pipelineItems: MealFoodPipelineItem[] = [];

    for (const session of sessions) {
      // Find requirement for this session
      const req = this.store.requirements.find((r) => r.meal_session_id === session.id) || null;
      
      // Items
      const items = req
        ? this.store.requirementItems
            .filter((i) => i.meal_requirement_id === req.id)
            .map((i) => ({
              ...i,
              food_item: this.store.foodItems.find((f) => f.id === i.food_item_id),
            }))
        : [];

      // Preps
      const preps = req
        ? this.store.preparations
            .filter((p) => p.meal_requirement_id === req.id)
            .map((p) => ({
              ...p,
              food_item: this.store.foodItems.find((f) => f.id === p.food_item_id),
            }))
        : [];

      // Servings
      const sessionServings = this.store.servings
        .filter((s) => s.meal_session_id === session.id)
        .map((s) => ({
          ...s,
          food_item: this.store.foodItems.find((f) => f.id === s.food_item_id),
        }));

      // Leftovers
      const sessionLeftovers = this.store.leftovers
        .filter((l) => l.meal_session_id === session.id)
        .map((l) => ({
          ...l,
          food_item: this.store.foodItems.find((f) => f.id === l.food_item_id),
        }));

      // Fallback / Defaults based on PRD demo figures
      let attending = req?.attending_count ?? 0;
      let notAttending = req?.not_attending_count ?? 0;
      let noResponse = req?.no_response_count ?? 0;
      let bufferPercent = req?.buffer_percent ?? (session.meal_type === 'lunch' ? 7 : 5);
      let baseQty = req?.base_quantity ?? 0;
      let bufferQty = Math.ceil(baseQty * (bufferPercent / 100));
      let recommended = req?.recommended_quantity ?? (baseQty + bufferQty);

      if (!req) {
        // If no explicit requirement record yet, compute from session state or mock default
        if (session.meal_type === 'lunch') {
          attending = 294;
          notAttending = 23;
          noResponse = 8;
          baseQty = 294;
          bufferPercent = 7;
          bufferQty = Math.ceil(294 * 0.07);
          recommended = 294 + bufferQty;
        } else if (session.meal_type === 'dinner') {
          attending = 0;
          notAttending = 0;
          noResponse = totalStudents;
          baseQty = 0;
          bufferPercent = 5;
          bufferQty = 0;
          recommended = 0;
        }
      }

      const totalPrepared = preps.reduce((acc, p) => acc + Number(p.prepared_quantity), 0);
      const totalServed = sessionServings.reduce((acc, s) => acc + Number(s.served_quantity), 0);
      const totalLeftover = sessionLeftovers.reduce((acc, l) => acc + Number(l.quantity), 0);

      let pipelineStatus: MealRequirementStatus = req?.status || (session.meal_type === 'dinner' ? 'awaiting_attendance' : 'calculated');

      pipelineItems.push({
        session_id: session.id,
        date: session.session_date,
        meal_type: session.meal_type,
        meal_time: session.meal_time,
        session_status: session.status,
        attending_count: attending,
        not_attending_count: notAttending,
        no_response_count: noResponse,
        total_students: totalStudents,
        requirement: req,
        base_quantity: baseQty,
        buffer_percent: bufferPercent,
        buffer_quantity: bufferQty,
        recommended_quantity: recommended,
        prepared_quantity: preps.length > 0 ? totalPrepared : null,
        served_quantity: sessionServings.length > 0 ? totalServed : null,
        leftover_quantity: sessionLeftovers.length > 0 ? totalLeftover : null,
        leftover_classification: sessionLeftovers[0]?.classification || null,
        pipeline_status: pipelineStatus,
        items,
        preparations: preps,
        servings: sessionServings,
        leftovers: sessionLeftovers,
      });
    }

    return pipelineItems;
  }

  async getMealPipelineBySessionId(sessionId: string): Promise<MealFoodPipelineItem | null> {
    const attendanceProvider = getAttendanceProvider();
    const today = getTodayDateStringIST();
    const pipelines = await this.getTodayMealPipelines(today);
    const found = pipelines.find((p) => p.session_id === sessionId);
    if (found) return found;

    // Search historical if not in today
    const sessions = await attendanceProvider.getDailySessions('2026-09-24');
    const targetSession = sessions.find((s) => s.id === sessionId);
    if (targetSession) {
      const historicalPipelines = await this.getTodayMealPipelines('2026-09-24');
      return historicalPipelines.find((p) => p.session_id === sessionId) || null;
    }
    return null;
  }

  async calculateMealRequirement(
    sessionId: string,
    bufferPercent: number = 5.0
  ): Promise<{ success: boolean; requirement?: MealRequirement; error?: string }> {
    const attendanceProvider = getAttendanceProvider();
    const sessions = await attendanceProvider.getDailySessions(getTodayDateStringIST());
    const session = sessions.find((s) => s.id === sessionId) || {
      id: sessionId,
      session_date: getTodayDateStringIST(),
      meal_type: 'breakfast',
    };

    const students = await attendanceProvider.getAllStudents();
    const totalStudents = students.length || 325;

    // Pull attendance numbers (Default demo: 286 attending, 31 not attending, 8 no response)
    const attendingCount = 286;
    const notAttendingCount = 31;
    const noResponseCount = 8;

    const menuItems = await this.getFoodItems();
    const calculated = calculateFoodRequirement(
      attendingCount,
      notAttendingCount,
      noResponseCount,
      bufferPercent,
      menuItems.slice(0, 3)
    );

    const nowIso = new Date().toISOString();
    const reqId = `req-${Date.now()}`;

    // Existing requirement update or insert
    const existingIdx = this.store.requirements.findIndex((r) => r.meal_session_id === sessionId);
    let newVersion = 1;

    if (existingIdx !== -1) {
      newVersion = this.store.requirements[existingIdx].calculation_version + 1;
    }

    const requirement: MealRequirement = {
      id: reqId,
      meal_session_id: sessionId,
      attending_count: calculated.attending_count,
      not_attending_count: calculated.not_attending_count,
      no_response_count: calculated.no_response_count,
      buffer_percent: calculated.buffer_percent,
      base_quantity: calculated.base_quantity,
      recommended_quantity: calculated.recommended_quantity,
      status: 'calculated',
      calculation_version: newVersion,
      approved_by: null,
      approved_at: null,
      created_at: nowIso,
      updated_at: nowIso,
    };

    if (existingIdx !== -1) {
      this.store.requirements[existingIdx] = requirement;
    } else {
      this.store.requirements.push(requirement);
    }

    // Insert Item lines
    for (const item of calculated.items) {
      this.store.requirementItems.push({
        id: `ritem-${Date.now()}-${item.food_item_id}`,
        meal_requirement_id: reqId,
        food_item_id: item.food_item_id,
        consumption_factor: item.consumption_factor,
        base_quantity: item.base_quantity,
        buffer_quantity: item.buffer_quantity,
        recommended_quantity: item.recommended_quantity,
        unit: item.unit,
        created_at: nowIso,
        updated_at: nowIso,
      });
    }

    // Audit Event
    this.store.events.push({
      id: `fe-${Date.now()}`,
      meal_session_id: sessionId,
      event_type: 'REQUIREMENT_CALCULATED',
      metadata: {
        attending_count: attendingCount,
        buffer_percent: bufferPercent,
        recommended_quantity: calculated.recommended_quantity,
      },
      created_at: nowIso,
    });

    return { success: true, requirement };
  }

  async approveMealRequirement(
    requirementId: string,
    adminId: string = 'a0000000-0000-0000-0000-000000000001'
  ): Promise<{ success: boolean; error?: string }> {
    const req = this.store.requirements.find((r) => r.id === requirementId);
    if (!req) return { success: false, error: 'Requirement not found' };

    const nowIso = new Date().toISOString();
    req.status = 'approved';
    req.approved_by = adminId;
    req.approved_at = nowIso;
    req.updated_at = nowIso;

    // Audit Event
    this.store.events.push({
      id: `fe-${Date.now()}`,
      meal_session_id: req.meal_session_id,
      event_type: 'REQUIREMENT_APPROVED',
      metadata: {
        requirement_id: requirementId,
        approved_by: adminId,
        version: req.calculation_version,
      },
      created_at: nowIso,
    });

    return { success: true };
  }

  async reviseMealRequirement(
    requirementId: string,
    newAttendingCount: number,
    reason: string,
    adminId: string = 'a0000000-0000-0000-0000-000000000001'
  ): Promise<{ success: boolean; error?: string }> {
    const req = this.store.requirements.find((r) => r.id === requirementId);
    if (!req) return { success: false, error: 'Requirement not found' };

    const previousQty = req.recommended_quantity;
    const previousAttending = req.attending_count;
    const bufferPercent = req.buffer_percent;

    // Recalculate
    const newBase = newAttendingCount;
    const newBuffer = Math.ceil(newBase * (bufferPercent / 100));
    const newRecommended = newBase + newBuffer;

    const nowIso = new Date().toISOString();
    const nextVersion = req.calculation_version + 1;

    // Record Immutable Revision (PRD Section 18)
    this.store.revisions.unshift({
      id: `rev-${Date.now()}`,
      meal_requirement_id: requirementId,
      version: nextVersion,
      previous_quantity: previousQty,
      new_quantity: newRecommended,
      previous_attending: previousAttending,
      new_attending: newAttendingCount,
      reason: reason || 'Approved attendance correction after cutoff',
      created_by: adminId,
      created_at: nowIso,
    });

    // Update Requirement
    req.attending_count = newAttendingCount;
    req.base_quantity = newBase;
    req.recommended_quantity = newRecommended;
    req.calculation_version = nextVersion;
    req.updated_at = nowIso;

    // Audit Event
    this.store.events.push({
      id: `fe-${Date.now()}`,
      meal_session_id: req.meal_session_id,
      event_type: 'REQUIREMENT_REVISED',
      metadata: {
        version: nextVersion,
        previous_quantity: previousQty,
        new_quantity: newRecommended,
        reason,
      },
      created_at: nowIso,
    });

    return { success: true };
  }

  async recordPreparation(
    requirementId: string,
    foodItemId: string,
    preparedQuantity: number,
    unit: FoodUnit,
    remarks?: string,
    adminId: string = 'a0000000-0000-0000-0000-000000000001'
  ): Promise<{ success: boolean; error?: string }> {
    const req = this.store.requirements.find((r) => r.id === requirementId);
    if (!req) return { success: false, error: 'Requirement not found' };

    const nowIso = new Date().toISOString();
    const plannedQty = req.recommended_quantity;

    this.store.preparations.push({
      id: `prep-${Date.now()}`,
      meal_requirement_id: requirementId,
      food_item_id: foodItemId,
      planned_quantity: plannedQty,
      prepared_quantity: preparedQuantity,
      unit,
      recorded_by: adminId,
      recorded_at: nowIso,
      remarks: remarks || 'Kitchen batch cooked',
    });

    req.status = 'prepared';
    req.updated_at = nowIso;

    // Audit Event
    this.store.events.push({
      id: `fe-${Date.now()}`,
      meal_session_id: req.meal_session_id,
      event_type: 'PREPARATION_ENTERED',
      metadata: { planned_quantity: plannedQty, prepared_quantity: preparedQuantity, unit },
      created_at: nowIso,
    });

    return { success: true };
  }

  async recordServing(
    sessionId: string,
    foodItemId: string,
    servedQuantity: number,
    unit: FoodUnit,
    servingStatus: ServingStatus = 'serving',
    remarks?: string,
    adminId: string = 'a0000000-0000-0000-0000-000000000001'
  ): Promise<{ success: boolean; error?: string }> {
    const nowIso = new Date().toISOString();

    this.store.servings.push({
      id: `srv-${Date.now()}`,
      meal_session_id: sessionId,
      food_item_id: foodItemId,
      served_quantity: servedQuantity,
      unit,
      serving_status: servingStatus,
      recorded_by: adminId,
      recorded_at: nowIso,
      remarks: remarks || 'Served to dining tables',
    });

    const req = this.store.requirements.find((r) => r.meal_session_id === sessionId);
    if (req) {
      req.status = servingStatus === 'completed' ? 'completed' : 'serving';
      req.updated_at = nowIso;
    }

    // Audit Event
    this.store.events.push({
      id: `fe-${Date.now()}`,
      meal_session_id: sessionId,
      event_type: 'SERVING_ENTERED',
      metadata: { served_quantity: servedQuantity, serving_status: servingStatus },
      created_at: nowIso,
    });

    return { success: true };
  }

  async recordLeftover(
    sessionId: string,
    foodItemId: string,
    quantity: number,
    unit: FoodUnit,
    classification: LeftoverClassification,
    remarks?: string,
    adminId: string = 'a0000000-0000-0000-0000-000000000001'
  ): Promise<{ success: boolean; error?: string }> {
    const nowIso = new Date().toISOString();

    this.store.leftovers.push({
      id: `left-${Date.now()}`,
      meal_session_id: sessionId,
      food_item_id: foodItemId,
      quantity,
      unit,
      classification,
      recorded_by: adminId,
      recorded_at: nowIso,
      remarks: remarks || `Leftovers classified as ${classification}`,
    });

    const req = this.store.requirements.find((r) => r.meal_session_id === sessionId);
    if (req) {
      req.status = 'completed';
      req.updated_at = nowIso;
    }

    // Audit Event
    this.store.events.push({
      id: `fe-${Date.now()}`,
      meal_session_id: sessionId,
      event_type: 'LEFTOVER_RECORDED',
      metadata: { quantity, unit, classification },
      created_at: nowIso,
    });

    return { success: true };
  }

  async getTableWiseFoodRequirement(sessionId: string): Promise<TableFoodRequirement[]> {
    const tableProvider = getTableProvider();
    const supplierProvider = getSupplierProvider();
    const today = getTodayDateStringIST();

    const [tables, duties] = await Promise.all([
      tableProvider.getTables(),
      supplierProvider.getTodaySupplierDuties(today),
    ]);

    const results: TableFoodRequirement[] = [];

    for (const table of tables) {
      const duty = duties.find((d) => d.table_id === table.id);
      const isTable31 = table.table_number === 31;

      // PRD seed scenario: Table 31 has 8 members, 7 attending, 1 not attending
      let attending = 7;
      let notAttending = 1;
      let noResponse = 0;

      if (!isTable31) {
        if (table.table_number % 3 === 0) {
          attending = 8;
          notAttending = 0;
          noResponse = 0;
        } else if (table.table_number % 2 === 0) {
          attending = 6;
          notAttending = 2;
          noResponse = 0;
        } else {
          attending = 7;
          notAttending = 0;
          noResponse = 1;
        }
      }

      results.push({
        table_id: table.id,
        table_number: table.table_number,
        area_name: table.dining_area?.name || 'Main Dining Hall',
        capacity: table.capacity,
        total_members: 8,
        attending_count: attending,
        not_attending_count: notAttending,
        no_response_count: noResponse,
        primary_supplier_name: duty?.primary_assignment?.student?.name || (isTable31 ? 'Ijas K' : 'Assigned Supplier'),
        supplier_status: duty?.current_status === 'checked_in' ? 'Checked In' : duty?.current_status || 'Pending Check-In',
      });
    }

    return results.sort((a, b) => a.table_number - b.table_number);
  }

  async getDepartmentWiseFoodRequirement(sessionId: string): Promise<DepartmentFoodRequirement[]> {
    return [
      {
        department_id: 'd-qs2',
        department_name: 'Quranic Studies II (QS2)',
        department_code: 'QS2',
        total_students: 60,
        attending_count: 56,
        not_attending_count: 3,
        no_response_count: 1,
      },
      {
        department_id: 'd-qs1',
        department_name: 'Quranic Studies I (QS1)',
        department_code: 'QS1',
        total_students: 48,
        attending_count: 42,
        not_attending_count: 5,
        no_response_count: 1,
      },
      {
        department_id: 'd-hs2',
        department_name: 'Hadith Studies II (HS2)',
        department_code: 'HS2',
        total_students: 42,
        attending_count: 38,
        not_attending_count: 3,
        no_response_count: 1,
      },
      {
        department_id: 'd-is1',
        department_name: 'Islamic Shariah I (IS1)',
        department_code: 'IS1',
        total_students: 85,
        attending_count: 76,
        not_attending_count: 7,
        no_response_count: 2,
      },
      {
        department_id: 'd-ts1',
        department_name: 'Theology & Philosophy (TS1)',
        department_code: 'TS1',
        total_students: 90,
        attending_count: 74,
        not_attending_count: 13,
        no_response_count: 3,
      },
    ];
  }

  async getAllLeftoverRecords(): Promise<MealLeftoverRecord[]> {
    return this.store.leftovers.map((l) => ({
      ...l,
      food_item: this.store.foodItems.find((f) => f.id === l.food_item_id),
    }));
  }

  async getRevisionsForRequirement(requirementId: string): Promise<MealRequirementRevision[]> {
    return this.store.revisions.filter((r) => r.meal_requirement_id === requirementId);
  }

  // --- Master PRD: Food Surplus Management & Safe Donation Workflow ---

  async getFoodSurplusRecords(sessionId?: string): Promise<FoodSurplusRecord[]> {
    const attendanceProvider = getAttendanceProvider();
    const today = getTodayDateStringIST();
    const sessions = await attendanceProvider.getDailySessions(today);

    let list = this.store.surplusRecords;
    if (sessionId) {
      list = list.filter((r) => r.meal_session_id === sessionId);
    }

    return list.map((r) => ({
      ...r,
      food_item: this.store.foodItems.find((f) => f.id === r.food_item_id),
      meal_session: sessions.find((s) => s.id === r.meal_session_id),
    })).sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());
  }

  async recordFoodSurplus(data: {
    mealSessionId?: string;
    meal_session_id?: string;
    meal_slot?: MealSlot;
    foodItemId?: string;
    food_item_id?: string;
    food_name?: string;
    quantity: number;
    unit: FoodUnit | string;
    classification: SurplusClassification;
    qualityStatus?: FoodQualityStatus;
    quality_status?: FoodQualityStatus;
    destination: SurplusDestination;
    wasteReason?: WasteReason;
    waste_reason?: WasteReason;
    destinationNotes?: string;
    notes?: string;
    donationRecipient?: string;
    recipient_org?: string;
    recordedBy?: string;
    recorded_by_name?: string;
    quality_assessed_by?: string;
  }): Promise<{ success: boolean; record?: FoodSurplusRecord; error?: string }> {
    const nowIso = new Date().toISOString();
    const actorId = data.recorded_by_name || data.recordedBy || 'a0000000-0000-0000-0000-000000000001';
    const qualityStatus = data.quality_status || data.qualityStatus || 'NOT_ASSESSED';

    const newRecord: FoodSurplusRecord = {
      id: `surp-${Date.now()}`,
      meal_session_id: data.mealSessionId || data.meal_session_id || 'ms-default',
      meal_slot: data.meal_slot || 'LUNCH',
      food_item_id: data.foodItemId || data.food_item_id || 'fi-portion',
      food_name: data.food_name || 'Meal Portion',
      quantity: data.quantity,
      unit: data.unit as FoodUnit,
      classification: data.classification,
      quality_status: qualityStatus,
      destination: data.destination,
      waste_reason: data.waste_reason || data.wasteReason,
      donation_status: data.destination === 'DONATION' ? 'PENDING_REVIEW' : undefined,
      donation_recipient: data.donationRecipient || data.recipient_org || null,
      recipient_org: data.recipient_org || data.donationRecipient || null,
      destination_notes: data.destinationNotes || data.notes || null,
      notes: data.notes || data.destinationNotes || null,
      recorded_by: actorId,
      recorded_by_name: actorId,
      recorded_at: nowIso,
      quality_assessed_by: data.quality_assessed_by || (qualityStatus !== 'NOT_ASSESSED' ? actorId : null),
      quality_assessed_at: qualityStatus !== 'NOT_ASSESSED' ? nowIso : null,
    };

    this.store.surplusRecords.push(newRecord);

    // Also mirror to leftovers for backward-compatible Phase 4 leftover tracking
    this.store.leftovers.push({
      id: `left-surp-${Date.now()}`,
      meal_session_id: data.mealSessionId || data.meal_session_id || 'ms-default',
      food_item_id: data.foodItemId || data.food_item_id || 'fi-portion',
      quantity: data.quantity,
      unit: (data.unit as FoodUnit) || 'portions',
      classification: data.destination === 'STORAGE' ? 'stored' : data.destination === 'DONATION' ? 'transferred' : data.destination === 'DISPOSAL' ? 'discarded' : 'usable',
      recorded_by: actorId,
      recorded_at: nowIso,
      remarks: data.destinationNotes || data.notes || `Surplus: ${data.destination}`,
    });

    this.store.events.push({
      id: `fe-${Date.now()}`,
      meal_session_id: data.mealSessionId || data.meal_session_id || 'ms-default',
      event_type: 'LEFTOVER_RECORDED',
      metadata: {
        surplus_id: newRecord.id,
        classification: data.classification,
        destination: data.destination,
        quantity: data.quantity,
      },
      created_at: nowIso,
    });

    return { success: true, record: newRecord };
  }

  async approveDonation(
    surplusId: string,
    recipient: string,
    notes?: string,
    adminId: string = 'a0000000-0000-0000-0000-000000000001'
  ): Promise<{ success: boolean; error?: string }> {
    const record = this.store.surplusRecords.find((r) => r.id === surplusId);
    if (!record) return { success: false, error: 'Surplus record not found.' };

    const nowIso = new Date().toISOString();
    record.donation_status = 'APPROVED';
    record.donation_recipient = recipient;
    record.approved_by = adminId;
    record.approved_at = nowIso;
    if (notes) {
      record.destination_notes = record.destination_notes ? `${record.destination_notes} • ${notes}` : notes;
    }

    return { success: true };
  }

  async completeDonation(
    surplusId: string,
    recipientName?: string
  ): Promise<{ success: boolean; error?: string }> {
    const record = this.store.surplusRecords.find((r) => r.id === surplusId);
    if (!record) return { success: false, error: 'Surplus record not found.' };

    record.donation_status = 'DONATED';
    if (recipientName) record.donation_recipient = recipientName;
    return { success: true };
  }

  async rejectDonation(
    surplusId: string,
    reason: string
  ): Promise<{ success: boolean; error?: string }> {
    const record = this.store.surplusRecords.find((r) => r.id === surplusId);
    if (!record) return { success: false, error: 'Surplus record not found.' };

    record.donation_status = 'REJECTED';
    record.destination = 'DISPOSAL';
    record.classification = 'UNUSABLE_FOOD';
    record.destination_notes = record.destination_notes ? `${record.destination_notes} • Rejected: ${reason}` : `Rejected: ${reason}`;
    return { success: true };
  }

  async getFoodSurplusStats(dateStr?: string) {
    const records = await this.getFoodSurplusRecords();
    const preparations = this.store.preparations;
    const servings = this.store.servings;

    const totalPrepared = preparations.reduce((acc, p) => acc + Number(p.prepared_quantity), 0);
    const totalServed = servings.reduce((acc, s) => acc + Number(s.served_quantity), 0);
    const totalSurplus = records.reduce((acc, r) => acc + Number(r.quantity), 0);

    const totalDonated = records
      .filter((r) => r.destination === 'DONATION' && (r.donation_status === 'APPROVED' || r.donation_status === 'DONATED'))
      .reduce((acc, r) => acc + Number(r.quantity), 0);

    const totalStored = records
      .filter((r) => r.destination === 'STORAGE')
      .reduce((acc, r) => acc + Number(r.quantity), 0);

    const totalReused = records
      .filter((r) => r.destination === 'APPROVED_REUSE' || r.destination === 'OTHER_APPROVED_USE')
      .reduce((acc, r) => acc + Number(r.quantity), 0);

    const totalDiscarded = records
      .filter((r) => r.destination === 'DISPOSAL' || r.classification === 'UNUSABLE_FOOD')
      .reduce((acc, r) => acc + Number(r.quantity), 0);

    const wasteReasonCounts: Record<string, number> = {};
    for (const r of records) {
      if (r.waste_reason) {
        wasteReasonCounts[r.waste_reason] = (wasteReasonCounts[r.waste_reason] || 0) + 1;
      }
    }

    return {
      totalPrepared,
      totalServed,
      totalSurplus,
      totalDonated,
      totalStored,
      totalReused,
      totalDiscarded,
      wasteReasonCounts,
    };
  }

  async getMealAudienceBreakdown(sessionId: string): Promise<MealAudienceBreakdown> {
    return {
      meal_session_id: sessionId,
      students_count: 286,
      teachers_count: 14,
      special_group_count: 35,
      guests_count: 8,
      total_expected: 343,
    };
  }
}

// Singleton Provider Instance
let foodPlanningProviderInstance: FoodPlanningProvider | null = null;

export function getFoodPlanningProvider(): FoodPlanningProvider {
  if (!foodPlanningProviderInstance) {
    foodPlanningProviderInstance = new FoodPlanningProvider();
  }
  return foodPlanningProviderInstance;
}
