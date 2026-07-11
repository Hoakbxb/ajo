import { NextResponse } from "next/server";
import { NIGERIAN_BANKS } from "@/lib/nigerian-banks";

export async function GET() {
  return NextResponse.json({ banks: NIGERIAN_BANKS });
}
