/**
 * One outgoing payment per cycle — enforced at the application and database layer.
 */
import {
  contributionExists,
  createContribution,
  deleteContributions,
  findContributions,
  findMemberById,
  findOneContribution,
  updateMember,
} from "@/lib/db/repository";
import type { Contribution, Member } from "@/types/database";
import { CONTRIBUTION_AMOUNT } from "@/lib/constants";
import { getContributionAmount } from "@/lib/platform-settings";
import { syncContributionTransactions } from "@/lib/transaction-ledger";
import { canReceiveMemberPayments } from "@/lib/member-status";

const ACTIVE_OUTGOING_STATUSES = ["pending", "awaiting_confirmation"] as const;
const NON_DECLINED_STATUSES = [
  "pending",
  "awaiting_confirmation",
  "confirmed",
] as const;

/** Cycle the member is in or entering. */
export function getCurrentCycleNumber(member: {
  cyclesCompleted?: number;
}): number {
  return (member.cyclesCompleted ?? 0) + 1;
}

export async function getOutgoingForCycle(memberId: string, cycleNumber: number) {
  return findOneContribution({
    fromMemberId: memberId,
    cycleNumber,
    status: [...NON_DECLINED_STATUSES],
  });
}

export async function hasConfirmedPaymentForCycle(
  member: Member,
  cycleNumber = getCurrentCycleNumber(member)
): Promise<boolean> {
  if (member.hasPaidContribution) return true;
  return contributionExists({
    fromMemberId: member.id,
    cycleNumber,
    status: "confirmed",
  });
}

/** Keep at most one pending/awaiting outgoing per member (any cycle). */
export async function enforceOneActiveOutgoing(memberId: string) {
  const actives = await findContributions({
    fromMemberId: memberId,
    status: [...ACTIVE_OUTGOING_STATUSES],
  });

  if (actives.length <= 1) return actives[0] ?? null;

  await deleteContributions({
    ids: actives.slice(0, -1).map((c) => c.id),
  });
  return actives[actives.length - 1];
}

/** Activate member when a confirmed payment exists for the current cycle. */
export async function syncPaidStateForCurrentCycle(member: Member) {
  if (member.hasPaidContribution && member.status === "active") return;

  const cycleNumber = getCurrentCycleNumber(member);
  const confirmed = await findOneContribution({
    fromMemberId: member.id,
    cycleNumber,
    status: "confirmed",
  });

  if (!confirmed) return;

  await updateMember(member.id, {
    hasPaidContribution: true,
    status: "active",
  });
  member.hasPaidContribution = true;
  member.status = "active";

  await deleteContributions({
    fromMemberId: member.id,
    status: [...ACTIVE_OUTGOING_STATUSES],
  });
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "23505"
  );
}

/**
 * Create exactly one outgoing contribution for the member's current cycle.
 * Returns null when payment is not needed or already recorded.
 */
export async function createOutgoingContributionForCycle(
  member: Member,
  toMemberId: string
): Promise<Contribution | null> {
  const recipient = await findMemberById(toMemberId);
  if (!recipient || !canReceiveMemberPayments(recipient)) {
    return null;
  }

  const cycleNumber = getCurrentCycleNumber(member);

  if (member.hasPaidContribution || member.isSuspended) return null;

  const existing = await getOutgoingForCycle(member.id, cycleNumber);
  if (existing) {
    if (existing.status === "confirmed") {
      await syncPaidStateForCurrentCycle(member);
      return null;
    }
    await syncContributionTransactions(existing);
    return existing;
  }

  await enforceOneActiveOutgoing(member.id);

  const amount = await getContributionAmount();

  try {
    const contribution = await createContribution({
      fromMemberId: member.id,
      toMemberId,
      amount,
      cycleNumber,
      status: "pending",
    });
    await syncContributionTransactions(contribution);
    return contribution;
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return getOutgoingForCycle(member.id, cycleNumber);
    }
    throw error;
  }
}

/** True only when the member must pay ₦5,000 for the current cycle right now. */
export async function memberOwesPaymentForCurrentCycle(
  member: Member
): Promise<boolean> {
  if (member.hasPaidContribution || member.status === "active") return false;
  if (member.requiresAdminContact) return false;

  const cycleNumber = getCurrentCycleNumber(member);
  if (await hasConfirmedPaymentForCycle(member, cycleNumber)) return false;

  const outgoing = await getOutgoingForCycle(member.id, cycleNumber);
  if (!outgoing) return false;
  if (outgoing.status === "awaiting_confirmation") return false;

  return outgoing.status === "pending";
}

export function computeContributionOwed(
  member: { hasPaidContribution: boolean; status: string },
  outgoingForCurrentCycle: { status: string }[],
  contributionAmount = CONTRIBUTION_AMOUNT
): number {
  if (member.hasPaidContribution || member.status === "active") return 0;

  const awaiting = outgoingForCurrentCycle.some(
    (c) => c.status === "awaiting_confirmation"
  );
  if (awaiting) return 0;

  const pending = outgoingForCurrentCycle.some((c) => c.status === "pending");
  return pending ? contributionAmount : 0;
}

/** Guards against assigning a new payment to someone who already paid this cycle. */
export async function canAssignNewPayment(member: Member): Promise<boolean> {
  if (member.hasPaidContribution || member.status === "active") return false;
  const cycleNumber = getCurrentCycleNumber(member);
  return !(await hasConfirmedPaymentForCycle(member, cycleNumber));
}
