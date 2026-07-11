"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import type { AdminEscalationItem } from "@/types/admin";
import {
  ProBadge,
  ProCard,
  ProEmptyState,
} from "@/app/(app)/dashboard/components/dashboard-ui";
import {
  AdminBulkBar,
  AdminExportButton,
  AdminPageHeader,
  AdminRefreshButton,
  AdminSelectAllCheckbox,
  AdminSortSelect,
} from "../../components/AdminAdvanced";
import { formatDisplayDateTime } from "@/lib/format-date";
import { compareValues, downloadCsv } from "@/lib/admin-table";
import { useAdminRealtime } from "@/hooks/useAdminRealtime";

export default function AdminEscalationsContent({
  members,
}: {
  members: AdminEscalationItem[];
}) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<"rejections" | "joined" | "name">("rejections");
  const [message, setMessage] = useState("");

  const refresh = useCallback(() => router.refresh(), [router]);
  useAdminRealtime(refresh);

  const sorted = useMemo(() => {
    const list = [...members];
    list.sort((a, b) => {
      switch (sortKey) {
        case "name":
          return compareValues(a.fullName, b.fullName);
        case "joined":
          return compareValues(
            new Date(a.joinedAt).getTime(),
            new Date(b.joinedAt).getTime()
          );
        case "rejections":
        default:
          return compareValues(
            a.paymentRejectionCount,
            b.paymentRejectionCount
          );
      }
    });
    return list;
  }, [members, sortKey]);

  const allSelected =
    sorted.length > 0 && sorted.every((m) => selected.has(m.id));

  async function clearEscalation(memberId: string) {
    setLoadingId(memberId);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requiresAdminContactClear: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage("Escalation cleared.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action failed");
    } finally {
      setLoadingId(null);
    }
  }

  async function toggleSuspend(member: AdminEscalationItem) {
    setLoadingId(member.id);
    setMessage("");
    try {
      const endpoint = member.isSuspended
        ? `/api/admin/members/${member.id}/unsuspend`
        : `/api/admin/members/${member.id}/suspend`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: member.isSuspended
          ? undefined
          : { "Content-Type": "application/json" },
        body: member.isSuspended
          ? undefined
          : JSON.stringify({ reason: "Suspended from escalations queue" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage(
        member.isSuspended
          ? `${member.fullName} unsuspended.`
          : `${member.fullName} suspended.`
      );
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action failed");
    } finally {
      setLoadingId(null);
    }
  }

  async function bulkClear() {
    const memberIds = [...selected];
    if (memberIds.length === 0) return;
    setBulkLoading(true);
    try {
      const res = await fetch("/api/admin/bulk/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear_escalation", memberIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage(data.message);
      setSelected(new Set());
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Bulk action failed");
    } finally {
      setBulkLoading(false);
    }
  }

  function exportEscalations() {
    downloadCsv(
      `escalations-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        { key: "memberId", label: "Member ID" },
        { key: "fullName", label: "Name" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone" },
        { key: "status", label: "Status" },
        { key: "paymentRejectionCount", label: "Rejections" },
        { key: "joinedAt", label: "Joined" },
      ],
      sorted.map((m) => ({ ...m }))
    );
  }

  const totalRejections = useMemo(
    () => members.reduce((sum, m) => sum + m.paymentRejectionCount, 0),
    [members]
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Escalations"
        description={`${members.length} open case${members.length === 1 ? "" : "s"} · ${totalRejections} total rejection${totalRejections === 1 ? "" : "s"}`}
        actions={
          <>
            <AdminRefreshButton />
            <AdminExportButton onExport={exportEscalations} />
          </>
        }
      />

      {message && (
        <div className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
          {message}
        </div>
      )}

      <AdminBulkBar selectedCount={selected.size} onClear={() => setSelected(new Set())}>
        <button
          type="button"
          disabled={bulkLoading}
          onClick={bulkClear}
          className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
        >
          Bulk clear escalations
        </button>
      </AdminBulkBar>

      <ProCard
        accent="rose"
        title="Requires Admin Contact"
        description={`${members.length} member${members.length === 1 ? "" : "s"} flagged`}
        icon={AlertTriangle}
        action={
          <AdminSortSelect
            value={sortKey}
            onChange={(v) => setSortKey(v as typeof sortKey)}
            options={[
              { value: "rejections", label: "Sort: Rejections" },
              { value: "joined", label: "Sort: Joined" },
              { value: "name", label: "Sort: Name" },
            ]}
          />
        }
      >
        {sorted.length > 0 && (
          <div className="mb-4">
            <AdminSelectAllCheckbox
              checked={allSelected}
              onChange={(checked) => {
                setSelected(checked ? new Set(sorted.map((m) => m.id)) : new Set());
              }}
              label="Select all escalations"
            />
          </div>
        )}

        {sorted.length === 0 ? (
          <ProEmptyState message="No escalations at this time." />
        ) : (
          <div className="space-y-3">
            {sorted.map((member) => (
              <div
                key={member.id}
                className="rounded-xl border border-rose-100 bg-rose-50/40 px-4 py-4"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex gap-3">
                    <input
                      type="checkbox"
                      checked={selected.has(member.id)}
                      onChange={() => {
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (next.has(member.id)) next.delete(member.id);
                          else next.add(member.id);
                          return next;
                        });
                      }}
                      className="mt-1 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <Link
                        href={`/admin/members/${member.id}`}
                        className="text-sm font-semibold text-slate-900 hover:text-amber-700"
                      >
                        {member.fullName}
                      </Link>
                      <p className="text-xs text-slate-500">{member.memberId}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                        <span>{member.phone}</span>
                        <span>·</span>
                        <span>{member.email}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <ProBadge accent={member.status === "active" ? "emerald" : "amber"}>
                          {member.status}
                        </ProBadge>
                        <ProBadge accent="rose">
                          {member.paymentRejectionCount} rejection
                          {member.paymentRejectionCount === 1 ? "" : "s"}
                        </ProBadge>
                        {member.isSuspended && (
                          <ProBadge accent="rose">suspended</ProBadge>
                        )}
                      </div>
                      <p className="mt-2 text-xs text-slate-400">
                        Joined {formatDisplayDateTime(member.joinedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/admin/members/${member.id}`}
                      className="inline-flex rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800"
                    >
                      Manage member
                    </Link>
                    <button
                      type="button"
                      disabled={loadingId === member.id}
                      onClick={() => clearEscalation(member.id)}
                      className="inline-flex rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                    >
                      {loadingId === member.id ? "..." : "Clear escalation"}
                    </button>
                    <button
                      type="button"
                      disabled={loadingId === member.id}
                      onClick={() => toggleSuspend(member)}
                      className="inline-flex rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      {member.isSuspended ? "Unsuspend" : "Suspend"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ProCard>
    </div>
  );
}
