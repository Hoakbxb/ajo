"use client";

import Link from "next/link";
import { ArrowLeft, User, Wallet } from "lucide-react";
import { formatNaira } from "@/components/StatCard";
import { formatDisplayDateTime } from "@/lib/format-date";
import { PaymentProofImage } from "@/components/PaymentProofImage";
import {
  contributionStatusBadgeClass,
  formatContributionStatusLabel,
} from "@/lib/payment-status";
import type { AdminContributionListItem } from "@/types/admin";
import { getContributionId } from "@/lib/contribution-id";
import {
  ProBadge,
  ProCard,
  ProDataCell,
  ProDataGrid,
} from "@/app/(app)/dashboard/components/dashboard-ui";
import AdminContributionActions from "./AdminContributionActions";
import AdminReassignPayeeForm, {
  type PayeeCandidate,
} from "../../components/AdminReassignPayeeForm";
import { useState } from "react";

export default function AdminContributionDetail({
  contribution,
  payeeCandidates,
}: {
  contribution: AdminContributionListItem;
  payeeCandidates: PayeeCandidate[];
}) {
  const [message, setMessage] = useState("");
  const contributionId = getContributionId(contribution);

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200/80 pb-6">
        <Link
          href="/admin/contributions"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to contributions
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">
          Payment record
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {contribution.fromMemberId.fullName} →{" "}
          {contribution.toMemberId.fullName}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span
            className={`rounded-md px-2 py-0.5 text-xs font-medium ${contributionStatusBadgeClass(contribution.status)}`}
          >
            {formatContributionStatusLabel(contribution.status)}
          </span>
          <ProBadge accent="amber">Cycle {contribution.cycleNumber ?? 1}</ProBadge>
          <span className="text-sm font-semibold text-slate-900">
            {formatNaira(contribution.amount)}
          </span>
        </div>
      </header>

      {message && (
        <div className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
          {message}
        </div>
      )}

      {contribution.paymentProofUrl && (
        <ProCard
          accent="emerald"
          title="Payment screenshot"
          description={
            contribution.paymentProofUploadedAt
              ? `Uploaded ${formatDisplayDateTime(contribution.paymentProofUploadedAt)}`
              : "Uploaded by payer"
          }
          icon={Wallet}
        >
          <PaymentProofImage url={contribution.paymentProofUrl} />
        </ProCard>
      )}

      <ProCard
        accent="amber"
        title="Admin actions"
        description="Confirm, decline, adjust amount, or cancel"
        icon={Wallet}
      >
        <AdminContributionActions
          contribution={contribution}
          onMessage={setMessage}
        />
      </ProCard>

      {contribution.status !== "confirmed" && (
        <ProCard
          accent="indigo"
          title="Change payee"
          description="Reassign this payment to a different recipient"
          icon={Wallet}
        >
          <AdminReassignPayeeForm
            mode="contribution"
            contributionId={contributionId}
            payerMemberId={contribution.fromMemberId._id}
            currentPayeeName={contribution.toMemberId.fullName}
            currentPayeeMemberId={contribution.toMemberId.memberId}
            candidates={payeeCandidates}
            onSuccess={setMessage}
          />
        </ProCard>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <ProCard
          accent="blue"
          title="Payer"
          description={contribution.fromMemberId.memberId}
          icon={User}
        >
          <ProDataGrid>
            <ProDataCell
              label="Name"
              value={contribution.fromMemberId.fullName}
            />
            {contribution.fromMemberId.phone && (
              <ProDataCell
                label="Phone"
                value={contribution.fromMemberId.phone}
              />
            )}
            {contribution.fromMemberId.bankName && (
              <ProDataCell
                label="Bank"
                value={`${contribution.fromMemberId.bankName} · ${contribution.fromMemberId.accountNumber ?? ""}`}
                className="sm:col-span-2"
              />
            )}
          </ProDataGrid>
          <Link
            href={`/admin/members/${contribution.fromMemberId._id}`}
            className="mt-4 inline-flex text-sm font-medium text-amber-700 hover:text-amber-900"
          >
            View payer profile →
          </Link>
        </ProCard>

        <ProCard
          accent="indigo"
          title="Recipient"
          description={contribution.toMemberId.memberId}
          icon={User}
        >
          <ProDataGrid>
            <ProDataCell
              label="Name"
              value={contribution.toMemberId.fullName}
            />
          </ProDataGrid>
          <Link
            href={`/admin/members/${contribution.toMemberId._id}`}
            className="mt-4 inline-flex text-sm font-medium text-amber-700 hover:text-amber-900"
          >
            View recipient profile →
          </Link>
        </ProCard>
      </div>

      <ProCard
        accent="slate"
        title="Timeline"
        description="Contribution lifecycle"
        icon={Wallet}
      >
        <ProDataGrid>
          <ProDataCell
            label="Created"
            value={formatDisplayDateTime(contribution.createdAt)}
          />
          <ProDataCell
            label="Claimed"
            value={
              contribution.claimedAt
                ? formatDisplayDateTime(contribution.claimedAt)
                : "—"
            }
          />
          <ProDataCell
            label="Confirmed"
            value={
              contribution.confirmedAt
                ? formatDisplayDateTime(contribution.confirmedAt)
                : "—"
            }
          />
          <ProDataCell
            label="Declined"
            value={
              contribution.declinedAt
                ? formatDisplayDateTime(contribution.declinedAt)
                : "—"
            }
          />
        </ProDataGrid>
      </ProCard>
    </div>
  );
}
