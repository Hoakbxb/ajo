"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { ClipboardList, Search } from "lucide-react";
import { formatDisplayDateTime } from "@/lib/format-date";
import type { AdminActivityFilter, AdminActivityItem } from "@/types/admin";
import {
  ProBadge,
  ProCard,
  ProEmptyState,
} from "@/app/(app)/dashboard/components/dashboard-ui";
import {
  AdminDateRangeFilter,
  AdminExportButton,
  AdminPageHeader,
  AdminPageSizeSelect,
  AdminPagination,
  AdminRefreshButton,
} from "../../components/AdminAdvanced";
import {
  compareValues,
  downloadCsv,
  inDateRange,
  paginate,
} from "@/lib/admin-table";
import { useAdminRealtime } from "@/hooks/useAdminRealtime";

function formatAction(action: string) {
  return action.replace(/\./g, " · ").replace(/_/g, " ");
}

function actionAccent(action: string) {
  if (action.startsWith("contribution.")) return "blue" as const;
  if (action.startsWith("member.")) return "indigo" as const;
  if (action.startsWith("settings.")) return "amber" as const;
  if (action.startsWith("matrix.")) return "violet" as const;
  return "slate" as const;
}

function targetHref(item: AdminActivityItem): string | null {
  if (!item.targetId) return null;
  if (item.targetType === "member") return `/admin/members/${item.targetId}`;
  if (item.targetType === "contribution")
    return `/admin/contributions/${item.targetId}`;
  return null;
}

export default function AdminActivityContent({
  activity,
}: {
  activity: AdminActivityItem[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<AdminActivityFilter>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const refresh = useCallback(() => router.refresh(), [router]);
  useAdminRealtime(refresh);

  const filtered = useMemo(() => {
    const list = activity.filter((item) => {
      const matchesQuery =
        !query ||
        item.action.toLowerCase().includes(query.toLowerCase()) ||
        item.adminName.toLowerCase().includes(query.toLowerCase()) ||
        item.targetType.toLowerCase().includes(query.toLowerCase()) ||
        JSON.stringify(item.details).toLowerCase().includes(query.toLowerCase());

      const matchesFilter =
        filter === "all" ||
        (filter === "member" && item.action.startsWith("member.")) ||
        (filter === "contribution" &&
          item.action.startsWith("contribution.")) ||
        (filter === "settings" && item.action.startsWith("settings."));

      const matchesDate = inDateRange(
        item.createdAt,
        dateFrom || null,
        dateTo || null
      );

      return matchesQuery && matchesFilter && matchesDate;
    });

    list.sort((a, b) =>
      compareValues(
        new Date(b.createdAt).getTime(),
        new Date(a.createdAt).getTime()
      )
    );

    return list;
  }, [activity, query, filter, dateFrom, dateTo]);

  const paged = useMemo(
    () => paginate(filtered, page, pageSize),
    [filtered, page, pageSize]
  );

  function exportActivity() {
    downloadCsv(
      `admin-activity-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        { key: "action", label: "Action" },
        { key: "adminName", label: "Admin" },
        { key: "targetType", label: "Target Type" },
        { key: "targetId", label: "Target ID" },
        { key: "createdAt", label: "When" },
        { key: "details", label: "Details" },
      ],
      filtered.map((item) => ({
        action: item.action,
        adminName: item.adminName,
        targetType: item.targetType,
        targetId: item.targetId ?? "",
        createdAt: item.createdAt,
        details: JSON.stringify(item.details),
      }))
    );
  }

  const filters: { key: AdminActivityFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "member", label: "Members" },
    { key: "contribution", label: "Contributions" },
    { key: "settings", label: "Settings" },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Activity Log"
        description="Audit trail of all administrator actions"
        actions={
          <>
            <AdminRefreshButton />
            <AdminExportButton onExport={exportActivity} />
          </>
        }
      />

      <ProCard
        accent="slate"
        title="Recent Activity"
        description={`${filtered.length} matching · page ${paged.page} of ${paged.totalPages}`}
        icon={ClipboardList}
        action={
          <AdminPageSizeSelect
            value={pageSize}
            onChange={(v) => {
              setPageSize(v);
              setPage(1);
            }}
          />
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
              placeholder="Search actions, admins, or details"
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
          <ProEmptyState message="No activity matches your filters." />
        ) : (
          <>
            <div className="space-y-3">
              {paged.items.map((item) => {
                const href = targetHref(item);
                return (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium capitalize text-slate-900">
                            {formatAction(item.action)}
                          </p>
                          <ProBadge accent={actionAccent(item.action)}>
                            {item.targetType}
                          </ProBadge>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">
                          by {item.adminName}
                          {item.targetId ? ` · ${item.targetId.slice(0, 8)}…` : ""}
                        </p>
                        {Object.keys(item.details).length > 0 && (
                          <pre className="mt-2 overflow-x-auto rounded-lg bg-white p-2 text-[11px] text-slate-600">
                            {JSON.stringify(item.details, null, 2)}
                          </pre>
                        )}
                        {href && (
                          <Link
                            href={href}
                            className="mt-2 inline-flex text-xs font-medium text-amber-700 hover:text-amber-900"
                          >
                            View target →
                          </Link>
                        )}
                      </div>
                      <p className="shrink-0 text-xs text-slate-400">
                        {formatDisplayDateTime(item.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
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
