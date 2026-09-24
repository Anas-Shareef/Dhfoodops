'use client';

import React, { useState, useEffect } from 'react';
import { 
  Coffee, 
  Utensils, 
  Soup, 
  Sparkles, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  CalendarDays,
  ChevronRight
} from 'lucide-react';
import { getMealMenuProvider } from '@/lib/food/menu-provider';
import { TodayMenuSummary, MealSlot } from '@/types/database';

const SLOT_ICONS: Record<MealSlot, React.ComponentType<{ className?: string }>> = {
  EARLY_MORNING_SNACKS: Coffee,
  BREAKFAST: Utensils,
  LUNCH: Soup,
  EVENING_SNACKS: Coffee,
  DINNER: Utensils,
};

const SLOT_GRADIENTS: Record<MealSlot, string> = {
  EARLY_MORNING_SNACKS: 'from-amber-500/10 to-orange-500/10 text-amber-700 border-amber-200/80',
  BREAKFAST: 'from-blue-500/10 to-indigo-500/10 text-indigo-700 border-indigo-200/80',
  LUNCH: 'from-emerald-500/10 to-teal-500/10 text-emerald-700 border-emerald-200/80',
  EVENING_SNACKS: 'from-rose-500/10 to-pink-500/10 text-rose-700 border-rose-200/80',
  DINNER: 'from-purple-500/10 to-indigo-500/10 text-purple-700 border-purple-200/80',
};

export function TodayMenuCard() {
  const [todayMenu, setTodayMenu] = useState<TodayMenuSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchMenu() {
      setIsLoading(false);
      try {
        const provider = getMealMenuProvider();
        const data = await provider.getTodayMenu();
        setTodayMenu(data);
      } catch (err) {
        console.error('Failed to load today menu:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchMenu();
  }, []);

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs animate-pulse">
        <div className="h-5 bg-slate-200 rounded w-1/3 mb-4"></div>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-28 bg-slate-100 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!todayMenu) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden transition-all">
      {/* Top Banner */}
      <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-300/30">
                Today&apos;s Menu (ഇന്നത്തെ മെനു)
              </span>
              <span className="text-xs text-slate-300">Server Time IST</span>
            </div>
            <h3 className="text-lg font-black text-white flex items-center gap-2 mt-0.5">
              <span>{todayMenu.day_name_en}</span>
              <span className="text-sm font-normal text-indigo-300 font-malayalam">· {todayMenu.day_name_ml}</span>
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 bg-white/10 rounded-lg text-slate-200 border border-white/10 font-mono">
            {todayMenu.date}
          </span>
          <span className="text-[11px] font-bold px-2.5 py-1 bg-emerald-500/20 text-emerald-300 rounded-lg border border-emerald-400/30">
            5 Daily Slots
          </span>
        </div>
      </div>

      {/* Emergency Menu Update Notification (PRD Section 45) */}
      {(todayMenu.has_changed || todayMenu.has_emergency_update) && (
        <div className="px-5 py-3 bg-amber-50 border-b border-amber-200 flex items-center gap-3 text-amber-900 animate-in fade-in">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="text-xs">
            <strong className="font-bold flex items-center gap-1.5">
              ⚠ Menu Updated
            </strong>
            <span className="text-amber-800">
              {todayMenu.change_notification || todayMenu.slots.find((s) => s.is_updated_today)?.update_notice || 'Today&apos;s menu was recently adjusted by the dining administration.'}
            </span>
          </div>
        </div>
      )}

      {/* 5 Slots Display (PRD Section 15 & 46) */}
      <div className="p-4 sm:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {todayMenu.slots.map((slot, idx) => {
            const slotKey = (slot.meal_slot || slot.slot || 'BREAKFAST') as MealSlot;
            const Icon = SLOT_ICONS[slotKey] || Utensils;
            const gradientStyle = SLOT_GRADIENTS[slotKey] || 'from-slate-50 to-slate-100 text-slate-700 border-slate-200';

            return (
              <div
                key={slotKey || idx}
                className={`p-3.5 rounded-xl border bg-gradient-to-b ${gradientStyle} flex flex-col justify-between transition-transform hover:-translate-y-0.5`}
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-mono text-[10px] font-bold text-slate-500 bg-white/80 px-1.5 py-0.5 rounded shadow-2xs">
                      {slot.default_time || slot.time}
                    </span>
                    <Icon className="w-3.5 h-3.5 opacity-80" />
                  </div>

                  <div className="text-xs font-bold leading-tight">
                    {slot.label_en || slot.name_en}
                  </div>
                  <div className="text-[11px] font-medium opacity-85 mt-0.5 font-malayalam">
                    {slot.label_ml || slot.name_ml}
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-black/5">
                    <div className="text-xs font-bold text-slate-900 font-malayalam leading-snug">
                      {slot.description_ml || slot.menu_text_ml}
                    </div>
                    {(slot.description_en || slot.menu_text_en) && (
                      <div className="text-[10px] text-slate-500 mt-1 italic leading-tight">
                        {slot.description_en || slot.menu_text_en}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-2 flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-semibold text-emerald-700 bg-emerald-100/60 px-1.5 py-0.5 rounded">
                    Active
                  </span>
                  <span>Slot {slot.order || idx + 1}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
