import { findMemberById, findMembersByIds } from "@/lib/db/repository";
import type { Contribution, Member } from "@/types/database";

export type PopulatedMemberRef = {
  _id: string;
  memberId: string;
  fullName: string;
  phone?: string;
  bankName?: string;
  bankCode?: string;
  accountNumber?: string;
  accountName?: string;
  email?: string;
};

export async function populateMemberRef(
  id: string | null,
  fields: (keyof Member)[] = ["memberId", "fullName"]
): Promise<PopulatedMemberRef | null> {
  if (!id) return null;
  const m = await findMemberById(id);
  if (!m) return null;
  const ref: PopulatedMemberRef = {
    _id: m.id,
    memberId: m.memberId,
    fullName: m.fullName,
  };
  if (fields.includes("phone")) ref.phone = m.phone;
  if (fields.includes("bankName")) ref.bankName = m.bankName;
  if (fields.includes("bankCode")) ref.bankCode = m.bankCode;
  if (fields.includes("accountNumber")) ref.accountNumber = m.accountNumber;
  if (fields.includes("accountName")) ref.accountName = m.accountName;
  if (fields.includes("email")) ref.email = m.email;
  return ref;
}

export async function populateContributions(contributions: Contribution[]) {
  const memberIds = new Set<string>();
  for (const c of contributions) {
    memberIds.add(c.fromMemberId);
    memberIds.add(c.toMemberId);
  }
  const members = await findMembersByIds([...memberIds]);
  const byId = new Map(members.map((m) => [m.id, m]));

  return contributions.map((c) => ({
    ...c,
    fromMemberId: byId.get(c.fromMemberId)
      ? {
          _id: byId.get(c.fromMemberId)!.id,
          memberId: byId.get(c.fromMemberId)!.memberId,
          fullName: byId.get(c.fromMemberId)!.fullName,
          phone: byId.get(c.fromMemberId)!.phone,
          bankName: byId.get(c.fromMemberId)!.bankName,
          accountNumber: byId.get(c.fromMemberId)!.accountNumber,
          accountName: byId.get(c.fromMemberId)!.accountName,
        }
      : c.fromMemberId,
    toMemberId: byId.get(c.toMemberId)
      ? {
          _id: byId.get(c.toMemberId)!.id,
          memberId: byId.get(c.toMemberId)!.memberId,
          fullName: byId.get(c.toMemberId)!.fullName,
        }
      : c.toMemberId,
  }));
}
