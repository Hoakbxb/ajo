import AdminLoginForm from "./AdminLoginForm";

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500 text-lg font-bold text-slate-950">
            ADM
          </div>
          <h1 className="mt-4 text-3xl font-bold text-white">Admin Portal</h1>
          <p className="mt-2 text-slate-400">
            Sign in with your administrator email and password
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white p-6 shadow-xl sm:p-8">
          <AdminLoginForm />
        </div>
      </div>
    </div>
  );
}
