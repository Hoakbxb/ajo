import { getSupabaseAdmin } from "@/lib/supabase/server";
import {
  contributionPatchToRow,
  memberPatchToRow,
  toContribution,
  toMember,
  toTransaction,
} from "@/lib/db/mappers";
import type {
  Contribution,
  ContributionRow,
  ContributionStatus,
  Member,
  MemberRow,
  Transaction,
  TransactionKind,
  TransactionRow,
  TransactionStatus,
  PlatformSettings,
  PlatformSettingsRow,
  AdminActivityLog,
  AdminActivityLogRow,
  PasswordResetToken,
  PasswordResetTokenRow,
} from "@/types/database";

const MEMBERS = "members";
const CONTRIBUTIONS = "contributions";
const TRANSACTIONS = "transactions";

function throwIfError(error: { message: string } | null, context: string) {
  if (error) throw new Error(`${context}: ${error.message}`);
}

export async function countMembers(): Promise<number> {
  const { count, error } = await getSupabaseAdmin()
    .from(MEMBERS)
    .select("*", { count: "exact", head: true });
  throwIfError(error, "countMembers");
  return count ?? 0;
}

export async function findMemberById(id: string): Promise<Member | null> {
  const { data, error } = await getSupabaseAdmin()
    .from(MEMBERS)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  throwIfError(error, "findMemberById");
  return data ? toMember(data as MemberRow) : null;
}

export async function findMemberByAuthUserId(
  authUserId: string
): Promise<Member | null> {
  const { data, error } = await getSupabaseAdmin()
    .from(MEMBERS)
    .select("*")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  throwIfError(error, "findMemberByAuthUserId");
  return data ? toMember(data as MemberRow) : null;
}

export async function findMemberByEmail(email: string): Promise<Member | null> {
  const { data, error } = await getSupabaseAdmin()
    .from(MEMBERS)
    .select("*")
    .eq("email", email)
    .maybeSingle();
  throwIfError(error, "findMemberByEmail");
  return data ? toMember(data as MemberRow) : null;
}

export async function findMemberByPhone(phone: string): Promise<Member | null> {
  const { data, error } = await getSupabaseAdmin()
    .from(MEMBERS)
    .select("*")
    .eq("phone", phone)
    .maybeSingle();
  throwIfError(error, "findMemberByPhone");
  return data ? toMember(data as MemberRow) : null;
}

export async function findMembers(filter: {
  status?: string;
  role?: string;
  hasPaidContribution?: boolean;
  requiresAdminContact?: boolean;
  parentId?: string | null;
  excludeId?: string;
}): Promise<Member[]> {
  let query = getSupabaseAdmin().from(MEMBERS).select("*");

  if (filter.status) query = query.eq("status", filter.status);
  if (filter.role) query = query.eq("role", filter.role);
  if (filter.hasPaidContribution !== undefined)
    query = query.eq("has_paid_contribution", filter.hasPaidContribution);
  if (filter.requiresAdminContact !== undefined)
    query = query.eq("requires_admin_contact", filter.requiresAdminContact);
  if (filter.parentId === null) query = query.is("parent_id", null);
  else if (filter.parentId) query = query.eq("parent_id", filter.parentId);
  if (filter.excludeId) query = query.neq("id", filter.excludeId);

  const { data, error } = await query;
  throwIfError(error, "findMembers");
  return (data as MemberRow[]).map(toMember);
}

export async function findMembersWithChild(childId: string): Promise<Member[]> {
  const { data, error } = await getSupabaseAdmin()
    .from(MEMBERS)
    .select("*")
    .or(`left_child_id.eq.${childId},right_child_id.eq.${childId}`);
  throwIfError(error, "findMembersWithChild");
  return (data as MemberRow[]).map(toMember);
}

export async function findMembersByIds(ids: string[]): Promise<Member[]> {
  if (ids.length === 0) return [];
  const { data, error } = await getSupabaseAdmin()
    .from(MEMBERS)
    .select("*")
    .in("id", ids);
  throwIfError(error, "findMembersByIds");
  return (data as MemberRow[]).map(toMember);
}

export async function findAllMembers(): Promise<Member[]> {
  const { data, error } = await getSupabaseAdmin()
    .from(MEMBERS)
    .select("*")
    .order("member_id", { ascending: true });
  throwIfError(error, "findAllMembers");
  return (data as MemberRow[]).map(toMember);
}

export async function findTreeApexMember(): Promise<Member | null> {
  const { data, error } = await getSupabaseAdmin()
    .from(MEMBERS)
    .select("*")
    .is("parent_id", null)
    .eq("status", "active")
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  throwIfError(error, "findTreeApexMember active");
  if (data) return toMember(data as MemberRow);

  const fallback = await getSupabaseAdmin()
    .from(MEMBERS)
    .select("*")
    .is("parent_id", null)
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  throwIfError(fallback.error, "findTreeApexMember fallback");
  return fallback.data ? toMember(fallback.data as MemberRow) : null;
}

export async function findActiveBuilders(): Promise<Member[]> {
  const { data, error } = await getSupabaseAdmin()
    .from(MEMBERS)
    .select("*")
    .eq("status", "active")
    .eq("has_paid_contribution", true)
    .eq("role", "member")
    .eq("is_suspended", false);
  throwIfError(error, "findActiveBuilders");
  return (data as MemberRow[]).map(toMember);
}

export async function findReadyForCycleRestart(): Promise<Member[]> {
  const { data, error } = await getSupabaseAdmin()
    .from(MEMBERS)
    .select("*")
    .eq("status", "active")
    .eq("has_paid_contribution", true)
    .not("left_child_id", "is", null)
    .not("right_child_id", "is", null);
  throwIfError(error, "findReadyForCycleRestart");
  return (data as MemberRow[]).map(toMember);
}

export async function createMember(
  input: Omit<
    Member,
    | "_id"
    | "id"
    | "createdAt"
    | "updatedAt"
    | "awaitingRematchSince"
    | "rematchAfter"
    | "joinedAt"
    | "referredByMemberId"
    | "referralBalance"
    | "contributionCredit"
  > & {
    authUserId: string;
    isSuspended?: boolean;
    suspendedAt?: Date | null;
    suspendedReason?: string | null;
    suspendedBy?: string | null;
    awaitingRematchSince?: Date | null;
    rematchAfter?: Date | null;
    joinedAt?: Date;
    referredByMemberId?: string | null;
    referralBalance?: number;
    contributionCredit?: number;
  }
): Promise<Member> {
  const { data, error } = await getSupabaseAdmin()
    .from(MEMBERS)
    .insert({
      member_id: input.memberId,
      full_name: input.fullName,
      email: input.email,
      phone: input.phone,
      bank_code: input.bankCode,
      bank_name: input.bankName,
      account_number: input.accountNumber,
      account_name: input.accountName,
      password: input.password ?? null,
      auth_user_id: input.authUserId,
      parent_id: input.parentId,
      left_child_id: input.leftChildId,
      right_child_id: input.rightChildId,
      position: input.position,
      matrix_level: input.matrixLevel,
      status: input.status,
      role: input.role ?? "member",
      has_paid_contribution: input.hasPaidContribution,
      payout_received: input.payoutReceived,
      payout_amount: input.payoutAmount,
      cycles_completed: input.cyclesCompleted,
      payment_rejection_count: input.paymentRejectionCount,
      requires_admin_contact: input.requiresAdminContact,
      is_suspended: input.isSuspended ?? false,
      suspended_at: input.suspendedAt?.toISOString() ?? null,
      suspended_reason: input.suspendedReason ?? null,
      suspended_by: input.suspendedBy ?? null,
      awaiting_rematch_since:
        input.awaitingRematchSince?.toISOString() ?? null,
      rematch_after: input.rematchAfter?.toISOString() ?? null,
      referred_by_member_id: input.referredByMemberId ?? null,
      referral_balance: input.referralBalance ?? 0,
      contribution_credit: input.contributionCredit ?? 0,
      joined_at: input.joinedAt?.toISOString() ?? new Date().toISOString(),
    })
    .select("*")
    .single();
  throwIfError(error, "createMember");
  return toMember(data as MemberRow);
}

export async function updateMember(
  id: string,
  patch: Partial<Member>
): Promise<Member> {
  const row = memberPatchToRow(patch);
  if (Object.keys(row).length === 0) {
    const existing = await findMemberById(id);
    if (!existing) throw new Error("Member not found");
    return existing;
  }
  const { data, error } = await getSupabaseAdmin()
    .from(MEMBERS)
    .update(row)
    .eq("id", id)
    .select("*")
    .single();
  throwIfError(error, "updateMember");
  return toMember(data as MemberRow);
}

export async function deleteMember(id: string): Promise<void> {
  const { error } = await getSupabaseAdmin().from(MEMBERS).delete().eq("id", id);
  throwIfError(error, "deleteMember");
}

export async function countMembersWithFilter(filter: {
  status?: string | string[];
  hasPaidContribution?: boolean;
  payoutAmountGt?: number;
  cyclesCompleted?: number;
  cyclesCompletedGt?: number;
}): Promise<number> {
  let query = getSupabaseAdmin()
    .from(MEMBERS)
    .select("*", { count: "exact", head: true });
  if (filter.status) {
    if (Array.isArray(filter.status))
      query = query.in("status", filter.status);
    else query = query.eq("status", filter.status);
  }
  if (filter.hasPaidContribution !== undefined)
    query = query.eq("has_paid_contribution", filter.hasPaidContribution);
  if (filter.payoutAmountGt !== undefined)
    query = query.gt("payout_amount", filter.payoutAmountGt);
  if (filter.cyclesCompleted !== undefined)
    query = query.eq("cycles_completed", filter.cyclesCompleted);
  if (filter.cyclesCompletedGt !== undefined)
    query = query.gt("cycles_completed", filter.cyclesCompletedGt);
  const { count, error } = await query;
  throwIfError(error, "countMembersWithFilter");
  return count ?? 0;
}

// ─── Contributions ───────────────────────────────────────────────────────────

export async function findContributionById(
  id: string
): Promise<Contribution | null> {
  const { data, error } = await getSupabaseAdmin()
    .from(CONTRIBUTIONS)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  throwIfError(error, "findContributionById");
  return data ? toContribution(data as ContributionRow) : null;
}

export async function findContributions(filter: {
  fromMemberId?: string;
  toMemberId?: string;
  status?: ContributionStatus | ContributionStatus[];
  cycleNumber?: number;
  excludeId?: string;
}): Promise<Contribution[]> {
  let query = getSupabaseAdmin().from(CONTRIBUTIONS).select("*");
  if (filter.fromMemberId) query = query.eq("from_member_id", filter.fromMemberId);
  if (filter.toMemberId) query = query.eq("to_member_id", filter.toMemberId);
  if (filter.cycleNumber !== undefined)
    query = query.eq("cycle_number", filter.cycleNumber);
  if (filter.excludeId) query = query.neq("id", filter.excludeId);
  if (filter.status) {
    if (Array.isArray(filter.status)) query = query.in("status", filter.status);
    else query = query.eq("status", filter.status);
  }
  const { data, error } = await query.order("created_at", { ascending: true });
  throwIfError(error, "findContributions");
  return (data as ContributionRow[]).map(toContribution);
}

export async function findOneContribution(filter: {
  fromMemberId?: string;
  toMemberId?: string;
  status?: ContributionStatus | ContributionStatus[];
  cycleNumber?: number;
  excludeId?: string;
}): Promise<Contribution | null> {
  let query = getSupabaseAdmin().from(CONTRIBUTIONS).select("*");
  if (filter.fromMemberId) query = query.eq("from_member_id", filter.fromMemberId);
  if (filter.toMemberId) query = query.eq("to_member_id", filter.toMemberId);
  if (filter.cycleNumber !== undefined)
    query = query.eq("cycle_number", filter.cycleNumber);
  if (filter.excludeId) query = query.neq("id", filter.excludeId);
  if (filter.status) {
    if (Array.isArray(filter.status)) query = query.in("status", filter.status);
    else query = query.eq("status", filter.status);
  }
  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  throwIfError(error, "findOneContribution");
  return data ? toContribution(data as ContributionRow) : null;
}

export async function contributionExists(filter: {
  fromMemberId: string;
  cycleNumber?: number;
  status?: ContributionStatus | ContributionStatus[];
}): Promise<boolean> {
  const c = await findOneContribution(filter);
  return !!c;
}

export async function createContribution(input: {
  fromMemberId: string;
  toMemberId: string;
  amount: number;
  cycleNumber: number;
  status?: ContributionStatus;
}): Promise<Contribution> {
  const { data, error } = await getSupabaseAdmin()
    .from(CONTRIBUTIONS)
    .insert({
      from_member_id: input.fromMemberId,
      to_member_id: input.toMemberId,
      amount: input.amount,
      cycle_number: input.cycleNumber,
      status: input.status ?? "pending",
    })
    .select("*")
    .single();
  throwIfError(error, "createContribution");
  return toContribution(data as ContributionRow);
}

export async function updateContribution(
  id: string,
  patch: Partial<Contribution>
): Promise<Contribution> {
  const row = contributionPatchToRow(patch);
  const { data, error } = await getSupabaseAdmin()
    .from(CONTRIBUTIONS)
    .update(row)
    .eq("id", id)
    .select("*")
    .single();
  throwIfError(error, "updateContribution");
  return toContribution(data as ContributionRow);
}

export async function deleteContributions(filter: {
  fromMemberId?: string;
  status?: ContributionStatus | ContributionStatus[];
  ids?: string[];
}): Promise<void> {
  let query = getSupabaseAdmin().from(CONTRIBUTIONS).delete();
  if (filter.fromMemberId) query = query.eq("from_member_id", filter.fromMemberId);
  if (filter.ids?.length) query = query.in("id", filter.ids);
  if (filter.status) {
    if (Array.isArray(filter.status)) query = query.in("status", filter.status);
    else query = query.eq("status", filter.status);
  }
  const { error } = await query;
  throwIfError(error, "deleteContributions");
}

export async function deleteContributionById(id: string): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from(CONTRIBUTIONS)
    .delete()
    .eq("id", id);
  throwIfError(error, "deleteContributionById");
}

export async function countContributions(filter: {
  status?: ContributionStatus | ContributionStatus[];
}): Promise<number> {
  let query = getSupabaseAdmin()
    .from(CONTRIBUTIONS)
    .select("*", { count: "exact", head: true });
  if (filter.status) {
    if (Array.isArray(filter.status)) query = query.in("status", filter.status);
    else query = query.eq("status", filter.status);
  }
  const { count, error } = await query;
  throwIfError(error, "countContributions");
  return count ?? 0;
}

export async function expireTimedOutContributions(
  cutoff: Date
): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from(CONTRIBUTIONS)
    .update({
      status: "pending",
      claimed_at: null,
      declined_at: new Date().toISOString(),
    })
    .eq("status", "awaiting_confirmation")
    .lte("claimed_at", cutoff.toISOString());
  throwIfError(error, "expireTimedOutContributions");
}

export async function updateManyMembers(
  filter: { status?: string },
  patch: Partial<Member>
): Promise<void> {
  const row = memberPatchToRow(patch);
  let query = getSupabaseAdmin().from(MEMBERS).update(row);
  if (filter.status) query = query.eq("status", filter.status);
  const { error } = await query;
  throwIfError(error, "updateManyMembers");
}

export async function updateMembersWherePosition(
  position: string,
  patch: Partial<Member>
): Promise<void> {
  const row = memberPatchToRow(patch);
  const { error } = await getSupabaseAdmin()
    .from(MEMBERS)
    .update(row)
    .eq("position", position);
  throwIfError(error, "updateMembersWherePosition");
}

export async function updateMembersWhereStatusIn(
  statuses: string[],
  patch: Partial<Member>
): Promise<void> {
  const row = memberPatchToRow(patch);
  const { error } = await getSupabaseAdmin()
    .from(MEMBERS)
    .update(row)
    .in("status", statuses);
  throwIfError(error, "updateMembersWhereStatusIn");
}

// ─── Transactions ────────────────────────────────────────────────────────────

export async function findTransactionsByMemberId(
  memberId: string
): Promise<Transaction[]> {
  const { data, error } = await getSupabaseAdmin()
    .from(TRANSACTIONS)
    .select("*")
    .eq("member_id", memberId)
    .order("occurred_at", { ascending: false });
  throwIfError(error, "findTransactionsByMemberId");
  return (data as TransactionRow[]).map(toTransaction);
}

export async function upsertContributionTransactions(input: {
  contributionId: string;
  amount: number;
  cycleNumber: number;
  status: TransactionStatus;
  occurredAt: Date;
  fromMember: Pick<Member, "id" | "fullName">;
  toMember: Pick<Member, "id" | "fullName">;
}): Promise<void> {
  const occurredAt = input.occurredAt.toISOString();
  const rows = [
    {
      member_id: input.fromMember.id,
      kind: "sent" as TransactionKind,
      amount: input.amount,
      status: input.status,
      counterparty_member_id: input.toMember.id,
      counterparty_name: input.toMember.fullName,
      contribution_id: input.contributionId,
      cycle_number: input.cycleNumber,
      reference: input.contributionId,
      occurred_at: occurredAt,
    },
    {
      member_id: input.toMember.id,
      kind: "received" as TransactionKind,
      amount: input.amount,
      status: input.status,
      counterparty_member_id: input.fromMember.id,
      counterparty_name: input.fromMember.fullName,
      contribution_id: input.contributionId,
      cycle_number: input.cycleNumber,
      reference: input.contributionId,
      occurred_at: occurredAt,
    },
  ];

  for (const row of rows) {
    const { data: existing, error: findError } = await getSupabaseAdmin()
      .from(TRANSACTIONS)
      .select("id")
      .eq("contribution_id", input.contributionId)
      .eq("member_id", row.member_id)
      .eq("kind", row.kind)
      .maybeSingle();
    throwIfError(findError, "upsertContributionTransactions.find");

    if (existing) {
      const { error } = await getSupabaseAdmin()
        .from(TRANSACTIONS)
        .update({
          amount: row.amount,
          status: row.status,
          counterparty_member_id: row.counterparty_member_id,
          counterparty_name: row.counterparty_name,
          cycle_number: row.cycle_number,
          reference: row.reference,
          occurred_at: row.occurred_at,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      throwIfError(error, "upsertContributionTransactions.update");
    } else {
      const { error } = await getSupabaseAdmin().from(TRANSACTIONS).insert(row);
      throwIfError(error, "upsertContributionTransactions.insert");
    }
  }
}

export async function updateTransactionsForContribution(
  contributionId: string,
  patch: {
    status: TransactionStatus;
    occurredAt?: Date;
  }
): Promise<void> {
  const row: Record<string, unknown> = {
    status: patch.status,
    updated_at: new Date().toISOString(),
  };
  if (patch.occurredAt) row.occurred_at = patch.occurredAt.toISOString();

  const { error } = await getSupabaseAdmin()
    .from(TRANSACTIONS)
    .update(row)
    .eq("contribution_id", contributionId);
  throwIfError(error, "updateTransactionsForContribution");
}

export async function upsertPayoutTransaction(input: {
  memberId: string;
  cycleNumber: number;
  amount: number;
  occurredAt: Date;
}): Promise<void> {
  const row = {
    member_id: input.memberId,
    kind: "payout" as TransactionKind,
    amount: input.amount,
    status: "confirmed" as TransactionStatus,
    counterparty_member_id: null,
    counterparty_name: null,
    contribution_id: null,
    cycle_number: input.cycleNumber,
    reference: `payout-cycle-${input.cycleNumber}`,
    occurred_at: input.occurredAt.toISOString(),
  };

  const { data: existing, error: findError } = await getSupabaseAdmin()
    .from(TRANSACTIONS)
    .select("id")
    .eq("member_id", input.memberId)
    .eq("kind", "payout")
    .eq("cycle_number", input.cycleNumber)
    .maybeSingle();
  throwIfError(findError, "upsertPayoutTransaction.find");

  if (existing) {
    const { error } = await getSupabaseAdmin()
      .from(TRANSACTIONS)
      .update({
        amount: row.amount,
        status: row.status,
        reference: row.reference,
        occurred_at: row.occurred_at,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    throwIfError(error, "upsertPayoutTransaction.update");
    return;
  }

  const { error } = await getSupabaseAdmin().from(TRANSACTIONS).insert(row);
  throwIfError(error, "upsertPayoutTransaction.insert");
}

export async function deleteTransactionsForMember(memberId: string): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from(TRANSACTIONS)
    .delete()
    .eq("member_id", memberId);
  throwIfError(error, "deleteTransactionsForMember");
}

// ─── Platform settings ───────────────────────────────────────────────────────

const PLATFORM_SETTINGS = "platform_settings";

export async function getPlatformSettingsRow(): Promise<PlatformSettings | null> {
  const { data, error } = await getSupabaseAdmin()
    .from(PLATFORM_SETTINGS)
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  throwIfError(error, "getPlatformSettingsRow");
  if (!data) return null;
  const row = data as PlatformSettingsRow;
  return {
    contributionAmount: row.contribution_amount,
    payoutAmount: row.payout_amount,
    updatedBy: row.updated_by,
    updatedAt: new Date(row.updated_at),
  };
}

export async function updatePlatformSettingsRow(input: {
  contributionAmount?: number;
  payoutAmount?: number;
  updatedBy: string;
}): Promise<PlatformSettings> {
  const patch: Record<string, unknown> = {
    updated_by: input.updatedBy,
    updated_at: new Date().toISOString(),
  };
  if (input.contributionAmount !== undefined)
    patch.contribution_amount = input.contributionAmount;
  if (input.payoutAmount !== undefined) patch.payout_amount = input.payoutAmount;

  const { data, error } = await getSupabaseAdmin()
    .from(PLATFORM_SETTINGS)
    .update(patch)
    .eq("id", 1)
    .select("*")
    .single();
  throwIfError(error, "updatePlatformSettingsRow");
  const row = data as PlatformSettingsRow;
  return {
    contributionAmount: row.contribution_amount,
    payoutAmount: row.payout_amount,
    updatedBy: row.updated_by,
    updatedAt: new Date(row.updated_at),
  };
}

// ─── Admin activity log ──────────────────────────────────────────────────────

const ADMIN_ACTIVITY_LOG = "admin_activity_log";

export async function createAdminActivityLog(input: {
  adminMemberId: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  details?: Record<string, unknown>;
}): Promise<AdminActivityLog> {
  const { data, error } = await getSupabaseAdmin()
    .from(ADMIN_ACTIVITY_LOG)
    .insert({
      admin_member_id: input.adminMemberId,
      action: input.action,
      target_type: input.targetType,
      target_id: input.targetId ?? null,
      details: input.details ?? {},
    })
    .select("*")
    .single();
  throwIfError(error, "createAdminActivityLog");
  const row = data as AdminActivityLogRow;
  return {
    id: row.id,
    adminMemberId: row.admin_member_id,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    details: row.details ?? {},
    createdAt: new Date(row.created_at),
  };
}

export async function findAdminActivityLogs(limit = 100): Promise<AdminActivityLog[]> {
  const { data, error } = await getSupabaseAdmin()
    .from(ADMIN_ACTIVITY_LOG)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  throwIfError(error, "findAdminActivityLogs");
  return (data as AdminActivityLogRow[]).map((row) => ({
    id: row.id,
    adminMemberId: row.admin_member_id,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    details: row.details ?? {},
    createdAt: new Date(row.created_at),
  }));
}

// ─── Password reset tokens ───────────────────────────────────────────────────

const PASSWORD_RESET_TOKENS = "password_reset_tokens";

function toPasswordResetToken(row: PasswordResetTokenRow): PasswordResetToken {
  return {
    id: row.id,
    memberId: row.member_id,
    tokenHash: row.token_hash,
    expiresAt: new Date(row.expires_at),
    usedAt: row.used_at ? new Date(row.used_at) : null,
    createdAt: new Date(row.created_at),
  };
}

export async function createPasswordResetToken(input: {
  memberId: string;
  tokenHash: string;
  expiresAt: Date;
}): Promise<PasswordResetToken> {
  await getSupabaseAdmin()
    .from(PASSWORD_RESET_TOKENS)
    .delete()
    .eq("member_id", input.memberId)
    .is("used_at", null);

  const { data, error } = await getSupabaseAdmin()
    .from(PASSWORD_RESET_TOKENS)
    .insert({
      member_id: input.memberId,
      token_hash: input.tokenHash,
      expires_at: input.expiresAt.toISOString(),
    })
    .select("*")
    .single();
  throwIfError(error, "createPasswordResetToken");
  return toPasswordResetToken(data as PasswordResetTokenRow);
}

export async function findPasswordResetTokenByHash(
  tokenHash: string
): Promise<PasswordResetToken | null> {
  const { data, error } = await getSupabaseAdmin()
    .from(PASSWORD_RESET_TOKENS)
    .select("*")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  throwIfError(error, "findPasswordResetTokenByHash");
  return data ? toPasswordResetToken(data as PasswordResetTokenRow) : null;
}

export async function markPasswordResetTokenUsed(id: string): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from(PASSWORD_RESET_TOKENS)
    .update({ used_at: new Date().toISOString() })
    .eq("id", id);
  throwIfError(error, "markPasswordResetTokenUsed");
}

// ─── Referrals ───────────────────────────────────────────────────────────────

const REFERRALS = "referrals";
const REFERRAL_REDEMPTIONS = "referral_redemptions";

function toReferral(row: {
  id: string;
  referrer_member_id: string;
  referred_member_id: string;
  reward_amount: number;
  status: string;
  qualified_at: string | null;
  created_at: string;
}): import("@/types/database").Referral {
  return {
    id: row.id,
    referrerMemberId: row.referrer_member_id,
    referredMemberId: row.referred_member_id,
    rewardAmount: row.reward_amount,
    status: row.status as import("@/types/database").ReferralStatus,
    qualifiedAt: row.qualified_at ? new Date(row.qualified_at) : null,
    createdAt: new Date(row.created_at),
  };
}

export async function findMemberByMemberId(
  memberId: string
): Promise<Member | null> {
  const { data, error } = await getSupabaseAdmin()
    .from(MEMBERS)
    .select("*")
    .eq("member_id", memberId.trim().toUpperCase())
    .maybeSingle();
  throwIfError(error, "findMemberByMemberId");
  return data ? toMember(data as MemberRow) : null;
}

export async function createReferral(input: {
  referrerMemberId: string;
  referredMemberId: string;
  rewardAmount: number;
}): Promise<import("@/types/database").Referral> {
  const { data, error } = await getSupabaseAdmin()
    .from(REFERRALS)
    .insert({
      referrer_member_id: input.referrerMemberId,
      referred_member_id: input.referredMemberId,
      reward_amount: input.rewardAmount,
      status: "pending",
    })
    .select("*")
    .single();
  throwIfError(error, "createReferral");
  return toReferral(data);
}

export async function findReferralByReferredMemberId(
  referredMemberId: string
): Promise<import("@/types/database").Referral | null> {
  const { data, error } = await getSupabaseAdmin()
    .from(REFERRALS)
    .select("*")
    .eq("referred_member_id", referredMemberId)
    .maybeSingle();
  throwIfError(error, "findReferralByReferredMemberId");
  return data ? toReferral(data) : null;
}

export async function findReferralsByReferrerId(
  referrerMemberId: string
): Promise<import("@/types/database").Referral[]> {
  const { data, error } = await getSupabaseAdmin()
    .from(REFERRALS)
    .select("*")
    .eq("referrer_member_id", referrerMemberId)
    .order("created_at", { ascending: false });
  throwIfError(error, "findReferralsByReferrerId");
  return (data ?? []).map(toReferral);
}

export async function updateReferral(
  id: string,
  patch: {
    status?: import("@/types/database").ReferralStatus;
    qualifiedAt?: Date | null;
  }
): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.qualifiedAt !== undefined)
    row.qualified_at = patch.qualifiedAt?.toISOString() ?? null;
  const { error } = await getSupabaseAdmin()
    .from(REFERRALS)
    .update(row)
    .eq("id", id);
  throwIfError(error, "updateReferral");
}

export async function createReferralRedemption(input: {
  memberId: string;
  amount: number;
  contributionId?: string | null;
}): Promise<void> {
  const { error } = await getSupabaseAdmin().from(REFERRAL_REDEMPTIONS).insert({
    member_id: input.memberId,
    amount: input.amount,
    contribution_id: input.contributionId ?? null,
  });
  throwIfError(error, "createReferralRedemption");
}

export async function upsertReferralTransaction(input: {
  memberId: string;
  amount: number;
  kind: "referral" | "referral_credit";
  counterpartyMemberId?: string | null;
  counterpartyName?: string | null;
  contributionId?: string | null;
  reference: string;
  occurredAt: Date;
}): Promise<void> {
  const row = {
    member_id: input.memberId,
    kind: input.kind,
    amount: input.amount,
    status: "confirmed" as TransactionStatus,
    counterparty_member_id: input.counterpartyMemberId ?? null,
    counterparty_name: input.counterpartyName ?? null,
    contribution_id: input.contributionId ?? null,
    cycle_number: null,
    reference: input.reference,
    occurred_at: input.occurredAt.toISOString(),
  };

  const { data: existing, error: findError } = await getSupabaseAdmin()
    .from(TRANSACTIONS)
    .select("id")
    .eq("member_id", input.memberId)
    .eq("reference", input.reference)
    .maybeSingle();
  throwIfError(findError, "upsertReferralTransaction.find");

  if (existing) {
    const { error } = await getSupabaseAdmin()
      .from(TRANSACTIONS)
      .update({
        amount: row.amount,
        status: row.status,
        occurred_at: row.occurred_at,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    throwIfError(error, "upsertReferralTransaction.update");
    return;
  }

  const { error } = await getSupabaseAdmin().from(TRANSACTIONS).insert(row);
  throwIfError(error, "upsertReferralTransaction.insert");
}

export async function countQualifiedReferrals(
  referrerMemberId: string
): Promise<number> {
  const { count, error } = await getSupabaseAdmin()
    .from(REFERRALS)
    .select("*", { count: "exact", head: true })
    .eq("referrer_member_id", referrerMemberId)
    .eq("status", "qualified");
  throwIfError(error, "countQualifiedReferrals");
  return count ?? 0;
}
