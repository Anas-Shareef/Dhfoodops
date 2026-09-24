'use client';

import React, { useState } from 'react';
import { MealFoodPipelineItem, FoodUnit, LeftoverClassification } from '@/types/database';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { getFoodPlanningProvider } from '@/lib/food/provider';
import { Archive, Info, CheckCircle2 } from 'lucide-react';

interface RecordLeftoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  pipeline: MealFoodPipelineItem | null;
  onSuccess: () => void;
}

export function RecordLeftoverModal({
  isOpen,
  onClose,
  pipeline,
  onSuccess,
}: RecordLeftoverModalProps) {
  // Auto-calculate suggested leftover: prepared - served
  const prepared = pipeline?.prepared_quantity || pipeline?.recommended_quantity || 300;
  const served = pipeline?.served_quantity || 281;
  const defaultRemaining = Math.max(0, prepared - served);

  const [quantity, setQuantity] = useState<number>(pipeline?.leftover_quantity || defaultRemaining || 19);
  const [unit, setUnit] = useState<FoodUnit>('portions');
  const [classification, setClassification] = useState<LeftoverClassification>('stored');
  const [remarks, setRemarks] = useState('Transferred to warm storage container for afternoon redistribution');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  if (!pipeline) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity < 0) {
      toast.error('Quantity cannot be negative.');
      return;
    }

    setIsSubmitting(true);
    const provider = getFoodPlanningProvider();
    const foodItemId = pipeline.items[0]?.food_item_id || 'f-idli';

    const res = await provider.recordLeftover(
      pipeline.session_id,
      foodItemId,
      Number(quantity),
      unit,
      classification,
      remarks || `Leftovers logged: ${quantity} ${unit} (${classification})`
    );
    setIsSubmitting(false);

    if (res.success) {
      toast.success('Food leftover record logged successfully.');
      onSuccess();
      onClose();
    } else {
      toast.error(res.error || 'Failed to record leftovers');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Log Leftovers & Food Classification — ${pipeline.meal_type.toUpperCase()}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Classification rule notice */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-slate-900">
            <Info className="w-4 h-4 text-indigo-600" />
            <span>Leftover vs Waste Principle (PRD Section 23 &amp; 24)</span>
          </div>
          <p>
            Leftovers are not automatically classified as food waste. Usable excess can be safely stored,
            transferred, or redistributed to prevent unnecessary disposal.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 block">
            Leftover Quantity <span className="text-rose-500">*</span>
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
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
            Leftover Classification <span className="text-rose-500">*</span>
          </label>
          <select
            value={classification}
            onChange={(e) => setClassification(e.target.value as LeftoverClassification)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-hidden font-semibold"
          >
            <option value="stored">Stored (Safe for next meal / snack redistribution)</option>
            <option value="usable">Usable (Kept in dining hall for late students)</option>
            <option value="transferred">Transferred (Sent to staff dining or hostel pantry)</option>
            <option value="discarded">Discarded (Unfit for consumption / Food waste)</option>
            <option value="not_usable">Not Usable (Contaminated / Expired)</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 block">
            Handling Remarks / Storage Destination
          </label>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="e.g. Placed in clean refrigerated warmer box #2"
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
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
          >
            <Archive className="w-3.5 h-3.5 mr-1.5" />
            {isSubmitting ? 'Logging...' : 'Log Leftover Record'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
