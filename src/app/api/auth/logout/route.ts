import { NextResponse } from "next/server";
import { signOut } from "@/lib/auth";

export async function POST() {
  try {
    await signOut();
    return NextResponse.json({ message: "Logged out" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Logout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
