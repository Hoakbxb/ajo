import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { redeemReferralBalance } from "@/lib/referrals";

export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await redeemReferralBalance(session.memberId);

    return NextResponse.json({
      message: result.contributionApplied
        ? "Referral earnings applied to your contribution automatically"
        : "Referral earnings added to your contribution credit",
      ...result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to redeem referral balance";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
