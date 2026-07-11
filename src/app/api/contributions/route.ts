import { NextResponse } from "next/server";
import { findContributions } from "@/lib/db/repository";
import { populateContributions } from "@/lib/db/populate";

export async function GET() {
  try {
    const contributions = await findContributions({});
    const populated = await populateContributions(
      contributions.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      )
    );

    return NextResponse.json({ contributions: populated });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch contributions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
