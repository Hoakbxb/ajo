"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-emerald-200 px-4 py-3 text-emerald-950 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20";

export default function LoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ phone: "", password: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-emerald-900">
          Phone Number
        </label>
        <input
          type="tel"
          required
          inputMode="numeric"
          autoComplete="tel"
          value={form.phone}
          onChange={(e) =>
            setForm({
              ...form,
              phone: e.target.value.replace(/\D/g, "").slice(0, 11),
            })
          }
          className={inputClass}
          placeholder="08012345678"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-emerald-900">
          Password
        </label>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className={inputClass}
          placeholder="Enter your password"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-emerald-600 py-3.5 font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
      >
        {loading ? "Signing in..." : "Sign In"}
      </button>

      <p className="text-center text-sm text-emerald-700/70">
        Not a member yet?{" "}
        <Link href="/join" className="font-medium text-emerald-600 hover:underline">
          Join the community
        </Link>
      </p>
    </form>
  );
}
