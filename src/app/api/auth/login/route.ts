import { NextResponse } from "next/server";
import { findMemberByPhone } from "@/lib/db/repository";
import { signInWithEmailPassword } from "@/lib/auth";
import { normalizePhone } from "@/lib/phone";

export async function POST(request: Request) {
  try {
    const { phone, password } = await request.json();

    if (!phone?.trim() || !password) {
      return NextResponse.json(
        { error: "Phone number and password are required" },
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

    let member = await findMemberByPhone(normalizedPhone);
    if (!member && phone.trim() !== normalizedPhone) {
      member = await findMemberByPhone(phone.trim());
    }

    if (!member?.authUserId) {
      return NextResponse.json(
        { error: "Invalid phone number or password" },
        { status: 401 }
      );
    }

    if (member.role === "admin") {
      return NextResponse.json(
        { error: "Please use the admin login at /admin/login" },
        { status: 403 }
      );
    }

    if (member.isSuspended) {
      return NextResponse.json(
        { error: "Your account has been suspended. Please contact support." },
        { status: 403 }
      );
    }

    await signInWithEmailPassword(member.email, password);

    return NextResponse.json({
      message: "Login successful",
      member: {
        id: member.id,
        memberId: member.memberId,
        fullName: member.fullName,
        phone: member.phone,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";
    return NextResponse.json(
      { error: message.includes("Invalid login credentials") ? "Invalid phone number or password" : message },
      { status: message.includes("Invalid login credentials") ? 401 : 500 }
    );
  }
}
