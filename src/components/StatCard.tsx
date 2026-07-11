import { CURRENCY } from "@/lib/constants";

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
}

export default function StatCard({ label, value, subtext }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-emerald-900/10 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-emerald-900/60">{label}</p>
      <p className="mt-2 text-2xl font-bold text-emerald-950">
        {typeof value === "number" && label.toLowerCase().includes("₦")
          ? `${CURRENCY}${value.toLocaleString()}`
          : typeof value === "number"
            ? value.toLocaleString()
            : value}
      </p>
      {subtext && (
        <p className="mt-1 text-xs text-emerald-900/50">{subtext}</p>
      )}
    </div>
  );
}

export function formatNaira(amount: number) {
  return `${CURRENCY}${amount.toLocaleString()}`;
}
