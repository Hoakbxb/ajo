export type MemberStatus = "pending" | "active";
export type MemberRole = "member" | "admin";
export type MatrixPosition = "left" | "right";
export type ContributionStatus =
  | "pending"
  | "awaiting_confirmation"
  | "confirmed"
  | "declined";

export type TransactionKind = "sent" | "received" | "payout";
export type TransactionStatus = ContributionStatus;

export interface MemberRow {
  id: string;
  member_id: string;
  full_name: string;
  email: string;
  phone: string;
  bank_code: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  password: string | null;
  auth_user_id: string | null;
  parent_id: string | null;
  left_child_id: string | null;
  right_child_id: string | null;
  position: MatrixPosition;
  matrix_level: number;
  status: MemberStatus;
  role: MemberRole;
  has_paid_contribution: boolean;
  payout_received: boolean;
  payout_amount: number;
  cycles_completed: number;
  payment_rejection_count: number;
  requires_admin_contact: boolean;
  is_suspended: boolean;
  suspended_at: string | null;
  suspended_reason: string | null;
  suspended_by: string | null;
  awaiting_rematch_since: string | null;
  rematch_after: string | null;
  joined_at: string;
  created_at: string;
  updated_at: string;
}

export interface ContributionRow {
  id: string;
  from_member_id: string;
  to_member_id: string;
  amount: number;
  cycle_number: number;
  status: ContributionStatus;
  claimed_at: string | null;
  confirmed_at: string | null;
  declined_at: string | null;
  payment_proof_path: string | null;
  payment_proof_uploaded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransactionRow {
  id: string;
  member_id: string;
  kind: TransactionKind;
  amount: number;
  status: TransactionStatus;
  counterparty_member_id: string | null;
  counterparty_name: string | null;
  contribution_id: string | null;
  cycle_number: number | null;
  reference: string;
  occurred_at: string;
  created_at: string;
  updated_at: string;
}

/** App-layer member (camelCase, `_id` for API compatibility). */
export interface Member {
  _id: string;
  id: string;
  memberId: string;
  fullName: string;
  email: string;
  phone: string;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  password?: string | null;
  authUserId?: string | null;
  parentId: string | null;
  leftChildId: string | null;
  rightChildId: string | null;
  position: MatrixPosition;
  matrixLevel: number;
  status: MemberStatus;
  role: MemberRole;
  hasPaidContribution: boolean;
  payoutReceived: boolean;
  payoutAmount: number;
  cyclesCompleted: number;
  paymentRejectionCount: number;
  requiresAdminContact: boolean;
  isSuspended: boolean;
  suspendedAt?: Date | null;
  suspendedReason?: string | null;
  suspendedBy?: string | null;
  awaitingRematchSince: Date | null;
  rematchAfter: Date | null;
  joinedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Contribution {
  _id: string;
  id: string;
  fromMemberId: string;
  toMemberId: string;
  amount: number;
  cycleNumber: number;
  status: ContributionStatus;
  claimedAt: Date | null;
  confirmedAt: Date | null;
  declinedAt: Date | null;
  paymentProofPath: string | null;
  paymentProofUploadedAt: Date | null;
  createdAt: Date;
  updatedAt?: Date;
}

export interface Transaction {
  _id: string;
  id: string;
  memberId: string;
  kind: TransactionKind;
  amount: number;
  status: TransactionStatus;
  counterpartyMemberId: string | null;
  counterpartyName: string | null;
  contributionId: string | null;
  cycleNumber: number | null;
  reference: string;
  occurredAt: Date;
  createdAt: Date;
  updatedAt?: Date;
}

export type IMember = Member;
export type IContribution = Contribution;

export interface PlatformSettingsRow {
  id: number;
  contribution_amount: number;
  payout_amount: number;
  updated_by: string | null;
  updated_at: string;
}

export interface PlatformSettings {
  contributionAmount: number;
  payoutAmount: number;
  updatedBy: string | null;
  updatedAt: Date;
}

export interface AdminActivityLogRow {
  id: string;
  admin_member_id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export interface AdminActivityLog {
  id: string;
  adminMemberId: string;
  action: string;
  targetType: string;
  targetId: string | null;
  details: Record<string, unknown>;
  createdAt: Date;
  adminName?: string;
}

export interface PasswordResetTokenRow {
  id: string;
  member_id: string;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export interface PasswordResetToken {
  id: string;
  memberId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}
