"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { Search, Users, Wallet } from "lucide-react";
import type {
  AdminMatchingMetrics,
  AdminMemberListItem,
  MemberMatchPaymentStatus,
} from "@/types/admin";
import {
  ProBadge,
  ProCard,
  ProEmptyState,
  ProStatCard,
} from "@/app/(app)/dashboard/components/dashboard-ui";
import {
  AdminBulkBar,
  AdminDateRangeFilter,
  AdminExportButton,
  AdminPageHeader,
  AdminPageSizeSelect,
  AdminPagination,
  AdminRefreshButton,
  AdminSelectAllCheckbox,
  AdminSortSelect,
} from "../../components/AdminAdvanced";
import { formatDisplayDateTime } from "@/lib/format-date";
import {
  compareValues,
  downloadCsv,
  inDateRange,
  paginate,
} from "@/lib/admin-table";
import { useAdminRealtime } from "@/hooks/useAdminRealtime";

type FilterKey =
  | "all"
  | "pending"
  | "active"
  | "suspended"
  | "escalated"
  | "admin"
  | "awaiting_merge"
  | "needs_payment"
  | "awaiting_confirmation";

type SortKey = "name" | "joined" | "cycles" | "status";

const matchStatusLabels: Record<MemberMatchPaymentStatus, string> = {
  active: "Active",
  awaiting_merge: "Awaiting merge",
  needs_payment: "Needs payment",
  awaiting_confirmation: "Awaiting confirm",
  suspended: "Suspended",
  admin: "Admin",
  other: "Other",
};

const matchStatusAccent: Record<
  MemberMatchPaymentStatus,
  "emerald" | "amber" | "orange" | "blue" | "rose" | "violet" | "slate"
> = {
  active: "emerald",
  awaiting_merge: "orange",
  needs_payment: "amber",
  awaiting_confirmation: "blue",
  suspended: "rose",
  admin: "violet",
  other: "slate",
};

export default function AdminMembersContent({
  members,
  matching,
  initialFilter,
}: {
  members: AdminMemberListItem[];
  matching: AdminMatchingMetrics;
  initialFilter?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>(() => {
    const allowed: FilterKey[] = [
      "all",
      "pending",
      "active",
      "suspended",
      "escalated",
      "admin",
      "awaiting_merge",
      "needs_payment",
      "awaiting_confirmation",
    ];
    return allowed.includes(initialFilter as FilterKey)
      ? (initialFilter as FilterKey)
      : "all";
  });
  const [sortKey, setSortKey] = useState<SortKey>("joined");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rowLoading, setRowLoading] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [message, setMessage] = useState("");

  const refresh = useCallback(() => router.refresh(), [router]);
  useAdminRealtime(refresh);

  const filtered = useMemo(() => {
    const list = members.filter((member) => {
      const matchesQuery =
        !query ||
        member.fullName.toLowerCase().includes(query.toLowerCase()) ||
        member.memberId.toLowerCase().includes(query.toLowerCase()) ||
        member.email.toLowerCase().includes(query.toLowerCase()) ||
        member.phone.includes(query);

      const matchesFilter =
        filter === "all" ||
        (filter === "pending" && member.status === "pending") ||
        (filter === "active" && member.status === "active") ||
        (filter === "suspended" && member.isSuspended) ||
        (filter === "escalated" && member.requiresAdminContact) ||
        (filter === "admin" && member.role === "admin") ||
        (filter === "awaiting_merge" &&
          member.matchPaymentStatus === "awaiting_merge") ||
        (filter === "needs_payment" &&
          member.matchPaymentStatus === "needs_payment") ||
        (filter === "awaiting_confirmation" &&
          member.matchPaymentStatus === "awaiting_confirmation");

      const matchesDate = inDateRange(member.joinedAt, dateFrom || null, dateTo || null);

      return matchesQuery && matchesFilter && matchesDate;
    });

    list.sort((a, b) => {
      switch (sortKey) {
        case "name":
          return compareValues(a.fullName, b.fullName);
        case "cycles":
          return compareValues(a.cyclesCompleted, b.cyclesCompleted);
        case "status":
          return compareValues(a.status, b.status);
        case "joined":
        default:
          return compareValues(
            new Date(a.joinedAt).getTime(),
            new Date(b.joinedAt).getTime()
          );
      }
    });

    return list;
  }, [members, query, filter, sortKey, dateFrom, dateTo]);

  const paged = useMemo(
    () => paginate(filtered, page, pageSize),
    [filtered, page, pageSize]
  );

  const pageIds = paged.items.map((m) => m.id);
  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const somePageSelected =
    pageIds.some((id) => selected.has(id)) && !allPageSelected;

  function toggleSelectAll(checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of pageIds) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function runBulk(
    action: "suspend" | "unsuspend" | "clear_escalation" | "delete"
  ) {
    const memberIds = [...selected].filter((id) => {
      const member = members.find((m) => m.id === id);
      return member && member.role !== "admin";
    });
    if (memberIds.length === 0) {
      setMessage("No eligible members selected.");
      return;
    }
    if (action === "delete") {
      const names = memberIds
        .map((id) => members.find((m) => m.id === id)?.fullName)
        .filter(Boolean)
        .join(", ");
      if (
        !window.confirm(
          `Permanently delete ${memberIds.length} member account(s)?\n\n${names}\n\nThis removes their login, matrix placement, and payment records.`
        )
      ) {
        return;
      }
    }
    setBulkLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/bulk/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, memberIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (action === "delete" && data.results?.failed?.length) {
        setMessage(
          `${data.message}. Failed: ${data.results.failed
            .map((f: { id: string; error: string }) => f.error)
            .join("; ")}`
        );
      } else {
        setMessage(data.message);
      }
      setSelected(new Set());
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Bulk action failed");
    } finally {
      setBulkLoading(false);
    }
  }

  async function toggleSuspend(member: AdminMemberListItem) {
    setRowLoading(member.id);
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
          : JSON.stringify({ reason: "Suspended from member directory" }),
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
      setRowLoading(null);
    }
  }

  function exportMembers() {
    downloadCsv(
      `members-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        { key: "memberId", label: "Member ID" },
        { key: "fullName", label: "Name" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone" },
        { key: "password", label: "Password" },
        { key: "status", label: "Status" },
        { key: "role", label: "Role" },
        { key: "cyclesCompleted", label: "Cycles" },
        { key: "joinedAt", label: "Joined" },
      ],
      filtered.map((m) => ({ ...m }))
    );
  }

  const filters: { key: FilterKey; label: string }[] = [
    { key: "all", label: "All" },
    { key: "awaiting_merge", label: `Awaiting merge (${matching.awaitingMerge})` },
    { key: "needs_payment", label: `Need payment (${matching.needsPayment})` },
    {
      key: "awaiting_confirmation",
      label: `Awaiting confirm (${matching.awaitingConfirmation})`,
    },
    { key: "pending", label: "Pending" },
    { key: "active", label: "Active" },
    { key: "suspended", label: "Suspended" },
    { key: "escalated", label: "Escalated" },
    { key: "admin", label: "Admins" },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Members"
        description={`${members.length} registered members`}
        actions={
          <>
            <AdminRefreshButton />
            <AdminExportButton onExport={exportMembers} />
          </>
        }
      />

      {message && (
        <div className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
          {message}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <ProStatCard
          accent="orange"
          label="Awaiting merge"
          value={String(matching.awaitingMerge)}
          sublabel="Need upline slot"
          icon={Users}
        />
        <ProStatCard
          accent="amber"
          label="Need to pay"
          value={String(matching.needsPayment)}
          sublabel="Matched — pay to activate"
          icon={Wallet}
        />
        <ProStatCard
          accent="blue"
          label="Awaiting confirm"
          value={String(matching.awaitingConfirmation)}
          sublabel="Payment submitted"
          icon={Wallet}
        />
        <ProStatCard
          accent="rose"
          label="Payment pipeline"
          value={String(matching.totalPaymentPipeline)}
          sublabel="Before activation"
          icon={Wallet}
        />
        <ProStatCard
          accent="emerald"
          label="Open slots"
          value={String(matching.openPaymentSlots)}
          sublabel={`${matching.activeBuildersWithOpenSlots} builders`}
          icon={Users}
        />
        <ProStatCard
          accent="slate"
          label="Queue vs slots"
          value={String(
            Math.max(0, matching.awaitingMerge - matching.openPaymentSlots)
          )}
          sublabel="Extra payers needed"
          icon={Users}
        />
      </div>

      <AdminBulkBar
        selectedCount={selected.size}
        onClear={() => setSelected(new Set())}
      >
        <button
          type="button"
          disabled={bulkLoading}
          onClick={() => runBulk("suspend")}
          className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-50"
        >
          Bulk suspend
        </button>
        <button
          type="button"
          disabled={bulkLoading}
          onClick={() => runBulk("unsuspend")}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Bulk unsuspend
        </button>
        <button
          type="button"
          disabled={bulkLoading}
          onClick={() => runBulk("clear_escalation")}
          className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
        >
          Clear escalations
        </button>
        <button
          type="button"
          disabled={bulkLoading}
          onClick={() => runBulk("delete")}
          className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-800 hover:bg-rose-100 disabled:opacity-50"
        >
          Delete selected
        </button>
      </AdminBulkBar>

      <ProCard
        accent="slate"
        title="Member Directory"
        description={`${filtered.length} matching · page ${paged.page} of ${paged.totalPages}`}
        icon={Users}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <AdminSortSelect
              value={sortKey}
              onChange={(v) => {
                setSortKey(v as SortKey);
                setPage(1);
              }}
              options={[
                { value: "joined", label: "Sort: Joined" },
                { value: "name", label: "Sort: Name" },
                { value: "cycles", label: "Sort: Cycles" },
                { value: "status", label: "Sort: Status" },
              ]}
            />
            <AdminPageSizeSelect
              value={pageSize}
              onChange={(v) => {
                setPageSize(v);
                setPage(1);
              }}
            />
          </div>
        }
      >
        <div className="mb-4 space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name, ID, email, or phone"
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {filters.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setFilter(key);
                  setPage(1);
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  filter === key
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <AdminDateRangeFilter
            from={dateFrom}
            to={dateTo}
            onFromChange={(v) => {
              setDateFrom(v);
              setPage(1);
            }}
            onToChange={(v) => {
              setDateTo(v);
              setPage(1);
            }}
          />
        </div>

        {paged.items.length === 0 ? (
          <ProEmptyState message="No members match your filters." />
        ) : (
          <>
            <div className="mb-3">
              <AdminSelectAllCheckbox
                checked={allPageSelected}
                indeterminate={somePageSelected}
                onChange={toggleSelectAll}
                label="Select all on this page"
              />
            </div>
            <div className="-mx-5 overflow-x-auto sm:-mx-6">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-left text-[11px] font-medium uppercase tracking-wider text-slate-400">
                    <th className="w-10 px-4 py-3" />
                    <th className="px-4 py-3">Member</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Password</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Match / pay</th>
                    <th className="px-4 py-3">Cycles</th>
                    <th className="px-4 py-3">Joined</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.items.map((member) => (
                    <tr
                      key={member.id}
                      className="border-b border-slate-100 last:border-b-0"
                    >
                      <td className="px-4 py-3.5">
                        {member.role !== "admin" && (
                          <input
                            type="checkbox"
                            checked={selected.has(member.id)}
                            onChange={() => toggleSelect(member.id)}
                            className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                          />
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <Link
                          href={`/admin/members/${member.id}`}
                          className="text-sm font-medium text-slate-900 hover:text-amber-700"
                        >
                          {member.fullName}
                        </Link>
                        <p className="text-xs text-slate-500">{member.memberId}</p>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-600">
                        <p>{member.phone}</p>
                        <p className="text-xs text-slate-400">{member.email}</p>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-sm text-slate-600">
                        {member.password ?? (
                          <span className="font-sans text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1.5">
                          <ProBadge
                            accent={
                              member.status === "active" ? "emerald" : "amber"
                            }
                          >
                            {member.status}
                          </ProBadge>
                          {member.role === "admin" && (
                            <ProBadge accent="violet">admin</ProBadge>
                          )}
                          {member.requiresAdminContact && (
                            <ProBadge accent="rose">escalated</ProBadge>
                          )}
                          {member.isSuspended && (
                            <ProBadge accent="rose">suspended</ProBadge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        {member.matchPaymentStatus ? (
                          <ProBadge
                            accent={matchStatusAccent[member.matchPaymentStatus]}
                          >
                            {matchStatusLabels[member.matchPaymentStatus]}
                          </ProBadge>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-600">
                        {member.cyclesCompleted}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-500">
                        {formatDisplayDateTime(member.joinedAt)}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/admin/members/${member.id}`}
                            className="text-xs font-medium text-amber-700 hover:text-amber-900"
                          >
                            Manage
                          </Link>
                          {member.role !== "admin" && (
                            <button
                              type="button"
                              disabled={rowLoading === member.id}
                              onClick={() => toggleSuspend(member)}
                              className="text-xs font-medium text-slate-500 hover:text-slate-800 disabled:opacity-50"
                            >
                              {rowLoading === member.id
                                ? "..."
                                : member.isSuspended
                                  ? "Unsuspend"
                                  : "Suspend"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <AdminPagination
              page={paged.page}
              totalPages={paged.totalPages}
              total={paged.total}
              from={paged.from}
              to={paged.to}
              onPageChange={setPage}
            />
          </>
        )}
      </ProCard>
    </div>
  );
}
