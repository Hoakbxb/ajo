/**
 * Matrix cycle engine (Supabase-backed)
 */
import {
  createMember,
  createContribution,
  deleteContributionById,
  deleteContributions,
  deleteMember,
  expireTimedOutContributions,
  findActiveBuilders,
  findAllMembers,
  findContributionById,
  findContributions,
  findMemberById,
  findMemberByEmail,
  findMemberByPhone,
  findMembers,
  findMembersWithChild,
  findOneContribution,
  findReadyForCycleRestart,
  findTreeApexMember,
  updateContribution,
  updateMember,
} from "@/lib/db/repository";
import type { Member } from "@/types/database";
import {
  CONTRIBUTION_AMOUNT,
  PAYOUT_AMOUNT,
  PAYMENT_CONFIRMATION_TIMEOUT_MS,
  REMATCH_WAIT_TIMEOUT_MS,
} from "@/lib/constants";
import { normalizePhone } from "@/lib/phone";
import { isActiveStatus, canReceiveMemberPayments } from "@/lib/member-status";
import { migrateMemberStatuses } from "@/lib/member-status-migrate";
import {
  createOutgoingContributionForCycle,
  enforceOneActiveOutgoing,
  getCurrentCycleNumber,
  getOutgoingForCycle,
  hasConfirmedPaymentForCycle,
  syncPaidStateForCurrentCycle,
  canAssignNewPayment,
  getAssignedPayerIds,
  hasConfirmedPaymentToUpline,
  nextOpenPositionForUpline,
  pruneDuplicatePayerAssignments,
  uplineHasOpenPaymentSlot,
  uplineMatrixReadyForPayout,
} from "@/lib/cycle-payment";
import {
  recordPayoutTransaction,
  syncContributionTransactionStatus,
  syncContributionTransactions,
} from "@/lib/transaction-ledger";
import { getPayoutAmount } from "@/lib/platform-settings";

export { getCurrentCycleNumber } from "@/lib/cycle-payment";

type ChildPosition = "left" | "right";

interface Slot {
  parent: Member;
  position: ChildPosition;
  level: number;
}

export type AssignMemberResult =
  | { assigned: true; newParent: Member | null }
  | { assigned: false; waiting: true; rematchAfter: Date | null };

export interface MatrixNode {
  _id: string;
  memberId: string;
  fullName: string;
  status: string;
  position: string;
  matrixLevel: number;
  hasPaidContribution: boolean;
  payoutReceived: boolean;
  cyclesCompleted: number;
  left: MatrixNode | null;
  right: MatrixNode | null;
}

export async function generateMemberId(): Promise<string> {
  const members = await findAllMembers();
  let maxNumber = 0;
  for (const m of members) {
    const match = /^FRC-(\d+)$/.exec(m.memberId);
    if (match) {
      maxNumber = Math.max(maxNumber, Number(match[1]));
    }
  }
  return `FRC-${String(maxNumber + 1).padStart(4, "0")}`;
}

function openPositions(member: Member): ChildPosition[] {
  const open: ChildPosition[] = [];
  if (!member.leftChildId) open.push("left");
  if (!member.rightChildId) open.push("right");
  return open;
}

function slotsFilled(member: Member): number {
  return (member.leftChildId ? 1 : 0) + (member.rightChildId ? 1 : 0);
}

async function isEligibleUpline(member: Member): Promise<boolean> {
  return (
    canReceiveMemberPayments(member) &&
    member.status === "active" &&
    member.hasPaidContribution &&
    openPositions(member).length > 0 &&
    (await uplineHasOpenPaymentSlot(member))
  );
}

function memberSortTime(member: Member): number {
  return member.joinedAt?.getTime() ?? member.createdAt?.getTime() ?? 0;
}

/** Oldest members first (first come, first served). */
function sortFirstComeFirstServed(members: Member[]): Member[] {
  return [...members].sort((a, b) => memberSortTime(a) - memberSortTime(b));
}

async function getSubtreeIds(anchor: Member): Promise<string[]> {
  const ids = new Set<string>([anchor.id]);
  const queue: string[] = [];
  if (anchor.leftChildId) queue.push(anchor.leftChildId);
  if (anchor.rightChildId) queue.push(anchor.rightChildId);

  while (queue.length > 0) {
    const childId = queue.shift()!;
    if (ids.has(childId)) continue;
    ids.add(childId);

    const child = await findMemberById(childId);
    if (!child) continue;
    if (child.leftChildId) queue.push(child.leftChildId);
    if (child.rightChildId) queue.push(child.rightChildId);
  }

  return [...ids];
}

async function wouldCreateCycle(member: Member, parent: Member): Promise<boolean> {
  if (parent.id === member.id) return true;

  const visited = new Set<string>();
  let currentId: string | null = parent.parentId;

  while (currentId) {
    if (currentId === member.id) return true;
    if (visited.has(currentId)) break;
    visited.add(currentId);

    const ancestor = await findMemberById(currentId);
    if (!ancestor) break;
    currentId = ancestor.parentId;
  }

  return false;
}

async function clearPendingOutgoing(memberId: string) {
  await deleteContributions({
    fromMemberId: memberId,
    status: ["pending", "awaiting_confirmation"],
  });
}

async function detachFromParent(member: Member) {
  if (!member.parentId) return;

  const parent = await findMemberById(member.parentId);
  if (!parent) return;

  const field = member.position === "left" ? "leftChildId" : "rightChildId";
  if (parent[field] === member.id) {
    await updateMember(parent.id, { [field]: null });
  }
}

export async function findPaymentSlot(
  excludeMemberIds: string[] = [],
  payerMemberId?: string
): Promise<Slot | null> {
  const exclude = new Set(excludeMemberIds);
  const eligible: Member[] = [];

  const builders = await findActiveBuilders();
  for (const m of builders) {
    if (exclude.has(m.id) || !(await isEligibleUpline(m))) continue;
    if (
      payerMemberId &&
      (await hasConfirmedPaymentToUpline(payerMemberId, m.id))
    ) {
      continue;
    }
    eligible.push(m);
  }

  if (eligible.length === 0) return null;

  // Complete one builder's matrix (both slots) before assigning to the next payee.
  const withOneSlot = eligible.filter((m) => slotsFilled(m) === 1);
  const pool = withOneSlot.length > 0 ? withOneSlot : eligible;

  const parent = sortFirstComeFirstServed(pool)[0];
  const position = await nextOpenPositionForUpline(parent);
  if (!position) return null;

  return { parent, position, level: parent.matrixLevel + 1 };
}

export const findEligiblePaymentSlot = findPaymentSlot;
export const findNextAvailableSlot = findPaymentSlot;
export const findAlternativeSlot = findPaymentSlot;

async function mergeToSlot(member: Member, slot: Slot) {
  if (!canReceiveMemberPayments(slot.parent)) {
    throw new Error("Cannot assign payment to an admin account");
  }

  const payer = (await findMemberById(member.id)) ?? member;
  const freshParent = (await findMemberById(slot.parent.id)) ?? slot.parent;
  slot.parent = freshParent;

  if (await hasConfirmedPaymentToUpline(payer.id, freshParent.id)) {
    await syncPaidStateForCurrentCycle(payer);
    return;
  }

  if (!(await canAssignNewPayment(payer))) {
    await syncPaidStateForCurrentCycle(payer);
    return;
  }

  const openPosition = await nextOpenPositionForUpline(freshParent);
  if (!openPosition || openPosition !== slot.position) {
    return;
  }

  await detachFromParent(payer);

  const cycleNumber = getCurrentCycleNumber(payer);
  const existingForCycle = await getOutgoingForCycle(payer.id, cycleNumber);
  if (existingForCycle) {
    if (existingForCycle.status === "confirmed") {
      await syncPaidStateForCurrentCycle(payer);
    }
    return;
  }

  const updated = await updateMember(payer.id, {
    parentId: slot.parent.id,
    position: slot.position,
    matrixLevel: slot.level,
    status: "pending",
    hasPaidContribution: false,
    payoutReceived: false,
    awaitingRematchSince: null,
    rematchAfter: null,
  });
  Object.assign(member, updated);

  const childField = slot.position === "left" ? "leftChildId" : "rightChildId";
  await updateMember(slot.parent.id, { [childField]: payer.id });

  await createOutgoingContributionForCycle(payer, slot.parent.id);
}

async function queueForMerge(member: Member): Promise<Date> {
  await detachFromParent(member);
  await clearPendingOutgoing(member.id);

  const rematchAfter = new Date(Date.now() + REMATCH_WAIT_TIMEOUT_MS);
  await updateMember(member.id, {
    parentId: null,
    status: "pending",
    hasPaidContribution: false,
    awaitingRematchSince: new Date(),
    rematchAfter,
  });
  member.parentId = null;
  member.status = "pending";
  member.hasPaidContribution = false;
  member.rematchAfter = rematchAfter;

  return rematchAfter;
}

export async function tryAssignMemberToPaymentSlot(
  member: Member,
  excludeMemberIds: string[] = [],
  options: {
    allowBeforeMatrixComplete?: boolean;
    scheduleWaitOnNoSlot?: boolean;
  } = {}
): Promise<AssignMemberResult> {
  const { allowBeforeMatrixComplete = false } = options;

  const fresh = (await findMemberById(member.id)) ?? member;
  Object.assign(member, fresh);
  await syncPaidStateForCurrentCycle(member);

  if (member.isSuspended) {
    return { assigned: false, waiting: true, rematchAfter: new Date(0) };
  }

  if (member.hasPaidContribution && member.status === "active") {
    if (!(await uplineMatrixReadyForPayout(member))) {
      return { assigned: false, waiting: true, rematchAfter: null };
    }
    return { assigned: true, newParent: null };
  }

  if (
    !allowBeforeMatrixComplete &&
    isActiveStatus(member.status) &&
    slotsFilled(member) > 0
  ) {
    throw new Error(
      "You must complete your matrix before being merged to another member."
    );
  }

  const excludeIds = [...excludeMemberIds, member.id];

  let slot = await findPaymentSlot(excludeIds, member.id);
  while (slot) {
    if (!(await wouldCreateCycle(member, slot.parent))) break;
    excludeIds.push(slot.parent.id);
    slot = await findPaymentSlot(excludeIds, member.id);
  }

  if (!slot) {
    const rematchAfter = await queueForMerge(member);
    return { assigned: false, waiting: true, rematchAfter };
  }

  await mergeToSlot(member, slot);
  return { assigned: true, newParent: slot.parent };
}

export const tryAssignMemberToEligibleSlot = tryAssignMemberToPaymentSlot;
export const scheduleRematchWait = queueForMerge;

async function restartCycle(member: Member) {
  if (!(await uplineMatrixReadyForPayout(member))) return;

  const subtreeIds = await getSubtreeIds(member);
  const formerChildIds: string[] = [];
  if (member.leftChildId) formerChildIds.push(member.leftChildId);
  if (member.rightChildId) formerChildIds.push(member.rightChildId);

  await detachFromParent(member);
  await clearPendingOutgoing(member.id);

  const payoutAmount = await getPayoutAmount();
  const newCyclesCompleted = (member.cyclesCompleted ?? 0) + 1;

  const updated = await updateMember(member.id, {
    cyclesCompleted: newCyclesCompleted,
    payoutAmount: (member.payoutAmount ?? 0) + payoutAmount,
    payoutReceived: false,
    leftChildId: null,
    rightChildId: null,
    parentId: null,
    matrixLevel: 0,
    status: "pending",
    hasPaidContribution: false,
    paymentRejectionCount: 0,
    requiresAdminContact: false,
    awaitingRematchSince: null,
    rematchAfter: null,
  });
  Object.assign(member, updated);

  await recordPayoutTransaction(member.id, newCyclesCompleted, payoutAmount);

  for (const childId of formerChildIds) {
    const child = await findMemberById(childId);
    if (child?.parentId !== member.id) continue;

    await detachFromParent(child);
    await clearPendingOutgoing(child.id);

    if (!child.hasPaidContribution && child.status === "pending") {
      await updateMember(child.id, {
        parentId: null,
        rematchAfter: new Date(0),
      });
    } else {
      await updateMember(child.id, { parentId: null });
    }
  }

  await tryAssignMemberToPaymentSlot(member, subtreeIds, {
    allowBeforeMatrixComplete: true,
    scheduleWaitOnNoSlot: true,
  });

  await processPendingMerges();
}

async function checkAndCompleteCycle(uplineId: string) {
  const upline = await findMemberById(uplineId);
  if (!upline) return;
  if (!(await uplineMatrixReadyForPayout(upline))) return;
  await restartCycle(upline);
}

export const resetAndRematchAfterMatrixComplete = async (memberId: string) => {
  const member = await findMemberById(memberId);
  if (!member) return null;
  await restartCycle(member);
  return { rematched: true, member, newParent: null, waiting: false };
};

export const checkAndProcessPayout = checkAndCompleteCycle;

export async function processPendingMerges() {
  const queue = sortFirstComeFirstServed(
    await findMembers({
      status: "pending",
      parentId: null,
      hasPaidContribution: false,
    })
  );

  for (const member of queue) {
    if (member.isSuspended) continue;
    if (member.rematchAfter && member.rematchAfter > new Date()) continue;
    await syncPaidStateForCurrentCycle(member);
    const fresh = await findMemberById(member.id);
    if (fresh?.hasPaidContribution && fresh.status === "active") continue;
    await tryAssignMemberToPaymentSlot(fresh ?? member, [], {
      allowBeforeMatrixComplete: true,
      scheduleWaitOnNoSlot: true,
    });
  }
}

export const processAwaitingRematches = processPendingMerges;

export async function joinMatrix(data: {
  fullName: string;
  email: string;
  phone: string;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  authUserId: string;
  password: string;
}) {
  const existingEmail = await findMemberByEmail(data.email);
  if (existingEmail) throw new Error("A member with this email already exists");

  const normalizedPhone = normalizePhone(data.phone);
  const existingPhone = await findMemberByPhone(normalizedPhone);
  if (existingPhone) {
    throw new Error("A member with this phone number already exists");
  }

  const memberId = await generateMemberId();

  const member = await createMember({
    memberId,
    fullName: data.fullName,
    email: data.email,
    phone: normalizedPhone,
    bankCode: data.bankCode,
    bankName: data.bankName,
    accountNumber: data.accountNumber,
    accountName: data.accountName,
    password: data.password,
    authUserId: data.authUserId,
    parentId: null,
    leftChildId: null,
    rightChildId: null,
    position: "left",
    matrixLevel: 0,
    status: "pending",
    role: "member",
    hasPaidContribution: false,
    cyclesCompleted: 0,
    payoutAmount: 0,
    payoutReceived: false,
    paymentRejectionCount: 0,
    requiresAdminContact: false,
    isSuspended: false,
  });

  try {
    const result = await tryAssignMemberToPaymentSlot(member, [], {
      scheduleWaitOnNoSlot: true,
    });
    await processPendingMerges();
    return result.assigned
      ? ((await findMemberById(member.id)) ?? member)
      : member;
  } catch (error) {
    await deleteMember(member.id);
    throw error;
  }
}

export async function repairStuckAfterMatrixComplete() {
  await pruneDuplicatePayerAssignments();

  const allMembers = await findAllMembers();
  for (const m of allMembers) {
    await syncPaidStateForCurrentCycle(m);
    await enforceOneActiveOutgoing(m.id);
  }

  const withParent = await findMembers({});
  for (const child of withParent.filter((m) => m.parentId)) {
    const parent = await findMemberById(child.parentId!);
    if (!parent) {
      await updateMember(child.id, { parentId: null });
      continue;
    }
    const field = child.position === "left" ? "leftChildId" : "rightChildId";
    if (parent[field] !== child.id) {
      if (!parent[field]) {
        await updateMember(parent.id, { [field]: child.id });
      } else {
        await updateMember(child.id, { parentId: null });
      }
    }
  }

  for (const child of withParent.filter((m) => m.parentId)) {
    const outgoing = await findOneContribution({
      fromMemberId: child.id,
      status: ["pending", "awaiting_confirmation"],
    });
    if (outgoing && outgoing.toMemberId !== child.parentId) {
      if (await hasConfirmedPaymentToUpline(child.id, child.parentId!)) {
        await deleteContributionById(outgoing.id);
        continue;
      }
      await deleteContributionById(outgoing.id);
      await createOutgoingContributionForCycle(child, child.parentId!);
    }
  }

  const restarting = (await findAllMembers()).filter(
    (m) => m.status === "pending" && m.cyclesCompleted > 0 && !m.hasPaidContribution
  );

  for (const m of restarting) {
    const outgoing = await findOneContribution({
      fromMemberId: m.id,
      status: ["pending", "awaiting_confirmation"],
    });

    const parents = await findMembersWithChild(m.id);
    for (const p of parents) {
      if (outgoing && p.id === outgoing.toMemberId) continue;
      const patch: Partial<Member> = {};
      if (p.leftChildId === m.id) patch.leftChildId = null;
      if (p.rightChildId === m.id) patch.rightChildId = null;
      if (Object.keys(patch).length) await updateMember(p.id, patch);
    }

    if (m.parentId && !outgoing) {
      const parent = await findMemberById(m.parentId);
      const field = m.position === "left" ? "leftChildId" : "rightChildId";
      if (!parent || parent[field] !== m.id) {
        await updateMember(m.id, { parentId: null });
      }
    }
  }

  const pendingPayers = await findMembers({
    status: "pending",
    parentId: null,
    hasPaidContribution: false,
  });

  for (const m of pendingPayers) {
    const outgoing = await findOneContribution({
      fromMemberId: m.id,
      status: ["pending", "awaiting_confirmation"],
    });
    if (!outgoing) continue;

    const parent = await findMemberById(outgoing.toMemberId);
    if (!parent || !canReceiveMemberPayments(parent)) {
      await deleteContributionById(outgoing.id);
      await updateMember(m.id, { parentId: null, rematchAfter: new Date(0) });
      continue;
    }

    const assigned = await getAssignedPayerIds(parent);
    if (assigned.size >= 2 && !assigned.has(m.id)) {
      await deleteContributionById(outgoing.id);
      await updateMember(m.id, { parentId: null, rematchAfter: new Date(0) });
      continue;
    }

    if (await hasConfirmedPaymentToUpline(m.id, parent.id)) {
      await deleteContributionById(outgoing.id);
      await syncPaidStateForCurrentCycle(m);
      continue;
    }

    const position = await nextOpenPositionForUpline(parent);
    if (!position) {
      await deleteContributionById(outgoing.id);
      await updateMember(m.id, { rematchAfter: new Date(0) });
      continue;
    }

    const childField = position === "left" ? "leftChildId" : "rightChildId";
    await updateMember(m.id, {
      parentId: parent.id,
      position,
      matrixLevel: parent.matrixLevel + 1,
    });
    await updateMember(parent.id, { [childField]: m.id });
  }

  const readyForRestart = await findReadyForCycleRestart();
  for (const member of readyForRestart) {
    if (await uplineMatrixReadyForPayout(member)) {
      await restartCycle(member);
    }
  }

  const legacy = (await findAllMembers()).filter(
    (m) =>
      m.cyclesCompleted === 0 &&
      m.payoutAmount >= PAYOUT_AMOUNT &&
      m.status === "active" &&
      m.hasPaidContribution &&
      !m.leftChildId &&
      !m.rightChildId
  );

  for (const member of legacy) {
    await updateMember(member.id, {
      cyclesCompleted: Math.floor(member.payoutAmount / PAYOUT_AMOUNT),
    });
    await detachFromParent(member);
    await updateMember(member.id, {
      status: "pending",
      hasPaidContribution: false,
    });
    const refreshed = await findMemberById(member.id);
    if (refreshed) {
      await tryAssignMemberToPaymentSlot(refreshed, [], {
        allowBeforeMatrixComplete: true,
        scheduleWaitOnNoSlot: true,
      });
    }
  }

  await detachPaymentsToAdmins();
  await detachPaymentsToSuspended();
}

async function completeReadyCycles() {
  const ready = await findReadyForCycleRestart();
  for (const member of ready) {
    if (await uplineMatrixReadyForPayout(member)) {
      await restartCycle(member);
    }
  }
}

async function expireTimedOutClaims() {
  const cutoff = new Date(Date.now() - PAYMENT_CONFIRMATION_TIMEOUT_MS);
  await expireTimedOutContributions(cutoff);
}

export async function maintainMatrixState() {
  await migrateMemberStatuses();
  await pruneDuplicatePayerAssignments();
  await detachPaymentsToAdmins();
  await detachPaymentsToSuspended();
  await completeReadyCycles();
  await processPendingMerges();
  await expireTimedOutClaims();
}

export async function expireStaleContributions() {
  await maintainMatrixState();
}

export async function claimContribution(
  contributionId: string,
  payerMemberId: string
) {
  await expireStaleContributions();

  const contribution = await findContributionById(contributionId);
  if (!contribution) throw new Error("Contribution not found");
  if (contribution.fromMemberId !== payerMemberId) {
    throw new Error("You can only claim your own contribution");
  }

  const payer = await findMemberById(contribution.fromMemberId);
  if (!payer) throw new Error("Member not found");
  if (payer.requiresAdminContact && isActiveStatus(payer.status)) {
    throw new Error("Please contact admin for assistance with your account.");
  }

  if (contribution.status === "confirmed") {
    throw new Error("Contribution already confirmed");
  }
  if (contribution.status === "awaiting_confirmation") {
    throw new Error("Payment already claimed — awaiting confirmation");
  }

  if (!contribution.paymentProofPath) {
    throw new Error("Upload a payment screenshot before submitting");
  }

  const cycleNumber = getCurrentCycleNumber(payer);
  if (contribution.cycleNumber !== cycleNumber) {
    throw new Error("This payment is not for your current cycle");
  }

  if (await hasConfirmedPaymentForCycle(payer, cycleNumber)) {
    throw new Error("You have already paid for this cycle");
  }

  const claimed = await updateContribution(contribution.id, {
    status: "awaiting_confirmation",
    claimedAt: new Date(),
    declinedAt: null,
  });
  await syncContributionTransactionStatus(claimed);
  return claimed;
}

export async function approveContribution(
  contributionId: string,
  recipientMemberId: string
) {
  await expireStaleContributions();

  const contribution = await findContributionById(contributionId);
  if (!contribution) throw new Error("Contribution not found");
  if (contribution.toMemberId !== recipientMemberId) {
    throw new Error("You can only approve payments sent to you");
  }
  if (contribution.status === "confirmed") {
    throw new Error("Contribution already confirmed");
  }
  if (
    contribution.status !== "awaiting_confirmation" &&
    contribution.status !== "pending"
  ) {
    throw new Error("This payment can no longer be confirmed");
  }

  const payer = await findMemberById(contribution.fromMemberId);
  if (!payer) throw new Error("Member not found");

  const cycleNumber = getCurrentCycleNumber(payer);
  if (contribution.cycleNumber !== cycleNumber) {
    throw new Error("This payment is not for the payer's current cycle");
  }
  if (await hasConfirmedPaymentForCycle(payer, cycleNumber)) {
    throw new Error("This member has already paid for the current cycle");
  }

  const confirmed = await updateContribution(contribution.id, {
    status: "confirmed",
    confirmedAt: new Date(),
  });

  await updateMember(payer.id, {
    hasPaidContribution: true,
    status: "active",
  });

  await clearPendingOutgoing(payer.id);
  await syncContributionTransactionStatus(confirmed);
  await checkAndCompleteCycle(contribution.toMemberId);
  await processPendingMerges();

  return confirmed;
}

export async function declineContribution(
  contributionId: string,
  recipientMemberId: string
) {
  await expireStaleContributions();

  const contribution = await findContributionById(contributionId);
  if (!contribution) throw new Error("Contribution not found");
  if (contribution.toMemberId !== recipientMemberId) {
    throw new Error("You can only decline payments sent to you");
  }
  if (
    contribution.status !== "awaiting_confirmation" &&
    contribution.status !== "pending"
  ) {
    throw new Error("This payment can no longer be declined");
  }

  const priorRejection = await findOneContribution({
    fromMemberId: contribution.fromMemberId,
    toMemberId: contribution.toMemberId,
    status: "declined",
    excludeId: contribution.id,
  });
  if (priorRejection) {
    throw new Error(
      "You have already rejected this member once. Please contact admin for assistance."
    );
  }

  const payer = await findMemberById(contribution.fromMemberId);
  if (!payer) throw new Error("Member not found");

  const declined = await updateContribution(contribution.id, {
    status: "declined",
    claimedAt: null,
    declinedAt: new Date(),
  });
  await syncContributionTransactionStatus(declined);

  if (isActiveStatus(payer.status)) {
    return {
      contribution: declined,
      rematched: false,
      requiresAdminContact: false,
      message: "This account is already active.",
    };
  }

  await updateMember(payer.id, {
    requiresAdminContact: false,
    paymentRejectionCount: payer.paymentRejectionCount + 1,
  });

  const rematch = await rematchMemberAfterRejection(payer.id);

  if (rematch.waiting) {
    return {
      contribution: declined,
      rematched: false,
      waitingForRematch: true,
      rematchAfter: rematch.rematchAfter,
      requiresAdminContact: false,
      message:
        "Please wait shortly — the system will match you to an upline automatically.",
    };
  }

  if (!rematch.newParent) {
    return {
      contribution: declined,
      rematched: false,
      requiresAdminContact: false,
      message: "Payment declined.",
    };
  }

  return {
    contribution: declined,
    rematched: true,
    requiresAdminContact: false,
    newParent: {
      memberId: rematch.newParent.memberId,
      fullName: rematch.newParent.fullName,
    },
    message: `Payment rejected. You have been matched to ${rematch.newParent.fullName} (${rematch.newParent.memberId}). Pay them to activate your account.`,
  };
}

export async function rematchMemberAfterRejection(payerId: string) {
  const payer = await findMemberById(payerId);
  if (!payer || isActiveStatus(payer.status)) {
    throw new Error("Member cannot be rematched — account is already active");
  }

  const oldParentId = payer.parentId;
  await detachFromParent(payer);

  const result = await tryAssignMemberToPaymentSlot(
    payer,
    oldParentId ? [oldParentId] : [],
    { scheduleWaitOnNoSlot: true }
  );

  if (!result.assigned) {
    return {
      payer,
      newParent: null,
      waiting: true,
      rematchAfter: result.rematchAfter,
    };
  }

  return { payer, newParent: result.newParent, waiting: false };
}

/** Payer-initiated: merge to another member with an open payment slot. */
export async function requestMemberPayeeReassign(payerId: string) {
  const payer = await findMemberById(payerId);
  if (!payer) throw new Error("Member not found");
  if (payer.isSuspended) {
    throw new Error("Your account has been suspended. Please contact support.");
  }
  if (payer.hasPaidContribution && payer.status === "active") {
    throw new Error("You have already activated your account");
  }
  if (!payer.parentId) {
    throw new Error("You are not assigned to a payee yet");
  }

  const activeOutgoing = await findOneContribution({
    fromMemberId: payer.id,
    status: ["pending", "awaiting_confirmation"],
  });

  if (activeOutgoing?.status === "awaiting_confirmation") {
    throw new Error(
      "You already submitted payment for confirmation. Wait for approval or contact support."
    );
  }

  await clearPendingOutgoing(payer.id);

  const oldParent = await findMemberById(payer.parentId);
  const rematch = await rematchMemberAfterRejection(payer.id);

  if (rematch.waiting) {
    return {
      rematched: false,
      waiting: true,
      rematchAfter: rematch.rematchAfter,
      message:
        "No open slot right now. The system will match you to another member shortly.",
    };
  }

  if (!rematch.newParent) {
    return {
      rematched: false,
      waiting: false,
      message: "Could not find another member with an open slot. Please try again.",
    };
  }

  const parent = rematch.newParent;
  return {
    rematched: true,
    waiting: false,
    newParent: {
      memberId: parent.memberId,
      fullName: parent.fullName,
      phone: parent.phone,
      bankName: parent.bankName,
      accountNumber: parent.accountNumber,
      accountName: parent.accountName,
    },
    previousPayee: oldParent
      ? { memberId: oldParent.memberId, fullName: oldParent.fullName }
      : null,
    message: `You have been reassigned to ${parent.fullName} (${parent.memberId}). Call them before you pay.`,
  };
}

export const confirmContribution = async (contributionId: string) => {
  const contribution = await findContributionById(contributionId);
  if (!contribution) throw new Error("Contribution not found");
  return approveContribution(contributionId, contribution.toMemberId);
};

export async function hasActivePaymentRecipientInDatabase(): Promise<boolean> {
  const members = await findMembers({
    status: "active",
    hasPaidContribution: true,
  });
  return members.length > 0;
}

export async function buildMatrixTree(
  memberId?: string,
  depth = 4
): Promise<MatrixNode | null> {
  const apex = memberId
    ? await findMemberById(memberId)
    : await findTreeApexMember();

  if (!apex) return null;

  async function buildNode(member: Member, currentDepth: number): Promise<MatrixNode> {
    const node: MatrixNode = {
      _id: member.id,
      memberId: member.memberId,
      fullName: member.fullName,
      status: member.status,
      position: member.position,
      matrixLevel: member.matrixLevel,
      hasPaidContribution: member.hasPaidContribution,
      payoutReceived: member.payoutReceived,
      cyclesCompleted: member.cyclesCompleted ?? 0,
      left: null,
      right: null,
    };

    if (currentDepth >= depth) return node;

    if (member.leftChildId) {
      const left = await findMemberById(member.leftChildId);
      if (left) node.left = await buildNode(left, currentDepth + 1);
    }

    if (member.rightChildId) {
      const right = await findMemberById(member.rightChildId);
      if (right) node.right = await buildNode(right, currentDepth + 1);
    }

    return node;
  }

  return buildNode(apex, 0);
}

export async function adminForceMatchMember(
  memberId: string,
  parentId: string,
  position?: ChildPosition
) {
  const member = await findMemberById(memberId);
  const parent = await findMemberById(parentId);
  if (!member) throw new Error("Member not found");
  if (!parent) throw new Error("Parent member not found");
  if (member.id === parent.id) {
    throw new Error("Cannot match a member to themselves");
  }
  if (member.isSuspended) throw new Error("Member is suspended");
  if (parent.isSuspended) throw new Error("Parent member is suspended");
  if (!canReceiveMemberPayments(parent)) {
    throw new Error("Cannot match payments to an admin account");
  }
  if (await wouldCreateCycle(member, parent)) {
    throw new Error("This match would create a cycle in the matrix");
  }

  await detachFromParent(member);
  await clearPendingOutgoing(member.id);

  let slotPosition = position;
  if (!slotPosition) {
    if (!parent.leftChildId) slotPosition = "left";
    else if (!parent.rightChildId) slotPosition = "right";
    else throw new Error("Parent has no open slot");
  }

  const childField = slotPosition === "left" ? "leftChildId" : "rightChildId";
  if (parent[childField] && parent[childField] !== member.id) {
    throw new Error(`Parent ${slotPosition} slot is already taken`);
  }

  await updateMember(member.id, {
    parentId: parent.id,
    position: slotPosition,
    matrixLevel: parent.matrixLevel + 1,
    status: "pending",
    hasPaidContribution: false,
    awaitingRematchSince: null,
    rematchAfter: null,
  });
  await updateMember(parent.id, { [childField]: member.id });

  const cycleNumber = getCurrentCycleNumber(member);
  const { getContributionAmount } = await import("@/lib/platform-settings");
  const amount = await getContributionAmount();
  const contribution = await createContribution({
    fromMemberId: member.id,
    toMemberId: parent.id,
    amount,
    cycleNumber,
    status: "pending",
  });
  await syncContributionTransactions(contribution);

  return {
    member: (await findMemberById(member.id))!,
    parent,
    position: slotPosition,
    contribution,
  };
}

export async function adminDetachMemberFromMatrix(memberId: string) {
  const member = await findMemberById(memberId);
  if (!member) throw new Error("Member not found");

  await detachFromParent(member);
  await clearPendingOutgoing(member.id);

  await updateMember(member.id, {
    parentId: null,
    status: "pending",
    hasPaidContribution: false,
    awaitingRematchSince: new Date(),
    rematchAfter: new Date(0),
  });

  return findMemberById(memberId);
}

/**
 * Detach a member from the matrix and rematch any pending payers affected.
 */
export async function removeMemberFromMatrixAndRematchPayers(
  memberId: string,
  options: {
    excludeMemberIds?: string[];
    runPendingMerges?: boolean;
  } = {}
) {
  const member = await findMemberById(memberId);
  if (!member) return;

  const exclude = new Set([memberId, ...(options.excludeMemberIds ?? [])]);

  const incoming = await findContributions({
    toMemberId: memberId,
    status: ["pending", "awaiting_confirmation"],
  });

  for (const contribution of incoming) {
    await deleteContributionById(contribution.id);

    const payer = await findMemberById(contribution.fromMemberId);
    if (!payer || exclude.has(payer.id) || payer.isSuspended) continue;
    if (payer.hasPaidContribution && payer.status === "active") continue;

    await detachFromParent(payer);
    await clearPendingOutgoing(payer.id);
    await updateMember(payer.id, {
      parentId: null,
      status: "pending",
      hasPaidContribution: false,
      rematchAfter: new Date(0),
    });

    await tryAssignMemberToPaymentSlot(payer, [...exclude], {
      allowBeforeMatrixComplete: true,
      scheduleWaitOnNoSlot: true,
    });
  }

  const children = await findMembers({ parentId: memberId });
  for (const child of children) {
    if (exclude.has(child.id) || child.isSuspended) continue;

    await detachFromParent(child);

    if (!child.hasPaidContribution && child.status === "pending") {
      await clearPendingOutgoing(child.id);
      await updateMember(child.id, {
        parentId: null,
        status: "pending",
        hasPaidContribution: false,
        rematchAfter: new Date(0),
      });
      await tryAssignMemberToPaymentSlot(child, [...exclude], {
        allowBeforeMatrixComplete: true,
        scheduleWaitOnNoSlot: true,
      });
    } else {
      await updateMember(child.id, { parentId: null });
    }
  }

  const parentsWithChild = await findMembersWithChild(memberId);
  for (const parent of parentsWithChild) {
    const patch: Partial<Member> = {};
    if (parent.leftChildId === memberId) patch.leftChildId = null;
    if (parent.rightChildId === memberId) patch.rightChildId = null;
    if (Object.keys(patch).length) await updateMember(parent.id, patch);
  }

  await detachFromParent(member);
  await clearPendingOutgoing(member.id);
  await updateMember(member.id, {
    leftChildId: null,
    rightChildId: null,
    parentId: null,
  });

  if (options.runPendingMerges !== false) {
    await processPendingMerges();
  }
}

export async function prepareMemberForDeletion(
  memberId: string,
  excludeMemberIds: string[] = []
) {
  await removeMemberFromMatrixAndRematchPayers(memberId, {
    excludeMemberIds,
    runPendingMerges: false,
  });
}

async function detachPaymentsToSuspended() {
  const suspendedMembers = (await findAllMembers()).filter((m) => m.isSuspended);
  for (const suspended of suspendedMembers) {
    await applySuspensionToMatrix(suspended.id);
  }
}

/**
 * Remove a suspended member from the matrix and reassign any pending payers
 * who were matched to pay them.
 */
export async function applySuspensionToMatrix(suspendedMemberId: string) {
  const suspended = await findMemberById(suspendedMemberId);
  if (!suspended?.isSuspended) return;
  await removeMemberFromMatrixAndRematchPayers(suspendedMemberId);
}

async function detachPaymentsToAdmins() {
  const admins = (await findAllMembers()).filter((m) => m.role === "admin");
  for (const admin of admins) {
    const incoming = await findContributions({
      toMemberId: admin.id,
      status: ["pending", "awaiting_confirmation"],
    });

    for (const contribution of incoming) {
      await deleteContributionById(contribution.id);

      const payer = await findMemberById(contribution.fromMemberId);
      if (!payer) continue;

      if (payer.parentId === admin.id) {
        await detachFromParent(payer);
      }

      await updateMember(payer.id, {
        parentId: null,
        status: "pending",
        hasPaidContribution: false,
        rematchAfter: new Date(0),
      });
    }

    const children = await findMembers({ parentId: admin.id });
    for (const child of children) {
      await detachFromParent(child);
      await clearPendingOutgoing(child.id);
      await updateMember(child.id, {
        parentId: null,
        status: "pending",
        hasPaidContribution: false,
        rematchAfter: new Date(0),
      });
    }

    if (admin.leftChildId || admin.rightChildId) {
      const patch: Partial<Member> = {};
      if (admin.leftChildId) patch.leftChildId = null;
      if (admin.rightChildId) patch.rightChildId = null;
      await updateMember(admin.id, patch);
    }
  }
}
