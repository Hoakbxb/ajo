"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowDownLeft,
  ClipboardList,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { formatNaira } from "@/components/StatCard";
import { formatDisplayDateTime } from "@/lib/format-date";
import type { AdminActivityItem, AdminMatchingMetrics } from "@/types/admin";
import {
  ProButton,
  ProCard,
  ProStatCard,
} from "@/app/(app)/dashboard/components/dashboard-ui";
import { AdminPageHeader, AdminRefreshButton } from "./AdminAdvanced";
import { useAdminRealtime } from "@/hooks/useAdminRealtime";

interface AdminStats {
  totalMembers: number;
  activeMembers: number;
  completeMembers: number;
  pendingContributions: number;
  confirmedContributions: number;
  escalationCount: number;
  totalContributionsValue: number;
  totalPayoutsValue: number;
  contributionAmount: number;
  payoutAmount: number;
  matching: AdminMatchingMetrics;
}

export default function AdminOverview({
  stats: initialStats,
  recentActivity,
}: {
  stats: AdminStats;
  recentActivity: AdminActivityItem[];
}) {
  const router = useRouter();
  const [stats, setStats] = useState(initialStats);
  const [activity, setActivity] = useState(recentActivity);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  const [message, setMessage] = useState("");

  const refresh = useCallback(async () => {
    router.refresh();
    try {
      const [statsRes, activityRes] = await Promise.all([
        fetch("/api/admin/stats"),
        fetch("/api/admin/activity?limit=8"),
      ]);
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats);
      }
      if (activityRes.ok) {
        const data = await activityRes.json();
        setActivity(data.activity);
      }
    } catch {
      // ignore polling errors
    }
  }, [router]);

  useAdminRealtime(refresh);

  useEffect(() => {
    const interval = setInterval(refresh, 60_000);
    return () => clearInterval(interval);
  }, [refresh]);

  async function runMaintenance() {
    setMaintenanceLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/matrix", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage(data.message ?? "Matrix maintenance completed.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Maintenance failed");
    } finally {
      setMaintenanceLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Community Overview"
        description="Monitor members, payments, and escalations across the platform"
        actions={
          <>
            <AdminRefreshButton />
            <ProButton disabled={maintenanceLoading} onClick={runMaintenance}>
              {maintenanceLoading ? "Running maintenance..." : "Run maintenance"}
            </ProButton>
          </>
        }
      />

      {message && (
        <div className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
          {message}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <ProStatCard accent="indigo" label="Total Members" value={String(stats.totalMembers)} sublabel={`${stats.activeMembers} active`} icon={Users} />
        <ProStatCard accent="amber" label="Pending Payments" value={String(stats.pendingContributions)} sublabel="Awaiting action" icon={Wallet} />
        <ProStatCard accent="emerald" label="Confirmed Payments" value={formatNaira(stats.totalContributionsValue)} sublabel={`${stats.confirmedContributions} payments`} icon={ArrowDownLeft} />
        <ProStatCard accent="violet" label="Rewards Paid" value={formatNaira(stats.totalPayoutsValue)} sublabel={`${stats.completeMembers} members`} icon={TrendingUp} />
      </div>

      <ProCard
        accent="blue"
        title="Matching & payment pipeline"
        description="Who still needs to pay or be matched before they activate"
        icon={Users}
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          <ProStatCard
            accent="orange"
            label="Awaiting merge"
            value={String(stats.matching.awaitingMerge)}
            sublabel="Not matched yet"
            icon={Users}
          />
          <ProStatCard
            accent="amber"
            label="Need to pay"
            value={String(stats.matching.needsPayment)}
            sublabel="Matched — payment due"
            icon={Wallet}
          />
          <ProStatCard
            accent="blue"
            label="Awaiting confirm"
            value={String(stats.matching.awaitingConfirmation)}
            sublabel="Payment submitted"
            icon={Wallet}
          />
          <ProStatCard
            accent="rose"
            label="Payment pipeline"
            value={String(stats.matching.totalPaymentPipeline)}
            sublabel="Must pay to activate"
            icon={Wallet}
          />
          <ProStatCard
            accent="emerald"
            label="Open slots"
            value={String(stats.matching.openPaymentSlots)}
            sublabel={`${stats.matching.activeBuildersWithOpenSlots} builders`}
            icon={Users}
          />
          <ProStatCard
            accent="slate"
            label="Merge capacity"
            value={
              stats.matching.openPaymentSlots >= stats.matching.awaitingMerge
                ? "OK"
                : String(
                    Math.max(
                      0,
                      stats.matching.awaitingMerge -
                        stats.matching.openPaymentSlots
                    )
                  )
            }
            sublabel={
              stats.matching.openPaymentSlots >= stats.matching.awaitingMerge
                ? "Enough slots for queue"
                : "More payers needed for queue"
            }
            icon={AlertTriangle}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link href="/admin/members?filter=awaiting_merge" className="font-medium text-amber-700 hover:text-amber-900">
            View awaiting merge →
          </Link>
          <Link href="/admin/members?filter=needs_payment" className="font-medium text-amber-700 hover:text-amber-900">
            View need payment →
          </Link>
          <Link href="/admin/contributions" className="font-medium text-amber-700 hover:text-amber-900">
            View contributions →
          </Link>
        </div>
      </ProCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <ProCard accent="slate" title="Quick Links" description="Jump to common admin tasks" icon={Users}>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { href: "/admin/members", label: "View all members" },
              { href: "/admin/contributions", label: "Payment queue" },
              { href: "/admin/escalations", label: "Escalations" },
              { href: "/admin/matrix", label: "Matrix explorer" },
              { href: "/admin/activity", label: "Activity log" },
              { href: "/admin/settings", label: "Platform settings" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-900"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </ProCard>

        <ProCard
          accent={stats.escalationCount > 0 ? "rose" : "emerald"}
          title="Escalations"
          description="Members requiring admin assistance"
          icon={AlertTriangle}
        >
          {stats.escalationCount > 0 ? (
            <div className="space-y-3">
              <p className="text-3xl font-semibold text-slate-900">{stats.escalationCount}</p>
              <p className="text-sm text-slate-500">Members flagged for manual review or payment disputes.</p>
              <Link href="/admin/escalations" className="inline-flex rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700">
                Review escalations
              </Link>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No members currently require admin contact.</p>
          )}
        </ProCard>
      </div>

      <ProCard accent="indigo" title="Recent Admin Activity" description="Latest platform actions" icon={ClipboardList}>
        {activity.length === 0 ? (
          <p className="text-sm text-slate-500">No admin activity recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {activity.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium capitalize text-slate-900">
                    {item.action.replace(/\./g, " · ").replace(/_/g, " ")}
                  </p>
                  <p className="text-xs text-slate-500">by {item.adminName}</p>
                </div>
                <p className="shrink-0 text-xs text-slate-400">
                  {formatDisplayDateTime(item.createdAt)}
                </p>
              </div>
            ))}
            <Link href="/admin/activity" className="inline-flex text-sm font-medium text-amber-700 hover:text-amber-900">
              View full activity log →
            </Link>
          </div>
        )}
      </ProCard>

      <ProCard accent="amber" title="Platform amounts" description="Current contribution and reward settings" icon={Wallet}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-xs text-slate-500">Contribution</p>
            <p className="text-lg font-semibold text-slate-900">{formatNaira(stats.contributionAmount)}</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-xs text-slate-500">Cycle reward</p>
            <p className="text-lg font-semibold text-slate-900">{formatNaira(stats.payoutAmount)}</p>
          </div>
        </div>
        <Link href="/admin/settings" className="mt-4 inline-flex text-sm font-medium text-amber-700 hover:text-amber-900">
          Edit settings →
        </Link>
      </ProCard>
    </div>
  );
}
