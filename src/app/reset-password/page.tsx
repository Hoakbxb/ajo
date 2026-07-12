import { Suspense } from "react";
import { AuthLink, AuthShell } from "@/components/auth/auth-ui";
import ResetPasswordForm from "./ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Set a new password"
      description="Choose a new password for your Wealth Circle account."
      footer={
        <p className="text-slate-500">
          <AuthLink href="/">Back to sign in</AuthLink>
        </p>
      }
    >
      <Suspense
        fallback={
          <p className="text-sm text-slate-500">Loading reset form...</p>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
