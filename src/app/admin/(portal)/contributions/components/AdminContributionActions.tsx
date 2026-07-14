"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type {
  AdminContributionAction,
  AdminContributionListItem,
} from "@/types/admin";
import { getContributionId } from "@/lib/contribution-id";
import { ProButton } from "@/app/(app)/dashboard/components/dashboard-ui";
import AdminContributionAmountForm from "./AdminContributionAmountForm";

const actionBtn =
  "inline-flex items-center rounded-lg border px-2.5 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50";

const variants = {
  primary: `${actionBtn} border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100`,
  secondary: `${actionBtn} border-slate-200 bg-white text-slate-700 hover:bg-slate-50`,
  warning: `${actionBtn} border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100`,
  danger: `${actionBtn} border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100`,
  link: "text-xs font-medium text-amber-700 hover:text-amber-900",
};

function ActionButton({
  label,
  variant = "secondary",
  disabled,
  onClick,
}: {
  label: string;
  variant?: keyof typeof variants;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={variants[variant]}
    >
      {label}
    </button>
  );
}

export default function AdminContributionActions({
  contribution,
  compact = false,
  onMessage,
}: {
  contribution: AdminContributionListItem;
  compact?: boolean;
  onMessage?: (message: string) => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showAmountForm, setShowAmountForm] = useState(false);
  const contributionId = getContributionId(contribution);

  const status = contribution.status;
  const isConfirmed = status === "confirmed";
  const isPending = status === "pending";
  const isAwaiting = status === "awaiting_confirmation";
  const isDeclined = status === "declined";
  const canModify = !isConfirmed;

  async function runAction(
    action: AdminContributionAction,
    amount?: number
  ) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/contributions/${contributionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onMessage?.(data.message ?? "Updated successfully");
      setShowAmountForm(false);
      router.refresh();
    } catch (error) {
      onMessage?.(
        error instanceof Error ? error.message : "Action failed"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    if (
      !window.confirm(
        "Cancel this contribution? The payer will be queued for rematch."
      )
    ) {
      return;
    }
    await runAction("cancel");
  }

  async function handleConfirm() {
    if (
      isPending &&
      !window.confirm(
        "Confirm this payment on behalf of the recipient? This will activate the payer."
      )
    ) {
      return;
    }
    await runAction("confirm");
  }

  if (isConfirmed) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/admin/contributions/${contributionId}`}
          className={variants.link}
        >
          View
        </Link>
        {!compact && (
          <span className="text-xs text-slate-400">Payment confirmed</span>
        )}
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex min-w-[220px] flex-wrap gap-1.5">
        <Link
          href={`/admin/contributions/${contributionId}`}
          className={variants.link}
        >
          Manage
        </Link>

        {(isPending || isAwaiting) && (
          <ActionButton
            label={loading ? "..." : "Confirm"}
            variant="primary"
            disabled={loading}
            onClick={handleConfirm}
          />
        )}

        {isPending && (
          <ActionButton
            label={loading ? "..." : "Mark claimed"}
            variant="warning"
            disabled={loading}
            onClick={() => runAction("mark_claimed")}
          />
        )}

        {isAwaiting && (
          <ActionButton
            label={loading ? "..." : "Decline"}
            variant="danger"
            disabled={loading}
            onClick={() => runAction("decline")}
          />
        )}

        {isDeclined && (
          <ActionButton
            label={loading ? "..." : "Rematch"}
            variant="warning"
            disabled={loading}
            onClick={() => runAction("rematch_payer")}
          />
        )}

        {canModify && (
          <ActionButton
            label={showAmountForm ? "Hide" : "Amount"}
            variant="secondary"
            disabled={loading}
            onClick={() => setShowAmountForm((v) => !v)}
          />
        )}

        <ActionButton
          label={loading ? "..." : "Cancel"}
          variant="danger"
          disabled={loading}
          onClick={handleCancel}
        />

        {showAmountForm && canModify && (
          <div className="mt-2 w-full basis-full">
            <AdminContributionAmountForm
              contributionId={contributionId}
              currentAmount={contribution.amount}
              onSuccess={(message) => {
                onMessage?.(message);
                setShowAmountForm(false);
              }}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(isPending || isAwaiting) && (
          <ProButton disabled={loading} onClick={handleConfirm}>
            Confirm payment
          </ProButton>
        )}

        {isPending && (
          <ProButton
            variant="secondary"
            disabled={loading}
            onClick={() => runAction("mark_claimed")}
          >
            Mark as claimed
          </ProButton>
        )}

        {isAwaiting && (
          <ProButton
            variant="secondary"
            disabled={loading}
            onClick={() => runAction("decline")}
          >
            Decline payment
          </ProButton>
        )}

        {isDeclined && (
          <ProButton
            variant="secondary"
            disabled={loading}
            onClick={() => runAction("rematch_payer")}
          >
            Rematch payer
          </ProButton>
        )}

        {canModify && (
          <ProButton
            variant="secondary"
            disabled={loading}
            onClick={() => setShowAmountForm((v) => !v)}
          >
            {showAmountForm ? "Hide amount form" : "Change amount"}
          </ProButton>
        )}

        <ProButton variant="secondary" disabled={loading} onClick={handleCancel}>
          Cancel contribution
        </ProButton>
      </div>

      {showAmountForm && canModify && (
        <AdminContributionAmountForm
          contributionId={contributionId}
          currentAmount={contribution.amount}
          label={`${contribution.fromMemberId.fullName} → ${contribution.toMemberId.fullName}`}
          onSuccess={(message) => {
            onMessage?.(message);
            setShowAmountForm(false);
          }}
        />
      )}
    </div>
  );
}
