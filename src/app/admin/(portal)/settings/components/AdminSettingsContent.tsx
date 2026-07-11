"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Settings } from "lucide-react";
import { formatNaira } from "@/components/StatCard";
import { formatDisplayDateTime } from "@/lib/format-date";
import type { AdminActivityItem } from "@/types/admin";
import { ProButton, ProCard } from "@/app/(app)/dashboard/components/dashboard-ui";
import { AdminPageHeader, AdminRefreshButton } from "../../components/AdminAdvanced";

export default function AdminSettingsContent({
  settings,
  history,
}: {
  settings: {
    contributionAmount: number;
    payoutAmount: number;
    updatedAt: string;
  };
  history: AdminActivityItem[];
}) {
  const router = useRouter();
  const [contributionAmount, setContributionAmount] = useState(
    String(settings.contributionAmount)
  );
  const [payoutAmount, setPayoutAmount] = useState(String(settings.payoutAmount));
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contributionAmount: Number(contributionAmount),
          payoutAmount: Number(payoutAmount),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage("Platform amounts updated successfully.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Platform Settings"
        description="Configure contribution and payout amounts for the entire community"
        actions={<AdminRefreshButton />}
      />

      <ProCard
        accent="amber"
        title="Payment Amounts"
        description={`Last updated ${new Date(settings.updatedAt).toLocaleString()}`}
        icon={Settings}
      >
        <form onSubmit={handleSave} className="max-w-md space-y-5">
          {error && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {message && (
            <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {message}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Contribution amount (₦)
            </label>
            <input
              type="number"
              min={1}
              required
              value={contributionAmount}
              onChange={(e) => setContributionAmount(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
            />
            <p className="mt-1 text-xs text-slate-500">
              Current: {formatNaira(settings.contributionAmount)} per payment
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Cycle reward amount (₦)
            </label>
            <input
              type="number"
              min={1}
              required
              value={payoutAmount}
              onChange={(e) => setPayoutAmount(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
            />
            <p className="mt-1 text-xs text-slate-500">
              Current: {formatNaira(settings.payoutAmount)} per completed cycle
            </p>
          </div>

          <ProButton type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save settings"}
          </ProButton>
        </form>
      </ProCard>

      <ProCard
        accent="slate"
        title="Settings change history"
        description="Recent updates from the activity log"
        icon={Settings}
      >
        {history.length === 0 ? (
          <p className="text-sm text-slate-500">No settings changes recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {history.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5"
              >
                <p className="text-sm font-medium text-slate-900">
                  Updated by {item.adminName}
                </p>
                <p className="text-xs text-slate-500">
                  {formatDisplayDateTime(item.createdAt)}
                </p>
                {item.details.contributionAmount != null && (
                  <p className="mt-1 text-xs text-slate-600">
                    Contribution: {formatNaira(Number(item.details.contributionAmount))} ·
                    Reward: {formatNaira(Number(item.details.payoutAmount ?? 0))}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </ProCard>
    </div>
  );
}
