import { findAllMembers, findContributions, findMemberById } from "@/lib/db/repository";
import { CONTRIBUTION_AMOUNT } from "@/lib/constants";
import { isActiveStatus, isPendingStatus } from "@/lib/member-status";

async function main() {

  const members = await findAllMembers();
  const issues: string[] = [];

  console.log("=== Account audit ===\n");

  for (const m of members) {
    const parent = m.parentId ? await findMemberById(m.parentId) : null;
    const left = m.leftChildId ? await findMemberById(m.leftChildId) : null;
    const right = m.rightChildId ? await findMemberById(m.rightChildId) : null;

    const outgoing = await findContributions({ fromMemberId: m.id });
    const incoming = await findContributions({ toMemberId: m.id });
    const activeOutgoing = outgoing.filter((c) =>
      ["pending", "awaiting_confirmation"].includes(c.status)
    );

    console.log(`--- ${m.memberId} (${m.fullName}) ---`);
    console.log({
      status: m.status,
      position: m.position,
      paid: m.hasPaidContribution,
      payoutReceived: m.payoutReceived,
      payoutAmount: m.payoutAmount,
      parent: parent ? `${parent.memberId} (${parent.fullName})` : null,
      children: {
        left: left?.memberId ?? null,
        right: right?.memberId ?? null,
      },
      rematchAfter: m.rematchAfter,
      requiresAdmin: m.requiresAdminContact,
    });

    if (m.parentId && parent) {
      const childField = m.position === "left" ? "leftChildId" : "rightChildId";
      if (parent[childField] !== m.id) {
        const msg = `${m.memberId}: parent ${parent.memberId} does not list them as ${m.position} child`;
        issues.push(msg);
        console.log("ISSUE:", msg);
      }
    }

    if (
      isPendingStatus(m.status) &&
      !m.hasPaidContribution &&
      m.parentId &&
      activeOutgoing.length === 0
    ) {
      const msg = `${m.memberId}: pending with parent but no active outgoing contribution`;
      issues.push(msg);
      console.log("ISSUE:", msg);
    }

    if (
      isActiveStatus(m.status) &&
      m.hasPaidContribution &&
      left?.hasPaidContribution &&
      right?.hasPaidContribution
    ) {
      const msg = `${m.memberId}: both downlines paid but cycle not restarted`;
      issues.push(msg);
      console.log("ISSUE:", msg);
    }

    const expectedOwed =
      isPendingStatus(m.status) &&
      !m.hasPaidContribution &&
      m.parentId &&
      activeOutgoing.some((c) => c.status === "pending")
        ? CONTRIBUTION_AMOUNT
        : 0;
    console.log("expected payment owed:", expectedOwed > 0 ? `₦${expectedOwed}` : "none");
    console.log("");
  }

  console.log("=== Summary ===");
  if (issues.length === 0) {
    console.log("No issues found.");
  } else {
    console.log(`${issues.length} issue(s):`);
    for (const issue of issues) console.log(`- ${issue}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
