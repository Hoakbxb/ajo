"use client";

import { formatNaira } from "@/components/StatCard";
import { CONTRIBUTION_AMOUNT } from "@/lib/constants";

interface CycleCompleteModalProps {
  open: boolean;
  onClose: () => void;
  cycleNumber: number;
  payoutAmount: number;
  totalEarned: number;
}

export function CycleCompleteModal({
  open,
  onClose,
  cycleNumber,
  payoutAmount,
  totalEarned,
}: CycleCompleteModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cycle-complete-title"
        className="relative w-full max-w-md rounded-2xl border border-amber-200 bg-white p-6 shadow-xl"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-2xl">
          🎉
        </div>

        <h2
          id="cycle-complete-title"
          className="mt-5 text-center text-xl font-bold text-amber-950"
        >
          Cycle {cycleNumber} complete!
        </h2>
        <p className="mt-3 text-center text-sm text-amber-900">
          You earned {formatNaira(payoutAmount)}. Your matrix has been reset and
          you will be merged to the next available member. Pay{" "}
          {formatNaira(CONTRIBUTION_AMOUNT)} to activate, fill your matrix again, and earn{" "}
          {formatNaira(payoutAmount)} on the next cycle — this repeats continuously.
        </p>
        <p className="mt-2 text-center text-xs font-medium text-amber-700">
          Total rewards earned: {formatNaira(totalEarned)}
        </p>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-amber-500 py-3 text-sm font-semibold text-white hover:bg-amber-600"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
