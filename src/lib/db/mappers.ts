import type {
  Contribution,
  ContributionRow,
  Member,
  MemberRow,
  Transaction,
  TransactionRow,
} from "@/types/database";

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  return new Date(value);
}

export function toMember(row: MemberRow): Member {
  return {
    _id: row.id,
    id: row.id,
    memberId: row.member_id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    bankCode: row.bank_code,
    bankName: row.bank_name,
    accountNumber: row.account_number,
    accountName: row.account_name,
    password: row.password,
    authUserId: row.auth_user_id,
    parentId: row.parent_id,
    leftChildId: row.left_child_id,
    rightChildId: row.right_child_id,
    position: row.position,
    matrixLevel: row.matrix_level,
    status: row.status,
    role: row.role,
    hasPaidContribution: row.has_paid_contribution,
    payoutReceived: row.payout_received,
    payoutAmount: row.payout_amount,
    cyclesCompleted: row.cycles_completed,
    paymentRejectionCount: row.payment_rejection_count,
    requiresAdminContact: row.requires_admin_contact,
    isSuspended: row.is_suspended,
    suspendedAt: parseDate(row.suspended_at),
    suspendedReason: row.suspended_reason,
    suspendedBy: row.suspended_by,
    awaitingRematchSince: parseDate(row.awaiting_rematch_since),
    rematchAfter: parseDate(row.rematch_after),
    joinedAt: new Date(row.joined_at),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export function toContribution(row: ContributionRow): Contribution {
  return {
    _id: row.id,
    id: row.id,
    fromMemberId: row.from_member_id,
    toMemberId: row.to_member_id,
    amount: row.amount,
    cycleNumber: row.cycle_number,
    status: row.status,
    claimedAt: parseDate(row.claimed_at),
    confirmedAt: parseDate(row.confirmed_at),
    declinedAt: parseDate(row.declined_at),
    paymentProofPath: row.payment_proof_path,
    paymentProofUploadedAt: parseDate(row.payment_proof_uploaded_at),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export function toTransaction(row: TransactionRow): Transaction {
  return {
    _id: row.id,
    id: row.id,
    memberId: row.member_id,
    kind: row.kind,
    amount: row.amount,
    status: row.status,
    counterpartyMemberId: row.counterparty_member_id,
    counterpartyName: row.counterparty_name,
    contributionId: row.contribution_id,
    cycleNumber: row.cycle_number,
    reference: row.reference,
    occurredAt: new Date(row.occurred_at),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export function memberPatchToRow(
  patch: Partial<Member>
): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (patch.memberId !== undefined) row.member_id = patch.memberId;
  if (patch.fullName !== undefined) row.full_name = patch.fullName;
  if (patch.email !== undefined) row.email = patch.email;
  if (patch.phone !== undefined) row.phone = patch.phone;
  if (patch.bankCode !== undefined) row.bank_code = patch.bankCode;
  if (patch.bankName !== undefined) row.bank_name = patch.bankName;
  if (patch.accountNumber !== undefined) row.account_number = patch.accountNumber;
  if (patch.accountName !== undefined) row.account_name = patch.accountName;
  if (patch.password !== undefined) row.password = patch.password;
  if (patch.authUserId !== undefined) row.auth_user_id = patch.authUserId;
  if (patch.parentId !== undefined) row.parent_id = patch.parentId;
  if (patch.leftChildId !== undefined) row.left_child_id = patch.leftChildId;
  if (patch.rightChildId !== undefined) row.right_child_id = patch.rightChildId;
  if (patch.position !== undefined) row.position = patch.position;
  if (patch.matrixLevel !== undefined) row.matrix_level = patch.matrixLevel;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.role !== undefined) row.role = patch.role;
  if (patch.hasPaidContribution !== undefined)
    row.has_paid_contribution = patch.hasPaidContribution;
  if (patch.payoutReceived !== undefined)
    row.payout_received = patch.payoutReceived;
  if (patch.payoutAmount !== undefined) row.payout_amount = patch.payoutAmount;
  if (patch.cyclesCompleted !== undefined)
    row.cycles_completed = patch.cyclesCompleted;
  if (patch.paymentRejectionCount !== undefined)
    row.payment_rejection_count = patch.paymentRejectionCount;
  if (patch.requiresAdminContact !== undefined)
    row.requires_admin_contact = patch.requiresAdminContact;
  if (patch.isSuspended !== undefined) row.is_suspended = patch.isSuspended;
  if (patch.suspendedAt !== undefined)
    row.suspended_at = patch.suspendedAt?.toISOString() ?? null;
  if (patch.suspendedReason !== undefined)
    row.suspended_reason = patch.suspendedReason;
  if (patch.suspendedBy !== undefined) row.suspended_by = patch.suspendedBy;
  if (patch.awaitingRematchSince !== undefined)
    row.awaiting_rematch_since = patch.awaitingRematchSince?.toISOString() ?? null;
  if (patch.rematchAfter !== undefined)
    row.rematch_after = patch.rematchAfter?.toISOString() ?? null;
  return row;
}

export function omitMemberPassword<T extends { password?: string | null }>(
  member: T
): Omit<T, "password"> {
  const { password: _, ...safeMember } = member;
  return safeMember;
}

export function contributionPatchToRow(
  patch: Partial<Contribution>
): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.amount !== undefined) row.amount = patch.amount;
  if (patch.claimedAt !== undefined)
    row.claimed_at = patch.claimedAt?.toISOString() ?? null;
  if (patch.confirmedAt !== undefined)
    row.confirmed_at = patch.confirmedAt?.toISOString() ?? null;
  if (patch.declinedAt !== undefined)
    row.declined_at = patch.declinedAt?.toISOString() ?? null;
  if (patch.paymentProofPath !== undefined)
    row.payment_proof_path = patch.paymentProofPath;
  if (patch.paymentProofUploadedAt !== undefined)
    row.payment_proof_uploaded_at =
      patch.paymentProofUploadedAt?.toISOString() ?? null;
  return row;
}
