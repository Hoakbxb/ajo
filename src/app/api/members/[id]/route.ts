import { NextResponse } from "next/server";
import {
  findContributions,
  findMemberById,
} from "@/lib/db/repository";
import { populateContributions, populateMemberRef } from "@/lib/db/populate";
import { omitMemberPassword } from "@/lib/db/mappers";
import { enrichContributionsWithProofUrls } from "@/lib/payment-proof";
import { PAYOUT_AMOUNT } from "@/lib/constants";
import { maintainMatrixState, getCurrentCycleNumber } from "@/lib/matrix";
import {
  computeContributionOwed,
  memberOwesPaymentForCurrentCycle,
} from "@/lib/cycle-payment";
import { getPaymentStatus } from "@/lib/payment-status";
import { getContributionAmount } from "@/lib/platform-settings";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await maintainMatrixState();

    const { id } = await params;

    let member = await findMemberById(id);
    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    member = (await findMemberById(id))!;
    const parent = await populateMemberRef(member.parentId, [
      "memberId",
      "fullName",
      "email",
      "phone",
      "bankName",
      "bankCode",
      "accountNumber",
      "accountName",
    ]);

    const currentCycle = getCurrentCycleNumber(member);

    const [allOutgoingRaw, incomingRaw, leftChild, rightChild] =
      await Promise.all([
        findContributions({ fromMemberId: member.id }),
        findContributions({ toMemberId: member.id }),
        member.leftChildId
          ? findMemberById(member.leftChildId)
          : Promise.resolve(null),
        member.rightChildId
          ? findMemberById(member.rightChildId)
          : Promise.resolve(null),
      ]);

    const allOutgoing = await enrichContributionsWithProofUrls(
      await populateContributions(allOutgoingRaw)
    );
    const incomingContributions = await enrichContributionsWithProofUrls(
      await populateContributions(incomingRaw)
    );

    const outgoingContributions = allOutgoing.filter(
      (c) => (c.cycleNumber ?? 1) === currentCycle
    );

    const slotsFilled = [leftChild, rightChild].filter(Boolean).length;
    const bothPaid =
      leftChild?.hasPaidContribution && rightChild?.hasPaidContribution;

    const paymentStatus = getPaymentStatus(member, outgoingContributions);

    const declinedPairs = await findContributions({
      toMemberId: member.id,
      status: "declined",
    });

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

    const owesPayment = await memberOwesPaymentForCurrentCycle(member);
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
    const contributionAmount = await getContributionAmount();
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
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch member";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
