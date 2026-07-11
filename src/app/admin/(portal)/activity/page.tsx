import { findAdminActivityLogs, findMemberById } from "@/lib/db/repository";
import AdminActivityContent from "./components/AdminActivityContent";

export default async function AdminActivityPage() {
  const logs = await findAdminActivityLogs(200);
  const adminIds = [...new Set(logs.map((log) => log.adminMemberId))];
  const admins = await Promise.all(adminIds.map((id) => findMemberById(id)));
  const adminNames = Object.fromEntries(
    admins.filter(Boolean).map((admin) => [admin!.id, admin!.fullName])
  );

  const activity = logs.map((log) => ({
    ...log,
    createdAt: log.createdAt.toISOString(),
    adminName: adminNames[log.adminMemberId] ?? "Admin",
  }));

  return <AdminActivityContent activity={activity} />;
}
