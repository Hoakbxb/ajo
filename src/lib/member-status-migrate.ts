import {
  updateManyMembers,
  updateMembersWherePosition,
  updateMembersWhereStatusIn,
} from "@/lib/db/repository";

export async function migrateMemberStatuses() {
  await updateManyMembers({ status: "pending_payment" }, { status: "pending" });
  await updateMembersWhereStatusIn(["eligible", "complete"], { status: "active" });
  await updateMembersWherePosition("root", { position: "left" });
}
