"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { MemberDashboardData } from "@/types";
import { formatNaira } from "@/components/StatCard";
import { PaymentProofImage } from "@/components/PaymentProofImage";

type IncomingContribution = MemberDashboardData["contributions"]["incoming"][number];

function PayerDetails({
  payer,
  nameClassName = "text-slate-900",
  metaClassName = "text-slate-600",
}: {
  payer: IncomingContribution["fromMemberId"];
  nameClassName?: string;
  metaClassName?: string;
}) {
  return (
    <>
      <p className={`text-lg font-bold ${nameClassName}`}>{payer.fullName}</p>
      {payer.phone && (
        <p className={`text-sm ${metaClassName}`}>{payer.phone}</p>
      )}
    </>
  );
}

interface IncomingContributionModalProps {
  open: boolean;
  contributions: IncomingContribution[];
  onApprove: (id: string) => void;
  onDecline: (id: string) => void;
  acting: string | null;
  onClose: () => void;
}

export function IncomingContributionModal({
  open,
  contributions,
  onApprove,
  onDecline,
  acting,
  onClose,
}: IncomingContributionModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !open || contributions.length === 0) return null;

  const awaiting = contributions.filter(
    (c) => c.status === "awaiting_confirmation"
  );
  const pending = contributions.filter((c) => c.status === "pending");

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="incoming-contribution-title"
        className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-slate-200 bg-white p-5 shadow-xl sm:max-w-lg sm:rounded-2xl sm:p-6"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          aria-label="Close"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="rounded-lg bg-blue-50 p-3 text-center">
          <p className="text-sm font-medium text-blue-800">Incoming contribution</p>
        </div>

        <h2
          id="incoming-contribution-title"
          className="mt-4 text-xl font-bold text-slate-900"
        >
          Approve or Reject Payment
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          {awaiting.length > 0
            ? "A member says they sent you money. Approve or reject within 24 hours."
            : "These members are assigned to pay you. Approve once you receive payment, or reject to release the slot."}
        </p>

        <div className="mt-5 space-y-4">
          {awaiting.map((c) => (
            <div
              key={c._id}
              className="rounded-lg border border-slate-200 bg-slate-50 p-4"
            >
              <div>
                <p className="text-sm font-semibold text-slate-700">From:</p>
                <PayerDetails payer={c.fromMemberId} />
                <p className="mt-2 text-xl font-bold text-slate-900">
                  {formatNaira(c.amount)}
                </p>
                {c.claimedAt && (
                  <p className="mt-1 text-xs text-slate-500">
                    Claimed {new Date(c.claimedAt).toLocaleString()}
                  </p>
                )}
                {c.paymentProofUrl && (
                  <div className="mt-3">
                    <p className="mb-2 text-xs font-medium text-slate-600">
                      Payment screenshot
                    </p>
                    <PaymentProofImage url={c.paymentProofUrl} />
                  </div>
                )}
                <span className="mt-2 inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                  Pending confirmation
                </span>
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => onApprove(c._id)}
                  disabled={acting === c._id}
                  className="flex-1 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {acting === c._id ? "Approving..." : "Approve"}
                </button>
                <button
                  type="button"
                  onClick={() => onDecline(c._id)}
                  disabled={acting === c._id || c.canDecline === false}
                  className="flex-1 rounded-lg border border-red-300 bg-white px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {acting === c._id ? "..." : "Reject"}
                </button>
              </div>
              {c.canDecline === false && (
                <p className="mt-2 text-xs text-red-600">
                  You have already rejected this member once. Contact admin for help.
                </p>
              )}
            </div>
          ))}

          {pending.map((c) => (
            <div
              key={c._id}
              className="rounded-lg border border-orange-200 bg-orange-50 p-4"
            >
              <p className="text-sm font-semibold text-orange-900">From:</p>
              <PayerDetails
                payer={c.fromMemberId}
                nameClassName="text-orange-950"
                metaClassName="text-orange-700"
              />
              <p className="mt-2 text-lg font-bold text-orange-800">
                {formatNaira(c.amount)}
              </p>
              <span className="mt-2 inline-block rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                Awaiting payment
              </span>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => onApprove(c._id)}
                  disabled={acting === c._id}
                  className="flex-1 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {acting === c._id ? "Approving..." : "Approve"}
                </button>
                <button
                  type="button"
                  onClick={() => onDecline(c._id)}
                  disabled={acting === c._id || c.canDecline === false}
                  className="flex-1 rounded-lg border border-red-300 bg-white px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {acting === c._id ? "..." : "Reject"}
                </button>
              </div>
              {c.canDecline === false && (
                <p className="mt-2 text-xs text-red-600">
                  You have already rejected this member once. Contact admin for help.
                </p>
              )}
            </div>
          ))}
        </div>

        <p className="mt-4 text-center text-xs text-slate-500">
          Only approve if you have received the exact amount in your bank account.
        </p>
      </div>
    </div>,
    document.body
  );
}
