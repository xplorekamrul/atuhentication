import { auth } from "@/lib/auth";
import { canAdminAccessPath } from "@/lib/permissions/permissions";
import {
  enforcePageRateLimit,
  getClientIp,
  type PageRateLimitResult,
} from "@/lib/rate-limit";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const LEVEL_ADMIN = "ADMIN";
const LEVEL_SUPER = "SUPER_ADMIN";
const LEVEL_DEV = "DEVELOPER";

const STATIC_ASSET_EXT_REGEX =
  /\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|woff2?|ttf|eot|map)$/i;

function withPageRateLimitHeaders(
  res: NextResponse,
  pageLimit: PageRateLimitResult
): NextResponse {
  if (pageLimit.reason === "ok") {
    res.headers.set("X-RateLimit-Limit", String(pageLimit.limit));
    res.headers.set("X-RateLimit-Remaining", String(pageLimit.remaining));
    res.headers.set("X-RateLimit-Reset", String(pageLimit.resetInSeconds));
  }
  return res;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildBlockedPageResponse(
  req: NextRequest,
  pageLimit: PageRateLimitResult
): NextResponse {
  const headers = new Headers({
    "Retry-After": String(pageLimit.resetInSeconds),
    "X-RateLimit-Limit": String(pageLimit.limit),
    "X-RateLimit-Remaining": "0",
    "X-RateLimit-Reset": String(pageLimit.resetInSeconds),
    "Cache-Control": "no-store",
  });

  // Server Actions expect either `text/x-component` or exact `text/plain` on >= 400 errors;
  // returning JSON/HTML causes Next.js to throw "An unexpected response was received from the server."
  if (req.headers.has("next-action")) {
    headers.set("Content-Type", "text/plain");
    return new NextResponse(
      `Too many requests. Access temporarily blocked for ${pageLimit.formattedDuration}.`,
      { status: 429, headers }
    );
  }

  const accept = req.headers.get("accept") || "";
  const isJsonPreferred =
    accept.includes("application/json") && !accept.includes("text/html");

  if (isJsonPreferred) {
    headers.set("Content-Type", "application/json; charset=utf-8");
    return new NextResponse(
      JSON.stringify({
        ok: false,
        error: `Too many requests. Access temporarily blocked for ${pageLimit.formattedDuration}.`,
        retryAfterSeconds: pageLimit.resetInSeconds,
        formattedDuration: pageLimit.formattedDuration,
        tier: pageLimit.tier,
      }),
      { status: 429, headers }
    );
  }

  headers.set("Content-Type", "text/html; charset=utf-8");
  const safeDuration = escapeHtml(pageLimit.formattedDuration);
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>429 - Too Many Requests</title>
  <style>
    body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; display: grid; place-items: center; min-height: 100vh; padding: 1.5rem; }
    .card { max-width: 28rem; width: 100%; background: #1e293b; border: 1px solid #334155; border-radius: 0.75rem; padding: 2rem; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.35); }
    .badge { display: inline-block; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: #fca5a5; background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.35); padding: 0.25rem 0.65rem; border-radius: 9999px; margin-bottom: 1rem; }
    h1 { margin: 0 0 0.75rem; font-size: 1.5rem; }
    p { margin: 0 0 1rem; font-size: 0.95rem; line-height: 1.5; color: #cbd5e1; }
    .meta { font-size: 0.85rem; color: #94a3b8; background: #0f172a; border-radius: 0.5rem; padding: 0.75rem; }
    strong { color: #f8fafc; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">HTTP 429 &bull; Rate Limit Exceeded</div>
    <h1>Too Many Requests</h1>
    <p>Automated or excessive page traffic was detected from your network. Access has been temporarily paused.</p>
    <div class="meta">
      Wait time: <strong>${safeDuration}</strong> (Level ${pageLimit.tier})<br />
      Keep-flooding requests will double this lockout duration.
    </div>
  </div>
</body>
</html>`;

  return new NextResponse(html, { status: 429, headers });
}

export async function proxy(req: NextRequest) {
  const url = req.nextUrl.clone();
  const pathname = url.pathname;

  // 1. Skip static assets and auth API endpoints (auth has its own dedicated limiter)
  const assetBypassPrefixes = [
    "/api/auth",
    "/favicon.ico",
    "/_next",
    "/assets",
    "/public",
  ];

  for (const p of assetBypassPrefixes) {
    if (pathname === p || pathname.startsWith(p + "/")) {
      return NextResponse.next();
    }
  }

  if (STATIC_ASSET_EXT_REGEX.test(pathname)) {
    return NextResponse.next();
  }

  // 2. Global Page-Wide Rate Limit & Bot Punishment (runs BEFORE auth() & DB hits)
  const ip = getClientIp(req.headers);
  const pageLimit = await enforcePageRateLimit(ip);
  if (!pageLimit.allowed) {
    return buildBlockedPageResponse(req, pageLimit);
  }

  // 3. Public page routes (still protected by global page rate limit above)
  const publicPagePrefixes = ["/forgot", "/register", "/"];
  for (const p of publicPagePrefixes) {
    if (pathname === p || pathname.startsWith(p + "/")) {
      return withPageRateLimitHeaders(NextResponse.next(), pageLimit);
    }
  }

  // 4. Get session + level for all protected routes
  try {
    const session = await auth();
    const sessionUser = session?.user as
      | { id?: string; userType?: string; level?: string }
      | undefined;
    const userType = sessionUser?.userType;
    const level = sessionUser?.level;
    const userId = sessionUser?.id ?? null;

    const requireLogin = (redirectTo = "/login") => {
      if (req.headers.has("next-action")) {
        return withPageRateLimitHeaders(
          new NextResponse("Session expired. Please reload and sign in again.", {
            status: 401,
            headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" },
          }),
          pageLimit
        );
      }
      url.pathname = redirectTo;
      url.searchParams.set("callbackUrl", pathname);
      return withPageRateLimitHeaders(NextResponse.redirect(url), pageLimit);
    };

    const redirectToHome = () => {
      url.pathname = "/";
      url.searchParams.delete("callbackUrl");
      return withPageRateLimitHeaders(NextResponse.redirect(url), pageLimit);
    };

    const redirectToAdminHome = () => {
      url.pathname = "/admin";
      url.searchParams.delete("callbackUrl");
      return withPageRateLimitHeaders(NextResponse.redirect(url), pageLimit);
    };

    // Handle login pages
    if (pathname === "/login" || pathname === "/admin/login") {
      if (session?.user) {
        if (userType === "ADMIN") {
          url.pathname = "/admin";
        } else {
          url.pathname = "/";
        }
        url.searchParams.delete("callbackUrl");
        return withPageRateLimitHeaders(NextResponse.redirect(url), pageLimit);
      }
      return withPageRateLimitHeaders(NextResponse.next(), pageLimit);
    }

    // Handle unauthorized page
    if (pathname === "/unauthorized") {
      if (!session?.user) return requireLogin();
      return redirectToHome();
    }

    // ===== CUSTOMER/USER ROUTES =====
    if (!pathname.startsWith("/admin")) {
      if (!session?.user) {
        return requireLogin();
      }
      return withPageRateLimitHeaders(NextResponse.next(), pageLimit);
    }

    // ===== ADMIN ROUTES =====
    if (pathname.startsWith("/admin")) {
      if (!session?.user) {
        return requireLogin("/admin/login");
      }

      if (userType !== "ADMIN") {
        return redirectToHome();
      }

      if (level === LEVEL_DEV) {
        return withPageRateLimitHeaders(NextResponse.next(), pageLimit);
      }

      if ((level === LEVEL_SUPER || level === LEVEL_ADMIN) && userId) {
        const hasAccess = await canAdminAccessPath(userId, pathname, level);
        if (!hasAccess) {
          return redirectToAdminHome();
        }
        return withPageRateLimitHeaders(NextResponse.next(), pageLimit);
      }

      return redirectToAdminHome();
    }

    return withPageRateLimitHeaders(NextResponse.next(), pageLimit);
  } catch (error) {
    console.error("Proxy error:", error);
    return withPageRateLimitHeaders(NextResponse.next(), pageLimit);
  }
}

// IMPORTANT: matcher must match your actual route prefixes
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|public).*)",
  ],
};
