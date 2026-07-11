import { findMembers } from "@/lib/db/repository";
import AdminEscalationsContent from "./components/AdminEscalationsContent";

export default async function AdminEscalationsPage() {
  const members = await findMembers({ requiresAdminContact: true });

  return (
    <AdminEscalationsContent members={JSON.parse(JSON.stringify(members))} />
  );
}
