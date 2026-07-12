"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  CreditCard,
  Gift,
  Mail,
  Network,
  Phone,
  RefreshCw,
  Star,
  User,
  Users,
} from "lucide-react";
import type { MemberDashboardData, PaymentStatus } from "@/types";
import { formatNaira } from "@/components/StatCard";
import { CONTRIBUTION_AMOUNT, PAYOUT_AMOUNT } from "@/lib/constants";
import {
  formatContributionStatusLabel,
  formatPaymentStatusLabel,
  contributionStatusBadgeClass,
} from "@/lib/payment-status";
import { ADMIN_CONTACT_EMAIL, ADMIN_CONTACT_PHONE } from "@/lib/constants";
import { formatDisplayDateTime } from "@/lib/format-date";
import {
  formatMemberStatusLabel,
  isActiveStatus,
  isPendingStatus,
} from "@/lib/member-status";
import {
  ProCard,
  ProAlert,
  ProBadge,
  ProButton,
  ProEmptyState,
  ProList,
  ProListItem,
  accentStyles,
  getInitials,
} from "./dashboard-ui";

export function AdminContactAlert({
  member,
}: {
  member: MemberDashboardData["member"];
}) {
  if (!member.requiresAdminContact || !isActiveStatus(member.status)) return null;

  return (
    <ProAlert accent="rose" icon={AlertTriangle} title="Admin assistance required">
      <p>Your account needs manual review. Please contact support.</p>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <a href={`mailto:${ADMIN_CONTACT_EMAIL}`} className="font-medium text-slate-900 underline">
          {ADMIN_CONTACT_EMAIL}
        </a>
        <a href={`tel:${ADMIN_CONTACT_PHONE}`} className="font-medium text-slate-900 underline">
          {ADMIN_CONTACT_PHONE}
        </a>
      </div>
    </ProAlert>
  );
}

export function AwaitingRematchNotice({
  matrixProgress,
}: {
  matrixProgress: MemberDashboardData["matrixProgress"];
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!matrixProgress.waitingForRematch || !matrixProgress.rematchAfter) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [matrixProgress.waitingForRematch, matrixProgress.rematchAfter]);

  if (!matrixProgress.waitingForRematch || matrixProgress.awaitingPaymentConfirmation) {
    return null;
  }

  return (
    <ProAlert accent="blue" icon={RefreshCw} title="Waiting to be matched">
      <p>The system will assign you to an available upline shortly.</p>
      {matrixProgress.rematchAfter && (
        <p className="mt-2 text-xs font-medium text-slate-500">
          Next check in{" "}
          {Math.max(0, Math.ceil((new Date(matrixProgress.rematchAfter).getTime() - now) / 1000))}s
        </p>
      )}
    </ProAlert>
  );
}

export function MatrixResetNotice({
  member,
  matrixProgress,
}: {
  member: MemberDashboardData["member"];
  matrixProgress: MemberDashboardData["matrixProgress"];
}) {
  if (!matrixProgress.cycleJustRestarted) return null;

  const cycleNum = matrixProgress.cyclesCompleted;
  const totalEarned = member.payoutAmount;

  if (matrixProgress.waitingForRematch) {
    return (
      <ProAlert accent="amber" icon={Gift} title={`Cycle ${cycleNum} complete — finding upline`}>
        You earned {formatNaira(PAYOUT_AMOUNT)} (total: {formatNaira(totalEarned)}).
        Your matrix reset to 0. The system will merge you under the next eligible member
        — then pay {formatNaira(CONTRIBUTION_AMOUNT)} to activate and start building again.
      </ProAlert>
    );
  }

  if (matrixProgress.contributionOwed <= 0) return null;

  return (
    <ProAlert accent="amber" icon={Gift} title={`Cycle ${cycleNum} complete — pay to restart`}>
      You earned {formatNaira(PAYOUT_AMOUNT)} (total: {formatNaira(totalEarned)}).
      Your matrix has been reset. Pay {member.parentId?.fullName}{" "}
      {formatNaira(CONTRIBUTION_AMOUNT)} to activate cycle {cycleNum + 1}, fill both positions,
      and earn {formatNaira(PAYOUT_AMOUNT)} again — this cycle repeats continuously.
    </ProAlert>
  );
}

export function RematchNotice({
  member,
  matrixProgress,
}: {
  member: MemberDashboardData["member"];
  matrixProgress: MemberDashboardData["matrixProgress"];
}) {
  if (
    !isPendingStatus(member.status) ||
    member.paymentRejectionCount === 0 ||
    matrixProgress.contributionOwed <= 0
  ) {
    return null;
  }

  return (
    <ProAlert accent="violet" icon={RefreshCw} title="You have been rematched">
      Pay {member.parentId?.fullName} to activate your account.
    </ProAlert>
  );
}

export function ProfileCard({
  member,
  paymentStatus,
}: {
  member: MemberDashboardData["member"];
  paymentStatus: PaymentStatus;
}) {
  const initials = getInitials(member.fullName);

  return (
    <ProCard accent="indigo" title="Profile" description="Your account information" icon={User}>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-lg font-semibold text-white">
          {initials}
        </div>
        <div className="min-w-0 flex-1 space-y-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-slate-900">{member.fullName}</h2>
              {isActiveStatus(member.status) && (
                <ProBadge accent="emerald">
                  <CheckCircle2 className="mr-1 inline h-3 w-3" strokeWidth={2.5} />
                  Active
                </ProBadge>
              )}
            </div>
          </div>

          <div className="space-y-2.5 border-t border-slate-100 pt-4">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={2} />
              <span className="truncate text-slate-700">{member.email}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Phone className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={2} />
              <span className="text-slate-700">{member.phone}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            <ProBadge accent={isActiveStatus(member.status) ? "emerald" : "amber"}>
              {formatMemberStatusLabel(member.status)}
            </ProBadge>
            <ProBadge
              accent={
                paymentStatus === "completed"
                  ? "blue"
                  : paymentStatus === "pending"
                    ? "amber"
                    : "orange"
              }
            >
              {paymentStatus === "completed" && (
                <Star className="mr-1 inline h-3 w-3" strokeWidth={2.5} />
              )}
              {formatPaymentStatusLabel(paymentStatus)}
            </ProBadge>
          </div>
        </div>
      </div>
    </ProCard>
  );
}

export function ContributionAlert({
  member,
  matrixProgress,
  contributions,
  onOpenModal,
  onOpenAwaitingModal,
  showDismissedReminder,
}: {
  member: MemberDashboardData["member"];
  matrixProgress: MemberDashboardData["matrixProgress"];
  contributions: MemberDashboardData["contributions"];
  onOpenModal?: () => void;
  onOpenAwaitingModal?: () => void;
  showDismissedReminder?: boolean;
}) {
  if (member.requiresAdminContact) return null;

  const pendingContribution = contributions.outgoing.find((c) => c.status === "pending");
  const awaitingContribution = contributions.outgoing.find(
    (c) => c.status === "awaiting_confirmation"
  );

  if (awaitingContribution) {
    const recipient =
      member.parentId ??
      (typeof awaitingContribution.toMemberId === "object"
        ? awaitingContribution.toMemberId
        : null);

    return (
      <div className="rounded-xl border border-blue-200/80 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="flex gap-4 p-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Clock className="h-[18px] w-[18px]" strokeWidth={2} />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-slate-900">
              Payment pending confirmation
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              {formatNaira(awaitingContribution.amount)} sent to {recipient?.fullName}{" "}
              — awaiting their approval.
            </p>
            {onOpenAwaitingModal && (
              <div className="mt-4">
                <ProButton variant="secondary" onClick={onOpenAwaitingModal}>
                  View Payment Details
                </ProButton>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (matrixProgress.contributionOwed <= 0 || !pendingContribution) return null;

  return (
    <div
      className={`rounded-xl border bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)] ${
        showDismissedReminder ? "border-orange-300 ring-2 ring-orange-100" : "border-slate-200/80"
      }`}
    >
      <div className="flex gap-4 p-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
          <CreditCard className="h-[18px] w-[18px]" strokeWidth={2} />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-slate-900">Contribution required</h3>
          <p className="mt-1 text-sm text-slate-600">
            Pay {formatNaira(matrixProgress.contributionOwed)} to {member.parentId?.fullName}
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            {onOpenModal && (
              <ProButton onClick={onOpenModal}>
                Upload Payment Screenshot
              </ProButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function IncomingPaymentAlert({
  contributions,
  onApprove,
  onDecline,
  acting,
  onOpenModal,
  showDismissedReminder,
}: {
  contributions: MemberDashboardData["contributions"];
  onApprove: (id: string) => void;
  onDecline: (id: string) => void;
  acting: string | null;
  onOpenModal?: () => void;
  showDismissedReminder?: boolean;
}) {
  const awaiting = contributions.incoming.filter((c) => c.status === "awaiting_confirmation");
  const pending = contributions.incoming.filter((c) => c.status === "pending");
  const items = [...awaiting, ...pending];

  if (items.length === 0) return null;

  return (
    <div
      className={`rounded-xl border bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)] ${
        showDismissedReminder ? "border-amber-300 ring-2 ring-amber-100" : "border-slate-200/80"
      }`}
    >
      <div className="p-5">
        <div className="flex gap-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
            <ArrowDownLeft className="h-[18px] w-[18px]" strokeWidth={2} />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-slate-900">Incoming payment — action required</h3>
            <p className="mt-0.5 text-sm text-slate-500">Review and approve within 24 hours</p>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {items.map((c) => (
            <div key={c._id} className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{c.fromMemberId.fullName}</p>
                  <p className="text-lg font-semibold text-slate-900">{formatNaira(c.amount)}</p>
                </div>
                <ProBadge accent="amber">
                  {c.status === "awaiting_confirmation" ? "Pending" : "Awaiting"}
                </ProBadge>
              </div>
              {c.status === "awaiting_confirmation" && (
                <div className="mt-3 flex gap-2">
                  <ProButton onClick={() => onApprove(c._id)} disabled={acting === c._id}>
                    {acting === c._id ? "Approving..." : "Approve"}
                  </ProButton>
                  <ProButton
                    variant="danger"
                    onClick={() => onDecline(c._id)}
                    disabled={acting === c._id || c.canDecline === false}
                  >
                    Reject
                  </ProButton>
                </div>
              )}
            </div>
          ))}
        </div>
        {onOpenModal && (
          <ProButton variant="secondary" onClick={onOpenModal} className="mt-4">
            View Details
          </ProButton>
        )}
      </div>
    </div>
  );
}

export function MatrixProgressCard({
  matrixChildren,
  matrixProgress,
}: {
  matrixChildren: MemberDashboardData["children"];
  matrixProgress: MemberDashboardData["matrixProgress"];
}) {
  const pct = (matrixProgress.slotsFilled / matrixProgress.slotsTotal) * 100;

  return (
    <ProCard accent="blue" title="Matrix Progress" description="Your downline positions" icon={Network}>
      <div className="space-y-5">
        <div>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-slate-500">Positions filled</span>
            <span className="font-semibold text-slate-900">
              {matrixProgress.slotsFilled} of {matrixProgress.slotsTotal}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="space-y-0 divide-y divide-slate-100 rounded-lg border border-slate-200">
          {(["left", "right"] as const).map((side) => {
            const child = matrixChildren[side];
            return (
              <div key={side} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${child ? "bg-blue-500" : "bg-slate-300"}`} />
                  <span className="text-sm capitalize text-slate-600">{side} position</span>
                </div>
                <span className={`text-sm font-medium ${child ? "text-slate-900" : "text-slate-400"}`}>
                  {child
                    ? `${child.fullName}${child.hasPaidContribution ? "" : " (unpaid)"}`
                    : "Open"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </ProCard>
  );
}

export function YourPaymentCard({
  contributions,
}: {
  contributions: MemberDashboardData["contributions"];
}) {
  return (
    <ProCard accent="emerald" title="Your Payment" description="Outgoing contributions" icon={ArrowUpRight}>
      {contributions.outgoing.length === 0 ? (
        <ProEmptyState message="No outgoing payments yet." />
      ) : (
        <ProList>
          {contributions.outgoing.map((c) => (
            <ProListItem key={c._id}>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <CreditCard className="h-4 w-4" strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate-600">To {c.toMemberId.fullName}</p>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="font-semibold text-slate-900">{formatNaira(c.amount)}</span>
                  <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium ${contributionStatusBadgeClass(c.status)}`}>
                    {formatContributionStatusLabel(c.status)}
                  </span>
                </div>
              </div>
            </ProListItem>
          ))}
        </ProList>
      )}
    </ProCard>
  );
}

export function IncomingContributionsCard({
  contributions,
  onApprove,
  onDecline,
  acting,
}: {
  contributions: MemberDashboardData["contributions"];
  onApprove?: (id: string) => void;
  onDecline?: (id: string) => void;
  acting?: string | null;
}) {
  return (
    <ProCard accent="amber" title="Incoming Contributions" description="Payments from your downlines" icon={Users}>
      {contributions.incoming.length === 0 ? (
        <ProEmptyState message="No incoming contributions yet." />
      ) : (
        <div className="space-y-3">
          {contributions.incoming.map((c) => (
            <div key={c._id} className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                  <User className="h-4 w-4" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900">{c.fromMemberId.fullName}</p>
                  {c.fromMemberId.phone && (
                    <p className="text-xs text-slate-500">{c.fromMemberId.phone}</p>
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{formatNaira(c.amount)}</span>
                    <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium ${contributionStatusBadgeClass(c.status)}`}>
                      {formatContributionStatusLabel(c.status)}
                    </span>
                  </div>
                </div>
              </div>
              {c.status === "awaiting_confirmation" && onApprove && onDecline && (
                <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
                  <ProButton onClick={() => onApprove(c._id)} disabled={acting === c._id}>
                    {acting === c._id ? "..." : "Approve"}
                  </ProButton>
                  <ProButton
                    variant="danger"
                    onClick={() => onDecline(c._id)}
                    disabled={acting === c._id || c.canDecline === false}
                  >
                    Reject
                  </ProButton>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </ProCard>
  );
}

type ActivityItem = {
  id: string;
  label: string;
  date: Date;
  type: "payment_in" | "payment_out" | "cycle";
};

function buildActivityItems(data: MemberDashboardData): ActivityItem[] {
  const items: ActivityItem[] = [];

  for (const c of data.contributions.incoming) {
    if (c.status === "confirmed" && c.confirmedAt) {
      items.push({
        id: `in-${c._id}`,
        label: `Payment received from ${c.fromMemberId.fullName}`,
        date: new Date(c.confirmedAt),
        type: "payment_in",
      });
    }
  }

  for (const c of data.contributions.outgoing) {
    if (c.status === "confirmed" && c.confirmedAt) {
      items.push({
        id: `out-${c._id}`,
        label: `Payment sent to ${c.toMemberId.fullName}`,
        date: new Date(c.confirmedAt),
        type: "payment_out",
      });
    }
  }

  if (data.member.payoutReceived && data.member.payoutAmount > 0) {
    items.push({
      id: "cycle",
      label: "Cycle completed",
      date: new Date(),
      type: "cycle",
    });
  }

  return items.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);
}

const activityConfig = {
  payment_in: { icon: ArrowDownLeft, accent: "emerald" as const },
  payment_out: { icon: ArrowUpRight, accent: "blue" as const },
  cycle: { icon: Star, accent: "violet" as const },
};

export function RecentActivityCard({ data }: { data: MemberDashboardData }) {
  const activities = buildActivityItems(data);

  return (
    <ProCard accent="slate" title="Recent Activity" description="Latest account events" icon={Clock}>
      {activities.length === 0 ? (
        <ProEmptyState message="No activity yet." />
      ) : (
        <div className="space-y-0">
          {activities.map((item, i) => {
            const config = activityConfig[item.type];
            const Icon = config.icon;
            const styles = accentStyles[config.accent];

            return (
              <div key={item.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${styles.iconMuted}`}>
                    <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                  </div>
                  {i < activities.length - 1 && (
                    <div className="my-1.5 w-px flex-1 bg-slate-200" />
                  )}
                </div>
                <div className="min-w-0 flex-1 pb-5">
                  <p className="text-sm font-medium text-slate-900">{item.label}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {formatDisplayDateTime(item.date)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ProCard>
  );
}
