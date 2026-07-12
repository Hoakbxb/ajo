"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AuthError,
  AuthField,
  authInputClass,
  authPrimaryBtnClass,
} from "@/components/auth/auth-ui";

export default function ForgotPasswordForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage(data.message);
      setEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  if (message) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
        <p className="text-center text-sm text-slate-500">
          <Link
            href="/"
            className="font-medium text-slate-900 underline-offset-4 hover:underline"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <AuthError message={error} />

      <AuthField
        label="Email address"
        hint="Enter the email linked to your account. We will send a reset link."
      >
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={authInputClass}
          placeholder="you@example.com"
        />
      </AuthField>

      <button
        type="submit"
        disabled={loading}
        className={`${authPrimaryBtnClass} w-full`}
      >
        {loading ? "Sending..." : "Send reset link"}
      </button>

      <p className="text-center text-sm text-slate-500">
        Remember your password?{" "}
        <Link
          href="/"
          className="font-medium text-slate-900 underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
