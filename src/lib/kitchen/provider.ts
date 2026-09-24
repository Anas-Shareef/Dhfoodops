// =====================================================================
// Phase 8: Kitchen Operations & Special / Party Orders Provider
// Manages cook operational workflows, 5 daily meal sessions,
// audience breakdown (Students, Teachers, Programme, Guests),
// food preparation, serving records, surplus integration, and special orders.
// =====================================================================

import {
  SpecialMealOrder,
  SpecialMealOrderEvent,
  SpecialMealOrderStatus,
  SpecialMealOrderAudienceType,
  KitchenMealStatus,
  KitchenMealSessionCard,
  MealSlot,
  SurplusClassification,
  SurplusDestination,
  WasteReason,
} from '@/types/database';
import { getTodayDateStringIST, formatTimeIST } from '@/lib/utils/timezone';
import { getMenuProvider } from '@/lib/food/menu-provider';
import { getAttendanceProvider } from '@/lib/attendance/provider';
import { getFoodPlanningProvider } from '@/lib/food/provider';

interface KitchenStore {
  specialOrders: SpecialMealOrder[];
  orderEvents: SpecialMealOrderEvent[];
  mealOverrides: Record<string, Partial<KitchenMealSessionCard>>;
}

function initializeKitchenStore(): KitchenStore {
  const specialOrders: SpecialMealOrder[] = [
    {
      id: 'smo-1',
      order_number: 'SMO-000001',
      title: 'Postgraduate Certificate Programme Valedictory',
      description: 'Special lunch for visiting certificate programme candidates and coordinators',
      requested_for_date: '2026-09-24',
      meal_slot: 'LUNCH',
      quantity: 35,
      requested_by: 'b7777777-7777-7777-7777-777777777771',
      requester_name: 'Dr. Usman Nadwi',
      requester_role: 'Programme Coordinator',
      audience_type: 'PROGRAMME',
      special_requirements: 'Serve at First Floor VIP Dining room, hot sambar and fresh ghee rice at 1:00 PM',
      status: 'APPROVED',
      approved_by: 'a0000000-0000-0000-0000-000000000001',
      approved_by_name: 'Supervisor Shafi',
      approved_at: '2026-09-23T16:00:00+05:30',
      assigned_to: 'c1111111-1111-1111-1111-111111111111',
      assigned_to_name: 'Chef Moideen (Head Cook)',
      assigned_at: '2026-09-24T06:00:00+05:30',
      prepared_quantity: 35,
      served_quantity: 0,
      created_at: '2026-09-23T14:30:00+05:30',
      updated_at: '2026-09-24T06:00:00+05:30',
      events: [
        {
          id: 'sme-1-1',
          order_id: 'smo-1',
          event_type: 'ORDER_SUBMITTED',
          previous_status: 'DRAFT',
          new_status: 'SUBMITTED',
          performed_by_name: 'Dr. Usman Nadwi',
          performed_at: '2026-09-23T14:30:00+05:30',
          notes: 'Submitted for 35 visiting scholars',
        },
        {
          id: 'sme-1-2',
          order_id: 'smo-1',
          event_type: 'ORDER_APPROVED',
          previous_status: 'SUBMITTED',
          new_status: 'APPROVED',
          performed_by_name: 'Supervisor Shafi',
          performed_at: '2026-09-23T16:00:00+05:30',
          notes: 'Institutional hospitality approved',
        },
        {
          id: 'sme-1-3',
          order_id: 'smo-1',
          event_type: 'ORDER_ASSIGNED',
          previous_status: 'APPROVED',
          new_status: 'ASSIGNED',
          performed_by_name: 'Supervisor Shafi',
          performed_at: '2026-09-24T06:00:00+05:30',
          notes: 'Assigned to Chef Moideen for morning preparation',
        },
      ],
    },
    {
      id: 'smo-2',
      order_number: 'SMO-000002',
      title: 'University External Academic Inspection Team',
      description: 'Accreditation board committee lunch',
      requested_for_date: '2026-09-24',
      meal_slot: 'LUNCH',
      quantity: 8,
      requested_by: 'b7777777-7777-7777-7777-777777777772',
      requester_name: 'Prof. Faisal Hameed',
      requester_role: 'Registrar Office',
      audience_type: 'GUEST',
      special_requirements: 'Fresh fruit juice, mild spice curry',
      status: 'APPROVED',
      approved_by: 'a0000000-0000-0000-0000-000000000001',
      approved_by_name: 'Supervisor Shafi',
      approved_at: '2026-09-23T17:30:00+05:30',
      assigned_to: 'c1111111-1111-1111-1111-111111111111',
      assigned_to_name: 'Chef Moideen (Head Cook)',
      assigned_at: '2026-09-24T06:00:00+05:30',
      prepared_quantity: 8,
      served_quantity: 0,
      created_at: '2026-09-23T17:00:00+05:30',
      updated_at: '2026-09-24T06:00:00+05:30',
      events: [
        {
          id: 'sme-2-1',
          order_id: 'smo-2',
          event_type: 'ORDER_APPROVED',
          previous_status: 'SUBMITTED',
          new_status: 'APPROVED',
          performed_by_name: 'Supervisor Shafi',
          performed_at: '2026-09-23T17:30:00+05:30',
          notes: 'Approved VIP inspection meal',
        },
      ],
    },
    {
      id: 'smo-3',
      order_number: 'SMO-000003',
      title: 'Department of Quranic Studies Research Colloquium',
      description: 'Evening tea and snacks for faculty seminar',
      requested_for_date: '2026-09-24',
      meal_slot: 'EVENING_SNACKS',
      quantity: 20,
      requested_by: 'b7777777-7777-7777-7777-777777777773',
      requester_name: 'Usthad Zubair Hudawi',
      requester_role: 'Dept HOD',
      audience_type: 'SEMINAR',
      special_requirements: 'Sugar-free tea option requested for 4 members',
      status: 'SUBMITTED',
      created_at: '2026-09-24T08:00:00+05:30',
      updated_at: '2026-09-24T08:00:00+05:30',
      events: [
        {
          id: 'sme-3-1',
          order_id: 'smo-3',
          event_type: 'ORDER_SUBMITTED',
          previous_status: 'DRAFT',
          new_status: 'SUBMITTED',
          performed_by_name: 'Usthad Zubair Hudawi',
          performed_at: '2026-09-24T08:00:00+05:30',
          notes: 'Awaiting supervisor approval',
        },
      ],
    },
  ];

  const orderEvents: SpecialMealOrderEvent[] = [];
  specialOrders.forEach((o) => {
    if (o.events) orderEvents.push(...o.events);
  });

  const mealOverrides: Record<string, Partial<KitchenMealSessionCard>> = {
    EARLY_MORNING_SNACKS: {
      status: 'COMPLETED',
      prepared_quantity: 160,
      served_quantity: 154,
      surplus_quantity: 6,
      prepared_by: 'Chef Moideen',
      prepared_at: '2026-09-24T06:10:00+05:30',
      served_at: '2026-09-24T06:50:00+05:30',
    },
    BREAKFAST: {
      status: 'COMPLETED',
      prepared_quantity: 340,
      served_quantity: 326,
      surplus_quantity: 14,
      prepared_by: 'Chef Moideen',
      prepared_at: '2026-09-24T07:45:00+05:30',
      served_at: '2026-09-24T08:45:00+05:30',
    },
    LUNCH: {
      status: 'PREPARING',
      prepared_quantity: 360,
      served_quantity: 0,
      surplus_quantity: 0,
      prepared_by: 'Chef Moideen & Team',
      prepared_at: '2026-09-24T09:15:00+05:30',
    },
    EVENING_SNACKS: {
      status: 'SCHEDULED',
      prepared_quantity: 0,
      served_quantity: 0,
      surplus_quantity: 0,
    },
    DINNER: {
      status: 'SCHEDULED',
      prepared_quantity: 0,
      served_quantity: 0,
      surplus_quantity: 0,
    },
  };

  return { specialOrders, orderEvents, mealOverrides };
}

export class KitchenProvider {
  private store: KitchenStore;

  constructor() {
    this.store = initializeKitchenStore();
  }

  /**
   * Resolves today's 5 kitchen meal sessions with live audience breakdown,
   * published menu context, and operational preparation states.
   */
  async getTodayKitchenMeals(): Promise<KitchenMealSessionCard[]> {
    const today = getTodayDateStringIST();
    const menuProvider = getMenuProvider();
    const menuSummary = await menuProvider.getTodayMenu(today);

    // Standard 5 meal slots
    const slots: { slot: MealSlot; time: string; nameEn: string; nameMl: string; defaultPrep: number }[] = [
      { slot: 'EARLY_MORNING_SNACKS', time: '06:30 AM', nameEn: 'Early Morning Snacks', nameMl: 'പ്രഭാത ലഘുഭക്ഷണം', defaultPrep: 160 },
      { slot: 'BREAKFAST', time: '08:30 AM', nameEn: 'Breakfast', nameMl: 'പ്രഭാതഭക്ഷണം', defaultPrep: 330 },
      { slot: 'LUNCH', time: '01:00 PM', nameEn: 'Lunch', nameMl: 'ഉച്ചഭക്ഷണം', defaultPrep: 350 },
      { slot: 'EVENING_SNACKS', time: '04:30 PM', nameEn: 'Evening Snacks', nameMl: 'വൈകുന്നേരത്തെ ചായ', defaultPrep: 220 },
      { slot: 'DINNER', time: '08:00 PM', nameEn: 'Dinner', nameMl: 'അത്താഴം', defaultPrep: 320 },
    ];

    const cards: KitchenMealSessionCard[] = [];

    for (const s of slots) {
      const menuSlot = menuSummary.slots.find((ms) => ms.slot === s.slot || ms.meal_slot === s.slot);
      const override = this.store.mealOverrides[s.slot] || {};

      // Calculate approved special orders for this slot
      const approvedOrders = this.store.specialOrders.filter(
        (o) => o.requested_for_date === today && o.meal_slot === s.slot && (o.status === 'APPROVED' || o.status === 'ASSIGNED' || o.status === 'PREPARING' || o.status === 'PREPARED' || o.status === 'SERVED' || o.status === 'COMPLETED')
      );

      const programmeQty = approvedOrders
        .filter((o) => o.audience_type === 'PROGRAMME' || o.audience_type === 'SEMINAR')
        .reduce((sum, o) => sum + o.quantity, 0);

      const guestsQty = approvedOrders
        .filter((o) => o.audience_type === 'GUEST' || o.audience_type === 'VISITOR' || o.audience_type === 'EXTERNAL_GROUP' || o.audience_type === 'MEETING')
        .reduce((sum, o) => sum + o.quantity, 0);

      // Baseline student attendance and teacher area meals
      const studentsExpected = s.slot === 'LUNCH' ? 286 : s.slot === 'BREAKFAST' ? 280 : s.slot === 'DINNER' ? 275 : 150;
      const teachersExpected = 12; // Standard teacher dining area count
      const totalExpected = studentsExpected + teachersExpected + programmeQty + guestsQty;
      const bufferQuantity = Math.ceil(totalExpected * 0.05); // 5% standard kitchen buffer
      const recommendedPortions = totalExpected + bufferQuantity;

      cards.push({
        session_id: `ks-${today}-${s.slot.toLowerCase()}`,
        meal_slot: s.slot,
        meal_name_en: s.nameEn,
        meal_name_ml: s.nameMl,
        meal_time: s.time,
        date: today,
        status: override.status || 'SCHEDULED',
        menu_items_en: menuSlot?.items_en && menuSlot.items_en.length > 0 ? menuSlot.items_en : ['Steamed Rice', 'Curry', 'Accompaniments'],
        menu_items_ml: menuSlot?.items_ml && menuSlot.items_ml.length > 0 ? menuSlot.items_ml : ['ചോറ്', 'കറി', 'കൂട്ടുകറികൾ'],
        students_expected: studentsExpected,
        teachers_expected: teachersExpected,
        programme_candidates: programmeQty,
        guests_expected: guestsQty,
        total_expected: totalExpected,
        buffer_quantity: bufferQuantity,
        recommended_portions: recommendedPortions,
        prepared_quantity: override.prepared_quantity ?? (override.status === 'COMPLETED' ? recommendedPortions : 0),
        served_quantity: override.served_quantity ?? 0,
        surplus_quantity: override.surplus_quantity ?? 0,
        prepared_by: override.prepared_by || null,
        prepared_at: override.prepared_at || null,
        served_at: override.served_at || null,
        special_orders_count: approvedOrders.length,
      });
    }

    return cards;
  }

  async getKitchenMealDetail(mealSlot: MealSlot): Promise<KitchenMealSessionCard | null> {
    const meals = await this.getTodayKitchenMeals();
    return meals.find((m) => m.meal_slot === mealSlot) || null;
  }

  async startPreparation(
    mealSlot: MealSlot,
    preparedBy: string = 'Chef Moideen'
  ): Promise<{ success: boolean; error?: string }> {
    const nowIso = new Date().toISOString();
    this.store.mealOverrides[mealSlot] = {
      ...this.store.mealOverrides[mealSlot],
      status: 'PREPARING',
      prepared_by: preparedBy,
      prepared_at: nowIso,
    };
    return { success: true };
  }

  async markPrepared(
    mealSlot: MealSlot,
    preparedQuantity: number,
    preparedBy: string = 'Chef Moideen'
  ): Promise<{ success: boolean; error?: string }> {
    const nowIso = new Date().toISOString();
    this.store.mealOverrides[mealSlot] = {
      ...this.store.mealOverrides[mealSlot],
      status: 'READY_TO_SERVE',
      prepared_quantity: preparedQuantity,
      prepared_by: preparedBy,
      prepared_at: nowIso,
    };
    return { success: true };
  }

  async recordServing(
    mealSlot: MealSlot,
    servedQuantity: number,
    servedBy: string = 'Chef Moideen'
  ): Promise<{ success: boolean; error?: string }> {
    const nowIso = new Date().toISOString();
    const existing = this.store.mealOverrides[mealSlot] || {};
    const prepared = existing.prepared_quantity || servedQuantity;
    const surplus = Math.max(0, prepared - servedQuantity);

    this.store.mealOverrides[mealSlot] = {
      ...existing,
      status: 'SERVING',
      served_quantity: servedQuantity,
      surplus_quantity: surplus,
      served_at: nowIso,
    };
    return { success: true };
  }

  async completeKitchenMeal(
    mealSlot: MealSlot,
    completedBy: string = 'Chef Moideen'
  ): Promise<{ success: boolean; error?: string }> {
    const existing = this.store.mealOverrides[mealSlot] || {};
    this.store.mealOverrides[mealSlot] = {
      ...existing,
      status: 'COMPLETED',
    };
    return { success: true };
  }

  /**
   * Surplus Integration (PRD Section 28 & 29):
   * Seamlessly logs remaining meal portions to the authoritative Phase 4 FoodSurplus ledger.
   */
  async logKitchenSurplus(
    mealSlot: MealSlot,
    quantity: number,
    classification: SurplusClassification,
    destination: SurplusDestination,
    wasteReason?: WasteReason,
    notes?: string,
    recordedByName: string = 'Chef Moideen'
  ): Promise<{ success: boolean; error?: string }> {
    const foodPlanningProvider = getFoodPlanningProvider();
    const existing = this.store.mealOverrides[mealSlot] || {};

    this.store.mealOverrides[mealSlot] = {
      ...existing,
      surplus_quantity: quantity,
      status: 'COMPLETED',
    };

    // Forward to Phase 4 Food Surplus Provider
    await foodPlanningProvider.recordFoodSurplus({
      meal_slot: mealSlot,
      quantity,
      unit: 'portions',
      classification,
      destination,
      waste_reason: wasteReason || 'COOKING_VARIANCE',
      notes: notes || `Surplus logged from Kitchen Operations for ${mealSlot}`,
      recorded_by_name: recordedByName,
    });

    return { success: true };
  }

  // ===================================================================
  // SPECIAL / PARTY ORDERS (PRD Sections 12–22)
  // ===================================================================

  async getAllSpecialOrders(): Promise<SpecialMealOrder[]> {
    return [...this.store.specialOrders].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  async getSpecialOrderById(id: string): Promise<SpecialMealOrder | null> {
    return this.store.specialOrders.find((o) => o.id === id) || null;
  }

  async createSpecialOrder(
    data: {
      title: string;
      description?: string;
      requested_for_date: string;
      meal_slot: MealSlot;
      quantity: number;
      requester_name: string;
      requester_role?: string;
      audience_type: SpecialMealOrderAudienceType;
      special_requirements?: string;
    },
    requesterId: string = 'u-requester-1'
  ): Promise<{ success: boolean; order?: SpecialMealOrder; error?: string }> {
    if (data.quantity <= 0) return { success: false, error: 'Quantity must be greater than zero.' };

    const count = this.store.specialOrders.length + 1;
    const orderNumber = `SMO-${count.toString().padStart(6, '0')}`;
    const nowIso = new Date().toISOString();

    const newOrder: SpecialMealOrder = {
      id: `smo-${Date.now()}`,
      order_number: orderNumber,
      title: data.title,
      description: data.description,
      requested_for_date: data.requested_for_date,
      meal_slot: data.meal_slot,
      quantity: data.quantity,
      requested_by: requesterId,
      requester_name: data.requester_name,
      requester_role: data.requester_role,
      audience_type: data.audience_type,
      special_requirements: data.special_requirements,
      status: 'SUBMITTED',
      created_at: nowIso,
      updated_at: nowIso,
      events: [
        {
          id: `sme-${Date.now()}`,
          order_id: `smo-${Date.now()}`,
          event_type: 'ORDER_SUBMITTED',
          previous_status: 'DRAFT',
          new_status: 'SUBMITTED',
          performed_by: requesterId,
          performed_by_name: data.requester_name,
          performed_at: nowIso,
          notes: `Created order ${orderNumber} for ${data.quantity} portions`,
        },
      ],
    };

    this.store.specialOrders.unshift(newOrder);
    return { success: true, order: newOrder };
  }

  async approveSpecialOrder(
    orderId: string,
    approvedBy: string = 'a0000000-0000-0000-0000-000000000001',
    approvedByName: string = 'Supervisor Shafi',
    notes?: string
  ): Promise<{ success: boolean; error?: string }> {
    const order = this.store.specialOrders.find((o) => o.id === orderId);
    if (!order) return { success: false, error: 'Special order not found.' };

    const nowIso = new Date().toISOString();
    const prevStatus = order.status;

    order.status = 'APPROVED';
    order.approved_by = approvedBy;
    order.approved_by_name = approvedByName;
    order.approved_at = nowIso;
    order.updated_at = nowIso;

    order.events = order.events || [];
    order.events.push({
      id: `sme-${Date.now()}`,
      order_id: order.id,
      event_type: 'ORDER_APPROVED',
      previous_status: prevStatus,
      new_status: 'APPROVED',
      performed_by: approvedBy,
      performed_by_name: approvedByName,
      performed_at: nowIso,
      notes: notes || 'Supervisor approval granted',
    });

    return { success: true };
  }

  async assignSpecialOrder(
    orderId: string,
    cookId: string,
    cookName: string,
    assignedBy: string = 'a0000000-0000-0000-0000-000000000001',
    assignedByName: string = 'Supervisor Shafi'
  ): Promise<{ success: boolean; error?: string }> {
    const order = this.store.specialOrders.find((o) => o.id === orderId);
    if (!order) return { success: false, error: 'Special order not found.' };

    const nowIso = new Date().toISOString();
    const prevStatus = order.status;

    order.status = 'ASSIGNED';
    order.assigned_to = cookId;
    order.assigned_to_name = cookName;
    order.assigned_at = nowIso;
    order.updated_at = nowIso;

    order.events = order.events || [];
    order.events.push({
      id: `sme-${Date.now()}`,
      order_id: order.id,
      event_type: 'ORDER_ASSIGNED',
      previous_status: prevStatus,
      new_status: 'ASSIGNED',
      performed_by: assignedBy,
      performed_by_name: assignedByName,
      performed_at: nowIso,
      notes: `Assigned to ${cookName}`,
    });

    return { success: true };
  }

  async updateSpecialOrderStatus(
    orderId: string,
    newStatus: SpecialMealOrderStatus,
    performedBy?: string,
    performedByName?: string,
    notes?: string
  ): Promise<{ success: boolean; error?: string }> {
    const order = this.store.specialOrders.find((o) => o.id === orderId);
    if (!order) return { success: false, error: 'Special order not found.' };

    const nowIso = new Date().toISOString();
    const prevStatus = order.status;

    order.status = newStatus;
    if (newStatus === 'COMPLETED') order.completed_at = nowIso;
    order.updated_at = nowIso;

    order.events = order.events || [];
    order.events.push({
      id: `sme-${Date.now()}`,
      order_id: order.id,
      event_type: `ORDER_${newStatus}`,
      previous_status: prevStatus,
      new_status: newStatus,
      performed_by: performedBy,
      performed_by_name: performedByName || 'Kitchen Staff',
      performed_at: nowIso,
      notes,
    });

    return { success: true };
  }

  async cancelSpecialOrder(
    orderId: string,
    reason: string,
    cancelledBy: string = 'a0000000-0000-0000-0000-000000000001',
    cancelledByName: string = 'Supervisor Shafi'
  ): Promise<{ success: boolean; error?: string }> {
    const order = this.store.specialOrders.find((o) => o.id === orderId);
    if (!order) return { success: false, error: 'Special order not found.' };

    if (!reason || reason.trim().length < 5) {
      return { success: false, error: 'Cancellation reason is required.' };
    }

    const nowIso = new Date().toISOString();
    const prevStatus = order.status;

    order.status = 'CANCELLED';
    order.cancelled_reason = reason;
    order.updated_at = nowIso;

    order.events = order.events || [];
    order.events.push({
      id: `sme-${Date.now()}`,
      order_id: order.id,
      event_type: 'ORDER_CANCELLED',
      previous_status: prevStatus,
      new_status: 'CANCELLED',
      performed_by: cancelledBy,
      performed_by_name: cancelledByName,
      performed_at: nowIso,
      notes: `Cancellation reason: ${reason}`,
    });

    return { success: true };
  }
}

let kitchenProviderInstance: KitchenProvider | null = null;

export function getKitchenProvider(): KitchenProvider {
  if (!kitchenProviderInstance) {
    kitchenProviderInstance = new KitchenProvider();
  }
  return kitchenProviderInstance;
}
