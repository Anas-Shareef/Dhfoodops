// =====================================================================
// Master PRD: Weekly Meal Menu & Daily Menu Provider
// Implements full 7-day x 5-slot recurring schedule with Malayalam + English,
// role-based visibility (Students = Today only, Admins = Full week),
// and emergency menu update audit trail.
// =====================================================================

import {
  WeeklyMenuItem,
  DayOfWeek,
  MealSlot,
  TodayMenuSummary,
  TodayMealMenuSlot,
  MenuChangeLog,
  MenuStatus
} from '@/types/database';
import { getTodayDateStringIST, formatTimeIST } from '@/lib/utils/timezone';

export const MEAL_SLOT_CONFIG: Record<
  MealSlot,
  { nameEn: string; nameMl: string; labelEn: string; labelMl: string; defaultTime: string; icon: string; order: number }
> = {
  EARLY_MORNING_SNACKS: {
    nameEn: 'Early Morning Tea & Snacks',
    labelEn: 'Early Morning Tea & Snacks',
    nameMl: 'രാവിലെ ചായയും ലഘുഭക്ഷണവും',
    labelMl: 'രാവിലെ ചായയും ലഘുഭക്ഷണവും',
    defaultTime: '06:30 AM',
    icon: 'Coffee',
    order: 1,
  },
  BREAKFAST: {
    nameEn: 'Breakfast',
    labelEn: 'Breakfast',
    nameMl: 'പ്രഭാതഭക്ഷണം',
    labelMl: 'പ്രഭാതഭക്ഷണം',
    defaultTime: '08:30 AM',
    icon: 'Utensils',
    order: 2,
  },
  LUNCH: {
    nameEn: 'Lunch',
    labelEn: 'Lunch',
    nameMl: 'ഉച്ചഭക്ഷണം',
    labelMl: 'ഉച്ചഭക്ഷണം',
    defaultTime: '01:00 PM',
    icon: 'Sun',
    order: 3,
  },
  EVENING_SNACKS: {
    nameEn: 'Evening Snacks',
    labelEn: 'Evening Snacks',
    nameMl: 'വൈകുന്നേരത്തെ ചായയും ലഘുഭക്ഷണവും',
    labelMl: 'വൈകുന്നേരത്തെ ചായയും ലഘുഭക്ഷണവും',
    defaultTime: '04:30 PM',
    icon: 'Coffee',
    order: 4,
  },
  DINNER: {
    nameEn: 'Dinner',
    labelEn: 'Dinner',
    nameMl: 'അത്താഴം',
    labelMl: 'അത്താഴം',
    defaultTime: '08:00 PM',
    icon: 'Moon',
    order: 5,
  },
};

export const MEAL_SLOT_CONFIGS = MEAL_SLOT_CONFIG;

export const DAY_NAMES: Record<string, { en: string; ml: string; dayIndex: number }> = {
  SUNDAY: { en: 'Sunday', ml: 'ഞായർ', dayIndex: 0 },
  MONDAY: { en: 'Monday', ml: 'തിങ്കൾ', dayIndex: 1 },
  TUESDAY: { en: 'Tuesday', ml: 'ചൊവ്വ', dayIndex: 2 },
  WEDNESDAY: { en: 'Wednesday', ml: 'ബുധൻ', dayIndex: 3 },
  THURSDAY: { en: 'Thursday', ml: 'വ്യാഴം', dayIndex: 4 },
  FRIDAY: { en: 'Friday', ml: 'വെള്ളി', dayIndex: 5 },
  SATURDAY: { en: 'Saturday', ml: 'ശനി', dayIndex: 6 },
  sunday: { en: 'Sunday', ml: 'ഞായർ', dayIndex: 0 },
  monday: { en: 'Monday', ml: 'തിങ്കൾ', dayIndex: 1 },
  tuesday: { en: 'Tuesday', ml: 'ചൊവ്വ', dayIndex: 2 },
  wednesday: { en: 'Wednesday', ml: 'ബുധൻ', dayIndex: 3 },
  thursday: { en: 'Thursday', ml: 'വ്യാഴം', dayIndex: 4 },
  friday: { en: 'Friday', ml: 'വെള്ളി', dayIndex: 5 },
  saturday: { en: 'Saturday', ml: 'ശനി', dayIndex: 6 },
};

function initializeWeeklySeedMenu(): WeeklyMenuItem[] {
  const nowIso = '2026-09-01T00:00:00Z';
  const effectiveFrom = '2026-09-01';

  const rawSeedData: {
    day: DayOfWeek;
    slot: MealSlot;
    titleEn: string;
    titleMl: string;
    itemsEn: string[];
    itemsMl: string[];
  }[] = [
    // --- Monday (തിങ്കൾ) ---
    {
      day: 'MONDAY',
      slot: 'EARLY_MORNING_SNACKS',
      titleEn: 'Black Tea & Rusk',
      titleMl: 'കട്ടൻ ചായ, റസ്ക്',
      itemsEn: ['Black Tea', 'Rusk'],
      itemsMl: ['കട്ടൻ ചായ', 'റസ്ക്'],
    },
    {
      day: 'MONDAY',
      slot: 'BREAKFAST',
      titleEn: 'Dosa & Kadala Curry',
      titleMl: 'ദോശ, കടലക്കറി',
      itemsEn: ['Dosa', 'Kadala Curry'],
      itemsMl: ['ദോശ', 'കടലക്കറി'],
    },
    {
      day: 'MONDAY',
      slot: 'LUNCH',
      titleEn: 'Fish Mulak Curry, Upperi, Pappadam, Pickle',
      titleMl: 'മീൻ മുളക് കറി, ഉപ്പേരി, പപ്പടം, അച്ചാർ',
      itemsEn: ['Fish Mulak Curry', 'Upperi', 'Pappadam', 'Pickle'],
      itemsMl: ['മീൻ മുളക് കറി', 'ഉപ്പേരി', 'പപ്പടം', 'അച്ചാർ'],
    },
    {
      day: 'MONDAY',
      slot: 'EVENING_SNACKS',
      titleEn: 'Milk Tea & Egg Curry',
      titleMl: 'പാൽ ചായ, എഗ്ഗ്കറി',
      itemsEn: ['Milk Tea', 'Egg Curry'],
      itemsMl: ['പാൽ ചായ', 'എഗ്ഗ്കറി'],
    },
    {
      day: 'MONDAY',
      slot: 'DINNER',
      titleEn: 'Beef Mixed Curry, Upperi, Pickle',
      titleMl: 'ബീഫ് മിക്സ്ഡ് കറി, ഉപ്പേരി, അച്ചാർ',
      itemsEn: ['Beef Mixed Curry', 'Upperi', 'Pickle'],
      itemsMl: ['ബീഫ് മിക്സ്ഡ് കറി', 'ഉപ്പേരി', 'അച്ചാർ'],
    },

    // --- Tuesday (ചൊവ്വ) ---
    {
      day: 'TUESDAY',
      slot: 'EARLY_MORNING_SNACKS',
      titleEn: 'Black Tea & Bread',
      titleMl: 'കട്ടൻ ചായ, ബ്രെഡ്',
      itemsEn: ['Black Tea', 'Bread'],
      itemsMl: ['കട്ടൻ ചായ', 'ബ്രെഡ്'],
    },
    {
      day: 'TUESDAY',
      slot: 'BREAKFAST',
      titleEn: 'Veg Biryani & Chammanthi',
      titleMl: 'വെജ് ബിരിയാണി, ചമ്മന്തി',
      itemsEn: ['Veg Biryani', 'Chammanthi'],
      itemsMl: ['വെജ് ബിരിയാണി', 'ചമ്മന്തി'],
    },
    {
      day: 'TUESDAY',
      slot: 'LUNCH',
      titleEn: 'Sambar, Rasam / Moru, Pappadam, Pickle',
      titleMl: 'സാമ്പാർ, രസം / മോര്, പപ്പടം, അച്ചാർ',
      itemsEn: ['Sambar', 'Rasam / Moru', 'Pappadam', 'Pickle'],
      itemsMl: ['സാമ്പാർ', 'രസം / മോര്', 'പപ്പടം', 'അച്ചാർ'],
    },
    {
      day: 'TUESDAY',
      slot: 'EVENING_SNACKS',
      titleEn: 'Milk Tea & Boiled Egg / Steamed Banana',
      titleMl: 'പാൽ ചായ, മുട്ട / പദം പുഴുങ്ങിയത്',
      itemsEn: ['Milk Tea', 'Boiled Egg / Steamed Banana'],
      itemsMl: ['പാൽ ചായ', 'മുട്ട / പദം പുഴുങ്ങിയത്'],
    },
    {
      day: 'TUESDAY',
      slot: 'DINNER',
      titleEn: 'Dry Fish Curry, Upperi, Pickle',
      titleMl: 'ഉണക്ക മത്സ്യം കറി, ഉപ്പേരി, അച്ചാർ',
      itemsEn: ['Dry Fish Curry', 'Upperi', 'Pickle'],
      itemsMl: ['ഉണക്ക മത്സ്യം കറി', 'ഉപ്പേരി', 'അച്ചാർ'],
    },

    // --- Wednesday (ബുധൻ) ---
    {
      day: 'WEDNESDAY',
      slot: 'EARLY_MORNING_SNACKS',
      titleEn: 'Black Tea & Parle-G',
      titleMl: 'കട്ടൻ ചായ, പാർലേ ജി',
      itemsEn: ['Black Tea', 'Parle-G'],
      itemsMl: ['കട്ടൻ ചായ', 'പാർലേ ജി'],
    },
    {
      day: 'WEDNESDAY',
      slot: 'BREAKFAST',
      titleEn: 'Fried Pathiri & Veg Kurma',
      titleMl: 'പൊരിച്ച പത്തിരി, വെജ് കൂർമ',
      itemsEn: ['Fried Pathiri', 'Veg Kurma'],
      itemsMl: ['പൊരിച്ച പത്തിരി', 'വെജ് കൂർമ'],
    },
    {
      day: 'WEDNESDAY',
      slot: 'LUNCH',
      titleEn: 'Beef Curry, Pappadam, Pickle',
      titleMl: 'ബീഫ് കറി, പപ്പടം, അച്ചാർ',
      itemsEn: ['Beef Curry', 'Pappadam', 'Pickle'],
      itemsMl: ['ബീഫ് കറി', 'പപ്പടം', 'അച്ചാർ'],
    },
    {
      day: 'WEDNESDAY',
      slot: 'EVENING_SNACKS',
      titleEn: 'Milk Tea & Kadala / Aleesa',
      titleMl: 'പാൽ ചായ, കടല / അലീസ്',
      itemsEn: ['Milk Tea', 'Kadala / Aleesa'],
      itemsMl: ['പാൽ ചായ', 'കടല / അലീസ്'],
    },
    {
      day: 'WEDNESDAY',
      slot: 'DINNER',
      titleEn: 'Fish Curry, Upperi, Pickle',
      titleMl: 'മീൻ കറി, ഉപ്പേരി, അച്ചാർ',
      itemsEn: ['Fish Curry', 'Upperi', 'Pickle'],
      itemsMl: ['മീൻ കറി', 'ഉപ്പേരി', 'അച്ചാർ'],
    },

    // --- Thursday (വ്യാഴം) ---
    {
      day: 'THURSDAY',
      slot: 'EARLY_MORNING_SNACKS',
      titleEn: 'Black Tea & Butter Biscuit',
      titleMl: 'കട്ടൻ ചായ, ബട്ടർ ബിസ്കറ്റ്',
      itemsEn: ['Black Tea', 'Butter Biscuit'],
      itemsMl: ['കട്ടൻ ചായ', 'ബട്ടർ ബിസ്കറ്റ്'],
    },
    {
      day: 'THURSDAY',
      slot: 'BREAKFAST',
      titleEn: 'Dosa & Sambar / Chutney',
      titleMl: 'ദോശ, സാമ്പാർ / ചട്നി',
      itemsEn: ['Dosa', 'Sambar / Chutney'],
      itemsMl: ['ദോശ', 'സാമ്പാർ / ചട്നി'],
    },
    {
      day: 'THURSDAY',
      slot: 'LUNCH',
      titleEn: 'Vegetable Curry, Fish Fry, Pickle',
      titleMl: 'വെജിറ്റബിൾ കറി, ഫിഷ് ഫ്രൈ, അച്ചാർ',
      itemsEn: ['Vegetable Curry', 'Fish Fry', 'Pickle'],
      itemsMl: ['വെജിറ്റബിൾ കറി', 'ഫിഷ് ഫ്രൈ', 'അച്ചാർ'],
    },
    {
      day: 'THURSDAY',
      slot: 'EVENING_SNACKS',
      titleEn: 'Milk Tea & Upma',
      titleMl: 'പാൽ ചായ, ഉപ്പുമാവ്',
      itemsEn: ['Milk Tea', 'Upma'],
      itemsMl: ['പാൽ ചായ', 'ഉപ്പുമാവ്'],
    },
    {
      day: 'THURSDAY',
      slot: 'DINNER',
      titleEn: 'Fish Curry, Upperi, Pickle',
      titleMl: 'മീൻ കറി, ഉപ്പേരി, അച്ചാർ',
      itemsEn: ['Fish Curry', 'Upperi', 'Pickle'],
      itemsMl: ['മീൻ കറി', 'ഉപ്പേരി', 'അച്ചാർ'],
    },

    // --- Friday (വെള്ളി) ---
    {
      day: 'FRIDAY',
      slot: 'EARLY_MORNING_SNACKS',
      titleEn: 'Black Tea & Bread',
      titleMl: 'കട്ടൻ ചായ, ബ്രെഡ്',
      itemsEn: ['Black Tea', 'Bread'],
      itemsMl: ['കട്ടൻ ചായ', 'ബ്രെഡ്'],
    },
    {
      day: 'FRIDAY',
      slot: 'BREAKFAST',
      titleEn: 'Veg Biryani & Chammanthi',
      titleMl: 'വെജ് ബിരിയാണി, ചമ്മന്തി',
      itemsEn: ['Veg Biryani', 'Chammanthi'],
      itemsMl: ['വെജ് ബിരിയാണി', 'ചമ്മന്തി'],
    },
    {
      day: 'FRIDAY',
      slot: 'LUNCH',
      titleEn: 'Okra Mulak Curry, Dry Fish, Upperi, Pickle',
      titleMl: 'വെണ്ട മുളക് കറി, ഉണക്ക മീൻസ്യം, ഉപ്പേരി, അച്ചാർ',
      itemsEn: ['Okra Mulak Curry', 'Dry Fish', 'Upperi', 'Pickle'],
      itemsMl: ['വെണ്ട മുളക് കറി', 'ഉണക്ക മീൻസ്യം, ഉപ്പേരി', 'അച്ചാർ'],
    },
    {
      day: 'FRIDAY',
      slot: 'EVENING_SNACKS',
      titleEn: 'Milk Tea & Bakery Snacks',
      titleMl: 'പാൽ ചായ, ബേക്കറി',
      itemsEn: ['Milk Tea', 'Bakery Snacks'],
      itemsMl: ['പാൽ ചായ', 'ബേക്കറി'],
    },
    {
      day: 'FRIDAY',
      slot: 'DINNER',
      titleEn: 'Dal Curry, White Rice, Upperi',
      titleMl: 'ദാൽ കറി, വൈറ്റ് റൈസ്, ഉപ്പേരി',
      itemsEn: ['Dal Curry', 'White Rice', 'Upperi'],
      itemsMl: ['ദാൽ കറി', 'വൈറ്റ് റൈസ്', 'ഉപ്പേരി'],
    },

    // --- Saturday (ശനി) ---
    {
      day: 'SATURDAY',
      slot: 'EARLY_MORNING_SNACKS',
      titleEn: 'Black Tea & Rusk',
      titleMl: 'കട്ടൻ ചായ, റസ്ക്',
      itemsEn: ['Black Tea', 'Rusk'],
      itemsMl: ['കട്ടൻ ചായ', 'റസ്ക്'],
    },
    {
      day: 'SATURDAY',
      slot: 'BREAKFAST',
      titleEn: 'Porotta & Cherupayar Curry',
      titleMl: 'പൊറോട്ട, ചെറുപയർ കറി',
      itemsEn: ['Porotta', 'Cherupayar Curry'],
      itemsMl: ['പൊറോട്ട', 'ചെറുപയർ കറി'],
    },
    {
      day: 'SATURDAY',
      slot: 'LUNCH',
      titleEn: 'Vegetable Curry, Fish Fry, Pickle',
      titleMl: 'വെജിറ്റബിൾ കറി, ഫിഷ് ഫ്രൈ, അച്ചാർ',
      itemsEn: ['Vegetable Curry', 'Fish Fry', 'Pickle'],
      itemsMl: ['വെജിറ്റബിൾ കറി', 'ഫിഷ് ഫ്രൈ', 'അച്ചാർ'],
    },
    {
      day: 'SATURDAY',
      slot: 'EVENING_SNACKS',
      titleEn: 'Milk Tea & Aval Jaggery Banana Mix',
      titleMl: 'പാൽ ചായ, അവിലും ശർക്കര പഴും കുഴച്ചത്',
      itemsEn: ['Milk Tea', 'Aval Jaggery Banana Mix'],
      itemsMl: ['പാൽ ചായ', 'അവിലും ശർക്കര പഴും കുഴച്ചത്'],
    },
    {
      day: 'SATURDAY',
      slot: 'DINNER',
      titleEn: 'Dry Fish Curry, Upperi, Pickle',
      titleMl: 'ഉണക്ക മത്സ്യം കറി, ഉപ്പേരി, അച്ചാർ',
      itemsEn: ['Dry Fish Curry', 'Upperi', 'Pickle'],
      itemsMl: ['ഉണക്ക മത്സ്യം കറി', 'ഉപ്പേരി', 'അച്ചാർ'],
    },

    // --- Sunday (ഞായർ) ---
    {
      day: 'SUNDAY',
      slot: 'EARLY_MORNING_SNACKS',
      titleEn: 'Black Tea & Parle-G',
      titleMl: 'കട്ടൻ ചായ, പാർലേ ജി',
      itemsEn: ['Black Tea', 'Parle-G'],
      itemsMl: ['കട്ടൻ ചായ', 'പാർലേ ജി'],
    },
    {
      day: 'SUNDAY',
      slot: 'BREAKFAST',
      titleEn: 'Chapati & Veg Kurma',
      titleMl: 'ചപ്പാത്തി, വെജ് കൂർമ',
      itemsEn: ['Chapati', 'Veg Kurma'],
      itemsMl: ['ചപ്പാത്തി', 'വെജ് കൂർമ'],
    },
    {
      day: 'SUNDAY',
      slot: 'LUNCH',
      titleEn: 'Ghee Rice, Chicken Mulak Curry, Curd / Pickle',
      titleMl: 'നെയ്യ്ചോറ്, ചിക്കൻ മുളക് കറി, തൈര് / അച്ചാർ',
      itemsEn: ['Ghee Rice', 'Chicken Mulak Curry', 'Curd / Pickle'],
      itemsMl: ['നെയ്യ്ചോറ്', 'ചിക്കൻ മുളക് കറി', 'തൈര് / അച്ചാർ'],
    },
    {
      day: 'SUNDAY',
      slot: 'EVENING_SNACKS',
      titleEn: 'Milk Tea & Bakery Snacks',
      titleMl: 'പാൽ ചായ, ബേക്കറി',
      itemsEn: ['Milk Tea', 'Bakery Snacks'],
      itemsMl: ['പാൽ ചായ', 'ബേക്കറി'],
    },
    {
      day: 'SUNDAY',
      slot: 'DINNER',
      titleEn: 'Vegetable Curry, Upperi, Pickle, Pappadam',
      titleMl: 'വെജിറ്റബിൾ കറി, ഉപ്പേരി, അച്ചാർ, പപ്പടം',
      itemsEn: ['Vegetable Curry', 'Upperi', 'Pickle', 'Pappadam'],
      itemsMl: ['വെജിറ്റബിൾ കറി', 'ഉപ്പേരി', 'അച്ചാർ', 'പപ്പടം'],
    },
  ];

  return rawSeedData.map((item, idx) => ({
    id: `menu-tmpl-${item.day.toLowerCase()}-${item.slot.toLowerCase()}`,
    day_of_week: item.day,
    meal_slot: item.slot,
    title_en: item.titleEn,
    title_ml: item.titleMl,
    items_en: item.itemsEn,
    items_ml: item.itemsMl,
    display_order: MEAL_SLOT_CONFIG[item.slot].order,
    status: 'PUBLISHED',
    effective_from: effectiveFrom,
    effective_to: null,
    version: 1,
    created_at: nowIso,
    updated_at: nowIso,
  }));
}

export class MealMenuProvider {
  private menuItems: WeeklyMenuItem[];
  private changeLogs: MenuChangeLog[];

  constructor() {
    this.menuItems = initializeWeeklySeedMenu();
    this.changeLogs = [];
  }

  // Determine DayOfWeek enum from standard Date
  getDayOfWeek(dateStr?: string): DayOfWeek {
    const targetDate = dateStr || getTodayDateStringIST();
    // Use midday IST to avoid boundary drifts
    const d = new Date(`${targetDate}T12:00:00+05:30`);
    const dayIndex = d.getDay(); // 0 is Sunday, 4 is Thursday

    const days: DayOfWeek[] = [
      'SUNDAY',
      'MONDAY',
      'TUESDAY',
      'WEDNESDAY',
      'THURSDAY',
      'FRIDAY',
      'SATURDAY',
    ];
    return days[dayIndex];
  }

  // Get full weekly menu for administrators
  async getWeeklyMenu(version: number = 1): Promise<WeeklyMenuItem[]> {
    return this.menuItems
      .filter((m) => m.version === version)
      .sort((a, b) => {
        const dayA = DAY_NAMES[a.day_of_week].dayIndex;
        const dayB = DAY_NAMES[b.day_of_week].dayIndex;
        if (dayA !== dayB) return dayA - dayB;
        return a.display_order - b.display_order;
      });
  }

  // Get Today's 5 meal slots for students and operations (PRD Section 15 & 19)
  async getTodayMenu(dateStr?: string): Promise<TodayMenuSummary> {
    const targetDate = dateStr || getTodayDateStringIST();
    const dayOfWeek = this.getDayOfWeek(targetDate);
    const dayInfo = DAY_NAMES[dayOfWeek];

    // Find items for this day
    const dayItems = this.menuItems.filter(
      (m) => m.day_of_week === dayOfWeek && m.status === 'PUBLISHED'
    );

    // Check emergency menu changes for this date
    const todayChanges = this.changeLogs.filter((c) => c.date === targetDate);
    const hasEmergency = todayChanges.length > 0;

    const slots: TodayMealMenuSlot[] = (
      [
        'EARLY_MORNING_SNACKS',
        'BREAKFAST',
        'LUNCH',
        'EVENING_SNACKS',
        'DINNER',
      ] as MealSlot[]
    ).map((slot) => {
      const cfg = MEAL_SLOT_CONFIG[slot];
      const tmpl = dayItems.find((m) => m.meal_slot === slot);
      const emergency = todayChanges.find((c) => c.meal_slot === slot);

      return {
        slot,
        name_en: cfg.nameEn,
        name_ml: cfg.nameMl,
        time: cfg.defaultTime,
        items_en: tmpl ? tmpl.items_en : [],
        items_ml: tmpl ? tmpl.items_ml : [],
        menu_text_ml: emergency ? emergency.new_menu_text : tmpl ? tmpl.title_ml : 'പട്ടിക ലഭ്യമല്ല',
        menu_text_en: emergency ? emergency.new_menu_text : tmpl ? tmpl.title_en : 'Not configured',
        is_updated_today: Boolean(emergency),
        update_notice: emergency
          ? `Updated: ${emergency.reason} (${formatTimeIST(emergency.changed_at)})`
          : undefined,
      };
    });

    return {
      date: targetDate,
      day_of_week: dayOfWeek,
      day_name_en: dayInfo.en,
      day_name_ml: dayInfo.ml,
      slots,
      has_emergency_update: hasEmergency,
    };
  }

  // Update existing template item
  async updateMenuItem(
    itemId: string,
    data: {
      title_en?: string;
      title_ml?: string;
      items_en?: string[];
      items_ml?: string[];
      description_en?: string;
      description_ml?: string;
      status?: MenuStatus;
    },
    adminId: string = 'a0000000-0000-0000-0000-000000000001'
  ): Promise<{ success: boolean; error?: string }> {
    const idx = this.menuItems.findIndex((m) => m.id === itemId);
    if (idx === -1) return { success: false, error: 'Menu item not found.' };

    const nowIso = new Date().toISOString();
    const existing = this.menuItems[idx];
    
    // Auto sync items array if description string is provided
    const itemsEn = data.items_en || (data.description_en ? data.description_en.split(',').map((s) => s.trim()) : existing.items_en);
    const itemsMl = data.items_ml || (data.description_ml ? data.description_ml.split(',').map((s) => s.trim()) : existing.items_ml);

    this.menuItems[idx] = {
      ...existing,
      ...data,
      items_en: itemsEn,
      items_ml: itemsMl,
      description_en: data.description_en || existing.description_en,
      description_ml: data.description_ml || existing.description_ml,
      updated_by: adminId,
      updated_at: nowIso,
    };

    return { success: true };
  }

  // Record an emergency menu change for a specific day
  async recordEmergencyMenuChange(
    paramOrDate: string | {
      menu_item_id?: string;
      date?: string;
      meal_slot: MealSlot;
      day_of_week?: DayOfWeek;
      previous_menu?: string;
      new_menu: string;
      reason: string;
      changed_by_name?: string;
    },
    mealSlot?: MealSlot,
    newMenuText?: string,
    reason?: string,
    changedBy: string = 'a0000000-0000-0000-0000-000000000001'
  ): Promise<{ success: boolean; error?: string }> {
    const nowIso = new Date().toISOString();
    let targetDate = getTodayDateStringIST();
    let slot: MealSlot = 'LUNCH';
    let newText = '';
    let changeReason = '';
    let authorName = changedBy;
    let prevText = 'Scheduled Menu';
    let dow: DayOfWeek | undefined;

    if (typeof paramOrDate === 'object') {
      targetDate = paramOrDate.date || getTodayDateStringIST();
      slot = paramOrDate.meal_slot;
      newText = paramOrDate.new_menu;
      changeReason = paramOrDate.reason;
      authorName = paramOrDate.changed_by_name || 'Dining Supervisor';
      prevText = paramOrDate.previous_menu || 'Scheduled Menu';
      dow = paramOrDate.day_of_week;
    } else {
      targetDate = paramOrDate;
      slot = mealSlot || 'LUNCH';
      newText = newMenuText || '';
      changeReason = reason || '';
      authorName = changedBy;
    }

    if (!dow) {
      dow = this.getDayOfWeek(targetDate);
    }

    const logEntry: MenuChangeLog = {
      id: `mcl-${Date.now()}`,
      date: targetDate,
      meal_slot: slot,
      day_of_week: dow,
      previous_menu_text: prevText,
      previous_menu: prevText,
      new_menu_text: newText,
      new_menu: newText,
      reason: changeReason,
      changed_by: authorName,
      changed_by_name: authorName,
      changed_at: nowIso,
    };

    this.changeLogs.push(logEntry);
    return { success: true };
  }

  // Get change logs
  async getMenuChangeLogs(date?: string): Promise<MenuChangeLog[]> {
    if (date) {
      return this.changeLogs.filter((c) => c.date === date);
    }
    return this.changeLogs.sort(
      (a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime()
    );
  }
}

// Singleton provider instance
let menuProviderInstance: MealMenuProvider | null = null;

export function getMealMenuProvider(): MealMenuProvider {
  if (!menuProviderInstance) {
    menuProviderInstance = new MealMenuProvider();
  }
  return menuProviderInstance;
}

export const getMenuProvider = getMealMenuProvider;
