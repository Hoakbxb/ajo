export type PaymentStatus = "unpaid" | "pending" | "completed";

export interface MemberSummary {
  _id: string;
  memberId: string;
  fullName: string;
  email: string;
  status: string;
  position: string;
  matrixLevel: number;
  hasPaidContribution: boolean;
  payoutReceived: boolean;
  joinedAt: string;
}

export interface MatrixNode {
  _id: string;
  memberId: string;
  fullName: string;
  status: string;
  position: string;
  matrixLevel: number;
  hasPaidContribution: boolean;
  payoutReceived: boolean;
  left: MatrixNode | null;
  right: MatrixNode | null;
}

export interface Stats {
  totalMembers: number;
  activeMembers: number;
  completeMembers: number;
  pendingContributions: number;
  confirmedContributions: number;
  totalContributionsValue: number;
  totalPayoutsValue: number;
  contributionAmount: number;
  payoutAmount: number;
}

export interface Contribution {
  _id: string;
  fromMemberId: {
    _id: string;
    memberId: string;
    fullName: string;
    phone?: string;
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
  };
  toMemberId: { _id: string; memberId: string; fullName: string };
  amount: number;
  cycleNumber?: number;
  status: string;
  claimedAt?: string | null;
  confirmedAt?: string | null;
  declinedAt?: string | null;
  createdAt: string;
  paymentProofPath?: string | null;
  paymentProofUploadedAt?: string | null;
  paymentProofUrl?: string | null;
  canDecline?: boolean;
}

export interface MemberDashboardData {
  member: {
    _id: string;
    memberId: string;
    fullName: string;
    email: string;
    phone: string;
    bankName: string;
    accountNumber: string;
    accountName: string;
    status: string;
    position: string;
    matrixLevel: number;
    hasPaidContribution: boolean;
    payoutReceived: boolean;
    payoutAmount: number;
    cyclesCompleted: number;
    paymentRejectionCount: number;
    requiresAdminContact: boolean;
    awaitingRematchSince?: string | null;
    rematchAfter?: string | null;
    parentId?: {
      memberId: string;
      fullName: string;
      email: string;
      phone: string;
      bankName: string;
      accountNumber: string;
      accountName: string;
    };
  };
  children: {
    left: { memberId: string; fullName: string; hasPaidContribution: boolean } | null;
    right: { memberId: string; fullName: string; hasPaidContribution: boolean } | null;
  };
  contributions: {
    outgoing: Contribution[];
    incoming: Contribution[];
    history?: Contribution[];
  };
  paymentStatus: PaymentStatus;
  matrixProgress: {
    slotsFilled: number;
    slotsTotal: number;
    bothChildrenPaid: boolean;
    readyForPayout: boolean;
    payoutReceived: boolean;
    payoutAmount: number;
    cyclesCompleted: number;
    currentCycle?: number;
    cycleJustRestarted: boolean;
    waitingForRematch: boolean;
    rematchAfter: string | null;
    awaitingPaymentConfirmation: boolean;
    contributionOwed: number;
  };
  referrals: {
    referralCode: string;
    referralLink: string;
    balance: number;
    contributionCredit: number;
    withdrawalThreshold: number;
    rewardPerReferral: number;
    canWithdraw: boolean;
    qualifiedCount: number;
  };
}
