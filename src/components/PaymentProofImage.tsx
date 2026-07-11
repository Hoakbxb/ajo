"use client";

interface PaymentProofImageProps {
  url: string;
  alt?: string;
  className?: string;
}

export function PaymentProofImage({
  url,
  alt = "Payment screenshot",
  className = "",
}: PaymentProofImageProps) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`group block overflow-hidden rounded-xl border border-slate-200 bg-slate-50 ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={alt}
        className="max-h-80 w-full object-contain transition group-hover:opacity-95"
      />
      <p className="border-t border-slate-200 px-3 py-2 text-center text-xs text-slate-500">
        Tap to open full size
      </p>
    </a>
  );
}
