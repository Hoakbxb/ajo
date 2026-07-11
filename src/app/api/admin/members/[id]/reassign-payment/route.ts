import { NextResponse } from "next/server";
import { adminUnauthorizedResponse, requireAdmin } from "@/lib/auth";
import { adminReassignMemberPayee } from "@/lib/admin-actions";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const { payeeId, position } = body;

    if (!payeeId) {
      return NextResponse.json({ error: "payeeId is required" }, { status: 400 });
    }

    const result = await adminReassignMemberPayee(
      session.memberId,
      id,
      payeeId,
      position === "left" || position === "right" ? position : undefined
    );

    return NextResponse.json({
      message: `Payment reassigned to ${result.parent.fullName} (${result.parent.memberId})`,
      result: {
        payerId: result.member.memberId,
        previousPayeeId: result.previousPayee?.memberId ?? null,
        newPayeeId: result.parent.memberId,
        position: result.position,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return adminUnauthorizedResponse();
    }
    const message =
      error instanceof Error ? error.message : "Failed to reassign payment";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
