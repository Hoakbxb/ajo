import { NextResponse } from "next/server";
import {
  findContributions,
  findMemberById,
} from "@/lib/db/repository";
import { populateContributions, populateMemberRef } from "@/lib/db/populate";
import { omitMemberPassword } from "@/lib/db/mappers";
import { enrichContributionsWithProofUrls } from "@/lib/payment-proof";
import { PAYOUT_AMOUNT } from "@/lib/constants";
import { syncMemberDashboardState, getCurrentCycleNumber } from "@/lib/matrix";
import {
  computeContributionOwed,
  memberOwesPaymentForCurrentCycle,
} from "@/lib/cycle-payment";
import { getPaymentStatus } from "@/lib/payment-status";
import { getContributionAmount } from "@/lib/platform-settings";
import { getReferralDashboardSummary } from "@/lib/referrals";

const INCOMING_PROOF_STATUSES = new Set([
  "pending",
  "awaiting_confirmation",
]);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await syncMemberDashboardState(id);

    const member = await findMemberById(id);
    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const currentCycle = getCurrentCycleNumber(member);

    const [
      parent,
      allOutgoingRaw,
      incomingRaw,
      leftChild,
      rightChild,
      declinedPairs,
      contributionAmount,
      referralSummary,
      owesPayment,
    ] = await Promise.all([
      populateMemberRef(member.parentId, [
        "memberId",
        "fullName",
        "email",
        "phone",
        "bankName",
        "bankCode",
        "accountNumber",
        "accountName",
      ]),
      findContributions({ fromMemberId: member.id }),
      findContributions({ toMemberId: member.id }),
      member.leftChildId
        ? findMemberById(member.leftChildId)
        : Promise.resolve(null),
      member.rightChildId
        ? findMemberById(member.rightChildId)
        : Promise.resolve(null),
      findContributions({
        toMemberId: member.id,
        status: "declined",
      }),
      getContributionAmount(),
      getReferralDashboardSummary(member),
      memberOwesPaymentForCurrentCycle(member),
    ]);

    const [allOutgoingPopulated, incomingPopulated] = await Promise.all([
      populateContributions(allOutgoingRaw),
      populateContributions(incomingRaw),
    ]);

    const incomingNeedingProof = incomingPopulated.filter(
      (c) =>
        c.paymentProofPath && INCOMING_PROOF_STATUSES.has(c.status)
    );
    const incomingWithProofUrls =
      incomingNeedingProof.length > 0
        ? await enrichContributionsWithProofUrls(incomingNeedingProof)
        : [];
    const proofUrlById = new Map(
      incomingWithProofUrls.map((c) => [c.id, c.paymentProofUrl ?? null])
    );

    const incomingContributions = incomingPopulated.map((c) => ({
      ...c,
      paymentProofUrl: proofUrlById.get(c.id) ?? null,
    }));

    const allOutgoing = allOutgoingPopulated.map((c) => ({
      ...c,
      paymentProofUrl: null as string | null,
    }));

    const outgoingContributions = allOutgoing.filter(
      (c) => (c.cycleNumber ?? 1) === currentCycle
    );

    const slotsFilled = [leftChild, rightChild].filter(Boolean).length;
    const bothPaid =
      leftChild?.hasPaidContribution && rightChild?.hasPaidContribution;

    const paymentStatus = getPaymentStatus(member, outgoingContributions);

    const declinedFromIds = new Set(
      declinedPairs.map((c) => c.fromMemberId)
    );

    const incomingWithMeta = incomingContributions.map((c) => {
      const fromId =
        c.fromMemberId &&
        typeof c.fromMemberId === "object" &&
        "_id" in c.fromMemberId
          ? String(c.fromMemberId._id)
          : String(c.fromMemberId);

      return {
        ...c,
        canDecline: !declinedFromIds.has(fromId),
      };
    });

    const cyclesCompleted = member.cyclesCompleted ?? 0;
    const hasActiveOutgoingPayment = outgoingContributions.some(
      (c) => c.status === "pending" || c.status === "awaiting_confirmation"
    );
    const waitingForRematch =
      member.status === "pending" &&
      !member.hasPaidContribution &&
      !member.parentId &&
      !hasActiveOutgoingPayment;
    const awaitingPaymentConfirmation = outgoingContributions.some(
      (c) => c.status === "awaiting_confirmation"
    );
    const cycleJustRestarted =
      cyclesCompleted > 0 &&
      member.status === "pending" &&
      !member.hasPaidContribution;
    const contributionOwed = owesPayment
      ? computeContributionOwed(member, outgoingContributions, contributionAmount)
      : 0;

    return NextResponse.json({
      member: {
        ...omitMemberPassword(member),
        parentId: parent,
      },
      children: {
        left: leftChild
          ? {
              memberId: leftChild.memberId,
              fullName: leftChild.fullName,
              status: leftChild.status,
              hasPaidContribution: leftChild.hasPaidContribution,
            }
          : null,
        right: rightChild
          ? {
              memberId: rightChild.memberId,
              fullName: rightChild.fullName,
              status: rightChild.status,
              hasPaidContribution: rightChild.hasPaidContribution,
            }
          : null,
      },
      contributions: {
        outgoing: outgoingContributions,
        incoming: incomingWithMeta,
        history: allOutgoing.filter(
          (c) => (c.cycleNumber ?? 1) !== currentCycle
        ),
      },
      paymentStatus,
      matrixProgress: {
        slotsFilled,
        slotsTotal: 2,
        bothChildrenPaid: bothPaid,
        readyForPayout: slotsFilled === 2 && bothPaid && !member.payoutReceived,
        payoutReceived: member.payoutReceived,
        payoutAmount: member.payoutAmount || PAYOUT_AMOUNT,
        cyclesCompleted,
        currentCycle,
        cycleJustRestarted,
        waitingForRematch,
        rematchAfter: member.rematchAfter,
        awaitingPaymentConfirmation,
        contributionOwed,
      },
      referrals: referralSummary,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch member";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
