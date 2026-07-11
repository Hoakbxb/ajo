"use client";

import { useState } from "react";
import {
  Building2,
  Calendar,
  CheckCircle2,
  Mail,
  Network,
  Pencil,
  Phone,
  Star,
  User,
} from "lucide-react";
import type { PaymentStatus } from "@/types";
import { formatNaira } from "@/components/StatCard";
import {
  formatMemberStatusLabel,
  isActiveStatus,
} from "@/lib/member-status";
import { formatPaymentStatusLabel } from "@/lib/payment-status";
import { formatDisplayDate } from "@/lib/format-date";
import {
  ProBadge,
  ProButton,
  ProCard,
  getInitials,
} from "../../dashboard/components/dashboard-ui";
import ProfileEditForm, { type ProfileFormData } from "./ProfileEditForm";

type ProfileMember = {
  memberId: string;
  fullName: string;
  email: string;
  phone: string;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  status: string;
  position: string;
  matrixLevel: number;
  hasPaidContribution: boolean;
  payoutReceived: boolean;
  payoutAmount: number;
  joinedAt: string;
  parentId?: { memberId: string; fullName: string } | null;
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-slate-100 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-900 sm:text-right">{value}</span>
    </div>
  );
}

export default function ProfileContent({
  member: initialMember,
  paymentStatus,
}: {
  member: ProfileMember;
  paymentStatus: PaymentStatus;
}) {
  const [member, setMember] = useState(initialMember);
  const [editing, setEditing] = useState(false);

  const initials = getInitials(member.fullName);
  const joinedDate = formatDisplayDate(member.joinedAt);

  const formData: ProfileFormData = {
    fullName: member.fullName,
    email: member.email,
    phone: member.phone,
    bankCode: member.bankCode,
    accountNumber: member.accountNumber,
    accountName: member.accountName,
  };

  function handleUpdateSuccess(updated: ProfileFormData & { bankName: string }) {
    setMember((current) => ({ ...current, ...updated }));
    setEditing(false);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-slate-200/80 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Account</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">
            Profile
          </h1>
          <p className="mt-1 text-sm text-slate-500">Your personal and account information</p>
        </div>
        {!editing && (
          <ProButton onClick={() => setEditing(true)} className="inline-flex items-center gap-2 self-start sm:self-auto">
            <Pencil className="h-4 w-4" strokeWidth={2} />
            Edit Profile
          </ProButton>
        )}
      </header>

      <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-2xl font-semibold text-white">
            {initials}
          </div>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <h2 className="text-xl font-semibold text-slate-900">{member.fullName}</h2>
            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
              <ProBadge accent={isActiveStatus(member.status) ? "emerald" : "amber"}>
                {isActiveStatus(member.status) && (
                  <CheckCircle2 className="mr-1 inline h-3 w-3" strokeWidth={2.5} />
                )}
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
      </div>

      {editing ? (
        <ProCard accent="indigo" title="Edit Profile" description="Update your account details" icon={User}>
          <ProfileEditForm
            initial={formData}
            onCancel={() => setEditing(false)}
            onSuccess={handleUpdateSuccess}
          />
        </ProCard>
      ) : (
        <>
          <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
            <ProCard accent="indigo" title="Personal Information" description="Contact details" icon={User}>
              <div className="space-y-1">
                <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-3">
                  <Mail className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={2} />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400">Email</p>
                    <p className="truncate text-sm font-medium text-slate-900">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-3">
                  <Phone className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={2} />
                  <div>
                    <p className="text-xs text-slate-400">Phone</p>
                    <p className="text-sm font-medium text-slate-900">{member.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-3">
                  <Calendar className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={2} />
                  <div>
                    <p className="text-xs text-slate-400">Joined</p>
                    <p className="text-sm font-medium text-slate-900">{joinedDate}</p>
                  </div>
                </div>
              </div>
            </ProCard>

            <ProCard accent="cyan" title="Bank Account" description="Payout destination" icon={Building2}>
              <div className="divide-y divide-slate-100">
                <InfoRow label="Bank" value={member.bankName || "—"} />
                <InfoRow label="Account Number" value={member.accountNumber || "—"} />
                <InfoRow label="Account Name" value={member.accountName || "—"} />
              </div>
            </ProCard>
          </div>

          <ProCard accent="blue" title="Matrix Information" description="Your position in the network" icon={Network}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs text-slate-400">Matrix Level</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{member.matrixLevel}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs text-slate-400">Position</p>
                <p className="mt-1 text-lg font-semibold capitalize text-slate-900">{member.position}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 sm:col-span-2">
                <p className="text-xs text-slate-400">Upline</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {member.parentId ? member.parentId.fullName : "—"}
                </p>
              </div>
            </div>
          </ProCard>

          <ProCard accent="violet" title="Account Summary" description="Payment and reward status" icon={Star}>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs text-slate-400">Contribution Paid</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {member.hasPaidContribution ? "Yes" : "No"}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs text-slate-400">Reward Received</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {member.payoutReceived ? "Yes" : "No"}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs text-slate-400">Total Reward</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {member.payoutAmount > 0 ? formatNaira(member.payoutAmount) : "—"}
                </p>
              </div>
            </div>
          </ProCard>
        </>
      )}
    </div>
  );
}
