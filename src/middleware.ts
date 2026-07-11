import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAnonKey } from "@/lib/supabase/server";

const memberPrefixes = ["/dashboard", "/profile", "/transactions"];
const adminPublicPaths = ["/admin/login"];

function isMemberPath(pathname: string) {
  return memberPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function isAdminPath(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function isAdminPublicPath(pathname: string) {
  return adminPublicPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const needsAuth = isMemberPath(pathname) || (isAdminPath(pathname) && !isAdminPublicPath(pathname));

  if (!needsAuth) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    getSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginPath = isAdminPath(pathname) ? "/admin/login" : "/";
    return NextResponse.redirect(new URL(loginPath, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile",
    "/profile/:path*",
    "/transactions",
    "/transactions/:path*",
    "/admin",
    "/admin/:path*",
  ],
};
