import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { findMemberById } from "@/lib/db/repository";
import { getReferralSummary } from "@/lib/referrals";
import WalletContent from "./components/WalletContent";

export default async function WalletPage() {
  const session = await getSession();
  if (!session) redirect("/");

  const member = await findMemberById(session.memberId);
  if (!member) redirect("/");

  const summary = await getReferralSummary(member);

  return <WalletContent initialSummary={JSON.parse(JSON.stringify(summary))} />;
}
