import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { findMemberById } from "@/lib/db/repository";
import DashboardSidebar from "./dashboard/components/DashboardSidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  if (session.role === "admin") redirect("/admin");

  const member = await findMemberById(session.memberId);

  if (!member) redirect("/login");

  if (member.isSuspended) redirect("/login?error=suspended");

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc] lg:flex-row">
      <DashboardSidebar fullName={member.fullName} />
      <div className="flex min-h-0 flex-1 flex-col">
        <main className="flex-1 overflow-y-auto px-4 py-5 pb-24 sm:px-6 sm:py-6 lg:px-8 lg:pb-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
