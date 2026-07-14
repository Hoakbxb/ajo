import { notFound } from "next/navigation";
import {
  findAllMembers,
  findContributionById,
} from "@/lib/db/repository";
import { populateContributions } from "@/lib/db/populate";
import { enrichContributionsWithProofUrls } from "@/lib/payment-proof";
import { withContributionId } from "@/lib/contribution-id";
import AdminContributionDetail from "../components/AdminContributionDetail";

export const dynamic = "force-dynamic";

export default async function AdminContributionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contributionId = id?.trim();
  if (!contributionId || contributionId === "undefined") {
    notFound();
  }

  const contribution = await findContributionById(contributionId);
  if (!contribution) notFound();

  const [populatedRows, allMembers] = await Promise.all([
    enrichContributionsWithProofUrls(
      await populateContributions([contribution])
    ),
    findAllMembers(),
  ]);

  const populated = populatedRows[0];
  if (!populated) notFound();

  const serialized = JSON.parse(
    JSON.stringify(withContributionId(populated))
  );
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
