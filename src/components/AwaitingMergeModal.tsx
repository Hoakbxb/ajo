"use client";

interface AwaitingMergeModalProps {
  open: boolean;
  onClose: () => void;
  cyclesCompleted?: number;
}

export function AwaitingMergeModal({
  open,
  onClose,
  cyclesCompleted = 0,
}: AwaitingMergeModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="awaiting-merge-title"
        className="relative w-full max-w-md rounded-2xl border border-sky-200 bg-white p-6 shadow-xl"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sky-100">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-200 border-t-sky-600" />
        </div>

        <h2
          id="awaiting-merge-title"
          className="mt-5 text-center text-xl font-bold text-sky-950"
        >
          Please Wait Shortly
        </h2>
        <p className="mt-3 text-center text-sm text-sky-800">
          {cyclesCompleted > 0
            ? `You completed cycle ${cyclesCompleted} and earned your reward. The system is matching you to the next available member building their matrix.`
            : "The system is matching you to the next available upline in join order."}{" "}
          You will be merged automatically and notified when it is time to make
          your ₦5,000 payment.
        </p>
        <p className="mt-2 text-center text-xs text-sky-600/80">
          This page updates every few seconds — no action needed.
        </p>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-xl border border-sky-200 bg-sky-50 py-3 text-sm font-medium text-sky-800 hover:bg-sky-100"
        >
          OK, I&apos;ll wait
        </button>
      </div>
    </div>
  );
}
