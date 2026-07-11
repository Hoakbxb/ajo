import Link from "next/link";
import StatCard, { formatNaira } from "@/components/StatCard";
import {
  countContributions,
  countMembers,
  countMembersWithFilter,
} from "@/lib/db/repository";
import { CONTRIBUTION_AMOUNT, PAYOUT_AMOUNT } from "@/lib/constants";
import { migrateMemberStatuses } from "@/lib/member-status-migrate";

async function getStats() {
  try {
    await migrateMemberStatuses();
    const [totalMembers, rewardsPaid, pendingContributions] = await Promise.all([
      countMembers(),
      countMembersWithFilter({ payoutAmountGt: 0 }),
      countContributions({ status: "pending" }),
    ]);
    return {
      totalMembers,
      completeMembers: rewardsPaid,
      pendingContributions,
    };
  } catch {
    return { totalMembers: 0, completeMembers: 0, pendingContributions: 0 };
  }
}

export default async function Home() {
  const stats = await getStats();

  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-600 px-4 py-20 text-white sm:px-6">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
        <div className="relative mx-auto max-w-6xl">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Friends Reward Circle
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-emerald-100">
            A private community where members voluntarily join and participate in
            a simple 2× matrix reward system. No referrals, invitations, or
            recruitment required.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/join"
              className="rounded-xl bg-white px-6 py-3 font-semibold text-emerald-700 shadow-lg transition hover:bg-emerald-50"
            >
              Join the Community
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Total Members" value={stats.totalMembers} />
          <StatCard
            label="Completed Matrices"
            value={stats.completeMembers}
            subtext={`${formatNaira(PAYOUT_AMOUNT)} each`}
          />
          <StatCard
            label="Pending Contributions"
            value={stats.pendingContributions}
            subtext={`${formatNaira(CONTRIBUTION_AMOUNT)} each`}
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h2 className="text-2xl font-bold text-emerald-950">How It Works</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              step: "1",
              title: "Join",
              desc: "A new member joins the community and is placed in the next available matrix position.",
            },
            {
              step: "2",
              title: "Contribute",
              desc: `The member contributes ${formatNaira(CONTRIBUTION_AMOUNT)} to the member assigned by the system.`,
            },
            {
              step: "3",
              title: "Fill Positions",
              desc: "Each member has two positions beneath them. Once both are filled by new members, each contributes.",
            },
            {
              step: "4",
              title: "Receive Reward",
              desc: `The member receives a total of ${formatNaira(PAYOUT_AMOUNT)} and their matrix is complete.`,
            },
          ].map((item) => (
            <div
              key={item.step}
              className="rounded-2xl border border-emerald-900/10 bg-white p-6 shadow-sm"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-lg font-bold text-white">
                {item.step}
              </div>
              <h3 className="mt-4 font-semibold text-emerald-950">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-emerald-800/70">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8">
          <h2 className="text-xl font-bold text-emerald-950">Key Principles</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              "Voluntary participation — no pressure to recruit",
              "System-assigned positions — fair placement for all",
              "Transparent 2× matrix structure",
              "Fixed contribution and reward amounts",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-emerald-800">
                <span className="mt-0.5 text-emerald-600">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
