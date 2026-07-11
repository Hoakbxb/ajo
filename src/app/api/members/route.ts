import { NextResponse } from "next/server";
import { findAllMembers } from "@/lib/db/repository";

export async function GET() {
  try {
    const members = await findAllMembers();

    return NextResponse.json({
      members: members.map((m) => ({
        memberId: m.memberId,
        fullName: m.fullName,
        email: m.email,
        status: m.status,
        position: m.position,
        matrixLevel: m.matrixLevel,
        hasPaidContribution: m.hasPaidContribution,
        payoutReceived: m.payoutReceived,
        joinedAt: m.joinedAt,
      })),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch members";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
