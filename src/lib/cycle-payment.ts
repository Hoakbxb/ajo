/**
 * One outgoing payment per cycle — enforced at the application and database layer.
 */
import {
  contributionExists,
  createContribution,
  deleteContributions,
  findActiveBuilders,
  findAllMembers,
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

/** True when this member already completed a payment to the given upline. */
export async function hasConfirmedPaymentToUpline(
  memberId: string,
  uplineId: string
): Promise<boolean> {
  return !!(await findOneContribution({
    fromMemberId: memberId,
    toMemberId: uplineId,
    status: "confirmed",
  }));
}

/** Activate member when a confirmed payment exists for the current cycle. */
export async function syncPaidStateForCurrentCycle(member: Member) {
  if (member.hasPaidContribution && member.status === "active") return;

  const cycleNumber = getCurrentCycleNumber(member);
  let confirmed = await findOneContribution({
    fromMemberId: member.id,
    cycleNumber,
    status: "confirmed",
  });

  // Child paid their upline but cycle_number may not match getCurrentCycleNumber.
  if (!confirmed && member.parentId) {
    confirmed = await findOneContribution({
      fromMemberId: member.id,
      toMemberId: member.parentId,
      status: "confirmed",
    });
  }

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

  if (await hasConfirmedPaymentToUpline(member.id, toMemberId)) return null;

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

/** Distinct payers currently assigned to an upline's open matrix (tree + pending). */
export async function getAssignedPayerIds(upline: Member): Promise<Set<string>> {
  const ids = new Set<string>();
  if (upline.leftChildId) ids.add(upline.leftChildId);
  if (upline.rightChildId) ids.add(upline.rightChildId);

  const pendingIncoming = await findContributions({
    toMemberId: upline.id,
    status: [...ACTIVE_OUTGOING_STATUSES],
  });
  for (const c of pendingIncoming) {
    ids.add(c.fromMemberId);
  }
  return ids;
}

/**
 * Remove duplicate payer assignments: same member paying one upline twice,
 * or more than two payers assigned to one upline's current matrix.
 */
export async function pruneDuplicatePayerAssignments(): Promise<void> {
  const members = await findAllMembers();

  for (const m of members) {
    const confirmedOutgoing = await findContributions({
      fromMemberId: m.id,
      status: "confirmed",
    });

    for (const confirmed of confirmedOutgoing) {
      const duplicates = await findContributions({
        fromMemberId: m.id,
        toMemberId: confirmed.toMemberId,
        status: [...ACTIVE_OUTGOING_STATUSES],
      });
      for (const dup of duplicates) {
        await deleteContributions({ ids: [dup.id] });
      }
    }

    if (m.parentId && !m.hasPaidContribution) {
      const paidParent = await hasConfirmedPaymentToUpline(m.id, m.parentId);
      if (paidParent) {
        await updateMember(m.id, {
          hasPaidContribution: true,
          status: "active",
        });
        const extraPending = await findContributions({
          fromMemberId: m.id,
          toMemberId: m.parentId,
          status: [...ACTIVE_OUTGOING_STATUSES],
        });
        if (extraPending.length) {
          await deleteContributions({ ids: extraPending.map((c) => c.id) });
        }
      }
    }
  }

  const builders = await findActiveBuilders();
  for (const upline of builders) {
    const pendingIncoming = await findContributions({
      toMemberId: upline.id,
      status: [...ACTIVE_OUTGOING_STATUSES],
    });

    for (const c of pendingIncoming) {
      if (await hasConfirmedPaymentToUpline(c.fromMemberId, upline.id)) {
        await deleteContributions({ ids: [c.id] });
        const payer = await findMemberById(c.fromMemberId);
        if (payer && !payer.hasPaidContribution) {
          await updateMember(payer.id, {
            hasPaidContribution: true,
            status: "active",
          });
        }
      }
    }

    const fresh = (await findMemberById(upline.id)) ?? upline;
    let assigned = await getAssignedPayerIds(fresh);
    if (assigned.size <= 2) continue;

    const stillPending = await findContributions({
      toMemberId: fresh.id,
      status: [...ACTIVE_OUTGOING_STATUSES],
    });
    const treeIds = new Set(
      [fresh.leftChildId, fresh.rightChildId].filter(Boolean) as string[]
    );

    const excess = stillPending
      .filter((c) => !treeIds.has(c.fromMemberId))
      .sort(
        (a, b) =>
          (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)
      );

    for (const c of excess) {
      assigned = await getAssignedPayerIds(
        (await findMemberById(fresh.id)) ?? fresh
      );
      if (assigned.size <= 2) break;

      await deleteContributions({ ids: [c.id] });
      await updateMember(c.fromMemberId, {
        parentId: null,
        rematchAfter: new Date(0),
      });
    }
  }
}

export async function uplineHasOpenPaymentSlot(upline: Member): Promise<boolean> {
  const assigned = await getAssignedPayerIds(upline);
  return assigned.size < 2;
}

export async function nextOpenPositionForUpline(
  upline: Member
): Promise<"left" | "right" | null> {
  if (!(await uplineHasOpenPaymentSlot(upline))) return null;
  if (!upline.leftChildId) return "left";
  if (!upline.rightChildId) return "right";
  return null;
}

/** Both matrix slots filled with downlines who confirmed payment to this upline. */
export async function uplineMatrixReadyForPayout(upline: Member): Promise<boolean> {
  if (!upline.leftChildId || !upline.rightChildId) return false;

  const [left, right] = await Promise.all([
    findMemberById(upline.leftChildId),
    findMemberById(upline.rightChildId),
  ]);
  if (!left || !right) return false;
  if (left.parentId !== upline.id || right.parentId !== upline.id) return false;

  const [leftPaid, rightPaid] = await Promise.all([
    findOneContribution({
      fromMemberId: left.id,
      toMemberId: upline.id,
      status: "confirmed",
    }),
    findOneContribution({
      fromMemberId: right.id,
      toMemberId: upline.id,
      status: "confirmed",
    }),
  ]);

  return !!leftPaid && !!rightPaid;
}
