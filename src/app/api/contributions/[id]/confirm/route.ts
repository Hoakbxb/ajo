import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { approveContribution } from "@/lib/matrix";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const contribution = await approveContribution(id, session.memberId);

    return NextResponse.json({
      message: "Payment confirmed",
      contribution,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to confirm payment";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
