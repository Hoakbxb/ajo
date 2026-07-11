import { findAllMembers, findContributions } from "@/lib/db/repository";

async function main() {
  const members = await findAllMembers();

  console.log("=== Database verification ===\n");

  for (const m of members) {
    const pendingOut = await findContributions({
      fromMemberId: m.id,
      status: ["pending", "awaiting_confirmation"],
    });
    console.log(
      `${m.memberId} | ${m.status} | paid:${m.hasPaidContribution} | parent:${m.parentId ?? "—"} | pendingOut:${pendingOut.length}`
    );
  }

  console.log(`\nTotal members: ${members.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
