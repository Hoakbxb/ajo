import { NextResponse } from "next/server";
import { createSupabaseServerClient, getSupabaseAdmin } from "@/lib/supabase/server";
import { findMemberByAuthUserId } from "@/lib/db/repository";
import type { MemberRole } from "@/types/database";

export interface SessionPayload {
  memberId: string;
  phone: string;
  fullName: string;
  authUserId: string;
  role: MemberRole;
  email: string;
}

export async function getSession(): Promise<SessionPayload | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const member = await findMemberByAuthUserId(user.id);
  if (!member) return null;

  return {
    memberId: member.id,
    phone: member.phone,
    fullName: member.fullName,
    authUserId: user.id,
    role: member.role,
    email: member.email,
  };
}

export async function requireAdmin(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    throw new Error("Unauthorized");
  }
  return session;
}

export function adminUnauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function signInWithEmailPassword(email: string, password: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw new Error(error.message);
  return data;
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

export async function createAuthUser(input: {
  email: string;
  password: string;
  fullName: string;
  phone: string;
}) {
  const { data, error } = await getSupabaseAdmin().auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      full_name: input.fullName,
      phone: input.phone,
    },
  });

  if (error) throw new Error(error.message);
  if (!data.user) throw new Error("Failed to create auth user");

  return data.user;
}

export async function deleteAuthUser(authUserId: string) {
  const { error } = await getSupabaseAdmin().auth.admin.deleteUser(authUserId);
  if (error) throw new Error(error.message);
}

export async function updateAuthUser(
  authUserId: string,
  patch: {
    email?: string;
    password?: string;
    fullName?: string;
    phone?: string;
  }
) {
  const { data, error } = await getSupabaseAdmin().auth.admin.updateUserById(
    authUserId,
    {
      email: patch.email,
      password: patch.password,
      user_metadata: {
        ...(patch.fullName !== undefined ? { full_name: patch.fullName } : {}),
        ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
      },
    }
  );

  if (error) throw new Error(error.message);
  return data.user;
}
