import { NextResponse } from "next/server";
import {
  findMemberByEmail,
  findMemberById,
  findMemberByPhone,
  updateMember,
} from "@/lib/db/repository";
import {
  getSession,
  signInWithEmailPassword,
  updateAuthUser,
} from "@/lib/auth";
import {
  getBankByCode,
  isValidAccountNumber,
} from "@/lib/nigerian-banks";
import { normalizePhone } from "@/lib/phone";

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const member = await findMemberById(session.memberId);
    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    if (!member.authUserId) {
      return NextResponse.json(
        { error: "This account is not linked to Supabase Auth" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      fullName,
      email,
      phone,
      bankCode,
      accountNumber,
      accountName,
      currentPassword,
      newPassword,
    } = body;

    if (
      !fullName?.trim() ||
      !email?.trim() ||
      !phone?.trim() ||
      !bankCode?.trim() ||
      !accountNumber?.trim() ||
      !accountName?.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "Full name, email, phone, bank, account number, and account name are required",
        },
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

    const normalizedPhone = normalizePhone(phone.trim());
    if (normalizedPhone.length < 10) {
      return NextResponse.json(
        { error: "Please enter a valid phone number" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (newPassword !== undefined && newPassword !== "") {
      if (!currentPassword) {
        return NextResponse.json(
          { error: "Current password is required to set a new password" },
          { status: 400 }
        );
      }
      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: "New password must be at least 6 characters" },
          { status: 400 }
        );
      }

      try {
        await signInWithEmailPassword(member.email, currentPassword);
      } catch {
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 400 }
        );
      }

      await updateAuthUser(member.authUserId, { password: newPassword });
    }

    const memberPatch: Parameters<typeof updateMember>[1] = {
      fullName: fullName.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      bankCode: bank.code,
      bankName: bank.name,
      accountNumber: normalizedAccountNumber,
      accountName: accountName.trim(),
    };

    if (newPassword !== undefined && newPassword !== "") {
      memberPatch.password = newPassword;
    }

    const [emailTaken, phoneTaken] = await Promise.all([
      findMemberByEmail(normalizedEmail),
      findMemberByPhone(normalizedPhone),
    ]);

    if (emailTaken && emailTaken.id !== member.id) {
      return NextResponse.json(
        { error: "This email is already registered" },
        { status: 400 }
      );
    }

    if (
      phoneTaken &&
      phoneTaken.id !== member.id &&
      phoneTaken.phone !== phone.trim()
    ) {
      return NextResponse.json(
        { error: "This phone number is already registered" },
        { status: 400 }
      );
    }

    const authPatch: {
      email?: string;
      fullName?: string;
      phone?: string;
    } = {};

    if (normalizedEmail !== member.email) authPatch.email = normalizedEmail;
    if (fullName.trim() !== member.fullName) authPatch.fullName = fullName.trim();
    if (normalizedPhone !== member.phone) authPatch.phone = normalizedPhone;

    if (Object.keys(authPatch).length > 0) {
      await updateAuthUser(member.authUserId, authPatch);
    }

    const updated = await updateMember(member.id, memberPatch);

    return NextResponse.json({
      message: "Profile updated successfully",
      member: {
        memberId: updated.memberId,
        fullName: updated.fullName,
        email: updated.email,
        phone: updated.phone,
        bankCode: updated.bankCode,
        bankName: updated.bankName,
        accountNumber: updated.accountNumber,
        accountName: updated.accountName,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update profile";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
