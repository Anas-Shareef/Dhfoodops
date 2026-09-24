'use client';

import React, { useState } from 'react';
import { getUtensilProvider } from '@/lib/utensils/provider';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { AlertOctagon, Lock } from 'lucide-react';

interface SupervisorOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tableId: string;
  tableNumber: number;
}

export function SupervisorOverrideModal({
  isOpen,
  onClose,
  onSuccess,
  tableId,
  tableNumber,
}: SupervisorOverrideModalProps) {
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setErrorMsg('Mandatory audit requirement: Please state the operational reason for supervisor override.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const provider = getUtensilProvider();
      const res = await provider.supervisorOverrideClose(tableId, reason.trim());

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setErrorMsg(res.error || 'Failed to execute supervisor override.');
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error executing supervisor override.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Supervisor Force-Close Override (Table ${tableNumber})`}
      description="Suppliers cannot bypass unresolved discrepancies. Authorized supervisors can force-close the shelf to LOCKED by recording a permanent audit reason."
      maxWidth="md"
    >
      <form onSubmit={handleOverride} className="space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
          <AlertOctagon className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <p>
            This action will be logged in the permanent <strong>utensil_events</strong> ledger with your supervisor credentials and timestamp.
          </p>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">
            Override Justification Reason <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Glass suspected misplaced at Table 32; physical search will continue during dinner prep."
            className="w-full text-xs text-slate-900 border border-slate-300 rounded-lg p-2.5 focus:outline-rose-600 bg-white"
            required
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-xs font-semibold"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5"
          >
            <Lock className="w-3.5 h-3.5" />
            {isSubmitting ? 'Authorizing...' : 'Authorize Force-Close'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
