"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CreditCard,
  Gift,
  LayoutGrid,
  LogOut,
  User,
} from "lucide-react";
import { getInitials } from "./dashboard-ui";
import { SITE_NAME } from "@/lib/brand";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutGrid },
  { href: "/wallet", label: "Referrals", icon: Gift },
  { href: "/transactions", label: "Transactions", icon: CreditCard },
  { href: "/profile", label: "Profile", icon: User },
];

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  disabled,
  mobile,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  active: boolean;
  disabled?: boolean;
  mobile?: boolean;
}) {
  if (disabled) {
    return (
      <span
        className={`flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 opacity-40 ${
          mobile ? "flex-1 flex-col gap-1 px-1 py-2 text-[10px]" : ""
        }`}
      >
        <Icon className={mobile ? "h-5 w-5" : "h-5 w-5"} strokeWidth={2} />
        {label}
      </span>
    );
  }

  if (mobile) {
    return (
      <Link
        href={href}
        className={`flex flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold transition ${
          active ? "text-indigo-400" : "text-slate-500"
        }`}
      >
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
            active ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/30" : ""
          }`}
        >
          <Icon className="h-5 w-5" strokeWidth={2} />
        </span>
        {label}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
        active
          ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/25"
          : "text-slate-400 hover:bg-white/5 hover:text-white"
      }`}
    >
      <Icon className="h-5 w-5 shrink-0" strokeWidth={2} />
      {label}
    </Link>
  );
}

export default function DashboardSidebar({
  fullName,
}: {
  fullName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const initials = getInitials(fullName);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const mobileNavItems = navItems;

  return (
    <>
      <header className="sticky top-0 z-40 flex items-center justify-between bg-[#0f172a] px-4 py-3 lg:hidden">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl">
            <Image src="/logo.png" alt={`${SITE_NAME} logo`} width={40} height={40} className="h-full w-full object-cover" />
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
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl shadow-lg shadow-indigo-500/30">
              <Image src="/logo.png" alt={`${SITE_NAME} logo`} width={44} height={44} className="h-full w-full object-cover" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">{SITE_NAME}</p>
              <p className="text-xs text-slate-400">Member Portal</p>
            </div>
          </div>
        </div>

        <div className="border-b border-white/10 px-5 py-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Signed in as
          </p>
          <div className="mt-3 flex items-center gap-3 rounded-xl bg-white/5 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-sm font-bold text-white">
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
              key={item.label}
              {...item}
              active={!item.disabled && (pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href)))}
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
          {mobileNavItems.map((item) => (
            <NavLink
              key={item.href}
              {...item}
              active={pathname === item.href}
              mobile
            />
          ))}
        </div>
      </nav>
    </>
  );
}
