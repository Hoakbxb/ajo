"use client";

import { useEffect, useRef, useState } from "react";
import { formatNaira } from "@/components/StatCard";

interface PaymentPromptModalProps {
  open: boolean;
  parentName: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  contributionId: string;
  onClaim: (id: string, file: File) => void;
  claiming: boolean;
  onClose: () => void;
}

export function PaymentPromptModal({
  open,
  parentName,
  bankName,
  accountNumber,
  accountName,
  amount,
  contributionId,
  onClaim,
  claiming,
  onClose,
}: PaymentPromptModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  function handleFileChange(next: File | null) {
    setError(null);
    if (!next) {
      setFile(null);
      return;
    }

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(next.type)) {
      setError("Upload a JPEG, PNG, WebP, or GIF image");
      setFile(null);
      return;
    }
    if (next.size > 5 * 1024 * 1024) {
      setError("Screenshot must be 5 MB or smaller");
      setFile(null);
      return;
    }

    setFile(next);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-prompt-title"
        className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl border border-orange-200 bg-white p-6 shadow-xl"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-orange-400 transition hover:bg-orange-50 hover:text-orange-600"
          aria-label="Close"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="rounded-xl bg-orange-50 p-3 text-center">
          <p className="text-sm font-medium text-orange-700">
            Account status: Pending — pay to activate your account
          </p>
        </div>

        <h2 id="payment-prompt-title" className="mt-4 text-xl font-bold text-orange-900">
          Make Your Contribution
        </h2>
        <p className="mt-2 text-sm text-orange-800">
          Pay {formatNaira(amount)} to your upline. Upload your transfer screenshot,
          then submit for confirmation.
        </p>

        <div className="mt-5 rounded-xl border border-orange-200 bg-orange-50/50 p-4">
          <p className="text-sm font-semibold text-orange-900">Pay to:</p>
          <p className="mt-2 text-lg font-bold text-orange-950">{parentName}</p>

          <div className="mt-4 space-y-2 text-sm text-orange-800">
            <div className="flex justify-between gap-4">
              <span className="text-orange-600">Bank</span>
              <span className="text-right font-medium">{bankName}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-orange-600">Account Number</span>
              <span className="font-mono font-medium">{accountNumber}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-orange-600">Account Name</span>
              <span className="text-right font-medium">{accountName}</span>
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-dashed border-orange-300 bg-orange-50/40 p-4">
          <p className="text-sm font-semibold text-orange-900">Payment screenshot</p>
          <p className="mt-1 text-xs text-orange-700">
            Upload the bank transfer receipt or screenshot showing the payment.
          </p>

          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(event) =>
              handleFileChange(event.target.files?.[0] ?? null)
            }
          />

          {previewUrl ? (
            <div className="mt-3 space-y-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Selected payment screenshot"
                className="max-h-48 w-full rounded-lg border border-orange-200 object-contain"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="flex-1 rounded-lg border border-orange-300 bg-white px-3 py-2 text-sm font-medium text-orange-800 hover:bg-orange-50"
                >
                  Change image
                </button>
                <button
                  type="button"
                  onClick={() => handleFileChange(null)}
                  className="rounded-lg border border-orange-200 px-3 py-2 text-sm text-orange-700 hover:bg-orange-50"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="mt-3 w-full rounded-xl border border-orange-300 bg-white px-4 py-3 text-sm font-medium text-orange-800 hover:bg-orange-50"
            >
              Choose screenshot
            </button>
          )}

          {error && (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          )}
        </div>

        <button
          type="button"
          onClick={() => file && onClaim(contributionId, file)}
          disabled={claiming || !file}
          className="mt-5 w-full rounded-xl bg-orange-600 py-3.5 font-semibold text-white transition hover:bg-orange-700 disabled:opacity-60"
        >
          {claiming ? "Uploading..." : "Upload & Submit Payment"}
        </button>

        <p className="mt-3 text-center text-xs text-orange-600/70">
          The recipient must confirm within 24 hours after you submit.
        </p>
      </div>
    </div>
  );
}
