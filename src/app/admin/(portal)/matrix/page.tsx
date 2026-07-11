import { findAllMembers } from "@/lib/db/repository";
import { buildAdminMatrixRows } from "@/lib/admin-matrix";
import AdminMatrixContent from "./components/AdminMatrixContent";

export default async function AdminMatrixPage() {
  const members = await findAllMembers();
  const rows = buildAdminMatrixRows(members);

  return (
    <AdminMatrixContent rows={JSON.parse(JSON.stringify(rows))} />
  );
}
