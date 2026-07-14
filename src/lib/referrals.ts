import {
  createReferral,
  createReferralRedemption,
  countQualifiedReferrals,
  findMemberById,
  findMemberByMemberId,
  findReferralByReferredMemberId,
  findReferralsByReferrerId,
  findMembersByIds,
  updateMember,
  updateReferral,
  upsertReferralTransaction,
} from "@/lib/db/repository";
import {
  REFERRAL_REWARD_AMOUNT,
  REFERRAL_WITHDRAWAL_THRESHOLD,
  SITE_URL,
} from "@/lib/constants";
import {
  normalizeReferralCode,
  REFERRAL_COOKIE,
} from "@/lib/referral-code";
import type { Member, Referral } from "@/types/database";

export { normalizeReferralCode, REFERRAL_COOKIE };

export function buildReferralLink(memberId: string): string {
  const base = SITE_URL.replace(/\/$/, "");
  return `${base}/join?ref=${encodeURIComponent(memberId.trim().toUpperCase())}`;
}

export async function resolveReferrer(
  referralCode: string | undefined | null
): Promise<Member | null> {
  const code = normalizeReferralCode(referralCode);
  if (!code) return null;
  return findMemberByMemberId(code);
}

export async function registerReferral(
  referrer: Member,
  referred: Member
): Promise<void> {
  if (referrer.id === referred.id) return;

  const existing = await findReferralByReferredMemberId(referred.id);
  if (existing) return;

  await createReferral({
    referrerMemberId: referrer.id,
    referredMemberId: referred.id,
    rewardAmount: REFERRAL_REWARD_AMOUNT,
  });
}

/** Credit referrer when a referred member completes their first payment. */
export async function qualifyReferralForPayer(payer: Member): Promise<void> {
  if (!payer.referredByMemberId) return;

  const referral = await findReferralByReferredMemberId(payer.id);
  if (!referral || referral.status !== "pending") return;

  const referrer = await findMemberById(referral.referrerMemberId);
  if (!referrer) return;

  const now = new Date();
  await updateReferral(referral.id, {
    status: "qualified",
    qualifiedAt: now,
  });

  const newBalance = (referrer.referralBalance ?? 0) + referral.rewardAmount;
  await updateMember(referrer.id, { referralBalance: newBalance });

  const referred = await findMemberById(payer.id);
  await upsertReferralTransaction({
    memberId: referrer.id,
    amount: referral.rewardAmount,
    kind: "referral",
    counterpartyMemberId: payer.id,
    counterpartyName: referred?.fullName ?? payer.fullName,
    reference: `referral-${referral.id}`,
    occurredAt: now,
  });
}

export interface ReferralSummary {
  referralCode: string;
  referralLink: string;
  balance: number;
  contributionCredit: number;
  withdrawalThreshold: number;
  rewardPerReferral: number;
  canWithdraw: boolean;
  referrals: Array<{
    id: string;
    referredName: string;
    referredMemberId: string;
    status: Referral["status"];
    rewardAmount: number;
    createdAt: string;
    qualifiedAt: string | null;
  }>;
}

/** Dashboard-only summary — skips loading the full referral list. */
export async function getReferralDashboardSummary(member: Member) {
  const balance = member.referralBalance ?? 0;
  const qualifiedCount = await countQualifiedReferrals(member.id);

  return {
    referralCode: member.memberId,
    referralLink: buildReferralLink(member.memberId),
    balance,
    contributionCredit: member.contributionCredit ?? 0,
    withdrawalThreshold: REFERRAL_WITHDRAWAL_THRESHOLD,
    rewardPerReferral: REFERRAL_REWARD_AMOUNT,
    canWithdraw: balance >= REFERRAL_WITHDRAWAL_THRESHOLD,
    qualifiedCount,
  };
}

export async function getReferralSummary(
  member: Member
): Promise<ReferralSummary> {
  const referrals = await findReferralsByReferrerId(member.id);
  const referredIds = referrals.map((r) => r.referredMemberId);
  const referredMembers = await findMembersByIds(referredIds);
  const nameById = new Map(
    referredMembers.map((m) => [m.id, { name: m.fullName, memberId: m.memberId }])
  );

  const balance = member.referralBalance ?? 0;

  return {
    referralCode: member.memberId,
    referralLink: buildReferralLink(member.memberId),
    balance,
    contributionCredit: member.contributionCredit ?? 0,
    withdrawalThreshold: REFERRAL_WITHDRAWAL_THRESHOLD,
    rewardPerReferral: REFERRAL_REWARD_AMOUNT,
    canWithdraw: balance >= REFERRAL_WITHDRAWAL_THRESHOLD,
    referrals: referrals.map((r) => ({
      id: r.id,
      referredName: nameById.get(r.referredMemberId)?.name ?? "Member",
      referredMemberId:
        nameById.get(r.referredMemberId)?.memberId ?? r.referredMemberId,
      status: r.status,
      rewardAmount: r.rewardAmount,
      createdAt: r.createdAt.toISOString(),
      qualifiedAt: r.qualifiedAt?.toISOString() ?? null,
    })),
  };
}

/**
 * Redeem referral balance (₦5,000 chunks) as contribution credit.
 * If a pending contribution exists, it is confirmed automatically.
 */
export async function redeemReferralBalance(memberId: string): Promise<{
  amountRedeemed: number;
  contributionApplied: boolean;
  newBalance: number;
  contributionCredit: number;
}> {
  const member = await findMemberById(memberId);
  if (!member) throw new Error("Member not found");

  const balance = member.referralBalance ?? 0;
  if (balance < REFERRAL_WITHDRAWAL_THRESHOLD) {
    throw new Error(
      `You need at least ₦${REFERRAL_WITHDRAWAL_THRESHOLD.toLocaleString()} in referral earnings to redeem`
    );
  }

  const amountRedeemed = REFERRAL_WITHDRAWAL_THRESHOLD;
  const newBalance = balance - amountRedeemed;
  const newCredit = (member.contributionCredit ?? 0) + amountRedeemed;

  await updateMember(member.id, {
    referralBalance: newBalance,
    contributionCredit: newCredit,
  });

  await createReferralRedemption({
    memberId: member.id,
    amount: amountRedeemed,
  });

  let contributionApplied = false;
  const refreshed = await findMemberById(member.id);
  if (refreshed) {
    const result = await applyContributionCreditIfEligible(refreshed);
    contributionApplied = result.applied;
  }

  const finalMember = await findMemberById(member.id);

  return {
    amountRedeemed,
    contributionApplied,
    newBalance: finalMember?.referralBalance ?? newBalance,
    contributionCredit: finalMember?.contributionCredit ?? newCredit,
  };
}

/** Apply stored contribution credit to a pending outgoing payment. */
export async function applyContributionCreditIfEligible(
  member: Member
): Promise<{ applied: boolean }> {
  const credit = member.contributionCredit ?? 0;
  if (credit <= 0) return { applied: false };

  const { getContributionAmount } = await import("@/lib/platform-settings");
  const { getOutgoingForCycle, getCurrentCycleNumber } = await import(
    "@/lib/cycle-payment"
  );

  const contributionAmount = await getContributionAmount();
  if (credit < contributionAmount) return { applied: false };

  const cycleNumber = getCurrentCycleNumber(member);
  const outgoing = await getOutgoingForCycle(member.id, cycleNumber);
  if (!outgoing || outgoing.status === "confirmed") return { applied: false };

  const { approveContributionWithCredit } = await import("@/lib/matrix");
  await approveContributionWithCredit(outgoing.id, member.id, contributionAmount);

  return { applied: true };
}
