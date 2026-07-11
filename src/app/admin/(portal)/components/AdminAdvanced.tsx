"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowDownUp,
  Download,
  RefreshCw,
} from "lucide-react";
import type { SortDirection } from "@/lib/admin-table";
import { ProButton } from "@/app/(app)/dashboard/components/dashboard-ui";

export function AdminPageHeader({
  kicker = "Administration",
  title,
  description,
  actions,
}: {
  kicker?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="border-b border-slate-200/80 pb-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
            {kicker}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          )}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function AdminRefreshButton({
  label = "Refresh",
}: {
  label?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => {
        setLoading(true);
        router.refresh();
        setTimeout(() => setLoading(false), 500);
      }}
      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
    >
      <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
      {loading ? "Refreshing..." : label}
    </button>
  );
}

export function AdminExportButton({
  label = "Export CSV",
  onExport,
}: {
  label?: string;
  onExport: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onExport}
      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
    >
      <Download className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

export function AdminSortSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5">
      <ArrowDownUp className="h-3.5 w-3.5 text-slate-400" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-xs font-medium text-slate-700 outline-none"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function AdminPageSizeSelect({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none"
    >
      {[10, 25, 50, 100].map((size) => (
        <option key={size} value={size}>
          {size} / page
        </option>
      ))}
    </select>
  );
}

export function AdminDateRangeFilter({
  from,
  to,
  onFromChange,
  onToChange,
}: {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="date"
        value={from}
        onChange={(e) => onFromChange(e.target.value)}
        className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 outline-none focus:border-amber-500"
      />
      <span className="text-xs text-slate-400">to</span>
      <input
        type="date"
        value={to}
        onChange={(e) => onToChange(e.target.value)}
        className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 outline-none focus:border-amber-500"
      />
    </div>
  );
}

export function AdminPagination({
  page,
  totalPages,
  total,
  from,
  to,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  from: number;
  to: number;
  onPageChange: (page: number) => void;
}) {
  if (total === 0) return null;

  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-slate-500">
        Showing {from}–{to} of {total}
      </p>
      <div className="flex items-center gap-2">
        <ProButton
          variant="secondary"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </ProButton>
        <span className="text-xs font-medium text-slate-600">
          Page {page} of {totalPages}
        </span>
        <ProButton
          variant="secondary"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </ProButton>
      </div>
    </div>
  );
}

export function AdminBulkBar({
  selectedCount,
  onClear,
  children,
}: {
  selectedCount: number;
  onClear: () => void;
  children: React.ReactNode;
}) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-medium text-amber-900">
        {selectedCount} selected
      </p>
      <div className="flex flex-wrap gap-2">
        {children}
        <button
          type="button"
          onClick={onClear}
          className="rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-amber-100/50"
        >
          Clear selection
        </button>
      </div>
    </div>
  );
}

export function AdminSelectAllCheckbox({
  checked,
  indeterminate,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600">
      <input
        type="checkbox"
        checked={checked}
        ref={(el) => {
          if (el) el.indeterminate = Boolean(indeterminate);
        }}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
      />
      {label}
    </label>
  );
}

export function toggleSortDirection(
  current: SortDirection
): SortDirection {
  return current === "asc" ? "desc" : "asc";
}
