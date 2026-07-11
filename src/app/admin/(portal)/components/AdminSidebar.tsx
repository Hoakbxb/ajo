"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ClipboardList,
  LayoutGrid,
  LogOut,
  Network,
  Settings,
  Users,
  Wallet,
} from "lucide-react";
import { getInitials } from "@/app/(app)/dashboard/components/dashboard-ui";

const navItems = [
  { href: "/admin", label: "Overview", icon: LayoutGrid, exact: true, badgeKey: null },
  { href: "/admin/members", label: "Members", icon: Users, badgeKey: null },
  { href: "/admin/contributions", label: "Contributions", icon: Wallet, badgeKey: "contributions" as const },
  { href: "/admin/escalations", label: "Escalations", icon: AlertTriangle, badgeKey: "escalations" as const },
  { href: "/admin/matrix", label: "Matrix", icon: Network, badgeKey: null },
  { href: "/admin/settings", label: "Settings", icon: Settings, badgeKey: null },
  { href: "/admin/activity", label: "Activity", icon: ClipboardList, badgeKey: null },
];

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  badge,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  active: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
        active
          ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25"
          : "text-slate-400 hover:bg-white/5 hover:text-white"
      }`}
    >
      <span className="flex items-center gap-3">
        <Icon className="h-5 w-5 shrink-0" strokeWidth={2} />
        {label}
      </span>
      {badge != null && badge > 0 && (
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
            active ? "bg-slate-950 text-amber-400" : "bg-rose-500 text-white"
          }`}
        >
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}

export default function AdminSidebar({ fullName }: { fullName: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const initials = getInitials(fullName);
  const [badges, setBadges] = useState({ contributions: 0, escalations: 0 });

  useEffect(() => {
    async function loadBadges() {
      try {
        const res = await fetch("/api/admin/nav-badges");
        if (!res.ok) return;
        const data = await res.json();
        setBadges(data.badges);
      } catch {
        // ignore
      }
    }
    loadBadges();
    const interval = setInterval(loadBadges, 30_000);
    return () => clearInterval(interval);
  }, [pathname]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <>
      <header className="sticky top-0 z-40 flex items-center justify-between bg-[#0f172a] px-4 py-3 lg:hidden">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-xs font-bold text-slate-950">
            ADM
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{fullName}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
          aria-label="Sign out"
        >
          <LogOut className="h-5 w-5" strokeWidth={2} />
        </button>
      </header>

      <aside className="hidden w-[272px] shrink-0 flex-col bg-[#0f172a] lg:flex">
        <div className="border-b border-white/10 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/30">
              ADM
            </div>
            <div>
              <p className="text-sm font-bold text-white">Friends Reward</p>
              <p className="text-xs text-slate-400">Admin Portal</p>
            </div>
          </div>
        </div>

        <div className="border-b border-white/10 px-5 py-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Administrator
          </p>
          <div className="mt-3 flex items-center gap-3 rounded-xl bg-white/5 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500 text-sm font-bold text-slate-950">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{fullName}</p>
            </div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-3">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              {...item}
              badge={
                item.badgeKey ? badges[item.badgeKey] : undefined
              }
              active={
                item.exact
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(`${item.href}/`)
              }
            />
          ))}
        </nav>

        <div className="border-t border-white/10 p-3">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-300"
          >
            <LogOut className="h-5 w-5" strokeWidth={2} />
            Sign out
          </button>
        </div>
      </aside>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#0f172a] px-2 pb-[env(safe-area-inset-bottom)] pt-2 lg:hidden">
        <div className="flex items-stretch justify-around">
          {navItems.slice(0, 4).map((item) => {
            const active =
              item.exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const badge = item.badgeKey ? badges[item.badgeKey] : 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold transition ${
                  active ? "text-amber-400" : "text-slate-500"
                }`}
              >
                <span
                  className={`relative flex h-9 w-9 items-center justify-center rounded-xl transition ${
                    active ? "bg-amber-500 text-slate-950" : ""
                  }`}
                >
                  <item.icon className="h-5 w-5" strokeWidth={2} />
                  {badge > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
