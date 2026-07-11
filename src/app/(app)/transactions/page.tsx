import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { findMemberById } from "@/lib/db/repository";
import { getMemberTransactionLedger } from "@/lib/transaction-ledger";
import {
  summarizeTransactions,
  toTransactionRecords,
} from "@/lib/transactions";
import TransactionsContent from "./components/TransactionsContent";

export default async function TransactionsPage() {
  const session = await getSession();
  if (!session) redirect("/");

  const member = await findMemberById(session.memberId);
  if (!member) redirect("/");

  const ledger = await getMemberTransactionLedger(member.id);
  const transactions = toTransactionRecords(ledger);
  const summary = summarizeTransactions(transactions);

  return (
    <TransactionsContent
      transactions={JSON.parse(JSON.stringify(transactions))}
      summary={summary}
    />
  );
}
