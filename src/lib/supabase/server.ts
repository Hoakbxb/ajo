import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

let adminClient: SupabaseClient | null = null;

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL must be set");
  return url;
}

export function getSupabaseAnonKey(): string {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set"
    );
  }
  return key;
}

export function getSupabaseAdmin(): SupabaseClient {
  if (adminClient) return adminClient;

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY must be set");
  }

  adminClient = createClient(getSupabaseUrl(), serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return adminClient;
}

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Ignored when called from a Server Component without mutable cookies.
        }
      },
    },
  });
}
