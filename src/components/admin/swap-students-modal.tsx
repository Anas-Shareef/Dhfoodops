'use client';

import React, { useState } from 'react';
import { Student } from '@/types/database';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { getTableProvider } from '@/lib/tables/provider';
import { RefreshCw, ArrowLeftRight } from 'lucide-react';

interface SwapStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  onSuccess: () => void;
}

export function SwapStudentsModal({
  isOpen,
  onClose,
  students,
  onSuccess,
}: SwapStudentsModalProps) {
  const [studentIdA, setStudentIdA] = useState<string>('');
  const [studentIdB, setStudentIdB] = useState<string>('');
  const [reason, setReason] = useState('Mutual seating swap');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  const assignedStudents = students.filter((s) => s.table_number !== null);

  const studentA = assignedStudents.find((s) => s.id === studentIdA) || null;
  const studentB = assignedStudents.find((s) => s.id === studentIdB) || null;

  const handleSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentIdA || !studentIdB) {
      toast.error('Please select both students to perform a swap.');
      return;
    }

    if (studentIdA === studentIdB) {
      toast.error('Cannot swap a student with themselves.');
      return;
    }

    if (studentA?.table_number === studentB?.table_number) {
      toast.error(`Both students are already assigned to Table ${studentA?.table_number}.`);
      return;
    }

    setIsSubmitting(true);
    const tableProvider = getTableProvider();
    const result = await tableProvider.swapStudents(
      studentIdA,
      studentIdB,
      reason.trim()
    );
    setIsSubmitting(false);

    if (result.success) {
      toast.success(
        `✓ Swapped ${studentA?.name} (now Table ${studentB?.table_number}) and ${studentB?.name} (now Table ${studentA?.table_number}).`
      );
      onSuccess();
      onClose();
    } else {
      toast.error(result.error || 'Failed to perform swap.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Swap Seating Between Two Students"
      description="Atomic exchange of table assignments between two assigned students."
      maxWidth="md"
    >
      <form onSubmit={handleSwap} className="space-y-4">
        {/* Swap Visualizer */}
        <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Student A</span>
            <select
              value={studentIdA}
              onChange={(e) => setStudentIdA(e.target.value)}
              className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-300 bg-white outline-none"
            >
              <option value="">-- Choose Student A --</option>
              {assignedStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} (T{s.table_number})
                </option>
              ))}
            </select>
            {studentA && (
              <span className="text-[11px] text-slate-500 block">
                Currently: <strong>Table {studentA.table_number}</strong>
              </span>
            )}
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Student B</span>
            <select
              value={studentIdB}
              onChange={(e) => setStudentIdB(e.target.value)}
              className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-300 bg-white outline-none"
            >
              <option value="">-- Choose Student B --</option>
              {assignedStudents.map((s) => (
                <option key={s.id} value={s.id} disabled={s.id === studentIdA}>
                  {s.name} (T{s.table_number})
                </option>
              ))}
            </select>
            {studentB && (
              <span className="text-[11px] text-slate-500 block">
                Currently: <strong>Table {studentB.table_number}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Outcome Preview */}
        {studentA && studentB && studentA.table_number !== studentB.table_number && (
          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-950 flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-indigo-600 shrink-0" />
            <div>
              <strong>{studentA.name}</strong> will move to <strong>Table {studentB.table_number}</strong>, and{' '}
              <strong>{studentB.name}</strong> will move to <strong>Table {studentA.table_number}</strong>.
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Reason for Swap
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
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            disabled={!studentIdA || !studentIdB || studentA?.table_number === studentB?.table_number}
          >
            Confirm Swap
          </Button>
        </div>
      </form>
    </Modal>
  );
}
