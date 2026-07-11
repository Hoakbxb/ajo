import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { findMemberById } from "@/lib/db/repository";
import { getMemberTransactionLedger } from "@/lib/transaction-ledger";
import {
  summarizeTransactions,
  toTransactionRecords,
} from "@/lib/transactions";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const member = await findMemberById(session.memberId);
    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const ledger = await getMemberTransactionLedger(member.id);
    const transactions = toTransactionRecords(ledger);

    return NextResponse.json({
      transactions,
      summary: summarizeTransactions(transactions),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch transactions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
