import { NextResponse } from "next/server";
import { adminUnauthorizedResponse, requireAdmin } from "@/lib/auth";
import { adminUnsuspendMember } from "@/lib/admin-actions";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;

    const member = await adminUnsuspendMember(session.memberId, id);

    return NextResponse.json({
      message: "Member unsuspended",
      member: {
        id: member.id,
        memberId: member.memberId,
        isSuspended: member.isSuspended,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return adminUnauthorizedResponse();
    }
    const message =
      error instanceof Error ? error.message : "Failed to unsuspend member";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
