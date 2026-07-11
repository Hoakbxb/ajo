import type { ContributionStatus } from "@/types/database";

export interface AdminMemberRef {
  _id: string;
  memberId: string;
  fullName: string;
  phone?: string;
  email?: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
}

export interface AdminMatchingMetrics {
  awaitingMerge: number;
  needsPayment: number;
  awaitingConfirmation: number;
  totalPaymentPipeline: number;
  activeBuildersWithOpenSlots: number;
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

export interface AdminMemberListItem {
  id: string;
  memberId: string;
  fullName: string;
  email: string;
  phone: string;
  status: string;
  role: string;
  hasPaidContribution: boolean;
  cyclesCompleted: number;
  isSuspended?: boolean;
  requiresAdminContact: boolean;
  joinedAt: string;
  parentId?: string | null;
  matchPaymentStatus?: MemberMatchPaymentStatus;
}

export interface AdminContributionListItem {
  _id: string;
  amount: number;
  status: ContributionStatus;
  cycleNumber?: number;
  createdAt: string;
  claimedAt?: string | null;
  confirmedAt?: string | null;
  declinedAt?: string | null;
  fromMemberId: AdminMemberRef;
  toMemberId: AdminMemberRef;
  paymentProofPath?: string | null;
  paymentProofUploadedAt?: string | null;
  paymentProofUrl?: string | null;
  payeeCircle?: {
    slotsFilled: number;
    paidDownlines: number;
    remainingToComplete: number;
    circleComplete: boolean;
  } | null;
}

export type AdminContributionAction =
  | "confirm"
  | "decline"
  | "cancel"
  | "update_amount"
  | "mark_claimed"
  | "rematch_payer"
  | "change_payee";

export interface AdminEscalationItem {
  id: string;
  memberId: string;
  fullName: string;
  email: string;
  phone: string;
  status: string;
  isSuspended?: boolean;
  paymentRejectionCount: number;
  joinedAt: string;
}

export interface AdminActivityItem {
  id: string;
  adminName: string;
  action: string;
  targetType: string;
  targetId: string | null;
  details: Record<string, unknown>;
  createdAt: string;
}

export type AdminActivityFilter =
  | "all"
  | "member"
  | "contribution"
  | "settings";

export interface AdminMatrixRow {
  id: string;
  memberId: string;
  fullName: string;
  status: string;
  role: string;
  position: string;
  matrixLevel: number;
  hasPaidContribution: boolean;
  cyclesCompleted: number;
  parent: {
    id: string;
    memberId: string;
    fullName: string;
    hasPaidContribution?: boolean;
    status?: string;
  } | null;
  leftChild: {
    id: string;
    memberId: string;
    fullName: string;
    hasPaidContribution?: boolean;
    status?: string;
  } | null;
  rightChild: {
    id: string;
    memberId: string;
    fullName: string;
    hasPaidContribution?: boolean;
    status?: string;
  } | null;
  slotsFilled: number;
  slotsOpen: number;
  bothChildrenPaid: boolean;
}
