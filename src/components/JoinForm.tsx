"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { NIGERIAN_BANKS } from "@/lib/nigerian-banks";
import {
  AuthError,
  AuthField,
  authInputClass,
  authPrimaryBtnClass,
  authSecondaryBtnClass,
  authSelectClass,
  StepIndicator,
} from "@/components/auth/auth-ui";

const STEPS = ["Personal", "Security", "Payout"];

type FormState = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
};

const initialForm: FormState = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  bankCode: "",
  accountNumber: "",
  accountName: "",
};

function validateStep(step: number, form: FormState): string | null {
  if (step === 0) {
    if (!form.fullName.trim()) return "Full name is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      return "Enter a valid email address";
    }
    if (form.phone.replace(/\D/g, "").length < 10) {
      return "Enter a valid phone number";
    }
  }

  if (step === 1) {
    if (form.password.length < 6) {
      return "Password must be at least 6 characters";
    }
    if (form.password !== form.confirmPassword) {
      return "Passwords do not match";
    }
  }

  if (step === 2) {
    if (!form.bankCode) return "Select your bank";
    if (form.accountNumber.length !== 10) {
      return "Account number must be 10 digits";
    }
    if (!form.accountName.trim()) return "Account name is required";
  }

  return null;
}

export default function JoinForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<FormState>(initialForm);

  function handleNext() {
    const validationError = validateStep(step, form);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  }

  function handlePrevious() {
    setError("");
    setStep((current) => Math.max(current - 1, 0));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validationError = validateStep(step, form);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError("");

    try {
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
      setError(err instanceof Error ? err.message : "Failed to register");
    } finally {
      setLoading(false);
    }
  }

  const selectedBank = NIGERIAN_BANKS.find((bank) => bank.code === form.bankCode);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <StepIndicator steps={STEPS} currentStep={step} />
      <AuthError message={error} />

      {step === 0 && (
        <div className="space-y-5">
          <AuthField label="Full name">
            <input
              type="text"
              required
              autoFocus
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className={authInputClass}
              placeholder="Enter your full name"
            />
          </AuthField>

          <AuthField label="Email address">
            <input
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={authInputClass}
              placeholder="you@example.com"
            />
          </AuthField>

          <AuthField label="Phone number" hint="Used to sign in to your account">
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
        </div>
      )}

      {step === 1 && (
        <div className="space-y-5">
          <AuthField label="Password" hint="Minimum 6 characters">
            <input
              type="password"
              required
              minLength={6}
              autoFocus
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className={authInputClass}
              placeholder="Create a password"
            />
          </AuthField>

          <AuthField label="Confirm password">
            <input
              type="password"
              required
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={(e) =>
                setForm({ ...form, confirmPassword: e.target.value })
              }
              className={authInputClass}
              placeholder="Repeat your password"
            />
          </AuthField>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <AuthField label="Bank">
            <select
              required
              autoFocus
              value={form.bankCode}
              onChange={(e) => setForm({ ...form, bankCode: e.target.value })}
              className={authSelectClass}
            >
              <option value="">Select your bank</option>
              {NIGERIAN_BANKS.map((bank) => (
                <option key={bank.code} value={bank.code}>
                  {bank.name}
                </option>
              ))}
            </select>
          </AuthField>

          <AuthField label="Account number" hint="10-digit NUBAN account number">
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
              className={authInputClass}
              placeholder="0123456789"
            />
          </AuthField>

          <AuthField label="Account name">
            <input
              type="text"
              required
              value={form.accountName}
              onChange={(e) => setForm({ ...form, accountName: e.target.value })}
              className={authInputClass}
              placeholder="Name on your bank account"
            />
          </AuthField>

          {selectedBank && (
            <div className="rounded-lg border border-slate-200 px-4 py-3 text-xs text-slate-500">
              <span className="font-medium text-slate-700">Summary: </span>
              {form.fullName} · {selectedBank.name} · ****
              {form.accountNumber.slice(-4) || "----"}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        {step > 0 && (
          <button
            type="button"
            onClick={handlePrevious}
            disabled={loading}
            className={`${authSecondaryBtnClass} flex-1`}
          >
            Previous
          </button>
        )}

        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={handleNext}
            className={`${authPrimaryBtnClass} flex-1`}
          >
            Next
          </button>
        ) : (
          <button
            type="submit"
            disabled={loading}
            className={`${authPrimaryBtnClass} flex-1`}
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        )}
      </div>
    </form>
  );
}
