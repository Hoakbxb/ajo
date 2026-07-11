import LoginForm from "@/app/login/LoginForm";
import { AuthLink, AuthShell } from "@/components/auth/auth-ui";

export default function LoginScreen() {
  return (
    <AuthShell
      title="Welcome back"
      description="Sign in with your phone number and password to access your dashboard."
      footer={
        <p className="text-slate-500">
          Don&apos;t have an account?{" "}
          <AuthLink href="/join">Register</AuthLink>
        </p>
      }
    >
      <LoginForm />
    </AuthShell>
  );
}
