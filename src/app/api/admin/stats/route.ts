import { NextResponse } from "next/server";
import {
  countContributions,
  countMembers,
  countMembersWithFilter,
  findMembers,
} from "@/lib/db/repository";
import { CONTRIBUTION_AMOUNT, PAYOUT_AMOUNT } from "@/lib/constants";
import { getAdminMatchingMetrics } from "@/lib/admin-member-metrics";
import { migrateMemberStatuses } from "@/lib/member-status-migrate";
import { adminUnauthorizedResponse, requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
    await migrateMemberStatuses();

    const [
      totalMembers,
      activeMembers,
      rewardsPaid,
      pendingContributions,
      escalations,
      matching,
    ] = await Promise.all([
      countMembers(),
      countMembersWithFilter({ status: ["active", "eligible"] }),
      countMembersWithFilter({ payoutAmountGt: 0 }),
      countContributions({ status: ["pending", "awaiting_confirmation"] }),
      findMembers({ requiresAdminContact: true }),
      getAdminMatchingMetrics(),
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
        escalationCount: escalations.length,
        totalContributionsValue: confirmedContributions * CONTRIBUTION_AMOUNT,
        totalPayoutsValue: rewardsPaid * PAYOUT_AMOUNT,
        contributionAmount: CONTRIBUTION_AMOUNT,
        payoutAmount: PAYOUT_AMOUNT,
        matching,
      },
    });
  } catch {
    return adminUnauthorizedResponse();
  }
}
