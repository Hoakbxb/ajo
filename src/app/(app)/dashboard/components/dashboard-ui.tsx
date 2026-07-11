import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type CardAccent =
  | "slate"
  | "indigo"
  | "blue"
  | "cyan"
  | "emerald"
  | "amber"
  | "rose"
  | "violet"
  | "orange"
  | "teal";

export const accentStyles: Record<
  CardAccent,
  {
    stripe: string;
    icon: string;
    iconMuted: string;
    badge: string;
    bar: string;
    soft: string;
    text: string;
    dot: string;
    solid: string;
    solidIcon: string;
    solidLabel: string;
    solidSub: string;
  }
> = {
  slate: {
    stripe: "bg-slate-400",
    icon: "text-slate-600",
    iconMuted: "bg-slate-100 text-slate-600",
    badge: "bg-slate-100 text-slate-700",
    bar: "bg-slate-600",
    soft: "bg-slate-50",
    text: "text-slate-700",
    dot: "bg-slate-400",
    solid: "bg-slate-700 border-slate-700",
    solidIcon: "bg-white/15 text-white",
    solidLabel: "text-slate-200",
    solidSub: "text-slate-300",
  },
  indigo: {
    stripe: "bg-indigo-500",
    icon: "text-indigo-600",
    iconMuted: "bg-indigo-50 text-indigo-600",
    badge: "bg-indigo-50 text-indigo-700",
    bar: "bg-indigo-500",
    soft: "bg-indigo-50/50",
    text: "text-indigo-700",
    dot: "bg-indigo-500",
    solid: "bg-indigo-600 border-indigo-600",
    solidIcon: "bg-white/15 text-white",
    solidLabel: "text-indigo-100",
    solidSub: "text-indigo-200",
  },
  blue: {
    stripe: "bg-blue-500",
    icon: "text-blue-600",
    iconMuted: "bg-blue-50 text-blue-600",
    badge: "bg-blue-50 text-blue-700",
    bar: "bg-blue-500",
    soft: "bg-blue-50/50",
    text: "text-blue-700",
    dot: "bg-blue-500",
    solid: "bg-blue-600 border-blue-600",
    solidIcon: "bg-white/15 text-white",
    solidLabel: "text-blue-100",
    solidSub: "text-blue-200",
  },
  cyan: {
    stripe: "bg-cyan-500",
    icon: "text-cyan-600",
    iconMuted: "bg-cyan-50 text-cyan-600",
    badge: "bg-cyan-50 text-cyan-700",
    bar: "bg-cyan-500",
    soft: "bg-cyan-50/50",
    text: "text-cyan-700",
    dot: "bg-cyan-500",
    solid: "bg-cyan-600 border-cyan-600",
    solidIcon: "bg-white/15 text-white",
    solidLabel: "text-cyan-100",
    solidSub: "text-cyan-200",
  },
  emerald: {
    stripe: "bg-emerald-500",
    icon: "text-emerald-600",
    iconMuted: "bg-emerald-50 text-emerald-600",
    badge: "bg-emerald-50 text-emerald-700",
    bar: "bg-emerald-500",
    soft: "bg-emerald-50/50",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
    solid: "bg-emerald-600 border-emerald-600",
    solidIcon: "bg-white/15 text-white",
    solidLabel: "text-emerald-100",
    solidSub: "text-emerald-200",
  },
  amber: {
    stripe: "bg-amber-500",
    icon: "text-amber-600",
    iconMuted: "bg-amber-50 text-amber-600",
    badge: "bg-amber-50 text-amber-700",
    bar: "bg-amber-500",
    soft: "bg-amber-50/50",
    text: "text-amber-700",
    dot: "bg-amber-500",
    solid: "bg-amber-600 border-amber-600",
    solidIcon: "bg-white/15 text-white",
    solidLabel: "text-amber-100",
    solidSub: "text-amber-200",
  },
  rose: {
    stripe: "bg-rose-500",
    icon: "text-rose-600",
    iconMuted: "bg-rose-50 text-rose-600",
    badge: "bg-rose-50 text-rose-700",
    bar: "bg-rose-500",
    soft: "bg-rose-50/50",
    text: "text-rose-700",
    dot: "bg-rose-500",
    solid: "bg-rose-600 border-rose-600",
    solidIcon: "bg-white/15 text-white",
    solidLabel: "text-rose-100",
    solidSub: "text-rose-200",
  },
  violet: {
    stripe: "bg-violet-500",
    icon: "text-violet-600",
    iconMuted: "bg-violet-50 text-violet-600",
    badge: "bg-violet-50 text-violet-700",
    bar: "bg-violet-500",
    soft: "bg-violet-50/50",
    text: "text-violet-700",
    dot: "bg-violet-500",
    solid: "bg-violet-600 border-violet-600",
    solidIcon: "bg-white/15 text-white",
    solidLabel: "text-violet-100",
    solidSub: "text-violet-200",
  },
  orange: {
    stripe: "bg-orange-500",
    icon: "text-orange-600",
    iconMuted: "bg-orange-50 text-orange-600",
    badge: "bg-orange-50 text-orange-700",
    bar: "bg-orange-500",
    soft: "bg-orange-50/50",
    text: "text-orange-700",
    dot: "bg-orange-500",
    solid: "bg-orange-600 border-orange-600",
    solidIcon: "bg-white/15 text-white",
    solidLabel: "text-orange-100",
    solidSub: "text-orange-200",
  },
  teal: {
    stripe: "bg-teal-500",
    icon: "text-teal-600",
    iconMuted: "bg-teal-50 text-teal-600",
    badge: "bg-teal-50 text-teal-700",
    bar: "bg-teal-500",
    soft: "bg-teal-50/50",
    text: "text-teal-700",
    dot: "bg-teal-500",
    solid: "bg-teal-600 border-teal-600",
    solidIcon: "bg-white/15 text-white",
    solidLabel: "text-teal-100",
    solidSub: "text-teal-200",
  },
};

/** Professional card with subtle left accent stripe */
export function ProCard({
  accent = "slate",
  title,
  description,
  icon: Icon,
  children,
  className = "",
  action,
}: {
  accent?: CardAccent;
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  const styles = accentStyles[accent];

  return (
    <div
      className={`rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)] ${className}`}
    >
      <div className="p-5 sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {Icon && (
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${styles.iconMuted}`}>
                <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
              </div>
            )}
            <div>
              <h3 className="text-[15px] font-semibold tracking-tight text-slate-900">{title}</h3>
              {description && (
                <p className="mt-0.5 text-sm text-slate-500">{description}</p>
              )}
            </div>
          </div>
          {action}
        </div>
        {children}
      </div>
    </div>
  );
}

/** KPI stat card */
export function ProStatCard({
  label,
  value,
  sublabel,
  accent,
  icon: Icon,
}: {
  label: string;
  value: string;
  sublabel: string;
  accent: CardAccent;
  icon: LucideIcon;
}) {
  const styles = accentStyles[accent];

  return (
    <div
      className={`rounded-xl border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.08)] sm:p-5 ${styles.solid}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${styles.solidIcon}`}>
          <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
        </div>
      </div>
      <p className={`mt-3 text-xs font-medium uppercase tracking-wide sm:mt-4 ${styles.solidLabel}`}>
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold tracking-tight text-white sm:mt-1.5 sm:text-2xl">
        {value}
      </p>
      <p className={`mt-1 text-xs ${styles.solidSub}`}>{sublabel}</p>
    </div>
  );
}

export function ProDataGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 sm:grid-cols-2">{children}</div>;
}

export function ProDataCell({
  label,
  value,
  mono,
  className = "",
}: {
  label: string;
  value: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={`bg-white px-4 py-3.5 ${className}`}>
      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-1 text-sm font-medium text-slate-900 ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}

export function ProList({ children }: { children: ReactNode }) {
  return <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">{children}</div>;
}

export function ProListItem({ children }: { children: ReactNode }) {
  return <div className="flex items-center gap-4 bg-white px-4 py-3.5 first:rounded-t-lg last:rounded-b-lg">{children}</div>;
}

export function ProEmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-4 py-10 text-center">
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}

export function ProBadge({
  children,
  accent = "slate",
}: {
  children: ReactNode;
  accent?: CardAccent;
}) {
  const styles = accentStyles[accent];
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${styles.badge}`}>
      {children}
    </span>
  );
}

export function ProAlert({
  accent,
  icon: Icon,
  title,
  children,
}: {
  accent: CardAccent;
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  const styles = accentStyles[accent];

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="flex gap-4 p-5">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${styles.iconMuted}`}>
          <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <div className="mt-1 text-sm text-slate-600">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function ProButton({
  variant = "primary",
  children,
  onClick,
  disabled,
  className = "",
  type = "button",
}: {
  variant?: "primary" | "secondary" | "danger";
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit" | "reset";
}) {
  const variants = {
    primary: "bg-slate-900 text-white hover:bg-slate-800",
    secondary: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
    danger: "border border-rose-200 bg-white text-rose-600 hover:bg-rose-50",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// Backward compat aliases
export const ColoredCard = ProCard;
export const StatCard = ProStatCard;
