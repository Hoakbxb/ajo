import { notFound } from "next/navigation";
import {
  findAllMembers,
  findContributions,
  findMemberById,
} from "@/lib/db/repository";
import { populateContributions, populateMemberRef } from "@/lib/db/populate";
import { withContributionId } from "@/lib/contribution-id";
import AdminMemberDetail from "../components/AdminMemberDetail";

export default async function AdminMemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const member = await findMemberById(id);
  if (!member) notFound();

  const [parent, outgoingRaw, incomingRaw, allMembers] = await Promise.all([
    populateMemberRef(member.parentId, ["memberId", "fullName"]),
    findContributions({ fromMemberId: member.id }),
    findContributions({ toMemberId: member.id }),
    findAllMembers(),
  ]);

  const [outgoing, incoming] = await Promise.all([
    populateContributions(outgoingRaw),
    populateContributions(incomingRaw),
  ]);

  return (
    <AdminMemberDetail
      member={JSON.parse(JSON.stringify({ ...member, parentId: parent }))}
      outgoing={JSON.parse(
        JSON.stringify(outgoing.map((item) => withContributionId(item)))
      )}
      incoming={JSON.parse(
        JSON.stringify(incoming.map((item) => withContributionId(item)))
      )}
      allMembers={JSON.parse(
        JSON.stringify(
          allMembers
            .filter((m) => m.id !== member.id && m.role !== "admin")
            .map((m) => ({
              id: m.id,
              memberId: m.memberId,
              fullName: m.fullName,
              status: m.status,
            }))
        )
      )}
      payeeCandidates={JSON.parse(
        JSON.stringify(
          allMembers
            .filter(
              (m) =>
                m.id !== member.id &&
                m.role !== "admin" &&
                m.status === "active"
            )
            .map((m) => ({
              id: m.id,
              memberId: m.memberId,
              fullName: m.fullName,
              status: m.status,
            }))
        )
      )}
    />
  );
}
