"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/Header";

const APP_ROUTES = ["/dashboard", "/profile", "/transactions", "/admin"];

function isAppRoute(pathname: string) {
  return APP_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export default function ConditionalChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  if (isAppRoute(pathname)) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-sm text-slate-500">
        Friends Reward Circle — Voluntary community reward system
      </footer>
    </>
  );
}
