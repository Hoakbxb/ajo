import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { requestMemberPayeeReassign } from "@/lib/matrix";

export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await requestMemberPayeeReassign(session.memberId);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to reassign payee";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
