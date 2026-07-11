import { NextResponse } from "next/server";
import { adminUnauthorizedResponse, requireAdmin } from "@/lib/auth";
import { adminUpdateSettings } from "@/lib/admin-actions";
import { getPlatformSettings } from "@/lib/platform-settings";

export async function GET() {
  try {
    await requireAdmin();
    const settings = await getPlatformSettings();
    return NextResponse.json({ settings });
  } catch {
    return adminUnauthorizedResponse();
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireAdmin();
    const body = await request.json();
    const { contributionAmount, payoutAmount } = body;

    const settings = await adminUpdateSettings(session.memberId, {
      contributionAmount:
        contributionAmount !== undefined ? Number(contributionAmount) : undefined,
      payoutAmount:
        payoutAmount !== undefined ? Number(payoutAmount) : undefined,
    });

    return NextResponse.json({ message: "Settings updated", settings });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return adminUnauthorizedResponse();
    }
    const message =
      error instanceof Error ? error.message : "Failed to update settings";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
