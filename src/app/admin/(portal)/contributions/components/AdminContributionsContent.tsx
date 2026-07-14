"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { Search, Wallet } from "lucide-react";
import { formatNaira } from "@/components/StatCard";
import { formatDisplayDateTime } from "@/lib/format-date";
import {
  contributionStatusBadgeClass,
  formatContributionStatusLabel,
} from "@/lib/payment-status";
import type { AdminContributionListItem } from "@/types/admin";
import type { ContributionStatus } from "@/types/database";
import {
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
import {
  compareValues,
  downloadCsv,
  inDateRange,
  paginate,
} from "@/lib/admin-table";
import { useAdminRealtime } from "@/hooks/useAdminRealtime";
import { getContributionId } from "@/lib/contribution-id";
import AdminContributionActions from "./AdminContributionActions";

function CircleRemainingBadge({
  circle,
}: {
  circle: AdminContributionListItem["payeeCircle"];
}) {
  if (!circle) {
    return <span className="text-xs text-slate-400">—</span>;
  }

  if (circle.circleComplete) {
    return (
      <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
        Circle complete
      </span>
    );
  }

  const label =
    circle.remainingToComplete === 1
      ? "1 remaining"
      : `${circle.remainingToComplete} remaining`;

  return (
    <div className="space-y-1">
      <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
        {label}
      </span>
      <p className="text-[11px] text-slate-500">
        {circle.paidDownlines}/2 paid · {circle.slotsFilled}/2 slots
      </p>
    </div>
  );
}

type StatusFilter = "all" | ContributionStatus;
type SortKey = "date" | "amount" | "status" | "cycle";

export default function AdminContributionsContent({
  contributions,
}: {
  contributions: AdminContributionListItem[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [message, setMessage] = useState("");

  const refresh = useCallback(() => router.refresh(), [router]);
  useAdminRealtime(refresh);

  const stats = useMemo(() => {
    const pending = contributions.filter((c) => c.status === "pending").length;
    const awaiting = contributions.filter(
      (c) => c.status === "awaiting_confirmation"
    ).length;
    const confirmed = contributions.filter((c) => c.status === "confirmed").length;
    const declined = contributions.filter((c) => c.status === "declined").length;
    const totalValue = contributions
      .filter((c) => c.status === "confirmed")
      .reduce((sum, c) => sum + c.amount, 0);

    const payeeCircleMap = new Map<
      string,
      NonNullable<AdminContributionListItem["payeeCircle"]>
    >();
    for (const contribution of contributions) {
      if (!contribution.payeeCircle) continue;
      payeeCircleMap.set(contribution.toMemberId._id, contribution.payeeCircle);
    }
    const circleValues = [...payeeCircleMap.values()];
    const oneAway = circleValues.filter(
      (c) => c.remainingToComplete === 1 && !c.circleComplete
    ).length;
    const twoAway = circleValues.filter(
      (c) => c.remainingToComplete === 2 && !c.circleComplete
    ).length;
    const circleComplete = circleValues.filter((c) => c.circleComplete).length;

    return {
      pending,
      awaiting,
      confirmed,
      declined,
      totalValue,
      oneAway,
      twoAway,
      circleComplete,
    };
  }, [contributions]);

  const filtered = useMemo(() => {
    const list = contributions.filter((contribution) => {
      const from = contribution.fromMemberId;
      const to = contribution.toMemberId;
      const matchesQuery =
        !query ||
        from.fullName.toLowerCase().includes(query.toLowerCase()) ||
        to.fullName.toLowerCase().includes(query.toLowerCase()) ||
        from.memberId.toLowerCase().includes(query.toLowerCase()) ||
        to.memberId.toLowerCase().includes(query.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || contribution.status === statusFilter;
      const matchesDate = inDateRange(
        contribution.createdAt,
        dateFrom || null,
        dateTo || null
      );
      return matchesQuery && matchesStatus && matchesDate;
    });

    list.sort((a, b) => {
      switch (sortKey) {
        case "amount":
          return compareValues(a.amount, b.amount);
        case "status":
          return compareValues(a.status, b.status);
        case "cycle":
          return compareValues(a.cycleNumber ?? 1, b.cycleNumber ?? 1);
        case "date":
        default:
          return compareValues(
            new Date(a.createdAt).getTime(),
            new Date(b.createdAt).getTime()
          );
      }
    });

    return list;
  }, [contributions, query, statusFilter, sortKey, dateFrom, dateTo]);

  const paged = useMemo(
    () => paginate(filtered, page, pageSize),
    [filtered, page, pageSize]
  );

  const cancellablePageIds = paged.items
    .filter((c) => c.status !== "confirmed")
    .map((c) => getContributionId(c))
    .filter(Boolean);
  const allPageSelected =
    cancellablePageIds.length > 0 &&
    cancellablePageIds.every((id) => selected.has(id));
  const somePageSelected =
    cancellablePageIds.some((id) => selected.has(id)) && !allPageSelected;

  function toggleSelectAll(checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of cancellablePageIds) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  async function bulkCancel() {
    const contributionIds = [...selected].filter((id) => {
      const item = contributions.find((c) => getContributionId(c) === id);
      return item && item.status !== "confirmed";
    });
    if (contributionIds.length === 0) {
      setMessage("No cancellable contributions selected.");
      return;
    }
    if (!window.confirm(`Cancel ${contributionIds.length} contribution(s)?`)) {
      return;
    }
    setBulkLoading(true);
    try {
      const res = await fetch("/api/admin/bulk/contributions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", contributionIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage(data.message);
      setSelected(new Set());
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Bulk cancel failed");
    } finally {
      setBulkLoading(false);
    }
  }

  function exportContributions() {
    downloadCsv(
      `contributions-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        { key: "from", label: "From" },
        { key: "to", label: "To" },
        { key: "amount", label: "Amount" },
        { key: "status", label: "Status" },
        { key: "cycle", label: "Cycle" },
        { key: "circleRemaining", label: "Circle remaining" },
        { key: "createdAt", label: "Created" },
      ],
      filtered.map((c) => ({
        from: `${c.fromMemberId.fullName} (${c.fromMemberId.memberId})`,
        to: `${c.toMemberId.fullName} (${c.toMemberId.memberId})`,
        amount: c.amount,
        status: c.status,
        cycle: c.cycleNumber ?? 1,
        circleRemaining: c.payeeCircle?.circleComplete
          ? "Complete"
          : c.payeeCircle
            ? `${c.payeeCircle.remainingToComplete} remaining (${c.payeeCircle.paidDownlines}/2 paid)`
            : "—",
        createdAt: c.createdAt,
      }))
    );
  }

  const filters: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "awaiting_confirmation", label: "Awaiting" },
    { key: "confirmed", label: "Confirmed" },
    { key: "declined", label: "Declined" },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Contributions"
        description="Manage all payment activity across the community"
        actions={
          <>
            <AdminRefreshButton />
            <AdminExportButton onExport={exportContributions} />
          </>
        }
      />

      {message && (
        <div className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
          {message}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-8">
        <ProStatCard accent="amber" label="Pending" value={String(stats.pending)} sublabel="Not yet claimed" icon={Wallet} />
        <ProStatCard accent="blue" label="Awaiting" value={String(stats.awaiting)} sublabel="Awaiting confirmation" icon={Wallet} />
        <ProStatCard accent="rose" label="Declined" value={String(stats.declined)} sublabel="Needs rematch" icon={Wallet} />
        <ProStatCard accent="emerald" label="Confirmed" value={String(stats.confirmed)} sublabel="Completed payments" icon={Wallet} />
        <ProStatCard accent="violet" label="Confirmed value" value={formatNaira(stats.totalValue)} sublabel="Total received" icon={Wallet} />
        <ProStatCard accent="orange" label="2 to complete" value={String(stats.twoAway)} sublabel="Payees building circle" icon={Wallet} />
        <ProStatCard accent="blue" label="1 to complete" value={String(stats.oneAway)} sublabel="Almost complete" icon={Wallet} />
        <ProStatCard accent="emerald" label="Circles done" value={String(stats.circleComplete)} sublabel="Both downlines paid" icon={Wallet} />
      </div>

      <AdminBulkBar selectedCount={selected.size} onClear={() => setSelected(new Set())}>
        <button
          type="button"
          disabled={bulkLoading}
          onClick={bulkCancel}
          className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-50"
        >
          Bulk cancel
        </button>
      </AdminBulkBar>

      <ProCard
        accent="slate"
        title="Payment Queue"
        description={`${filtered.length} matching · page ${paged.page} of ${paged.totalPages}`}
        icon={Wallet}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <AdminSortSelect
              value={sortKey}
              onChange={(v) => {
                setSortKey(v as SortKey);
                setPage(1);
              }}
              options={[
                { value: "date", label: "Sort: Date" },
                { value: "amount", label: "Sort: Amount" },
                { value: "status", label: "Sort: Status" },
                { value: "cycle", label: "Sort: Cycle" },
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
              placeholder="Search by payer or recipient name or ID"
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {filters.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setStatusFilter(key);
                  setPage(1);
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  statusFilter === key
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
          <ProEmptyState message="No contributions match your filters." />
        ) : (
          <>
            <div className="mb-3">
              <AdminSelectAllCheckbox
                checked={allPageSelected}
                indeterminate={somePageSelected}
                onChange={toggleSelectAll}
                label="Select cancellable on this page"
              />
            </div>
            <div className="-mx-5 overflow-x-auto sm:-mx-6">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-left text-[11px] font-medium uppercase tracking-wider text-slate-400">
                    <th className="w-10 px-4 py-3" />
                    <th className="px-4 py-3">From</th>
                    <th className="px-4 py-3">To</th>
                    <th className="px-4 py-3">Cycle</th>
                    <th className="px-4 py-3">Circle remaining</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="min-w-[280px] px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.items.map((contribution) => {
                    const contributionId = getContributionId(contribution);
                    return (
                    <tr key={contributionId} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-4 py-3.5">
                        {contribution.status !== "confirmed" && (
                          <input
                            type="checkbox"
                            checked={selected.has(contributionId)}
                            onChange={() => {
                              setSelected((prev) => {
                                const next = new Set(prev);
                                if (next.has(contributionId)) next.delete(contributionId);
                                else next.add(contributionId);
                                return next;
                              });
                            }}
                            className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                          />
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <Link href={`/admin/members/${contribution.fromMemberId._id}`} className="text-sm font-medium text-slate-900 hover:text-amber-700">
                          {contribution.fromMemberId.fullName}
                        </Link>
                        <p className="text-xs text-slate-500">{contribution.fromMemberId.memberId}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <Link href={`/admin/members/${contribution.toMemberId._id}`} className="text-sm font-medium text-slate-900 hover:text-amber-700">
                          {contribution.toMemberId.fullName}
                        </Link>
                        <p className="text-xs text-slate-500">{contribution.toMemberId.memberId}</p>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-600">{contribution.cycleNumber ?? 1}</td>
                      <td className="px-4 py-3.5">
                        <CircleRemainingBadge circle={contribution.payeeCircle} />
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${contributionStatusBadgeClass(contribution.status)}`}>
                          {formatContributionStatusLabel(contribution.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-500">{formatDisplayDateTime(contribution.createdAt)}</td>
                      <td className="px-4 py-3.5 text-right text-sm font-semibold text-slate-900">
                        <Link
                          href={`/admin/contributions/${contributionId}`}
                          className="hover:text-amber-700"
                        >
                          {formatNaira(contribution.amount)}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5">
                        <AdminContributionActions contribution={contribution} compact onMessage={setMessage} />
                      </td>
                    </tr>
                    );
                  })}
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
