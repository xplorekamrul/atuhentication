import { auth } from "@/lib/auth";
import { canUserAccessPath } from "@/lib/permissions/permissions";
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
    "/iclock/cdata",
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

  // Get session + userlevel for all protected routes
  try {
    const session = await auth();
    const userlevel = (session?.user as any)?.userLvel as string | undefined;
    const userId = session?.user?.id ? BigInt(session.user.id) : null;

    // console.log('[proxy] Session user:', session?.user?.email, 'userlevel:', userlevel);

    const requireLogin = (redirectTo = "/login") => {
      url.pathname = redirectTo;
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    };

    const redirectToUnauthorized = () => {
      url.pathname = "/unauthorized";
      url.searchParams.delete("callbackUrl");
      return NextResponse.redirect(url);
    };

    // Handle login page - redirect authenticated users to home
    if (pathname === "/login") {
      if (session?.user) {
        url.pathname = "/";
        url.searchParams.delete("callbackUrl");
        return NextResponse.redirect(url);
      }
      return NextResponse.next();
    }

    // Handle root path - allow access, the page itself will handle user level display
    if (pathname === "/") {
      if (!session?.user) {
        // Unauthenticated user - redirect to login
        return requireLogin();
      }
      // Authenticated user - allow access to home page
      return NextResponse.next();
    }

    // If someone manually goes to /unauthorized, send them to home page
    if (pathname === "/unauthorized") {
      if (!session?.user) return requireLogin();
      url.pathname = "/";
      url.searchParams.delete("callbackUrl");
      return NextResponse.redirect(url);
    }

    // All other routes require authentication
    if (!session?.user) {
      return requireLogin();
    }

    // DEVELOPER has full access to all routes
    if (userlevel === LEVEL_DEV) {
      return NextResponse.next();
    }

    // SUPER_ADMIN and ADMIN users: check permissions based on route visibility
    if ((userlevel === LEVEL_SUPER || userlevel === LEVEL_ADMIN) && userId) {
      const hasAccess = await canUserAccessPath(userId, pathname);
      if (!hasAccess) {
        return redirectToUnauthorized();
      }
      return NextResponse.next();
    }

    // Default: deny access
    return redirectToUnauthorized();
  } catch (error) {
    console.error("Proxy error:", error);
    // If there's an error getting the session, allow the request to continue
    return NextResponse.next();
  }
}

// IMPORTANT: matcher must match your actual route prefixes
export const config = {
  matcher: [
    /**
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api|_next/static|_next/image|favicon.ico|public).*)",
  ],
};
