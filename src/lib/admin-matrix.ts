import type { Member } from "@/types/database";

export interface AdminMatrixMemberRef {
  id: string;
  memberId: string;
  fullName: string;
  hasPaidContribution?: boolean;
  status?: string;
}

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
  parent: AdminMatrixMemberRef | null;
  leftChild: AdminMatrixMemberRef | null;
  rightChild: AdminMatrixMemberRef | null;
  slotsFilled: number;
  slotsOpen: number;
  bothChildrenPaid: boolean;
}

function refFrom(member: Member | undefined): AdminMatrixMemberRef | null {
  if (!member) return null;
  return {
    id: member.id,
    memberId: member.memberId,
    fullName: member.fullName,
    hasPaidContribution: member.hasPaidContribution,
    status: member.status,
  };
}

export function getMemberCircleProgress(
  member: Member,
  byId: Map<string, Member>
): {
  slotsFilled: number;
  paidDownlines: number;
  remainingToComplete: number;
  circleComplete: boolean;
} {
  const left = member.leftChildId ? byId.get(member.leftChildId) : undefined;
  const right = member.rightChildId ? byId.get(member.rightChildId) : undefined;
  const paidDownlines =
    (left?.hasPaidContribution ? 1 : 0) + (right?.hasPaidContribution ? 1 : 0);

  return {
    slotsFilled: (left ? 1 : 0) + (right ? 1 : 0),
    paidDownlines,
    remainingToComplete: Math.max(0, 2 - paidDownlines),
    circleComplete: paidDownlines >= 2,
  };
}

export function buildAdminMatrixRows(members: Member[]): AdminMatrixRow[] {
  const byId = new Map(members.map((m) => [m.id, m]));

  return members.map((member) => {
    const parent = member.parentId ? byId.get(member.parentId) : undefined;
    const left = member.leftChildId ? byId.get(member.leftChildId) : undefined;
    const right = member.rightChildId
      ? byId.get(member.rightChildId)
      : undefined;

    const slotsFilled = (left ? 1 : 0) + (right ? 1 : 0);

    return {
      id: member.id,
      memberId: member.memberId,
      fullName: member.fullName,
      status: member.status,
      role: member.role,
      position: member.position,
      matrixLevel: member.matrixLevel,
      hasPaidContribution: member.hasPaidContribution,
      cyclesCompleted: member.cyclesCompleted ?? 0,
      parent: refFrom(parent),
      leftChild: refFrom(left),
      rightChild: refFrom(right),
      slotsFilled,
      slotsOpen: 2 - slotsFilled,
      bothChildrenPaid: Boolean(
        left?.hasPaidContribution && right?.hasPaidContribution
      ),
    };
  });
}
