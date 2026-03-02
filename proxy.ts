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
  ];

  for (const p of publicPrefixes) {
    if (pathname === p || pathname.startsWith(p + "/")) {
      return NextResponse.next();
    }
  }

  // Get session + level for all protected routes
  try {
    const session = await auth();
    const userType = (session?.user as any)?.userType as string | undefined;
    const level = (session?.user as any)?.level as string | undefined;
    const userId = session?.user?.id ? BigInt(session.user.id) : null;

    console.log('[proxy] Session user:', session?.user?.email, 'userType:', userType, 'level:', level);

    const requireLogin = (redirectTo = "/login") => {
      url.pathname = redirectTo;
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    };

    const redirectToHome = () => {
      url.pathname = "/";
      url.searchParams.delete("callbackUrl");
      return NextResponse.redirect(url);
    };

    // Handle login pages
    if (pathname === "/login") {
      if (session?.user) {
        // If admin, redirect to /admin, otherwise to home
        if (userType === "ADMIN") {
          url.pathname = "/admin";
        } else {
          url.pathname = "/";
        }
        url.searchParams.delete("callbackUrl");
        return NextResponse.redirect(url);
      }
      return NextResponse.next();
    }

    // Handle root path
    if (pathname === "/") {
      if (!session?.user) {
        return requireLogin();
      }
      return NextResponse.next();
    }

    // Handle unauthorized page
    if (pathname === "/unauthorized") {
      if (!session?.user) return requireLogin();
      return redirectToHome();
    }

    // ===== CUSTOMER/USER ROUTES =====
    if (!pathname.startsWith("/admin")) {
      // Customers can access their own pages
      if (!session?.user) {
        return requireLogin();
      }
      return NextResponse.next();
    }

    // ===== ADMIN ROUTES =====
    if (pathname.startsWith("/admin")) {
      // All admin routes require authentication
      if (!session?.user) {
        return requireLogin();
      }

      // Only admins can access /admin routes
      if (userType !== "ADMIN") {
        return redirectToHome();
      }

      // DEVELOPER has full access
      if (level === LEVEL_DEV) {
        console.log('[proxy] DEVELOPER - full access');
        return NextResponse.next();
      }

      // SUPER_ADMIN and ADMIN: check permissions
      if ((level === LEVEL_SUPER || level === LEVEL_ADMIN) && userId) {
        const hasAccess = await canAdminAccessPath(userId, pathname);
        console.log('[proxy] Admin access check:', hasAccess);
        if (!hasAccess) {
          return redirectToHome();
        }
        return NextResponse.next();
      }

      return redirectToHome();
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
