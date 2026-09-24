'use client';

import React, { useState } from 'react';
import { getUtensilProvider } from '@/lib/utensils/provider';
import { UtensilTypeCode, DiscrepancyStatus, DiningTable } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';

interface ReportDiscrepancyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tables: DiningTable[];
  defaultTableId?: string;
  defaultUtensilCode?: UtensilTypeCode;
}

export function ReportDiscrepancyModal({
  isOpen,
  onClose,
  onSuccess,
  tables,
  defaultTableId,
  defaultUtensilCode = 'GLASS',
}: ReportDiscrepancyModalProps) {
  const [tableId, setTableId] = useState<string>(defaultTableId || tables[0]?.id || '');
  const [utensilCode, setUtensilCode] = useState<UtensilTypeCode>(defaultUtensilCode);
  const [quantity, setQuantity] = useState<number>(1);
  const [status, setStatus] = useState<DiscrepancyStatus>('UNRESOLVED');
  const [currentTableId, setCurrentTableId] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableId) {
      setErrorMsg('Please select an origin table.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const provider = getUtensilProvider();
      const res = await provider.reportDiscrepancy(
        tableId,
        utensilCode,
        quantity,
        status,
        status === 'MISPLACED' ? currentTableId : null,
        note,
        'Admin Supervisor'
      );

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setErrorMsg(res.error || 'Failed to record discrepancy.');
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Report Utensil Discrepancy"
      description="Log inventory discrepancies (Missing vs Misplaced vs Damaged vs Broken) without overwriting historical audit events."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Origin Table
            </label>
            <select
              value={tableId}
              onChange={(e) => setTableId(e.target.value)}
              className="w-full text-xs font-bold text-slate-900 border border-slate-300 rounded-lg p-2 bg-slate-50 focus:bg-white focus:outline-indigo-600"
              required
            >
              {tables.map((t) => (
                <option key={t.id} value={t.id}>
                  Table {t.table_number} ({t.dining_area?.name || 'Hall'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Item Type
            </label>
            <select
              value={utensilCode}
              onChange={(e) => setUtensilCode(e.target.value as UtensilTypeCode)}
              className="w-full text-xs font-bold text-slate-900 border border-slate-300 rounded-lg p-2 bg-slate-50 focus:bg-white focus:outline-indigo-600"
            >
              <option value="GLASS">Drinking Glass</option>
              <option value="PLATE">Dining Plate</option>
              <option value="JUG">Water Jug</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Affected Quantity
            </label>
            <input
              type="number"
              min={1}
              max={20}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="w-full text-xs font-bold text-slate-900 border border-slate-300 rounded-lg p-2 bg-slate-50 focus:bg-white focus:outline-indigo-600"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Discrepancy Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as DiscrepancyStatus)}
              className="w-full text-xs font-bold text-slate-900 border border-slate-300 rounded-lg p-2 bg-slate-50 focus:bg-white focus:outline-indigo-600"
            >
              <option value="UNRESOLVED">Unresolved Shortage</option>
              <option value="MISPLACED">Misplaced (Located elsewhere)</option>
              <option value="MISSING">Missing (Cannot be located)</option>
              <option value="DAMAGED">Damaged (Chipped / Dent)</option>
              <option value="BROKEN">Broken (Unusable)</option>
              <option value="DISCARDED">Discarded (Removed from Hall)</option>
            </select>
          </div>
        </div>

        {status === 'MISPLACED' && (
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
            <label className="text-xs font-bold text-amber-900 block">
              Found Location (Current Table)
            </label>
            <select
              value={currentTableId}
              onChange={(e) => setCurrentTableId(e.target.value)}
              className="w-full text-xs font-bold text-slate-900 border border-amber-300 rounded-lg p-2 bg-white focus:outline-amber-600"
              required
            >
              <option value="">-- Select Current Table Location --</option>
              {tables.map((t) => (
                <option key={t.id} value={t.id}>
                  Table {t.table_number} ({t.dining_area?.name || 'Hall'})
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">
            Audit Notes &amp; Observations
          </label>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Glass unreturned during breakfast collection. Physical search initiated."
            className="w-full text-xs text-slate-800 border border-slate-300 rounded-lg p-2.5 focus:outline-indigo-600"
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
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
          >
            {isSubmitting ? 'Recording...' : 'Record Discrepancy'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
