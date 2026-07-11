import type { MatrixNode } from "@/types";
import { isActiveStatus, isPendingStatus } from "@/lib/member-status";

function statusColor(node: MatrixNode) {
  if (node.payoutReceived) return "border-amber-400 bg-amber-50";
  if (isActiveStatus(node.status)) return "border-emerald-400 bg-emerald-50";
  if (isPendingStatus(node.status)) return "border-orange-300 bg-orange-50";
  return "border-gray-200 bg-gray-50";
}

function NodeCard({ node }: { node: MatrixNode }) {
  return (
    <div
      className={`rounded-xl border-2 px-3 py-2 text-center shadow-sm ${statusColor(node)}`}
    >
      <p className="truncate text-xs font-bold text-emerald-900 max-w-[100px]">
        {node.fullName}
      </p>
      <p className="mt-1 text-[10px] uppercase tracking-wide text-emerald-700/60">
        {node.payoutReceived
          ? "Complete"
          : node.hasPaidContribution
            ? "Active"
            : "Pending"}
      </p>
    </div>
  );
}

function MatrixBranch({
  node,
  depth,
  maxDepth,
}: {
  node: MatrixNode | null;
  depth: number;
  maxDepth: number;
}) {
  if (!node) {
    return (
      <div className="flex flex-col items-center">
        <div className="rounded-xl border-2 border-dashed border-emerald-200 px-4 py-3 text-xs text-emerald-400">
          Open
        </div>
      </div>
    );
  }

  if (depth >= maxDepth) {
    return (
      <div className="flex flex-col items-center">
        <NodeCard node={node} />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <NodeCard node={node} />
      {(node.left || node.right || depth < maxDepth) && (
        <>
          <div className="h-6 w-px bg-emerald-300" />
          <div className="relative flex items-start gap-8 sm:gap-16">
            <div className="absolute top-0 left-1/2 h-px w-full -translate-x-1/2 bg-emerald-300" />
            <div className="flex flex-col items-center pt-4">
              <div className="h-4 w-px bg-emerald-300" />
              <MatrixBranch node={node.left} depth={depth + 1} maxDepth={maxDepth} />
            </div>
            <div className="flex flex-col items-center pt-4">
              <div className="h-4 w-px bg-emerald-300" />
              <MatrixBranch node={node.right} depth={depth + 1} maxDepth={maxDepth} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function MatrixTree({
  tree,
  maxDepth = 3,
}: {
  tree: MatrixNode | null;
  maxDepth?: number;
}) {
  if (!tree) {
    return (
      <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/50 p-12 text-center">
        <p className="text-lg font-medium text-emerald-800">No members yet</p>
        <p className="mt-2 text-sm text-emerald-600">
          Be the first to join the community!
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-emerald-900/10 bg-white p-6 sm:p-8">
      <MatrixBranch node={tree} depth={0} maxDepth={maxDepth} />
      <div className="mt-8 flex flex-wrap justify-center gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border-2 border-orange-300 bg-orange-50" />
          Pending payment
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border-2 border-emerald-400 bg-emerald-50" />
          Active
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border-2 border-amber-400 bg-amber-50" />
          Complete (₦10,000 received)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border-2 border-dashed border-emerald-200" />
          Open position
        </span>
      </div>
    </div>
  );
}
