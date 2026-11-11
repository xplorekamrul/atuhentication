---
name: rbac-permissions
description: >-
  Complete architecture, implementation guide, and reference for Role-Based Access Control (RBAC) in Next.js (App Router, Next.js 15/16).
  Includes dual-layer caching, instant cache invalidation, proxy/middleware route guards, dynamic route pattern matching ([id], [slug]),
  hydration-safe sidebar filtering, automatic route synchronization, and expected outputs.
  Use this skill whenever setting up, refactoring, or debugging RBAC, route permissions, or permissions caching in Next.js.
---

# Next.js Enterprise RBAC Architecture & Implementation Guide

This skill provides an end-to-end, production-ready blueprint for implementing dynamic, granular **Role-Based Access Control (RBAC)** in Next.js App Router applications (Next.js 15 & 16) with MariaDB/MySQL/PostgreSQL and Prisma.

---

## 1. Database Schema & Relational Design

The system is built on a 4-tier granular hierarchy:
`Admin` -> `Role` -> `RouteGroup` -> `Route`.

```prisma
// User / Admin Account
model Admin {
  id              BigInt       @id @default(autoincrement()) @db.UnsignedBigInt
  email           String       @unique
  username        String?      @unique
  password        String
  level           AdminLevel   @default(ADMIN) // DEVELOPER, SUPER_ADMIN, ADMIN
  status          AdminStatus  @default(ACTIVE) // ACTIVE, INACTIVE, SUSPENDED
  adminRoles      AdminRole[]
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  @@map("admins")
}

enum AdminLevel {
  DEVELOPER    // Full bypass to all routes and dev tools (*)
  SUPER_ADMIN  // Governed by Route.visibleToSuperAdmin
  ADMIN        // Governed by assigned Role -> RouteGroup -> Route permissions
}

enum AdminStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
}

// User-Role Mapping (Junction)
model AdminRole {
  id        BigInt   @id @default(autoincrement()) @db.UnsignedBigInt
  adminId   BigInt   @db.UnsignedBigInt
  roleId    BigInt   @db.UnsignedBigInt
  admin     Admin    @relation(fields: [adminId], references: [id], onDelete: Cascade)
  role      Role     @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@unique([adminId, roleId])
  @@map("admin_roles")
}

// Roles
model Role {
  id              BigInt           @id @default(autoincrement()) @db.UnsignedBigInt
  name            String           @unique
  adminRoles      AdminRole[]
  roleRouteGroups RoleRouteGroup[]
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt

  @@map("roles")
}

// Role to Route Group Mapping (Junction)
model RoleRouteGroup {
  id           BigInt     @id @default(autoincrement()) @db.UnsignedBigInt
  roleId       BigInt     @db.UnsignedBigInt
  routeGroupId BigInt     @db.UnsignedBigInt
  role         Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  routeGroup   RouteGroup @relation(fields: [routeGroupId], references: [id], onDelete: Cascade)

  @@unique([roleId, routeGroupId])
  @@map("role_route_groups")
}

// Logical grouping of routes (e.g., "Catalog Management", "Order Processing")
model RouteGroup {
  id              BigInt           @id @default(autoincrement()) @db.UnsignedBigInt
  name            String           @unique
  routes          Route[]
  roleRouteGroups RoleRouteGroup[]
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt

  @@map("route_groups")
}

// Individual Application Routes
model Route {
  id                   BigInt      @id @default(autoincrement()) @db.UnsignedBigInt
  path                 String      @unique // e.g., "/admin/products", "/admin/products/[id]/edit"
  name                 String
  visibleToAdmin       Boolean     @default(true)
  visibleToSuperAdmin  Boolean     @default(true)
  editableBySuperAdmin Boolean     @default(true)
  routeGroupId         BigInt?     @db.UnsignedBigInt
  routeGroup           RouteGroup? @relation(fields: [routeGroupId], references: [id], onDelete: SetNull)
  createdAt            DateTime    @default(now())
  updatedAt            DateTime    @updatedAt

  @@map("routes")
}
```

---

## 2. Access Levels & Hierarchy

| Role Level | Access Scope | Implementation Logic |
| :--- | :--- | :--- |
| `DEVELOPER` | **Unrestricted Bypass (`*`)** | Access to all pages, developer configs, and system utilities. Never checked against `routes` table. |
| `SUPER_ADMIN` | **System Management** | Access to all routes where `Route.visibleToSuperAdmin === true`. |
| `ADMIN` | **Role-Restricted** | Access strictly determined by: `Admin -> AdminRole -> Role -> RoleRouteGroup -> RouteGroup -> Route` where `visibleToAdmin === true`. |

---

## 3. High-Performance Dual-Layer Caching Architecture

### Why Dual Caching is Required
* **The Next.js 16 Proxy / Middleware Restriction**:
  Next.js proxy/middleware runs outside the React `"use cache"` directive compiler pass. Calling `cacheLife()` inside proxy/middleware throws:
  `Error: cacheLife() can only be called inside a "use cache" function.`
* **The Solution: Dual Layer**:
  1. **Layer 1: Edge & Proxy Memory Cache (`globalThis.__memoryPermissionsCache`)**:
     Provides sub-millisecond, in-memory lookups for `proxy.ts` / `middleware.ts`.
  2. **Layer 2: React / Next.js 16 `"use cache"` (`cacheLife("hours")` & `cacheTag(...)`)**:
     Used by Server Components and Server Actions for data fetching and sidebar rendering.

### Implementation: `lib/permissions/permissions.ts`

```ts
import { prisma } from "@/lib/prisma";
import { matchesPattern, normalizePath } from "./route-pattern-matcher";
import { cacheLife, cacheTag } from "next/cache";

// Global in-memory cache shared between proxy and server runtime
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface CacheEntry {
  paths: string[];
  timestamp: number;
}

const memoryPermissionsCache: Map<string, CacheEntry> =
  (globalThis as any).__memoryPermissionsCache || new Map();
(globalThis as any).__memoryPermissionsCache = memoryPermissionsCache;

/**
 * Fetch raw accessible paths directly from database without "use cache"
 * Used by proxy/middleware and Layer 1 in-memory cache
 */
export async function fetchAdminAccessiblePaths(
  adminId: bigint,
  level: string
): Promise<string[]> {
  const cacheKey = `${adminId.toString()}_${level}`;
  const now = Date.now();
  const cached = memoryPermissionsCache.get(cacheKey);

  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.paths;
  }

  let paths: string[] = [];

  if (level === "DEVELOPER") {
    paths = ["*"];
  } else if (level === "SUPER_ADMIN") {
    const routes = await prisma.route.findMany({
      where: { visibleToSuperAdmin: true },
      select: { path: true },
    });
    paths = routes.map((r) => r.path);
  } else {
    // ADMIN: Traverse Admin -> AdminRole -> Role -> RoleRouteGroup -> RouteGroup -> Route
    const routes = await prisma.route.findMany({
      where: {
        visibleToAdmin: true,
        routeGroup: {
          roleRouteGroups: {
            some: {
              role: {
                adminRoles: {
                  some: { adminId },
                },
              },
            },
          },
        },
      },
      select: { path: true },
    });
    paths = routes.map((r) => r.path);
  }

  memoryPermissionsCache.set(cacheKey, { paths, timestamp: now });
  return paths;
}

/**
 * Layer 2: Next.js 16 "use cache" function for Server Components and Server Actions
 */
export async function getCachedAdminAccessiblePaths(
  adminIdStr: string,
  level: string
): Promise<string[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("admin-permissions");
  cacheTag(`admin-permissions-${adminIdStr}`);

  return fetchAdminAccessiblePaths(BigInt(adminIdStr), level);
}

/**
 * Route access checker used in proxy.ts / middleware.ts
 */
export async function canAdminAccessPath(
  adminId: bigint,
  pathname: string,
  level: string
): Promise<boolean> {
  const normalizedPath = normalizePath(pathname);
  if (level === "DEVELOPER") return true;

  const routes = await fetchAdminAccessiblePaths(adminId, level);
  if (routes.includes("*")) return true;

  // Fast-path: exact static match
  if (routes.includes(normalizedPath)) return true;

  // Fallback: check dynamic routes only
  return routes.some((route) => matchesPattern(route, normalizedPath));
}

/**
 * Cache Invalidator: Clears BOTH Layer 1 (Memory) and Layer 2 (Next.js 16 Cache Tags)
 */
export async function invalidateAdminPermissionsCache(adminId?: string) {
  // Clear in-memory proxy cache
  if (adminId) {
    for (const key of memoryPermissionsCache.keys()) {
      if (key.startsWith(`${adminId}_`)) {
        memoryPermissionsCache.delete(key);
      }
    }
  } else {
    memoryPermissionsCache.clear();
  }

  // Clear Next.js 16 cache tags
  const { revalidateTag } = await import("next/cache");
  if (adminId) {
    revalidateTag(`admin-permissions-${adminId}`, "max");
  } else {
    revalidateTag("admin-permissions", "max");
  }
}
```

---

## 4. Dynamic Route Pattern Matching & Optimization

### Implementation: `lib/permissions/route-pattern-matcher.ts`
Matches dynamic Next.js routes (e.g. `/admin/orders/[id]/edit`, `/admin/products/[id]/seo`) against incoming URLs.

### Critical Performance Principles
1. **Never use `console.log` inside pattern matching loops**: A sidebar filter testing 40 items against 10 dynamic routes generates 400+ synchronous console outputs, blocking the Node.js event loop by ~800ms.
2. **Regex Memoization**: Compile regular expressions once and store in a `Map<string, RegExp>`.
3. **Exact Match Fast-Path**: If `pattern === url`, return `true` immediately without regex compilation.

```ts
// In-memory cache for compiled route patterns
const regexCache = new Map<string, RegExp>();

export function patternToRegex(pattern: string): RegExp {
  const cached = regexCache.get(pattern);
  if (cached) return cached;

  // Escape special regex characters except [ and ]
  let regexPattern = pattern.replace(/[.+?^${}|\\[\]]/g, (char) => '\\' + char);

  // Replace [param] with regex pattern to match any URL slug
  regexPattern = regexPattern.replace(/\\\[([^\]]+)\\\]/g, '([^/]+)');

  const regex = new RegExp('^' + regexPattern + '$');
  regexCache.set(pattern, regex);
  return regex;
}

export function matchesPattern(pattern: string, url: string): boolean {
  if (pattern === url) return true;
  return patternToRegex(pattern).test(url);
}

export function normalizePath(path: string): string {
  return path.split('?')[0].replace(/\/$/, '') || '/';
}
```

---

## 5. Proxy / Middleware Route Guard (`proxy.ts` / `middleware.ts`)

Intercepts every incoming request to enforce path-level RBAC verification before rendering:

```ts
import { adminAuth } from "@/lib/admin-auth";
import { canAdminAccessPath } from "@/lib/permissions/permissions";
import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function proxy(req: NextRequest) {
  const url = req.nextUrl.clone();
  const pathname = url.pathname;

  // 1. Skip public and static assets
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // 2. Admin Routes Protection
  if (pathname.startsWith("/admin")) {
    const adminSession = await adminAuth();

    const requireAdminLogin = () => {
      url.pathname = "/admin/sign-in";
      url.searchParams.set("callbackUrl", pathname);
      const res = NextResponse.redirect(url);
      res.cookies.delete("admin.session-token");
      res.cookies.delete("__Secure-admin.session-token");
      return res;
    };

    if (!adminSession?.user?.id) {
      if (pathname === "/admin/sign-in") return NextResponse.next();
      return requireAdminLogin();
    }

    const adminId = BigInt(adminSession.user.id);

    // Redirect logged-in admin away from sign-in page
    if (pathname === "/admin/sign-in") {
      url.pathname = "/admin";
      url.searchParams.delete("callbackUrl");
      return NextResponse.redirect(url);
    }

    // 3. RBAC Permission Check
    const adminLevel = (adminSession.user as any)?.level;
    if (adminLevel === "DEVELOPER") return NextResponse.next();

    const hasAccess = await canAdminAccessPath(adminId, pathname, adminLevel);
    if (!hasAccess) {
      url.pathname = "/admin"; // Redirect to admin home if forbidden
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}
```

---

## 6. Hydration-Safe Sidebar Navigation Filtering

### The Hydration Pitfall
Never use `typeof window !== "undefined"` inside `useState(() => ...)` initializers to read `sessionStorage`. During SSR, the server renders a skeleton loader, while the client hydrates with cached menu links, triggering:
`Hydration failed because the server rendered HTML didn't match the client.`

### Correct Implementation
1. Initialize `items: []` and `isLoading: true` uniformly on both server and client.
2. In `useEffect` (which executes solely on the client after mount), immediately restore cached routes from `sessionStorage`.
3. In `filterNavNodes`, use an `accessibleSet = new Set(accessibleRoutes)` for $O(1)$ lookups.

```tsx
// actions/sidebar/get-filtered-routes.ts
export function filterNavNodes(
  nodes: NavNodeData[],
  accessibleRoutes: string[]
): NavNodeData[] {
  const hasFullAccess = accessibleRoutes.includes('*');
  const accessibleSet = new Set(accessibleRoutes);
  const dynamicRoutes = accessibleRoutes.filter((r) => r.includes('['));

  function filterNodes(currentNodes: NavNodeData[]): NavNodeData[] {
    return currentNodes
      .map((node) => {
        if ('children' in node) {
          const filteredChildren = filterNodes(node.children);
          if (filteredChildren.length === 0) return null;
          return { ...node, children: filteredChildren };
        }

        const isAccessible =
          hasFullAccess ||
          accessibleSet.has(node.href) ||
          dynamicRoutes.some((route) => matchesPattern(route, node.href));

        return isAccessible ? node : null;
      })
      .filter((node): node is NavNodeData => node !== null);
  }

  return filterNodes(nodes);
}
```

```tsx
// components/layout/admin/Sidebar.tsx
export default function Sidebar() {
  const [items, setItems] = useState<NavNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Immediately restore from sessionStorage without causing hydration mismatch
    try {
      const cached = sessionStorage.getItem("_cached_sidebar_routes");
      if (cached) {
        setItems(JSON.parse(cached));
        setIsLoading(false);
      }
    } catch {}

    // 2. Fetch fresh routes in background
    async function loadRoutes() {
      const result = await getFilteredSidebarRoutes();
      setItems(result.routes);
      setIsLoading(false);
      sessionStorage.setItem("_cached_sidebar_routes", JSON.stringify(result.routes));
    }

    loadRoutes();
  }, []);

  if (isLoading && items.length === 0) {
    return <SidebarSkeleton />;
  }

  return <nav>{/* Render filtered items */}</nav>;
}
```

---

## 7. Automatic Route Discovery Script

Add a script `scripts/sync-routes-to-db.js` to automatically scan your Next.js file system routes and sync them into the `Route` database table:

```ts
import { prisma } from "../lib/prisma";
import fs from "fs";
import path from "path";

async function syncRoutes() {
  const adminPagesDir = path.join(process.cwd(), "app", "admin", "(default)");
  const routes: { path: string; name: string }[] = [];

  function scan(dir: string, baseRoute = "/admin") {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        scan(path.join(dir, entry.name), `${baseRoute}/${entry.name}`);
      } else if (entry.name === "page.tsx") {
        const routeName = baseRoute
          .replace("/admin", "Admin")
          .replace(/[\/_-]/g, " ")
          .trim();
        routes.push({ path: baseRoute, name: routeName || "Dashboard" });
      }
    }
  }

  scan(adminPagesDir);

  for (const r of routes) {
    await prisma.route.upsert({
      where: { path: r.path },
      create: { path: r.path, name: r.name, visibleToAdmin: true, visibleToSuperAdmin: true },
      update: { name: r.name },
    });
  }

  console.log(`Synced ${routes.length} routes to database.`);
}

syncRoutes();
```

---

## 8. Expected Outputs & Verification Matrix

| Scenario / Request | Admin Role / State | Requested Route | Expected Behavior | Output / HTTP Status |
| :--- | :--- | :--- | :--- | :--- |
| **Developer Navigation** | `DEVELOPER` | `/admin/config-variables` | Bypass all checks (`*`) | `200 OK` (Rendered page) |
| **Super Admin Allowed** | `SUPER_ADMIN` | `/admin/brands` (`visibleToSuperAdmin: true`) | Permitted | `200 OK` (Rendered page) |
| **Super Admin Blocked** | `SUPER_ADMIN` | `/admin/dev-tools` (`visibleToSuperAdmin: false`) | Denied | `307 Temporary Redirect` -> `/admin` |
| **Admin Permitted** | `ADMIN` (Role: "Catalog Manager") | `/admin/products` | Permitted via assigned RouteGroup | `200 OK` (Rendered page) |
| **Admin Dynamic Route** | `ADMIN` (Role: "Catalog Manager") | `/admin/products/123/edit` | Matched via pattern `/admin/products/[id]/edit` | `200 OK` (Rendered page) |
| **Admin Forbidden** | `ADMIN` (Role: "Catalog Manager") | `/admin/users` | Not in assigned RouteGroups | `307 Temporary Redirect` -> `/admin` |
| **First Load (Cache Miss)** | `ADMIN` | Any page | Database lookup + populate memory cache | Response time: ~15-30ms |
| **Subsequent Loads (Cache Hit)** | `ADMIN` | Any page | Instant lookup from `globalThis.__memoryPermissionsCache` | Response time: `< 1ms` |
| **Permission Update** | Admin Action | Role or Route modified | Invalidate memory cache & tag `admin-permissions` | Next request pulls fresh DB data instantly |
| **Sidebar Hydration** | Browser Refresh (F5) | Any admin page | Client DOM matches SSR Skeleton exactly | `0 Hydration Errors`, cached routes render in `< 1ms` |
