'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getAttendanceProvider } from '@/lib/attendance/provider';
import { MealSchedule, MealType } from '@/types/database';
import { MealsSubnav } from '@/components/admin/meals-subnav';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { formatTimeStringTo12H } from '@/lib/utils/timezone';
import { 
  Clock, 
  Plus, 
  Edit3, 
  Trash2, 
  Coffee, 
  Sun, 
  Moon, 
  Check, 
  AlertCircle 
} from 'lucide-react';

export default function AdminMealSchedulesPage() {
  const [schedules, setSchedules] = useState<MealSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<MealSchedule | null>(null);

  // Form State
  const [mealType, setMealType] = useState<MealType>('breakfast');
  const [mealTime, setMealTime] = useState('08:30');
  const [attendanceStart, setAttendanceStart] = useState('07:15');
  const [attendanceEnd, setAttendanceEnd] = useState('07:45');
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const toast = useToast();

  const loadSchedules = useCallback(async () => {
    setIsLoading(true);
    const provider = getAttendanceProvider();
    const data = await provider.getMealSchedules();
    setSchedules(data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  const handleOpenAdd = () => {
    setEditingSchedule(null);
    setMealType('breakfast');
    setMealTime('08:30');
    setAttendanceStart('07:15');
    setAttendanceEnd('07:45');
    setIsActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sched: MealSchedule) => {
    setEditingSchedule(sched);
    setMealType(sched.meal_type);
    setMealTime(sched.meal_time.slice(0, 5));
    setAttendanceStart(sched.attendance_start_time.slice(0, 5));
    setAttendanceEnd(sched.attendance_end_time.slice(0, 5));
    setIsActive(sched.is_active);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (attendanceEnd <= attendanceStart) {
      toast.error('Attendance window end time must be after start time.');
      return;
    }

    setIsSaving(true);
    const provider = getAttendanceProvider();
    const result = await provider.saveMealSchedule({
      id: editingSchedule?.id,
      meal_type: mealType,
      meal_time: `${mealTime}:00`,
      attendance_start_time: `${attendanceStart}:00`,
      attendance_end_time: `${attendanceEnd}:00`,
      is_active: isActive,
    });

    setIsSaving(false);
    if (result.success) {
      toast.success(
        editingSchedule ? 'Meal schedule updated successfully.' : 'New meal schedule created.'
      );
      setIsModalOpen(false);
      loadSchedules();
    } else {
      toast.error(result.error || 'Failed to save meal schedule.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this meal schedule?')) return;
    const provider = getAttendanceProvider();
    const res = await provider.deleteMealSchedule(id);
    if (res.success) {
      toast.success('Meal schedule removed.');
      loadSchedules();
    } else {
      toast.error(res.error || 'Failed to delete schedule.');
    }
  };

  const mealIcons: Record<string, typeof Coffee> = { 
    breakfast: Coffee, 
    lunch: Sun, 
    dinner: Moon,
    early_morning_snacks: Coffee,
    evening_snacks: Coffee,
    EARLY_MORNING_SNACKS: Coffee,
    BREAKFAST: Coffee,
    LUNCH: Sun,
    EVENING_SNACKS: Coffee,
    DINNER: Moon,
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block">
            Phase 1 • Core Timings
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 mt-0.5">
            <Clock className="w-6 h-6 text-indigo-600" />
            Meal Schedules &amp; Attendance Windows
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure institutional meal serving times and attendance declaration cutoff windows
          </p>
        </div>

        <Button onClick={handleOpenAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs">
          <Plus className="w-4 h-4 mr-1.5" />
          Add Meal Schedule
        </Button>
      </div>

      <MealsSubnav />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {schedules.map((sched) => {
          const Icon = mealIcons[sched.meal_type] || Coffee;
          const title = sched.meal_type.charAt(0).toUpperCase() + sched.meal_type.slice(1);

          return (
            <Card key={sched.id} className="border-slate-200 bg-white">
              <CardHeader className="bg-slate-50/70 p-4 border-b border-slate-100 flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-800 shadow-xs">
                    <Icon className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900">{title}</h3>
                    <span className="text-xs text-slate-500">
                      Meal Serving: <strong className="text-slate-800">{formatTimeStringTo12H(sched.meal_time)}</strong>
                    </span>
                  </div>
                </div>

                <Badge className={sched.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}>
                  {sched.is_active ? 'Active' : 'Disabled'}
                </Badge>
              </CardHeader>

              <CardContent className="p-5 space-y-4">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Attendance Window:</span>
                    <span className="font-extrabold text-slate-900">
                      {formatTimeStringTo12H(sched.attendance_start_time)} – {formatTimeStringTo12H(sched.attendance_end_time)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Students can submit or change attendance only within this window.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEdit(sched)}
                    className="text-slate-700 text-xs h-8"
                  >
                    <Edit3 className="w-3.5 h-3.5 mr-1 text-slate-500" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(sched.id)}
                    className="text-rose-600 border-rose-200 hover:bg-rose-50 text-xs h-8"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit / Add Modal Dialog */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSchedule ? 'Edit Meal Schedule' : 'Create Meal Schedule'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Meal Type
            </label>
            <select
              value={mealType}
              onChange={(e) => setMealType(e.target.value as MealType)}
              className="w-full text-sm p-2.5 rounded-xl border border-slate-300 focus:outline-hidden bg-white"
            >
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Meal Serving Time (24h)
            </label>
            <input
              type="time"
              required
              value={mealTime}
              onChange={(e) => setMealTime(e.target.value)}
              className="w-full text-sm p-2.5 rounded-xl border border-slate-300 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Window Opens At
              </label>
              <input
                type="time"
                required
                value={attendanceStart}
                onChange={(e) => setAttendanceStart(e.target.value)}
                className="w-full text-sm p-2.5 rounded-xl border border-slate-300 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Window Closes (Cutoff)
              </label>
              <input
                type="time"
                required
                value={attendanceEnd}
                onChange={(e) => setAttendanceEnd(e.target.value)}
                className="w-full text-sm p-2.5 rounded-xl border border-slate-300 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="is_active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600"
            />
            <label htmlFor="is_active" className="text-xs font-semibold text-slate-700">
              Schedule is active for daily meal session creation
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
              {isSaving ? 'Saving...' : 'Save Schedule'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
