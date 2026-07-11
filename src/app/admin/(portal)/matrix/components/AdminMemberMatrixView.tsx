"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Network } from "lucide-react";
import MatrixTree from "@/components/MatrixTree";
import type { MatrixNode } from "@/types";
import type { AdminMatrixRow } from "@/types/admin";
import {
  ProBadge,
  ProCard,
  ProDataCell,
  ProDataGrid,
} from "@/app/(app)/dashboard/components/dashboard-ui";
import { AdminPageHeader, AdminRefreshButton } from "../../components/AdminAdvanced";
import { useAdminRealtime } from "@/hooks/useAdminRealtime";

export default function AdminMemberMatrixView({
  row,
  initialTree,
}: {
  row: AdminMatrixRow;
  initialTree: MatrixNode | null;
}) {
  const router = useRouter();
  const [tree, setTree] = useState<MatrixNode | null>(initialTree);
  const [depth, setDepth] = useState(3);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(() => router.refresh(), [router]);
  useAdminRealtime(refresh);

  async function loadTree() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        memberId: row.id,
        depth: String(depth),
      });
      const res = await fetch(`/api/admin/matrix?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTree(data.tree);
    } catch {
      // keep existing tree on error
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTree();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depth, row.id]);

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200/80 pb-6">
        <Link
          href="/admin/matrix"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to matrix table
        </Link>
      </header>

      <AdminPageHeader
        title={row.fullName}
        description={`${row.memberId} · level ${row.matrixLevel}`}
        actions={
          <>
            <AdminRefreshButton />
            <Link
              href={`/admin/members/${row.id}`}
              className="inline-flex rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Manage member
            </Link>
          </>
        }
      />

      <div className="flex flex-wrap gap-2">
        <ProBadge accent={row.status === "active" ? "emerald" : "amber"}>
          {row.status}
        </ProBadge>
        {row.role === "admin" && <ProBadge accent="violet">admin</ProBadge>}
        {row.bothChildrenPaid && (
          <ProBadge accent="emerald">cycle ready</ProBadge>
        )}
        <ProBadge accent="slate">
          {row.slotsFilled}/2 slots filled
        </ProBadge>
      </div>

      <ProCard
        accent="slate"
        title="Placement"
        description="Current position in the community matrix"
        icon={Network}
      >
        <ProDataGrid>
          <ProDataCell
            label="Upline"
            value={row.parent?.fullName ?? "None"}
          />
          <ProDataCell label="Position" value={row.parent ? row.position : "—"} />
          <ProDataCell
            label="Matrix level"
            value={String(row.matrixLevel)}
          />
          <ProDataCell
            label="Cycles completed"
            value={String(row.cyclesCompleted)}
          />
          <ProDataCell
            label="Left child"
            value={
              row.leftChild
                ? `${row.leftChild.fullName}${row.leftChild.hasPaidContribution ? " (paid)" : ""}`
                : "Open slot"
            }
          />
          <ProDataCell
            label="Right child"
            value={
              row.rightChild
                ? `${row.rightChild.fullName}${row.rightChild.hasPaidContribution ? " (paid)" : ""}`
                : "Open slot"
            }
          />
        </ProDataGrid>

        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          {row.parent && (
            <Link
              href={`/admin/matrix/${row.parent.id}`}
              className="font-medium text-amber-700 hover:text-amber-900"
            >
              View upline matrix →
            </Link>
          )}
          {row.leftChild && (
            <Link
              href={`/admin/matrix/${row.leftChild.id}`}
              className="font-medium text-slate-600 hover:text-slate-900"
            >
              Left: {row.leftChild.fullName} →
            </Link>
          )}
          {row.rightChild && (
            <Link
              href={`/admin/matrix/${row.rightChild.id}`}
              className="font-medium text-slate-600 hover:text-slate-900"
            >
              Right: {row.rightChild.fullName} →
            </Link>
          )}
        </div>
      </ProCard>

      <ProCard
        accent="indigo"
        title="Member matrix tree"
        description={
          loading
            ? "Loading tree..."
            : `Subtree rooted at ${row.fullName} · depth ${depth}`
        }
        icon={Network}
        action={
          <div className="flex items-center gap-3">
            <label className="text-xs text-slate-500">Depth</label>
            <input
              type="range"
              min={1}
              max={5}
              value={depth}
              onChange={(e) => setDepth(Number(e.target.value))}
              className="w-24"
            />
            <span className="text-xs font-medium text-slate-700">{depth}</span>
          </div>
        }
      >
        <MatrixTree tree={tree} maxDepth={depth} />
      </ProCard>
    </div>
  );
}
