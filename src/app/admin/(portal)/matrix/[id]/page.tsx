import { notFound } from "next/navigation";
import { findAllMembers, findMemberById } from "@/lib/db/repository";
import { buildAdminMatrixRows } from "@/lib/admin-matrix";
import { buildMatrixTree } from "@/lib/matrix";
import AdminMemberMatrixView from "../components/AdminMemberMatrixView";

export default async function AdminMemberMatrixPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const member = await findMemberById(id);
  if (!member) notFound();

  const members = await findAllMembers();
  const rows = buildAdminMatrixRows(members);
  const row = rows.find((r) => r.id === id);
  if (!row) notFound();

  const tree = await buildMatrixTree(id, 3);

  return (
    <AdminMemberMatrixView
      row={JSON.parse(JSON.stringify(row))}
      initialTree={JSON.parse(JSON.stringify(tree))}
    />
  );
}
