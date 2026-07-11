import {
  findAllMembers,
  findContributions,
} from "@/lib/db/repository";
import {
  buildAdminMatchingMetrics,
  getMemberMatchPaymentStatus,
} from "@/lib/admin-member-metrics";
import AdminMembersContent from "./components/AdminMembersContent";

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const [members, activeOutgoing] = await Promise.all([
    findAllMembers(),
    findContributions({ status: ["pending", "awaiting_confirmation"] }),
  ]);

  const outgoingByPayer = new Map<string, typeof activeOutgoing>();
  for (const contribution of activeOutgoing) {
    const list = outgoingByPayer.get(contribution.fromMemberId) ?? [];
    list.push(contribution);
    outgoingByPayer.set(contribution.fromMemberId, list);
  }

  const enriched = members.map((member) => ({
    ...member,
    joinedAt: member.joinedAt.toISOString(),
    matchPaymentStatus: getMemberMatchPaymentStatus(
      member,
      outgoingByPayer.get(member.id) ?? []
    ),
  }));

  const matching = buildAdminMatchingMetrics(members, activeOutgoing);

  return (
    <AdminMembersContent
      members={JSON.parse(JSON.stringify(enriched))}
      matching={JSON.parse(JSON.stringify(matching))}
      initialFilter={filter}
    />
  );
}
