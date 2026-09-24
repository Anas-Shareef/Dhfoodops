'use client';

import React, { useState } from 'react';
import { MealSession, AttendanceStatus } from '@/types/database';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { getAttendanceProvider } from '@/lib/attendance/provider';
import { CheckCircle2, XCircle } from 'lucide-react';
import { formatTimeStringTo12H } from '@/lib/utils/timezone';

interface CorrectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: MealSession | null;
  studentId: string;
  onSuccess: () => void;
}

export function CorrectionModal({
  isOpen,
  onClose,
  session,
  studentId,
  onSuccess,
}: CorrectionModalProps) {
  const [requestedStatus, setRequestedStatus] = useState<AttendanceStatus>('attending');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  if (!session) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 5) {
      toast.error('Please enter a valid reason for the correction request (at least 5 characters).');
      return;
    }

    setIsSubmitting(true);
    const provider = getAttendanceProvider();
    const result = await provider.requestCorrection(
      session.id,
      studentId,
      requestedStatus,
      reason.trim()
    );

    setIsSubmitting(false);
    if (result.success) {
      toast.success('Correction request submitted! An administrator will review your appeal.');
      setReason('');
      onSuccess();
      onClose();
    } else {
      toast.error(result.error || 'Failed to submit correction request.');
    }
  };

  const mealTitle = session.meal_type.charAt(0).toUpperCase() + session.meal_type.slice(1);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Attendance Correction Request"
      description={`Request post-cutoff change for ${mealTitle} (${session.session_date})`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Target Meal & Time
          </label>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-800">
            <span className="font-bold">{mealTitle}</span> at {formatTimeStringTo12H(session.meal_time)}
            <span className="block text-xs text-slate-500 mt-0.5">
              Cutoff closed at {formatTimeStringTo12H(session.attendance_end_at.slice(11, 16))}
            </span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Requested Status
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRequestedStatus('attending')}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 text-sm font-bold transition-all cursor-pointer ${
                requestedStatus === 'attending'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              I&apos;ll Attend
            </button>

            <button
              type="button"
              onClick={() => setRequestedStatus('not_attending')}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 text-sm font-bold transition-all cursor-pointer ${
                requestedStatus === 'not_attending'
                  ? 'border-rose-600 bg-rose-50 text-rose-900'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              <XCircle className="w-4 h-4 text-rose-600" />
              I Won&apos;t Attend
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Reason for Late Correction <span className="text-rose-500">*</span>
          </label>
          <textarea
            required
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., Unforeseen academic delay, emergency travel, health reason..."
            className="w-full text-sm p-3 rounded-xl border border-slate-300 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none transition-all placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Submit Appeal
          </Button>
        </div>
      </form>
    </Modal>
  );
}
