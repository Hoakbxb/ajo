"use client";

import Link from "next/link";
import {
  Bell,
  ChevronDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import type { MemberDashboardData } from "@/types";
import { ProStatCard, getInitials } from "./dashboard-ui";

export function DashboardHeader({
  fullName,
  notificationCount,
}: {
  fullName: string;
  notificationCount: number;
}) {
  const initials = getInitials(fullName);

  return (
    <header className="mb-6 flex flex-col gap-4 border-b border-slate-200/80 pb-6 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Overview</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Welcome back, {fullName.split(" ")[0]} — here&apos;s your account summary
        </p>
      </div>
      <div className="flex items-center gap-2 self-start sm:self-auto">
        <button
          type="button"
          className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:text-slate-900"
          aria-label="Notifications"
        >
          <Bell className="h-[18px] w-[18px]" strokeWidth={2} />
          {notificationCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-slate-900 px-1 text-[10px] font-semibold text-white">
              {notificationCount > 9 ? "9+" : notificationCount}
            </span>
          )}
        </button>
        <Link
          href="/profile"
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white py-1.5 pl-1.5 pr-3 transition hover:border-slate-300"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-900 text-[11px] font-semibold text-white">
            {initials}
          </div>
          <span className="hidden text-sm font-medium text-slate-700 sm:inline">{fullName}</span>
          <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" strokeWidth={2} />
        </Link>
      </div>
    </header>
  );
}

export function DashboardStats({ data }: { data: MemberDashboardData }) {
  const { member, contributions, matrixProgress } = data;

  const confirmedOutgoing = contributions.outgoing
    .filter((c) => c.status === "confirmed")
    .reduce((sum, c) => sum + c.amount, 0);
  const confirmedIncoming = contributions.incoming
    .filter((c) => c.status === "confirmed")
    .reduce((sum, c) => sum + c.amount, 0);
  const totalContributions = confirmedOutgoing + confirmedIncoming;
  const totalEarnings = member.payoutAmount ?? 0;
  const pendingPayout = matrixProgress.readyForPayout ? matrixProgress.payoutAmount : 0;
  const cycleLabel =
    matrixProgress.cyclesCompleted > 0
      ? `Cycle ${matrixProgress.cyclesCompleted + (member.status === "active" ? 1 : 0)}`
      : member.status === "active"
        ? "Cycle 1"
        : "Not started";

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      <ProStatCard
        accent="indigo"
        label="Contributions"
        value={`₦${totalContributions.toLocaleString()}`}
        sublabel="All time"
        icon={Wallet}
      />
      <ProStatCard
        accent="emerald"
        label="Earnings"
        value={`₦${totalEarnings.toLocaleString()}`}
        sublabel={cycleLabel}
        icon={TrendingUp}
      />
      <div className="col-span-2 lg:col-span-1">
        <ProStatCard
          accent="teal"
          label="Pending Payout"
          value={`₦${pendingPayout.toLocaleString()}`}
          sublabel="Available"
          icon={Wallet}
        />
      </div>
    </div>
  );
}
