import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { joinMatrix } from "@/lib/matrix";
import {
  getBankByCode,
  isValidAccountNumber,
} from "@/lib/nigerian-banks";
import {
  createAuthUser,
  deleteAuthUser,
  signInWithEmailPassword,
} from "@/lib/auth";
import {
  normalizeReferralCode,
  REFERRAL_COOKIE,
} from "@/lib/referral-code";

export async function POST(request: Request) {
  let authUserId: string | null = null;

  try {
    const body = await request.json();
    const {
      fullName,
      email,
      phone,
      bankCode,
      accountNumber,
      accountName,
      password,
      referralCode,
    } = body;

    const cookieStore = await cookies();
    const resolvedReferralCode =
      normalizeReferralCode(referralCode) ||
      normalizeReferralCode(cookieStore.get(REFERRAL_COOKIE)?.value) ||
      undefined;

    if (
      !fullName?.trim() ||
      !email?.trim() ||
      !phone?.trim() ||
      !bankCode?.trim() ||
      !accountNumber?.trim() ||
      !accountName?.trim() ||
      !password
    ) {
      return NextResponse.json(
        {
          error:
            "Full name, email, phone, password, bank, account number, and account name are required",
        },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const bank = getBankByCode(bankCode.trim());
    if (!bank) {
      return NextResponse.json(
        { error: "Please select a valid Nigerian bank" },
        { status: 400 }
      );
    }

    const normalizedAccountNumber = accountNumber.trim().replace(/\s/g, "");
    if (!isValidAccountNumber(normalizedAccountNumber)) {
      return NextResponse.json(
        { error: "Account number must be exactly 10 digits" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const authUser = await createAuthUser({
      email: normalizedEmail,
      password,
      fullName: fullName.trim(),
      phone: phone.trim(),
    });
    authUserId = authUser.id;

    const member = await joinMatrix({
      fullName: fullName.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      bankCode: bank.code,
      bankName: bank.name,
      accountNumber: normalizedAccountNumber,
      accountName: accountName.trim(),
      authUserId: authUser.id,
      password,
      referralCode: resolvedReferralCode,
    });

    await signInWithEmailPassword(normalizedEmail, password);

    const response = NextResponse.json(
      {
        message: "Successfully joined the community",
        member: {
          id: member.id,
          memberId: member.memberId,
          fullName: member.fullName,
          email: member.email,
          phone: member.phone,
          bankName: member.bankName,
          accountNumber: member.accountNumber,
          accountName: member.accountName,
          position: member.position,
          matrixLevel: member.matrixLevel,
          status: member.status,
          parentId: member.parentId,
        },
      },
      { status: 201 }
    );
    response.cookies.set(REFERRAL_COOKIE, "", {
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (error) {
    if (authUserId) {
      try {
        await deleteAuthUser(authUserId);
      } catch {
        // Best-effort cleanup if member creation failed after auth user was created.
      }
    }

    const message =
      error instanceof Error ? error.message : "Failed to join community";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
