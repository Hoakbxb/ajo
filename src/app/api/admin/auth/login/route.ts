import { NextResponse } from "next/server";
import { findMemberByEmail, findMemberByAuthUserId } from "@/lib/db/repository";
import {
  signInWithEmailPassword,
  signOut,
} from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email?.trim() || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const member = await findMemberByEmail(normalizedEmail);

    if (!member || member.role !== "admin") {
      return NextResponse.json(
        { error: "Invalid admin credentials" },
        { status: 401 }
      );
    }

    const { user } = await signInWithEmailPassword(normalizedEmail, password);
    if (!user) {
      return NextResponse.json(
        { error: "Invalid admin credentials" },
        { status: 401 }
      );
    }

    const linked = await findMemberByAuthUserId(user.id);
    if (!linked || linked.role !== "admin") {
      await signOut();
      return NextResponse.json(
        { error: "Invalid admin credentials" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      message: "Admin login successful",
      admin: {
        id: linked.id,
        memberId: linked.memberId,
        fullName: linked.fullName,
        email: linked.email,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";
    return NextResponse.json(
      {
        error: message.includes("Invalid login credentials")
          ? "Invalid admin credentials"
          : message,
      },
      { status: message.includes("Invalid login credentials") ? 401 : 500 }
    );
  }
}
