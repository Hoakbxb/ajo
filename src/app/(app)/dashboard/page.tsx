import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import DashboardContent from "./components/DashboardContent";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/");

  return <DashboardContent memberId={session.memberId} />;
}
