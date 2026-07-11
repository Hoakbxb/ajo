import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { findMemberById } from "@/lib/db/repository";
import AdminSidebar from "./components/AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const member = await findMemberById(session.memberId);
  if (!member || member.role !== "admin") redirect("/admin/login");

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc] lg:flex-row">
      <AdminSidebar fullName={member.fullName} />
      <div className="flex min-h-0 flex-1 flex-col">
        <main className="flex-1 overflow-y-auto px-4 py-5 pb-24 sm:px-6 sm:py-6 lg:px-8 lg:pb-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
