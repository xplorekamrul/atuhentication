import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

const ROLE_ADMIN = "ADMIN";
const ROLE_SUPER = "SUPER_ADMIN";
const ROLE_DEV = "DEVELOPER";

const isUnder = (pathname: string, base: string) =>
  pathname === base || pathname.startsWith(base + "/");

const getRoleHomePath = (role?: string) => {
  switch (role) {
    case ROLE_DEV:
      return "/developer";
    case ROLE_SUPER:
      return "/super-admin";
    case ROLE_ADMIN:
      return "/admin";
    default:
      return "/";
  }
};

const redirectToHome = (url: URL, role?: string) => {
  url.pathname = getRoleHomePath(role);
  url.searchParams.delete("callbackUrl");
  return NextResponse.redirect(url);
};

export async function proxy(req: NextRequest) {
  const url = req.nextUrl.clone();
  const pathname = url.pathname;

  // Public routes – no auth required
  const publicPrefixes = [
    "/",
    "/login",
    "/register",
    "/api/auth",
    "/favicon.ico",
    "/_next",
    "/assets",
    "/public",
  ];

  for (const p of publicPrefixes) {
    if (pathname === p || pathname.startsWith(p + "/")) {
      return NextResponse.next();
    }
  }

  // Get session + role for all protected routes
  const session = await auth();
  const role = (session?.user as any)?.role as string | undefined;

  const requireLogin = (redirectTo = "/login") => {
    url.pathname = redirectTo;
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  };

  // If someone manually goes to /unauthorized, send them to their home page
  if (pathname === "/unauthorized") {
    if (!session?.user) return requireLogin();
    return redirectToHome(url, role);
  }

  // /developer → only DEVELOPER
  if (isUnder(pathname, "/developer")) {
    if (!session?.user) return requireLogin();
    if (role !== ROLE_DEV) {
      // Not allowed here → send them to their own section (/admin, /super-admin, etc.)
      return redirectToHome(url, role);
    }
    return NextResponse.next();
  }

  // /super-admin → SUPER_ADMIN and DEVELOPER
  if (isUnder(pathname, "/super-admin")) {
    if (!session?.user) return requireLogin();
    if (role === ROLE_SUPER || role === ROLE_DEV) {
      return NextResponse.next();
    }
    // Admin / other roles not allowed → home
    return redirectToHome(url, role);
  }

  // /admin → ADMIN, SUPER_ADMIN, DEVELOPER
  if (isUnder(pathname, "/admin")) {
    if (!session?.user) return requireLogin();
    if (role === ROLE_ADMIN || role === ROLE_SUPER || role === ROLE_DEV) {
      return NextResponse.next();
    }
    return redirectToHome(url, role);
  }

  // Everything else – allow
  return NextResponse.next();
}

// IMPORTANT: matcher must match your actual route prefixes
export const config = {
  matcher: ["/admin/:path*", "/super-admin/:path*", "/developer/:path*", "/unauthorized"],
};
