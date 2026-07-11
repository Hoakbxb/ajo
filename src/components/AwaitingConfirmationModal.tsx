"use client";

import { formatNaira } from "@/components/StatCard";

interface AwaitingConfirmationModalProps {
  open: boolean;
  parentName: string;
  amount: number;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  onClose: () => void;
}

export function AwaitingConfirmationModal({
  open,
  parentName,
  amount,
  bankName,
  accountNumber,
  accountName,
  onClose,
}: AwaitingConfirmationModalProps) {
  if (!open) return null;

  const hasBankDetails = bankName && accountNumber && accountName;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="awaiting-confirmation-title"
        className="relative w-full max-w-md rounded-2xl border border-blue-200 bg-white p-6 shadow-xl"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-blue-400 transition hover:bg-blue-50 hover:text-blue-600"
          aria-label="Close"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
          <svg
            className="h-7 w-7 text-blue-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <h2
          id="awaiting-confirmation-title"
          className="mt-5 text-center text-xl font-bold text-blue-950"
        >
          Payment Pending Confirmation
        </h2>
        <p className="mt-3 text-center text-sm text-blue-800">
          You reported payment of {formatNaira(amount)} to{" "}
          <strong>{parentName}</strong>. Waiting for them to confirm they received it.
        </p>

        {hasBankDetails && (
          <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50/50 p-4">
            <p className="text-sm font-semibold text-blue-900">Payment sent to:</p>
            <p className="mt-2 text-lg font-bold text-blue-950">{parentName}</p>
            <div className="mt-4 space-y-2 text-sm text-blue-800">
              <div className="flex justify-between gap-4">
                <span className="text-blue-600">Amount</span>
                <span className="font-semibold">{formatNaira(amount)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-blue-600">Bank</span>
                <span className="text-right font-medium">{bankName}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-blue-600">Account Number</span>
                <span className="font-mono font-medium">{accountNumber}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-blue-600">Account Name</span>
                <span className="text-right font-medium">{accountName}</span>
              </div>
            </div>
          </div>
        )}

        <p className="mt-3 text-center text-xs text-blue-600/80">
          Your account stays <strong>Pending</strong> until they approve. This page
          updates automatically.
        </p>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-blue-600 py-3 text-sm font-medium text-white hover:bg-blue-700"
        >
          Close
        </button>
      </div>
    </div>
  );
}
