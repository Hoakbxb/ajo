"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import { SITE_NAME } from "@/lib/brand";

const APP_ROUTES = ["/dashboard", "/profile", "/transactions", "/admin"];
const AUTH_ROUTES = ["/", "/join", "/forgot-password", "/reset-password"];

function isAppRoute(pathname: string) {
  return APP_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

function isAuthRoute(pathname: string) {
  return AUTH_ROUTES.includes(pathname);
}

export default function ConditionalChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  if (isAppRoute(pathname) || isAuthRoute(pathname)) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-sm text-slate-500">
        {SITE_NAME} — Community contribution platform
      </footer>
    </>
  );
}
