import { findAllMembers, findContributions } from "@/lib/db/repository";
import type { Contribution, Member } from "@/types/database";
import { canReceiveMemberPayments } from "@/lib/member-status";

export interface AdminMatchingMetrics {
  /** Pending members not yet placed under a payee. */
  awaitingMerge: number;
  /** Matched but still need to pay (pending outgoing contribution). */
  needsPayment: number;
  /** Claimed payment — waiting for payee to confirm. */
  awaitingConfirmation: number;
  /** needsPayment + awaitingConfirmation */
  totalPaymentPipeline: number;
  /** Active members who can receive downlines right now. */
  activeBuildersWithOpenSlots: number;
  /** Total open left/right slots across eligible builders. */
  openPaymentSlots: number;
}

export type MemberMatchPaymentStatus =
  | "active"
  | "awaiting_merge"
  | "needs_payment"
  | "awaiting_confirmation"
  | "suspended"
  | "admin"
  | "other";

function openSlotCount(member: Member): number {
  return (member.leftChildId ? 0 : 1) + (member.rightChildId ? 0 : 1);
}

export function getMemberMatchPaymentStatus(
  member: Member,
  outgoing: Contribution[] = []
): MemberMatchPaymentStatus {
  if (member.role === "admin") return "admin";
  if (member.isSuspended) return "suspended";
  if (member.status === "active" && member.hasPaidContribution) return "active";

  const hasAwaiting = outgoing.some((c) => c.status === "awaiting_confirmation");
  const hasPending = outgoing.some((c) => c.status === "pending");

  if (hasAwaiting && !member.hasPaidContribution) {
    return "awaiting_confirmation";
  }

  if (
    member.status === "pending" &&
    !member.hasPaidContribution &&
    member.parentId &&
    hasPending
  ) {
    return "needs_payment";
  }

  if (
    member.status === "pending" &&
    !member.hasPaidContribution &&
    !member.parentId
  ) {
    return "awaiting_merge";
  }

  return "other";
}

export function buildAdminMatchingMetrics(
  members: Member[],
  activeOutgoing: Contribution[]
): AdminMatchingMetrics {
  const outgoingByPayer = new Map<string, Contribution[]>();
  for (const contribution of activeOutgoing) {
    const list = outgoingByPayer.get(contribution.fromMemberId) ?? [];
    list.push(contribution);
    outgoingByPayer.set(contribution.fromMemberId, list);
  }

  let awaitingMerge = 0;
  let needsPayment = 0;
  let awaitingConfirmation = 0;
  let activeBuildersWithOpenSlots = 0;
  let openPaymentSlots = 0;

  for (const member of members) {
    const outgoing = outgoingByPayer.get(member.id) ?? [];
    const status = getMemberMatchPaymentStatus(member, outgoing);

    switch (status) {
      case "awaiting_merge":
        awaitingMerge += 1;
        break;
      case "needs_payment":
        needsPayment += 1;
        break;
      case "awaiting_confirmation":
        awaitingConfirmation += 1;
        break;
      default:
        break;
    }

    if (
      canReceiveMemberPayments(member) &&
      member.status === "active" &&
      member.hasPaidContribution
    ) {
      const open = openSlotCount(member);
      if (open > 0) {
        activeBuildersWithOpenSlots += 1;
        openPaymentSlots += open;
      }
    }
  }

  return {
    awaitingMerge,
    needsPayment,
    awaitingConfirmation,
    totalPaymentPipeline: needsPayment + awaitingConfirmation,
    activeBuildersWithOpenSlots,
    openPaymentSlots,
  };
}

export async function getAdminMatchingMetrics(): Promise<AdminMatchingMetrics> {
  const [members, activeOutgoing] = await Promise.all([
    findAllMembers(),
    findContributions({ status: ["pending", "awaiting_confirmation"] }),
  ]);

  return buildAdminMatchingMetrics(members, activeOutgoing);
}
