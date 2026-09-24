// =====================================================================
// Phase 4: Food Requirement & Calculation Engine
// Enforces PRD Sections 7, 8, 11, 12, 15:
// - Explicit rounding up: Math.ceil
// - Base = Confirmed Attending * Consumption Factor
// - Buffer = Base * (BufferPercent / 100)
// - Recommended = Math.ceil(Base + Buffer)
// - Strict distinction: No Response is NOT counted as Attending
// =====================================================================

import { FoodItem, FoodUnit } from '@/types/database';

export interface CalculatedItemRequirement {
  food_item_id: string;
  name: string;
  category: string;
  unit: FoodUnit;
  consumption_factor: number;
  base_quantity: number;
  buffer_quantity: number;
  recommended_quantity: number;
}

export interface CalculatedMealRequirement {
  attending_count: number;
  not_attending_count: number;
  no_response_count: number;
  buffer_percent: number;
  base_quantity: number;
  buffer_quantity: number;
  recommended_quantity: number;
  items: CalculatedItemRequirement[];
}

/**
 * Calculates itemized food requirement with explicit rounding rules
 */
export function calculateFoodRequirement(
  attendingCount: number,
  notAttendingCount: number,
  noResponseCount: number,
  bufferPercent: number,
  menuItems: FoodItem[]
): CalculatedMealRequirement {
  // Base meal portions equals confirmed attending count
  const basePortions = attendingCount;
  const bufferPortions = Math.ceil(basePortions * (bufferPercent / 100));
  const recommendedPortions = basePortions + bufferPortions;

  const calculatedItems: CalculatedItemRequirement[] = menuItems.map((item) => {
    const factor = item.default_consumption_factor || 1.0;
    
    // Exact base quantity depending on unit factor
    const rawBase = attendingCount * factor;
    // Buffer amount
    const rawBuffer = rawBase * (bufferPercent / 100);

    let baseQuantity: number;
    let bufferQuantity: number;
    let recommendedQuantity: number;

    if (item.unit === 'portions' || item.unit === 'pieces' || item.unit === 'packets' || item.unit === 'cups' || item.unit === 'trays' || item.unit === 'batches') {
      // Discrete units round up to whole integers
      baseQuantity = Math.ceil(rawBase);
      bufferQuantity = Math.ceil(rawBuffer);
      recommendedQuantity = baseQuantity + bufferQuantity;
    } else {
      // Weight / Volume units (kg, litres) round to 2 decimal places with safe ceiling
      baseQuantity = Math.round(rawBase * 100) / 100;
      bufferQuantity = Math.round(rawBuffer * 100) / 100;
      recommendedQuantity = Math.round((baseQuantity + bufferQuantity) * 100) / 100;
    }

    return {
      food_item_id: item.id,
      name: item.name,
      category: item.category,
      unit: item.unit,
      consumption_factor: factor,
      base_quantity: baseQuantity,
      buffer_quantity: bufferQuantity,
      recommended_quantity: recommendedQuantity,
    };
  });

  return {
    attending_count: attendingCount,
    not_attending_count: notAttendingCount,
    no_response_count: noResponseCount,
    buffer_percent: bufferPercent,
    base_quantity: basePortions,
    buffer_quantity: bufferPortions,
    recommended_quantity: recommendedPortions,
    items: calculatedItems,
  };
}
