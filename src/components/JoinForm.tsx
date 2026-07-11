"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { NIGERIAN_BANKS } from "@/lib/nigerian-banks";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-emerald-200 px-4 py-3 text-emerald-950 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20";

export default function JoinForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    bankCode: "",
    accountNumber: "",
    accountName: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (form.password.length < 6) {
        throw new Error("Password must be at least 6 characters");
      }
      if (form.password !== form.confirmPassword) {
        throw new Error("Passwords do not match");
      }

      const { confirmPassword: _, ...payload } = form;
      const res = await fetch("/api/members/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join");
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
          Full Name
        </label>
        <input
          type="text"
          required
          value={form.fullName}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          className={inputClass}
          placeholder="Enter your full name"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-emerald-900">
          Email Address
        </label>
        <input
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className={inputClass}
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-emerald-900">
          Phone Number
        </label>
        <input
          type="tel"
          required
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className={inputClass}
          placeholder="08012345678"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-emerald-900">
            Password
          </label>
          <input
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className={inputClass}
            placeholder="Min. 6 characters"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-emerald-900">
            Confirm Password
          </label>
          <input
            type="password"
            required
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={(e) =>
              setForm({ ...form, confirmPassword: e.target.value })
            }
            className={inputClass}
            placeholder="Repeat password"
          />
        </div>
      </div>

      <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
        <h3 className="text-sm font-semibold text-emerald-900">Bank Account</h3>
        <p className="mt-1 text-xs text-emerald-700/70">
          Used to receive your ₦10,000 reward when your matrix completes
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-emerald-900">
              Bank
            </label>
            <select
              required
              value={form.bankCode}
              onChange={(e) => setForm({ ...form, bankCode: e.target.value })}
              className={inputClass}
            >
              <option value="">Select your bank</option>
              {NIGERIAN_BANKS.map((bank) => (
                <option key={bank.code} value={bank.code}>
                  {bank.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-emerald-900">
              Account Number
            </label>
            <input
              type="text"
              required
              inputMode="numeric"
              pattern="\d{10}"
              maxLength={10}
              value={form.accountNumber}
              onChange={(e) =>
                setForm({
                  ...form,
                  accountNumber: e.target.value.replace(/\D/g, "").slice(0, 10),
                })
              }
              className={inputClass}
              placeholder="0123456789"
            />
            <p className="mt-1 text-xs text-emerald-600/70">10-digit NUBAN account number</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-emerald-900">
              Account Name
            </label>
            <input
              type="text"
              required
              value={form.accountName}
              onChange={(e) => setForm({ ...form, accountName: e.target.value })}
              className={inputClass}
              placeholder="Name as it appears on your bank account"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
        <p className="font-medium">What happens when you join:</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-emerald-700">
          <li>You are placed in the next available matrix position</li>
          <li>You contribute ₦5,000 to your assigned member</li>
          <li>Rewards are sent to the bank account above</li>
          <li>No referrals or invitations required</li>
        </ul>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-emerald-600 py-3.5 font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
      >
        {loading ? "Joining..." : "Join the Community"}
      </button>
    </form>
  );
}
