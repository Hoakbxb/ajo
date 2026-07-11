import { NextResponse } from "next/server";
import { findContributions } from "@/lib/db/repository";
import { populateContributions } from "@/lib/db/populate";
import { adminUnauthorizedResponse, requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
    const contributions = await findContributions({});
    const populated = await populateContributions(
      contributions.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      )
    );

    return NextResponse.json({ contributions: populated });
  } catch {
    return adminUnauthorizedResponse();
  }
}
