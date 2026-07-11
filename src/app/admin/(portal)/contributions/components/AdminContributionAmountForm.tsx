"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatNaira } from "@/components/StatCard";
import { ProButton } from "@/app/(app)/dashboard/components/dashboard-ui";

export default function AdminContributionAmountForm({
  contributionId,
  currentAmount,
  label,
  onSuccess,
}: {
  contributionId: string;
  currentAmount: number;
  label?: string;
  onSuccess?: (message: string) => void;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState(String(currentAmount));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("Enter a valid amount greater than zero");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/admin/contributions/${contributionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_amount", amount: parsed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onSuccess?.(data.message ?? "Amount updated");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update amount");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-slate-200 bg-slate-50/80 p-4"
    >
      {label && (
        <p className="mb-3 text-sm font-medium text-slate-700">{label}</p>
      )}
      <p className="mb-3 text-xs text-slate-500">
        Current amount: {formatNaira(currentAmount)}
      </p>
      {error && (
        <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-500">
            New amount (₦)
          </label>
          <input
            type="number"
            min={1}
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
          />
        </div>
        <ProButton type="submit" disabled={loading}>
          {loading ? "Saving..." : "Update amount"}
        </ProButton>
      </div>
    </form>
  );
}
