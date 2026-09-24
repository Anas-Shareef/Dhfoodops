'use client';

import React, { useState } from 'react';
import { getUtensilProvider } from '@/lib/utensils/provider';
import { UtensilTypeCode } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { RotateCcw, Sparkles } from 'lucide-react';

interface CrossTableRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultOriginTable?: number;
  defaultFoundAtTable?: number;
  defaultUtensilCode?: UtensilTypeCode;
}

export function CrossTableRecoveryModal({
  isOpen,
  onClose,
  onSuccess,
  defaultOriginTable = 31,
  defaultFoundAtTable = 32,
  defaultUtensilCode = 'GLASS',
}: CrossTableRecoveryModalProps) {
  const [originTableNumber, setOriginTableNumber] = useState<number>(defaultOriginTable);
  const [foundAtTableNumber, setFoundAtTableNumber] = useState<number>(defaultFoundAtTable);
  const [utensilCode, setUtensilCode] = useState<UtensilTypeCode>(defaultUtensilCode);
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const provider = getUtensilProvider();
      const res = await provider.crossTableRecovery(
        originTableNumber,
        foundAtTableNumber,
        utensilCode,
        note || `Item stamped with Table ${originTableNumber} recovered from Table ${foundAtTableNumber}`
      );

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setErrorMsg(res.error || 'Failed to process cross-table recovery.');
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'An error occurred during recovery.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cross-Table Recovery (Found Item)"
      description="Darul Huda utensils are marked with ownership table numbers. Record items found at neighbouring tables and reconcile origin shelf inventory."
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
              Item Stamping (Origin Table)
            </label>
            <div className="relative">
              <input
                type="number"
                min={1}
                max={60}
                value={originTableNumber}
                onChange={(e) => setOriginTableNumber(parseInt(e.target.value) || 1)}
                className="w-full text-sm font-bold text-slate-900 border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white focus:outline-indigo-600"
                required
              />
              <span className="absolute right-2.5 top-2.5 text-[10px] font-black text-slate-400">
                TBL #{originTableNumber}
              </span>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Found At (Current Location)
            </label>
            <div className="relative">
              <input
                type="number"
                min={1}
                max={60}
                value={foundAtTableNumber}
                onChange={(e) => setFoundAtTableNumber(parseInt(e.target.value) || 1)}
                className="w-full text-sm font-bold text-slate-900 border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white focus:outline-indigo-600"
                required
              />
              <span className="absolute right-2.5 top-2.5 text-[10px] font-black text-slate-400">
                TBL #{foundAtTableNumber}
              </span>
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">
            Utensil Type
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['GLASS', 'PLATE', 'JUG'] as UtensilTypeCode[]).map((type) => (
              <button
                type="button"
                key={type}
                onClick={() => setUtensilCode(type)}
                className={`py-2 px-3 rounded-lg text-xs font-bold border transition-colors ${
                  utensilCode === type
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {type === 'GLASS' ? 'Drinking Glass' : type === 'PLATE' ? 'Dining Plate' : 'Water Jug'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">
            Verification &amp; Return Note
          </label>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Located on Table 32 side rack, wiped clean and returned to Table 31 shelf."
            className="w-full text-xs text-slate-800 border border-slate-300 rounded-lg p-2.5 focus:outline-indigo-600"
          />
        </div>

        <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-start gap-2.5 text-xs text-indigo-900">
          <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Automated Shelf Reconciliation</p>
            <p className="text-[11px] text-indigo-700 mt-0.5 leading-relaxed">
              If Table {originTableNumber} has an open discrepancy for this {utensilCode.toLowerCase()}, returning it will automatically reconcile the shortage and close the shelf to <strong>LOCKED</strong>.
            </p>
          </div>
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
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
          >
            {isSubmitting ? 'Recording...' : 'Mark Recovered & Return'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
