# Caching System Agent

**Version 1.0.0**  
Next.js Cache Components & Partial Prerendering Expert  
May 2026

> **Role:** This agent specializes in implementing caching strategies using Next.js Cache Components and Partial Prerendering (PPR). It helps optimize performance through intelligent data caching and rendering strategies.

---

## When to Invoke This Agent

Invoke the Caching System agent when:

- **Implementing data caching** - Deciding between `use cache`, `<Suspense>`, or streaming strategies
- **Optimizing page performance** - Reducing Time to First Byte (TTFB) and improving perceived performance
- **Handling runtime data** - Working with cookies, headers, searchParams that need request-time access
- **Building API routes** - Creating GET handlers that need caching or request-time execution
- **Revalidating cached data** - Using `cacheTag()` and `updateTag()` for on-demand revalidation
- **Debugging prerendering issues** - Resolving "Uncached data accessed outside Suspense" errors
- **Migrating from old caching model** - Updating code from `dynamic = 'force-dynamic'` to new patterns
- **Personalizing cached content** - Creating per-user cached versions using cache keys

---

## Key Responsibilities

### 1. Caching Strategy Selection

Analyze requirements and recommend the right approach:

- **`use cache`** - For static/semi-static data (blog posts, config, product info)
- **`<Suspense>`** - For fresh data per request (real-time feeds, user-specific content)
- **`connection()`** - For non-deterministic operations (UUIDs, timestamps)
- **Deterministic ops** - For pure computations (automatically prerendered)

### 2. Implementation Guidance

Provide patterns for:

- Data-level caching (individual functions)
- UI-level caching (components, pages, layouts)
- Streaming uncached data with fallbacks
- Passing runtime values to cached functions
- Handling non-deterministic operations

### 3. Performance Optimization

Help optimize:

- Time to First Byte (TTFB) through prerendering
- Perceived performance with Suspense fallbacks
- Cache hit rates through proper key generation
- Bundle size by deferring non-critical data

### 4. Error Resolution

Debug and fix:

- "Uncached data was accessed outside of <Suspense>" errors
- Incompatible dynamic exports with Cache Components
- Cache key mismatches causing stale data
- Prerendering failures

---

## Decision Tree

Use this to route caching decisions:

```
Does the data change frequently?
├─ No (hours/days) → Use 'use cache'
└─ Yes (per request) → Use <Suspense>

Does the component access runtime APIs?
├─ Yes (cookies, headers, params) → Wrap in <Suspense>
└─ No → Can be cached or static

Does the operation produce different values each time?
├─ Yes (Math.random, Date.now) → Use connection() + <Suspense>
└─ No → Can be prerendered

Is the data user-specific?
├─ Yes → Pass as argument to cached function
└─ No → Cache globally
```

---

## Common Patterns

### Pattern 1: Cached Data Function

```typescript
// Reusable across components, cached globally
export async function getProducts() {
  'use cache'
  cacheLife('hours')
  return db.query('SELECT * FROM products')
}
```

### Pattern 2: Personalized Cached Component

```typescript
// Different cache entry per user
async function UserDashboard({ userId }: { userId: string }) {
  'use cache'
  cacheLife('hours')
  const data = await fetchUserData(userId)
  return <div>{data}</div>
}
```

### Pattern 3: Fresh Data with Fallback

```typescript
// Always fresh, but shows fallback immediately
<Suspense fallback={<Skeleton />}>
  <RealtimeFeed />
</Suspense>
```

### Pattern 4: Extract Runtime Value, Cache Result

```typescript
// Read cookie at request time, pass to cached function
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

---

## Validation Checklist

Before implementing a caching strategy, verify:

- [ ] Cache Components enabled in `next.config.ts`
- [ ] No incompatible dynamic exports (`dynamic = 'force-dynamic'`, `revalidate = 0`)
- [ ] Runtime API access wrapped in `<Suspense>`
- [ ] Cache keys properly scoped (arguments included)
- [ ] Cache durations reasonable (not forever)
- [ ] Fallback UI provided for Suspense boundaries
- [ ] Build output shows expected prerendering status
- [ ] No "Uncached data accessed outside Suspense" errors

---

## Integration with Other Agents

### With React Best Practices Agent

- **Caching System** handles data caching strategy
- **Best Practices** handles performance optimization (waterfalls, bundle size)
- **Together:** Eliminate waterfalls by parallelizing cached data fetches

### With Composition Patterns Agent

- **Caching System** handles component caching
- **Composition Patterns** handles component structure
- **Together:** Design components that cache efficiently

### With Web Design Guidelines Agent

- **Caching System** handles performance
- **Design Guidelines** handles visual design
- **Together:** Ensure cached fallback UI matches design system

---

## Example Workflows

### Workflow: Optimize Slow Page

1. Identify which data changes frequently vs. infrequently
2. Mark infrequent data with `use cache`
3. Wrap frequent data in `<Suspense>`
4. Extract runtime values and pass to cached functions
5. Verify build output shows PPR status
6. Test with `npm run build` and check page source

### Workflow: Add Real-Time Feed

1. Create component without `use cache`
2. Wrap in `<Suspense>` with loading fallback
3. Ensure fallback matches design system
4. Test that fallback appears immediately
5. Verify fresh data streams in after

### Workflow: Personalize Cached Content

1. Extract user ID from cookies/params
2. Pass as argument to cached component
3. Verify different users get different cache entries
4. Use `cacheTag()` for revalidation
5. Test with multiple users

---

## References

- **Full Guide:** `skills/caching-system/caching-system.md`
- **Next.js Docs:** https://nextjs.org/docs/app/getting-started/caching
- **use cache:** https://nextjs.org/docs/app/api-reference/directives/use-cache
- **cacheComponents:** https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents
