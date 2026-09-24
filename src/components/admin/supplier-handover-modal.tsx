'use client';

import React, { useState } from 'react';
import { TodayDutyItem, Student } from '@/types/database';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { getSupplierProvider } from '@/lib/suppliers/provider';
import { ArrowRight, RefreshCw } from 'lucide-react';

interface SupplierHandoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  duty: TodayDutyItem | null;
  students: Student[];
  onSuccess: () => void;
}

export function SupplierHandoverModal({
  isOpen,
  onClose,
  duty,
  students,
  onSuccess,
}: SupplierHandoverModalProps) {
  const [toStudentId, setToStudentId] = useState('');
  const [reason, setReason] = useState('Authorized duty handover');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  if (!duty) return null;

  const currentSupplier = duty.active_supplier || duty.primary_assignment?.student;
  const targetStudent = students.find((s) => s.id === toStudentId);

  const handleHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toStudentId || !currentSupplier) {
      toast.error('Please choose a recipient student for the handover.');
      return;
    }

    if (toStudentId === currentSupplier.id) {
      toast.error('Cannot hand over duty to the same supplier.');
      return;
    }

    setIsSubmitting(true);
    const provider = getSupplierProvider();
    const result = await provider.recordSupplierHandover(
      duty.table_id,
      currentSupplier.id,
      toStudentId,
      reason.trim()
    );
    setIsSubmitting(false);

    if (result.success) {
      toast.success(
        `✓ Table ${duty.table_number} duty handed over to ${targetStudent?.name || 'new supplier'}.`
      );
      onSuccess();
      onClose();
    } else {
      toast.error(result.error || 'Failed to record handover.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Supplier Duty Handover — Table ${duty.table_number}`}
      description="Record authorized transfer of operational table responsibility."
      maxWidth="md"
    >
      <form onSubmit={handleHandover} className="space-y-4">
        {/* Handover Arrow Visualizer */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Current Supplier</span>
            <span className="text-sm font-extrabold text-slate-900 block">
              {currentSupplier?.name || 'Primary Supplier'}
            </span>
          </div>

          <div className="p-2 rounded-full bg-slate-200 text-slate-600">
            <ArrowRight className="w-4 h-4" />
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">New Responsible</span>
            <span className="text-sm font-extrabold text-indigo-700 block">
              {targetStudent ? targetStudent.name : 'Select Student'}
            </span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Select Replacement Supplier
          </label>
          <select
            required
            value={toStudentId}
            onChange={(e) => setToStudentId(e.target.value)}
            className="w-full text-xs font-semibold p-3 rounded-xl border border-slate-300 focus:border-indigo-600 outline-none bg-white"
          >
            <option value="">-- Choose Eligible Student --</option>
            {students.filter((s) => s.id !== currentSupplier?.id).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.enrollment_no}) • {s.department?.code || 'QS2'}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Handover Reason / Remarks <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:border-indigo-600 outline-none"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={!toStudentId}>
            Authorize Handover
          </Button>
        </div>
      </form>
    </Modal>
  );
}
