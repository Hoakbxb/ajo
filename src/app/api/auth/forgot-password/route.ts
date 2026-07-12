import { NextResponse } from "next/server";
import {
  createPasswordResetToken,
  findMemberByEmail,
} from "@/lib/db/repository";
import { sendPasswordResetEmail } from "@/lib/email";
import {
  createPasswordResetTokenValue,
  getPasswordResetExpiry,
  hashPasswordResetToken,
} from "@/lib/password-reset";

const GENERIC_MESSAGE =
  "If an account exists for that email, we sent password reset instructions.";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email?.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const member = await findMemberByEmail(normalizedEmail);

    if (member?.authUserId && !member.isSuspended) {
      const token = createPasswordResetTokenValue();
      const tokenHash = hashPasswordResetToken(token);

      await createPasswordResetToken({
        memberId: member.id,
        tokenHash,
        expiresAt: getPasswordResetExpiry(),
      });

      await sendPasswordResetEmail({
        to: member.email,
        fullName: member.fullName,
        token,
      });
    }

    return NextResponse.json({ message: GENERIC_MESSAGE });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to send reset email";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
