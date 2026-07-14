"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, GitBranch, ShieldCheck, User, UserX } from "lucide-react";
import { formatNaira } from "@/components/StatCard";
import { formatDisplayDateTime } from "@/lib/format-date";
import {
  contributionStatusBadgeClass,
  formatContributionStatusLabel,
} from "@/lib/payment-status";
import { getContributionId } from "@/lib/contribution-id";
import AdminMemberEditForm from "./AdminMemberEditForm";
import AdminReassignPayeeForm, {
  type PayeeCandidate,
} from "../../components/AdminReassignPayeeForm";
import {
  ProBadge,
  ProButton,
  ProCard,
} from "@/app/(app)/dashboard/components/dashboard-ui";

interface AdminMemberDetailProps {
  member: {
    id: string;
    memberId: string;
    fullName: string;
    email: string;
    phone: string;
    status: string;
    role: string;
    bankName: string;
    bankCode: string;
    accountNumber: string;
    accountName: string;
    position: string;
    matrixLevel: number;
    hasPaidContribution: boolean;
    payoutAmount: number;
    cyclesCompleted: number;
    paymentRejectionCount: number;
    requiresAdminContact: boolean;
    isSuspended?: boolean;
    suspendedReason?: string | null;
    joinedAt: string;
    parentId?: { memberId: string; fullName: string } | null;
  };
  outgoing: Array<{
    _id: string;
    amount: number;
    status: string;
    cycleNumber?: number;
    createdAt: string;
    toMemberId: { _id: string; fullName: string; memberId: string };
    fromMemberId?: { fullName: string; memberId: string };
  }>;
  incoming: Array<{
    _id: string;
    amount: number;
    status: string;
    cycleNumber?: number;
    createdAt: string;
    fromMemberId: { fullName: string; memberId: string };
    toMemberId?: { fullName: string; memberId: string };
  }>;
  allMembers: Array<{
    id: string;
    memberId: string;
    fullName: string;
    status: string;
  }>;
  payeeCandidates: PayeeCandidate[];
}

export default function AdminMemberDetail({
  member,
  outgoing,
  incoming,
  allMembers,
  payeeCandidates,
}: AdminMemberDetailProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [parentId, setParentId] = useState("");
  const [position, setPosition] = useState<"left" | "right" | "">("");
  const [suspendReason, setSuspendReason] = useState("Suspended by administrator");

  const activeOutgoing = outgoing.find(
    (c) => c.status === "pending" || c.status === "awaiting_confirmation"
  );
  const canReassignPayee =
    member.role !== "admin" &&
    !member.hasPaidContribution &&
    member.status !== "active";

  async function clearEscalation() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requiresAdminContactClear: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage("Escalation cleared successfully.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Update failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleSuspend() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/members/${member.id}/suspend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: suspendReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage("Member suspended.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Suspend failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleUnsuspend() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/members/${member.id}/unsuspend`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage("Member unsuspended.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unsuspend failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (
      !window.confirm(
        `Permanently delete ${member.fullName} (${member.memberId})?\n\nThis removes their login, matrix placement, and payment history. This cannot be undone.`
      )
    ) {
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/members/${member.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push("/admin/members");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Delete failed");
      setLoading(false);
    }
  }

  async function handleManualMatch() {
    if (!parentId) {
      setMessage("Select a parent member to match.");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/members/${member.id}/match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentId,
          ...(position ? { position } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage("Member manually matched for payment.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Match failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleRoleChange(role: "member" | "admin") {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage(`Role updated to ${role}.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Role update failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(status: "pending" | "active") {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage(`Status updated to ${status}.`);
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Status update failed"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDetach() {
    if (
      !window.confirm(
        "Detach this member from their upline and reset them to pending rematch?"
      )
    ) {
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "detach" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage("Member detached from matrix.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Detach failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200/80 pb-6">
        <Link
          href="/admin/members"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to members
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">
          {member.fullName}
        </h1>
        <p className="mt-1 text-sm text-slate-500">{member.memberId}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <ProBadge accent={member.status === "active" ? "emerald" : "amber"}>
            {member.status}
          </ProBadge>
          {member.role === "admin" && <ProBadge accent="violet">admin</ProBadge>}
          {member.requiresAdminContact && (
            <ProBadge accent="rose">requires admin contact</ProBadge>
          )}
          {member.isSuspended && <ProBadge accent="rose">suspended</ProBadge>}
        </div>
      </header>

      {message && (
        <div className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
          {message}
        </div>
      )}

      {member.role !== "admin" && canReassignPayee && (
        <ProCard
          accent="blue"
          title="Reassign payment / change payee"
          description={
            activeOutgoing || member.parentId
              ? "Move this member's payment obligation to a different recipient"
              : "Assign who this member should pay"
          }
          icon={GitBranch}
        >
          <AdminReassignPayeeForm
            mode="member"
            payerMemberId={member.id}
            currentPayeeName={
              activeOutgoing?.toMemberId.fullName ?? member.parentId?.fullName
            }
            currentPayeeMemberId={
              activeOutgoing?.toMemberId.memberId ?? member.parentId?.memberId
            }
            candidates={payeeCandidates}
            onSuccess={setMessage}
          />
        </ProCard>
      )}

      {member.role !== "admin" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <ProCard
            accent="amber"
            title="Manual Matrix Match"
            description="Assign this member to pay a specific upline"
            icon={GitBranch}
          >
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500">
                  Parent member
                </label>
                <select
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-amber-500"
                >
                  <option value="">Select upline...</option>
                  {allMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.fullName} ({m.memberId}) — {m.status}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500">
                  Position (optional)
                </label>
                <select
                  value={position}
                  onChange={(e) =>
                    setPosition(e.target.value as "left" | "right" | "")
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-amber-500"
                >
                  <option value="">Auto (first open slot)</option>
                  <option value="left">Left</option>
                  <option value="right">Right</option>
                </select>
              </div>
              <div className="flex flex-wrap gap-2">
                <ProButton onClick={handleManualMatch} disabled={loading}>
                  Match for payment
                </ProButton>
                {member.parentId && (
                  <ProButton
                    variant="secondary"
                    onClick={handleDetach}
                    disabled={loading}
                  >
                    Detach from upline
                  </ProButton>
                )}
              </div>
            </div>
          </ProCard>

          <ProCard
            accent={member.isSuspended ? "emerald" : "rose"}
            title="Account Status"
            description={
              member.isSuspended
                ? member.suspendedReason ?? "Suspended"
                : "Suspend member access"
            }
            icon={UserX}
          >
            {member.isSuspended ? (
              <ProButton onClick={handleUnsuspend} disabled={loading}>
                Unsuspend member
              </ProButton>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-rose-500"
                  placeholder="Suspension reason"
                />
                <ProButton onClick={handleSuspend} disabled={loading}>
                  Suspend member
                </ProButton>
              </div>
            )}
          </ProCard>
        </div>
      )}

      {member.role !== "admin" && (
        <ProCard
          accent="rose"
          title="Delete Account"
          description="Permanently remove this member and their login"
          icon={UserX}
        >
          <p className="mb-4 text-sm text-slate-600">
            Deletes the member record, Supabase login, matrix placement, and
            linked payment history. Pending payers matched to this member will
            be reassigned automatically.
          </p>
          <ProButton variant="danger" onClick={handleDelete} disabled={loading}>
            Delete account permanently
          </ProButton>
        </ProCard>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <ProCard
          accent="violet"
          title="Role & Status"
          description="Platform access and membership state"
          icon={ShieldCheck}
        >
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-slate-500">Role</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {member.role === "admin" ? (
                  <ProButton
                    variant="secondary"
                    onClick={() => handleRoleChange("member")}
                    disabled={loading}
                  >
                    Demote to member
                  </ProButton>
                ) : (
                  <ProButton
                    onClick={() => handleRoleChange("admin")}
                    disabled={loading}
                  >
                    Promote to admin
                  </ProButton>
                )}
              </div>
            </div>
            {member.role !== "admin" && (
              <div>
                <p className="text-xs font-medium text-slate-500">
                  Membership status
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {member.status !== "active" && (
                    <ProButton
                      onClick={() => handleStatusChange("active")}
                      disabled={loading}
                    >
                      Mark active
                    </ProButton>
                  )}
                  {member.status !== "pending" && (
                    <ProButton
                      variant="secondary"
                      onClick={() => handleStatusChange("pending")}
                      disabled={loading}
                    >
                      Mark pending
                    </ProButton>
                  )}
                </div>
              </div>
            )}
          </div>
        </ProCard>

        <ProCard
          accent="slate"
          title="Edit Profile"
          description="Update contact and bank details"
          icon={User}
        >
          <AdminMemberEditForm
            memberId={member.id}
            initial={{
              fullName: member.fullName,
              email: member.email,
              phone: member.phone,
              bankCode: member.bankCode,
              accountNumber: member.accountNumber,
              accountName: member.accountName,
            }}
          />
        </ProCard>
      </div>

      {member.requiresAdminContact && (
        <ProCard accent="rose" title="Escalation" description="This member needs assistance" icon={ShieldCheck}>
          <p className="text-sm text-slate-600">
            Payment rejections: {member.paymentRejectionCount}
          </p>
          {message && <p className="mt-2 text-sm text-emerald-700">{message}</p>}
          <div className="mt-4">
            <ProButton
              onClick={clearEscalation}
              disabled={loading}
            >
              {loading ? "Clearing..." : "Clear escalation"}
            </ProButton>
          </div>
        </ProCard>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <ProCard accent="indigo" title="Matrix" description="Position and progress" icon={User}>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-slate-400">Upline</dt>
              <dd className="font-medium text-slate-900">
                {member.parentId?.fullName ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-400">Position / Level</dt>
              <dd className="font-medium capitalize text-slate-900">
                {member.position} · level {member.matrixLevel}
              </dd>
            </div>
            <div>
              <dt className="text-slate-400">Cycles completed</dt>
              <dd className="font-medium text-slate-900">{member.cyclesCompleted}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Total rewards</dt>
              <dd className="font-medium text-slate-900">
                {formatNaira(member.payoutAmount)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-400">Joined</dt>
              <dd className="font-medium text-slate-900">
                {formatDisplayDateTime(member.joinedAt)}
              </dd>
            </div>
          </dl>
        </ProCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ContributionList title="Outgoing payments" items={outgoing} direction="to" />
        <ContributionList title="Incoming payments" items={incoming} direction="from" />
      </div>
    </div>
  );
}

type ContributionListItem = {
  _id?: string;
  id?: string;
  amount: number;
  status: string;
  cycleNumber?: number;
  createdAt: string;
  toMemberId?: { fullName: string; memberId: string };
  fromMemberId?: { fullName: string; memberId: string };
};

function ContributionList({
  title,
  items,
  direction,
}: {
  title: string;
  items: ContributionListItem[];
  direction: "to" | "from";
}) {
  return (
    <ProCard accent="blue" title={title} description={`${items.length} records`} icon={User}>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">No contributions yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const counterparty =
              direction === "to"
                ? item.toMemberId
                : item.fromMemberId;
            const contributionId = getContributionId(item);
            if (!counterparty) return null;
            return (
              <div
                key={contributionId}
                className="rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {counterparty.fullName}
                    </p>
                    <p className="text-xs text-slate-500">
                      Cycle {item.cycleNumber ?? 1} · {formatDisplayDateTime(item.createdAt)}
                    </p>
                  </div>
                  <Link
                    href={`/admin/contributions/${contributionId}`}
                    className="text-sm font-semibold text-slate-900 hover:text-amber-700"
                  >
                    {formatNaira(item.amount)}
                  </Link>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${contributionStatusBadgeClass(item.status)}`}
                  >
                    {formatContributionStatusLabel(item.status)}
                  </span>
                  <Link
                    href={`/admin/contributions/${contributionId}`}
                    className="text-xs font-medium text-amber-700 hover:text-amber-900"
                  >
                    Manage payment →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ProCard>
  );
}
