import { NextResponse } from "next/server";
import { adminUnauthorizedResponse, requireAdmin } from "@/lib/auth";
import { adminManualMatch } from "@/lib/admin-actions";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const { parentId, position } = body;

    if (!parentId) {
      return NextResponse.json(
        { error: "parentId is required" },
        { status: 400 }
      );
    }

    const result = await adminManualMatch(
      session.memberId,
      id,
      parentId,
      position === "left" || position === "right" ? position : undefined
    );

    return NextResponse.json({
      message: "Member manually matched for payment",
      result: {
        memberId: result.member.memberId,
        parentId: result.parent.memberId,
        position: result.position,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return adminUnauthorizedResponse();
    }
    const message =
      error instanceof Error ? error.message : "Failed to match member";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
