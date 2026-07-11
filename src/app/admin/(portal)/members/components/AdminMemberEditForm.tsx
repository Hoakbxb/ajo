"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { NIGERIAN_BANKS } from "@/lib/nigerian-banks";
import { ProButton } from "@/app/(app)/dashboard/components/dashboard-ui";

export type AdminMemberFormData = {
  fullName: string;
  email: string;
  phone: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
};

const inputClass =
  "mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20";

const labelClass = "block text-sm font-medium text-slate-700";

export default function AdminMemberEditForm({
  memberId,
  initial,
  onSuccess,
}: {
  memberId: string;
  initial: AdminMemberFormData;
  onSuccess?: (updated: AdminMemberFormData & { bankName: string }) => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState(initial);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/api/admin/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update member");

      setSuccess(data.message || "Member profile updated");
      const updated = {
        fullName: data.member.fullName,
        email: data.member.email,
        phone: data.member.phone,
        bankCode: data.member.bankCode,
        bankName: data.member.bankName,
        accountNumber: data.member.accountNumber,
        accountName: data.member.accountName,
      };
      setForm({
        fullName: updated.fullName,
        email: updated.email,
        phone: updated.phone,
        bankCode: updated.bankCode,
        accountNumber: updated.accountNumber,
        accountName: updated.accountName,
      });
      onSuccess?.(updated);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update member");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
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

      <div className="grid gap-4 sm:grid-cols-2">
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
              setForm({
                ...form,
                accountNumber: e.target.value.replace(/\D/g, ""),
              })
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

      <ProButton type="submit" disabled={loading}>
        {loading ? "Saving..." : "Save profile"}
      </ProButton>
    </form>
  );
}
