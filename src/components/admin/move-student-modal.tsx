'use client';

import React, { useState } from 'react';
import { DiningTable, Student } from '@/types/database';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { getTableProvider } from '@/lib/tables/provider';
import { ArrowRight, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface MoveStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  availableTables: DiningTable[];
  onSuccess: () => void;
}

export function MoveStudentModal({
  isOpen,
  onClose,
  student,
  availableTables,
  onSuccess,
}: MoveStudentModalProps) {
  const [targetTableId, setTargetTableId] = useState<string>('');
  const [reason, setReason] = useState('Seating rearrangement');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  if (!student) return null;

  const selectedTable = availableTables.find((t) => t.id === targetTableId) || null;
  const isTargetFull = selectedTable ? (selectedTable.current_members_count ?? 0) >= selectedTable.capacity : false;

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetTableId) {
      toast.error('Please select a destination table.');
      return;
    }

    if (isTargetFull) {
      toast.error(`Table ${selectedTable?.table_number} is already full (${selectedTable?.capacity}/${selectedTable?.capacity}).`);
      return;
    }

    setIsSubmitting(true);
    const tableProvider = getTableProvider();
    const result = await tableProvider.moveStudent(
      student.id,
      targetTableId,
      reason.trim()
    );
    setIsSubmitting(false);

    if (result.success) {
      toast.success(
        `✓ ${student.name} moved from Table ${student.table_number || 'Unassigned'} to Table ${selectedTable?.table_number}.`
      );
      onSuccess();
      onClose();
    } else {
      toast.error(result.error || 'Failed to move student.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Rearrange Student Seating"
      description="Transfer a student to a different table with capacity validation."
      maxWidth="md"
    >
      <form onSubmit={handleConfirm} className="space-y-4">
        {/* Student & Movement Preview Banner (PRD Section 10) */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Student</span>
            <span className="text-xs font-mono font-bold text-slate-700">{student.enrollment_no}</span>
          </div>
          <h4 className="text-base font-extrabold text-slate-900 leading-none">
            {student.name} ({student.department?.code || 'QS2'})
          </h4>

          {/* Visual From -> To Arrow */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-200">
            <div className="text-left">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">From</span>
              <span className="text-sm font-extrabold text-slate-800">
                {student.table_number ? `Table ${student.table_number}` : 'Unassigned'}
              </span>
            </div>

            <div className="p-2 rounded-full bg-slate-200 text-slate-600">
              <ArrowRight className="w-4 h-4" />
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">To</span>
              <span className="text-sm font-extrabold text-indigo-700">
                {selectedTable ? `Table ${selectedTable.table_number}` : 'Select Table'}
              </span>
            </div>
          </div>
        </div>

        {/* Destination Table Dropdown */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Select Destination Table
          </label>
          <select
            required
            value={targetTableId}
            onChange={(e) => setTargetTableId(e.target.value)}
            className="w-full text-xs font-semibold p-3 rounded-xl border border-slate-300 focus:border-indigo-600 outline-none bg-white"
          >
            <option value="">-- Choose Target Table --</option>
            {availableTables.map((t) => {
              const current = t.current_members_count ?? 0;
              const full = current >= t.capacity;
              const isCurrent = student.table_number === t.table_number;

              return (
                <option key={t.id} value={t.id} disabled={full || isCurrent}>
                  Table {t.table_number} • {t.dining_area?.name} ({current}/{t.capacity} seats) {full ? '[FULL]' : ''} {isCurrent ? '[CURRENT]' : ''}
                </option>
              );
            })}
          </select>
        </div>

        {/* Capacity Warning Banner */}
        {selectedTable && isTargetFull && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>This table is at maximum capacity (8/8). Please pick an available table.</span>
          </div>
        )}

        {/* Reason Input (PRD Section 13) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Reason for Seating Change
          </label>
          <input
            type="text"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Seating rearrangement, department cohort balancing, requested transfer"
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
            disabled={!targetTableId || isTargetFull}
          >
            Confirm Seating Move
          </Button>
        </div>
      </form>
    </Modal>
  );
}
