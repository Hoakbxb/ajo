"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  Gift,
  Star,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { formatNaira } from "@/components/StatCard";
import { formatDisplayDateTime } from "@/lib/format-date";
import {
  contributionStatusBadgeClass,
  formatContributionStatusLabel,
} from "@/lib/payment-status";
import {
  type TransactionKind,
  type TransactionRecord,
  type TransactionSummary,
  transactionKindLabel,
} from "@/lib/transactions";
import {
  ProCard,
  ProEmptyState,
  ProStatCard,
  accentStyles,
} from "../../dashboard/components/dashboard-ui";

type Filter = "all" | TransactionKind;

const filters: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "sent", label: "Sent" },
  { id: "received", label: "Received" },
  { id: "payout", label: "Rewards" },
  { id: "referral", label: "Referrals" },
];

const kindConfig: Record<
  TransactionKind,
  { icon: typeof ArrowUpRight; accent: "blue" | "emerald" | "violet" | "amber" | "indigo" }
> = {
  sent: { icon: ArrowUpRight, accent: "blue" },
  received: { icon: ArrowDownLeft, accent: "emerald" },
  payout: { icon: Star, accent: "violet" },
  referral: { icon: Gift, accent: "amber" },
  referral_credit: { icon: Wallet, accent: "indigo" },
};

function isCreditKind(kind: TransactionKind) {
  return kind === "received" || kind === "payout" || kind === "referral";
}

function TransactionRowMobile({
  transaction,
}: {
  transaction: TransactionRecord;
}) {
  const config = kindConfig[transaction.kind];
  const Icon = config.icon;
  const styles = accentStyles[config.accent];
  const isCredit = isCreditKind(transaction.kind);
  const amountPrefix = isCredit ? "+" : "−";

  return (
    <div className="flex items-start gap-4 border-b border-slate-100 px-4 py-4 last:border-b-0">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${styles.iconMuted}`}
      >
        <Icon className="h-4 w-4" strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900">
              {transactionKindLabel(transaction.kind)}
            </p>
            {transaction.counterparty && (
              <p className="mt-0.5 truncate text-xs text-slate-500">
                {transaction.kind === "sent" || transaction.kind === "referral_credit"
                  ? "To"
                  : "From"}{" "}
                {transaction.counterparty}
              </p>
            )}
          </div>
          <p
            className={`shrink-0 text-sm font-semibold ${
              isCredit ? "text-emerald-700" : "text-slate-900"
            }`}
          >
            {amountPrefix}
            {formatNaira(transaction.amount)}
          </p>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span
            className={`rounded-md px-2 py-0.5 text-xs font-medium ${contributionStatusBadgeClass(transaction.status)}`}
          >
            {formatContributionStatusLabel(transaction.status)}
          </span>
          <span className="text-xs text-slate-400">
            {formatDisplayDateTime(transaction.date)}
          </span>
        </div>
      </div>
    </div>
  );
}

function TransactionRowDesktop({
  transaction,
}: {
  transaction: TransactionRecord;
}) {
  const config = kindConfig[transaction.kind];
  const Icon = config.icon;
  const styles = accentStyles[config.accent];
  const isCredit = isCreditKind(transaction.kind);
  const amountPrefix = isCredit ? "+" : "−";

  return (
    <tr className="border-b border-slate-100 last:border-b-0">
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-lg ${styles.iconMuted}`}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={2} />
          </div>
          <span className="text-sm font-medium text-slate-900">
            {transactionKindLabel(transaction.kind)}
          </span>
        </div>
      </td>
      <td className="px-4 py-3.5 text-sm text-slate-600">
        {transaction.counterparty ?? "System reward"}
      </td>
      <td className="px-4 py-3.5">
        <span
          className={`rounded-md px-2 py-0.5 text-xs font-medium ${contributionStatusBadgeClass(transaction.status)}`}
        >
          {formatContributionStatusLabel(transaction.status)}
        </span>
      </td>
      <td className="px-4 py-3.5 text-sm text-slate-500">
        {formatDisplayDateTime(transaction.date)}
      </td>
      <td
        className={`px-4 py-3.5 text-right text-sm font-semibold ${
          isCredit ? "text-emerald-700" : "text-slate-900"
        }`}
      >
        {amountPrefix}
        {formatNaira(transaction.amount)}
      </td>
    </tr>
  );
}

export default function TransactionsContent({
  transactions,
  summary,
}: {
  transactions: TransactionRecord[];
  summary: TransactionSummary;
}) {
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(
    () =>
      filter === "all"
        ? transactions
        : transactions.filter((transaction) => transaction.kind === filter),
    [filter, transactions]
  );

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200/80 pb-6">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
          Account
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">
          Transactions
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Your payment history, incoming contributions, and cycle rewards
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <ProStatCard
          accent="blue"
          label="Total Sent"
          value={formatNaira(summary.sentTotal)}
          sublabel="Confirmed"
          icon={Wallet}
        />
        <ProStatCard
          accent="emerald"
          label="Total Received"
          value={formatNaira(summary.receivedTotal)}
          sublabel="Confirmed"
          icon={ArrowDownLeft}
        />
        <ProStatCard
          accent="violet"
          label="Rewards Earned"
          value={formatNaira(summary.payoutTotal + summary.referralTotal)}
          sublabel="Cycles & referrals"
          icon={TrendingUp}
        />
      </div>

      <ProCard
        accent="slate"
        title="Transaction History"
        description={`${filtered.length} transaction${filtered.length === 1 ? "" : "s"}`}
        icon={CreditCard}
        action={
          <div className="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
            {filters.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition sm:px-3 ${
                  filter === item.id
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        }
      >
        {filtered.length === 0 ? (
          <ProEmptyState message="No transactions in this category yet." />
        ) : (
          <>
            <div className="sm:hidden">
              {filtered.map((transaction) => (
                <TransactionRowMobile
                  key={transaction.id}
                  transaction={transaction}
                />
              ))}
            </div>

            <div className="-mx-5 -mb-5 hidden overflow-x-auto sm:-mx-6 sm:-mb-6 sm:block">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-left text-[11px] font-medium uppercase tracking-wider text-slate-400">
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Counterparty</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((transaction) => (
                    <TransactionRowDesktop
                      key={transaction.id}
                      transaction={transaction}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </ProCard>
    </div>
  );
}
