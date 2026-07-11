import { NextResponse } from "next/server";
import { countContributions, findMembers } from "@/lib/db/repository";
import { adminUnauthorizedResponse, requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();

    const [pendingContributions, escalations] = await Promise.all([
      countContributions({ status: ["pending", "awaiting_confirmation"] }),
      findMembers({ requiresAdminContact: true }),
    ]);

    return NextResponse.json({
      badges: {
        contributions: pendingContributions,
        escalations: escalations.length,
      },
    });
  } catch {
    return adminUnauthorizedResponse();
  }
}
