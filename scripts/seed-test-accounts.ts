/**
 * Seed test accounts via joinMatrix (Supabase Auth + PostgreSQL).
 * Run: npm run seed:test
 */
import { findMemberByPhone, updateMember } from "@/lib/db/repository";
import { joinMatrix } from "@/lib/matrix";
import {
  createAuthUser,
  deleteAuthUser,
  updateAuthUser,
} from "@/lib/auth";

const TEST_ACCOUNTS = [
  {
    fullName: "Test User One",
    email: "test1@example.com",
    phone: "08011111111",
    password: "test1234",
  },
  {
    fullName: "Test User Two",
    email: "test2@example.com",
    phone: "08022222222",
    password: "test1234",
  },
  {
    fullName: "Test User Three",
    email: "test3@example.com",
    phone: "08033333333",
    password: "test1234",
  },
  {
    fullName: "Test User Four",
    email: "test4@example.com",
    phone: "08044444444",
    password: "test1234",
  },
  {
    fullName: "Test User Five",
    email: "test5@example.com",
    phone: "08055555555",
    password: "test1234",
  },
  {
    fullName: "Test User Six",
    email: "test6@example.com",
    phone: "08066666666",
    password: "test1234",
  },
  {
    fullName: "Test User Seven",
    email: "test7@example.com",
    phone: "08077777777",
    password: "test1234",
  },
  {
    fullName: "Test User Eight",
    email: "test8@example.com",
    phone: "08088888888",
    password: "test1234",
  },
  {
    fullName: "Test User Nine",
    email: "test9@example.com",
    phone: "09011111119",
    password: "test1234",
  },
  {
    fullName: "Test User Ten",
    email: "test10@example.com",
    phone: "08100000000",
    password: "test1234",
  },
  {
    fullName: "Test User Eleven",
    email: "test11@example.com",
    phone: "08111111111",
    password: "test1234",
  },
  {
    fullName: "Test User Twelve",
    email: "test12@example.com",
    phone: "08122222222",
    password: "test1234",
  },
];

async function main() {
  for (const account of TEST_ACCOUNTS) {
    const existing = await findMemberByPhone(account.phone);
    if (existing) {
      if (existing.authUserId) {
        await updateAuthUser(existing.authUserId, {
          password: account.password,
          email: account.email,
          fullName: account.fullName,
          phone: account.phone,
        });
        await updateMember(existing.id, { password: account.password });
        console.log(`Updated auth password for ${existing.memberId}`);
      } else {
        console.log(
          `Skipped ${existing.memberId}: no linked Supabase Auth user (re-join required)`
        );
      }
      continue;
    }

    const authUser = await createAuthUser({
      email: account.email,
      password: account.password,
      fullName: account.fullName,
      phone: account.phone,
    });

    try {
      const member = await joinMatrix({
        fullName: account.fullName,
        email: account.email,
        phone: account.phone,
        bankCode: "058",
        bankName: "Guaranty Trust Bank",
        accountNumber: "0123456789",
        accountName: account.fullName,
        authUserId: authUser.id,
        password: account.password,
      });
      console.log(`Created ${member.memberId} (${member.fullName})`);
    } catch (error) {
      await deleteAuthUser(authUser.id);
      throw error;
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
