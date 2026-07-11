import { NextResponse } from "next/server";
import {
  countContributions,
  countMembers,
  countMembersWithFilter,
} from "@/lib/db/repository";
import { CONTRIBUTION_AMOUNT, PAYOUT_AMOUNT } from "@/lib/constants";
import { migrateMemberStatuses } from "@/lib/member-status-migrate";

export async function GET() {
  try {
    await migrateMemberStatuses();

    const [totalMembers, activeMembers, rewardsPaid, pendingContributions] =
      await Promise.all([
        countMembers(),
        countMembersWithFilter({ status: ["active", "eligible"] }),
        countMembersWithFilter({ payoutAmountGt: 0 }),
        countContributions({
          status: ["pending", "awaiting_confirmation"],
        }),
      ]);

    const confirmedContributions = await countContributions({
      status: "confirmed",
    });

    return NextResponse.json({
      stats: {
        totalMembers,
        activeMembers,
        completeMembers: rewardsPaid,
        pendingContributions,
        confirmedContributions,
        totalContributionsValue: confirmedContributions * CONTRIBUTION_AMOUNT,
        totalPayoutsValue: rewardsPaid * PAYOUT_AMOUNT,
        contributionAmount: CONTRIBUTION_AMOUNT,
        payoutAmount: PAYOUT_AMOUNT,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch stats";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
