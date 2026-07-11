"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20";

export default function AdminLoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ email: "", password: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      router.push("/admin");
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
        <label className="block text-sm font-medium text-slate-700">Email</label>
        <input
          type="email"
          required
          autoComplete="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className={inputClass}
          placeholder="admin@friendsrewardcircle.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Password
        </label>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className={inputClass}
          placeholder="Enter admin password"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-amber-600 py-3.5 font-semibold text-white transition hover:bg-amber-700 disabled:opacity-60"
      >
        {loading ? "Signing in..." : "Sign In to Admin"}
      </button>
    </form>
  );
}
