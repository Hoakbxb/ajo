"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AuthError,
  AuthField,
  authInputClass,
  authPrimaryBtnClass,
} from "@/components/auth/auth-ui";

export default function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ password: "", confirmPassword: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ...form }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage(data.message);
      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="space-y-6">
        <AuthError message="This reset link is missing a token. Request a new link below." />
        <p className="text-center text-sm text-slate-500">
          <Link
            href="/forgot-password"
            className="font-medium text-slate-900 underline-offset-4 hover:underline"
          >
            Request a new reset link
          </Link>
        </p>
      </div>
    );
  }

  if (message) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
        <p className="text-center text-sm text-slate-500">Redirecting to sign in...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <AuthError message={error} />

      <AuthField label="New password">
        <input
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className={authInputClass}
          placeholder="At least 6 characters"
        />
      </AuthField>

      <AuthField label="Confirm new password">
        <input
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={(e) =>
            setForm({ ...form, confirmPassword: e.target.value })
          }
          className={authInputClass}
          placeholder="Repeat your new password"
        />
      </AuthField>

      <button
        type="submit"
        disabled={loading}
        className={`${authPrimaryBtnClass} w-full`}
      >
        {loading ? "Updating..." : "Update password"}
      </button>

      <p className="text-center text-sm text-slate-500">
        Link expired?{" "}
        <Link
          href="/forgot-password"
          className="font-medium text-slate-900 underline-offset-4 hover:underline"
        >
          Request a new one
        </Link>
      </p>
    </form>
  );
}
