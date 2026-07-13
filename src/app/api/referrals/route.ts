import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { findMemberById } from "@/lib/db/repository";
import { getReferralSummary } from "@/lib/referrals";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const member = await findMemberById(session.memberId);
    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const summary = await getReferralSummary(member);
    return NextResponse.json(summary);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load referrals";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
