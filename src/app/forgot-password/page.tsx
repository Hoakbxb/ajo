import { AuthLink, AuthShell } from "@/components/auth/auth-ui";
import ForgotPasswordForm from "./ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Forgot password"
      description="Enter your account email and we will send you a link to reset your password."
      footer={
        <p className="text-slate-500">
          Need an account? <AuthLink href="/join">Register</AuthLink>
        </p>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
