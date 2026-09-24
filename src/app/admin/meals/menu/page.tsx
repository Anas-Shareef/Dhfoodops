'use client';

import React, { useState, useEffect } from 'react';
import { 
  CalendarDays, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Edit3, 
  History, 
  Save, 
  X, 
  RefreshCw, 
  Clock, 
  Info, 
  Globe2,
  FileText,
  ShieldCheck,
  Send,
  ChevronRight
} from 'lucide-react';
import { MealsSubnav } from '@/components/admin/meals-subnav';
import { 
  getMealMenuProvider, 
  MEAL_SLOT_CONFIGS 
} from '@/lib/food/menu-provider';
import { 
  DayOfWeek, 
  MealSlot, 
  WeeklyMenuItem, 
  MenuChangeLog, 
  MenuStatus 
} from '@/types/database';

const DAYS_ORDER: DayOfWeek[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

const DAY_LABELS: Record<string, { en: string; ml: string; short: string }> = {
  MONDAY: { en: 'Monday', ml: 'തിങ്കൾ', short: 'MON' },
  TUESDAY: { en: 'Tuesday', ml: 'ചൊവ്വ', short: 'TUE' },
  WEDNESDAY: { en: 'Wednesday', ml: 'ബുധൻ', short: 'WED' },
  THURSDAY: { en: 'Thursday', ml: 'വ്യാഴം', short: 'THU' },
  FRIDAY: { en: 'Friday', ml: 'വെള്ളി', short: 'FRI' },
  SATURDAY: { en: 'Saturday', ml: 'ശനി', short: 'SAT' },
  SUNDAY: { en: 'Sunday', ml: 'ഞായർ', short: 'SUN' },
  monday: { en: 'Monday', ml: 'തിങ്കൾ', short: 'MON' },
  tuesday: { en: 'Tuesday', ml: 'ചൊവ്വ', short: 'TUE' },
  wednesday: { en: 'Wednesday', ml: 'ബുധൻ', short: 'WED' },
  thursday: { en: 'Thursday', ml: 'വ്യാഴം', short: 'THU' },
  friday: { en: 'Friday', ml: 'വെള്ളി', short: 'FRI' },
  saturday: { en: 'Saturday', ml: 'ശനി', short: 'SAT' },
  sunday: { en: 'Sunday', ml: 'ഞായർ', short: 'SUN' },
};

const SLOTS_ORDER: MealSlot[] = [
  'EARLY_MORNING_SNACKS',
  'BREAKFAST',
  'LUNCH',
  'EVENING_SNACKS',
  'DINNER',
];

export default function AdminWeeklyMenuPage() {
  const [items, setItems] = useState<WeeklyMenuItem[]>([]);
  const [changeLogs, setChangeLogs] = useState<MenuChangeLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek | 'all'>('all');
  const [editingItem, setEditingItem] = useState<WeeklyMenuItem | null>(null);
  const [emergencyModalItem, setEmergencyModalItem] = useState<WeeklyMenuItem | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states for normal edit
  const [editForm, setEditForm] = useState({
    title_en: '',
    title_ml: '',
    description_en: '',
    description_ml: '',
    status: 'PUBLISHED' as MenuStatus,
  });

  // Form states for emergency change
  const [emergencyForm, setEmergencyForm] = useState({
    reason: 'Sudden vendor supply disruption',
    changed_by_name: 'Dining Supervisor',
    new_title_ml: '',
    new_description_ml: '',
    new_title_en: '',
    new_description_en: '',
  });

  const menuProvider = getMealMenuProvider();

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [menuData, logsData] = await Promise.all([
        menuProvider.getWeeklyMenu(),
        menuProvider.getMenuChangeLogs(),
      ]);
      setItems(menuData);
      setChangeLogs(logsData);
    } catch (err) {
      console.error('Failed to load menu data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openEditModal = (item: WeeklyMenuItem) => {
    setEditingItem(item);
    setEditForm({
      title_en: item.title_en || '',
      title_ml: item.title_ml || '',
      description_en: item.description_en || item.items_en?.join(', ') || '',
      description_ml: item.description_ml || item.items_ml?.join(', ') || '',
      status: item.status,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    try {
      await menuProvider.updateMenuItem(editingItem.id, {
        title_en: editForm.title_en,
        title_ml: editForm.title_ml,
        description_en: editForm.description_en,
        description_ml: editForm.description_ml,
        items_en: editForm.description_en.split(',').map((s) => s.trim()),
        items_ml: editForm.description_ml.split(',').map((s) => s.trim()),
        status: editForm.status,
      });
      const dayLabel = DAY_LABELS[editingItem.day_of_week]?.en || editingItem.day_of_week;
      const slotLabel = MEAL_SLOT_CONFIGS[editingItem.meal_slot]?.labelEn || editingItem.meal_slot;
      setFeedbackMsg({ type: 'success', text: `Successfully updated menu for ${dayLabel} ${slotLabel}.` });
      setEditingItem(null);
      await loadData();
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: 'Failed to update menu item.' });
    }
  };

  const openEmergencyModal = (item: WeeklyMenuItem) => {
    setEmergencyModalItem(item);
    setEmergencyForm({
      reason: 'Sudden market shortage / Kitchen schedule change',
      changed_by_name: 'Dining Operations Lead',
      new_title_ml: item.title_ml || '',
      new_description_ml: item.description_ml || item.items_ml?.join(', ') || '',
      new_title_en: item.title_en || '',
      new_description_en: item.description_en || item.items_en?.join(', ') || '',
    });
  };

  const handleSaveEmergency = async () => {
    if (!emergencyModalItem) return;
    try {
      await menuProvider.recordEmergencyMenuChange({
        menu_item_id: emergencyModalItem.id,
        meal_slot: emergencyModalItem.meal_slot,
        day_of_week: emergencyModalItem.day_of_week,
        previous_menu: `${emergencyModalItem.title_ml}: ${emergencyModalItem.description_ml || emergencyModalItem.items_ml?.join(', ')}`,
        new_menu: `${emergencyForm.new_title_ml}: ${emergencyForm.new_description_ml}`,
        reason: emergencyForm.reason,
        changed_by_name: emergencyForm.changed_by_name,
      });

      // Also update the menu item directly
      await menuProvider.updateMenuItem(emergencyModalItem.id, {
        title_en: emergencyForm.new_title_en,
        title_ml: emergencyForm.new_title_ml,
        description_en: emergencyForm.new_description_en,
        description_ml: emergencyForm.new_description_ml,
        items_en: emergencyForm.new_description_en.split(',').map((s) => s.trim()),
        items_ml: emergencyForm.new_description_ml.split(',').map((s) => s.trim()),
      });

      setFeedbackMsg({ 
        type: 'success', 
        text: `Emergency Menu Change logged and applied with complete historical audit trail!` 
      });
      setEmergencyModalItem(null);
      await loadData();
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: 'Failed to record emergency menu change.' });
    }
  };

  // Find item by day and slot
  const getItemFor = (day: DayOfWeek, slot: MealSlot) => {
    return items.find((i) => i.day_of_week?.toUpperCase() === day?.toUpperCase() && i.meal_slot === slot);
  };

  const filteredDays = selectedDay === 'all' ? DAYS_ORDER : [selectedDay];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Master Schedule v1.0
            </span>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-indigo-100 text-indigo-800 rounded-full flex items-center gap-1">
              <Globe2 className="w-3 h-3" /> Bilingual (Malayalam + English)
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Weekly Meal Menu Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Standard 5-daily meal slots configuration with Malayalam-English bilingual entries, versioning, and auditable emergency changes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowHistoryModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-all"
          >
            <History className="w-4 h-4 text-slate-500" />
            Audit Trail ({changeLogs.length})
          </button>
          <button
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 rounded-xl transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Sub Navigation */}
      <MealsSubnav />

      {/* Feedback banner */}
      {feedbackMsg && (
        <div className={`p-4 rounded-xl flex items-center justify-between border ${
          feedbackMsg.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center gap-2 text-sm font-medium">
            {feedbackMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{feedbackMsg.text}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="text-xs font-semibold hover:opacity-75">
            Dismiss
          </button>
        </div>
      )}

      {/* Five Slots Legend & Quick Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {SLOTS_ORDER.map((slot) => {
          const cfg = MEAL_SLOT_CONFIGS[slot];
          return (
            <div key={slot} className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                <span className="flex items-center gap-1 font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded">
                  <Clock className="w-3 h-3 text-slate-500" /> {cfg.defaultTime}
                </span>
                <span className="text-[10px] uppercase font-bold text-slate-400">Slot {cfg.order}</span>
              </div>
              <div className="mt-2">
                <div className="text-xs font-bold text-slate-900 leading-tight">{cfg.labelEn}</div>
                <div className="text-[11px] text-indigo-700 font-medium mt-0.5 font-malayalam">{cfg.labelMl}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Day Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedDay('all')}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-lg border transition-all ${
            selectedDay === 'all'
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          All 7 Days (Full Matrix)
        </button>
        {DAYS_ORDER.map((day) => {
          const isSelected = selectedDay === day;
          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg border transition-all whitespace-nowrap flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>{DAY_LABELS[day].en}</span>
              <span className={`text-[10px] ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                ({DAY_LABELS[day].ml})
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Weekly Grid / Matrix */}
      <div className="space-y-6">
        {filteredDays.map((day) => {
          const dayMeta = DAY_LABELS[day] || { en: day, ml: day, short: String(day).slice(0, 3).toUpperCase() };
          return (
            <div key={day} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              {/* Day Header */}
              <div className="px-6 py-3.5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center font-bold text-xs tracking-wider text-indigo-300">
                    {dayMeta.short}
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      {dayMeta.en}
                      <span className="text-sm font-normal text-indigo-300 font-malayalam">· {dayMeta.ml}</span>
                    </h2>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-md">
                    5 Slots Active
                  </span>
                </div>
              </div>

              {/* 5 Slots Grid for this Day */}
              <div className="grid grid-cols-1 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                {SLOTS_ORDER.map((slot) => {
                  const cfg = MEAL_SLOT_CONFIGS[slot];
                  const item = getItemFor(day, slot);

                  return (
                    <div key={slot} className="p-4 flex flex-col justify-between hover:bg-slate-50/60 transition-colors group">
                      <div>
                        {/* Slot label & time */}
                        <div className="flex items-center justify-between text-xs mb-2">
                          <span className="font-semibold text-slate-700 text-[11px] uppercase tracking-wide">
                            {cfg.labelEn}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1 py-0.5 rounded">
                            {cfg.defaultTime}
                          </span>
                        </div>

                        {/* Malayalam Title */}
                        <div className="text-[11px] font-medium text-indigo-600 font-malayalam mb-1">
                          {item?.title_ml || cfg.labelMl}
                        </div>

                        {/* Items / Description (Malayalam + English) */}
                        <div className="p-3 bg-slate-50 group-hover:bg-white rounded-xl border border-slate-200/70 transition-all min-h-[92px] flex flex-col justify-center">
                          {item ? (
                            <>
                              <div className="text-xs font-bold text-slate-800 leading-snug font-malayalam">
                                {item.description_ml}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-1 italic leading-tight">
                                {item.description_en}
                              </div>
                            </>
                          ) : (
                            <div className="text-xs text-slate-400 italic">No menu configured</div>
                          )}
                        </div>

                        {/* Status Badge */}
                        <div className="mt-2.5 flex items-center justify-between">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            item?.status === 'PUBLISHED' 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' 
                              : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                          }`}>
                            {item?.status || 'PUBLISHED'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            v{item?.version || '1.0'}
                          </span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      {item && (
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEditModal(item)}
                            className="flex-1 py-1 px-2 text-[11px] font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center gap-1 transition-all"
                            title="Edit bilingual titles and items"
                          >
                            <Edit3 className="w-3 h-3 text-slate-500" />
                            Edit
                          </button>
                          <button
                            onClick={() => openEmergencyModal(item)}
                            className="py-1 px-2 text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 rounded-lg flex items-center justify-center gap-1 transition-all"
                            title="Emergency Menu Change with audit log"
                          >
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            Emergency
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Normal Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
                  {(DAY_LABELS[editingItem.day_of_week] || { en: editingItem.day_of_week }).en} · {MEAL_SLOT_CONFIGS[editingItem.meal_slot]?.labelEn || editingItem.meal_slot}
                </span>
                <h3 className="text-base font-bold text-white">Edit Menu Item</h3>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Malayalam Description / Items (മലയാളം വിഭവങ്ങൾ)
                </label>
                <textarea
                  rows={2}
                  value={editForm.description_ml}
                  onChange={(e) => setEditForm({ ...editForm, description_ml: e.target.value })}
                  className="w-full text-sm p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-malayalam"
                  placeholder="ഉദാ: ദോശ, സാമ്പാർ, ചട്നി"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  English Description / Items
                </label>
                <textarea
                  rows={2}
                  value={editForm.description_en}
                  onChange={(e) => setEditForm({ ...editForm, description_en: e.target.value })}
                  className="w-full text-sm p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. Dosa, Sambar, Coconut Chutney"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Meal Title (EN)
                  </label>
                  <input
                    type="text"
                    value={editForm.title_en}
                    onChange={(e) => setEditForm({ ...editForm, title_en: e.target.value })}
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Meal Title (ML)
                  </label>
                  <input
                    type="text"
                    value={editForm.title_ml}
                    onChange={(e) => setEditForm({ ...editForm, title_ml: e.target.value })}
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-malayalam"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Publishing Status
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value as MenuStatus })}
                  className="w-full text-sm p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  <option value="PUBLISHED">PUBLISHED (Visible to Students on matching day)</option>
                  <option value="DRAFT">DRAFT (Admin preview only)</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </select>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all"
              >
                <Save className="w-3.5 h-3.5" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Menu Change Modal */}
      {emergencyModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-amber-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-amber-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-200" />
                <div>
                  <h3 className="text-base font-bold text-white">Emergency Menu Change</h3>
                  <p className="text-[11px] text-amber-100">
                    {(DAY_LABELS[emergencyModalItem.day_of_week] || { en: emergencyModalItem.day_of_week }).en} · {MEAL_SLOT_CONFIGS[emergencyModalItem.meal_slot]?.labelEn || emergencyModalItem.meal_slot}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEmergencyModalItem(null)}
                className="text-amber-200 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <strong>Section 44 Master PRD:</strong> Changes to today's active menu must record author, timestamp, reason, previous menu, and trigger the "⚠ Menu Updated" indicator for students.
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reason for Emergency Change *
                </label>
                <input
                  type="text"
                  value={emergencyForm.reason}
                  onChange={(e) => setEmergencyForm({ ...emergencyForm, reason: e.target.value })}
                  className="w-full text-sm p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                  placeholder="e.g. Fish supply delayed, switched to Chicken"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Authorized Person / Role *
                </label>
                <input
                  type="text"
                  value={emergencyForm.changed_by_name}
                  onChange={(e) => setEmergencyForm({ ...emergencyForm, changed_by_name: e.target.value })}
                  className="w-full text-sm p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Previous Scheduled Menu</div>
                <div className="font-semibold text-slate-700 mt-0.5">
                  {emergencyModalItem.title_ml}: {emergencyModalItem.description_ml}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  New Malayalam Menu (പുതിയ വിഭവങ്ങൾ) *
                </label>
                <textarea
                  rows={2}
                  value={emergencyForm.new_description_ml}
                  onChange={(e) => setEmergencyForm({ ...emergencyForm, new_description_ml: e.target.value })}
                  className="w-full text-sm p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-malayalam"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  New English Description
                </label>
                <textarea
                  rows={2}
                  value={emergencyForm.new_description_en}
                  onChange={(e) => setEmergencyForm({ ...emergencyForm, new_description_en: e.target.value })}
                  className="w-full text-sm p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setEmergencyModalItem(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEmergency}
                className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-all"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Publish Emergency Change
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Audit Trail Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="text-base font-bold text-white">Menu Change Audit Trail</h3>
                  <p className="text-xs text-slate-400">Historical records of all emergency and operational menu modifications</p>
                </div>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-3 flex-1">
              {changeLogs.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">
                  No emergency menu changes recorded yet. The master weekly schedule is active without alterations.
                </div>
              ) : (
                changeLogs.map((log) => (
                  <div key={log.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 font-bold uppercase text-[10px] bg-amber-100 text-amber-800 rounded">
                          {log.day_of_week} · {log.meal_slot}
                        </span>
                        <span className="font-semibold text-slate-700">By {log.changed_by_name}</span>
                      </div>
                      <span className="font-mono text-slate-400 text-[11px]">
                        {new Date(log.changed_at).toLocaleString()}
                      </span>
                    </div>

                    <div className="text-slate-600">
                      <strong>Reason:</strong> {log.reason}
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-200">
                      <div className="bg-red-50/60 p-2 rounded-lg border border-red-100">
                        <div className="text-[10px] font-bold text-red-600 uppercase">Previous Menu</div>
                        <div className="text-slate-700 mt-0.5">{log.previous_menu}</div>
                      </div>
                      <div className="bg-emerald-50/60 p-2 rounded-lg border border-emerald-100">
                        <div className="text-[10px] font-bold text-emerald-600 uppercase">New Menu</div>
                        <div className="text-slate-700 mt-0.5 font-bold">{log.new_menu}</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100"
              >
                Close Audit Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
