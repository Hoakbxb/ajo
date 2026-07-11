export type MemberStatus = "pending" | "active";

const ACTIVE_STATUSES = new Set(["active", "eligible"]);
const PENDING_STATUSES = new Set(["pending", "pending_payment"]);

export function isActiveStatus(status: string): boolean {
  return ACTIVE_STATUSES.has(status);
}

export function isPendingStatus(status: string): boolean {
  return PENDING_STATUSES.has(status);
}

export function formatMemberStatusLabel(status: string): string {
  if (isActiveStatus(status)) return "Active";
  return "Pending";
}

export function memberStatusBadgeClass(status: string): string {
  if (isActiveStatus(status)) return "bg-emerald-100 text-emerald-800";
  return "bg-orange-100 text-orange-800";
}

export function canReceiveMemberPayments(member: {
  role: string;
  isSuspended?: boolean;
}): boolean {
  return member.role !== "admin" && !member.isSuspended;
}
