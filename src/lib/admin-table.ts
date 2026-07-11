export type SortDirection = "asc" | "desc";

export function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" && typeof b === "boolean") {
    return Number(a) - Number(b);
  }
  return String(a).localeCompare(String(b), undefined, { sensitivity: "base" });
}

export function paginate<T>(items: T[], page: number, pageSize: number) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    pageSize,
    total,
    totalPages,
    from: total === 0 ? 0 : start + 1,
    to: Math.min(start + pageSize, total),
  };
}

export function downloadCsv(
  filename: string,
  columns: { key: string; label: string }[],
  rows: Record<string, unknown>[]
) {
  const escape = (value: unknown) => {
    const text = value == null ? "" : String(value);
    if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  };

  const header = columns.map((col) => escape(col.label)).join(",");
  const body = rows
    .map((row) => columns.map((col) => escape(row[col.key])).join(","))
    .join("\n");

  const blob = new Blob([`${header}\n${body}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function inDateRange(
  isoDate: string,
  from: string | null,
  to: string | null
): boolean {
  if (!from && !to) return true;
  const time = new Date(isoDate).getTime();
  if (from && time < new Date(`${from}T00:00:00`).getTime()) return false;
  if (to && time > new Date(`${to}T23:59:59.999`).getTime()) return false;
  return true;
}
