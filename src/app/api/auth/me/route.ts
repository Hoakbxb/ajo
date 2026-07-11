import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { findMemberById } from "@/lib/db/repository";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const member = await findMemberById(session.memberId);

    if (!member) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        id: member.id,
        memberId: member.memberId,
        fullName: member.fullName,
        email: member.email,
        status: member.status,
      },
    });
  } catch {
    return NextResponse.json({ user: null }, { status: 401 });
  }
}
