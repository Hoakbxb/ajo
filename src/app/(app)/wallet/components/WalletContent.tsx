"use client";

import { useCallback, useState } from "react";
import {
  Check,
  Copy,
  Gift,
  Share2,
  Users,
  Wallet,
} from "lucide-react";
import { formatNaira } from "@/components/StatCard";
import { formatDisplayDate } from "@/lib/format-date";
import type { ReferralSummary } from "@/lib/referrals";
import {
  ProButton,
  ProCard,
  ProEmptyState,
  ProStatCard,
} from "../../dashboard/components/dashboard-ui";

function statusLabel(status: string) {
  switch (status) {
    case "qualified":
      return "Earned";
    case "pending":
      return "Pending payment";
    default:
      return status;
  }
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "qualified":
      return "bg-emerald-50 text-emerald-700";
    case "pending":
      return "bg-amber-50 text-amber-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

export default function WalletContent({
  initialSummary,
}: {
  initialSummary: ReferralSummary;
}) {
  const [summary, setSummary] = useState(initialSummary);
  const [copied, setCopied] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const progressPercent = Math.min(
    100,
    Math.round((summary.balance / summary.withdrawalThreshold) * 100)
  );

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(summary.referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy link");
    }
  }, [summary.referralLink]);

  async function handleRedeem() {
    setRedeeming(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/referrals/redeem", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const refresh = await fetch("/api/referrals");
      const refreshed = await refresh.json();
      if (refresh.ok) setSummary(refreshed);

      setMessage(data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Redemption failed");
    } finally {
      setRedeeming(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Referral Wallet
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Invite friends and earn {formatNaira(summary.rewardPerReferral)} per
          referral. Redeem {formatNaira(summary.withdrawalThreshold)} toward
          your next contribution.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ProStatCard
          label="Referral balance"
          value={formatNaira(summary.balance)}
          icon={Wallet}
          accent="emerald"
          sublabel="Ready to redeem"
        />
        <ProStatCard
          label="Contribution credit"
          value={formatNaira(summary.contributionCredit)}
          icon={Gift}
          accent="indigo"
          sublabel="Applied to payments"
        />
        <ProStatCard
          label="Qualified referrals"
          value={String(
            summary.referrals.filter((r) => r.status === "qualified").length
          )}
          icon={Users}
          accent="violet"
          sublabel="Friends who paid"
        />
      </div>

      <ProCard title="Invite friends" accent="indigo">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Your referral code
            </p>
            <p className="mt-1 text-lg font-bold text-slate-900">
              {summary.referralCode}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Share link
            </p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                readOnly
                value={summary.referralLink}
                className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
              />
              <ProButton
                type="button"
                variant="secondary"
                onClick={copyLink}
                className="shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy link
                  </>
                )}
              </ProButton>
            </div>
          </div>

          <p className="text-sm text-slate-500">
            When a friend joins with your link and completes their first
            contribution, you earn {formatNaira(summary.rewardPerReferral)}.
          </p>
        </div>
      </ProCard>

      <ProCard title="Redeem earnings" accent="emerald">
        <div className="space-y-4">
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-slate-500">Progress to redemption</span>
              <span className="font-medium text-slate-900">
                {formatNaira(summary.balance)} /{" "}
                {formatNaira(summary.withdrawalThreshold)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {summary.contributionCredit > 0 && (
            <p className="rounded-lg bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
              You have {formatNaira(summary.contributionCredit)} contribution
              credit ready. It will apply automatically to your next
              contribution.
            </p>
          )}

          {message && (
            <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {message}
            </p>
          )}
          {error && (
            <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {error}
            </p>
          )}

          <ProButton
            type="button"
            onClick={handleRedeem}
            disabled={!summary.canWithdraw || redeeming}
            className="w-full sm:w-auto"
          >
            <Share2 className="h-4 w-4" />
            {redeeming
              ? "Processing..."
              : `Redeem ${formatNaira(summary.withdrawalThreshold)} to contribution`}
          </ProButton>

          {!summary.canWithdraw && (
            <p className="text-xs text-slate-500">
              Invite more friends to reach{" "}
              {formatNaira(summary.withdrawalThreshold)}.
            </p>
          )}
        </div>
      </ProCard>

      <ProCard title="Your referrals" accent="violet">
        {summary.referrals.length === 0 ? (
          <ProEmptyState message="No referrals yet. Share your link to start earning." />
        ) : (
          <div className="divide-y divide-slate-100">
            {summary.referrals.map((referral) => (
              <div
                key={referral.id}
                className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {referral.referredName}
                  </p>
                  <p className="text-xs text-slate-500">
                    {referral.referredMemberId} · Joined{" "}
                    {formatDisplayDate(referral.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-slate-700">
                    {formatNaira(referral.rewardAmount)}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${statusBadgeClass(referral.status)}`}
                  >
                    {statusLabel(referral.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </ProCard>
    </div>
  );
}
