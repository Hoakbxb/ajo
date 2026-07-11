"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { NIGERIAN_BANKS } from "@/lib/nigerian-banks";
import { ProButton } from "../../dashboard/components/dashboard-ui";

export type ProfileFormData = {
  fullName: string;
  email: string;
  phone: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
};

const inputClass =
  "mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100";

const labelClass = "block text-sm font-medium text-slate-700";

export default function ProfileEditForm({
  initial,
  onCancel,
  onSuccess,
}: {
  initial: ProfileFormData;
  onCancel: () => void;
  onSuccess: (updated: ProfileFormData & { bankName: string }) => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState(initial);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (newPassword || confirmPassword || currentPassword) {
        if (!currentPassword) {
          throw new Error("Enter your current password to change it");
        }
        if (newPassword.length < 6) {
          throw new Error("New password must be at least 6 characters");
        }
        if (newPassword !== confirmPassword) {
          throw new Error("New passwords do not match");
        }
      }

      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update profile");

      setSuccess(data.message || "Profile updated successfully");
      onSuccess({
        fullName: data.member.fullName,
        email: data.member.email,
        phone: data.member.phone,
        bankCode: data.member.bankCode,
        bankName: data.member.bankName,
        accountNumber: data.member.accountNumber,
        accountName: data.member.accountName,
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelClass}>Full Name</label>
          <input
            type="text"
            required
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Email</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Phone</label>
          <input
            type="tel"
            required
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className={inputClass}
          />
        </div>
      </div>

      <div className="border-t border-slate-100 pt-6">
        <h3 className="text-sm font-semibold text-slate-900">Bank Account</h3>
        <p className="mt-0.5 text-sm text-slate-500">Where you receive payouts</p>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass}>Bank</label>
            <select
              required
              value={form.bankCode}
              onChange={(e) => setForm({ ...form, bankCode: e.target.value })}
              className={inputClass}
            >
              <option value="">Select a bank</option>
              {NIGERIAN_BANKS.map((bank) => (
                <option key={bank.code} value={bank.code}>
                  {bank.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Account Number</label>
            <input
              type="text"
              required
              inputMode="numeric"
              maxLength={10}
              value={form.accountNumber}
              onChange={(e) =>
                setForm({ ...form, accountNumber: e.target.value.replace(/\D/g, "") })
              }
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Account Name</label>
            <input
              type="text"
              required
              value={form.accountName}
              onChange={(e) => setForm({ ...form, accountName: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-6">
        <h3 className="text-sm font-semibold text-slate-900">Change Password</h3>
        <p className="mt-0.5 text-sm text-slate-500">Leave blank to keep your current password</p>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass}>Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inputClass}
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className={labelClass}>New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputClass}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className={labelClass}>Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClass}
              autoComplete="new-password"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-slate-100 pt-6 sm:flex-row">
        <ProButton type="submit" disabled={loading} className="sm:w-auto">
          {loading ? "Saving..." : "Save Changes"}
        </ProButton>
        <ProButton
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={loading}
          className="sm:w-auto"
        >
          Cancel
        </ProButton>
      </div>
    </form>
  );
}
