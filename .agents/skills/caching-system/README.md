# Caching System Skill

A comprehensive guide to implementing caching strategies in Next.js using Cache Components and Partial Prerendering (PPR).

## What's Included

- **caching-system.md** - Complete reference guide with patterns and examples
- **AGENTS.md** - Agent orchestration guide for AI assistants
- **metadata.json** - Skill metadata and configuration

## Quick Start

### Enable Cache Components

First, ensure Cache Components is enabled in your `next.config.ts`:

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  cacheComponents: true,
}

export default nextConfig
```

### Basic Caching Pattern

```typescript
import { cacheLife } from 'next/cache'

export async function getProducts() {
  'use cache'
  cacheLife('hours')
  return db.query('SELECT * FROM products')
}
```

### Streaming Fresh Data

```typescript
import { Suspense } from 'react'

async function RealtimeFeed() {
  const data = await fetch('https://api.example.com/feed')
  return <div>{/* render data */}</div>
}

export default function Page() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <RealtimeFeed />
    </Suspense>
  )
}
```

## Key Concepts

### Partial Prerendering (PPR)

Your page is split into:
- **Static Shell** - Prerendered at build time (static content + cached data + Suspense fallbacks)
- **Dynamic Chunks** - Streamed at request time (fresh data, runtime APIs)

Result: Instant page loads with static shell, then dynamic content streams in.

### Cache Key Generation

Arguments automatically become part of the cache key:

```typescript
// Different userId = different cache entry
async function UserPosts({ userId }: { userId: string }) {
  'use cache'
  const posts = await db.query('SELECT * FROM posts WHERE userId = ?', [userId])
  return <div>{posts}</div>
}
```

### Three Caching Strategies

| Strategy | Use Case | Example |
|----------|----------|---------|
| `use cache` | Static/semi-static data | Blog posts, product info, config |
| `<Suspense>` | Fresh data per request | Real-time feeds, user preferences |
| `connection()` | Non-deterministic ops | UUIDs, timestamps, random values |

## Common Patterns

### Data-Level Caching

Cache individual functions:

```typescript
export async function getConfig() {
  'use cache'
  cacheLife('days')
  return db.query('SELECT * FROM config')
}
```

### UI-Level Caching

Cache entire components:

```typescript
export async function BlogPosts() {
  'use cache'
  cacheLife('hours')
  const posts = await db.query('SELECT * FROM posts')
  return <div>{/* render posts */}</div>
}
```

### Personalized Caching

Cache per-user versions:

```typescript
async function UserDashboard({ userId }: { userId: string }) {
  'use cache'
  cacheLife('hours')
  const data = await fetchUserData(userId)
  return <div>{data}</div>
}
```

### Runtime Data + Caching

Extract runtime values and pass to cached functions:

```typescript
async function ProfileContent() {
  const userId = (await cookies()).get('userId')?.value
  return <CachedProfile userId={userId} />
}

async function CachedProfile({ userId }: { userId: string }) {
  'use cache'
  const profile = await fetchProfile(userId)
  return <div>{profile}</div>
}
```

## Verification

### Check Build Output

```bash
npm run build
```

Look for:
- `○ Static` - Fully prerendered
- `◐ Prerender` - Partially prerendered (PPR)
- `λ Dynamic` - Deferred to request time

### View Static Shell

1. Build the project
2. Open page in browser
3. View page source (Ctrl+U)
4. Look for prerendered HTML

## Best Practices

✅ **DO:**
- Use `use cache` for infrequent data
- Wrap runtime APIs in `<Suspense>`
- Pass arguments to cached functions for personalization
- Use reasonable cache durations (hours/days)
- Test with `npm run build`

❌ **DON'T:**
- Use `export const dynamic = 'force-dynamic'` with Cache Components
- Use `export const revalidate = 0` with Cache Components
- Forget `<Suspense>` around runtime data
- Cache sensitive data without proper scoping
- Cache data that changes frequently without short TTL

## Troubleshooting

### "Uncached data was accessed outside of <Suspense>"

**Problem:** Component accesses runtime API without `<Suspense>` wrapper

**Solution:** Wrap in `<Suspense>` or use `connection()`

```typescript
// ❌ Wrong
async function MyComponent() {
  const theme = (await cookies()).get('theme')?.value
  return <div>{theme}</div>
}

// ✅ Right
async function MyComponent() {
  const theme = (await cookies()).get('theme')?.value
  return <div>{theme}</div>
}

export default function Page() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <MyComponent />
    </Suspense>
  )
}
```

### "Cannot use 'use cache' with dynamic export"

**Problem:** Using `export const dynamic = 'force-dynamic'` with `use cache`

**Solution:** Remove dynamic export, use `connection()` instead

```typescript
// ❌ Wrong
export const dynamic = 'force-dynamic'

export async function MyComponent() {
  'use cache'
  // ...
}

// ✅ Right
import { connection } from 'next/server'

export async function MyComponent() {
  await connection()  // Prevents prerendering
  // ...
}
```

## Resources

- [Full Guide](./caching-system.md)
- [Agent Documentation](./AGENTS.md)
- [Next.js Caching Docs](https://nextjs.org/docs/app/getting-started/caching)
- [use cache Directive](https://nextjs.org/docs/app/api-reference/directives/use-cache)
- [cacheComponents Config](https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents)

## Version History

- **1.0.0** (May 2026) - Initial release based on Next.js 16+ Cache Components
