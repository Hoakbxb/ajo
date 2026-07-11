import { NextResponse } from "next/server";
import { adminUnauthorizedResponse, requireAdmin } from "@/lib/auth";
import { adminBulkCancelContributions } from "@/lib/admin-actions";

export async function POST(request: Request) {
  try {
    const session = await requireAdmin();
    const body = await request.json();
    const { action, contributionIds } = body;

    if (!Array.isArray(contributionIds) || contributionIds.length === 0) {
      return NextResponse.json(
        { error: "contributionIds array is required" },
        { status: 400 }
      );
    }

    if (action === "cancel") {
      const results = await adminBulkCancelContributions(
        session.memberId,
        contributionIds
      );
      return NextResponse.json({
        message: `Cancelled ${results.success} contribution(s)`,
        results,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return adminUnauthorizedResponse();
    }
    const message =
      error instanceof Error ? error.message : "Bulk action failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
