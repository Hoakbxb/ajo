import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { findContributions, findMemberById } from "@/lib/db/repository";
import { populateMemberRef } from "@/lib/db/populate";
import { getPaymentStatus } from "@/lib/payment-status";
import { getCurrentCycleNumber } from "@/lib/cycle-payment";
import ProfileContent from "./components/ProfileContent";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/");

  const member = await findMemberById(session.memberId);
  if (!member) redirect("/");

  const parent = await populateMemberRef(member.parentId, [
    "memberId",
    "fullName",
  ]);

  const allOutgoing = await findContributions({ fromMemberId: member.id });
  const currentCycle = getCurrentCycleNumber(member);
  const outgoingContributions = allOutgoing.filter(
    (c) => c.cycleNumber === currentCycle
  );
  const paymentStatus = getPaymentStatus(member, outgoingContributions);

  return (
    <ProfileContent
      member={JSON.parse(
        JSON.stringify({ ...member, parentId: parent })
      )}
      paymentStatus={paymentStatus}
    />
  );
}
