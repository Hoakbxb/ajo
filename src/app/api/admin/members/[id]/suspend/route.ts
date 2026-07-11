import { NextResponse } from "next/server";
import { adminUnauthorizedResponse, requireAdmin } from "@/lib/auth";
import { adminSuspendMember } from "@/lib/admin-actions";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const reason = body.reason ?? "Suspended by administrator";

    const member = await adminSuspendMember(session.memberId, id, reason);

    return NextResponse.json({
      message:
        "Member suspended. Pending payers matched to them have been reassigned.",
      member: {
        id: member.id,
        memberId: member.memberId,
        isSuspended: member.isSuspended,
        suspendedReason: member.suspendedReason,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return adminUnauthorizedResponse();
    }
    const message =
      error instanceof Error ? error.message : "Failed to suspend member";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
