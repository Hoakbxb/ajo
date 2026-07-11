import { NextResponse } from "next/server";
import { adminUnauthorizedResponse, requireAdmin } from "@/lib/auth";
import { findAdminActivityLogs, findMemberById } from "@/lib/db/repository";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit") ?? 100), 500);

    const logs = await findAdminActivityLogs(limit);
    const adminIds = [...new Set(logs.map((log) => log.adminMemberId))];
    const admins = await Promise.all(adminIds.map((id) => findMemberById(id)));
    const adminNames = new Map(
      admins.filter(Boolean).map((admin) => [admin!.id, admin!.fullName])
    );

    return NextResponse.json({
      activity: logs.map((log) => ({
        ...log,
        createdAt: log.createdAt.toISOString(),
        adminName: adminNames.get(log.adminMemberId) ?? "Admin",
      })),
    });
  } catch {
    return adminUnauthorizedResponse();
  }
}
