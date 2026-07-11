/**
 * Create or update the platform admin account.
 * Run: npm run seed:admin
 */
import { countMembers, createMember, findMemberByEmail, updateMember } from "@/lib/db/repository";
import { createAuthUser, deleteAuthUser, updateAuthUser } from "@/lib/auth";

const ADMIN = {
  fullName: process.env.ADMIN_NAME || "Platform Admin",
  email: process.env.ADMIN_EMAIL || "admin@friendsrewardcircle.com",
  phone: process.env.ADMIN_PHONE || "08099999999",
  password: process.env.ADMIN_PASSWORD || "admin1234",
};

async function main() {
  const existing = await findMemberByEmail(ADMIN.email);

  if (existing?.authUserId) {
    await updateAuthUser(existing.authUserId, {
      email: ADMIN.email,
      password: ADMIN.password,
      fullName: ADMIN.fullName,
      phone: ADMIN.phone,
    });
    await updateMember(existing.id, {
      role: "admin",
      fullName: ADMIN.fullName,
      phone: ADMIN.phone,
    });
    console.log(`Updated admin account ${existing.memberId} (${ADMIN.email})`);
    return;
  }

  const authUser = await createAuthUser({
    email: ADMIN.email,
    password: ADMIN.password,
    fullName: ADMIN.fullName,
    phone: ADMIN.phone,
  });

  try {
    const count = await countMembers();
    const member = await createMember({
      memberId: `ADM-${String(count + 1).padStart(4, "0")}`,
      fullName: ADMIN.fullName,
      email: ADMIN.email,
      phone: ADMIN.phone,
      bankCode: "058",
      bankName: "Guaranty Trust Bank",
      accountNumber: "0000000000",
      accountName: ADMIN.fullName,
      authUserId: authUser.id,
      parentId: null,
      leftChildId: null,
      rightChildId: null,
      position: "left",
      matrixLevel: 0,
      status: "active",
      role: "admin",
      hasPaidContribution: true,
      cyclesCompleted: 0,
      payoutAmount: 0,
      payoutReceived: false,
    paymentRejectionCount: 0,
    requiresAdminContact: false,
    isSuspended: false,
  });
    console.log(`Created admin account ${member.memberId} (${ADMIN.email})`);
  } catch (error) {
    await deleteAuthUser(authUser.id);
    throw error;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
