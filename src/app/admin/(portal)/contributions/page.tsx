import { findContributions, findAllMembers } from "@/lib/db/repository";
import { populateContributions } from "@/lib/db/populate";
import { getMemberCircleProgress } from "@/lib/admin-matrix";
import AdminContributionsContent from "./components/AdminContributionsContent";

export default async function AdminContributionsPage() {
  const [contributions, members] = await Promise.all([
    findContributions({}),
    findAllMembers(),
  ]);
  const populated = await populateContributions(
    contributions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  );
  const byId = new Map(members.map((m) => [m.id, m]));

  const withCircle = populated.map((contribution) => {
    const payeeId =
      typeof contribution.toMemberId === "object" &&
      contribution.toMemberId !== null &&
      "_id" in contribution.toMemberId
        ? String(contribution.toMemberId._id)
        : String(contribution.toMemberId);
    const payee = byId.get(payeeId);

    return {
      ...contribution,
      payeeCircle: payee ? getMemberCircleProgress(payee, byId) : null,
    };
  });

  return (
    <AdminContributionsContent
      contributions={JSON.parse(JSON.stringify(withCircle))}
    />
  );
}
