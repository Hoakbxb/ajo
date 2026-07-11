import { NextResponse } from "next/server";
import { adminUnauthorizedResponse, requireAdmin } from "@/lib/auth";
import {
  adminBulkClearEscalations,
  adminBulkDeleteMembers,
  adminBulkSuspendMembers,
  adminBulkUnsuspendMembers,
} from "@/lib/admin-actions";

export async function POST(request: Request) {
  try {
    const session = await requireAdmin();
    const body = await request.json();
    const { action, memberIds, reason } = body;

    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return NextResponse.json(
        { error: "memberIds array is required" },
        { status: 400 }
      );
    }

    switch (action) {
      case "suspend": {
        const results = await adminBulkSuspendMembers(
          session.memberId,
          memberIds,
          reason ?? "Bulk suspended by administrator"
        );
        return NextResponse.json({
          message: `Suspended ${results.success} member(s)`,
          results,
        });
      }
      case "unsuspend": {
        const results = await adminBulkUnsuspendMembers(
          session.memberId,
          memberIds
        );
        return NextResponse.json({
          message: `Unsuspended ${results.success} member(s)`,
          results,
        });
      }
      case "clear_escalation": {
        const results = await adminBulkClearEscalations(
          session.memberId,
          memberIds
        );
        return NextResponse.json({
          message: `Cleared ${results.success} escalation(s)`,
          results,
        });
      }
      case "delete": {
        const results = await adminBulkDeleteMembers(
          session.memberId,
          memberIds
        );
        const failedNote =
          results.failed.length > 0
            ? ` · ${results.failed.length} failed`
            : "";
        return NextResponse.json({
          message: `Deleted ${results.success} member(s)${failedNote}`,
          results,
        });
      }
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return adminUnauthorizedResponse();
    }
    const message =
      error instanceof Error ? error.message : "Bulk action failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
