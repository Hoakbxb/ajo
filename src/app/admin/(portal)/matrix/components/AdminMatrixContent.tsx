"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { Network, Search } from "lucide-react";
import type { AdminMatrixRow } from "@/types/admin";
import {
  ProBadge,
  ProButton,
  ProCard,
  ProEmptyState,
  ProStatCard,
} from "@/app/(app)/dashboard/components/dashboard-ui";
import {
  AdminExportButton,
  AdminPageHeader,
  AdminPageSizeSelect,
  AdminPagination,
  AdminRefreshButton,
  AdminSortSelect,
} from "../../components/AdminAdvanced";
import {
  compareValues,
  downloadCsv,
  paginate,
} from "@/lib/admin-table";
import { useAdminRealtime } from "@/hooks/useAdminRealtime";

type FilterKey =
  | "all"
  | "placed"
  | "unplaced"
  | "has_children"
  | "open_slots"
  | "cycle_ready";

type SortKey = "name" | "level" | "slots" | "status";

export default function AdminMatrixContent({
  rows,
}: {
  rows: AdminMatrixRow[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sortKey, setSortKey] = useState<SortKey>("level");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const refresh = useCallback(() => router.refresh(), [router]);
  useAdminRealtime(refresh);

  const stats = useMemo(() => {
    const placed = rows.filter((r) => r.parent).length;
    const withChildren = rows.filter((r) => r.slotsFilled > 0).length;
    const openSlots = rows.reduce((sum, r) => sum + r.slotsOpen, 0);
    const cycleReady = rows.filter((r) => r.bothChildrenPaid).length;
    return { placed, withChildren, openSlots, cycleReady, total: rows.length };
  }, [rows]);

  const filtered = useMemo(() => {
    const list = rows.filter((row) => {
      const matchesQuery =
        !query ||
        row.fullName.toLowerCase().includes(query.toLowerCase()) ||
        row.memberId.toLowerCase().includes(query.toLowerCase()) ||
        row.parent?.fullName.toLowerCase().includes(query.toLowerCase()) ||
        row.parent?.memberId.toLowerCase().includes(query.toLowerCase());

      const matchesFilter =
        filter === "all" ||
        (filter === "placed" && Boolean(row.parent)) ||
        (filter === "unplaced" && !row.parent) ||
        (filter === "has_children" && row.slotsFilled > 0) ||
        (filter === "open_slots" && row.slotsOpen > 0) ||
        (filter === "cycle_ready" && row.bothChildrenPaid);

      return matchesQuery && matchesFilter;
    });

    list.sort((a, b) => {
      switch (sortKey) {
        case "name":
          return compareValues(a.fullName, b.fullName);
        case "slots":
          return compareValues(a.slotsFilled, b.slotsFilled);
        case "status":
          return compareValues(a.status, b.status);
        case "level":
        default:
          return compareValues(a.matrixLevel, b.matrixLevel);
      }
    });

    return list;
  }, [rows, query, filter, sortKey]);

  const paged = useMemo(
    () => paginate(filtered, page, pageSize),
    [filtered, page, pageSize]
  );

  async function runMaintenance() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/matrix", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage(data.message ?? "Matrix maintenance completed.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Maintenance failed");
    } finally {
      setLoading(false);
    }
  }

  function exportMatrix() {
    downloadCsv(
      `matrix-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        { key: "memberId", label: "Member ID" },
        { key: "fullName", label: "Name" },
        { key: "upline", label: "Upline" },
        { key: "position", label: "Position" },
        { key: "level", label: "Level" },
        { key: "leftChild", label: "Left Child" },
        { key: "rightChild", label: "Right Child" },
        { key: "slots", label: "Slots Filled" },
        { key: "status", label: "Status" },
        { key: "paid", label: "Paid" },
        { key: "cycles", label: "Cycles" },
      ],
      filtered.map((r) => ({
        memberId: r.memberId,
        fullName: r.fullName,
        upline: r.parent ? `${r.parent.fullName} (${r.parent.memberId})` : "",
        position: r.position,
        level: r.matrixLevel,
        leftChild: r.leftChild
          ? `${r.leftChild.fullName} (${r.leftChild.memberId})`
          : "",
        rightChild: r.rightChild
          ? `${r.rightChild.fullName} (${r.rightChild.memberId})`
          : "",
        slots: `${r.slotsFilled}/2`,
        status: r.status,
        paid: r.hasPaidContribution ? "yes" : "no",
        cycles: r.cyclesCompleted,
      }))
    );
  }

  const filters: { key: FilterKey; label: string }[] = [
    { key: "all", label: "All" },
    { key: "placed", label: "Has upline" },
    { key: "unplaced", label: "No upline" },
    { key: "has_children", label: "Has downline" },
    { key: "open_slots", label: "Open slots" },
    { key: "cycle_ready", label: "Cycle ready" },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Matrix"
        description="Table view of all member placements — open any row to see their matrix tree"
        actions={
          <>
            <AdminRefreshButton />
            <AdminExportButton onExport={exportMatrix} />
            <ProButton disabled={loading} onClick={runMaintenance}>
              {loading ? "Running..." : "Run maintenance"}
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
        <ProStatCard
          accent="indigo"
          label="Members"
          value={String(stats.total)}
          sublabel="In matrix registry"
          icon={Network}
        />
        <ProStatCard
          accent="blue"
          label="Placed"
          value={String(stats.placed)}
          sublabel="Have an upline"
          icon={Network}
        />
        <ProStatCard
          accent="amber"
          label="Open slots"
          value={String(stats.openSlots)}
          sublabel="Across all members"
          icon={Network}
        />
        <ProStatCard
          accent="emerald"
          label="Cycle ready"
          value={String(stats.cycleReady)}
          sublabel="Both children paid"
          icon={Network}
        />
      </div>

      <ProCard
        accent="indigo"
        title="Matrix placements"
        description={`${filtered.length} matching · page ${paged.page} of ${paged.totalPages}`}
        icon={Network}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <AdminSortSelect
              value={sortKey}
              onChange={(v) => {
                setSortKey(v as SortKey);
                setPage(1);
              }}
              options={[
                { value: "level", label: "Sort: Level" },
                { value: "name", label: "Sort: Name" },
                { value: "slots", label: "Sort: Slots" },
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
              placeholder="Search member, ID, or upline"
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
        </div>

        {paged.items.length === 0 ? (
          <ProEmptyState message="No matrix placements match your filters." />
        ) : (
          <>
            <div className="-mx-5 overflow-x-auto sm:-mx-6">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-left text-[11px] font-medium uppercase tracking-wider text-slate-400">
                    <th className="px-4 py-3">Member</th>
                    <th className="px-4 py-3">Upline</th>
                    <th className="px-4 py-3">Pos</th>
                    <th className="px-4 py-3">Lvl</th>
                    <th className="px-4 py-3">Left</th>
                    <th className="px-4 py-3">Right</th>
                    <th className="px-4 py-3">Slots</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.items.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-slate-100 last:border-b-0"
                    >
                      <td className="px-4 py-3.5">
                        <Link
                          href={`/admin/matrix/${row.id}`}
                          className="text-sm font-medium text-slate-900 hover:text-amber-700"
                        >
                          {row.fullName}
                        </Link>
                        <p className="text-xs text-slate-500">{row.memberId}</p>
                        {row.role === "admin" && (
                          <ProBadge accent="violet">admin</ProBadge>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-600">
                        {row.parent ? (
                          <Link
                            href={`/admin/matrix/${row.parent.id}`}
                            className="hover:text-amber-700"
                          >
                            {row.parent.fullName}
                          </Link>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-sm capitalize text-slate-600">
                        {row.parent ? row.position : "—"}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-600">
                        {row.matrixLevel}
                      </td>
                      <td className="px-4 py-3.5 text-sm">
                        {row.leftChild ? (
                          <Link
                            href={`/admin/matrix/${row.leftChild.id}`}
                            className="text-slate-700 hover:text-amber-700"
                          >
                            {row.leftChild.fullName}
                            {row.leftChild.hasPaidContribution && (
                              <span className="ml-1 text-emerald-600">✓</span>
                            )}
                          </Link>
                        ) : (
                          <span className="text-slate-400">open</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-sm">
                        {row.rightChild ? (
                          <Link
                            href={`/admin/matrix/${row.rightChild.id}`}
                            className="text-slate-700 hover:text-amber-700"
                          >
                            {row.rightChild.fullName}
                            {row.rightChild.hasPaidContribution && (
                              <span className="ml-1 text-emerald-600">✓</span>
                            )}
                          </Link>
                        ) : (
                          <span className="text-slate-400">open</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-sm text-slate-700">
                          {row.slotsFilled}/2
                        </span>
                        {row.bothChildrenPaid && (
                          <ProBadge accent="emerald">ready</ProBadge>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <ProBadge
                          accent={row.status === "active" ? "emerald" : "amber"}
                        >
                          {row.hasPaidContribution ? row.status : "unpaid"}
                        </ProBadge>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/admin/matrix/${row.id}`}
                            className="text-xs font-medium text-amber-700 hover:text-amber-900"
                          >
                            View matrix
                          </Link>
                          <Link
                            href={`/admin/members/${row.id}`}
                            className="text-xs font-medium text-slate-500 hover:text-slate-800"
                          >
                            Manage
                          </Link>
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
