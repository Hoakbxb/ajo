import type { Transaction } from "@/types/database";

export type TransactionKind =
  | "sent"
  | "received"
  | "payout"
  | "referral"
  | "referral_credit";

export interface TransactionRecord {
  id: string;
  kind: TransactionKind;
  amount: number;
  counterparty: string | null;
  status: string;
  date: string;
  reference: string;
}

export interface TransactionSummary {
  sentTotal: number;
  receivedTotal: number;
  payoutTotal: number;
  referralTotal: number;
}

export function toTransactionRecord(transaction: Transaction): TransactionRecord {
  return {
    id: transaction.id,
    kind: transaction.kind,
    amount: transaction.amount,
    counterparty: transaction.counterpartyName,
    status: transaction.status,
    date: transaction.occurredAt.toISOString(),
    reference: transaction.reference,
  };
}

export function toTransactionRecords(
  transactions: Transaction[]
): TransactionRecord[] {
  return transactions.map(toTransactionRecord);
}

export function summarizeTransactions(
  transactions: TransactionRecord[]
): TransactionSummary {
  return transactions.reduce(
    (summary, transaction) => {
      if (transaction.status !== "confirmed") return summary;

      if (transaction.kind === "sent") {
        summary.sentTotal += transaction.amount;
      } else if (transaction.kind === "received") {
        summary.receivedTotal += transaction.amount;
      } else if (transaction.kind === "payout") {
        summary.payoutTotal += transaction.amount;
      } else if (transaction.kind === "referral") {
        summary.referralTotal += transaction.amount;
      }

      return summary;
    },
    { sentTotal: 0, receivedTotal: 0, payoutTotal: 0, referralTotal: 0 }
  );
}

export function transactionKindLabel(kind: TransactionKind) {
  switch (kind) {
    case "sent":
      return "Payment sent";
    case "received":
      return "Payment received";
    case "payout":
      return "Cycle reward";
    case "referral":
      return "Referral bonus";
    case "referral_credit":
      return "Referral credit used";
  }
}
