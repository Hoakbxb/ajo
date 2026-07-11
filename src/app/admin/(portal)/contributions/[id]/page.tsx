import { notFound } from "next/navigation";
import {
  findAllMembers,
  findContributionById,
} from "@/lib/db/repository";
import { populateContributions } from "@/lib/db/populate";
import { enrichContributionsWithProofUrls } from "@/lib/payment-proof";
import AdminContributionDetail from "../components/AdminContributionDetail";

export default async function AdminContributionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contribution = await findContributionById(id);
  if (!contribution) notFound();

  const [populated, allMembers] = await Promise.all([
    enrichContributionsWithProofUrls(
      await populateContributions([contribution])
    ).then(([c]) => c),
    findAllMembers(),
  ]);

  const serialized = JSON.parse(JSON.stringify(populated));
  const payeeCandidates = allMembers
    .filter(
      (m) =>
        m.id !== contribution.fromMemberId &&
        m.role !== "admin" &&
        m.status === "active"
    )
    .map((m) => ({
      id: m.id,
      memberId: m.memberId,
      fullName: m.fullName,
      status: m.status,
    }));

  return (
    <AdminContributionDetail
      contribution={serialized}
      payeeCandidates={JSON.parse(JSON.stringify(payeeCandidates))}
    />
  );
}
