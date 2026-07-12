import { NextResponse } from "next/server";
import {
  findMemberById,
  findPasswordResetTokenByHash,
  markPasswordResetTokenUsed,
  updateMember,
} from "@/lib/db/repository";
import { updateAuthUser } from "@/lib/auth";
import { hashPasswordResetToken } from "@/lib/password-reset";

export async function POST(request: Request) {
  try {
    const { token, password, confirmPassword } = await request.json();

    if (!token?.trim() || !password || !confirmPassword) {
      return NextResponse.json(
        { error: "Token, password, and confirmation are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: "Passwords do not match" },
        { status: 400 }
      );
    }

    const tokenHash = hashPasswordResetToken(token.trim());
    const resetToken = await findPasswordResetTokenByHash(tokenHash);

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt.getTime() < Date.now()) {
      return NextResponse.json(
        { error: "This reset link is invalid or has expired" },
        { status: 400 }
      );
    }

    const member = await findMemberById(resetToken.memberId);
    if (!member?.authUserId) {
      return NextResponse.json(
        { error: "This reset link is invalid or has expired" },
        { status: 400 }
      );
    }

    if (member.isSuspended) {
      return NextResponse.json(
        { error: "Your account has been suspended. Please contact support." },
        { status: 403 }
      );
    }

    await updateAuthUser(member.authUserId, { password });
    await updateMember(member.id, { password });
    await markPasswordResetTokenUsed(resetToken.id);

    return NextResponse.json({
      message: "Password updated successfully. You can sign in now.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to reset password";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
