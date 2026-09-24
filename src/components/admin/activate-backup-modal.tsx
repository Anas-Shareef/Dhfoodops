'use client';

import React, { useState } from 'react';
import { TodayDutyItem } from '@/types/database';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { getSupplierProvider } from '@/lib/suppliers/provider';
import { ShieldAlert, ArrowRight, UserCheck } from 'lucide-react';

interface ActivateBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  duty: TodayDutyItem | null;
  onSuccess: () => void;
}

export function ActivateBackupModal({
  isOpen,
  onClose,
  duty,
  onSuccess,
}: ActivateBackupModalProps) {
  const [reason, setReason] = useState('Primary supplier unapproved absent, activating standby backup');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  if (!duty || !duty.backup_assignment?.student) return null;

  const primaryName = duty.primary_assignment?.student?.name || 'Primary Supplier';
  const backupName = duty.backup_assignment.student.name;

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error('Please enter an authorization reason.');
      return;
    }

    setIsSubmitting(true);
    const provider = getSupplierProvider();
    const result = await provider.activateBackupSupplier(
      duty.table_id,
      duty.primary_assignment?.student_id || '',
      duty.backup_assignment!.student_id,
      reason.trim()
    );
    setIsSubmitting(false);

    if (result.success) {
      toast.success(`✓ Backup supplier ${backupName} activated for Table ${duty.table_number}.`);
      onSuccess();
      onClose();
    } else {
      toast.error(result.error || 'Failed to activate backup supplier.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Activate Backup Supplier — Table ${duty.table_number}`}
      description="Authorize standby backup supplier to assume active table responsibility."
      maxWidth="md"
    >
      <form onSubmit={handleActivate} className="space-y-4">
        {/* Transition Summary Banner */}
        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <span>Emergency / Absence Responsibility Transfer</span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-amber-200/80">
            <div>
              <span className="text-[10px] text-amber-700 uppercase font-bold block">Current Primary</span>
              <span className="text-sm font-extrabold text-slate-800 line-through decoration-rose-500">
                {primaryName}
              </span>
              <span className="text-[11px] text-rose-700 font-medium block">Absent</span>
            </div>

            <ArrowRight className="w-5 h-5 text-amber-700" />

            <div className="text-right">
              <span className="text-[10px] text-amber-700 uppercase font-bold block">New Active Supplier</span>
              <span className="text-sm font-extrabold text-emerald-800 block">
                {backupName}
              </span>
              <span className="text-[11px] text-emerald-700 font-bold block">Backup Activated</span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Supervisor Reason &amp; Remarks <span className="text-rose-500">*</span>
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
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Confirm Backup Activation
          </Button>
        </div>
      </form>
    </Modal>
  );
}
