"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ProButton } from "@/app/(app)/dashboard/components/dashboard-ui";

export interface PayeeCandidate {
  id: string;
  memberId: string;
  fullName: string;
  status: string;
}

export default function AdminReassignPayeeForm({
  mode,
  payerMemberId,
  contributionId,
  currentPayeeName,
  currentPayeeMemberId,
  candidates,
  onSuccess,
}: {
  mode: "member" | "contribution";
  payerMemberId?: string;
  contributionId?: string;
  currentPayeeName?: string | null;
  currentPayeeMemberId?: string | null;
  candidates: PayeeCandidate[];
  onSuccess?: (message: string) => void;
}) {
  const router = useRouter();
  const [payeeId, setPayeeId] = useState("");
  const [position, setPosition] = useState<"left" | "right" | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!payeeId) {
      setError("Select a new payee");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const endpoint =
        mode === "contribution" && contributionId
          ? `/api/admin/contributions/${contributionId}`
          : `/api/admin/members/${payerMemberId}/reassign-payment`;

      const body =
        mode === "contribution"
          ? {
              action: "change_payee",
              payeeId,
              ...(position ? { position } : {}),
            }
          : { payeeId, ...(position ? { position } : {}) };

      const res = await fetch(endpoint, {
        method: mode === "contribution" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      onSuccess?.(data.message ?? "Payee updated");
      setPayeeId("");
      setPosition("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reassign payee");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {currentPayeeName && (
        <p className="text-sm text-slate-600">
          Current payee:{" "}
          <span className="font-medium text-slate-900">
            {currentPayeeName}
            {currentPayeeMemberId ? ` (${currentPayeeMemberId})` : ""}
          </span>
        </p>
      )}

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-slate-500">
          New payee (recipient)
        </label>
        <select
          required
          value={payeeId}
          onChange={(e) => setPayeeId(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-amber-500"
        >
          <option value="">Select payee...</option>
          {candidates.map((m) => (
            <option key={m.id} value={m.id}>
              {m.fullName} ({m.memberId}) — {m.status}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-500">
          Matrix position (optional)
        </label>
        <select
          value={position}
          onChange={(e) =>
            setPosition(e.target.value as "left" | "right" | "")
          }
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-amber-500"
        >
          <option value="">Auto (first open slot)</option>
          <option value="left">Left</option>
          <option value="right">Right</option>
        </select>
      </div>

      <ProButton type="submit" disabled={loading}>
        {loading ? "Reassigning..." : "Reassign payment / change payee"}
      </ProButton>
    </form>
  );
}
