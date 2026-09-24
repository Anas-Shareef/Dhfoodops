'use client';

import React, { useState } from 'react';
import { MealFoodPipelineItem, FoodUnit } from '@/types/database';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { getFoodPlanningProvider } from '@/lib/food/provider';
import { ChefHat, CheckCircle2, Info } from 'lucide-react';

interface RecordPreparationModalProps {
  isOpen: boolean;
  onClose: () => void;
  pipeline: MealFoodPipelineItem | null;
  onSuccess: () => void;
}

export function RecordPreparationModal({
  isOpen,
  onClose,
  pipeline,
  onSuccess,
}: RecordPreparationModalProps) {
  const [preparedQuantity, setPreparedQuantity] = useState<number>(pipeline?.recommended_quantity || 300);
  const [unit, setUnit] = useState<FoodUnit>('portions');
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  if (!pipeline || !pipeline.requirement) return null;

  const planned = pipeline.recommended_quantity;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (preparedQuantity <= 0) {
      toast.error('Prepared quantity must be greater than zero.');
      return;
    }

    setIsSubmitting(true);
    const provider = getFoodPlanningProvider();
    const foodItemId = pipeline.items[0]?.food_item_id || 'f-idli';

    const res = await provider.recordPreparation(
      pipeline.requirement!.id,
      foodItemId,
      Number(preparedQuantity),
      unit,
      remarks || `Kitchen preparation recorded: ${preparedQuantity} ${unit}`
    );
    setIsSubmitting(false);

    if (res.success) {
      toast.success('Actual kitchen preparation recorded successfully.');
      onSuccess();
      onClose();
    } else {
      toast.error(res.error || 'Failed to record preparation');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Log Kitchen Preparation — ${pipeline.meal_type.toUpperCase()}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Separation Principle Notice */}
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
          <div className="flex items-center gap-1.5 font-bold">
            <Info className="w-4 h-4 text-amber-700" />
            <span>Separation of Planned vs Prepared (PRD Section 19)</span>
          </div>
          <p>
            Planned Requirement: <strong>{planned} portions</strong>. The system preserves this planned number
            and records your actual prepared output independently to track kitchen variance.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 block">
            Actual Prepared Quantity <span className="text-rose-500">*</span>
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              min="1"
              step="any"
              value={preparedQuantity}
              onChange={(e) => setPreparedQuantity(Number(e.target.value))}
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
              <option value="trays">trays</option>
              <option value="packets">packets</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 block">
            Kitchen Remarks / Batch Notes
          </label>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="e.g. Cooked in 3 consecutive steamer batches; yield 300 portions"
            rows={2}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
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
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
          >
            <ChefHat className="w-3.5 h-3.5 mr-1.5" />
            {isSubmitting ? 'Recording...' : 'Record Prepared Food'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
