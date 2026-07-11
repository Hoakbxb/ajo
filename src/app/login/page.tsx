import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-lg font-bold text-white">
            FRC
          </div>
          <h1 className="mt-4 text-3xl font-bold text-emerald-950">Welcome back</h1>
          <p className="mt-2 text-emerald-700/70">
            Sign in with your phone number and password
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-emerald-900/10 bg-white p-6 shadow-sm sm:p-8">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
