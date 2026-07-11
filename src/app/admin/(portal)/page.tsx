import {
  countContributions,
  countMembers,
  countMembersWithFilter,
  findAdminActivityLogs,
  findContributions,
  findMemberById,
  findMembers,
  findAllMembers,
} from "@/lib/db/repository";
import { CONTRIBUTION_AMOUNT, PAYOUT_AMOUNT } from "@/lib/constants";
import {
  buildAdminMatchingMetrics,
  getMemberMatchPaymentStatus,
} from "@/lib/admin-member-metrics";
import { migrateMemberStatuses } from "@/lib/member-status-migrate";
import AdminOverview from "./components/AdminOverview";

export default async function AdminDashboardPage() {
  await migrateMemberStatuses();

  const [
    totalMembers,
    activeMembers,
    rewardsPaid,
    pendingContributions,
    escalations,
    logs,
    allMembers,
    activeOutgoing,
  ] = await Promise.all([
    countMembers(),
    countMembersWithFilter({ status: ["active", "eligible"] }),
    countMembersWithFilter({ payoutAmountGt: 0 }),
    countContributions({ status: ["pending", "awaiting_confirmation"] }),
    findMembers({ requiresAdminContact: true }),
    findAdminActivityLogs(8),
    findAllMembers(),
    findContributions({ status: ["pending", "awaiting_confirmation"] }),
  ]);

  const confirmedContributions = await countContributions({
    status: "confirmed",
  });

  const adminIds = [...new Set(logs.map((log) => log.adminMemberId))];
  const admins = await Promise.all(adminIds.map((id) => findMemberById(id)));
  const adminNames = Object.fromEntries(
    admins.filter(Boolean).map((admin) => [admin!.id, admin!.fullName])
  );

  const stats = {
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
    matching: buildAdminMatchingMetrics(allMembers, activeOutgoing),
  };

  const recentActivity = logs.map((log) => ({
    ...log,
    createdAt: log.createdAt.toISOString(),
    adminName: adminNames[log.adminMemberId] ?? "Admin",
  }));

  return (
    <AdminOverview
      stats={stats}
      recentActivity={JSON.parse(JSON.stringify(recentActivity))}
    />
  );
}
