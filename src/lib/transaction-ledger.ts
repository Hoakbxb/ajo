import {
  findAllMembers,
  findContributions,
  findMemberById,
  findTransactionsByMemberId,
  updateTransactionsForContribution,
  upsertContributionTransactions,
  upsertPayoutTransaction,
} from "@/lib/db/repository";
import type { Contribution, Transaction } from "@/types/database";
import { PAYOUT_AMOUNT } from "@/lib/constants";

function contributionOccurredAt(contribution: Contribution): Date {
  return (
    contribution.confirmedAt ??
    contribution.claimedAt ??
    contribution.createdAt
  );
}

export async function syncContributionTransactions(
  contribution: Contribution
): Promise<void> {
  const [fromMember, toMember] = await Promise.all([
    findMemberById(contribution.fromMemberId),
    findMemberById(contribution.toMemberId),
  ]);
  if (!fromMember || !toMember) return;

  await upsertContributionTransactions({
    contributionId: contribution.id,
    amount: contribution.amount,
    cycleNumber: contribution.cycleNumber,
    status: contribution.status,
    occurredAt: contributionOccurredAt(contribution),
    fromMember,
    toMember,
  });
}

export async function syncContributionTransactionStatus(
  contribution: Contribution
): Promise<void> {
  await updateTransactionsForContribution(contribution.id, {
    status: contribution.status,
    occurredAt: contributionOccurredAt(contribution),
  });
}

export async function recordPayoutTransaction(
  memberId: string,
  cycleNumber: number,
  amount = PAYOUT_AMOUNT
): Promise<void> {
  await upsertPayoutTransaction({
    memberId,
    cycleNumber,
    amount,
    occurredAt: new Date(),
  });
}

export async function backfillMemberTransactions(memberId: string): Promise<void> {
  const member = await findMemberById(memberId);
  if (!member) return;

  const [outgoing, incoming] = await Promise.all([
    findContributions({ fromMemberId: memberId }),
    findContributions({ toMemberId: memberId }),
  ]);

  const contributionIds = new Set<string>();
  for (const contribution of [...outgoing, ...incoming]) {
    contributionIds.add(contribution.id);
  }

  for (const contributionId of contributionIds) {
    const contribution =
      outgoing.find((item) => item.id === contributionId) ??
      incoming.find((item) => item.id === contributionId);
    if (contribution) {
      await syncContributionTransactions(contribution);
    }
  }

  const completedCycles = member.cyclesCompleted ?? 0;
  for (let cycle = 1; cycle <= completedCycles; cycle++) {
    await recordPayoutTransaction(memberId, cycle);
  }
}

export async function backfillAllTransactions(): Promise<void> {
  const members = await findAllMembers();
  for (const member of members) {
    await backfillMemberTransactions(member.id);
  }
}

export async function getMemberTransactionLedger(
  memberId: string
): Promise<Transaction[]> {
  const transactions = await findTransactionsByMemberId(memberId);
  if (transactions.length > 0) return transactions;

  await backfillMemberTransactions(memberId);
  return findTransactionsByMemberId(memberId);
}
