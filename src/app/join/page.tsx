import JoinForm from "@/components/JoinForm";
import { AuthLink, AuthShell } from "@/components/auth/auth-ui";
import { SITE_NAME } from "@/lib/brand";

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;

  return (
    <AuthShell
      title="Create your account"
      description={
        ref
          ? "You've been invited to join. Complete registration to get started."
          : "Register in a few steps to join the next available matrix position."
      }
      aside={
        <>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Join {SITE_NAME}
          </p>
          <h2 className="text-3xl font-semibold leading-tight tracking-tight xl:text-4xl">
            Start your contribution journey.
          </h2>
          <p className="max-w-sm text-sm leading-relaxed text-slate-400">
            Complete your profile, set a secure password, and add payout details.
            One step at a time.
          </p>
        </>
      }
      footer={
        <p className="text-slate-500">
          Already have an account? <AuthLink href="/">Sign in</AuthLink>
        </p>
      }
    >
      <JoinForm referralCode={ref} />
    </AuthShell>
  );
}
