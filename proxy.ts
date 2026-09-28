import { adminAuth } from "@/lib/admin-auth";
import { auth } from "@/lib/auth";
import { canAdminAccessPath } from "@/lib/permissions/permissions";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const LEVEL_ADMIN = "ADMIN";
const LEVEL_SUPER = "SUPER_ADMIN";
const LEVEL_DEV = "DEVELOPER";

export async function proxy(req: NextRequest) {
  const url = req.nextUrl.clone();
  const pathname = url.pathname;

  // Public routes – no auth required
  const publicPrefixes = [
    "/api/auth",
    "/favicon.ico",
    "/_next",
    "/assets",
    "/public",
    "/forgot",
    "/register",
    "/login",
    "/admin/login",
    "/admin/register",
  ];

  for (const p of publicPrefixes) {
    if (pathname === p || pathname.startsWith(p + "/")) {
      return NextResponse.next();
    }
  }

  // Get session + level for all protected routes
  try {
    // Get user session (from /api/auth)
    const userSession = await auth();
    const userType = (userSession?.user as any)?.userType as string | undefined;
    const userId = userSession?.user?.id ? BigInt(userSession.user.id) : null;

    // Get admin session (from /api/auth/admin)
    const adminSession = await adminAuth();
    const adminLevel = (adminSession?.user as any)?.level as string | undefined;
    const adminId = adminSession?.user?.id ? BigInt(adminSession.user.id) : null;

    // console.log('[proxy] User session:', userSession?.user?.email, 'userType:', userType);
    // console.log('[proxy] Admin session:', adminSession?.user?.email, 'level:', adminLevel);

    const requireUserLogin = (redirectTo = "/login") => {
      url.pathname = redirectTo;
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    };

    const requireAdminLogin = (redirectTo = "/admin/login") => {
      url.pathname = redirectTo;
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    };

    const redirectToHome = () => {
      url.pathname = "/";
      url.searchParams.delete("callbackUrl");
      return NextResponse.redirect(url);
    };

    const redirectToAdminHome = () => {
      url.pathname = "/admin";
      url.searchParams.delete("callbackUrl");
      return NextResponse.redirect(url);
    };

    // Handle user login page
    if (pathname === "/login") {
      if (userSession?.user) {
        url.pathname = "/";
        url.searchParams.delete("callbackUrl");
        return NextResponse.redirect(url);
      }
      return NextResponse.next();
    }

    // Handle admin login page
    if (pathname === "/admin/login") {
      if (adminSession?.user) {
        url.pathname = "/admin";
        url.searchParams.delete("callbackUrl");
        return NextResponse.redirect(url);
      }
      return NextResponse.next();
    }

    // Handle root path
    if (pathname === "/") {
      if (!userSession?.user) {
        return requireUserLogin();
      }
      return NextResponse.next();
    }

    // Handle unauthorized page
    if (pathname === "/unauthorized") {
      if (!userSession?.user && !adminSession?.user) {
        return requireUserLogin();
      }
      if (adminSession?.user) {
        return redirectToAdminHome();
      }
      return redirectToHome();
    }

    // ===== CUSTOMER/USER ROUTES =====
    if (!pathname.startsWith("/admin")) {
      // Customers can access their own pages
      if (!userSession?.user) {
        return requireUserLogin();
      }
      // Admins should not access user routes
      if (userType === "ADMIN") {
        return redirectToAdminHome();
      }
      return NextResponse.next();
    }

    // ===== ADMIN ROUTES =====
    if (pathname.startsWith("/admin")) {
      // All admin routes require admin authentication
      if (!adminSession?.user) {
        return requireAdminLogin();
      }

      // DEVELOPER has full access
      if (adminLevel === LEVEL_DEV) {
        // console.log('[proxy] DEVELOPER - full access');
        return NextResponse.next();
      }

      // SUPER_ADMIN and ADMIN: check permissions
      if ((adminLevel === LEVEL_SUPER || adminLevel === LEVEL_ADMIN) && adminId) {
        const hasAccess = await canAdminAccessPath(adminId, pathname);
        // console.log('[proxy] Admin access check:', hasAccess);
        if (!hasAccess) {
          return redirectToAdminHome();
        }
        return NextResponse.next();
      }

      return redirectToAdminHome();
    }

    return NextResponse.next();
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.next();
  }
}

// IMPORTANT: matcher must match your actual route prefixes
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|public).*)",
  ],
};
