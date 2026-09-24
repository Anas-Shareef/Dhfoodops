'use client';

import React, { useState } from 'react';
import { MealFoodPipelineItem } from '@/types/database';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { getFoodPlanningProvider } from '@/lib/food/provider';
import { CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';

interface ApproveRequirementModalProps {
  isOpen: boolean;
  onClose: () => void;
  pipeline: MealFoodPipelineItem | null;
  onSuccess: () => void;
}

export function ApproveRequirementModal({
  isOpen,
  onClose,
  pipeline,
  onSuccess,
}: ApproveRequirementModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  if (!pipeline || !pipeline.requirement) return null;

  const handleApprove = async () => {
    setIsSubmitting(true);
    const provider = getFoodPlanningProvider();
    const res = await provider.approveMealRequirement(pipeline.requirement!.id);
    setIsSubmitting(false);

    if (res.success) {
      toast.success('Food requirement approved for kitchen preparation.');
      onSuccess();
      onClose();
    } else {
      toast.error(res.error || 'Failed to approve requirement');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Approve Food Requirement — ${pipeline.meal_type.toUpperCase()}`}
    >
      <div className="space-y-4">
        <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold">
            <ShieldCheck className="w-4 h-4 text-indigo-700" />
            <span>Formal Kitchen Authorization (PRD Section 17)</span>
          </div>
          <p>
            You are authorizing the kitchen staff to begin preparation for{' '}
            <strong>{pipeline.meal_type.toUpperCase()} ({pipeline.date})</strong> based on the confirmed attendance numbers.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2.5 text-center">
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
            <p className="text-[10px] uppercase font-bold text-slate-400">Confirmed Attendees</p>
            <p className="text-lg font-black text-slate-900">{pipeline.attending_count}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-200">
            <p className="text-[10px] uppercase font-bold text-indigo-700">Safety Buffer</p>
            <p className="text-lg font-black text-indigo-700">+{pipeline.buffer_percent}% ({pipeline.buffer_quantity})</p>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
            <p className="text-[10px] uppercase font-bold text-emerald-700">Recommended Prep</p>
            <p className="text-lg font-black text-emerald-800">{pipeline.recommended_quantity}</p>
          </div>
        </div>

        {pipeline.no_response_count > 0 && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>{pipeline.no_response_count} students</strong> have not responded. Following policy, they are{' '}
              <em>not included</em> in the base requirement calculation.
            </span>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleApprove}
            disabled={isSubmitting}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
            {isSubmitting ? 'Authorizing...' : 'Authorize Requirement'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
