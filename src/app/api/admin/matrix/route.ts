import { NextResponse } from "next/server";
import { findAllMembers } from "@/lib/db/repository";
import { adminUnauthorizedResponse, requireAdmin } from "@/lib/auth";
import { adminRunMatrixMaintenance } from "@/lib/admin-actions";
import { buildAdminMatrixRows } from "@/lib/admin-matrix";
import { buildMatrixTree } from "@/lib/matrix";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId");
    const depth = parseInt(searchParams.get("depth") ?? "3", 10);

    const members = await findAllMembers();
    const rows = buildAdminMatrixRows(members);

    if (memberId) {
      const tree = await buildMatrixTree(memberId, depth);
      const member = members.find((m) => m.id === memberId);
      if (!member) {
        return NextResponse.json({ error: "Member not found" }, { status: 404 });
      }
      return NextResponse.json({
        member: {
          id: member.id,
          memberId: member.memberId,
          fullName: member.fullName,
          status: member.status,
          position: member.position,
          matrixLevel: member.matrixLevel,
        },
        tree,
      });
    }

    return NextResponse.json({ rows });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return adminUnauthorizedResponse();
    }
    return NextResponse.json(
      { error: "Failed to fetch matrix data" },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const session = await requireAdmin();
    const result = await adminRunMatrixMaintenance(session.memberId);
    return NextResponse.json({
      message: "Matrix maintenance completed",
      result,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return adminUnauthorizedResponse();
    }
    const message =
      error instanceof Error ? error.message : "Matrix maintenance failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
