'use client';

import React, { useState } from 'react';
import { MealFoodPipelineItem, FoodUnit, ServingStatus } from '@/types/database';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { getFoodPlanningProvider } from '@/lib/food/provider';
import { Utensils, CheckCircle2 } from 'lucide-react';

interface RecordServingModalProps {
  isOpen: boolean;
  onClose: () => void;
  pipeline: MealFoodPipelineItem | null;
  onSuccess: () => void;
}

export function RecordServingModal({
  isOpen,
  onClose,
  pipeline,
  onSuccess,
}: RecordServingModalProps) {
  const [servedQuantity, setServedQuantity] = useState<number>(pipeline?.served_quantity || 281);
  const [unit, setUnit] = useState<FoodUnit>('portions');
  const [status, setStatus] = useState<ServingStatus>('completed');
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  if (!pipeline) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (servedQuantity <= 0) {
      toast.error('Served quantity must be greater than zero.');
      return;
    }

    setIsSubmitting(true);
    const provider = getFoodPlanningProvider();
    const foodItemId = pipeline.items[0]?.food_item_id || 'f-idli';

    const res = await provider.recordServing(
      pipeline.session_id,
      foodItemId,
      Number(servedQuantity),
      unit,
      status,
      remarks || `Dining service recorded: ${servedQuantity} ${unit} served`
    );
    setIsSubmitting(false);

    if (res.success) {
      toast.success('Dining service recorded successfully.');
      onSuccess();
      onClose();
    } else {
      toast.error(res.error || 'Failed to record serving');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Record Food Served — ${pipeline.meal_type.toUpperCase()}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Actual Cooked</span>
            <span className="text-base font-black text-slate-900">{pipeline.prepared_quantity || pipeline.recommended_quantity} portions</span>
          </div>
          <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-200">
            <span className="text-[10px] uppercase font-bold text-indigo-700 block">Confirmed Attendees</span>
            <span className="text-base font-black text-indigo-800">{pipeline.attending_count} students</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 block">
            Quantity Served to Students <span className="text-rose-500">*</span>
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              min="1"
              step="any"
              value={servedQuantity}
              onChange={(e) => setServedQuantity(Number(e.target.value))}
              required
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-bold"
            />
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as FoodUnit)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-hidden"
            >
              <option value="portions">portions</option>
              <option value="kg">kg</option>
              <option value="litres">litres</option>
              <option value="pieces">pieces</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 block">
            Serving Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ServingStatus)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-hidden"
          >
            <option value="serving">In Progress (Currently Serving)</option>
            <option value="completed">Completed (Service Concluded)</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 block">
            Operational Remarks
          </label>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="e.g. All 24 tables received portions on schedule"
            rows={2}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-hidden"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            size="sm"
            type="submit"
            disabled={isSubmitting}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
          >
            <Utensils className="w-3.5 h-3.5 mr-1.5" />
            {isSubmitting ? 'Saving...' : 'Record Served Food'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
