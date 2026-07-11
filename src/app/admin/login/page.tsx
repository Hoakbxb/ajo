import Image from "next/image";
import AdminLoginForm from "./AdminLoginForm";
import { SITE_NAME } from "@/lib/brand";

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center">
          <div className="relative mx-auto h-14 w-14 overflow-hidden rounded-2xl">
            <Image src="/logo.png" alt={`${SITE_NAME} logo`} width={56} height={56} className="h-full w-full object-cover" priority />
          </div>
          <p className="mt-3 text-sm font-semibold tracking-wide text-emerald-400">{SITE_NAME}</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Admin Portal</h1>
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
