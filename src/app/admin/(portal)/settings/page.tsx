import { findAdminActivityLogs, findMemberById } from "@/lib/db/repository";
import { getPlatformSettings } from "@/lib/platform-settings";
import AdminSettingsContent from "./components/AdminSettingsContent";

export default async function AdminSettingsPage() {
  const [settings, logs] = await Promise.all([
    getPlatformSettings(),
    findAdminActivityLogs(50),
  ]);

  const settingsLogs = logs.filter((log) => log.action.startsWith("settings."));
  const adminIds = [...new Set(settingsLogs.map((log) => log.adminMemberId))];
  const admins = await Promise.all(adminIds.map((id) => findMemberById(id)));
  const adminNames = Object.fromEntries(
    admins.filter(Boolean).map((admin) => [admin!.id, admin!.fullName])
  );

  const history = settingsLogs.map((log) => ({
    ...log,
    createdAt: log.createdAt.toISOString(),
    adminName: adminNames[log.adminMemberId] ?? "Admin",
  }));

  return (
    <AdminSettingsContent
      settings={JSON.parse(JSON.stringify(settings))}
      history={JSON.parse(JSON.stringify(history))}
    />
  );
}
