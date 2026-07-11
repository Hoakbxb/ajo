"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AuthError,
  AuthField,
  authInputClass,
  authPrimaryBtnClass,
} from "@/components/auth/auth-ui";

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
    <form onSubmit={handleSubmit} className="space-y-6">
      <AuthError message={error} />

      <AuthField label="Phone number">
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
          className={authInputClass}
          placeholder="08012345678"
        />
      </AuthField>

      <AuthField label="Password">
        <input
          type="password"
          required
          autoComplete="current-password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className={authInputClass}
          placeholder="Enter your password"
        />
      </AuthField>

      <button
        type="submit"
        disabled={loading}
        className={`${authPrimaryBtnClass} w-full`}
      >
        {loading ? "Signing in..." : "Sign in"}
      </button>

      <p className="text-center text-sm text-slate-500">
        New here?{" "}
        <Link
          href="/join"
          className="font-medium text-slate-900 underline-offset-4 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </form>
  );
}
