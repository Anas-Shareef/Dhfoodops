'use client';

import React, { useState } from 'react';
import { TodayDutyItem } from '@/types/database';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { getSupplierProvider } from '@/lib/suppliers/provider';
import { getTodayDateStringIST } from '@/lib/utils/timezone';
import { UserX, AlertCircle } from 'lucide-react';

interface MarkAbsenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  duty: TodayDutyItem | null;
  onSuccess: () => void;
}

export function MarkAbsenceModal({
  isOpen,
  onClose,
  duty,
  onSuccess,
}: MarkAbsenceModalProps) {
  const [status, setStatus] = useState<'unapproved_absent' | 'approved_absent'>('unapproved_absent');
  const [reason, setReason] = useState('Supplier did not appear at dining hall for scheduled duty');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  if (!duty || !duty.primary_assignment?.student) return null;

  const supplier = duty.primary_assignment.student;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const provider = getSupplierProvider();
    const today = getTodayDateStringIST();

    const result = await provider.markSupplierAbsent(
      supplier.id,
      duty.table_id,
      today,
      status,
      reason.trim()
    );
    setIsSubmitting(false);

    if (result.success) {
      toast.success(
        `✓ ${supplier.name} marked as ${status === 'unapproved_absent' ? 'Unapproved Absent' : 'Approved Absent'}.`
      );
      onSuccess();
      onClose();
    } else {
      toast.error(result.error || 'Failed to record absence.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Mark Supplier Absence — Table ${duty.table_number}`}
      description="Record operational absence for table supplier."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
          <span className="text-slate-500">Target Supplier:</span>{' '}
          <strong className="text-slate-900">{supplier.name}</strong> ({supplier.enrollment_no})
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Absence Classification
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setStatus('unapproved_absent')}
              className={`p-3 rounded-xl border-2 text-xs font-bold transition-all cursor-pointer text-left ${
                status === 'unapproved_absent'
                  ? 'border-rose-600 bg-rose-50 text-rose-900'
                  : 'border-slate-200 bg-white text-slate-600'
              }`}
            >
              <div className="font-extrabold">Unapproved Absent</div>
              <div className="text-[10px] text-rose-700 font-normal mt-0.5">
                Did not appear at dining hall without leave
              </div>
            </button>

            <button
              type="button"
              onClick={() => setStatus('approved_absent')}
              className={`p-3 rounded-xl border-2 text-xs font-bold transition-all cursor-pointer text-left ${
                status === 'approved_absent'
                  ? 'border-amber-600 bg-amber-50 text-amber-900'
                  : 'border-slate-200 bg-white text-slate-600'
              }`}
            >
              <div className="font-extrabold">Approved Absent</div>
              <div className="text-[10px] text-amber-700 font-normal mt-0.5">
                Authorized institutional leave or medical excuse
              </div>
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Reason / Remarks <span className="text-rose-500">*</span>
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
          <Button type="submit" variant="danger" isLoading={isSubmitting}>
            Record Absence
          </Button>
        </div>
      </form>
    </Modal>
  );
}
