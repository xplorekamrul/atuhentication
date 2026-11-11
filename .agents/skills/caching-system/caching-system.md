# Next.js Caching System Guide

**Version 1.0.0**  
Cache Components & Partial Prerendering (PPR)  
May 2026

> **Foundation:** This guide covers caching with Cache Components enabled (`cacheComponents: true` in `next.config.ts`). This is the modern caching model for Next.js 16+.

---

## Quick Reference

### When to Use Each Strategy

| Strategy | Use Case | Caching | Prerendering |
|----------|----------|---------|--------------|
| `use cache` | Static/semi-static data | ✅ Cached | ✅ Prerendered |
| `<Suspense>` | Fresh data per request | ❌ Not cached | ✅ Fallback prerendered |
| `connection()` | Non-deterministic ops | ❌ Not cached | ❌ Deferred to runtime |
| Deterministic ops | Pure computations | ✅ Auto-included | ✅ Prerendered |

---

## Core Concepts

### Partial Prerendering (PPR)

PPR is the default rendering model with Cache Components. It splits your page into:

1. **Static Shell** (prerendered at build time)
   - Static content (headers, navigation)
   - Cached content (`use cache`)
   - Suspense fallback UI

2. **Dynamic Chunks** (streamed at request time)
   - Runtime data (`<Suspense>` boundaries)
   - Non-deterministic operations
   - User-specific content

**Benefit:** Users get instant page loads with static shell, then dynamic content streams in.

### Cache Key Generation

Arguments and closed-over values automatically become part of the cache key:

```typescript
// Different sessionId = different cache entry
async function CachedContent({ sessionId }: { sessionId: string }) {
  'use cache'
  const data = await fetchUserData(sessionId)
  return <div>{data}</div>
}
```

This enables **personalized cached content** without manual key management.

---

## Data-Level Caching

Cache individual async functions that fetch or compute data.

### Basic Pattern

```typescript
// app/lib/data.ts
import { cacheLife } from 'next/cache'

export async function getUsers() {
  'use cache'
  cacheLife('hours')
  return db.query('SELECT * FROM users')
}

export async function getProduct(id: string) {
  'use cache'
  cacheLife('minutes', 30)
  return db.query('SELECT * FROM products WHERE id = ?', [id])
}
```

### With Arguments (Personalized Cache)

```typescript
export async function getUserPosts(userId: string) {
  'use cache'
  cacheLife('hours')
  // userId automatically becomes part of cache key
  return db.query('SELECT * FROM posts WHERE userId = ?', [userId])
}
```

### Benefits

- Reuse cached data across multiple components
- Cache data independently from UI
- Cleaner separation of concerns
- Easier to test and maintain

---

## UI-Level Caching

Cache entire components, pages, or layouts.

### Component Caching

```typescript
// app/components/BlogPosts.tsx
import { cacheLife } from 'next/cache'

export async function BlogPosts() {
  'use cache'
  cacheLife('hours')
  
  const posts = await db.query('SELECT * FROM posts')
  
  return (
    <section>
      <h2>Latest Posts</h2>
      <ul>
        {posts.map((post) => (
          <li key={post.id}>
            <h3>{post.title}</h3>
            <p>By {post.author}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
```

### Page Caching

```typescript
// app/page.tsx
import { cacheLife } from 'next/cache'

export default async function Page() {
  'use cache'
  cacheLife('hours')
  
  const data = await fetchPageData()
  
  return (
    <main>
      {/* Entire page is cached */}
    </main>
  )
}
```

### File-Level Caching

```typescript
// app/lib/data.ts
'use cache'

// All exported functions in this file are cached
export async function getUsers() {
  cacheLife('hours')
  return db.query('SELECT * FROM users')
}

export async function getConfig() {
  cacheLife('days')
  return db.query('SELECT * FROM config')
}
```

---

## Streaming Uncached Data

For data that must be fresh on every request, use `<Suspense>` without `use cache`.

### Basic Pattern

```typescript
import { Suspense } from 'react'

async function LatestPosts() {
  // No 'use cache' - always fresh
  const data = await fetch('https://api.example.com/posts')
  const posts = await data.json()
  
  return (
    <ul>
      {posts.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  )
}

export default function Page() {
  return (
    <>
      <h1>My Blog</h1>
      <Suspense fallback={<p>Loading posts...</p>}>
        <LatestPosts />
      </Suspense>
    </>
  )
}
```

**What happens:**
1. Build time: Fallback UI (`<p>Loading posts...</p>`) is prerendered
2. Request time: `LatestPosts` executes and streams in fresh data
3. User sees: Instant page load with fallback, then posts appear

---

## Working with Runtime APIs

Runtime APIs are only available at request time:
- `cookies()` - User's cookie data
- `headers()` - Request headers
- `searchParams` - URL query parameters
- `params` - Dynamic route parameters

### Pattern: Wrap in Suspense

```typescript
import { cookies } from 'next/headers'
import { Suspense } from 'react'

async function UserGreeting() {
  const cookieStore = await cookies()
  const theme = cookieStore.get('theme')?.value || 'light'
  return <p>Your theme: {theme}</p>
}

export default function Page() {
  return (
    <>
      <h1>Dashboard</h1>
      <Suspense fallback={<p>Loading...</p>}>
        <UserGreeting />
      </Suspense>
    </>
  )
}
```

### Pattern: Extract & Pass to Cached Function

```typescript
import { cookies } from 'next/headers'
import { Suspense } from 'react'

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProfileContent />
    </Suspense>
  )
}

// Component reads runtime data
async function ProfileContent() {
  const session = (await cookies()).get('session')?.value
  return <CachedContent sessionId={session} />
}

// Cached component receives extracted value
async function CachedContent({ sessionId }: { sessionId: string }) {
  'use cache'
  cacheLife('hours')
  // sessionId becomes part of cache key
  const data = await fetchUserData(sessionId)
  return <div>{data}</div>
}
```

**Why this works:**
- `ProfileContent` runs at request time (accesses cookies)
- `CachedContent` is cached per sessionId
- Different users get different cached versions

---

## Non-Deterministic Operations

Operations that produce different values each time: `Math.random()`, `Date.now()`, `crypto.randomUUID()`.

### Option 1: Defer to Request Time

```typescript
import { connection } from 'next/server'
import { Suspense } from 'react'

async function UniqueContent() {
  await connection()  // Prevents prerendering
  const uuid = crypto.randomUUID()
  return <p>Request ID: {uuid}</p>
}

export default function Page() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <UniqueContent />
    </Suspense>
  )
}
```

**What happens:**
- `connection()` tells Next.js: "This needs request-time execution"
- Component is not prerendered
- Unique value generated per request

### Option 2: Cache the Result

```typescript
export default async function Page() {
  'use cache'
  const buildId = crypto.randomUUID()
  return <p>Build ID: {buildId}</p>
}
```

**What happens:**
- Value generated once at build time
- All users see same value until revalidation
- Useful for build identifiers, feature flags, etc.

---

## Deterministic Operations

Operations that always produce the same result: file I/O, module imports, pure computations.

### Automatically Prerendered

```typescript
import fs from 'node:fs'

export default async function Page() {
  // These complete during prerendering
  const content = fs.readFileSync('./config.json', 'utf-8')
  const constants = await import('./constants.json')
  const processed = JSON.parse(content).items.map((item) => item.value * 2)
  
  return (
    <div>
      <h1>{constants.appName}</h1>
      <ul>
        {processed.map((value, i) => (
          <li key={i}>{value}</li>
        ))}
      </ul>
    </div>
  )
}
```

**No special handling needed** — these are automatically included in the static shell.

---

## Complete Example: Multi-Strategy Page

```typescript
// app/blog/page.tsx
import { Suspense } from 'react'
import { cookies } from 'next/headers'
import { cacheLife, cacheTag, updateTag } from 'next/cache'
import Link from 'next/link'

export default function BlogPage() {
  return (
    <>
      {/* Static content - prerendered automatically */}
      <header>
        <h1>Our Blog</h1>
        <nav>
          <Link href="/">Home</Link> | <Link href="/about">About</Link>
        </nav>
      </header>

      {/* Cached dynamic content - included in static shell */}
      <BlogPosts />

      {/* Runtime dynamic content - streams at request time */}
      <Suspense fallback={<p>Loading your preferences...</p>}>
        <UserPreferences />
      </Suspense>

      {/* Mutation - server action that revalidates cache */}
      <Suspense fallback={<p>Loading...</p>}>
        <CreatePost />
      </Suspense>
    </>
  )
}

// Everyone sees the same blog posts (revalidated every hour)
async function BlogPosts() {
  'use cache'
  cacheLife('hours')
  cacheTag('posts')
  
  const res = await fetch('https://api.vercel.app/blog')
  const posts = await res.json()
  
  return (
    <section>
      <h2>Latest Posts</h2>
      <ul>
        {posts.slice(0, 5).map((post: any) => (
          <li key={post.id}>
            <h3>{post.title}</h3>
            <p>By {post.author} on {post.date}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

// Personalized per user based on their cookie
async function UserPreferences() {
  const theme = (await cookies()).get('theme')?.value || 'light'
  const favoriteCategory = (await cookies()).get('category')?.value
  
  return (
    <aside>
      <p>Your theme: {theme}</p>
      {favoriteCategory && <p>Favorite category: {favoriteCategory}</p>}
    </aside>
  )
}

// Admin-only form that creates a post and revalidates cache
async function CreatePost() {
  const isAdmin = (await cookies()).get('role')?.value === 'admin'
  if (!isAdmin) return null
  
  async function createPost(formData: FormData) {
    'use server'
    await db.post.create({ data: { title: formData.get('title') } })
    updateTag('posts')  // Immediately expire blog posts cache
  }
  
  return (
    <form action={createPost}>
      <input name="title" placeholder="Post title" required />
      <button type="submit">Publish</button>
    </form>
  )
}
```

---

## API Routes with Cache Components

GET Route Handlers follow the same prerendering model as pages.

### Basic Pattern

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { connection } from 'next/server'

export async function GET(request: NextRequest) {
  // Prevents prerendering - forces request-time execution
  await connection()
  
  try {
    const data = await fetchData()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
```

### Cached API Route

```typescript
import { cacheLife } from 'next/cache'

export async function GET(request: NextRequest) {
  'use cache'
  cacheLife('hours')
  
  const data = await db.query('SELECT * FROM items')
  return Response.json(data)
}
```

---

## Opting Out of Static Shell

To defer entire app to request time (not recommended for most cases):

```typescript
// app/layout.tsx
import { Suspense } from 'react'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html>
      <Suspense fallback={null}>
        <body>{children}</body>
      </Suspense>
    </html>
  )
}
```

**Effect:** No static shell is sent immediately. Every request blocks until page fully renders.

---

## Verification & Debugging

### Check Build Output

```bash
npm run build
```

Look for routes marked as:
- `○ Static` - Fully prerendered
- `◐ Prerender` - Partially prerendered (PPR)
- `λ Dynamic` - Deferred to request time

### View Static Shell

1. Build the project
2. Open page in browser
3. View page source (Ctrl+U)
4. Look for prerendered HTML and RSC payload

### Common Errors

**"Uncached data was accessed outside of <Suspense>"**
- Component accesses runtime API without `<Suspense>` wrapper
- Solution: Wrap in `<Suspense>` or use `connection()`

**"Cannot use 'use cache' with dynamic export"**
- Using `export const dynamic = 'force-dynamic'` with `use cache`
- Solution: Remove `dynamic` export, use `connection()` instead

---

## Best Practices

### ✅ DO

- Use `use cache` for data that changes infrequently
- Wrap runtime API access in `<Suspense>`
- Extract runtime values and pass to cached functions
- Use `cacheTag()` and `updateTag()` for on-demand revalidation
- Keep cache durations reasonable (hours/days, not forever)
- Test with `npm run build` to verify prerendering

### ❌ DON'T

- Use `export const dynamic = 'force-dynamic'` with Cache Components
- Use `export const revalidate = 0` with Cache Components
- Use `export const dynamicParams = false` with Cache Components
- Cache sensitive user data without proper scoping
- Forget to wrap `<Suspense>` around runtime data
- Cache data that changes frequently without short TTL

---

## Migration from Previous Model

If upgrading from the old caching model:

**Old (❌ No longer works):**
```typescript
export const dynamic = 'force-dynamic'
export const revalidate = 0
```

**New (✅ Use instead):**
```typescript
import { connection } from 'next/server'

async function MyComponent() {
  await connection()  // Prevents prerendering
  // Your logic here
}
```

---

## References

- [Next.js Caching Documentation](https://nextjs.org/docs/app/getting-started/caching)
- [use cache Directive](https://nextjs.org/docs/app/api-reference/directives/use-cache)
- [cacheComponents Config](https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents)
- [Revalidating Data](https://nextjs.org/docs/app/getting-started/revalidating)
- [connection() Function](https://nextjs.org/docs/app/api-reference/functions/connection)
