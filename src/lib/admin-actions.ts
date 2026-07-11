import {
  createAdminActivityLog,
  deleteContributionById,
  deleteMember,
  findContributionById,
  findMemberById,
  updateContribution,
  updateMember,
} from "@/lib/db/repository";
import {
  approveContribution,
  adminForceMatchMember,
  applySuspensionToMatrix,
  declineContribution,
  prepareMemberForDeletion,
  processPendingMerges,
  tryAssignMemberToPaymentSlot,
} from "@/lib/matrix";
import { deleteAuthUser } from "@/lib/auth";
import {
  syncContributionTransactionStatus,
  syncContributionTransactions,
} from "@/lib/transaction-ledger";
import { updatePlatformSettings } from "@/lib/platform-settings";
import type { Member } from "@/types/database";

async function logAction(
  adminMemberId: string,
  action: string,
  targetType: string,
  targetId: string | null,
  details: Record<string, unknown> = {}
) {
  return createAdminActivityLog({
    adminMemberId,
    action,
    targetType,
    targetId,
    details,
  });
}

function assertNotSuspended(member: Member, label = "Member") {
  if (member.isSuspended) {
    throw new Error(`${label} is suspended`);
  }
}

export async function adminSuspendMember(
  adminMemberId: string,
  memberId: string,
  reason: string
) {
  const member = await findMemberById(memberId);
  if (!member) throw new Error("Member not found");
  if (member.role === "admin") throw new Error("Cannot suspend an admin account");

  const updated = await updateMember(memberId, {
    isSuspended: true,
    suspendedAt: new Date(),
    suspendedReason: reason.trim() || "Suspended by administrator",
    suspendedBy: adminMemberId,
  });

  await applySuspensionToMatrix(memberId);
  await processPendingMerges();

  await logAction(adminMemberId, "member.suspended", "member", memberId, {
    reason: updated.suspendedReason,
    memberId: member.memberId,
  });

  return (await findMemberById(memberId)) ?? updated;
}

export async function adminUnsuspendMember(
  adminMemberId: string,
  memberId: string
) {
  const member = await findMemberById(memberId);
  if (!member) throw new Error("Member not found");

  const updated = await updateMember(memberId, {
    isSuspended: false,
    suspendedAt: null,
    suspendedReason: null,
    suspendedBy: null,
  });

  if (
    !updated.hasPaidContribution &&
    updated.status === "pending" &&
    !updated.parentId
  ) {
    await updateMember(memberId, { rematchAfter: new Date(0) });
    await processPendingMerges();
  }

  await logAction(adminMemberId, "member.unsuspended", "member", memberId, {
    memberId: member.memberId,
  });

  return (await findMemberById(memberId)) ?? updated;
}

export async function adminManualMatch(
  adminMemberId: string,
  memberId: string,
  parentId: string,
  position?: "left" | "right"
) {
  const member = await findMemberById(memberId);
  const parent = await findMemberById(parentId);
  if (!member) throw new Error("Member not found");
  if (!parent) throw new Error("Parent member not found");
  assertNotSuspended(member);
  assertNotSuspended(parent, "Parent member");

  const result = await adminForceMatchMember(memberId, parentId, position);

  await logAction(adminMemberId, "member.manual_match", "member", memberId, {
    memberId: member.memberId,
    parentId: parent.memberId,
    parentMemberId: parent.id,
    position: result.position,
  });

  return result;
}

export async function adminReassignMemberPayee(
  adminMemberId: string,
  payerMemberId: string,
  newPayeeId: string,
  position?: "left" | "right"
) {
  const payer = await findMemberById(payerMemberId);
  const newPayee = await findMemberById(newPayeeId);
  if (!payer) throw new Error("Payer member not found");
  if (!newPayee) throw new Error("New payee not found");
  if (payer.id === newPayee.id) {
    throw new Error("Payer and payee cannot be the same member");
  }
  if (payer.hasPaidContribution && payer.status === "active") {
    throw new Error("Member has already paid for the current cycle");
  }
  assertNotSuspended(payer);
  assertNotSuspended(newPayee, "Payee");

  const oldPayee = payer.parentId ? await findMemberById(payer.parentId) : null;

  const result = await adminForceMatchMember(
    payerMemberId,
    newPayeeId,
    position
  );

  await logAction(
    adminMemberId,
    "member.payment_reassigned",
    "member",
    payerMemberId,
    {
      payerMemberId: payer.memberId,
      previousPayeeId: oldPayee?.memberId ?? null,
      newPayeeId: newPayee.memberId,
      position: result.position,
    }
  );

  return { ...result, previousPayee: oldPayee };
}

export async function adminChangeContributionPayee(
  adminMemberId: string,
  contributionId: string,
  newPayeeId: string,
  position?: "left" | "right"
) {
  const contribution = await findContributionById(contributionId);
  if (!contribution) throw new Error("Contribution not found");
  if (contribution.status === "confirmed") {
    throw new Error("Cannot change payee on a confirmed contribution");
  }

  const oldPayee = await findMemberById(contribution.toMemberId);
  const payer = await findMemberById(contribution.fromMemberId);
  if (!payer) throw new Error("Payer member not found");

  const result = await adminForceMatchMember(
    payer.id,
    newPayeeId,
    position
  );

  await logAction(
    adminMemberId,
    "contribution.payee_changed",
    "contribution",
    contributionId,
    {
      payerMemberId: payer.memberId,
      previousPayeeId: oldPayee?.memberId ?? null,
      newPayeeId: result.parent.memberId,
      position: result.position,
      amount: contribution.amount,
    }
  );

  return { ...result, previousPayee: oldPayee, contributionId };
}

async function queuePayerRematch(payerId: string) {
  const payer = await findMemberById(payerId);
  if (!payer || payer.hasPaidContribution || payer.status === "active") {
    return null;
  }

  await updateMember(payerId, { rematchAfter: new Date(0) });
  return tryAssignMemberToPaymentSlot(payer, [], {
    allowBeforeMatrixComplete: true,
    scheduleWaitOnNoSlot: true,
  });
}

export async function adminMarkContributionClaimed(
  adminMemberId: string,
  contributionId: string
) {
  const contribution = await findContributionById(contributionId);
  if (!contribution) throw new Error("Contribution not found");
  if (contribution.status === "confirmed") {
    throw new Error("Contribution is already confirmed");
  }
  if (contribution.status === "awaiting_confirmation") {
    throw new Error("Contribution is already awaiting confirmation");
  }
  if (contribution.status === "declined") {
    throw new Error("Cannot mark a declined contribution as claimed");
  }

  const updated = await updateContribution(contributionId, {
    status: "awaiting_confirmation",
    claimedAt: new Date(),
    declinedAt: null,
  });
  await syncContributionTransactionStatus(updated);

  await logAction(
    adminMemberId,
    "contribution.marked_claimed",
    "contribution",
    contributionId,
    { amount: updated.amount }
  );

  return updated;
}

export async function adminConfirmContribution(
  adminMemberId: string,
  contributionId: string
) {
  const contribution = await findContributionById(contributionId);
  if (!contribution) throw new Error("Contribution not found");
  if (contribution.status === "confirmed") {
    throw new Error("Contribution already confirmed");
  }
  if (contribution.status === "declined") {
    throw new Error("Cannot confirm a declined contribution");
  }

  if (contribution.status === "pending") {
    const claimed = await updateContribution(contributionId, {
      status: "awaiting_confirmation",
      claimedAt: new Date(),
      declinedAt: null,
    });
    await syncContributionTransactionStatus(claimed);
  }

  const confirmed = await approveContribution(
    contributionId,
    contribution.toMemberId
  );

  await logAction(
    adminMemberId,
    "contribution.confirmed",
    "contribution",
    contributionId,
    { amount: confirmed.amount }
  );

  return confirmed;
}

export async function adminDeclineContribution(
  adminMemberId: string,
  contributionId: string
) {
  const contribution = await findContributionById(contributionId);
  if (!contribution) throw new Error("Contribution not found");
  if (contribution.status === "confirmed") {
    throw new Error("Cannot decline a confirmed contribution");
  }

  if (contribution.status === "awaiting_confirmation") {
    const result = await declineContribution(
      contributionId,
      contribution.toMemberId
    );
    const declined =
      "contribution" in result ? result.contribution : result;

    await logAction(
      adminMemberId,
      "contribution.declined",
      "contribution",
      contributionId,
      {
        amount: declined.amount,
        rematched: "rematched" in result ? result.rematched : false,
      }
    );

    return result;
  }

  if (contribution.status === "pending") {
    const declined = await updateContribution(contributionId, {
      status: "declined",
      claimedAt: null,
      declinedAt: new Date(),
    });
    await syncContributionTransactionStatus(declined);
    await queuePayerRematch(contribution.fromMemberId);

    await logAction(
      adminMemberId,
      "contribution.declined",
      "contribution",
      contributionId,
      { amount: declined.amount, previousStatus: "pending" }
    );

    return { contribution: declined, rematched: true };
  }

  throw new Error("Contribution cannot be declined in its current state");
}

export async function adminRematchContributionPayer(
  adminMemberId: string,
  contributionId: string
) {
  const contribution = await findContributionById(contributionId);
  if (!contribution) throw new Error("Contribution not found");

  const payer = await findMemberById(contribution.fromMemberId);
  if (!payer) throw new Error("Payer not found");
  if (payer.hasPaidContribution || payer.status === "active") {
    throw new Error("Payer is already active — rematch not needed");
  }

  const result = await queuePayerRematch(payer.id);

  await logAction(
    adminMemberId,
    "contribution.payer_rematched",
    "contribution",
    contributionId,
    {
      payerMemberId: payer.memberId,
      assigned: result?.assigned ?? false,
    }
  );

  return { payer, result };
}

export async function adminCancelContribution(
  adminMemberId: string,
  contributionId: string
) {
  const contribution = await findContributionById(contributionId);
  if (!contribution) throw new Error("Contribution not found");
  if (contribution.status === "confirmed") {
    throw new Error("Cannot cancel a confirmed contribution");
  }

  const payerId = contribution.fromMemberId;
  await deleteContributionById(contributionId);
  await queuePayerRematch(payerId);

  await logAction(
    adminMemberId,
    "contribution.cancelled",
    "contribution",
    contributionId,
    { amount: contribution.amount, previousStatus: contribution.status }
  );

  return { deleted: true, contribution };
}

export async function adminUpdateContributionAmount(
  adminMemberId: string,
  contributionId: string,
  amount: number
) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be greater than zero");
  }

  const contribution = await findContributionById(contributionId);
  if (!contribution) throw new Error("Contribution not found");
  if (contribution.status === "confirmed") {
    throw new Error("Cannot change amount on a confirmed contribution");
  }

  const updated = await updateContribution(contributionId, { amount });
  await syncContributionTransactions(updated);

  await logAction(
    adminMemberId,
    "contribution.amount_changed",
    "contribution",
    contributionId,
    { previousAmount: contribution.amount, newAmount: amount }
  );

  return updated;
}

export async function adminUpdateSettings(
  adminMemberId: string,
  patch: { contributionAmount?: number; payoutAmount?: number }
) {
  const updated = await updatePlatformSettings(adminMemberId, patch);

  await logAction(adminMemberId, "settings.updated", "settings", null, {
    contributionAmount: updated.contributionAmount,
    payoutAmount: updated.payoutAmount,
  });

  return updated;
}

export async function adminClearEscalation(
  adminMemberId: string,
  memberId: string
) {
  const member = await findMemberById(memberId);
  if (!member) throw new Error("Member not found");

  const updated = await updateMember(memberId, {
    requiresAdminContact: false,
    paymentRejectionCount: 0,
  });

  await logAction(adminMemberId, "member.escalation_cleared", "member", memberId, {
    memberId: member.memberId,
  });

  return updated;
}

export async function adminUpdateMemberRole(
  adminMemberId: string,
  memberId: string,
  role: "member" | "admin"
) {
  const member = await findMemberById(memberId);
  if (!member) throw new Error("Member not found");
  if (memberId === adminMemberId && role !== "admin") {
    throw new Error("You cannot remove your own admin role");
  }

  const updated = await updateMember(memberId, { role });

  await logAction(adminMemberId, "member.role_changed", "member", memberId, {
    memberId: member.memberId,
    role,
  });

  return updated;
}

export async function adminUpdateMemberStatus(
  adminMemberId: string,
  memberId: string,
  status: "pending" | "active"
) {
  const member = await findMemberById(memberId);
  if (!member) throw new Error("Member not found");
  if (member.role === "admin") {
    throw new Error("Cannot change status of an admin account");
  }

  const patch: Partial<Member> = { status };
  if (status === "active") {
    patch.hasPaidContribution = true;
  } else {
    patch.hasPaidContribution = false;
  }

  const updated = await updateMember(memberId, patch);

  await logAction(adminMemberId, "member.status_changed", "member", memberId, {
    memberId: member.memberId,
    status,
  });

  return updated;
}

export async function adminDetachMember(
  adminMemberId: string,
  memberId: string
) {
  const { adminDetachMemberFromMatrix } = await import("@/lib/matrix");
  const member = await findMemberById(memberId);
  if (!member) throw new Error("Member not found");
  if (member.role === "admin") {
    throw new Error("Cannot detach an admin account from the matrix");
  }

  const updated = await adminDetachMemberFromMatrix(memberId);

  await logAction(adminMemberId, "member.detached", "member", memberId, {
    memberId: member.memberId,
  });

  return updated!;
}

export async function adminUpdateMemberProfile(
  adminMemberId: string,
  memberId: string,
  input: {
    fullName: string;
    email: string;
    phone: string;
    bankCode: string;
    bankName: string;
    accountNumber: string;
    accountName: string;
  }
) {
  const { findMemberByEmail, findMemberByPhone } = await import(
    "@/lib/db/repository"
  );
  const { updateAuthUser } = await import("@/lib/auth");
  const { normalizePhone } = await import("@/lib/phone");

  const member = await findMemberById(memberId);
  if (!member) throw new Error("Member not found");

  const normalizedEmail = input.email.trim().toLowerCase();
  const normalizedPhone = normalizePhone(input.phone.trim());

  const [emailTaken, phoneTaken] = await Promise.all([
    findMemberByEmail(normalizedEmail),
    findMemberByPhone(normalizedPhone),
  ]);

  if (emailTaken && emailTaken.id !== member.id) {
    throw new Error("This email is already registered");
  }
  if (phoneTaken && phoneTaken.id !== member.id) {
    throw new Error("This phone number is already registered");
  }

  if (member.authUserId) {
    await updateAuthUser(member.authUserId, {
      email: normalizedEmail !== member.email ? normalizedEmail : undefined,
      fullName: input.fullName.trim(),
      phone: normalizedPhone,
    });
  }

  const updated = await updateMember(memberId, {
    fullName: input.fullName.trim(),
    email: normalizedEmail,
    phone: normalizedPhone,
    bankCode: input.bankCode,
    bankName: input.bankName,
    accountNumber: input.accountNumber,
    accountName: input.accountName.trim(),
  });

  await logAction(adminMemberId, "member.profile_updated", "member", memberId, {
    memberId: member.memberId,
  });

  return updated;
}

export async function adminRunMatrixMaintenance(adminMemberId: string) {
  const { maintainMatrixState, repairStuckAfterMatrixComplete } = await import(
    "@/lib/matrix"
  );

  await maintainMatrixState();
  await repairStuckAfterMatrixComplete();

  await logAction(adminMemberId, "matrix.maintenance_run", "matrix", null, {});

  return { success: true };
}

export async function adminBulkSuspendMembers(
  adminMemberId: string,
  memberIds: string[],
  reason: string
) {
  const results = { success: 0, failed: [] as { id: string; error: string }[] };
  for (const id of memberIds) {
    try {
      await adminSuspendMember(adminMemberId, id, reason);
      results.success += 1;
    } catch (error) {
      results.failed.push({
        id,
        error: error instanceof Error ? error.message : "Failed",
      });
    }
  }
  await logAction(adminMemberId, "member.bulk_suspended", "member", null, {
    count: results.success,
    memberIds,
  });
  return results;
}

export async function adminBulkUnsuspendMembers(
  adminMemberId: string,
  memberIds: string[]
) {
  const results = { success: 0, failed: [] as { id: string; error: string }[] };
  for (const id of memberIds) {
    try {
      await adminUnsuspendMember(adminMemberId, id);
      results.success += 1;
    } catch (error) {
      results.failed.push({
        id,
        error: error instanceof Error ? error.message : "Failed",
      });
    }
  }
  await logAction(adminMemberId, "member.bulk_unsuspended", "member", null, {
    count: results.success,
    memberIds,
  });
  return results;
}

export async function adminBulkClearEscalations(
  adminMemberId: string,
  memberIds: string[]
) {
  const results = { success: 0, failed: [] as { id: string; error: string }[] };
  for (const id of memberIds) {
    try {
      await adminClearEscalation(adminMemberId, id);
      results.success += 1;
    } catch (error) {
      results.failed.push({
        id,
        error: error instanceof Error ? error.message : "Failed",
      });
    }
  }
  await logAction(
    adminMemberId,
    "member.bulk_escalation_cleared",
    "member",
    null,
    { count: results.success, memberIds }
  );
  return results;
}

export async function adminBulkCancelContributions(
  adminMemberId: string,
  contributionIds: string[]
) {
  const results = { success: 0, failed: [] as { id: string; error: string }[] };
  for (const id of contributionIds) {
    try {
      await adminCancelContribution(adminMemberId, id);
      results.success += 1;
    } catch (error) {
      results.failed.push({
        id,
        error: error instanceof Error ? error.message : "Failed",
      });
    }
  }
  await logAction(
    adminMemberId,
    "contribution.bulk_cancelled",
    "contribution",
    null,
    { count: results.success, contributionIds }
  );
  return results;
}

export async function adminDeleteMember(
  adminMemberId: string,
  memberId: string,
  options: {
    excludeFromRematch?: string[];
    skipProcessMerges?: boolean;
  } = {}
) {
  if (memberId === adminMemberId) {
    throw new Error("You cannot delete your own account");
  }

  const member = await findMemberById(memberId);
  if (!member) throw new Error("Member not found");
  if (member.role === "admin") {
    throw new Error("Cannot delete an admin account");
  }

  await prepareMemberForDeletion(memberId, [
    memberId,
    ...(options.excludeFromRematch ?? []),
  ]);

  const authUserId = member.authUserId;
  const memberRef = {
    memberId: member.memberId,
    fullName: member.fullName,
    email: member.email,
  };

  await deleteMember(memberId);

  if (authUserId) {
    try {
      await deleteAuthUser(authUserId);
    } catch {
      // Member row is already removed; auth cleanup is best-effort.
    }
  }

  await logAction(adminMemberId, "member.deleted", "member", memberId, memberRef);

  if (!options.skipProcessMerges) {
    await processPendingMerges();
  }

  return memberRef;
}

export async function adminBulkDeleteMembers(
  adminMemberId: string,
  memberIds: string[]
) {
  const uniqueIds = [...new Set(memberIds)].filter((id) => id !== adminMemberId);
  const results = {
    success: 0,
    failed: [] as { id: string; error: string }[],
    deleted: [] as { memberId: string; fullName: string }[],
  };

  for (const id of uniqueIds) {
    try {
      const deleted = await adminDeleteMember(adminMemberId, id, {
        excludeFromRematch: uniqueIds,
        skipProcessMerges: true,
      });
      results.success += 1;
      results.deleted.push({
        memberId: deleted.memberId,
        fullName: deleted.fullName,
      });
    } catch (error) {
      results.failed.push({
        id,
        error: error instanceof Error ? error.message : "Failed",
      });
    }
  }

  await processPendingMerges();

  await logAction(adminMemberId, "member.bulk_deleted", "member", null, {
    count: results.success,
    deleted: results.deleted,
    failed: results.failed,
  });

  return results;
}
