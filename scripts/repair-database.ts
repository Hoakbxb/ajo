/**
 * Inspects and repairs member/contribution data (Supabase).
 * Run: npm run repair:db
 */
import {
  processPendingMerges,
  repairStuckAfterMatrixComplete,
} from "@/lib/matrix";
import { migrateMemberStatuses } from "@/lib/member-status-migrate";
import { findAllMembers } from "@/lib/db/repository";
import { findContributions } from "@/lib/db/repository";
import { PAYOUT_AMOUNT } from "@/lib/constants";
import { updateMember } from "@/lib/db/repository";
import { backfillAllTransactions } from "@/lib/transaction-ledger";

async function repairDatabase() {
  console.log("Connected to Supabase\n");

  await migrateMemberStatuses();

  const legacy = await findAllMembers();
  for (const m of legacy) {
    const expected = Math.floor(m.payoutAmount / PAYOUT_AMOUNT);
    if ((m.cyclesCompleted ?? 0) !== expected && m.payoutAmount >= PAYOUT_AMOUNT) {
      await updateMember(m.id, { cyclesCompleted: expected });
      console.log(`  ${m.memberId}: synced cyclesCompleted → ${expected}`);
    }
  }

  console.log("── Cycle repair ──");
  await repairStuckAfterMatrixComplete();
  await processPendingMerges();

  console.log("\n── Transaction ledger backfill ──");
  await backfillAllTransactions();

  console.log("\n── Final state ──");
  const members = await findAllMembers();
  for (const m of members) {
    const parent = m.parentId
      ? members.find((p) => p.id === m.parentId)
      : null;
    const pendingOut = await findContributions({
      fromMemberId: m.id,
      status: ["pending", "awaiting_confirmation"],
    });
    console.log(
      `${m.memberId} | ${m.status} | cycles:${m.cyclesCompleted ?? 0} | paid:${m.hasPaidContribution ? "yes" : "no"} | parent:${parent?.memberId ?? "—"} | slots:${(m.leftChildId ? 1 : 0) + (m.rightChildId ? 1 : 0)}/2 | pendingOut:${pendingOut.length}`
    );
  }

  console.log("\nRepair complete.");
}

repairDatabase().catch((error) => {
  console.error(error);
  process.exit(1);
});
