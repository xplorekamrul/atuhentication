---
name: session-version-management
description: >-
  Complete architecture, implementation guide, and reference for multi-device session management and real-time session invalidation using sessionVersion in Next.js (Auth.js / NextAuth v5).
  Covers multi-device persistence without login collision, real-time instant revocation on password or status changes via proxy/middleware, cookie destruction, and dual-session isolation (admin vs customer).
  Use this skill whenever implementing multi-device authentication, forced logout across devices, password reset session invalidation, or sessionVersion in Next.js.
---

# Next.js Multi-Device Session Management & Real-Time Invalidation (`sessionVersion`)

This skill provides an enterprise-grade blueprint for managing user and administrator sessions in Next.js (NextAuth v5 / Auth.js) with:
1. **Multi-device persistence**: Users and admins can remain logged in on multiple devices (phone, laptop, tablet, work PC) simultaneously without kicking each other out.
2. **Instant real-time revocation**: Changing a password or suspending an account immediately terminates active sessions across **all** devices on their very next server request.

---

## 1. The Core Architecture Challenge

### The Common Pitfall (Single-Device Trap)
Many developers increment `sessionVersion` every time a user logs in:
```ts
// ❌ ANTI-PATTERN: Breaks multi-device usability
await prisma.user.update({
  where: { id: user.id },
  data: { sessionVersion: { increment: 1 } },
});
```
* **Consequence**: When a user logs in on their phone, `sessionVersion` increments from `1` to `2`. Their laptop session still holds `sessionVersion = 1`. On the next click on their laptop, the server sees a mismatch and logs them out. The user can never be logged in on two devices at once.

### The Correct Paradigm
* **Sign-in / Login**: **Never** increment `sessionVersion`. All active devices share the current `sessionVersion` (e.g. `1`).
* **Security Events**: **Only** increment `sessionVersion` when security requires terminating all other devices:
  1. User changes their own password.
  2. Administrator resets a user's password.
  3. Administrator changes account status to `SUSPENDED` or `INACTIVE`.
  4. User/Admin explicitly clicks "Log out of all devices" (`revokeUserSession`).

---

## 2. Database Schema (Prisma / SQL)

Add `sessionVersion` and `status` to both `User` (Customer) and `Admin` models:

```prisma
model User {
  id              BigInt       @id @default(autoincrement()) @db.UnsignedBigInt
  phone           String?      @unique
  email           String?      @unique
  password        String
  status          UserStatus   @default(ACTIVE) // ACTIVE, INACTIVE, SUSPENDED
  sessionVersion  Int          @default(1)      // Incremented only on password/status changes
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  @@map("users")
}

model Admin {
  id              BigInt       @id @default(autoincrement()) @db.UnsignedBigInt
  email           String       @unique
  username        String?      @unique
  password        String
  level           AdminLevel   @default(ADMIN)
  status          AdminStatus  @default(ACTIVE)
  sessionVersion  Int          @default(1)      // Incremented only on password/status changes
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  @@map("admins")
}

enum UserStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
}

enum AdminStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
}
```

---

## 3. NextAuth / Auth.js Token & Session Callbacks

Ensure `sessionVersion` and `status` are stamped into the JWT token upon authentication and forwarded to `session.user`.

```ts
// lib/user-auth.ts (Customer) or lib/admin-auth.ts (Admin)
export const { auth, signIn, signOut, handlers } = NextAuth({
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.status = (user as any).status;
        token.sessionVersion = (user as any).sessionVersion;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        (session.user as any).status = token.status as string;
        (session.user as any).sessionVersion = token.sessionVersion as number;
      }
      return session;
    },
  },
  providers: [
    CredentialsProvider({
      async authorize(credentials) {
        const user = await prisma.user.findUnique({
          where: { phone: credentials.phone },
        });

        if (!user) throw new Error("Invalid credentials");
        if (user.status !== "ACTIVE") throw new Error("Account is suspended");

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) throw new Error("Invalid credentials");

        // ✅ Return user with current sessionVersion WITHOUT incrementing
        return {
          id: user.id.toString(),
          phone: user.phone,
          status: user.status,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
  ],
});
```

---

## 4. Triggering Session Invalidation (Server Actions)

Increment `sessionVersion: { increment: 1 }` exclusively inside security actions:

### Scenario A: User Changes Own Password
```ts
// actions/user/change-password.ts
export async function changeUserPassword(newPasswordHash: string, userId: bigint) {
  return await prisma.user.update({
    where: { id: userId },
    data: {
      password: newPasswordHash,
      sessionVersion: { increment: 1 }, // ✅ All other devices will be forced to log in
    },
  });
}
```

### Scenario B: Admin Suspends Account or Resets Password
```ts
// actions/admin/update-user-status.ts
export async function updateUserStatus(userId: bigint, status: "ACTIVE" | "SUSPENDED") {
  return await prisma.user.update({
    where: { id: userId },
    data: {
      status,
      sessionVersion: { increment: 1 }, // ✅ Immediately invalidates all existing JWTs
    },
  });
}
```

### Scenario C: Explicit "Log Out of All Devices"
```ts
// actions/auth/revoke-sessions.ts
export async function revokeAllSessions(userId: bigint) {
  return await prisma.user.update({
    where: { id: userId },
    data: {
      sessionVersion: { increment: 1 },
    },
  });
}
```

---

## 5. Proxy / Middleware Real-Time Interceptor (`proxy.ts` / `middleware.ts`)

On every server request, the proxy verifies that the incoming token's `sessionVersion` matches the live record in the database.

If a mismatch is detected:
1. Delete session cookies immediately.
2. Redirect the user to the login screen with a `callbackUrl`.

```ts
// proxy.ts
import { adminAuth } from "@/lib/admin-auth";
import { userAuth } from "@/lib/user-auth";
import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function proxy(req: NextRequest) {
  const url = req.nextUrl.clone();
  const pathname = url.pathname;

  // Skip static files & auth API endpoints
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Helper: Wipe cookies & redirect
  const invalidateUserSession = (redirectTo = "/login") => {
    url.pathname = redirectTo;
    url.searchParams.set("callbackUrl", pathname);
    const res = NextResponse.redirect(url);
    res.cookies.delete("user.session-token");
    res.cookies.delete("__Secure-user.session-token");
    return res;
  };

  const invalidateAdminSession = (redirectTo = "/admin/sign-in") => {
    url.pathname = redirectTo;
    url.searchParams.set("callbackUrl", pathname);
    const res = NextResponse.redirect(url);
    res.cookies.delete("admin.session-token");
    res.cookies.delete("__Secure-admin.session-token");
    return res;
  };

  // ==========================================
  // 1. ADMIN ROUTE VALIDATION
  // ==========================================
  if (pathname.startsWith("/admin")) {
    const adminSession = await adminAuth();

    if (!adminSession?.user?.id) {
      if (pathname === "/admin/sign-in") return NextResponse.next();
      return invalidateAdminSession();
    }

    const adminId = BigInt(adminSession.user.id);
    const tokenVersion = (adminSession.user as any).sessionVersion;

    // Check live database state
    const dbAdmin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: { status: true, sessionVersion: true },
    });

    // Revoke if account suspended or sessionVersion mismatch
    if (
      !dbAdmin ||
      dbAdmin.status !== "ACTIVE" ||
      dbAdmin.sessionVersion !== tokenVersion
    ) {
      return invalidateAdminSession();
    }

    // Clear stale redirect if already on login page
    if (pathname === "/admin/sign-in") {
      url.pathname = "/admin";
      url.searchParams.delete("callbackUrl");
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  }

  // ==========================================
  // 2. CUSTOMER / USER ROUTE VALIDATION
  // ==========================================
  const userSession = await userAuth();

  if (userSession?.user?.id) {
    const userId = BigInt(userSession.user.id);
    const tokenVersion = (userSession.user as any).sessionVersion;

    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { status: true, sessionVersion: true },
    });

    const isSessionInvalid =
      !dbUser ||
      dbUser.status !== "ACTIVE" ||
      dbUser.sessionVersion !== tokenVersion;

    const isProtectedUserRoute =
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/profile") ||
      pathname.startsWith("/orders");

    if (isSessionInvalid) {
      // Invalidate cookies immediately
      if (isProtectedUserRoute) {
        return invalidateUserSession();
      }
      // On public storefront: silently clear invalid cookie and allow guest browsing
      const res = NextResponse.next();
      res.cookies.delete("user.session-token");
      res.cookies.delete("__Secure-user.session-token");
      return res;
    }

    // Redirect logged-in customer away from login page
    if (pathname === "/login") {
      url.pathname = "/dashboard";
      url.searchParams.delete("callbackUrl");
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}
```

---

## 6. Expected Outputs & Verification Matrix

| Scenario / Action | Database State | Device 1 Token | Device 2 Token | Expected Result & Behavior |
| :--- | :--- | :--- | :--- | :--- |
| **Initial Login (Device 1)** | `sessionVersion: 1`, `status: ACTIVE` | Token `sessionVersion: 1` | Not logged in | Device 1 logged in successfully (`200 OK`). |
| **Second Login (Device 2)** | `sessionVersion: 1`, `status: ACTIVE` | Token `sessionVersion: 1` | Token `sessionVersion: 1` | **Both devices active simultaneously**. Device 1 is NOT logged out. |
| **User Changes Password** | `sessionVersion: 2` (incremented) | Token `sessionVersion: 1` (stale) | Token `sessionVersion: 1` (stale) | On next click, **both devices detected mismatch**, cookies deleted, redirected to `/login`. |
| **Admin Suspends Account** | `status: SUSPENDED`, `sessionVersion: 2` | Token `sessionVersion: 1` | Token `sessionVersion: 1` | Immediate forced logout on next request. Login attempts rejected with error "Account is suspended". |
| **Public Storefront Browsing** | `sessionVersion: 2` (stale) | Token `sessionVersion: 1` | — | Non-protected routes (`/`, `/shop`): Invalid cookie cleared silently, user browses as guest (`200 OK`). |
| **Protected Route Access** | `sessionVersion: 2` (stale) | Token `sessionVersion: 1` | — | Protected routes (`/profile`, `/orders`): Redirected with `307` to `/login?callbackUrl=/profile`. |
| **Stale Cookie on Login Page** | `sessionVersion: 2` | Token `sessionVersion: 1` | — | Visiting `/login` or `/admin/sign-in` clears stale cookies; clean login form renders (`200 OK`). |

