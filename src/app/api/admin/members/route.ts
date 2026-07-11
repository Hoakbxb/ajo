import { NextResponse } from "next/server";
import { findAllMembers } from "@/lib/db/repository";
import { adminUnauthorizedResponse, requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
    const members = await findAllMembers();

    return NextResponse.json({
      members: members.map((m) => ({
        id: m.id,
        memberId: m.memberId,
        fullName: m.fullName,
        email: m.email,
        phone: m.phone,
        status: m.status,
        role: m.role,
        position: m.position,
        matrixLevel: m.matrixLevel,
        hasPaidContribution: m.hasPaidContribution,
        payoutAmount: m.payoutAmount,
        cyclesCompleted: m.cyclesCompleted,
        requiresAdminContact: m.requiresAdminContact,
        paymentRejectionCount: m.paymentRejectionCount,
        joinedAt: m.joinedAt,
      })),
    });
  } catch {
    return adminUnauthorizedResponse();
  }
}
