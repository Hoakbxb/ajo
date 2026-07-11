import { NextResponse } from "next/server";
import { buildMatrixTree } from "@/lib/matrix";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId") ?? undefined;
    const depth = parseInt(searchParams.get("depth") ?? "4", 10);

    const tree = await buildMatrixTree(memberId, depth);

    return NextResponse.json({ tree });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch matrix";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
